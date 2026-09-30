"""行旅册、票券四视口交互回归；需要已启动的 localhost:5219。"""
from pathlib import Path
import json
import os
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'test' / 'artifacts' / 'journal-ticket'
TEMP = ROOT / 'output' / 'journal-ticket-browser-temp'
for folder in (ARTIFACTS, TEMP):
    folder.mkdir(parents=True, exist_ok=True)
os.environ['TEMP'] = os.environ['TMP'] = str(TEMP)
tempfile.tempdir = str(TEMP)
VIEWPORTS = [(1440, 900), (844, 390), (667, 375), (390, 844)]


def capture(page, name):
    page.locator('.app-toast').wait_for(state='hidden')
    page.wait_for_timeout(700)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), name + ': horizontal overflow'
    page.screenshot(path=str(ARTIFACTS / (name + '.png')), full_page=True)


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            context = browser.new_context(viewport={'width': width, 'height': height})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://localhost:5219/#/splash')
            page.wait_for_function('!!window.__pygc?.navigation')
            page.evaluate('''() => {
              const put = (key, data) => localStorage.setItem(key, JSON.stringify({type:'object',data}));
              const merge = (key, data) => put(key, {...window.__pygc.readStorage(key),...data});
              merge('pygc_user_profile', {nickname:'验收行客', roleId:'study',roleName:'研学者'});
              merge('pygc_user_progress', {exp:6000,npcTalkCount:1,totalQuestCompleted:9,questData:{completedQuests:['main-rishengchang','daily-walk'],activeQuests:[],questProgress:{}}});
              const base = {itemName:'古城茶点券',merchantName:'明清街茶坊',price:18,currency:'silverKey',currencyLabel:'错误旧币种',codeText:'PY-TEST-001',category:'food',address:'平遥古城南大街 18 号',merchantPhone:'0354-1234567',businessHours:'09:00—18:00',exchangeAt:'2026-09-29',expireAt:'2026-10-29',redeemTip:'演示凭证，请向商户咨询。'};
              put('pygc_shop_redeem_orders', [{...base,orderId:'audit-ticket',expireAtTs:Date.now()+86400000,status:'unused'}, {...base,itemName:'已过期体验券',orderId:'audit-expired',expireAtTs:Date.now()-1000}]);
              window.__pygc.navigation.switchTab('/user');
            }''')
            expect(page.locator('.ledger__rank-side-sub')).to_have_text('已臻满阶')
            expect(page.locator('.ledger__mark').nth(0).locator('.ledger__mark-value')).to_have_text('1')
            expect(page.locator('.ledger__crest').filter(has_text='夜话晋小鸦')).to_have_class('ledger__crest ledger__crest--lit')
            key = f'{width}x{height}'
            capture(page, key + '-user')
            page.locator('.ledger__mark[role="button"]').click()
            expect(page.locator('.ticket-list button')).to_have_count(2)
            expect(page.locator('.ticket-list')).to_contain_text('银钥')
            expect(page.locator('.ticket-list')).not_to_contain_text('错误旧币种')
            capture(page, key + '-list')
            page.locator('.ticket-list button').filter(has_text='古城茶点券').click()
            page.wait_for_url('**/#/redeem?orderId=audit-ticket')
            try:
                expect(page.locator('.redeem-stage__voucher-title')).to_have_text('古城茶点券', timeout=15000)
            except AssertionError:
                print('Navigation state:', page.evaluate("({url:location.href, route:window.__pygc.router.currentRoute.value.fullPath, requested:window.__pygc.page.setupState.requestedOrderId, detail:window.__pygc.page.setupState.orderDetail?.orderId})"), errors, flush=True)
                raise
            expect(page.locator('a[href="tel:03541234567"]')).to_have_count(2)
            capture(page, key + '-detail')
            page.evaluate('''() => {
              Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});
              window.__copyCalls=0; document.execCommand=()=>{window.__copyCalls++;return true};
            }''')
            page.locator('.redeem-stage__voucher-action--accent').click()
            expect(page.locator('.app-toast')).to_contain_text('铺址已复制')
            assert page.evaluate('window.__copyCalls') == 1
            page.evaluate('document.execCommand=()=>false')
            page.locator('.redeem-stage__voucher-action--accent').click()
            expect(page.locator('.app-modal')).to_contain_text('请长按或选中复制铺址')
            page.get_by_text('知道了', exact=True).click()
            page.evaluate('''() => {
              const data=window.__pygc.readStorage('pygc_shop_redeem_orders');
              data[0].expireAtTs=Date.now()+1100;
              localStorage.setItem('pygc_shop_redeem_orders',JSON.stringify({type:'object',data}));
              window.__pygc.page.setupState.loadOrder();
            }''')
            expect(page.locator('.redeem-stage__voucher-state-stamp')).to_contain_text('已过期', timeout=5000)
            page.locator('.redeem-stage__back').click()
            expect(page.locator('.ticket-list')).to_be_visible()
            expect(page.locator('.ticket-list button').filter(has_text='古城茶点券')).to_contain_text('已过期')
            page.locator('.redeem-stage__back').click()
            expect(page.locator('.ledger')).to_be_visible()
            page.evaluate("localStorage.setItem('pygc_shop_redeem_orders',JSON.stringify({type:'object',data:[]}));window.__pygc.navigation.navigateTo('/redeem')")
            expect(page.locator('.empty-owl__text')).to_contain_text('还没有票券')
            capture(page, key + '-empty')
            page.locator('.empty-owl__cta').click()
            page.wait_for_url('**/#/shop')
            page.evaluate("window.__pygc.navigation.navigateTo('/redeem?orderId=missing-ticket')")
            expect(page.locator('.empty-owl__text')).to_contain_text('未找到这张票券')
            page.locator('.redeem-stage__back').click()
            expect(page.locator('.empty-owl__text')).to_contain_text('还没有票券')
            assert not errors, errors
            results.append({'viewport': key, 'passed': True, 'pageErrors': errors})
            context.close()
        browser.close()
    (ARTIFACTS / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    main()
