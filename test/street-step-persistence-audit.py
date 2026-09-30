"""Actual movement, failed local saves, quest settlement, wall contact and page re-entry."""
import importlib.util
import json
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/resume-step-persistence'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://127.0.0.1:5219'
READ = "() => window.__pygc.readStorage('pygc_user_progress')"
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
def instrument_renderer(route):
    """Wrap the actual mount callback in the browser response, never a Vue proxy.

    Intercept the module requested by the page (including Vite HMR query strings)
    rather than import another module instance or modify production source.
    """
    response = route.fetch()
    source = response.text()
    marker = "messageCallback = onMessage"
    assert source.count(marker) == 1, "Renderer mount callback contract changed"
    wrapped = """messageCallback = (msg) => {
      if (msg.detail?.type === 'player-move') window.__steps.events.push({...msg.detail.data});
      return onMessage(msg);
    };
    window.__steps.callbackWrapped = true"""
    route.fulfill(response=response, body=source.replace(marker, wrapped))


HOOK = "() => { if (!window.__steps.callbackWrapped) throw Error('Renderer mount callback probe missing'); }"


def ready(page):
    audit.wait_player(page)
    page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
    page.evaluate(HOOK)


def daily(progress):
    return progress['questData']['questProgress']['daily-walk']['objectives'][0]['current']


def emitted(page):
    return page.evaluate('() => __steps.events.reduce((sum,e)=>sum+e.steps,0)')

def walk_steps(page, key, count):
    """Drive real input until measured movement reaches the requested steps.

    Fixed wall-clock key holds can render fewer than one stride on a busy GPU.
    The bounded wait still fails if input, collision or step emission is broken.
    """
    target=emitted(page)+count
    page.keyboard.down(key)
    try:
        page.wait_for_function('(target) => __steps.events.reduce((sum,e)=>sum+e.steps,0)>=target',arg=target,timeout=20000)
    finally:
        page.keyboard.up(key)
    page.wait_for_timeout(350)


def main():
    report = {}; errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width':844,'height':390}, device_scale_factor=1, has_touch=True)
        page.add_init_script(audit.depth.PROBE); page.add_init_script(PROBE)
        page.route(re.compile(r'/src/pages_game/street/street-renderer\.js(?:\?.*)?$'), instrument_renderer)
        page.on('pageerror', lambda e: errors.append(e.message))
        try:
            page.goto(BASE+'/#/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.evaluate("""() => {
              for(const [key,patch] of Object.entries({pygc_user_profile:{roleId:'study',roleName:'研学者'},pygc_runtime:{hasCompletedPrologue:true,currentStreetScene:'bank-house'}})) {
                const raw=JSON.parse(localStorage.getItem(key));Object.assign(raw.data??raw,patch);localStorage.setItem(key,JSON.stringify(raw));
              }
            }""")
            page.goto(BASE+'/#/street'); ready(page)
            walk_steps(page, 'w', 1); page.wait_for_timeout(1100)
            progress = page.evaluate(READ)
            assert progress['steps'] == emitted(page) and progress['steps'] > 0, (progress, emitted(page))
            assert daily(progress) == progress['steps']
            report['stoppedMovementSaved'] = progress['steps']
            print('Stopped steps saved', flush=True)

            page.evaluate('() => __steps.block=true')
            walk_steps(page, 'w', 2); page.wait_for_timeout(900)
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

            # Preserve pending increments through an actual Vue page hide/cache transition.
            page.evaluate('() => __steps.block=true')
            walk_steps(page, 'w', 2)
            page.locator('.street-hud__coin').nth(1).tap()
            page.locator('.ledger').wait_for()
            pending_total = emitted(page)
            assert pending_total > page.evaluate(READ)['steps']
            page.evaluate('() => __steps.block=false')
            page.locator('.app-tabbar__item').first.tap()
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
            walk_steps(page, 'w', 4); page.wait_for_timeout(1000)
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
            front_limit=page.evaluate('() => __pygc.page.setupState.streetWorldLayout.roadBounds.zMax')
            for _ in range(30):
                previous_z=page.evaluate(audit.PLAYER)['z']
                audit.hold(page, 's', 1000)
                current_z=page.evaluate(audit.PLAYER)['z']
                if current_z >= front_limit-.5 and abs(current_z-previous_z)<.01: break
            page.wait_for_timeout(1100)
            at_wall = page.evaluate(audit.PLAYER); wall_steps = page.evaluate(READ)['steps']
            assert at_wall['z'] >= front_limit-.5, at_wall
            audit.hold(page, 's', 2400); page.wait_for_timeout(1000)
            after_wall = page.evaluate(audit.PLAYER)
            report['wallProbe'] = {'before':at_wall,'after':after_wall,'beforeSteps':wall_steps,'afterSteps':page.evaluate(READ)['steps'],
                                  'lastMoves':page.evaluate('() => __steps.events.slice(-24)')}
            assert abs(after_wall['z'] - at_wall['z']) < .01
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
            page.wait_for_function('(steps) => __pygc.readStorage("pygc_user_progress").steps > steps',arg=wall_steps,timeout=20000)
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

            # Cross a local day boundary in the browser clock, then record real
            # movement. The completed previous-day task must not award twice.
            next_day = page.evaluate("""() => {
              const d=new Date();d.setDate(d.getDate()+1);d.setHours(12,0,0,0);
              return {time:d.getTime(),key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
            }""")
            # Playwright Python's numeric clock time is seconds, JS Date is ms.
            page.clock.set_fixed_time(next_day['time'] / 1000)
            walk_steps(page, 'w', 2);page.wait_for_timeout(1300)
            tomorrow = page.evaluate(READ)
            assert tomorrow['steps'] > portrait['steps']
            assert tomorrow['questData']['dailyReset'] == next_day['key']
            assert daily(tomorrow) == tomorrow['steps'] - portrait['steps']
            assert 'daily-walk' not in tomorrow['questData']['completedQuests']
            assert tomorrow['silver'] == portrait['silver']
            report['localMidnightStartsNewDaily'] = {'date':next_day['key'],'totalSteps':tomorrow['steps'],'dailySteps':daily(tomorrow),'silverUnchanged':True}
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
