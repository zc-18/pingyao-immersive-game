"""Browser regression for the splash, role selection and local NPC dialogue."""
from pathlib import Path
import json
import os
import tempfile
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'test/artifacts/resume-gate'
ART.mkdir(parents=True, exist_ok=True)
TEMP = ART / 'browser-temp'
TEMP.mkdir(exist_ok=True)
os.environ.update(TEMP=str(TEMP), TMP=str(TEMP), TMPDIR=str(TEMP))
tempfile.tempdir = str(TEMP)
URL = 'http://127.0.0.1:5219'


def seed(page, key, value):
    page.evaluate('([key, value]) => localStorage.setItem(key, JSON.stringify({type:"object",data:{...window.__pygc.readStorage(key),...value}}))', [key, value])


def goto(page, route, selector):
    page.goto(URL + '/#/' + route)
    page.locator(selector).wait_for()
    page.wait_for_timeout(3500 if selector == '.splash-stage' else 750)


def visible_box(page, selector):
    return page.locator(selector).evaluate('(el) => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; }')


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        viewports = [(1440, 900), (1280, 720), (844, 390), (667, 375), (390, 844)]
        if '--portrait' in sys.argv:
            viewports = [(390, 844)]
        for w, h in viewports:
            page = browser.new_page(viewport={'width': w, 'height': h})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            goto(page, 'splash', '.splash-stage')
            assert page.locator('.splash-checkin').count() == 0
            page.screenshot(path=str(ART / f'splash-new-{w}x{h}.png'))
            page.locator('.splash-enter-frame').click()
            page.wait_for_url('**/#/role-select')
            page.locator('.role-stage').wait_for()
            page.wait_for_timeout(900)
            for i in range(5):
                page.locator('.role-pager__dot' if w < h else '.role-figure').nth(i).click()
                page.wait_for_timeout(550)
                name = visible_box(page, '.role-figure--active .role-figure__nameplate')
                token = visible_box(page, '.role-confirm-token')
                page.screenshot(path=str(ART / f'role-{i}-{w}x{h}.png'))
                assert token['bottom'] <= h + 2 and token['y'] >= 0, (w, h, 'token', token)
                assert name['bottom'] < token['y'] or name['right'] <= token['x'] or name['x'] >= token['right'], (w, h, 'name/token overlap', name, token)
                if w >= 1000:
                    assert not page.locator('.role-figure__banner').is_visible()
                    assert page.locator('.role-motto__identity').is_visible()
                page.screenshot(path=str(ART / f'role-{i}-{w}x{h}.png'))
            if w < h:
                page.evaluate('() => { window.savedSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => {throw new Error("audit write failure")}; }')
                page.locator('.role-confirm-token').click()
                assert '/role-select' in page.url and page.locator('.gate-overlay').count() == 0
                page.evaluate('() => { Storage.prototype.setItem = window.savedSetItem; }')
                page.route('**/static/libs/**', lambda route: route.abort())
                page.locator('.role-confirm-token').click()
                page.wait_for_url('**/#/street')
                assert page.evaluate('window.__pygc.readStorage("pygc_user_profile").roleId') == 'helper'
            seed(page, 'pygc_user_profile', {'roleId': 'study', 'roleName': '研学者', 'roleSelectedAt': 1})
            seed(page, 'pygc_runtime', {'hasCompletedPrologue': True})
            goto(page, 'splash', '.splash-stage')
            assert page.locator('.splash-checkin').is_visible()
            page.screenshot(path=str(ART / f'splash-return-{w}x{h}.png'))
            page.locator('.splash-checkin').click()
            page.wait_for_url('**/#/user')
            seed(page, 'pygc_user_progress', {'checkIn': {'lastDate': '2099-01-01'}})
            goto(page, 'splash', '.splash-stage')
            assert page.locator('.splash-checkin').count() == 0
            goto(page, 'dialog?topic=nearby-shops', '.dialog-stage--nearby-shops')
            for _ in range(2):
                page.locator('.dialog-stage__quick-chip').first.click()
            page.wait_for_timeout(300)
            progress = page.evaluate('window.__pygc.readStorage("pygc_user_progress")')
            assert progress['npcTalkCount'] == 1
            scroll = page.locator('.dialog-stage__scroll').evaluate('(el) => ({top:el.scrollTop,height:el.clientHeight,full:el.scrollHeight})')
            assert abs(scroll['full'] - scroll['top'] - scroll['height']) <= 2, scroll
            page.screenshot(path=str(ART / f'dialog-{w}x{h}.png'))
            goto(page, 'dialog', '.dialog-stage--nearby-shops')
            count = page.locator('.dialog-stage__msg').count()
            page.evaluate('() => { window.savedSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => {throw new Error("audit write failure")}; }')
            page.locator('.dialog-stage__quick-chip').nth(1).click()
            assert page.locator('.dialog-stage__msg').count() == count
            page.locator('.dialog-stage__action').nth(1).click()
            assert '/dialog' in page.url
            page.evaluate('() => { Storage.prototype.setItem = window.savedSetItem; }')
            # Block scene assets so destination selection cannot be mistaken for a rendered arrival.
            before = page.evaluate('window.__pygc.readStorage("pygc_user_progress").visitedSceneIds')
            page.route('**/static/libs/**', lambda route: route.abort())
            page.locator('.dialog-stage__action').nth(1).click()
            page.wait_for_url('**/#/street')
            assert page.evaluate('window.__pygc.readStorage("pygc_runtime").currentStreetScene') == 'market-crossing'
            assert page.evaluate('window.__pygc.readStorage("pygc_user_progress").visitedSceneIds') == before
            assert not errors, errors
            results.append({'viewport': [w, h], 'roles': 5, 'dialogScroll': scroll, 'pageErrors': errors})
            print(f'PASS {w}x{h}', flush=True)
            page.close()
        # A direct dialog deep link has no app history, and its close control returns to the street.
        page = browser.new_page()
        page.route('**/static/libs/**', lambda route: route.abort())
        goto(page, 'dialog?topic=baozheng-case', '.dialog-stage--baozheng-case')
        page.locator('.dialog-stage__close').click()
        page.wait_for_url('**/#/street')
        browser.close()
    report = ART / 'report.json'
    previous = json.loads(report.read_text(encoding='utf-8')) if '--portrait' in sys.argv and report.exists() else []
    checked = {tuple(item['viewport']) for item in results}
    report.write_text(json.dumps([item for item in previous if tuple(item['viewport']) not in checked] + results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    main()
