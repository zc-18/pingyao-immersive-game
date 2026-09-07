"""Repeatable H5 evidence capture; all instrumentation stays in the test browser."""
import argparse
import base64
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("mobile", ROOT / "mobile-visual-audit.py")
mobile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mobile)
VIEWS = [(390, 844), (430, 932), (844, 390), (932, 430), (667, 375), (1440, 900)]
SCENES = ["bank-house", "south-avenue", "academy-lane", "market-crossing", "lantern-quarter"]
PROBE = """(() => {
  let namespace;
  window.__audit = { frames: [], renderer: null, renderers: [], tick: 0 };
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = fn => raf.call(window, t => {
    window.__audit.tick = t;
    fn(t);
  });
  Object.defineProperty(window, 'THREE', {
    configurable: true, get: () => namespace,
    set(value) {
      namespace = value;
      queueMicrotask(() => {
        const Original = value.WebGLRenderer;
        if (!Original) return;
        value.WebGLRenderer = new Proxy(Original, { construct(Target, args) {
          const r = new Target(...args);
          window.__audit.renderer = r;
          window.__audit.renderers.push(r);
          r.info.autoReset = false;
          let lastTick = -1;
          const render = r.render.bind(r);
          r.render = (...params) => {
            const a = window.__audit;
            if (a.tick !== lastTick) {
              if (lastTick >= 0) a.frames.push({ t: lastTick, calls: r.info.render.calls,
                triangles: r.info.render.triangles, textures: r.info.memory.textures,
                geometries: r.info.memory.geometries });
              if (a.frames.length > 1200) a.frames.shift();
              r.info.reset(); lastTick = a.tick;
            }
            if (params[0]?.isScene) { a.scene = params[0]; a.camera = params[1]; }
            const result = render(...params);
            if (a.captureNext && r.getRenderTarget() === null) {
              a.captureNext = false;
              // Read after all synchronous postprocessing passes, before buffer discard.
              queueMicrotask(() => { a.capture = r.domElement.toDataURL('image/png'); });
            }
            return result;
          };
          return r;
        }});
      });
    }
  });
})();
"""


def capture_canvas(page, path):
    page.evaluate("() => { window.__audit.capture = null; window.__audit.captureNext = true }")
    page.wait_for_function("() => window.__audit.capture", timeout=10000)
    data = page.evaluate("() => window.__audit.capture")
    path.write_bytes(base64.b64decode(data.split(',', 1)[1]))


def measure(page):
    return page.evaluate("""() => {
      const selectors = ['.hub-stage', '.hub-stage__main', '.hub-stage__role-img',
        '.hub-stage__npc-bar-cta', '.ledger', '.ledger__book', '.shop-stage',
        '.shop-stage__shelves-scroll', '.map-stage', '.map-stage__map',
        '.shop-stage__detail', '.map-stage__detail', 'uni-tabbar'];
      const boxes = {};
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        boxes[selector] = { x:r.x,y:r.y,width:r.width,height:r.height,
          font:s.fontSize, minHeight:s.minHeight, maxHeight:s.maxHeight,
          scrollHeight:el.scrollHeight, display:s.display };
      }
      return { viewport:[innerWidth,innerHeight], width:document.documentElement.scrollWidth,
        height:document.documentElement.scrollHeight, rpx100:uni.upx2px(100), boxes };
    }""")


def performance_sample(page):
    page.evaluate("() => { window.__audit.frames = [] }")
    page.wait_for_timeout(5000)
    return page.evaluate("""() => {
      const a=window.__audit, f=a.frames, r=a.renderer;
      if (!r || f.length < 2) return {error:'no renderer samples'};
      const dt=f.slice(1).map((v,i)=>v.t-f[i].t).sort((a,b)=>a-b);
      const mean=k=>f.reduce((s,v)=>s+v[k],0)/f.length;
      const gl=r.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {frames:f.length, fps:1000*(f.length-1)/(f.at(-1).t-f[0].t),
        frameMs:dt.reduce((a,b)=>a+b,0)/dt.length, p95Ms:dt[Math.floor(dt.length*.95)],
        calls:mean('calls'),triangles:mean('triangles'),textures:f.at(-1).textures,
        geometries:f.at(-1).geometries, pixelRatio:r.getPixelRatio(),
        shadows:r.shadowMap.enabled, threeRevision:THREE.REVISION,
        gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};
    }""")


def apply_phase(page, phase):
    page.evaluate("""phase => {
      let c=document.querySelector('.street-stage').__vueParentComponent;
      while(c) {
        if ('sceneCmd' in (c.setupState||{})) {
          c.setupState.currentPhase=phase;
          c.setupState.sceneCmd={action:'applyPhase',data:{phase},ts:Date.now()}; return;
        }
        c=c.parent;
      }
      throw Error('missing phase bridge');
    }""", phase)


def phase_matrix(page, out, report):
    mobile.seed_street_state(page)
    page.set_viewport_size({"width": 844, "height": 390})
    page.goto(f"{mobile.BASE_URL}/#/pages_game/street/street")
    page.wait_for_load_state("domcontentloaded")
    page.locator("#street-canvas canvas").wait_for(state="visible", timeout=25000)
    phases = page.evaluate("async () => (await import('/common/utils/phase.js')).PHASES")
    report["phaseMatrix"] = {}
    for index, scene in enumerate(SCENES):
        if index:
            page.locator('.street-stage__switch-arrow').last.click()
        page.locator("#street-canvas canvas").wait_for(state="visible", timeout=25000)
        page.wait_for_function(
            "scene => uni.getStorageSync('pygc_runtime').currentStreetScene === scene",
            arg=scene,
            timeout=25000,
        )
        page.wait_for_timeout(2500)
        report["phaseMatrix"][scene] = {}
        for key, phase in phases.items():
            apply_phase(page, phase)
            page.wait_for_timeout(2500)
            report["phaseMatrix"][scene][key] = performance_sample(page)
            capture_canvas(page, out / f"matrix-{scene}-{key}.png")


def tabs(page, out, report):
    mobile.seed_street_state(page)
    for w, h in VIEWS:
        page.set_viewport_size({"width": w, "height": h})
        for name in ["index", "user", "shop", "map"]:
            page.evaluate("path => uni.switchTab({url:path})", f"/pages/{name}/{name}")
            selector = {"index": ".hub-stage", "user": ".ledger", "shop": ".shop-stage", "map": ".map-stage"}[name]
            page.locator(selector).wait_for(state="visible")
            page.wait_for_timeout(900)
            key = f"{w}x{h}-{name}"
            page.screenshot(path=out / f"{key}.png")
            report[key] = measure(page)
            if name == "shop":
                try:
                    page.locator(".shop-stage__product").first.click(timeout=1800)
                    report[key]["productReachable"] = True
                except Exception:
                    report[key]["productReachable"] = False
                    page.locator(".shop-stage__product").first.dispatch_event("click")
                page.wait_for_timeout(600)
                page.screenshot(path=out / f"{key}-detail.png")
                report[key + "-detail"] = measure(page)
                page.locator(".shop-stage__detail-mask").click(position={"x": 3, "y": 3}, force=True)
            if name == "map":
                page.locator(".map-stage__poi").first.click(force=True)
                page.wait_for_timeout(600)
                page.screenshot(path=out / f"{key}-detail.png")
                report[key + "-detail"] = measure(page)
                close = page.locator(".map-stage__detail-close")
                if close.is_visible():
                    close.click()
                else:
                    page.locator(".map-stage__detail-mask").click(position={"x": 3, "y": 3}, force=True)


def streets(page, out, report):
    mobile.seed_street_state(page)
    page.set_viewport_size({"width": 844, "height": 390})
    page.evaluate("() => uni.reLaunch({url:'/pages_game/street/street'})")
    for index, scene in enumerate(SCENES):
        if index:
            page.locator('.street-stage__switch-arrow').last.click()
        canvas = page.locator("#street-canvas canvas")
        canvas.wait_for(state="visible", timeout=25000)
        page.wait_for_timeout(5000)
        report[scene] = performance_sample(page)
        report[scene]["actualScene"] = page.evaluate("() => uni.getStorageSync('pygc_runtime').currentStreetScene")
        assert report[scene]["actualScene"] == scene
        page.screenshot(path=out / f"street-{scene}.png")
        before, after = out / f"canvas-{scene}.png", out / f"canvas-{scene}-moving.png"
        capture_canvas(page, before)
        page.keyboard.down("w")
        page.wait_for_timeout(700)
        page.keyboard.up("w")
        capture_canvas(page, after)
        mobile.assert_nonblank_and_changed(before, after)
        report[scene]["canvasVariance"] = ImageStat.Stat(Image.open(before).convert("RGB")).var
        report[scene]["canvasDifference"] = ImageStat.Stat(ImageChops.difference(Image.open(before).convert("RGB"), Image.open(after).convert("RGB"))).mean


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", default="after")
    parser.add_argument("--only", choices=["tabs", "streets", "matrix", "all"], default="all")
    parser.add_argument("--gpu", action="store_true", help="Request Windows D3D11; recorded renderer is authoritative")
    parser.add_argument("--phases", action="store_true", help="Capture and sample all four phases after the five streets")
    parser.add_argument("--phase-matrix", action="store_true", help="Capture and sample all four phases for every street")
    args = parser.parse_args()
    out = ROOT / "artifacts" / "landscape-depth" / args.label
    out.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] if args.gpu else [])
        page = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=1)
        page.add_init_script(PROBE)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            if args.only in ["tabs", "all"]:
                tabs(page, out, report)
            if args.only in ["streets", "all"]:
                streets(page, out, report)
                if args.phase_matrix:
                    phase_matrix(page, out, report)
                if args.phases:
                    phases = page.evaluate("async () => (await import('/common/utils/phase.js')).PHASES")
                    report['phases'] = {}
                    for key, phase in phases.items():
                        apply_phase(page, phase)
                        page.wait_for_timeout(1500)
                        report['phases'][key] = performance_sample(page)
                        capture_canvas(page,out/f'phase-{key}.png')
                        page.screenshot(path=out/f'phase-{key}-hud.png')
            if args.only == "matrix":
                phase_matrix(page, out, report)
        finally:
            report["errors"] = errors
            (out / f"{args.only}-metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            browser.close()
    print(f"Evidence: {out}; {len(report)-1} cases; errors={errors}")


if __name__ == "__main__":
    main()
