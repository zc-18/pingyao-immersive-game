"""Fixed studio comparison of the shipped face, neck and hair refinement.

Run against the production preview. --before is only for capturing the older
model before a refinement; it refuses to overwrite an existing baseline.
"""
import importlib.util
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'artifacts/character-finish'


def runtime_views():
    spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    errors = []
    report = {'camera': 'fixed close portrait for visual inspection; actual game lighting and materials'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width': 720, 'height': 720}, device_scale_factor=1)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror', lambda error: errors.append(error.message))
        try:
            page.goto('http://localhost:5219/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto('http://localhost:5219/#/pages_game/street/street')
            audit.wait_player(page)
            page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
            page.evaluate("""() => {
              const {renderer,scene}=__audit, draw=renderer.render.bind(renderer);
              // Inspect the shipped character with a fixed camera, retaining the
              // application's material setup, illumination and postprocessing.
              renderer.render=(world,camera)=>{
                if(world===scene) {
                  const player=scene.children.find(o=>o.userData.isGltf);
                  player.updateMatrixWorld(true);
                  camera.fov=32;camera.updateProjectionMatrix();
                  camera.position.copy(player.localToWorld(new THREE.Vector3(.42,1.63,.67)));
                  camera.lookAt(player.localToWorld(new THREE.Vector3(0,1.59,0)));
                }
                return draw(world,camera);
              };
            }""")
            page.locator('.scene-controls__trigger').click()
            report['phases'] = []
            for index, phase in enumerate(['dawn', 'noon', 'dusk', 'night']):
                page.locator('.scene-controls__phases > *').nth(index).click()
                page.wait_for_timeout(2400)
                audit.depth.capture_canvas(page, OUT / f'game-{phase}.png')
                report['phases'].append({'key': phase, 'label': page.locator('.street-stage__phase-label').inner_text(),
                    **page.evaluate('() => ({pixelRatio:__audit.renderer.getPixelRatio(),triangles:__audit.renderer.info.render.triangles})')})
            report['canvases'] = page.locator('#street-canvas canvas').count()
            assert report['canvases'] == 1
            assert not errors, errors
            report['passed'] = True
        finally:
            report['errors'] = errors
            (OUT / 'runtime-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()


def main():
    before = '--before' in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    if before and (OUT / 'before-report.json').exists():
        raise RuntimeError('A verified baseline exists; it must not be overwritten.')
    spec = importlib.util.spec_from_file_location('detail', ROOT / 'character-detail-audit.py')
    detail = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(detail)
    detail.OUT = OUT
    os.environ.update(TEMP=str(OUT), TMP=str(OUT))
    if '--release' not in sys.argv:
        sys.argv.append('--release')
    detail.main()
    if before:
        return
    report = json.loads((OUT / 'after-report.json').read_text(encoding='utf-8'))
    assert report['productionAsset'] and report['metadata']['finishRevision'] == 1
    assert not report['errors']
    if all((OUT / f'before-{view}.png').exists() for view in ['front', 'three-quarter']):
        comparison = Image.new('RGB', (1080, 1140), '#f1ebdf')
        draw = ImageDraw.Draw(comparison)
        font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
        for column, (prefix, label) in enumerate([('before', '改进前'), ('after', '当前')]):
            draw.text((column*540+15, 12), label, fill='#604532', font=font)
            for row, view in enumerate(['front', 'three-quarter']):
                source = Image.open(OUT / f'{prefix}-{view}.png').convert('RGB')
                comparison.paste(source.resize((528, 528), Image.Resampling.LANCZOS), (column*540+6, row*540+48))
        comparison.save(OUT / 'finish-comparison.jpg', quality=94)
    runtime_views()
    print(json.dumps({'passed': True, 'sha256': report['sha256'], 'bytes': report['bytes'], 'errors': report['errors']}), flush=True)


if __name__ == '__main__':
    main()
