// DOM user interface: HUD, prompts, subtitles, toasts, chapter cards, phone, menus, settings.
import { audio } from './audio.js';
import { input, consume } from './input.js';
const $ = s => document.querySelector(s);

export class UI {
  constructor(game) {
    this.game = game; this.prompted = null;
    $('#phone .phone-close').onclick = () => this.phone(false);
    document.querySelectorAll('.phone-tabs button').forEach(b => b.onclick = () => this.phoneTab(b.dataset.tab));
    $('#settings-back').onclick = () => { $('#settings').classList.add('hidden'); this.game.saveSettings(); this._settingsBack && this._settingsBack(); };
    $('#panel-back').onclick = () => { $('#panel').classList.add('hidden'); this._panelBack && this._panelBack(); };
    document.querySelectorAll('.menu').forEach(m => m.addEventListener('mouseover', e => { if (e.target.tagName === 'BUTTON') audio.sfx('ui_hover', { vol: 0.25, vary: 0 }); }));
  }
  show(sel, on = true) { $(sel).classList.toggle('hidden', !on); }
  hud(on) { this.show('#hud', on); this.show('#touch', on && this.game.touch); }
  fade(to, dur = 0.6) { const f = $('#fade'); f.style.transition = `opacity ${dur}s`; f.style.opacity = to; return new Promise(r => setTimeout(r, dur * 1000)); }
  cine(on) { document.body.classList.toggle('cine', on); }
  objective(text, flash = true) {
    if (this._obj === text) return; this._obj = text; $('#obj-text').textContent = text; this.show('#objective', !!text);
    if (flash && text) { const o = $('#objective'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); audio.sfx('objective', { vol: 0.5, vary: 0 }); }
    this.game.state.objective = text;
  }
  prompt(text, key = 'E') {
    if (this.prompted === text) return; this.prompted = text;
    if (!text) { this.show('#prompt', false); $('#tb-use').classList.remove('glow'); return; }
    $('#prompt-text').textContent = text; $('#prompt .key').textContent = key; this.show('#prompt', true); $('#tb-use').classList.add('glow');
  }
  holdbar(p) { this.show('#holdbar', p > 0); $('#holdbar div').style.width = (p * 100) + '%'; }
  toast(text, dur = 2.6, cls = '') {
    if (!text) return; const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = text; $('#toasts').appendChild(t);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, dur * 1000);
  }
  subtitle(who, text, color) {
    if (!text) { this.show('#subtitle', false); return; }
    if (!this.game.settings.subs) return;
    $('#sub-name').textContent = who || ''; $('#sub-name').style.color = color || '#fff'; $('#sub-text').textContent = text; this.show('#subtitle', true);
  }
  chapter(num, title) {
    const c = $('#chapter'); $('#ch-num').textContent = num; $('#ch-title').textContent = title; c.classList.remove('hidden'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
    audio.sfx('chapter', { vol: 0.7, vary: 0 }); clearTimeout(this._cht); this._cht = setTimeout(() => c.classList.add('hidden'), 4600);
  }
  bigmsg(text, dur = 2) { const b = $('#bigmsg'); b.textContent = text; b.classList.remove('hidden'); clearTimeout(this._bm); if (dur) this._bm = setTimeout(() => b.classList.add('hidden'), dur * 1000); }
  detect(level, alert) {
    const d = $('#detect'); d.style.opacity = level > 0.02 || alert ? 1 : 0; d.classList.toggle('alert', !!alert);
    $('#detect-icon').style.setProperty('--p', Math.round(level * 100) + '%'); $('#detect-icon').textContent = alert ? '!' : '?';
  }
  timer(sec) { if (sec === null) { this.show('#timer', false); return; } this.show('#timer', true); const m = Math.floor(sec / 60), s = Math.floor(sec % 60); $('#timer').textContent = `FINAL UPDATE ${m}:${String(s).padStart(2, '0')}`; }
  gadgets(on, cool) {
    document.body.classList.toggle('gadgets', on); this.show('#gadgets', on);
    if (on && cool) { $('#g-zap i').style.transform = `scaleX(${1 - cool.zap / 2.5})`; $('#g-duster i').style.transform = `scaleX(${1 - cool.duster / 1.4})`; }
  }
  secrets(n, total) { $('#secrets-count').textContent = `SECRETS ${n}/${total}`; }
  // ---------------------------------------------------------- phone
  phone(on) {
    if (on === undefined) on = $('#phone').classList.contains('hidden');
    this.show('#phone', on); this.game.paused.phone = on;
    if (on) { audio.sfx('phone_open', { vol: 0.5, vary: 0 }); this.phoneTab(this._tab || 'obj'); document.exitPointerLock?.(); }
    else { this.stopSnake(); }
  }
  phoneTab(tab) {
    this._tab = tab; this.stopSnake();
    document.querySelectorAll('.phone-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const s = $('#phone-screen'), g = this.game; $('#phone-clock').textContent = new Date().toTimeString().slice(0, 5);
    if (tab === 'obj') s.innerHTML = `<h4>CURRENT TASK</h4><div>${g.state.objective || 'Nothing. Enjoy it.'}</div><br><h4>HINT</h4><div>${g.level?.hint?.() || 'Look around. Press USE on anything that glows when you get close.'}</div><br><h4>CHAPTER</h4><div>${g.level?.title || ''}</div>`;
    if (tab === 'msg') s.innerHTML = '<h4>MESSAGES</h4>' + (g.state.messages.length ? [...g.state.messages].reverse().map(m => `<div class="msg"><span class="from">${m.from}:</span> ${m.text}</div>`).join('') : 'No messages.');
    if (tab === 'secrets') s.innerHTML = `<h4>EASTER EGGS ${g.secretCount()}/${g.SECRETS.length}</h4>` + g.SECRETS.map(e => `<div class="eg ${g.save.secrets[e.id] ? '' : 'no'}">${g.save.secrets[e.id] ? '&#9733; ' + e.name : '&#9734; ??? <i>(' + e.where + ')</i>'}</div>`).join('');
    if (tab === 'snake') this.snake(s);
  }
  message(from, text) { this.game.state.messages.push({ from, text }); this.toast('\u260E ' + from + ': ' + text, 4); audio.sfx('phone_msg', { vol: 0.7, vary: 0 }); }
  snake(el) {
    el.innerHTML = '<canvas id="snake-c" width="84" height="48"></canvas><div class="snake-pad"><span></span><button data-d="0,-1">^</button><span></span><button data-d="-1,0">&lt;</button><button data-d="0,1">v</button><button data-d="1,0">&gt;</button></div><div id="snake-s" style="text-align:center">SCORE 0 - HIGH ' + (this.game.save.snake || 0) + '</div>';
    const c = el.querySelector('canvas'), x = c.getContext('2d');
    let sn = [[10, 6], [9, 6], [8, 6]], dir = [1, 0], nd = [1, 0], food = [20, 8], score = 0, dead = false;
    const W = 28, H = 16;
    el.querySelectorAll('.snake-pad button').forEach(b => b.onpointerdown = e => { e.preventDefault(); const d = b.dataset.d.split(',').map(Number); if (d[0] !== -dir[0] || d[1] !== -dir[1]) nd = d; });
    this._snakeKey = e => { const m = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[e.code]; if (m && (m[0] !== -dir[0] || m[1] !== -dir[1])) nd = m; };
    addEventListener('keydown', this._snakeKey);
    const draw = () => { x.fillStyle = '#9fbf7a'; x.fillRect(0, 0, 84, 48); x.fillStyle = '#1d2a12'; sn.forEach(p => x.fillRect(p[0] * 3, p[1] * 3, 3, 3)); x.fillRect(food[0] * 3 + 1, food[1] * 3, 1, 3); x.fillRect(food[0] * 3, food[1] * 3 + 1, 3, 1); };
    this._snakeT = setInterval(() => {
      if (dead) return; dir = nd; const h = [(sn[0][0] + dir[0] + W) % W, (sn[0][1] + dir[1] + H) % H];
      if (sn.some(p => p[0] === h[0] && p[1] === h[1])) { dead = true; audio.sfx('snake_die', { vol: 0.5 }); if (score > (this.game.save.snake || 0)) { this.game.save.snake = score; this.game.persist(); }
        if (score >= 10) this.game.secret('snake10'); setTimeout(() => { if (this._tab === 'snake') this.phoneTab('snake'); }, 1200); return; }
      sn.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score++; audio.sfx('blip', { vol: 0.4 }); food = [Math.floor(Math.random() * W), Math.floor(Math.random() * H)]; el.querySelector('#snake-s').textContent = 'SCORE ' + score + ' - HIGH ' + (this.game.save.snake || 0); } else sn.pop();
      draw();
    }, 130); draw();
  }
  stopSnake() { clearInterval(this._snakeT); if (this._snakeKey) removeEventListener('keydown', this._snakeKey); this._snakeKey = null; }
  // ---------------------------------------------------------- menus
  menu(sel, items) {
    const m = $(sel); m.innerHTML = '';
    for (const it of items) { if (!it) continue; const b = document.createElement('button'); b.textContent = it.label; b.disabled = !!it.disabled; b.onclick = () => { audio.unlock(); audio.sfx('ui_click', { vol: 0.5, vary: 0 }); it.fn(); }; m.appendChild(b); }
    setTimeout(() => !this.game.touch && m.querySelector('button:not(:disabled)')?.focus(), 50);
  }
  settings(back) {
    this._settingsBack = back; const s = this.game.settings; const body = $('#settings-body'); body.innerHTML = '';
    const row = (label, el) => { const r = document.createElement('div'); r.className = 'set-row'; r.innerHTML = `<span>${label}</span>`; r.appendChild(el); body.appendChild(r); };
    const slider = (k, fn) => { const i = document.createElement('input'); i.type = 'range'; i.min = 0; i.max = 1; i.step = 0.05; i.value = s[k]; i.oninput = () => { s[k] = +i.value; fn && fn(); }; return i; };
    const seg = (k, opts, fn) => { const d = document.createElement('div'); d.className = 'seg'; for (const [v, l] of opts) { const b = document.createElement('button'); b.textContent = l; b.classList.toggle('on', s[k] === v);
      b.onclick = () => { s[k] = v; d.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn && fn(); }; d.appendChild(b); } return d; };
    const vol = () => { Object.assign(audio.settings, { master: s.master, music: s.music, sfx: s.sfx, voice: s.voice }); audio.apply(); };
    row('Master volume', slider('master', vol)); row('Music', slider('music', vol)); row('Sound effects', slider('sfx', vol)); row('Voices', slider('voice', vol));
    row('Subtitles', seg('subs', [[true, 'On'], [false, 'Off']])); row('Subtitle size', seg('bigsubs', [[false, 'Normal'], [true, 'Large']], () => document.body.classList.toggle('bigsubs', s.bigsubs)));
    row('Graphics quality', seg('quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], () => this.game.world.setQuality(s.quality)));
    const sens = document.createElement('input'); sens.type = 'range'; sens.min = 0.3; sens.max = 2.5; sens.step = 0.1; sens.value = s.sens; sens.oninput = () => s.sens = +sens.value; row('Look sensitivity', sens);
    row('Invert look Y', seg('invertY', [[false, 'Off'], [true, 'On']]));
    row('Show FPS', seg('fps', [[false, 'Off'], [true, 'On']]));
    this.show('#settings', true);
  }
  panel(title, html, back) { this._panelBack = back; $('#panel-title').textContent = title; $('#panel-body').innerHTML = html; this.show('#panel', true); }
  caught(title, text, retry) {
    $('#caught-title').textContent = title; $('#caught-text').textContent = text; this.show('#caught', true); document.exitPointerLock?.();
    $('#caught-retry').onclick = () => { this.show('#caught', false); retry(); };
  }
  credits(lines, done) {
    const c = $('#credits'), r = $('#credits-roll'); r.innerHTML = lines; c.classList.remove('hidden');
    let y = innerHeight; const h = r.scrollHeight; let last = performance.now(); let fast = false;
    const step = now => { const dt = (now - last) / 1000; last = now; y -= dt * (fast ? 240 : 46); r.style.transform = `translateY(${y - innerHeight}px)`;
      if (y < -h - 40) { c.classList.add('hidden'); done && done(); return; } this._cr = requestAnimationFrame(step); };
    c.onpointerdown = () => fast = true; c.onpointerup = () => fast = false;
    this._cr = requestAnimationFrame(step);
  }
}
