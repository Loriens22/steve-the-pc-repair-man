"""Synthesize every sound effect in the game from scratch with NumPy (no samples).
Writes MP3s to web/public/assets/audio/sfx/ and the list to web/src/data/sfxlist.js."""
import numpy as np, subprocess, os, sys, json
from scipy import signal
SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'assets', 'audio', 'sfx')
rng = np.random.default_rng(7)
def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=0.0):
    a_, d_, h_, r_ = int(a * SR), int(d * SR), int(hold * SR), int(r * SR)
    e = np.concatenate([np.linspace(0, 1, max(a_, 1)), np.full(h_, 1.0), np.linspace(1, s, max(d_, 1))])
    if s > 0: e = np.concatenate([e, np.full(max(0, n - len(e) - r_), s), np.linspace(s, 0, max(r_, 1))])
    e = e[:n]; return np.pad(e, (0, n - len(e)))
def expd(n, k): return np.exp(-np.arange(n) / SR * k)
def noise(d): return rng.uniform(-1, 1, int(SR * d))
def bp(x, lo, hi, o=2): b, a = signal.butter(o, [lo / (SR / 2), min(hi / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, o=2): b, a = signal.butter(o, min(f / (SR / 2), 0.99)); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def fit(f, n):
    if not np.ndim(f): return np.full(n, float(f))
    f = np.asarray(f, float); return f[:n] if len(f) >= n else np.pad(f, (0, n - len(f)), mode='edge')
def sine(f, d, ph=0):
    t = t_(d); f = fit(f, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def sq(f, d, duty=0.5):
    t = t_(d); f = fit(f, len(t)); ph = np.cumsum(f) / SR % 1; return np.where(ph < duty, 1.0, -1.0)
def saw(f, d):
    t = t_(d); f = fit(f, len(t)); ph = np.cumsum(f) / SR % 1; return 2 * ph - 1
def tri(f, d): return 2 * np.abs(saw(f, d)) - 1
def glide(f0, f1, d, curve=1.0): k = np.linspace(0, 1, int(SR * d)) ** curve; return f0 + (f1 - f0) * k
def mix(*parts):
    n = max(len(p[1]) + int(p[0] * SR) for p in parts); o = np.zeros(n)
    for off, x in parts: i = int(off * SR); o[i:i + len(x)] += x
    return o
def cat(*xs): return np.concatenate(xs)
def sil(d): return np.zeros(int(SR * d))
def norm(x, peak=0.89): m = np.max(np.abs(x)) or 1; return x / m * peak
def reverb(x, size=0.4, wet=0.25, decay=3.0):
    n = int(SR * size); ir = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR * decay * 3 / size); ir = lp(ir, 6000)
    w = signal.fftconvolve(x, ir); w = np.pad(w, (0, max(0, len(x) + n - len(w))))[:len(x) + n]; w = w / (np.max(np.abs(w)) or 1) * np.max(np.abs(x))
    return np.pad(x, (0, n)) * (1 - wet) + w * wet
def pluck(f, d, damp=0.996):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(SR * d))
    for i in range(len(out)):
        out[i] = buf[i % N]; buf[i % N] = damp * 0.5 * (buf[i % N] + buf[(i + 1) % N])
    return out
def fm(fc, fmod, idx, d, e=None):
    t = t_(d); m = idx * (e if e is not None else 1) * np.sin(2 * np.pi * fmod * t); return np.sin(2 * np.pi * fc * t + m)
def bell_tone(f, d, k=3.0):
    t = t_(d); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k * r ** 0.6) for r, a in [(1, 1), (2.01, 0.5), (2.76, 0.35), (4.07, 0.2), (5.4, 0.1)]); return x
def click(d=0.01, f=3000): n = noise(d) * expd(int(SR * d), 600); return bp(n, f * 0.5, f * 2)

S = {}
def reg(name, x, peak=0.89): S[name] = norm(np.asarray(x, dtype=float), peak)

# ------------------------------------------------------------- UI
reg('ui_click', mix((0, click(0.02, 2500)), (0, sine(1200, 0.04) * expd(int(SR * .04), 120) * 0.5)), 0.6)
reg('ui_hover', sine(900, 0.03) * expd(int(SR * .03), 150), 0.3)
reg('ui_use', sine(glide(700, 1000, 0.06), 0.06) * env(int(SR * .06), 0.002, 0.05), 0.4)
reg('click', click(0.025, 2000), 0.7)
reg('error', cat(sq(180, 0.12, 0.3) * env(int(SR * .12), 0.002, 0.1), sq(150, 0.18, 0.3) * env(int(SR * .18), 0.002, 0.16)), 0.5)
reg('objective', mix((0, bell_tone(660, 0.6, 5)), (0.09, bell_tone(990, 0.8, 4))), 0.6)
reg('success', mix((0, bell_tone(523, 0.5, 5)), (0.08, bell_tone(659, 0.5, 5)), (0.16, bell_tone(784, 0.5, 5)), (0.24, bell_tone(1046, 1.0, 3))), 0.7)
reg('secret', reverb(mix(*[(i * 0.07, sine(f, 0.35) * expd(int(SR * .35), 9) * (0.5 + 0.5 * sq(f * 2, 0.35, 0.25) * 0.3)) for i, f in enumerate([784, 988, 1175, 1568, 1976])]), 0.5, 0.3), 0.7)
reg('chapter', reverb(mix((0, sine(110, 2.5) * env(int(SR * 2.5), 0.01, 2.4) * 0.8), (0, saw(220, 2.5) * env(int(SR * 2.5), 0.4, 2.0) * 0.15), (0.0, lp(noise(2.5), 400) * env(int(SR * 2.5), 0.01, 2.4) * 0.6)), 1.0, 0.4), 0.7)
reg('phone_open', mix((0, sine(1300, 0.05) * expd(int(SR * .05), 80)), (0.06, sine(1700, 0.06) * expd(int(SR * .06), 70))), 0.4)
reg('phone_msg', mix((0, fm(1400, 700, 2, 0.12) * expd(int(SR * .12), 30)), (0.14, fm(1870, 935, 2, 0.2) * expd(int(SR * .2), 25))), 0.55)
reg('blip', sq(880, 0.05, 0.5) * expd(int(SR * .05), 60), 0.35)
reg('snake_die', sq(glide(600, 80, 0.5), 0.5, 0.5) * env(int(SR * .5), 0.002, 0.45), 0.45)
reg('beep', sq(1000, 0.25, 0.5) * env(int(SR * .25), 0.002, 0.01, 1, 0.01), 0.35)
reg('key_beep', sine(1350, 0.08) * env(int(SR * .08), 0.002, 0.07), 0.45)
reg('access', mix((0, sine(1046, 0.12) * env(int(SR * .12), 0.002, 0.1)), (0.12, sine(1568, 0.25) * env(int(SR * .25), 0.002, 0.24))), 0.5)
reg('denied', cat(sq(220, 0.15, 0.5), sil(0.05), sq(220, 0.3, 0.5)) * 1.0, 0.35)
# ------------------------------------------------------------- player
def step(base, bright, d=0.12, grit=0.0):
    n = noise(d) * expd(int(SR * d), 45); x = bp(n, base, bright); x += lp(noise(d), 150) * expd(int(SR * d), 60) * 0.8
    if grit: x += hp(noise(d), 4000) * expd(int(SR * d), 30) * grit
    return x
reg('step_tile', mix((0, step(800, 5000, 0.08)), (0.0, click(0.01, 3500) * 0.6)), 0.5)
reg('step_wood', mix((0, step(150, 1600, 0.12)), (0, sine(140, 0.08) * expd(int(SR * .08), 50) * 0.6)), 0.55)
reg('step_concrete', step(300, 3000, 0.1, 0.3), 0.5)
reg('step_carpet', lp(step(100, 900, 0.12), 900), 0.4)
reg('step_snow', mix((0, bp(noise(0.22), 900, 5000) * env(int(SR * .22), 0.03, 0.19) * (0.6 + 0.4 * (rng.uniform(0, 1, int(SR * .22)) > 0.6))), (0.02, lp(noise(0.15), 300) * expd(int(SR * .15), 25) * 0.6)), 0.5)
reg('step_metal', mix((0, step(400, 6000, 0.1)), (0, bell_tone(320, 0.25, 18) * 0.25), (0, bell_tone(733, 0.2, 22) * 0.15)), 0.5)
reg('step_plane', lp(step(120, 1200, 0.1), 1000), 0.4)
reg('jump', mix((0, lp(noise(0.12), 2000) * env(int(SR * .12), 0.01, 0.1) * 0.5), (0, sine(glide(200, 320, 0.1), 0.1) * expd(int(SR * .1), 30) * 0.4)), 0.4)
reg('land', mix((0, lp(noise(0.18), 700) * expd(int(SR * .18), 30)), (0, sine(glide(110, 60, 0.15), 0.15) * expd(int(SR * .15), 25))), 0.6)
reg('whoosh', bp(noise(0.35), 300, 2500) * np.sin(np.linspace(0, np.pi, int(SR * .35))) ** 2, 0.5)
reg('pickup', mix((0, lp(noise(0.06), 3000) * expd(int(SR * .06), 60)), (0.02, sine(glide(500, 800, 0.08), 0.08) * expd(int(SR * .08), 40) * 0.4)), 0.45)
reg('drop', mix((0, lp(noise(0.1), 1500) * expd(int(SR * .1), 40)), (0, sine(160, 0.1) * expd(int(SR * .1), 40))), 0.5)
reg('thud', mix((0, lp(noise(0.25), 500) * expd(int(SR * .25), 22)), (0, sine(glide(120, 50, 0.2), 0.2) * expd(int(SR * .2), 20))), 0.8)
reg('clink', mix((0, bell_tone(2100, 0.3, 14)), (0, bell_tone(3170, 0.2, 18) * 0.5), (0, click(0.01, 5000))), 0.5)
reg('metal_hit', mix((0, bell_tone(420, 0.8, 6)), (0, bell_tone(1130, 0.6, 8) * 0.5), (0, lp(noise(0.05), 3000) * expd(int(SR * .05), 80))), 0.7)
reg('cardboard', mix((0, bp(noise(0.2), 200, 1800) * expd(int(SR * .2), 25)), (0, sine(90, 0.15) * expd(int(SR * .15), 30) * 0.5)), 0.6)
# ------------------------------------------------------------- gadgets / stealth
z = noise(0.45) * (rng.uniform(0, 1, int(SR * .45)) > 0.85) ; zap = hp(z, 1500) * expd(int(SR * .45), 7) + sq(glide(120, 60, 0.45), 0.45, 0.2) * expd(int(SR * .45), 9) * 0.4 + sine(glide(2500, 400, 0.45, 0.4), 0.45) * expd(int(SR * .45), 10) * 0.3
reg('zap', zap, 0.8)
reg('spray', hp(noise(0.8), 2500) * env(int(SR * .8), 0.02, 0.1, 0.8, 0.25), 0.55)
reg('frost', mix((0, hp(noise(0.6), 3000) * env(int(SR * .6), 0.02, 0.5)), *[(0.05 * i, bell_tone(2500 + 400 * i, 0.3, 20) * 0.3) for i in range(6)]), 0.6)
reg('suspicious', mix((0, sine(glide(400, 600, 0.25), 0.25) * env(int(SR * .25), 0.01, 0.2)), (0.0, tri(glide(800, 1200, 0.25), 0.25) * env(int(SR * .25), 0.01, 0.2) * 0.3)), 0.5)
reg('alert', mix((0, saw(glide(300, 900, 0.18), 0.18) * env(int(SR * .18), 0.002, 0.16)), (0.0, lp(noise(0.3), 1200) * expd(int(SR * .3), 15) * 0.6), (0.15, sq(900, 0.25, 0.5) * env(int(SR * .25), 0.002, 0.24) * 0.6)), 0.75)
reg('caught', reverb(mix((0, saw(110, 1.2) * expd(int(SR * 1.2), 3) * 0.6), (0, saw(116.5, 1.2) * expd(int(SR * 1.2), 3) * 0.6), (0, lp(noise(0.4), 300) * expd(int(SR * .4), 8)), (0.3, sine(glide(440, 220, 0.8), 0.8) * expd(int(SR * .8), 3) * 0.6)), 0.8, 0.3), 0.8)
reg('cam_beep', sine(2200, 0.05) * expd(int(SR * .05), 50), 0.35)
reg('alarm', cat(*[sq(glide(600, 900, 0.3), 0.3, 0.5) * 0.7 + sine(glide(600, 900, 0.3), 0.3) * 0.3 for _ in range(4)]), 0.5)
reg('stun', mix((0, sine(glide(800, 200, 0.6), 0.6) * expd(int(SR * .6), 4)), *[(0.1 * i, bell_tone(1800 + (i % 2) * 400, 0.3, 12) * 0.2) for i in range(6)]), 0.55)
reg('zip', mix(*[(0.012 * i, click(0.01, 2500 + 50 * i) * (0.5 + i / 30)) for i in range(25)]), 0.6)
reg('hmm', lp(saw(glide(130, 110, 0.4), 0.4), 600) * env(int(SR * .4), 0.05, 0.3), 0.3)
reg('radio_squelch', mix((0, bp(noise(0.25), 800, 4000) * env(int(SR * .25), 0.005, 0.02, 0.6, 0.05)), (0.25, click(0.02, 1500))), 0.45)
# ------------------------------------------------------------- shop
reg('door_chime', reverb(mix((0, bell_tone(1318, 1.5, 2.5)), (0.25, bell_tone(1046, 1.8, 2.2))), 0.6, 0.2), 0.55)
reg('door_open', mix((0, lp(noise(0.3), 1200) * expd(int(SR * .3), 12) * 0.5), (0.0, saw(glide(180, 260, 0.35), 0.35) * env(int(SR * .35), 0.05, 0.3) * 0.12), (0, click(0.02, 1500))), 0.5)
reg('door_close', mix((0, lp(noise(0.2), 600) * expd(int(SR * .2), 20)), (0, sine(90, 0.2) * expd(int(SR * .2), 25)), (0.01, click(0.02, 2000) * 0.6)), 0.65)
reg('door_glass', mix((0, bell_tone(1800, 0.5, 10) * 0.2), (0, lp(noise(0.25), 1500) * expd(int(SR * .25), 15) * 0.4)), 0.4)
reg('secret_slide', mix((0, lp(noise(1.6), 300) * env(int(SR * 1.6), 0.1, 0.2, 0.9, 0.3) * 0.7), *[(0.15 * i, click(0.02, 900) * 0.4) for i in range(10)], (1.5, sine(70, 0.3) * expd(int(SR * .3), 15))), 0.7)
reg('drawer', mix((0, bp(noise(0.25), 300, 2000) * env(int(SR * .25), 0.02, 0.2) * 0.5), (0.22, click(0.03, 1200))), 0.5)
reg('squeak', sine(glide(1200, 1700, 0.25, 0.5) + 80 * np.sin(2 * np.pi * 30 * t_(0.25)), 0.25) * env(int(SR * .25), 0.01, 0.2) + sine(glide(2400, 3400, 0.25), 0.25) * env(int(SR * .25), 0.01, 0.2) * 0.3, 0.6)
reg('crate_open', mix((0, bp(noise(0.3), 150, 1500) * expd(int(SR * .3), 15)), (0, sine(glide(400, 200, 0.2), 0.2) * expd(int(SR * .2), 20) * 0.2)), 0.6)
brew = lp(noise(3.0), 900) * (0.4 + 0.6 * (np.sin(2 * np.pi * 7 * t_(3.0)) > 0.3)) * env(int(SR * 3), 0.2, 0.3, 0.8, 0.5)
reg('coffee_brew', mix((0, brew), (0, sine(100, 3.0) * 0.15 * env(int(SR * 3), 0.1, 0.1, 1, 0.3)), (2.8, bell_tone(1500, 0.6, 6) * 0.3)), 0.55)
fax = cat(sine(1100, 0.4), sine(2100, 0.5), sil(0.05), np.sign(sine(1200 + 800 * np.sin(2 * np.pi * 9 * t_(0.7)), 0.7)) * 0.5, bp(noise(0.8), 800, 3000) * 0.8)
reg('fax', fax * env(len(fax), 0.01, 0.1, 1, 0.1), 0.4)
reg('bell', reverb(bell_tone(2300, 1.5, 3) + bell_tone(2310, 1.5, 3), 0.5, 0.15), 0.6)
reg('glug', cat(*[sine(glide(200 + 40 * i, 500 + 60 * i, 0.12), 0.12) * env(int(SR * .12), 0.01, 0.1) for i in range(5)]), 0.5)
reg('globe', mix((0, lp(noise(1.2), 600) * env(int(SR * 1.2), 0.02, 1.1) * 0.6), *[(0.1 * i, click(0.01, 1500) * (1 - i / 12) * 0.5) for i in range(12)]), 0.5)
reg('pc_power', mix((0, click(0.03, 1200)), (0.05, lp(noise(2.0), 250) * env(int(SR * 2), 0.6, 0.2, 0.6, 0.2) * 0.5), (0.05, sine(glide(60, 120, 1.0), 2.0) * env(int(SR * 2), 0.5, 0.1, 0.5, 0.3) * 0.3)), 0.6)
hdd = np.zeros(int(SR * 2.0))
for i in range(28): o = int(rng.uniform(0, 1.9) * SR); c = click(0.015, 2500) * rng.uniform(0.3, 1); hdd[o:o + len(c)] += c
reg('hdd', hdd + sine(120, 2.0) * 0.03, 0.5)
chime = reverb(mix(*[(0.18 * i, sine(f, 2.5) * expd(int(SR * 2.5), 1.5) * 0.4 + tri(f / 2, 2.5) * expd(int(SR * 2.5), 2) * 0.2) for i, f in enumerate([392, 523, 659, 784])], (0.75, bell_tone(1046, 2.5, 1.5) * 0.4)), 1.2, 0.4)
reg('doors_chime', chime, 0.7)
reg('crt_on', mix((0, sine(15700, 1.2) * 0.05), (0, lp(noise(0.3), 2000) * expd(int(SR * .3), 10)), (0, click(0.03, 800))), 0.5)
reg('purr', lp(noise(2.0), 200) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * t_(2.0))) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.55 * t_(2.0)) ** 2) * env(int(SR * 2), 0.2, 0.3, 0.9, 0.4), 0.6)
mf = cat(glide(500, 900, 0.15), glide(900, 650, 0.35)); meow = sine(mf, 0.5) * 0.6 + sine(mf * 2, 0.5) * 0.3 + sine(mf * 3, 0.5) * 0.15
reg('meow', bp(meow * env(len(meow), 0.03, 0.1, 0.8, 0.15), 300, 4000), 0.55)
reg('food_pour', mix(*[(rng.uniform(0, 0.9), click(0.02, rng.uniform(1500, 4000)) * rng.uniform(0.3, 1)) for _ in range(60)]), 0.5)
reg('car_door', mix((0, lp(noise(0.25), 500) * expd(int(SR * .25), 18)), (0, sine(70, 0.25) * expd(int(SR * .25), 15)), (0.005, click(0.02, 1800) * 0.8)), 0.7)
car = lp(saw(glide(45, 90, 4.0, 0.7), 4.0) + 0.5 * saw(glide(90, 180, 4.0, 0.7), 4.0), 500) * env(int(SR * 4), 0.4, 0.2, 0.9, 1.5)
reg('car_drive', car * np.linspace(1, 0.3, len(car)), 0.6)
reg('case_down', mix((0, lp(noise(0.15), 800) * expd(int(SR * .15), 30)), (0, sine(110, 0.12) * expd(int(SR * .12), 35))), 0.6)
reg('case_open', mix((0, click(0.02, 3000)), (0.12, click(0.02, 3200)), (0.25, lp(noise(0.4), 1500) * env(int(SR * .4), 0.05, 0.3) * 0.4)), 0.6)
reg('tin_open', mix((0, bell_tone(1500, 0.5, 8) * 0.5), (0, hp(noise(0.15), 2000) * expd(int(SR * .15), 25))), 0.5)
reg('paper', bp(noise(0.35), 1500, 7000) * (0.3 + 0.7 * (rng.uniform(0, 1, int(SR * .35)) > 0.7)) * env(int(SR * .35), 0.02, 0.3), 0.4)
# minigames
reg('ratchet', cat(*[click(0.03, 2200) * 0.8 + click(0.03, 900) * 0.3 for _ in range(5)]), 0.5)
reg('screw_out', mix((0, sine(glide(800, 1600, 0.2), 0.2) * env(int(SR * .2), 0.01, 0.18) * 0.3), (0.18, bell_tone(2600, 0.3, 15) * 0.5)), 0.5)
reg('panel_off', mix((0, bell_tone(260, 0.8, 6)), (0, bell_tone(613, 0.6, 7) * 0.5), (0, lp(noise(0.2), 1500) * expd(int(SR * .2), 20))), 0.6)
reg('batt_pop', mix((0, click(0.02, 2500)), (0.0, sine(glide(1200, 500, 0.08), 0.08) * expd(int(SR * .08), 40) * 0.5)), 0.6)
reg('batt_click', mix((0, click(0.015, 3500)), (0.04, click(0.015, 2500))), 0.6)
reg('plug', mix((0, click(0.02, 1800)), (0, sine(300, 0.06) * expd(int(SR * .06), 60) * 0.5)), 0.6)
reg('key', mix((0, click(0.02, 3000)), (0.08, click(0.03, 1500))), 0.6)
reg('turbulence_bump', mix((0, lp(noise(0.8), 200) * env(int(SR * .8), 0.02, 0.7)), (0, sine(45, 0.6) * expd(int(SR * .6), 6) * 0.8), (0.05, bp(noise(0.4), 1000, 4000) * expd(int(SR * .4), 12) * 0.3)), 0.8)
# ------------------------------------------------------------- plane
reg('pa_chime', reverb(mix((0, bell_tone(988, 1.4, 3)), (0.45, bell_tone(784, 1.6, 3))), 0.6, 0.2), 0.55)
reg('call_bell', bell_tone(1568, 0.9, 5), 0.5)
reg('champagne_pop', mix((0, sine(glide(600, 200, 0.05), 0.05) * expd(int(SR * .05), 40)), (0, hp(noise(0.05), 800) * expd(int(SR * .05), 80)), (0.04, hp(noise(1.0), 3000) * expd(int(SR * 1), 3) * 0.2)), 0.8)
reg('pour', bp(noise(1.2), 600, 3500) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t_(1.2))) * env(int(SR * 1.2), 0.05, 0.1, 0.8, 0.3), 0.45)
sn = np.concatenate([lp(noise(1.3), 300) * np.sin(np.linspace(0, np.pi, int(SR * 1.3))) * (0.6 + 0.4 * sq(32, 1.3, 0.3)), sil(0.3), hp(noise(0.9), 1500) * np.sin(np.linspace(0, np.pi, int(SR * .9))) * 0.3, sil(0.5)])
reg('snore', sn, 0.6)
reg('knock', mix(*[(0.18 * i, lp(noise(0.08), 900) * expd(int(SR * .08), 50) + sine(180, 0.08) * expd(int(SR * .08), 50)) for i in range(3)]), 0.7)
reg('flush', bp(noise(2.5), 200, 2500) * env(int(SR * 2.5), 0.05, 0.2, 0.8, 1.2) + lp(noise(2.5), 120) * env(int(SR * 2.5), 0.05, 2.4) * 0.8, 0.6)
reg('crunch', mix(*[(0.07 * i + rng.uniform(0, 0.03), bp(noise(0.05), 800, 6000) * expd(int(SR * .05), 70)) for i in range(7)]), 0.5)
reg('cart_roll', lp(noise(1.5), 250) * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t_(1.5))) * env(int(SR * 1.5), 0.2, 0.2, 0.8, 0.4), 0.5)
reg('seatbelt', reverb(bell_tone(1318, 0.8, 5), 0.4, 0.15), 0.5)
reg('lav_lock', mix((0, click(0.03, 1200)), (0.06, sine(400, 0.05) * expd(int(SR * .05), 70))), 0.6)
# ------------------------------------------------------------- chalet / vault
reg('door_creak', sine(glide(260, 420, 1.0) + 30 * np.sin(2 * np.pi * 11 * t_(1.0)), 1.0) * env(int(SR * 1.0), 0.1, 0.8) * 0.4 + bp(noise(1.0), 400, 1500) * env(int(SR * 1), 0.1, 0.8) * 0.3, 0.5)
reg('elevator_ding', reverb(bell_tone(1175, 1.6, 2.5), 0.6, 0.2), 0.6)
reg('elevator_move', lp(saw(55, 4.0), 300) * env(int(SR * 4), 0.6, 0.2, 0.8, 0.8) * 0.5 + lp(noise(4.0), 200) * 0.5, 0.55)
reg('elevator_door', mix((0, bp(noise(1.0), 200, 1500) * env(int(SR * 1), 0.1, 0.1, 0.8, 0.3) * 0.6), (0.9, sine(80, 0.15) * expd(int(SR * .15), 30))), 0.55)
reg('vending', mix((0, lp(noise(0.5), 400) * env(int(SR * .5), 0.05, 0.4) * 0.5), (0.6, lp(noise(0.3), 600) * expd(int(SR * .3), 15)), (0.6, sine(90, 0.25) * expd(int(SR * .25), 20))), 0.7)
reg('teapot', sine(glide(1800, 2400, 2.0, 0.5) + 40 * np.sin(2 * np.pi * 7 * t_(2.0)), 2.0) * env(int(SR * 2), 0.6, 0.2, 0.9, 0.4) * 0.5 + hp(noise(2.0), 4000) * env(int(SR * 2), 0.4, 0.2, 0.7, 0.4) * 0.3, 0.45)
reg('boom', reverb(mix((0, lp(noise(1.2), 400) * expd(int(SR * 1.2), 4)), (0, sine(glide(80, 30, 0.8), 0.8) * expd(int(SR * .8), 5))), 0.8, 0.3), 0.85)
reg('lever', mix((0, bp(noise(0.3), 300, 2000) * env(int(SR * .3), 0.02, 0.25) * 0.4), (0.28, bell_tone(300, 0.5, 9)), (0.28, lp(noise(0.1), 1200) * expd(int(SR * .1), 40))), 0.7)
pd = saw(glide(400, 40, 1.6, 0.6), 1.6) * env(int(SR * 1.6), 0.005, 1.5)
reg('ups_down', lp(pd, 2500) + sine(glide(800, 60, 1.6, 0.6), 1.6) * env(int(SR * 1.6), 0.005, 1.5) * 0.5, 0.6)
reg('breaker', mix((0, lp(noise(0.12), 2500) * expd(int(SR * .12), 40)), (0, sine(70, 0.4) * expd(int(SR * .4), 10)), (0.0, bell_tone(500, 0.4, 12) * 0.4)), 0.8)
reg('big_pop', mix((0, click(0.05, 1500) * 2), (0, sine(glide(300, 60, 0.4), 0.4) * expd(int(SR * .4), 8)), (0, lp(noise(0.6), 900) * expd(int(SR * .6), 8))), 0.8)
reg('roll', lp(noise(2.0), 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t_(2.0))) * env(int(SR * 2), 0.05, 1.9), 0.6)
pwd = saw(glide(220, 20, 3.0, 0.5), 3.0) * expd(int(SR * 3), 0.8) + saw(glide(110, 10, 3.0, 0.5), 3.0) * expd(int(SR * 3), 0.8)
reg('power_down', reverb(lp(pwd, 1800), 1.2, 0.35), 0.75)
reg('power_up', reverb(lp(saw(glide(30, 300, 2.0, 2), 2.0) * env(int(SR * 2), 0.5, 0.2, 0.8, 0.3), 2000), 0.8, 0.3), 0.6)
reg('popup', mix((0, sq(1046, 0.08, 0.25) * env(int(SR * .08), 0.002, 0.07)), (0.07, sq(1568, 0.1, 0.25) * env(int(SR * .1), 0.002, 0.09))), 0.35)
reg('popup_close', sq(glide(1200, 500, 0.1), 0.1, 0.25) * env(int(SR * .1), 0.002, 0.09), 0.35)
reg('glitch', np.concatenate([sq(rng.uniform(80, 1500), 0.04, rng.uniform(0.1, 0.9)) * rng.uniform(0.3, 1) for _ in range(14)]), 0.45)
reg('servo', sine(glide(300, 520, 0.5), 0.5) * env(int(SR * .5), 0.03, 0.1, 0.8, 0.1) * 0.5 + sq(glide(150, 260, 0.5), 0.5, 0.3) * env(int(SR * .5), 0.03, 0.1, 0.8, 0.1) * 0.15, 0.4)
reg('boss_hit', reverb(mix((0, saw(55, 0.8) * expd(int(SR * .8), 4) + saw(58, 0.8) * expd(int(SR * .8), 4)), (0, lp(noise(0.3), 1200) * expd(int(SR * .3), 10)), (0.0, sine(glide(1200, 300, 0.4), 0.4) * expd(int(SR * .4), 6) * 0.4)), 0.8, 0.3), 0.8)
reg('drone', (sq(220, 1.0, 0.5) * 0.2 + saw(223, 1.0) * 0.2) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t_(1.0))), 0.25)
reg('splash', mix((0, bp(noise(0.7), 300, 4000) * expd(int(SR * .7), 6)), (0, lp(noise(0.3), 300) * expd(int(SR * .3), 15))), 0.6)
reg('mine_click', click(0.02, 2800), 0.5)
# ------------------------------------------------------------- ambiences (loopable)
def loopable(x, fade=0.5):
    f = int(SR * fade); a = x[:f]; x = x[f:].copy(); x[-f:] = x[-f:] * np.linspace(1, 0, f) + a * np.linspace(0, 1, f); return x
office = lp(noise(12), 300) * 0.25 + sine(120, 12) * 0.05 + sine(240, 12) * 0.02
for i in range(10): o = int(rng.uniform(0, 11) * SR); c = (bell_tone(rng.uniform(1500, 2500), 0.2, 30) * 0.03); office[o:o + len(c)] += c
reg('amb_shop', loopable(office), 0.25)
reg('amb_night', loopable(lp(noise(12), 500) * 0.3 + sum(sine(4200 + 300 * k, 12) * (np.sin(2 * np.pi * (2.2 + k * 0.3) * t_(12)) > 0.6) * 0.05 * (np.sin(2 * np.pi * 0.1 * (k + 1) * t_(12)) > 0) for k in range(3))), 0.25)
reg('amb_plane', loopable(lp(noise(12), 350) * 0.8 + bp(noise(12), 400, 900) * 0.3 + sine(98, 12) * 0.08 + sine(196, 12) * 0.03), 0.45)
wind = bp(noise(14), 200, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t_(14)) ** 2) + bp(noise(14), 1500, 3000) * 0.08 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t_(14) + 1))
reg('amb_wind', loopable(wind), 0.45)
srv = lp(noise(12), 1800) * 0.25 + sine(60, 12) * 0.12 + sine(120, 12) * 0.06 + sine(3000, 12) * 0.006
reg('amb_server', loopable(srv), 0.4)
reg('amb_core', loopable(srv * 0.8 + sine(40, 12) * 0.25 + sine(55, 12) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * t_(12)))), 0.5)
reg('tub_bubbles', loopable(sum(bp(noise(6), 200 + 200 * k, 600 + 300 * k) * (rng.uniform(0, 1, int(SR * 6)) > 0.97) for k in range(3)) + lp(noise(6), 300) * 0.3), 0.35)
reg('generator', loopable(lp(saw(30, 6), 400) * 0.6 + lp(noise(6), 300) * 0.4), 0.35)

def write(name, x):
    x = np.clip(x, -1, 1); pcm = (x * 32767).astype(np.int16).tobytes()
    p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '64k', '-ar', '44100', os.path.join(OUT, name + '.mp3')], input=pcm)
    assert p.returncode == 0, name
os.makedirs(OUT, exist_ok=True)
only = sys.argv[1:]
for n, x in S.items():
    if only and n not in only: continue
    write(n, x)
pre = [n for n in S if not n.startswith('amb_') and n not in ('tub_bubbles', 'generator')]
open(os.path.join(os.path.dirname(__file__), '..', 'web', 'src', 'data', 'sfxlist.js'), 'w').write('// generated by tools/gen_sfx.py\nexport const SFX_LIST = ' + json.dumps(pre) + ';\n')
print(len(S), 'sfx written')
