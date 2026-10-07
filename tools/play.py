"""Scripted Playwright session: python3 tools/play.py URL "step;step;..." [--mobile] [--w=960 --h=540]
steps: click:SEL | wait:MS | shot:FILE | key:KEY | down:KEY | up:KEY | eval:JS | tap:X,Y | waitfor:JS"""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; url, steps = a[0], a[1]
    opt = dict(x[2:].split('=') for x in sys.argv[1:] if x.startswith('--') and '=' in x)
    mobile = '--mobile' in sys.argv; w = int(opt.get('w', 844 if mobile else 960)); h = int(opt.get('h', 390 if mobile else 540))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/google/chrome/chrome', headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=mobile, is_mobile=mobile, device_scale_factor=1)
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(url)
        for st in steps.split(';;'):
            st = st.strip()
            if not st: continue
            k, _, v = st.partition(':')
            try:
                if k == 'click': await pg.click(v, timeout=120000)
                elif k == 'wait': await pg.wait_for_timeout(int(v))
                elif k == 'shot': await pg.screenshot(path=v); print('shot', v)
                elif k == 'key': await pg.keyboard.press(v)
                elif k == 'down': await pg.keyboard.down(v)
                elif k == 'up': await pg.keyboard.up(v)
                elif k == 'eval': r = await pg.evaluate(v); print('eval ->', str(r)[:500])
                elif k == 'tap': x, y = map(int, v.split(',')); await pg.touchscreen.tap(x, y)
                elif k == 'waitfor': await pg.wait_for_function(v, timeout=180000)
            except Exception as e: print('STEP FAIL', st, e)
        for l in logs[-60:]: print(l)
        await b.close()
asyncio.run(main())
