"""Procedural music for every cue: a small NumPy sequencer with synthesized instruments (no samples)."""
import numpy as np, subprocess, os, sys
from scipy import signal
SR = 32000
OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'assets', 'audio', 'music')
rng = np.random.default_rng(3)
def lp(x, f, o=2): b, a = signal.butter(o, min(f / (SR / 2), 0.99)); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi): b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def n(s):  # 'C4', 'F#3', 'Bb2'
    k = NOTE[s[0]]; i = 1
    if s[i] in '#b': k += 1 if s[i] == '#' else -1; i += 1
    return 12 * (int(s[i:]) + 1) + k
def ad(nn, a, d): a_ = max(1, int(a * SR)); e = np.ones(nn); e[:a_] = np.linspace(0, 1, a_); e *= np.exp(-np.arange(nn) / SR * d); return e
def rel(e, r=0.03): r_ = min(len(e), int(r * SR)); e[-r_:] *= np.linspace(1, 0, r_); return e
# ---------------------------------------------------------------- instruments: f(freq, dur) -> samples
def i_ep(f, d, vel=1):  # FM electric piano
    t = np.arange(int(SR * d)) / SR; e = ad(len(t), 0.003, 2.2); m = 1.8 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 14 * t) * 0.15 + 1.2 * np.exp(-t * 3) * np.sin(2 * np.pi * f * t)
    return rel(e) * np.sin(2 * np.pi * f * t + m) * 0.5 * vel
def i_bass(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; ph = (f * t) % 1; x = (2 * ph - 1) * 0.6 + np.sin(2 * np.pi * f * t); e = ad(len(t), 0.004, 3.0)
    return lp(rel(e) * x, 300 + 900 * vel) * 0.7 * vel
def i_sub(f, d, vel=1): t = np.arange(int(SR * d)) / SR; return rel(ad(len(t), 0.01, 1.2)) * np.sin(2 * np.pi * f * t) * vel
def i_pad(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; x = sum(2 * ((f * dt * t + o) % 1) - 1 for dt, o in [(1, 0), (1.004, .3), (0.996, .6), (2.002, .1)]) / 4
    e = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4 + 0.001); return lp(x * e, 1400) * 0.35 * vel
def i_pluck(f, d, vel=1, damp=0.994, bright=0.5):
    N = max(2, int(SR / f)); buf = lp(rng.uniform(-1, 1, N * 4), 2000 + 6000 * bright)[-N:]; out = np.zeros(int(SR * d)); L = len(out)
    idx = 0
    for i in range(L): out[i] = buf[idx]; nx = (idx + 1) % N; buf[idx] = damp * 0.5 * (buf[idx] + buf[nx]); idx = nx
    return rel(out) * 0.6 * vel
def i_trem(f, d, vel=1):  # surf guitar with tremolo
    x = i_pluck(f, d, vel, 0.997, 0.8); t = np.arange(len(x)) / SR; x = np.tanh(x * 2.5) * 0.6; return x * (0.65 + 0.35 * np.sin(2 * np.pi * 7 * t))
def i_lead(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3); ph = np.cumsum(f * vib) / SR % 1
    x = np.where(ph < 0.5, 1, -1) * 0.5 + (2 * ph - 1) * 0.5; return lp(x * rel(ad(len(t), 0.01, 0.8)), 2500) * 0.3 * vel
def i_bell(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in [(1, 1, 2), (2.0, .4, 3), (3.01, .2, 5), (4.2, .1, 7)]) * 0.35 * vel
def i_str(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * t); ph = np.cumsum(f * vib) / SR % 1; x = 2 * ph - 1
    e = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.2 + 0.001); return lp(x * e, 2200) * 0.25 * vel
def i_organ(f, d, vel=1):
    t = np.arange(int(SR * d)) / SR; x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.3 * np.sin(6 * np.pi * f * t) + 0.2 * np.sin(8 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03 + 0.001); return x * e * 0.2 * (1 + 0.1 * np.sin(2 * np.pi * 6 * t)) * vel
def i_arp(f, d, vel=1): t = np.arange(int(SR * d)) / SR; ph = f * t % 1; x = np.where(ph < 0.25, 1, -1); return lp(x * rel(ad(len(t), 0.002, 9)), 3500) * 0.22 * vel
# drums
def d_kick(v=1): t = np.arange(int(SR * .35)) / SR; f = 50 + 110 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * v
def d_snare(v=1): t = np.arange(int(SR * .25)) / SR; return (bp(rng.uniform(-1, 1, len(t)), 900, 7000) * np.exp(-t * 18) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5) * v
def d_hat(v=1, open_=False): t = np.arange(int(SR * (.3 if open_ else .06))) / SR; return hp(rng.uniform(-1, 1, len(t)), 7000) * np.exp(-t * (8 if open_ else 60)) * 0.4 * v
def d_rim(v=1): t = np.arange(int(SR * .05)) / SR; return bp(rng.uniform(-1, 1, len(t)), 1500, 5000) * np.exp(-t * 80) * 0.6 * v + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 90) * 0.3 * v
def d_brush(v=1): t = np.arange(int(SR * .2)) / SR; return bp(rng.uniform(-1, 1, len(t)), 2000, 9000) * np.exp(-t * 14) * 0.25 * v
def d_ride(v=1): t = np.arange(int(SR * .6)) / SR; return (hp(rng.uniform(-1, 1, len(t)), 5000) * 0.25 + sum(np.sin(2 * np.pi * f * t) for f in [3200, 4370, 5810]) * 0.04) * np.exp(-t * 5) * v
def d_tom(v=1, f=110): t = np.arange(int(SR * .4)) / SR; return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-t * 20))) / SR) * np.exp(-t * 8) * v
def d_timp(v=1, f=73): t = np.arange(int(SR * 1.2)) / SR; return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 3) * v + lp(rng.uniform(-1, 1, len(t)), 300) * np.exp(-t * 20) * 0.5 * v
DR = {'k': d_kick, 's': d_snare, 'h': d_hat, 'o': lambda v=1: d_hat(v, True), 'r': d_rim, 'b': d_brush, 'R': d_ride, 't': d_tom, 'T': d_timp}

class Song:
    def __init__(s, bpm, bars, beats=4): s.bpm = bpm; s.beat = 60 / bpm; s.len = bars * beats * s.beat; s.tracks = {}; s.bars = bars; s.bb = beats
    def tr(s, name, gain=1.0, pan=0):
        if name not in s.tracks: s.tracks[name] = [np.zeros(int(SR * (s.len + 4))), gain]
        return s.tracks[name][0]
    def note(s, track, inst, midi, beat, dur, vel=1.0, gain=1.0):
        buf = s.tr(track, gain); x = inst(mtof(midi), dur * s.beat + 0.05, vel); i = int(beat * s.beat * SR); buf[i:i + len(x)] += x[:len(buf) - i]
    def hit(s, track, key, beat, vel=1.0):
        buf = s.tr(track); x = DR[key](vel); i = int(beat * s.beat * SR); buf[i:i + len(x)] += x[:len(buf) - i]
    def drums(s, pattern, bars, start=0, track='drums', swing=0.0, vel=1.0, steps=16):
        # pattern: dict key -> string of length steps ('x' hit, 'g' ghost, '.' none)
        for b in range(start, start + bars):
            for k, p in pattern.items():
                for i, ch in enumerate(p):
                    if ch in 'xXg':
                        st = i * (s.bb / steps); st += swing * s.beat / 4 if (i % 2 == 1) else 0
                        s.hit(track, k, b * s.bb + st, vel * (0.35 if ch == 'g' else 1.25 if ch == 'X' else 1))
    def render(s, gains, reverb=0.2, master_lp=None, loop=True):
        out = np.zeros(int(SR * (s.len + 4)))
        for name, (buf, g) in s.tracks.items(): out += buf * gains.get(name, 1.0)
        if reverb:
            nn = int(SR * 1.6); ir = rng.normal(0, 1, nn) * np.exp(-np.arange(nn) / SR * 3.5); ir = lp(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
            wet = signal.fftconvolve(out, ir)[:len(out)] * 0.6; out = out + wet * reverb
        if master_lp: out = lp(out, master_lp)
        L = int(SR * s.len)
        if loop: tail = out[L:]; out = out[:L].copy(); out[:len(tail)] += tail  # wrap tail -> seamless loop
        else: out = out[:L + int(SR * 2)]
        out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.3) * 0.9; return out

def chord_notes(root, kind):
    iv = {'maj': [0, 4, 7], 'min': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'm6': [0, 3, 7, 9], 'mM7': [0, 3, 7, 11], 'm9': [0, 3, 7, 10, 14], 'sus': [0, 5, 7], 'dim': [0, 3, 6]}[kind]
    return [root + i for i in iv]

def write(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    p = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '56k', '-ar', '32000', os.path.join(OUT, name + '.mp3')], input=pcm); assert p.returncode == 0

# ================================================================= cues
def title():
    s = Song(116, 24)
    line = [n('B3'), n('C4'), n('C#4'), n('C4')]  # the classic spy chromatic line over Em
    for b in range(24):
        sec = b // 8
        for k in range(8): s.note('gtr', i_trem, line[(b // 2) % 4] if k % 2 == 0 else n('E3'), b * 4 + k * 0.5, 0.5, 0.55 if k % 2 else 0.8)
        bl = [n('E2'), n('E2'), n('G2'), n('A2')] if b % 2 == 0 else [n('B2'), n('A2'), n('G2'), n('F#2')]
        for k in range(4): s.note('bass', i_bass, bl[k], b * 4 + k, 0.9, 0.9)
        if sec >= 1: s.note('pad', i_str, n('E4'), b * 4, 4, 0.5); s.note('pad', i_str, n('G4'), b * 4, 4, 0.4); s.note('pad', i_str, line[(b // 2) % 4] + 12, b * 4, 4, 0.35)
    mel = [(n('E5'), 0, 1.5), (n('F#5'), 1.5, 0.5), (n('G5'), 2, 1), (n('F#5'), 3, 1), (n('E5'), 4, 3), (n('B4'), 7, 1),
           (n('C5'), 8, 1), (n('B4'), 9, 1), (n('G4'), 10, 1), (n('A4'), 11, 1), (n('B4'), 12, 4)]
    for rep in (8, 12, 16, 20):
        for m, bt, d in mel: s.note('lead', i_trem if rep % 8 == 0 else i_lead, m - 12 if rep % 8 == 0 else m, rep * 4 + bt, d, 0.9)
    pat = {'k': 'x.......x.x.....', 's': '....x.......x...', 'R': 'x.x.x.x.x.x.x.x.', 'h': '....x.......x...'}
    s.drums({'R': 'x..x..x..x..x..x', 'b': '....x.......x...'}, 4, 0)
    s.drums(pat, 16, 4, swing=0.3); s.drums({'k': 'x.......x.......', 's': '....x.......x..g', 'R': 'x.x.x.x.x.x.x.x.'}, 4, 20, swing=0.3)
    for b in (7, 15, 23): s.hit('drums', 't', b * 4 + 3, 0.8); s.hit('drums', 't', b * 4 + 3.5, 0.8)
    return s.render({'gtr': 0.7, 'bass': 1.0, 'pad': 0.6, 'lead': 0.75, 'drums': 0.55}, 0.25)

def shop():
    s = Song(84, 16)
    prog = [(n('F3'), 'maj7'), (n('E3'), 'm7'), (n('D3'), 'm7'), (n('C3'), 'maj7')]
    for b in range(16):
        r, k = prog[b % 4]
        for i, m in enumerate(chord_notes(r, k)): s.note('ep', i_ep, m + 12, b * 4 + i * 0.03, 1.8, 0.55); s.note('ep', i_ep, m + 12, b * 4 + 2.5 + i * 0.02, 1.4, 0.4)
        s.note('bass', i_bass, r - 12, b * 4, 1.5, 0.7); s.note('bass', i_bass, r - 12 + 7, b * 4 + 2.5, 1.0, 0.5); s.note('bass', i_bass, r - 12, b * 4 + 3.5, 0.5, 0.4)
    mel = [72, 74, 76, 79, 77, 76, 74, 72, 71, 72, 74, 69]
    for i in range(32):
        if i % 4 != 3 and i >= 8: s.note('bell', i_bell, mel[(i * 5) % len(mel)] + 12, i * 2 + (0.5 if i % 2 else 0), 1.0, 0.45)
    s.drums({'k': 'x.......xx......', 's': '....x.......x...', 'h': 'x.x.x.x.x.xgx.x.'}, 14, 2, swing=0.45, vel=0.8)
    s.tr('vinyl')[:] += (rng.uniform(0, 1, len(s.tr('vinyl'))) > 0.9996) * rng.uniform(-1, 1, len(s.tr('vinyl'))) * 0.4 + lp(rng.uniform(-1, 1, len(s.tr('vinyl'))), 3000) * 0.01
    return s.render({'ep': 0.8, 'bass': 0.9, 'bell': 0.4, 'drums': 0.5, 'vinyl': 0.6}, 0.25, master_lp=6500)

def brief():
    s = Song(96, 16)
    roots = [n('D2'), n('D2'), n('Bb1'), n('A1')]
    for b in range(16):
        r = roots[b % 4]
        for k in range(8): s.note('pulse', i_bass, r + (12 if k % 4 == 3 else 0), b * 4 + k * 0.5, 0.4, 0.75)
        s.note('str', i_str, r + 24, b * 4, 4, 0.6); s.note('str', i_str, r + 24 + (3 if r != n('Bb1') else 4), b * 4, 4, 0.45); s.note('str', i_str, r + 31, b * 4, 4, 0.4)
        if b % 4 == 0: s.hit('drums', 'T', b * 4, 0.9)
        if b >= 8: s.drums({'h': '..x...x...x...x.', 'k': 'x.....x...x.....'}, 1, b, vel=0.7)
    for b in (8, 10, 12, 14): s.note('lead', i_ep, n('A4'), b * 4, 1, 0.6); s.note('lead', i_ep, n('D5'), b * 4 + 1, 1, 0.6); s.note('lead', i_ep, n('C5'), b * 4 + 2, 2, 0.6)
    return s.render({'pulse': 0.8, 'str': 0.7, 'drums': 0.6, 'lead': 0.5}, 0.3)

def plane():
    s = Song(132, 16)
    prog = [(n('C3'), 'maj7'), (n('A2'), 'm7'), (n('D3'), 'm7'), (n('G2'), '7')]
    for b in range(16):
        r, k = prog[b % 4]; cn = [m + 12 for m in chord_notes(r, k)]
        for st in (0, 1.5, 3, 3.5 + 0.0):
            if st == 3.5 and b % 2: continue
            for i, m in enumerate(cn): s.note('nyl', i_pluck, m, b * 4 + st + i * 0.01, 1.2, 0.45)
        s.note('bass', i_bass, r - 12, b * 4, 1.4, 0.7); s.note('bass', i_bass, r - 5, b * 4 + 1.5, 0.5, 0.5); s.note('bass', i_bass, r - 5, b * 4 + 2, 1.4, 0.6); s.note('bass', i_bass, r - 12, b * 4 + 3.5, 0.5, 0.5)
    mel = [(76, 0, 1.5), (74, 1.5, 0.5), (72, 2, 2), (69, 4, 1.5), (71, 5.5, 0.5), (72, 6, 2), (74, 8, 1.5), (72, 9.5, 0.5), (71, 10, 1), (72, 11, 1), (67, 12, 4)]
    for rep in (4, 8, 12):
        for m, bt, d in mel: s.note('flute', i_lead, m + 12, rep * 4 + bt, d, 0.6)
    s.drums({'r': 'x..x..x...x..x..', 'h': 'x.xxx.xxx.xxx.xx', 'k': 'x..x....x..x....'}, 16, 0, vel=0.6)
    return s.render({'nyl': 0.7, 'bass': 0.8, 'flute': 0.45, 'drums': 0.5}, 0.3)

def stealth():
    s = Song(100, 16)
    for b in range(16):
        r = [n('A1'), n('A1'), n('F1'), n('E1')][b % 4]
        for k in range(16):
            if k % 3 == 0: s.note('pulse', i_sub, r + 12, b * 4 + k * 0.25, 0.25, 0.7)
        s.note('pad', i_pad, r + 24, b * 4, 4, 0.5); s.note('pad', i_pad, r + 31, b * 4, 4, 0.35)
        if b % 2 == 1: s.note('ping', i_bell, n('E6') if b % 4 == 1 else n('F6'), b * 4 + 2.75, 1, 0.25)
    s.drums({'h': 'x.x.x.x.x.x.x.x.', 'r': '......x.......x.'}, 12, 4, vel=0.5)
    return s.render({'pulse': 0.8, 'pad': 0.7, 'ping': 0.4, 'drums': 0.45}, 0.35)

def boss():
    s = Song(140, 24)
    prog = [n('C2'), n('Ab1'), n('Bb1'), n('G1')]
    for b in range(24):
        r = prog[b % 4]
        for k in range(16): s.note('bass', i_bass, r + (12 if k % 4 == 2 else 0), b * 4 + k * 0.25, 0.22, 0.85)
        kind = 'min' if r in (n('C2'), n('G1')) else 'maj'
        if b >= 4:
            arp = chord_notes(r + 36, kind) + [r + 48]
            for k in range(16): s.note('arp', i_arp, arp[(k * 3) % 4] if b % 8 >= 4 else arp[k % 4], b * 4 + k * 0.25, 0.25, 0.7)
        s.note('pad', i_pad, r + 24, b * 4, 4, 0.5); s.note('pad', i_pad, r + 24 + (3 if kind == 'min' else 4), b * 4, 4, 0.4)
    lead = [(n('G5'), 0, 1), (n('Eb5'), 1, 1), (n('C5'), 2, 2), (n('Ab4'), 4, 1.5), (n('C5'), 5.5, 0.5), (n('Eb5'), 6, 2), (n('F5'), 8, 1), (n('D5'), 9, 1), (n('Bb4'), 10, 2), (n('B4'), 12, 2), (n('D5'), 14, 1), (n('G5'), 15, 1)]
    for rep in (8, 12, 16, 20):
        for m, bt, d in lead: s.note('lead', i_lead, m, rep * 4 + bt, d, 0.9)
    s.drums({'k': 'x...x...x...x...', 's': '....x.......x...', 'h': '..x...x...x...x.', 'o': '..............x.'}, 20, 4)
    s.drums({'k': 'x...x...x...x...', 'h': 'x.x.x.x.x.x.x.x.'}, 4, 0, vel=0.7)
    for b in (7, 15, 23): s.drums({'s': '........x.x.xxxx'}, 1, b, vel=0.8)
    return s.render({'bass': 0.85, 'arp': 0.5, 'pad': 0.5, 'lead': 0.6, 'drums': 0.75}, 0.15)

def ending():
    s = Song(88, 16)
    prog = [(n('C3'), 'maj'), (n('G2'), 'maj'), (n('A2'), 'min'), (n('F2'), 'maj')]
    for b in range(16):
        r, k = prog[b % 4]
        for i, m in enumerate(chord_notes(r, k)):
            s.note('ep', i_ep, m + 12, b * 4 + i * 0.04, 2, 0.5); s.note('ep', i_ep, m + 12, b * 4 + 2 + i * 0.04, 2, 0.4)
            s.note('pad', i_str, m + 24, b * 4, 4, 0.35)
        s.note('bass', i_bass, r - 12 if r > n('G2') else r, b * 4, 2, 0.7); s.note('bass', i_bass, r - 5, b * 4 + 2, 2, 0.5)
    mel = [(76, 0, 2), (74, 2, 1), (72, 3, 1), (74, 4, 3), (67, 7, 1), (72, 8, 2), (71, 10, 1), (69, 11, 1), (65, 12, 2), (67, 14, 2)]
    for rep in (4, 8, 12):
        for m, bt, d in mel: s.note('bell', i_bell, m + 12, rep * 4 + bt, d, 0.55)
    s.drums({'k': 'x.........x.....', 'b': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}, 12, 4, swing=0.3, vel=0.6)
    return s.render({'ep': 0.8, 'pad': 0.5, 'bass': 0.8, 'bell': 0.5, 'drums': 0.5}, 0.35)

def radio():
    s = Song(120, 16, 4)
    prog = [(n('C3'), 'maj'), (n('A2'), 'min'), (n('F2'), 'maj'), (n('G2'), 'maj')]
    for b in range(16):
        r, k = prog[b % 4]
        for beat in range(4):
            for m in chord_notes(r + 12, k): s.note('org', i_organ, m, b * 4 + beat, 0.9 if beat % 2 == 0 else 0.6, 0.6)
        for beat in range(4): s.note('bass', i_bass, [r - 12, r - 5, r - 12 + 12, r - 5][beat], b * 4 + beat, 0.9, 0.7)
    mel = [(72, 0, 1), (72, 1, 1), (76, 2, 2), (69, 4, 2), (72, 6, 2), (65, 8, 1), (69, 9, 1), (72, 10, 2), (71, 12, 3), (67, 15, 1)]
    for rep in (0, 4, 8, 12):
        for m, bt, d in mel: s.note('lead', i_lead, m + 12, rep * 4 + bt, d, 0.8)
    s.drums({'k': 'x.......x.......', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}, 16, 0, swing=0.5, vel=0.7)
    out = s.render({'org': 0.5, 'bass': 0.7, 'lead': 0.6, 'drums': 0.6}, 0.15)
    return np.tanh(bp(out, 300, 3200) * 2.2) * 0.8

def core():
    s = Song(70, 12)
    for b in range(12):
        r = [n('C2'), n('C2'), n('Db2'), n('C2')][b % 4]
        s.note('drone', i_pad, r, b * 4, 4, 0.8); s.note('drone', i_pad, r + 7, b * 4, 4, 0.5); s.note('drone', i_pad, r + 13 if b % 4 == 2 else r + 12, b * 4, 4, 0.4)
        for k in range(4): s.note('tick', i_bell, n('C7') if k == 0 else n('G6'), b * 4 + k, 0.4, 0.15 if k else 0.25)
        if b % 2 == 0: s.hit('drums', 'T', b * 4, 0.5)
    return s.render({'drone': 0.9, 'tick': 0.5, 'drums': 0.6}, 0.4)

CUES = {'title': title, 'shop': shop, 'brief': brief, 'plane': plane, 'stealth': stealth, 'boss': boss, 'ending': ending, 'radio': radio, 'core': core}
os.makedirs(OUT, exist_ok=True)
for name, fn in CUES.items():
    if sys.argv[1:] and name not in sys.argv[1:]: continue
    x = fn(); write(name, x); print(name, round(len(x) / SR, 1), 's')
