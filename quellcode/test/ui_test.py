import asyncio, sys, json
from playwright.async_api import async_playwright
URL='http://localhost:8765/index.html'
errs=[]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome', headless=True)
        ctx=await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, locale='de-AT', has_touch=True)
        pg=await ctx.new_page()
        pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append('pageerror:'+str(e)))
        await pg.goto(URL); await pg.wait_for_selector('.welcome')
        await pg.screenshot(path='shots/01-welcome.png')
        await pg.click('[data-a="demo-first"]'); await pg.wait_for_selector('.hero')
        await pg.screenshot(path='shots/02-overview.png', full_page=False)
        hero=await pg.inner_text('.hero'); print('HERO:', ' | '.join(hero.split('\n')))
        print('ALERTS:', [ (await a.inner_text()).replace('\n',' / ')[:110] for a in await pg.query_selector_all('.alert')])
        # full overview scroll shot
        await pg.evaluate("document.querySelector('main').scrollTop=700"); await pg.screenshot(path='shots/03-overview2.png')
        # quick entry
        await pg.click('.fab'); await pg.wait_for_selector('.sheet')
        await pg.fill('#f-a','23,90'); await pg.click('.chip:has-text("Lebensmittel")')
        await pg.screenshot(path='shots/04-entry.png')
        await pg.click('[data-a="form-ok"]'); await pg.wait_for_selector('.sheet', state='detached')
        hero2=await pg.inner_text('.hero .big'); print('HERO after 23,90:', hero2)
        # invalid amount
        await pg.click('.fab'); await pg.fill('#f-a','12,345'); await pg.click('[data-a="form-ok"]'); print('ERR:', await pg.inner_text('#f-err'))
        await pg.fill('#f-a','60'); await pg.click('.chip:has-text("Beauty")'); await pg.select_option('#f-pot', index=2); await pg.click('[data-a="form-ok"]')
        print('ERR pot:', await pg.inner_text('#f-err') if await pg.query_selector('#f-err') else 'saved')
        if await pg.query_selector('.sheet'): await pg.click('[data-a="close"]')
        await pg.wait_for_timeout(200)
        for tab in ['buchungen','sparen','auswertung','mehr']:
            await pg.click(f'.nav [data-tab="{tab}"]'); await pg.wait_for_timeout(250)
            await pg.screenshot(path=f'shots/05-{tab}.png')
        await pg.click('.nav [data-tab="auswertung"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('main').scrollTop=1500"); await pg.wait_for_timeout(100); await pg.screenshot(path='shots/06-auswertung2.png')
        for tab in ['fixkosten','budgets','einstellungen']:
            await pg.evaluate(f"location.hash='{tab}'"); await pg.wait_for_timeout(250); await pg.screenshot(path=f'shots/07-{tab}.png')
        # overflow check on every tab
        for tab in ['uebersicht','buchungen','sparen','auswertung','mehr','fixkosten','budgets','einstellungen']:
            await pg.evaluate(f"location.hash='{tab}'"); await pg.wait_for_timeout(150)
            ov=await pg.evaluate("(()=>{const m=document.querySelector('main');const bad=[];m.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect();if(r.right>window.innerWidth+1&&!e.closest('.scroll-x'))bad.push(e.className||e.tagName)});return [m.scrollWidth>m.clientWidth, bad.slice(0,5)]})()")
            if ov[0] or ov[1]: print('OVERFLOW', tab, ov)
        # persistence across reload
        await pg.evaluate("location.hash='uebersicht'"); await pg.reload(); await pg.wait_for_selector('.hero'); print('after reload tab hero:', await pg.inner_text('.hero .big'))
        # desktop
        pg2=await (await b.new_context(viewport={'width':1280,'height':860}, locale='de-AT', color_scheme='dark')).new_page()
        pg2.on('pageerror', lambda e: errs.append('pageerror2:'+str(e)))
        await pg2.goto(URL); await pg2.click('[data-a="demo-first"]'); await pg2.wait_for_selector('.hero'); await pg2.screenshot(path='shots/08-desktop-dark.png')
        await pg2.click('.side [data-tab="auswertung"]'); await pg2.wait_for_timeout(300); await pg2.screenshot(path='shots/09-desktop-report.png', full_page=False)
        await b.close()
    print('ERRORS:', errs)
asyncio.run(main())
