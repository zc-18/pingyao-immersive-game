"""Fixed cameras for comparing the roofs in the actual production courtyard."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/roof-detail'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))


def main():
    prefix = 'before' if '--before' in sys.argv else 'after'
    errors = []; report = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width':1200, 'height':760}, device_scale_factor=1)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror', lambda e: errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto('http://localhost:5219/#/pages_game/street/street')
            audit.wait_player(page); page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.locator('.scene-controls__trigger').click()
            page.wait_for_timeout(2500)
            page.evaluate("""() => {
              const render=__audit.renderer.render;
              __audit.renderer.render=function(scene,camera,...rest) {
                if(scene===__audit.scene && window.__roofView) {
                  camera.position.fromArray(__roofView.position);camera.fov=50;camera.aspect=1200/760;
                  camera.lookAt(...__roofView.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
                }
                return render.call(this,scene,camera,...rest);
              };
            }""")
            for name,position,target in [
                ('courtyard',[0,2.65,18],[0,2.6,1]),
                ('tiles',[1,5.8,11],[-7,5.2,3]),
                ('gallery',[0,3.1,8],[0,3.6,1]),
            ]:
                page.evaluate('view=>window.__roofView=view',{'position':position,'target':target})
                page.wait_for_timeout(500)
                audit.depth.capture_canvas(page,OUT/f'{prefix}-{name}.png')
            report['geometry'] = page.evaluate("""() => {
              let roofBatches=0,eaveMeshes=0,eaveInstances=0,triangles=0;
              __audit.scene.traverse(m=>{
                if(!m.isMesh)return;
                if(m.userData.isRoofShell)roofBatches++;
                if(m.userData.isRoofTiles){
                  eaveMeshes++;eaveInstances+=m.count;
                  triangles+=m.geometry.index.count/3*m.count;
                  if(!m.material.isMeshStandardMaterial)throw new Error('Unlit roof tiles');
                }
              });return {roofBatches,eaveMeshes,eaveInstances,triangles};
            }""" if prefix=='after' else "() => ({baseline:true})")
            if prefix=='after':
                # Static batching combines all roofs into two facade rows
                # and the enclosure, preserving three roof surface batches.
                assert report['geometry']['roofBatches']==3,report
                assert report['geometry']['eaveInstances']>100,report
                assert report['geometry']['triangles']<40000,report
            page.evaluate('() => window.__roofView=null')
            page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(1200)
            report['performance']=audit.depth.performance_sample(page)
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__phases > *').nth(3).click()
            page.locator('.scene-controls__trigger').click();page.wait_for_timeout(2500)
            audit.depth.capture_canvas(page,OUT/f'{prefix}-night.png')
            assert not errors,errors
            report['passed']=True
        finally:
            report['errors']=errors
            (OUT/f'{prefix}-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
