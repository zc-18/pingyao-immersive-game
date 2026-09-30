"""Production UI economy/journal/audio checks and a separate all-outfits visual fixture."""
import importlib.util
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('courtyard', ROOT / 'enclosed-courtyard-audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
OUT = ROOT / 'artifacts/app-gameplay'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://localhost:5219'
READ = "key => window.__pygc.readStorage(key)"
AUDIO = """(() => {
  window.__audio=[];
  window.Audio=new Proxy(window.Audio,{construct(Target,args){const a=new Target(...args);window.__audio.push(a);return a}});
  window.__rejections=[];
  addEventListener('unhandledrejection',e=>__rejections.push(String(e.reason?.message||JSON.stringify(e.reason))));
})();"""

def go(page, route, selector):
    page.goto(BASE + '/#/' + route)
    page.locator(selector).wait_for(timeout=30000)
    page.wait_for_timeout(500)

def confirm(page):
    page.locator('.app-modal__button--confirm').click()

def main():
    report = {}
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width':844,'height':390}, device_scale_factor=1)
        page.add_init_script(audit.depth.PROBE)
        page.add_init_script(AUDIO)
        page.on('pageerror', lambda error: errors.append(error.message))
        page.on('response', lambda response: errors.append(f'HTTP {response.status}: {response.url}') if response.status >= 400 else None)
        try:
            go(page, 'splash', '.splash-enter-frame')
            page.locator('.splash-enter-frame').click(force=True)
            page.locator('.role-confirm-token').wait_for()
            page.wait_for_timeout(800)
            page.locator('.role-confirm-token').click(force=True)
            audit.wait_player(page)
            print('Rendered player ready', flush=True)
            page.locator('.brush-loader').wait_for(state='hidden', timeout=25000)
            page.wait_for_timeout(3000)
            audit.approach(page, 'z', 7)
            audit.approach(page, 'x', -3.6)
            page.locator('.street-stage__poi-paper').wait_for()
            page.locator('.street-stage__poi-tool').first.click()
            page.locator('.street-stage__poi-tool').nth(1).click()
            page.locator('.app-modal__input').first.fill('票号院里听一段汇通天下的故事。')
            confirm(page)
            print('Journal saved', flush=True)
            page.locator('.street-stage__poi-action').first.click()
            # One real browser storage failure between the final objective and reward.
            page.evaluate("""() => {
              const original=Storage.prototype.setItem;
              window.__rejectedReward=false;
              Storage.prototype.setItem=function(key,value) {
                if(key==='pygc_user_progress'&&!window.__rejectedReward) {
                  const raw=JSON.parse(value), data=raw.data??raw;
                  if(data.questData?.completedQuests?.includes('main-rishengchang')) {
                    window.__rejectedReward=true;
                    throw new DOMException('Simulated quota at reward settlement','QuotaExceededError');
                  }
                }
                return original.call(this,key,value);
              };
            }""")
            page.locator('.street-stage__poi-investigate').click()
            print('First settlement attempted', flush=True)
            assert page.evaluate('() => __rejectedReward')
            assert 'main-rishengchang' not in page.evaluate(READ,'pygc_user_progress')['questData']['completedQuests']
            page.locator('.street-stage__poi-investigate').click()
            page.locator('.reward-stage__claim').wait_for()
            page.locator('.reward-stage__claim').click()
            page.wait_for_timeout(1200)
            progress = page.evaluate(READ, 'pygc_user_progress')
            assert 'main-rishengchang' in progress['questData']['completedQuests']
            assert 'rishengchang' in progress['favoritePoiIds']
            assert '汇通天下' in progress['journalNotes']['rishengchang']
            audio_state = page.evaluate("() => __audio.filter(a=>a.src.includes('bgm_')).map(a=>({time:a.currentTime,paused:a.paused,ready:a.readyState,error:a.error?.code}))")
            assert any(a['time'] > 0 and a['ready'] >= 2 and not a['error'] for a in audio_state), audio_state
            assert not page.evaluate('() => __rejections')
            report['journalAndAudio'] = {'favorite':True,'note':True,'audio':audio_state,'rewardWriteFailureRetry':True}
            print('Quest, journal and actual audio decoding passed', flush=True)
            if '--retry-only' in sys.argv:
                report['passed'] = True
                return

            go(page, 'user', '.ledger')
            page.locator('.check-in-card__btn').click()
            before = page.evaluate(READ, 'pygc_user_progress')
            page.locator('.check-in-card__btn').click()
            assert page.evaluate(READ, 'pygc_user_progress')['silver'] == before['silver']
            assert before['checkIn']['totalDays'] == 1
            page.locator('.ledger__tryon').click()
            page.locator('.wardrobe__card').nth(1).click()
            page.locator('.wardrobe__close').click()
            assert page.evaluate(READ, 'pygc_user_progress')['equippedCostume'] == 'ledger-clerk'
            page.wait_for_timeout(150)
            assert page.evaluate("() => __audio.some(a=>a.src.includes('sfx_')&&!a.paused&&a.currentTime>0)"), 'Audio must remain usable after leaving the street'
            page.screenshot(path=OUT/'ledger.png')
            page.locator('.ledger__settings-ring').click()
            page.locator('.ledger__settings-toggle').first.click()
            assert page.evaluate(READ, 'pygc_game_settings')['enableMusic'] is False
            page.locator('.ledger__settings-toggle').first.click()
            page.locator('.ledger__settings-ring').click()
            report['signInWardrobeSettings'] = True

            go(page, 'shop', '.shop-stage')
            before = page.evaluate(READ, 'pygc_user_progress')['silver']
            page.locator('.shop-stage__category').nth(2).click()
            page.locator('.shop-stage__product').first.click()
            page.locator('.shop-stage__detail-buy').dblclick()
            page.locator('.redeem-stage__voucher').wait_for(timeout=15000)
            progress = page.evaluate(READ, 'pygc_user_progress')
            assert len(progress['redeemOrders']) == 1
            assert progress['silver'] == before - 88
            assert 'lantern-festival' in progress['ownedCostumes']
            page.locator('.redeem-stage__voucher-action').first.click()
            confirm(page)
            page.wait_for_timeout(500)
            assert page.evaluate(READ, 'pygc_user_progress')['redeemOrders'][0]['status'] == 'used'
            for w,h in audit.depth.VIEWS:
                page.set_viewport_size({'width':w,'height':h})
                page.wait_for_timeout(200)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
                page.screenshot(path=OUT/f'voucher-{w}x{h}.png')
            page.reload()
            page.locator('.redeem-stage__voucher').wait_for()
            assert '已核销' in page.locator('.redeem-stage__voucher').inner_text()
            report['redemption'] = {'doubleClickOrders':1,'silverCharged':88,'outfitUnlocked':True,'usedAfterReload':True}
            print('Sign-in, wardrobe, purchase and voucher persistence passed', flush=True)

            for name,selector in [('index','.hub-stage'),('map','.map-stage'),('shop','.shop-stage'),('user','.ledger')]:
                go(page, ('home' if name == 'index' else name), selector)
                for w,h in audit.depth.VIEWS:
                    page.set_viewport_size({'width':w,'height':h})
                    page.wait_for_timeout(200)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'), (name,w,h)
                page.screenshot(path=OUT/f'{name}.png')
            report['fourTabsSixViewports'] = True

            # Explicit visual fixture: earned outfit prerequisites are seeded only here.
            # The preceding purchase/sign-in/main-quest checks used a fresh real save.
            page.evaluate("""() => {const raw=JSON.parse(localStorage.getItem('pygc_user_progress'));const p=raw.data??raw;p.exp=5000;p.silverKey=1000;p.ownedCostumes=['commoner','ledger-clerk','escort-garb','lantern-festival'];localStorage.setItem('pygc_user_progress',JSON.stringify(raw))}""")
            page.set_viewport_size({'width':844,'height':390})
            go(page,'street','#street-canvas canvas')
            audit.wait_player(page)
            page.locator('.brush-loader').wait_for(state='hidden')
            page.locator('.scene-controls__trigger').click()
            page.locator('.scene-controls__modes > *').nth(1).click()
            page.locator('.scene-controls__phases > *').nth(1).click()
            page.locator('.scene-controls__trigger').click()
            report['outfits'] = []
            for i in range(7):
                page.locator('.street-hud__coin').first.click()
                page.locator('.wardrobe__card').nth(i).click()
                page.locator('.wardrobe__close').click()
                page.wait_for_timeout(700)
                costume = page.evaluate(READ,'pygc_user_progress')['equippedCostume']
                audit.depth.capture_canvas(page,OUT/f'outfit-{costume}.png')
                page.locator('.scene-controls__trigger').click()
                page.locator('[aria-label="拱手致意"]').click()
                page.wait_for_timeout(600)
                audit.depth.capture_canvas(page,OUT/f'greeting-{costume}.png')
                page.locator('.scene-controls__trigger').click()
                assert page.evaluate("() => __audit.scene.children.filter(o=>o.userData.isGltf).length") == 1
                report['outfits'].append(costume)
            assert len(set(report['outfits'])) == 7
            assert not page.evaluate('() => __rejections')
            assert not errors, errors
            report['passed'] = True
        except Exception as error:
            report['failure'] = repr(error)
            print(repr(error), flush=True)
            raise
        finally:
            report['errors'] = errors
            name = 'report-retry.json' if '--retry-only' in sys.argv else 'report.json'
            (OUT/name).write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
            try:
                page.screenshot(path=OUT/'last-state.png',timeout=10000)
            except Exception as error:
                print('Final screenshot unavailable: ' + str(error), flush=True)
            browser.close()
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__ == '__main__': main()
