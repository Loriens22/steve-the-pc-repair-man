"""Live check of the chapter-1 back room: autopilot walks from the counter through the back door and feeds Cache, then a doorway screenshot.
python3 tools/shopcheck.py BASE OUT.png [--mobile]"""
import sys, asyncio, json, time
from playwright.async_api import async_playwright
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
async def main():
    base, out = sys.argv[1], sys.argv[2]; mobile = '--mobile' in sys.argv
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/google/chrome/chrome', headless=True, args=ARGS)
        ctx = await b.new_context(viewport={'width': 844, 'height': 390} if mobile else {'width': 960, 'height': 540}, has_touch=mobile, is_mobile=mobile)
        pg = await ctx.new_page(); errs = []
        pg.on('console', lambda m: m.text.startswith('AUDIT') and print(m.text, flush=True)); pg.on('pageerror', lambda e: errs.append(str(e)))
        t0 = time.time(); await pg.goto(base + '?level=shop&cp=briefcase&dtcap=0.1&win=250')
        await pg.wait_for_function("!document.querySelector('#startbtn').classList.contains('hidden')", timeout=400000)
        await pg.evaluate("document.querySelector('#startbtn').click()")
        await pg.wait_for_function("window.__audit && __game.level && __game.state.playing && !__game.cutscene.active", timeout=400000, polling=500)
        print('loaded', int(time.time() - t0), 's', flush=True)
        js = """(async () => { const A = __audit, g = __game; g.debugWin = 250;
          await A.use('Open the briefcase'); await A.waitFor(() => g.level.st.phase === 'leave', 900, 'briefcase cutscene');
          A.note('player at ' + g.player.pos.x.toFixed(2) + ',' + g.player.pos.z.toFixed(2) + ' objective: ' + g.state.objective);
          await A.use('Feed Cache'); await A.waitFor(() => g.level.st.catFed, 30, 'cat fed');
          return { ok: true, fed: g.level.st.catFed, pos: [g.player.pos.x, g.player.pos.z], obj: g.state.objective, leaveTrig: g.level.leaveTrig.enabled }; })().catch(e => ({ ok: false, err: e.message, pos: [__game.player.pos.x, __game.player.pos.z] }))"""
        r = await pg.evaluate(js); print('FEED', json.dumps(r), int(time.time() - t0), 's', flush=True)
        # doorway shot: camera in the main shop looking through the open back door; Steve standing just inside the back room
        await pg.evaluate("""(() => { const g = __game; g.player.place(-3.0, 0, -5.1, 0.25); g.cutscene.run(async c => { c.shot({ pos: [-1.9, 1.6, -0.7], look: [-3.0, 1.0, -5.6], fov: 55 }); await c.wait(60); }); })()""")
        await pg.wait_for_timeout(9000); await pg.screenshot(path=out); print('shot', out, flush=True)
        print('page errors:', errs[:5]); await b.close()
asyncio.run(main())
