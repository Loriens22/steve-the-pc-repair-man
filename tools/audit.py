"""Level QA in headless Chromium.
  python3 tools/audit.py BASE reach  [level[:cp]] ...   -> reachability report + heatmap PNGs (green reached, grey unreached walkable, red blocked, black void; yellow = reachable target, magenta = NOT reachable)
  python3 tools/audit.py BASE chain  level [one]        -> autopilot plays the objective chain (no cutscene skipping) from that chapter on
  options: --out=DIR --mobile --pre=JS (run before the audit, e.g. to move the game into a later objective state)"""
import sys, asyncio, json, base64, os, time
from playwright.async_api import async_playwright
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
async def start(b, base, level, cp, mobile, extra=''):
    ctx = await b.new_context(viewport={'width': 844 if mobile else 480, 'height': 390 if mobile else 270}, has_touch=mobile, is_mobile=mobile, device_scale_factor=1)
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: (logs.append(m.text), m.text.startswith('AUDIT') and print(m.text, flush=True)))
    pg.on('pageerror', lambda e: (logs.append('[pageerror] ' + str(e)), print('[pageerror]', e, flush=True)))
    url = f"{base}?level={level}&dtcap=0.1&win=250&q=low{('&cp=' + cp) if cp else ''}{extra}"
    await pg.goto(url)
    await pg.wait_for_function("!document.querySelector('#startbtn').classList.contains('hidden')", timeout=300000)
    await pg.evaluate("document.querySelector('#startbtn').click()")
    return pg, logs
async def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; opt = dict((x[2:].split('=', 1) + [''])[:2] for x in sys.argv[1:] if x.startswith('--'))
    base, mode, rest = a[0], a[1], a[2:]; out = opt.get('out', '/workspace/audit'); os.makedirs(out, exist_ok=True); mobile = 'mobile' in opt
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/google/chrome/chrome', headless=True, args=ARGS)
        if mode == 'reach':
            allres = []
            for spec in rest:
                level, _, cp = spec.partition(':')
                pg, logs = await start(b, base, level, cp, mobile)
                await pg.wait_for_function("window.__audit && __game.level && __game.state.playing && !__game.cutscene.active && !__game.paused.any()", timeout=900000, polling=500)
                if opt.get('pre'): await pg.evaluate(opt['pre'])
                await pg.wait_for_timeout(1500)
                r = await pg.evaluate("__audit.reach()")
                name = spec.replace(':', '_'); img = r.pop('image')
                if img: open(f'{out}/reach_{name}.png', 'wb').write(base64.b64decode(img.split(',')[1]))
                bad = [t for t in r['targets'] if not t['ok']]
                print(f"== {r['level']} ({spec}) spawn {r['spawn']} walkable {r['walk']} reached {r['reached']} ({r['ms']} ms)  targets {len(r['targets'])}, unreachable {len(bad)}", flush=True)
                for t in r['targets']: print(('   OK  ' if t['ok'] else '   XX  ') + ('' if t['active'] else '(inactive) ') + t['label'] + ('' if t['ok'] else ('  ONLY THROUGH A WALL' if t.get('throughWall') else f"  gap {t['gap']} m")), flush=True)
                allres.append({'spec': spec, **r}); await pg.context.close()
            json.dump(allres, open(f'{out}/reach.json', 'w'), indent=1)
        elif mode == 'chain':
            level = rest[0]; one = len(rest) > 1 and rest[1] == 'one'
            pg, logs = await start(b, base, level, opt.get('cp'), mobile)
            await pg.wait_for_function("window.__audit && __game.level", timeout=300000, polling=500)
            t0 = time.time()
            await pg.evaluate(f"window.__chainRes = null; __audit.chain('{level}', {json.dumps('one' if one else '')}).then(r => window.__chainRes = r); 0")
            n = 0
            while True:
                await pg.wait_for_timeout(5000); n += 1
                r = await pg.evaluate("window.__chainRes")
                if r: break
                if n % 3 == 0:
                    st = await pg.evaluate("(() => { const g = __game, L = g.level; return { lvl: g.levelName, t: +g.time.toFixed(1), phase: L && (L.st && L.st.phase || L.phase), cs: g.cutscene.active, line: g.cutscene.curLine || null, paused: g.paused, prompt: g.curLabel, obj: g.state.objective, pos: g.player && [g.player.pos.x.toFixed(2), g.player.pos.z.toFixed(2)], fps: g.fps } })()")
                    print('  status', json.dumps(st), flush=True)
                    await pg.screenshot(path=f'{out}/chain_{level}_status.png')
            print('RESULT', json.dumps({k: v for k, v in r.items() if k != 'log'}), f'{int(time.time() - t0)} s', flush=True)
            await pg.screenshot(path=f'{out}/chain_{level}_end.png')
            errs = [l for l in logs if 'pageerror' in l or 'Error' in l]
            print('page errors:', errs[:10])
        await b.close()
asyncio.run(main())
