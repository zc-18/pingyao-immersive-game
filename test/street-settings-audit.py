"""Production HUD hit areas, settings, live audio/render effects and recovery."""
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
OUT = ROOT / 'artifacts/street-settings'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://localhost:5219'
READ = "key => window.__pygc.readStorage(key)"
PROBE = """(() => {
  window.__settingAudio=[];window.__failSetting=false;window.__settingRejected=0;
  window.Audio=new Proxy(window.Audio,{construct(Target,args){const audio=new Target(...args);__settingAudio.push(audio);return audio}});
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(key==='pygc_game_settings'&&__failSetting){__settingRejected++;throw new DOMException('Injected setting write failure','QuotaExceededError')}
    return original.call(this,key,value);
  };
})();"""


def assert_target(locator, width, height):
    box=locator.bounding_box()
    assert box and box['width']>=44 and box['height']>=44, box
    assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1, box
    assert locator.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'), box


def verify_settings(page,report):
    views=[(320,568),(390,844),(430,932),(568,320),(667,375),(844,390),(932,430),(1440,900)]
    for w,h in views:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(350)
        for label in ['换装','行旅册','设置']:
            assert_target(page.get_by_role('button',name=label,exact=True),w,h)
        page.get_by_role('button',name='设置',exact=True).tap()
        dialog=page.get_by_role('dialog',name='行旅设置');dialog.wait_for()
        for label in ['关闭设置','继续游历','问问向导','返回古城']:
            button=dialog.get_by_role('button',name=label)
            button.scroll_into_view_if_needed();assert_target(button,w,h)
        for label in ['游戏声音','灯光特效']:
            toggle=dialog.get_by_role('switch',name=label)
            toggle.scroll_into_view_if_needed();assert_target(toggle,w,h)
        dialog.get_by_role('button',name='关闭设置').scroll_into_view_if_needed()
        page.screenshot(path=OUT/f'settings-{w}x{h}.png')
        dialog.get_by_role('button',name='关闭设置').tap()
    report['touchTargets']=views
    print('Eight viewports and actual touch targets passed',flush=True)

    page.set_viewport_size({'width':844,'height':390})
    page.get_by_role('button',name='设置',exact=True).focus()
    page.keyboard.press('Enter')
    page.get_by_role('dialog',name='行旅设置').wait_for()
    page.wait_for_timeout(100)
    assert page.evaluate("() => document.activeElement?.getAttribute('aria-label')==='关闭设置'")
    page.keyboard.press('Shift+Tab')
    assert '继续游历' in page.evaluate('() => document.activeElement.innerText')
    page.keyboard.press('Enter')
    page.locator('.street-settings').wait_for(state='hidden')
    page.keyboard.press('Space')
    page.get_by_role('dialog',name='行旅设置').wait_for()
    page.keyboard.press('Escape')
    assert not page.locator('.street-settings').count()
    assert page.evaluate("() => document.activeElement?.getAttribute('aria-label')==='设置'")
    report['keyboardFocus']=True

    # Open settings while walking: the modal must stop the character, then release input.
    page.keyboard.down('w');page.wait_for_timeout(450)
    page.get_by_role('button',name='设置',exact=True).tap();page.wait_for_timeout(300)
    stopped=page.evaluate(audit.PLAYER);page.wait_for_timeout(700)
    still=page.evaluate(audit.PLAYER)
    assert abs(still['x']-stopped['x'])+abs(still['z']-stopped['z'])<.001,(stopped,still)
    page.keyboard.up('w')
    sound=page.get_by_role('switch',name='游戏声音')
    sound.tap();page.wait_for_timeout(250)
    assert page.evaluate(READ,'pygc_game_settings')['enableMusic'] is False
    assert page.evaluate('() => __settingAudio.every(a=>a.paused)')
    sound.tap();page.wait_for_timeout(500)
    assert page.evaluate('() => __settingAudio.some(a=>a.src.includes("bgm_")&&!a.paused&&a.currentTime>0)')
    report['liveAudio']=True
    page.evaluate('() => __failSetting=true')
    sound.tap()
    assert page.evaluate('() => __settingRejected')==1
    assert sound.get_attribute('aria-checked')=='true'
    assert page.evaluate(READ,'pygc_game_settings')['enableMusic'] is True
    page.evaluate('() => __failSetting=false')
    report['failedSaveKeepsSetting']=True
    page.get_by_role('button',name='继续游历').tap()
    audit.hold(page,'w',450)
    moved=page.evaluate(audit.PLAYER)
    assert abs(moved['x']-still['x'])+abs(moved['z']-still['z'])>.3

    # Set the night via real UI, and count full postprocessing draws before/after.
    page.locator('.scene-controls__trigger').tap()
    page.locator('.scene-controls__phases > *').last.tap()
    page.locator('.scene-controls__trigger').tap();page.wait_for_timeout(2500)
    initial=page.evaluate(audit.PLAYER)
    cycles=[]
    def resources():
        return page.evaluate('() => ({...__audit.renderer.info.memory,canvases:document.querySelectorAll("#street-canvas canvas").length,calls:__audit.frames.slice(-10).reduce((n,f)=>n+f.calls,0)/10})')
    page.get_by_role('button',name='设置',exact=True).tap()
    glow=page.get_by_role('switch',name='灯光特效')
    for _ in range(5):
        glow.tap();page.wait_for_timeout(350);off=resources()
        assert page.evaluate(READ,'pygc_game_settings')['enableEffect'] is False
        glow.tap();page.wait_for_timeout(350);on=resources()
        assert page.evaluate(READ,'pygc_game_settings')['enableEffect'] is True
        assert on['calls']>off['calls']+5,(off,on)
        assert on['canvases']==off['canvases']==1
        cycles.append({'off':off,'on':on})
    for state in ['off','on']:
        assert len({cycle[state]['textures'] for cycle in cycles})==1,cycles
        assert len({cycle[state]['geometries'] for cycle in cycles})==1,cycles
    assert page.evaluate(audit.PLAYER)['z']==initial['z']
    report['liveEffectsCycles']=cycles
    print('Audio, storage failure, modal input and five effect cycles passed',flush=True)
    glow.tap()
    page.get_by_role('button',name='继续游历').tap();page.wait_for_timeout(300)
    page.screenshot(path=OUT/'night-effects-off.png')
    page.get_by_role('button',name='设置',exact=True).tap()
    page.get_by_role('switch',name='灯光特效').tap()
    page.get_by_role('button',name='继续游历').tap();page.wait_for_timeout(300)
    page.screenshot(path=OUT/'night-effects-on.png')

    # The old guide remains reachable, and returning must use the same selected settings.
    page.get_by_role('button',name='设置',exact=True).tap()
    page.get_by_role('button',name='问问向导').tap();page.locator('.dialog-stage').wait_for()
    report['guideRoute']=page.url
    page.go_back();audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden')
    page.get_by_role('button',name='换装',exact=True).tap();page.locator('.wardrobe').wait_for()
    page.locator('.wardrobe__close').tap()
    page.get_by_role('button',name='行旅册',exact=True).tap();page.locator('.ledger').wait_for()
    page.locator('.ledger__settings-ring').tap()
    page.locator('.ledger__settings-toggle').nth(1).tap()
    assert page.evaluate(READ,'pygc_game_settings')['enableEffect'] is False
    page.locator('.app-tabbar__item').first.tap()
    page.locator('.hub-stage__npc-bar-cta').tap();audit.wait_player(page);page.locator('.brush-loader').wait_for(state='hidden')
    page.get_by_role('button',name='设置',exact=True).tap()
    assert page.get_by_role('switch',name='灯光特效').get_attribute('aria-checked')=='false'
    page.get_by_role('button',name='返回古城').tap();page.locator('.hub-stage').wait_for()
    report['entryRoutesAndSharedSettings']=True


def main():
    report={}; errors=[]; before='--before' in sys.argv
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'],env=dict(os.environ))
        page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=1,has_touch=True)
        page.add_init_script(audit.depth.PROBE)
        page.add_init_script(PROBE)
        page.on('pageerror',lambda error:errors.append(error.message))
        try:
            page.goto(BASE+'/#/splash');page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto(BASE+'/#/street');audit.wait_player(page)
            page.locator('.brush-loader').wait_for(state='hidden')
            for w,h in [(844,390),(390,844)]:
                page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(700)
                report[f'hud-{w}x{h}']=page.locator('.street-hud__coin').evaluate_all("els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,label:el.getAttribute('aria-label'),text:el.innerText}})")
                page.screenshot(path=OUT/f'{"before" if before else "after"}-{w}x{h}.png')
            if before:
                page.locator('.street-hud__coin').nth(2).tap()
                page.locator('.dialog-stage').wait_for()
                report['settingsRoute']=page.url
                report['baselineVerified']=True
            else:
                verify_settings(page,report)
                assert not errors,errors
                report['passed']=True
        except Exception as error:
            report['failure']=repr(error)
            page.screenshot(path=OUT/'failure.png')
            raise
        finally:
            report['errors']=errors
            (OUT/('before-report.json' if before else 'report.json')).write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
