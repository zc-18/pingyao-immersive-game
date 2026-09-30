from pathlib import Path
import importlib.util
import json
import os
import tempfile
import sys

from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat


BASE_URL = "http://localhost:5219"
sys.dont_write_bytecode = True
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts" / "mobile-ui"
VIEWPORTS = {
    "phone-portrait": {"width": 390, "height": 844},
    "large-portrait": {"width": 430, "height": 932},
    "phone-landscape": {"width": 844, "height": 390},
    "large-landscape": {"width": 932, "height": 430},
    "small-landscape": {"width": 667, "height": 375},
    "desktop": {"width": 1440, "height": 900},
}


def seed_street_state(page):
    page.goto(f"{BASE_URL}/#/splash")
    page.wait_for_load_state("domcontentloaded")
    page.locator(".splash-stage").wait_for(state="visible", timeout=15000)
    page.evaluate(
        """
        () => {
          const seed = (key, data) => localStorage.setItem(key, JSON.stringify({type:'object', data: {...window.__pygc.readStorage(key), ...data}}));
          seed('pygc_user_profile', {
            nickname: '浏览器测试', roleId: 'study', roleName: '研学者',
            roleSubtitle: '', roleMotto: '', avatarType: 'role', roleSelectedAt: Date.now()
          })
          seed('pygc_runtime', {
            hasCompletedPrologue: true, hasEnteredStreet: true,
            currentStreetScene: 'bank-house', lastStreetScene: 'bank-house',
            currentPoiId: '', lastPoiId: '', lastPage: 'street',
            returnPage: '/street', preferredOrientation: 'landscape'
          })
        }
        """
    )


def page_metrics(page):
    return page.evaluate(
        """
        () => ({
          viewport: { width: innerWidth, height: innerHeight },
          document: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight
          },
          canvases: [...document.querySelectorAll('canvas')].map((canvas) => ({
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight
          })),
          loadingText: document.body.innerText.includes('晋小鸦正在张望'),
          loadFailure: document.body.innerText.includes('加载未完成')
        })
        """
    )


def assert_fits_viewport(name, metrics):
    assert metrics["document"]["width"] <= metrics["viewport"]["width"] + 2, f"{name}: horizontal overflow"
    assert metrics["document"]["height"] <= metrics["viewport"]["height"] + 2, f"{name}: vertical overflow"


def assert_nonblank_and_changed(before_path, after_path):
    before = Image.open(before_path).convert("RGB")
    after = Image.open(after_path).convert("RGB")
    before_stat = ImageStat.Stat(before)
    assert max(before_stat.var) > 80, f"blank canvas: {before_path.name}"
    difference = ImageChops.difference(before, after)
    assert difference.getbbox() is not None, f"static canvas: {before_path.name}"


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    # Keep Chromium profiles and transport files inside the project.
    temp_dir = Path(__file__).resolve().parents[1] / ".cache/browser-audits/mobile-ui"
    temp_dir.mkdir(parents=True, exist_ok=True)
    os.environ.update(TEMP=str(temp_dir), TMP=str(temp_dir), TMPDIR=str(temp_dir))
    tempfile.tempdir = str(temp_dir)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] if sys.platform == "win32" else [])
        for name, viewport in VIEWPORTS.items():
            page = browser.new_page(viewport=viewport, device_scale_factor=1)
            messages = []
            page.on("console", lambda message, bag=messages: bag.append(f"{message.type}: {message.text}"))
            page.on("pageerror", lambda error, bag=messages: bag.append(f"pageerror: {error}"))

            page.goto(f"{BASE_URL}/#/splash")
            page.wait_for_load_state("domcontentloaded")
            page.locator(".splash-stage").wait_for(state="visible", timeout=15000)
            page.wait_for_timeout(900)
            page.screenshot(path=ARTIFACT_DIR / f"{name}-splash.png", full_page=True)
            splash_metrics = page_metrics(page)
            assert_fits_viewport(f"{name}-splash", splash_metrics)

            page.goto(f"{BASE_URL}/#/role-select")
            page.wait_for_load_state("domcontentloaded")
            page.locator(".role-stage").wait_for(state="visible", timeout=15000)
            page.wait_for_timeout(500)
            page.screenshot(path=ARTIFACT_DIR / f"{name}-role.png", full_page=True)
            role_metrics = page_metrics(page)
            assert_fits_viewport(f"{name}-role", role_metrics)

            if "--skip-street" not in sys.argv:
                seed_street_state(page)
                page.goto(f"{BASE_URL}/#/street")
                page.wait_for_load_state("domcontentloaded")
                page.locator(".street-stage").wait_for(state="visible", timeout=15000)
                page.wait_for_timeout(4500)
                page.screenshot(path=ARTIFACT_DIR / f"{name}-street.png", full_page=True)

                canvas = page.locator("#street-canvas canvas")
                canvas.wait_for(state="visible", timeout=15000)
                before_path = ARTIFACT_DIR / f"{name}-canvas-before.png"
                after_path = ARTIFACT_DIR / f"{name}-canvas-after.png"
                canvas.screenshot(path=before_path)
                page.keyboard.down("w")
                page.wait_for_timeout(450)
                page.keyboard.up("w")
                page.wait_for_timeout(250)
                canvas.screenshot(path=after_path)
                assert_nonblank_and_changed(before_path, after_path)

                metrics = page_metrics(page)
                assert_fits_viewport(f"{name}-street", metrics)
                assert metrics["canvases"], f"{name}: missing WebGL canvas"
                assert not metrics["loadingText"], f"{name}: street loader did not finish"
                assert not metrics["loadFailure"], f"{name}: street loader reported failure"
                print(name, {"splash": splash_metrics, "role": role_metrics, "street": metrics})
            for message in messages:
                if "error" in message.lower() or "fail" in message.lower():
                    print(name, message)
            assert not [m for m in messages if m.startswith("pageerror:")], messages
            page.close()
        # Tab evidence uses the same viewport matrix and rotates one live session.
        spec = importlib.util.spec_from_file_location("tab_audit", Path(__file__).with_name("landscape-depth-audit.py"))
        tab_audit = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(tab_audit)
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        tab_report = {}
        tab_errors = []
        page.on("pageerror", lambda error: tab_errors.append(str(error)))
        tab_audit.tabs(page, ARTIFACT_DIR, tab_report)
        (ARTIFACT_DIR / "tab-metrics.json").write_text(json.dumps(tab_report, ensure_ascii=False, indent=2), encoding="utf-8")
        for key, metrics in tab_report.items():
            assert metrics['width'] <= metrics['viewport'][0] + 2, key
            if metrics['viewport'][0] > metrics['viewport'][1] and metrics['viewport'][1] <= 600:
                assert metrics['height'] <= metrics['viewport'][1] + 2, key
                if key.endswith('-shop'):
                    assert metrics['productReachable'], key
                    assert metrics['boxes']['.shop-stage__shelves-scroll']['height'] >= 150, key
        assert not tab_errors, tab_errors
        print(f"PASS: {len(VIEWPORTS)} splash/role viewports, {len(tab_report)} tab/detail cases; street skipped={'--skip-street' in sys.argv}")
        browser.close()


if __name__ == "__main__":
    main()
