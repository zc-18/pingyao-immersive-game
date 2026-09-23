"""Actual movement, failed local saves, quest settlement, wall contact and page re-entry."""
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
OUT = ROOT / 'artifacts/step-persistence'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://localhost:5219'
READ = "() => {const r=JSON.parse(localStorage.getItem('pygc_user_progress'));return r.data??r}"
PROBE = """(() => {
  window.__steps={events:[],writes:[],rejected:[],block:false,blockReward:false};
  const write=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value) {
    if(key==='pygc_user_progress') {
      const raw=JSON.parse(value),next=raw.data??raw;
      const previous=JSON.parse(this.getItem(key)||'{}'),old=previous.data??previous;
      const event={steps:next.steps,oldSteps:old.steps,daily:next.questData?.questProgress?.['daily-walk']?.objectives[0].current,
        completed:next.questData?.completedQuests?.includes('daily-walk'),silver:next.silver};
      if((__steps.block && next.steps>old.steps)||(__steps.blockReward && event.completed)) {
        __steps.rejected.push(event);
        throw new DOMException('Injected walking save failure','QuotaExceededError');
      }
      __steps.writes.push(event);
    }
    return write.call(this,key,value);
  };
})();"""
HOOK = """() => {
  let c=document.querySelector('.street-stage').__vueParentComponent;
  while(c) {
    if(typeof c.proxy?.handleRenderMsg==='function') {
      if(c.proxy.handleRenderMsg.__stepProbe)return;
      const original=c.proxy.handleRenderMsg;
      const wrapped=function(msg){if(msg.detail?.type==='player-move')__steps.events.push({...msg.detail.data});return original.call(this,msg)};
      wrapped.__stepProbe=true;c.proxy.handleRenderMsg=wrapped;return;
    }
    c=c.parent;
  }
  throw Error('Movement bridge not found');
}"""


def ready(page):
    audit.wait_player(page)
    page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
    page.evaluate(HOOK)


def daily(progress):
    return progress['questData']['questProgress']['daily-walk']['objectives'][0]['current']


def emitted(page):
    return page.evaluate('() => __steps.events.reduce((sum,e)=>sum+e.steps,0)')


def main():
    report = {}; errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width':844,'height':390}, device_scale_factor=1, has_touch=True)
        page.add_init_script(audit.depth.PROBE); page.add_init_script(PROBE)
        page.on('pageerror', lambda e: errors.append(e.message))
        try:
            page.goto(BASE+'/#/pages_game/splash/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto(BASE+'/#/pages_game/street/street'); ready(page)
            audit.hold(page, 'w', 550); page.wait_for_timeout(1100)
            progress = page.evaluate(READ)
            assert progress['steps'] == emitted(page) and progress['steps'] > 0, (progress, emitted(page))
            assert daily(progress) == progress['steps']
            report['stoppedMovementSaved'] = progress['steps']
            print('Stopped steps saved', flush=True)

            page.evaluate('() => __steps.block=true')
            audit.hold(page, 'w', 1100); page.wait_for_timeout(900)
            assert page.evaluate(READ)['steps'] == progress['steps']
            assert len(page.evaluate('() => __steps.rejected')) > 0
            page.screenshot(path=OUT/'save-retry.png')
            page.evaluate('() => __steps.block=false')
            page.wait_for_timeout(3300)
            recovered = page.evaluate(READ)
            assert recovered['steps'] == emitted(page)
            assert daily(recovered) == recovered['steps']
            report['automaticRetry'] = {'before':progress['steps'],'after':recovered['steps'],'rejected':page.evaluate('() => __steps.rejected.length')}
            print('Save failure recovered', flush=True)

            # Preserve pending increments through an actual uni-app page teardown.
            page.evaluate('() => __steps.block=true')
            audit.hold(page, 'w', 850)
            page.locator('.street-hud__coin').nth(1).tap()
            page.locator('.ledger').wait_for()
            pending_total = emitted(page)
            assert pending_total > page.evaluate(READ)['steps']
            page.evaluate('() => __steps.block=false')
            page.locator('.uni-tabbar__item').first.tap()
            page.locator('.hub-stage__npc-bar-cta').tap()
            ready(page); page.wait_for_timeout(900)
            assert page.evaluate(READ)['steps'] == pending_total
            report['reentryRecoveredOnce'] = pending_total
            print('Page re-entry recovered', flush=True)

            # Seed only the long daily grind; the crossing of 1000 is real movement.
            page.evaluate("""() => {
              const raw=JSON.parse(localStorage.getItem('pygc_user_progress')),p=raw.data??raw;
              p.steps=997;p.questData.questProgress['daily-walk'].objectives[0].current=997;
              localStorage.setItem('pygc_user_progress',JSON.stringify(raw));
              __steps.blockReward=true;
            }""")
            before_reward = page.evaluate(READ); baseline_events = emitted(page)
            audit.hold(page, 'w', 1800); page.wait_for_timeout(1000)
            blocked = page.evaluate(READ)
            assert 'daily-walk' not in blocked['questData']['completedQuests']
            assert blocked['steps'] < 1000 and daily(blocked) == blocked['steps']
            assert blocked['silver'] == before_reward['silver']
            page.evaluate('() => __steps.blockReward=false'); page.wait_for_timeout(3300)
            completed = page.evaluate(READ)
            assert completed['steps'] == 997 + emitted(page) - baseline_events
            assert daily(completed) == 1000
            assert completed['questData']['completedQuests'].count('daily-walk') == 1
            assert completed['silver'] == before_reward['silver'] + 15
            page.screenshot(path=OUT/'daily-complete.png')
            page.wait_for_timeout(3300)
            assert page.evaluate(READ)['silver'] == completed['silver']
            report['rewardAtomicAndOnce'] = {'steps':completed['steps'],'silverReward':15}
            print('Daily completion recovered once', flush=True)

            # Push against the closed front gate. Movement keys alone must not count.
            audit.hold(page, 's', 9000); page.wait_for_timeout(1100)
            at_wall = page.evaluate(audit.PLAYER); wall_steps = page.evaluate(READ)['steps']
            assert at_wall['z'] > 19, at_wall
            audit.hold(page, 's', 2400); page.wait_for_timeout(1000)
            after_wall = page.evaluate(audit.PLAYER)
            report['wallProbe'] = {'before':at_wall,'after':after_wall,'beforeSteps':wall_steps,'afterSteps':page.evaluate(READ)['steps'],
                                  'lastMoves':page.evaluate('() => __steps.events.slice(-24)')}
            assert abs(after_wall['z'] - at_wall['z']) < .01
            assert report['wallProbe']['afterSteps'] == wall_steps, report['wallProbe']
            # The bank camera starts at yaw 0.2: S legitimately slides along the
            # wall. A touch vector rotated by -0.2 points along its true normal.
            import math
            client=page.context.new_cdp_session(page)
            def normal_push():
                client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':120,'y':260,'id':1}]})
                client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':120-55*math.sin(.2),'y':260+55*math.cos(.2),'id':1}]})
                page.wait_for_timeout(1700)
                client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                page.wait_for_timeout(1100)
            normal_push()
            at_wall = page.evaluate(audit.PLAYER); wall_steps = page.evaluate(READ)['steps']
            normal_push()
            after_wall = page.evaluate(audit.PLAYER)
            assert page.evaluate(READ)['steps'] == wall_steps, (at_wall,after_wall,wall_steps,page.evaluate(READ)['steps'])
            assert math.hypot(after_wall['x']-at_wall['x'],after_wall['z']-at_wall['z']) < .01
            assert not page.locator('.street-stage__poi-paper').is_visible(), 'A modal must not stand in for collision'
            page.screenshot(path=OUT/'closed-gate.png')
            report['wallCannotFarmSteps'] = {'position':after_wall,'steps':wall_steps}

            # Real portrait touch movement uses the same persistence path.
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(500)
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':90,'y':610,'id':1}]})
            client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':90,'y':550,'id':1}]})
            page.wait_for_timeout(1200)
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.wait_for_timeout(1500)
            portrait = page.evaluate(READ)
            assert portrait['steps'] > wall_steps
            assert portrait['silver'] == completed['silver']
            page.screenshot(path=OUT/'portrait-walking.png')
            report['portraitTouchSaved'] = portrait['steps']
            page.reload(); ready(page)
            assert page.evaluate(READ)['steps'] == portrait['steps']
            assert page.evaluate(READ)['silver'] == portrait['silver']
            report['reloadPreservesProgress'] = True
            assert not errors, errors
            report['passed'] = True
        except Exception as error:
            report['failure'] = repr(error)
            page.screenshot(path=OUT/'failure.png')
            raise
        finally:
            report['errors'] = errors
            (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__ == '__main__': main()
