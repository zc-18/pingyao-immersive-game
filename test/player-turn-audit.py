"""Actual keyboard/touch reversals, body-facing travel and turn recovery."""
import importlib.util
import base64
import io
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('courtyard',ROOT/'enclosed-courtyard-audit.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
OUT=ROOT/'artifacts/player-turn'
OUT.mkdir(parents=True,exist_ok=True)
os.environ.update(TEMP=str(OUT),TMP=str(OUT))
PROBE="""() => {
  const r=__audit.renderer,draw=r.render.bind(r);window.__turnFrames=[];
  r.render=(world,camera)=>{
    if(world===__audit.scene&&window.__turnRecording){
      const p=world.children.find(o=>o.userData.isGltf);
      if(p)__turnFrames.push({time:performance.now(),x:p.position.x,z:p.position.z,yaw:p.rotation.y,
        turn:p.userData.turnRate||0,walk:p.userData.actions.walk.getEffectiveWeight(),run:p.userData.actions.run.getEffectiveWeight()});
    }
    const result=draw(world,camera);
    if(world===__audit.scene&&window.__turnCapture){
      const capture=__turnCapture,elapsed=performance.now()-capture.started;
      if(elapsed>=capture.next){
        queueMicrotask(()=>capture.shots.push({time:elapsed,png:r.domElement.toDataURL('image/png')}));
        capture.next+=120;
        if(capture.next>=960)window.__turnCapture.done=true;
      }
      if(__turnCapture.done)window.__turnCapture=null;
    }
    return result;
  };
}"""


def analyze(frames):
    import math
    backward=0;peak=0;turn_steps=0;max_turn=0;max_rate=0
    for a,b in zip(frames,frames[1:]):
        dt=(b['time']-a['time'])/1000
        if dt<=0:continue
        dx=b['x']-a['x'];dz=b['z']-a['z']
        backwards=max(0,-dx*math.sin(b['yaw'])-dz*math.cos(b['yaw']))
        backward+=backwards;peak=max(peak,backwards/dt)
        delta=math.atan2(math.sin(b['yaw']-a['yaw']),math.cos(b['yaw']-a['yaw']))
        max_turn=max(max_turn,abs(delta))
        max_rate=max(max_rate,abs(b.get('turn',0)))
        if abs(delta)>.025 and math.hypot(dx,dz)<.003 and b['walk']>.12:turn_steps+=1
    return {'backwardDistance':backward,'peakBackwardSpeed':peak,'turnStepFrames':turn_steps,'maxFrameRotation':max_turn,'maxControllerTurnRate':max_rate,'frames':len(frames)}


def capture_turn(page,prefix):
    # Separate visual recording so image encoding cannot affect the metric samples.
    page.keyboard.down('w');page.wait_for_timeout(900)
    page.evaluate('() => {window.__turnShots=[];window.__turnCapture={started:performance.now(),next:0,shots:__turnShots}}')
    page.keyboard.up('w');page.keyboard.down('s');page.wait_for_timeout(1250);page.keyboard.up('s')
    shots=page.evaluate('() => __turnShots')
    assert len(shots)==8,len(shots)
    tiles=[]
    for index,shot in enumerate(shots):
        frame=Image.open(io.BytesIO(base64.b64decode(shot['png'].split(',')[1]))).convert('RGB')
        # Equal central crops preserve the real follow-camera framing and nearby geometry.
        w,h=frame.size
        frame=frame.crop((int(w*.32),int(h*.16),int(w*.68),h)).resize((300,324))
        tile=Image.new('RGB',(300,352),'#eee4d4');tile.paste(frame,(0,28))
        ImageDraw.Draw(tile).text((12,8),f'{index+1} / {shot["time"]:.0f} ms',fill='#503d32')
        tiles.append(tile)
    contact=Image.new('RGB',(1200,704),'#eee4d4')
    for i,tile in enumerate(tiles):contact.paste(tile,((i%4)*300,(i//4)*352))
    contact.save(OUT/f'{prefix}-turn-sequence.jpg',quality=94)


def verify_interruption(page,report):
    report['interruptions']={}
    for mode in ['release','settings']:
        page.keyboard.down('w');page.wait_for_timeout(1000)
        page.keyboard.up('w');page.keyboard.down('s')
        page.wait_for_function('() => {const d=__audit.scene.children.find(o=>o.userData.isGltf).userData;return d.motionTurning&&Math.abs(d.turnRate)>5}',timeout=1500)
        if mode=='settings':page.get_by_role('button',name='设置',exact=True).tap()
        page.keyboard.up('s');page.wait_for_timeout(80)
        stopped=page.evaluate(audit.PLAYER);page.wait_for_timeout(350);after=page.evaluate(audit.PLAYER)
        assert abs(stopped['x']-after['x'])+abs(stopped['z']-after['z'])<.001,(mode,stopped,after)
        assert abs(stopped['rotation']-after['rotation'])<.001,(mode,stopped,after)
        report['interruptions'][mode]={'positionStable':True,'headingStable':True}
        if mode=='settings':page.get_by_role('button',name='继续游历',exact=True).tap()


def verify_sizes(page,report):
    report['touchViewports']=[]
    cdp=page.context.new_cdp_session(page)
    for w,h in [(390,844),(667,375),(932,430)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(600)
        before=page.evaluate(audit.PLAYER);x=round(w*.18);y=round(h*.65)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-48,'id':1}]})
        page.wait_for_timeout(1100)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(900)
        after=page.evaluate(audit.PLAYER)
        travel=__import__('math').hypot(after['x']-before['x'],after['z']-before['z'])
        assert travel>.25,(w,h,before,after)
        page.wait_for_timeout(300);stopped=page.evaluate(audit.PLAYER)
        assert abs(stopped['x']-after['x'])+abs(stopped['z']-after['z'])<.01,(w,h,after,stopped)
        assert page.locator('#street-canvas canvas').count()==1
        page.screenshot(path=OUT/f'after-touch-{w}x{h}.png')
        report['touchViewports'].append({'width':w,'height':h,'travel':travel,'cancelStopped':True})
    cdp.detach()


def main():
    before='--before' in sys.argv;prefix='before' if before else 'after'
    if before and (OUT/'before-report.json').exists():raise RuntimeError('Preserve the turn baseline.')
    report={};errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},has_touch=True)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror',lambda e:errors.append(e.message))
        try:
            page.goto('http://localhost:5219/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for();page.locator('.splash-enter-frame').tap(force=True)
            page.locator('.role-confirm-token').wait_for();page.wait_for_timeout(800);page.locator('.role-confirm-token').tap(force=True)
            audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden');page.wait_for_timeout(2000)
            page.evaluate(PROBE)
            for mode in ['walk','run']:
                if mode=='run':
                    page.locator('.scene-controls__trigger').tap();page.locator('.scene-controls__modes > *').first.tap();page.locator('.scene-controls__trigger').tap()
                page.keyboard.down('w');page.wait_for_timeout(800)
                page.evaluate('() => {__turnFrames=[];__turnRecording=true}')
                page.keyboard.up('w');page.keyboard.down('s');page.wait_for_timeout(1000)
                page.evaluate('() => __turnRecording=false');page.keyboard.up('s')
                frames=page.evaluate('() => __turnFrames');report[mode]=analyze(frames)
                (OUT/f'{prefix}-{mode}-frames.json').write_text(json.dumps(frames),encoding='utf-8')
                page.wait_for_timeout(600)
                print(mode,report[mode],flush=True)
            # Real touch reverses the movement stick; cancellation must still stop it.
            cdp=page.context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':145,'y':255,'id':1}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':145,'y':197,'id':1}]})
            page.wait_for_timeout(700);page.evaluate('() => {__turnFrames=[];__turnRecording=true}')
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':145,'y':313,'id':1}]})
            page.wait_for_timeout(1000);page.evaluate('() => __turnRecording=false')
            frames=page.evaluate('() => __turnFrames');report['touch']=analyze(frames)
            (OUT/f'{prefix}-touch-frames.json').write_text(json.dumps(frames),encoding='utf-8')
            cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});cdp.detach()
            page.wait_for_timeout(900);stopped=page.evaluate(audit.PLAYER);page.wait_for_timeout(300)
            after=page.evaluate(audit.PLAYER)
            assert abs(stopped['x']-after['x'])+abs(stopped['z']-after['z'])<.01,(stopped,after)
            page.screenshot(path=OUT/f'{prefix}-stopped.png')
            if not before:
                for key in ['walk','run','touch']:
                    assert report[key]['backwardDistance']<.003,report[key]
                    assert report[key]['turnStepFrames']>=3,report[key]
                    assert report[key]['maxControllerTurnRate']<=7.001,report[key]
            capture_turn(page,prefix)
            if not before:
                verify_interruption(page,report)
                verify_sizes(page,report)
            assert not errors,errors
            report['passed']=True
        except Exception as error:
            report['failure']=repr(error);page.screenshot(path=OUT/'failure.png');raise
        finally:
            report['errors']=errors
            (OUT/f'{prefix}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
