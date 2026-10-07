"""Playwright screenshot helper: python3 tools/shot.py URL out.png [w h] [wait_ms] [--mobile]"""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    url, out = a[0], a[1]; w = int(a[2]) if len(a) > 2 else 960; h = int(a[3]) if len(a) > 3 else 540; wait = int(a[4]) if len(a) > 4 else 1500
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/google/chrome/chrome', headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch='--mobile' in sys.argv, is_mobile='--mobile' in sys.argv)
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(url); await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out)
        for l in logs[-30:]: print(l)
        await b.close()
asyncio.run(main())
