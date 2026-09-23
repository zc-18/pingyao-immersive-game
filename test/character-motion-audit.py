"""Runtime evidence for conservative animation clearance and renderer recovery."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('courtyard',ROOT/'enclosed-courtyard-audit.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
OUT=ROOT/'artifacts/character-motion'
OUT.mkdir(parents=True,exist_ok=True)
os.environ.update(TEMP=str(OUT),TMP=str(OUT))
BASE='http://localhost:5219'

def main():
    report={}; errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=1)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto(BASE+'/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for()
            # Visual fixture with a selected role; does not replace the separate fresh-save journey audit.
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,hasEnteredStreet:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto(BASE+'/#/pages_game/street/street')
            audit.wait_player(page)
            page.locator('.brush-loader').wait_for(state='hidden',timeout=30000)
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__modes > *').nth(1).click()
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.wait_for_timeout(2200)
            audit.depth.capture_canvas(page,OUT/'adult-boots.png')
            page.locator('[aria-label="拱手致意"]').click();page.wait_for_timeout(800)
            audit.depth.capture_canvas(page,OUT/'adult-greeting.png')
            page.locator('[aria-label="镜头归位"]').click()
            page.locator('.scene-controls__trigger').click()

            # Real key/button input: accelerate from walking to running, then settle.
            page.keyboard.down('w')
            page.wait_for_timeout(900)
            audit.depth.capture_canvas(page,OUT/'walking.png')
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__modes > *').first.click()
            page.locator('.scene-controls__trigger').click()
            gait=[]; captured_flight=False; captured_contact=False
            for _ in range(24):
                page.wait_for_timeout(60)
                state=page.evaluate("""() => {
                  const p=__audit.scene.children.find(o=>o.userData.isGltf), d=p.userData;
                  return {phaseError:Math.abs(d.actions.walk.time/d.actions.walk.getClip().duration-d.actions.run.time/d.actions.run.getClip().duration),
                    flight:d.airborneLift,run:d.actions.run.getEffectiveWeight(),x:p.position.x,z:p.position.z};
                }""")
                gait.append(state)
                assert state['phaseError']<.00001,state
                if state['run']>.95 and state['flight']>.12 and not captured_flight:
                    audit.depth.capture_canvas(page,OUT/'running-flight.png');captured_flight=True
                if state['run']>.95 and state['flight']<.01 and not captured_contact:
                    audit.depth.capture_canvas(page,OUT/'running-contact.png');captured_contact=True
            page.keyboard.up('w');page.wait_for_timeout(1200)
            stopped=page.evaluate("""() => {
              const p=__audit.scene.children.find(o=>o.userData.isGltf);
              return {idle:p.userData.actions.idle.getEffectiveWeight(),flight:p.userData.airborneLift};
            }""")
            assert captured_flight and captured_contact,gait
            assert stopped['idle']>.98 and stopped['flight']<.005,stopped
            report['gait']={'maxPhaseError':max(s['phaseError'] for s in gait),'maxFlight':max(s['flight'] for s in gait),'stopped':stopped}
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__modes > *').first.click()
            page.locator('.scene-controls__trigger').click()
            page.evaluate("() => __audit.scene.children.find(o=>o.userData.isGltf).position.set(0,.08,13)")
            page.wait_for_timeout(300)

            # Arrange two existing NPCs on a clear central lane and let their actual update loop run.
            initial=page.evaluate("""() => {
              const actors=__audit.scene.children.filter(o=>o.userData.kind==='rigged-pedestrian');
              if(actors.length<2)throw Error('Expected two pedestrians');
              actors.slice(0,2).forEach((a,i)=>{a.position.x=0;a.position.z=3+i*3;a.userData.startZ=4.5;a.userData.range=6;a.userData.direction=i?-1:1});
              window.__subjects=actors.slice(0,2);
              return actors.slice(0,2).map(a=>({radius:a.userData.collisionRadius,scale:a.scale.x}));
            }""")
            required=sum(a['radius'] for a in initial)
            minimum=float('inf'); player_gap=float('inf')
            page.keyboard.down('w')
            for _ in range(90):
                page.wait_for_timeout(100)
                values=page.evaluate("""() => {
                  const [a,b]=__subjects,p=__audit.scene.children.find(o=>o.userData.isGltf);
                  return {separation:Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),
                    gap:Math.min(...[a,b].map(n=>Math.hypot(n.position.x-p.position.x,n.position.z-p.position.z)-n.userData.collisionRadius-p.userData.collisionRadius))};
                }""")
                minimum=min(minimum,values['separation']);player_gap=min(player_gap,values['gap'])
                assert values['separation']>=required-.002, values
                assert values['gap']>=-.002,values
            page.keyboard.up('w')
            report['neighbors']={'required':required,'minimum':minimum,'playerMinimumGap':player_gap}
            page.screenshot(path=OUT/'pedestrian-clearance.png')
            print('NPC and player motion clearance passed',flush=True)

            # A short unobstructed patrol forces several real stop/turn/resume transitions.
            page.evaluate("""() => {
              const p=__audit.scene.children.find(o=>o.userData.isGltf);p.position.set(0,.08,13);
              __subjects.forEach((a,i)=>{
                a.position.set(i?2:-2,.08,0);a.rotation.y=0;
                Object.assign(a.userData,{direction:1,startZ:0,range:.45,motionSpeed:0,blockedTime:0});
              });
            }""")
            previous=None;turn_frames=0;backwards=0;directions=set()
            for _ in range(75):
                page.wait_for_timeout(100)
                state=page.evaluate("() => {const a=__subjects[0];return {z:a.position.z,yaw:a.rotation.y,direction:a.userData.direction}}")
                directions.add(state['direction'])
                if previous:
                    dz=state['z']-previous['z']
                    backwards=max(backwards,-dz*__import__('math').cos(state['yaw']))
                    if abs(state['yaw']-previous['yaw'])>.025 and abs(dz)<.005:turn_frames+=1
                previous=state
            assert backwards<.003,(backwards,turn_frames)
            assert turn_frames>8 and directions=={-1,1},(turn_frames,directions)
            report['patrolTurns']={'stationaryTurnSamples':turn_frames,'maximumBackwardMovement':backwards}
            audit.depth.capture_canvas(page,OUT/'pedestrian-turn.png')

            # Browser visibility handler, followed by actual WebGL loss/restore events.
            page.evaluate("() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))}")
            page.wait_for_timeout(200)
            paused=page.evaluate('() => __audit.frames.at(-1).t')
            page.wait_for_timeout(400)
            assert page.evaluate('() => __audit.frames.at(-1).t')==paused
            page.evaluate("() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))}")
            page.wait_for_timeout(500)
            assert page.evaluate('() => __audit.frames.at(-1).t')>paused
            page.evaluate('() => __audit.renderer.forceContextLoss()')
            page.wait_for_timeout(500)
            assert page.evaluate('() => __audit.renderer.getContext().isContextLost()')
            page.evaluate('() => __audit.renderer.forceContextRestore()')
            page.wait_for_timeout(2000)
            assert not page.evaluate('() => __audit.renderer.getContext().isContextLost()')
            audit.wait_player(page)
            audit.depth.capture_canvas(page,OUT/'restored.png')
            report['visibilityAndWebglRecovery']=True
            report['canvases']=page.locator('#street-canvas canvas').count()
            assert report['canvases']==1
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error);raise
        finally:
            report['errors']=errors
            (OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
