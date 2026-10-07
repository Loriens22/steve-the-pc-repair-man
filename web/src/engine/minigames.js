// Canvas minigames: screws, CMOS battery, BIOS date, RFID cloning, keypad, patch-panel cable management.
import { audio } from './audio.js';
import { pixText, pixWrap, scanlines } from './textures.js';
const $ = s => document.querySelector(s);
const W = 640, H = 420;

function harness(game, title, help, setup) {
  return new Promise(resolve => {
    const box = $('#mini'), cv = $('#mini-c'), x = cv.getContext('2d'); cv.width = W; cv.height = H;
    $('#mini-title').textContent = title; $('#mini-help').textContent = help; $('#mini-btns').innerHTML = '';
    box.classList.remove('hidden'); game.paused.mini = true; document.exitPointerLock?.();
    let alive = true, last = performance.now();
    const api = {
      x, done(ok) { if (!alive) return; alive = false; cleanup(); setTimeout(() => resolve(ok), 10); },
      help(t) { $('#mini-help').textContent = t; },
      buttons(list) { const b = $('#mini-btns'); b.innerHTML = ''; for (const it of list) { const e = document.createElement('button'); e.textContent = it.label;
        let rep = null; const fire = () => it.fn();
        e.addEventListener('pointerdown', ev => { ev.preventDefault(); fire(); if (it.repeat) { let d = 380; const go = () => { fire(); d = Math.max(40, d * 0.8); rep = setTimeout(go, d); }; rep = setTimeout(go, d); } });
        const stop = () => { clearTimeout(rep); rep = null; }; e.addEventListener('pointerup', stop); e.addEventListener('pointerleave', stop); e.addEventListener('pointercancel', stop); b.appendChild(e); } },
      pt: { x: 0, y: 0, down: false },
    };
    const toCanvas = e => { const r = cv.getBoundingClientRect(); const s = Math.min(r.width / W, r.height / H); const ox = r.left + (r.width - W * s) / 2, oy = r.top + (r.height - H * s) / 2; return { x: (e.clientX - ox) / s, y: (e.clientY - oy) / s }; };
    const pd = e => { e.preventDefault(); const p = toCanvas(e); Object.assign(api.pt, p, { down: true }); api.onDown && api.onDown(p); };
    const pm = e => { const p = toCanvas(e); Object.assign(api.pt, p); api.onMove && api.onMove(p); };
    const pu = e => { const p = toCanvas(e); api.pt.down = false; api.onUp && api.onUp(p); };
    const kd = e => { if (e.code === 'Escape') { api.done(false); return; } api.onKey && api.onKey(e); };
    const ku = e => { api.onKeyUp && api.onKeyUp(e); };
    cv.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu); addEventListener('keydown', kd); addEventListener('keyup', ku);
    $('#mini-close').onclick = () => api.done(false);
    const loop = now => { if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; api.update && api.update(dt); requestAnimationFrame(loop); };
    function cleanup() { cv.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      box.classList.add('hidden'); game.paused.mini = false; if (!game.touch) game.requestLock(); }
    setup(api); requestAnimationFrame(loop);
    if (game.debugWin) setTimeout(() => api.done(true), game.debugWin);
  });
}

export const Mini = {
  screws(game) {
    return harness(game, 'OPEN THE CASE', 'Press and hold each screw to unscrew it. (Keyboard: hold SPACE)', api => {
      const x = api.x; const sc = [[90, 70], [550, 70], [90, 350], [550, 350]].map(([a, b]) => ({ x: a, y: b, p: 0, out: false, rot: 0 }));
      let slide = 0, finished = false, kb = false, ratchet = 0;
      api.onKey = e => { if (e.code === 'Space' || e.code === 'KeyE') kb = true; }; api.onKeyUp = e => { if (e.code === 'Space' || e.code === 'KeyE') kb = false; };
      api.update = dt => {
        let active = null;
        if (api.pt.down) active = sc.find(s => !s.out && Math.hypot(s.x - api.pt.x, s.y - api.pt.y) < 48);
        if (kb) active = sc.find(s => !s.out);
        if (active) { active.p += dt / 0.7; active.rot += dt * 14; ratchet -= dt; if (ratchet <= 0) { ratchet = 0.11; audio.sfx('ratchet', { vol: 0.5 }); }
          if (active.p >= 1) { active.out = true; audio.sfx('screw_out', { vol: 0.8 }); } }
        if (sc.every(s => s.out)) { slide += dt * 1.6; if (slide > 1.2 && !finished) { finished = true; audio.sfx('panel_off', { vol: 0.8 }); setTimeout(() => api.done(true), 350); } }
        // draw
        x.fillStyle = '#1a3a22'; x.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(200,180,80,0.25)'; x.fillRect((i * 97) % W, (i * 53) % H, 30, 2); }
        x.save(); x.translate(slide * slide * 500, 0);
        const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#e2dac2'); g.addColorStop(1, '#c9bf9f'); x.fillStyle = g; x.fillRect(40, 20, 560, 380);
        x.strokeStyle = '#a99f80'; x.lineWidth = 3; x.strokeRect(40, 20, 560, 380);
        for (let i = 0; i < 10; i++) { x.fillStyle = '#b5ab8c'; x.fillRect(200, 140 + i * 14, 240, 6); }
        pixText(x, 'DO NOT REMOVE - NO USER SERVICEABLE PARTS', 320, 370, 1, '#7a705a', 'center');
        for (const s of sc) {
          if (s.out && slide > 0) continue;
          x.save(); x.translate(s.x, s.y + (s.out ? -20 : 0)); x.rotate(s.rot);
          x.fillStyle = s.out ? '#999' : '#b8bec4'; x.beginPath(); x.arc(0, 0, 20, 0, 7); x.fill(); x.strokeStyle = '#555'; x.lineWidth = 2; x.stroke();
          x.fillStyle = '#444'; x.fillRect(-12, -3, 24, 6); x.fillRect(-3, -12, 6, 24); x.restore();
          if (!s.out && s.p > 0) { x.strokeStyle = '#ffd84a'; x.lineWidth = 5; x.beginPath(); x.arc(s.x, s.y, 30, -Math.PI / 2, -Math.PI / 2 + s.p * Math.PI * 2); x.stroke(); }
        }
        x.restore();
        pixText(x, `SCREWS: ${sc.filter(s => s.out).length}/4`, 20, 396, 2, '#ffd84a');
      };
    });
  },
  battery(game, mode) { // mode 'out' or 'in'
    return harness(game, mode === 'out' ? 'REMOVE THE OLD CMOS BATTERY' : 'INSTALL THE NEW CR2032', mode === 'out' ? 'Tap the metal retaining clip to pop the old battery out.' : 'Drag the new battery into the socket (or tap the socket).', api => {
      const x = api.x; const sock = { x: 330, y: 220 }; let st = mode === 'out' ? 'in' : 'empty'; let fly = null, drag = null, t = 0;
      const nb = { x: 540, y: 340 };
      api.onDown = p => {
        if (mode === 'out' && st === 'in' && Math.hypot(p.x - (sock.x + 58), p.y - sock.y) < 34) { st = 'popping'; audio.sfx('batt_pop', { vol: 0.9 }); fly = { x: sock.x, y: sock.y, vx: 260, vy: -420, r: 0 }; }
        if (mode === 'in' && st === 'empty') { if (Math.hypot(p.x - nb.x, p.y - nb.y) < 50) drag = { dx: p.x - nb.x, dy: p.y - nb.y }; else if (Math.hypot(p.x - sock.x, p.y - sock.y) < 60) { st = 'in'; audio.sfx('batt_click', { vol: 0.9 }); setTimeout(() => api.done(true), 600); } }
      };
      api.onMove = p => { if (drag) { nb.x = p.x - drag.dx; nb.y = p.y - drag.dy; } };
      api.onUp = () => { if (drag) { drag = null; if (Math.hypot(nb.x - sock.x, nb.y - sock.y) < 70) { st = 'in'; audio.sfx('batt_click', { vol: 0.9 }); setTimeout(() => api.done(true), 600); } } };
      api.onKey = e => { if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') api.onDown(mode === 'out' ? { x: sock.x + 58, y: sock.y } : { x: sock.x, y: sock.y }); };
      const coin = (cx, cy, r, label) => { const g = x.createRadialGradient(cx - r / 3, cy - r / 3, 2, cx, cy, r); g.addColorStop(0, '#f4f6f8'); g.addColorStop(1, '#8e959c'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.strokeStyle = '#666'; x.lineWidth = 2; x.stroke(); pixText(x, label, cx, cy - 6, 2, '#444', 'center'); pixText(x, '3V', cx, cy + 10, 1, '#555', 'center'); };
      api.update = dt => {
        t += dt;
        x.fillStyle = '#1f6b3a'; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(220,190,90,0.5)'; x.lineWidth = 2; for (let i = 0; i < 24; i++) { x.beginPath(); x.moveTo(0, i * 18 + 5); x.lineTo(180 + (i % 5) * 30, i * 18 + 5); x.lineTo(220 + (i % 5) * 30, i * 18 + 40); x.stroke(); }
        x.fillStyle = '#222'; x.fillRect(430, 30, 180, 150); pixText(x, 'AWARD BIOS', 520, 90, 2, '#aaa', 'center'); x.fillStyle = '#ddd'; x.fillRect(40, 300, 220, 30); pixText(x, 'PCI1', 150, 310, 2, '#333', 'center');
        x.fillStyle = '#111'; x.beginPath(); x.arc(sock.x, sock.y, 66, 0, 7); x.fill(); x.fillStyle = '#c9ccd0'; x.fillRect(sock.x + 48, sock.y - 14, 26, 28);
        pixText(x, 'BAT1', sock.x, sock.y + 80, 2, '#ffd84a', 'center');
        if (st === 'in') coin(sock.x, sock.y, 56, mode === 'out' ? 'CR2032' : 'NEW!');
        if (fly) { fly.vy += 900 * dt; fly.x += fly.vx * dt; fly.y += fly.vy * dt; fly.r += dt * 10; x.save(); x.translate(fly.x, fly.y); x.rotate(fly.r); coin(0, 0, 56, 'DEAD'); x.restore(); if (fly.y > H + 80) { fly = null; api.done(true); } }
        if (mode === 'in' && st === 'empty') { coin(nb.x, nb.y, 56, 'CR2032'); if (!drag) { x.strokeStyle = `rgba(255,216,74,${0.5 + 0.5 * Math.sin(t * 6)})`; x.lineWidth = 4; x.setLineDash([10, 8]); x.beginPath(); x.arc(sock.x, sock.y, 60, 0, 7); x.stroke(); x.setLineDash([]); } }
        if (mode === 'out' && st === 'in') { x.strokeStyle = `rgba(255,216,74,${0.5 + 0.5 * Math.sin(t * 6)})`; x.lineWidth = 4; x.strokeRect(sock.x + 42, sock.y - 20, 38, 40); }
      };
    });
  },
  bios(game) {
    const now = new Date(); const target = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
    return harness(game, 'AWARD BIOS SETUP UTILITY', 'Set the date to today, then SAVE & EXIT. (Arrows / buttons)', api => {
      const x = api.x; const v = [1, 1, 1980]; let sel = 2, msg = '', t = 0;
      const lim = [[1, 12], [1, 31], [1980, 2099]];
      const ch = (d) => { v[sel] += d; if (v[sel] > lim[sel][1]) v[sel] = lim[sel][0]; if (v[sel] < lim[sel][0]) v[sel] = lim[sel][1]; audio.sfx('key', { vol: 0.35 }); };
      const save = () => {
        if (v[2] !== target[2]) { msg = v[2] < target[2] ? 'IT IS NOT ' + v[2] + '. MS. ELLIS WOULD NOTICE.' : 'TOO FAR IN THE FUTURE. NICE TRY.'; audio.sfx('error', { vol: 0.6 }); return; }
        const exact = v[0] === target[0] && v[1] === target[1];
        audio.sfx('success', { vol: 0.7 }); msg = 'SAVING TO CMOS AND EXIT (Y/N)? Y'; game.state.biosExact = exact; setTimeout(() => api.done(true), 700);
      };
      api.buttons([{ label: '\u25C0', fn: () => { sel = (sel + 2) % 3; } }, { label: '\u25B6', fn: () => { sel = (sel + 1) % 3; } }, { label: '\u25B2', fn: () => ch(1), repeat: true }, { label: '\u25BC', fn: () => ch(-1), repeat: true },
        { label: '+10', fn: () => { if (sel === 2) { v[2] = Math.min(2099, v[2] + 10); audio.sfx('key', { vol: 0.35 }); } } }, { label: 'TODAY?', fn: () => { msg = 'HINT: TODAY IS ' + target.join('/'); } }, { label: 'F10 SAVE', fn: save }]);
      api.onKey = e => { if (e.code === 'ArrowLeft') sel = (sel + 2) % 3; if (e.code === 'ArrowRight' || e.code === 'Tab') { e.preventDefault(); sel = (sel + 1) % 3; } if (e.code === 'ArrowUp') ch(1); if (e.code === 'ArrowDown') ch(-1); if (e.code === 'PageUp' && sel === 2) v[2] = Math.min(2099, v[2] + 10); if (e.code === 'F10' || e.code === 'Enter') { e.preventDefault(); save(); } };
      api.update = dt => {
        t += dt; x.fillStyle = '#0000aa'; x.fillRect(0, 0, W, H);
        pixText(x, 'ROM PCI/ISA BIOS (2A69KG0N)', W / 2, 14, 2, '#fff', 'center'); pixText(x, 'STANDARD CMOS SETUP', W / 2, 36, 2, '#ff5', 'center'); pixText(x, 'AWARD SOFTWARE, INC.', W / 2, 56, 2, '#fff', 'center');
        x.strokeStyle = '#aaa'; x.strokeRect(20, 80, W - 40, 260);
        pixText(x, 'DATE (MM:DD:YYYY) :', 40, 104, 2, '#fff');
        const fields = [String(v[0]).padStart(2, '0'), String(v[1]).padStart(2, '0'), String(v[2])];
        let fx = 290; fields.forEach((f, i) => { const w = f.length * 12 + 8; if (i === sel) { x.fillStyle = (t * 3 % 1) < 0.6 ? '#aa0000' : '#880000'; x.fillRect(fx - 4, 98, w, 20); } pixText(x, f, fx, 104, 2, i === sel ? '#ff5' : '#fff'); fx += w + 14; if (i < 2) pixText(x, ':', fx - 12, 104, 2, '#fff'); });
        pixText(x, 'TIME (HH:MM:SS) : ' + now.toTimeString().slice(0, 8), 40, 134, 2, '#fff');
        pixText(x, 'HARD DISKS    TYPE  SIZE  CYLS', 40, 170, 2, '#aaf'); pixText(x, 'PRIMARY MASTER : AUTO  2100M', 40, 192, 2, '#fff'); pixText(x, 'DRIVE A : 1.44M, 3.5 IN.', 40, 220, 2, '#fff');
        pixText(x, 'VIDEO : EGA/VGA     HALT ON : ALL ERRORS', 40, 248, 2, '#fff');
        pixText(x, 'BASE MEMORY: 640K   EXTENDED: 64512K', 40, 290, 2, '#fff');
        x.fillStyle = '#00a'; pixText(x, 'ESC:QUIT  \u2190\u2192:SELECT  PU/PD/+/-:MODIFY  F10:SAVE', W / 2, 356, 1, '#aaf', 'center');
        if (msg) { x.fillStyle = '#a00'; x.fillRect(60, 372, W - 120, 30); pixText(x, msg, W / 2, 382, 2, '#fff', 'center'); }
        scanlines(x, W, H, 0.12);
      };
    });
  },
  rfid(game) {
    return harness(game, 'RFID CLONER - KEYCARD CAPTURE', 'Tune your cloner until the waves line up, then hold it steady. (Drag / arrows)', api => {
      const x = api.x; const tf = 2.4 + Math.random() * 2.2; let f = 1.2, prog = 0, t = 0, kick = 0, jolt = 3, staleT = 0, drag = null;
      api.buttons([{ label: '\u25C0 TUNE', fn: () => f = Math.max(0.5, f - 0.06), repeat: true }, { label: 'TUNE \u25B6', fn: () => f = Math.min(6, f + 0.06), repeat: true }]);
      api.onKey = e => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') f = Math.max(0.5, f - 0.08); if (e.code === 'ArrowRight' || e.code === 'KeyD') f = Math.min(6, f + 0.08); };
      api.onDown = p => drag = p.x; api.onMove = p => { if (drag !== null && api.pt.down) { f = Math.max(0.5, Math.min(6, f + (p.x - drag) * 0.01)); drag = p.x; } }; api.onUp = () => drag = null;
      api.update = dt => {
        t += dt; jolt -= dt; if (jolt < 0) { jolt = 2.5 + Math.random() * 3; kick = (Math.random() - 0.5) * 1.6; audio.sfx('turbulence_bump', { vol: 0.6 }); game.player.shake = 0.3; }
        f += kick * dt * 3; kick *= Math.pow(0.05, dt);
        const err = Math.abs(f - tf); const ok = err < 0.12;
        prog = Math.max(0, Math.min(1, prog + (ok ? dt / 2.6 : -dt / 5))); if (!ok) staleT += dt; else staleT = 0;
        if (staleT > 14) { staleT = 0; game.bark('p_lars_stir'); }
        if (ok && Math.random() < dt * 12) audio.sfx('blip', { vol: 0.15, rate: 0.8 + prog });
        x.fillStyle = '#041008'; x.fillRect(0, 0, W, H); x.strokeStyle = '#0a3a1a'; x.lineWidth = 1; for (let i = 0; i < W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 300); x.stroke(); } for (let j = 0; j < 300; j += 40) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
        const wave = (fr, col, ph, amp) => { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= W; i += 4) { const y = 150 + Math.sin(i / W * Math.PI * 2 * fr + ph) * amp + Math.sin(i * 0.31 + t * 9) * 3; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); };
        wave(tf, 'rgba(80,160,255,0.85)', t * 2, 90); wave(f, ok ? '#5f8' : '#fd5', t * 2, 80);
        pixText(x, 'TARGET: LARS-KEYCARD 125KHZ', 16, 14, 2, '#5af'); pixText(x, 'CLONER: ' + (f * 50).toFixed(1) + ' KHZ', 16, 34, 2, ok ? '#5f8' : '#fd5');
        x.fillStyle = '#123'; x.fillRect(40, 330, W - 80, 26); x.fillStyle = ok ? '#5f8' : '#3a8'; x.fillRect(40, 330, (W - 80) * prog, 26); pixText(x, 'CLONING ' + Math.round(prog * 100) + '%', W / 2, 337, 2, '#fff', 'center');
        pixText(x, ok ? 'LOCKED - HOLD STEADY' : err < 0.5 ? 'CLOSE...' : 'NO SIGNAL', W / 2, 372, 2, ok ? '#5f8' : '#f85', 'center');
        if (prog >= 1) { audio.sfx('success', { vol: 0.8 }); api.done(true); }
      };
    });
  },
  keypad(game, code = '0451') {
    return harness(game, 'SERVICE DOOR - ENTER PIN', 'Type the 4-digit PIN. (Number keys or tap)', api => {
      const x = api.x; let entry = '', msg = 'CARD OK - ENTER PIN', col = '#5f8', t = 0, done = false;
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']; const pos = k => { const i = keys.indexOf(k); return { x: 220 + (i % 3) * 100, y: 120 + Math.floor(i / 3) * 72 }; };
      const press = k => {
        if (done) return; audio.sfx('key_beep', { vol: 0.5, rate: 0.9 + keys.indexOf(k) * 0.03, vary: 0 });
        if (k === 'C') { entry = ''; return; }
        if (k === 'OK' || entry.length >= 4) {
          if (entry === code) { msg = 'ACCESS GRANTED'; col = '#5f8'; done = true; audio.sfx('access', { vol: 0.8, vary: 0 }); setTimeout(() => api.done(true), 700); }
          else { if (entry === '1234') { msg = "SAME AS MY LUGGAGE!"; game.secret('luggage'); } else msg = 'ACCESS DENIED'; col = '#f55'; audio.sfx('error', { vol: 0.7 }); entry = ''; }
          return;
        }
        entry += k; if (entry.length === 4) setTimeout(() => press('OK'), 250);
      };
      api.onDown = p => { for (const k of keys) { const q = pos(k); if (Math.abs(p.x - q.x) < 44 && Math.abs(p.y - q.y) < 30) press(k); } };
      api.onKey = e => { if (/^Digit\d$/.test(e.code)) press(e.code.slice(5)); if (/^Numpad\d$/.test(e.code)) press(e.code.slice(6)); if (e.code === 'Backspace') entry = entry.slice(0, -1); if (e.code === 'Enter') press('OK'); };
      api.update = dt => {
        t += dt; x.fillStyle = '#1c1f24'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#0a2a12'; x.fillRect(170, 20, 300, 60); pixText(x, msg, 320, 30, 2, col, 'center'); pixText(x, entry.padEnd(4, '_').split('').join(' '), 320, 54, 2, '#5f8', 'center');
        for (const k of keys) { const q = pos(k); x.fillStyle = '#555c66'; x.fillRect(q.x - 42, q.y - 28, 84, 56); x.fillStyle = '#7a828c'; x.fillRect(q.x - 42, q.y - 28, 84, 6); pixText(x, k, q.x, q.y - 7, 2, '#fff', 'center'); }
      };
    });
  },
  patch(game) {
    return harness(game, 'PATCH PANEL - CABLE MANAGEMENT', 'Connect each coloured port to the matching socket. Drag, or tap a port then a socket.', api => {
      const x = api.x; const cols = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22'], names = ['WAN', 'CCTV', 'DOOR', 'LIFT', 'CORE'];
      const order = [3, 0, 4, 1, 2]; const L = cols.map((c, i) => ({ x: 110, y: 70 + i * 66, c: i })), Rr = order.map((c, i) => ({ x: 530, y: 70 + i * 66, c }));
      const links = {}; let sel = null, drag = null, t = 0, done = false; const t0 = performance.now();
      const hitL = p => L.findIndex(q => Math.hypot(p.x - q.x, p.y - q.y) < 30), hitR = p => Rr.findIndex(q => Math.hypot(p.x - q.x, p.y - q.y) < 30);
      const connect = (li, ri) => { if (L[li].c === Rr[ri].c) { links[li] = ri; audio.sfx('plug', { vol: 0.8 }); if (Object.keys(links).length === 5 && !done) { done = true; audio.sfx('success', { vol: 0.7 }); if ((performance.now() - t0) / 1000 < 20) game.secret('cables'); setTimeout(() => api.done(true), 800); } } else { audio.sfx('error', { vol: 0.5 }); api.help('That cable goes to the ' + names[L[li].c] + ' socket. Match the colours!'); } };
      api.onDown = p => { const li = hitL(p); if (li >= 0) { sel = li; drag = p; return; } const ri = hitR(p); if (ri >= 0 && sel !== null) { connect(sel, ri); sel = null; } };
      api.onMove = p => { if (drag) drag = p; };
      api.onUp = p => { if (drag && sel !== null) { const ri = hitR(p); if (ri >= 0) { connect(sel, ri); sel = null; } } drag = null; };
      api.onKey = e => { const n = +e.key; if (n >= 1 && n <= 5) { const li = n - 1; if (links[li] === undefined) connect(li, Rr.findIndex(r => r.c === L[li].c)); } };
      api.update = dt => {
        t += dt; x.fillStyle = '#16191e'; x.fillRect(0, 0, W, H); x.fillStyle = '#23272e'; x.fillRect(60, 30, 100, 360); x.fillRect(480, 30, 100, 360);
        pixText(x, 'SWITCH', 110, 12, 2, '#9ab', 'center'); pixText(x, 'FLOOR', 530, 12, 2, '#9ab', 'center');
        const cable = (a, b, c, w = 8) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a.x, a.y); x.bezierCurveTo(a.x + 160, a.y + 40, b.x - 160, b.y + 40, b.x, b.y); x.stroke(); };
        for (const li in links) cable(L[li], Rr[links[li]], cols[L[li].c]);
        if (drag && sel !== null) cable(L[sel], drag, cols[L[sel].c], 6);
        L.forEach((q, i) => { x.fillStyle = cols[q.c]; x.beginPath(); x.arc(q.x, q.y, 20, 0, 7); x.fill(); if (sel === i) { x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke(); } pixText(x, String(i + 1), q.x - 70, q.y - 7, 2, '#678'); });
        Rr.forEach(q => { x.fillStyle = '#000'; x.beginPath(); x.arc(q.x, q.y, 20, 0, 7); x.fill(); x.strokeStyle = cols[q.c]; x.lineWidth = 5; x.stroke(); pixText(x, names[q.c], q.x + 30, q.y - 7, 2, cols[q.c]); });
      };
    });
  },
};
