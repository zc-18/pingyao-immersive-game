"""Actual movement, point reopening, mobile targets and failed objective retry."""
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
OUT = ROOT / 'artifacts/poi-interaction'
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(TEMP=str(OUT), TMP=str(OUT))
BASE = 'http://localhost:5219'
READ = "key => window.__pygc.readStorage(key)"


def progress(page):
    return page.evaluate(READ, 'pygc_user_progress')


def same_rewards(before, after):
    for key in ['silver', 'silverKey', 'exp', 'score']:
        assert before[key] == after[key], (key, before[key], after[key])


def inject_failure(page, objective):
    page.evaluate("""id=>{
      window.__poiRejected=0;window.__poiFailObjective=id;
      if(window.__poiFailureInstalled)return;
      window.__poiFailureInstalled=true;
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='pygc_user_progress'&&__poiFailObjective){
          const raw=JSON.parse(value),next=raw.data??raw;
          if(next.questData?.questProgress?.['main-rishengchang']?.objectives.some(o=>o.id===__poiFailObjective&&o.current>0)){
            __poiRejected++;throw new DOMException('Injected POI objective write failure','QuotaExceededError');
          }
        }
        return original.call(this,key,value);
      };
    }""", objective)


def main():
    before = '--before' in sys.argv
    if before and (OUT / 'before-report.json').exists():
        raise RuntimeError('The original baseline must not be overwritten.')
    report = {}; errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], env=dict(os.environ))
        page = browser.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=1, has_touch=True)
        page.add_init_script(audit.depth.PROBE)
        page.on('pageerror', lambda error: errors.append(error.message))
        try:
            page.goto(BASE + '/#/splash')
            page.locator('.splash-enter-frame').wait_for()
            page.locator('.splash-enter-frame').tap(force=True)
            page.locator('.role-confirm-token').wait_for(); page.wait_for_timeout(800)
            page.locator('.role-confirm-token').tap(force=True)
            audit.wait_player(page)
            page.locator('.brush-loader').wait_for(state='hidden', timeout=30000)
            page.wait_for_timeout(2200)
            if not before:
                inject_failure(page, 'visit-rishengchang')
            audit.approach(page, 'z', 7); audit.approach(page, 'x', -3.6)
            page.locator('.street-stage__poi-paper').wait_for()
            if not before:
                page.locator('.street-stage__poi-error').wait_for()
                assert progress(page)['questData']['questProgress']['main-rishengchang']['objectives'][0]['current'] == 0
                page.evaluate('() => __poiFailObjective=""')
                page.get_by_role('button', name='重试保存点位进度').tap()
                page.locator('.street-stage__poi-error').wait_for(state='hidden')
                assert progress(page)['questData']['questProgress']['main-rishengchang']['objectives'][0]['current'] == 1
                report['arrivalRetry'] = True
            visited = progress(page)
            page.locator('.street-stage__poi-close').tap()
            page.wait_for_timeout(200)
            report['reopenTargets'] = page.locator('.interact-stage__token').count()
            if before:
                assert report['reopenTargets'] == 0
                page.screenshot(path=OUT / 'before-closed.png')
                # The old UI forces a physical leave/re-entry to reopen the panel.
                audit.hold(page, 'd', 650); audit.approach(page, 'x', -3.6)
                page.locator('.street-stage__poi-paper').wait_for()
            else:
                assert report['reopenTargets'] == 1
                verify_reopening(page, report, visited)
            if not before:
                saved_talk = progress(page)
                inject_failure(page, 'talk-rishengchang')
            page.locator('.street-stage__poi-action').first.tap()
            if not before:
                page.locator('.street-stage__poi-error').wait_for()
                same_rewards(saved_talk, progress(page))
                assert progress(page).get('npcTalkCount', 0) == saved_talk.get('npcTalkCount', 0)
                page.evaluate('() => __poiFailObjective=""')
                page.get_by_role('button', name='重试保存点位进度').tap()
                page.locator('.street-stage__poi-error').wait_for(state='hidden')
                assert progress(page)['npcTalkCount'] == saved_talk.get('npcTalkCount', 0) + 1
                report['talkRetry'] = True
            page.wait_for_timeout(2200)
            saved = progress(page)
            inject_failure(page, 'explore-rishengchang')
            page.locator('.street-stage__poi-investigate').tap()
            assert page.evaluate('() => __poiRejected') > 0
            unchanged = progress(page)
            same_rewards(saved, unchanged)
            assert unchanged['questData'] == saved['questData']
            assert not page.locator('.reward-stage__claim').is_visible()
            report['failureFloatingText'] = page.locator('.floating-text-content').all_text_contents()
            if before:
                assert '街景回响已收录' in report['failureFloatingText']
                page.screenshot(path=OUT / 'before-failed-save.png')
            else:
                verify_retry(page, report, saved)
            assert not errors, errors
            report['passed'] = True
        except Exception as error:
            report['failure'] = repr(error)
            page.screenshot(path=OUT / 'failure.png')
            raise
        finally:
            report['errors'] = errors
            (OUT / ('before-report.json' if before else 'report.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            browser.close()
    print(json.dumps(report, ensure_ascii=False), flush=True)


def verify_reopening(page, report, visited):
    views = [(320,568),(390,844),(430,932),(568,320),(667,375),(844,390),(932,430),(1440,900)]
    report['viewports'] = []
    for width, height in views:
        page.set_viewport_size({'width': width, 'height': height}); page.wait_for_timeout(350)
        button = page.get_by_role('button', name='查看日升昌票号', exact=True)
        assert_target(button, width, height)
        page.screenshot(path=OUT / f'reopen-{width}x{height}.png')
        position = page.evaluate(audit.PLAYER)
        button.tap(); page.locator('.street-stage__poi-paper').wait_for()
        page.locator('.street-stage__poi-paper').evaluate('el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{})))')
        page.screenshot(path=OUT / f'panel-{width}x{height}.png')
        assert page.locator('.interact-stage__token').count() == 0
        assert '日升昌' in page.locator('.street-stage__poi-name').inner_text()
        after = page.evaluate(audit.PLAYER)
        assert abs(position['x']-after['x'])+abs(position['z']-after['z']) < .01
        saved = progress(page); same_rewards(visited, saved)
        assert saved['questData']['questProgress']['main-rishengchang'] == visited['questData']['questProgress']['main-rishengchang']
        for control in page.locator('.street-stage__poi-tool, .street-stage__poi-action, .street-stage__poi-close').all():
            control.scroll_into_view_if_needed(); assert_target(control, width, height)
        page.locator('.street-stage__poi-close').tap()
        report['viewports'].append([width, height])
    page.set_viewport_size({'width': 844, 'height': 390})
    for key in ['Enter', 'Space']:
        page.get_by_role('button', name='查看日升昌票号', exact=True).focus()
        page.keyboard.press(key); page.locator('.street-stage__poi-paper').wait_for()
        page.locator('.street-stage__poi-close').tap()
    for label, close in [('设置', '.street-settings__close'), ('换装', '.wardrobe__close')]:
        page.get_by_role('button', name=label, exact=True).tap()
        assert not page.locator('.interact-stage__token').count()
        if label == '设置':
            page.set_viewport_size({'width': 568, 'height': 320}); page.wait_for_timeout(300)
            settings = page.evaluate(READ, 'pygc_game_settings')
            report['settingsScrollMetrics'] = verify_touch_scroll(page, '.street-settings__paper')
            assert page.evaluate(READ, 'pygc_game_settings') == settings
            report['settingsTouchScroll'] = True
        page.locator(close).tap()
        page.locator('.interact-stage__token').wait_for()
        page.set_viewport_size({'width': 844, 'height': 390})
    page.locator('.scene-controls__trigger').tap()
    assert not page.locator('.interact-stage__token').count()
    page.locator('.scene-controls__trigger').tap()
    audit.hold(page, 'd', 950)
    assert not page.locator('.interact-stage__token').count(), 'distant points must not remain interactable'
    audit.approach(page, 'x', -3.6); page.locator('.street-stage__poi-paper').wait_for()
    same_rewards(visited, progress(page))
    report['reopenWithoutRewardOrMovement'] = True
    report['keyboardAndOverlayGates'] = True
    report['leaveAndReenter'] = True


def verify_retry(page, report, saved):
    page.locator('.street-stage__poi-error').wait_for()
    assert not report['failureFloatingText'], report['failureFloatingText']
    for width, height in [(320,568),(390,844),(568,320),(667,375),(844,390)]:
        page.set_viewport_size({'width': width, 'height': height}); page.wait_for_timeout(250)
        if width == 568:
            report['poiScrollMetrics'] = verify_touch_scroll(page, '.street-stage__poi-content')
            report['touchScrollKeepsPlayerStill'] = True
        retry = page.get_by_role('button', name='重试保存点位进度')
        retry.scroll_into_view_if_needed(); assert_target(retry, width, height)
        page.screenshot(path=OUT / f'failed-save-{width}x{height}.png')
    page.locator('.street-stage__poi-close').tap()
    page.get_by_role('button', name='查看日升昌票号', exact=True).tap()
    retry = page.get_by_role('button', name='重试保存点位进度')
    retry.tap(); retry.tap()
    assert page.evaluate('() => __poiRejected') >= 3
    same_rewards(saved, progress(page))
    assert progress(page)['questData'] == saved['questData']
    page.evaluate('() => __poiFailObjective=""')
    retry.tap(); page.locator('.reward-stage__claim').wait_for()
    settled = progress(page)
    assert settled['questData']['completedQuests'].count('main-rishengchang') == 1
    assert settled['silver'] == saved['silver'] + 50
    assert settled['silverKey'] == saved['silverKey'] + 20
    page.screenshot(path=OUT / 'retry-reward.png')
    page.locator('.reward-stage__claim').tap(); audit.wait_player(page)
    page.locator('.brush-loader').wait_for(state='hidden')
    assert not page.locator('.street-stage__poi-error').count()
    assert not page.locator('.interact-stage__token').count()
    after_claim = progress(page)
    page.reload(); audit.wait_player(page)
    same_rewards(after_claim, progress(page))
    assert 'main-rishengchang' in progress(page)['questData']['completedQuests']
    report['clueRetryOnceAndReload'] = True


def verify_touch_scroll(page, selector):
    content = page.locator(selector)
    content.evaluate('el=>el.scrollTop=0')
    position = page.evaluate(audit.PLAYER)
    box = content.bounding_box(); x = box['x']+box['width']/2; start = box['y']+box['height']*.77
    cdp = page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': start, 'id': 1}]})
    for step in range(1, 9):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': start-step*18, 'id': 1}]})
        page.wait_for_timeout(35)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_timeout(300)
    metrics = content.evaluate('el=>({top:el.scrollTop,height:el.clientHeight,content:el.scrollHeight})')
    assert metrics['top'] > 20, (selector, metrics)
    after = page.evaluate(audit.PLAYER)
    assert abs(position['x']-after['x'])+abs(position['z']-after['z']) < .01
    cdp.detach()
    return metrics


def assert_target(locator, width, height):
    box = locator.bounding_box()
    assert box and box['width'] >= 44 and box['height'] >= 44, (locator.evaluate('el=>el.className'), box)
    assert box['x'] >= 0 and box['y'] >= 0 and box['x']+box['width'] <= width+1 and box['y']+box['height'] <= height+1, box
    assert locator.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'), box


if __name__ == '__main__':
    main()
