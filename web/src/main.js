// Steve The PC Repair Man - game bootstrap, loop, state, saves, interactions, level management.
import * as THREE from 'three';
import { World } from './engine/world.js';
import { Physics, initPhysics } from './engine/physics.js';
import { loadAll, MODEL_LIST } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { input, initInput, initTouch, consume, clearPressed, pollGamepad, held } from './engine/input.js';
import { UI } from './engine/ui.js';
import { Cutscene } from './engine/cutscene.js';
import { FX } from './engine/fx.js';
import { Player } from './engine/player.js';
import dialogue from './data/dialogue.json';
import vo from './data/vo.json';
import { LEVELS, CHAPTERS } from './levels/index.js';
import { SFX_LIST } from './data/sfxlist.js';
import { Audit } from './engine/audit.js';

const VERSION = '1.0.0';
const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export const SECRETS = [
  { id: 'duck', name: 'Rubber Duck Debugging', where: 'Shop' }, { id: 'turbo', name: 'Turbo Mode', where: 'Shop' },
  { id: 'golden', name: 'The Golden CR2032', where: 'Shop' }, { id: 'y2k', name: 'Y2K Survival Kit', where: 'Shop' },
  { id: 'wall', name: 'The Other Workbench', where: 'Shop' }, { id: 'photo', name: 'Berlin, 1962', where: 'Shop' },
  { id: 'catpet', name: 'Cache Hit (pet the cat 5 times)', where: 'Shop' }, { id: 'snake10', name: 'Snake Charmer (score 10)', where: 'Phone' },
  { id: 'bsod', name: 'Fatal Exception 0E', where: 'Shop' }, { id: 'bios', name: 'Punctual (exact date in BIOS)', where: 'Shop' },
  { id: 'knock', name: 'Knock Knock (cockpit)', where: 'Plane' }, { id: 'nuts', name: 'Warm Nuts', where: 'Plane' },
  { id: 'snowman', name: 'Frosty the CRT', where: 'Chalet' }, { id: 'minesweeper', name: 'Minesweeper Expert', where: 'Chalet' },
  { id: 'luggage', name: 'Same Combination As My Luggage', where: 'Chalet' }, { id: 'teapot', name: 'Error 418', where: 'Vault' },
  { id: 'kernel', name: 'Kernel the Server Cat', where: 'Vault' }, { id: 'cables', name: 'Cable Management Award', where: 'Vault' },
  { id: 'ghost', name: 'Ghost (no alarms in the Chalet)', where: 'Chalet' }, { id: 'floppies', name: 'Floppy Collector (all 5 floppies)', where: 'Everywhere' },
  { id: 'konami', name: 'Up Up Down Down...', where: 'Title screen' }, { id: 'credits', name: 'Watched The Credits', where: 'Ending' },
];

class Game {
  constructor() {
    this.SECRETS = SECRETS; this.dialogue = dialogue; this.vo = vo; this.touch = isTouch; this.actors = []; this.guards = []; this.cams = [];
    this.interactables = []; this.paused = { menu: false, phone: false, mini: false, any() { return this.menu || this.phone || this.mini; } };
    this.state = { playing: false, messages: [], objective: '' }; this.stats = {}; this.time = 0; this.susMax = 0; this.susAlert = false;
    this.settings = Object.assign({ master: 0.9, music: 0.55, sfx: 0.85, voice: 1, subs: true, bigsubs: false, quality: isTouch ? 'medium' : 'high', sens: 1, invertY: false, fps: false }, JSON.parse(localStorage.getItem('steve_settings') || '{}'));
    this.save = Object.assign({ unlocked: 1, secrets: {}, snake: 0, floppies: {} }, JSON.parse(localStorage.getItem('steve_save') || '{}'));
    document.body.classList.toggle('bigsubs', this.settings.bigsubs);
  }
  persist() { localStorage.setItem('steve_save', JSON.stringify(this.save)); }
  saveSettings() { localStorage.setItem('steve_settings', JSON.stringify(this.settings)); }
  async boot() {
    const canvas = $('#c');
    const bootLines = ['STEVE-BIOS v4.51  (C) Steve\'s PC Repair', 'CPU: Pentium(r) MMX 233MHz ... OK', 'Memory Test: 65536K OK', 'Detecting IDE drives ... SPYWARE-FREE', 'Loading Blender-made models ...'];
    let bi = 0; const bootT = setInterval(() => { if (bi < bootLines.length) $('#boot').textContent += bootLines[bi++] + '\n'; }, 280);
    const prog = (p, n) => { $('#loadfill').style.width = Math.round(p * 100) + '%'; $('#loadtxt').textContent = `Loading ${n || ''} ${Math.round(p * 100)}%`; };
    const qq = new URLSearchParams(location.search).get('q'); if (qq) this.settings.quality = qq;
    this.world = new World(canvas, this.settings.quality);
    await initPhysics(); prog(0.05, 'physics');
    Object.assign(audio.settings, { master: this.settings.master, music: this.settings.music, sfx: this.settings.sfx, voice: this.settings.voice });
    await loadAll(MODEL_LIST, (p, n) => prog(0.05 + p * 0.8, n));
    // audio needs a context; create (suspended) and decode SFX now
    audio.init(); let sd = 0;
    await Promise.all(SFX_LIST.map(n => audio.load('sfx/' + n + '.mp3').then(() => prog(0.85 + (++sd / SFX_LIST.length) * 0.13, 'sounds'))));
    audio.load('music/title.mp3');
    clearInterval(bootT); $('#boot').textContent = bootLines.join('\n') + '\nAll systems nominal. Cat fed.';
    prog(1, 'done');
    this.ui = new UI(this); this.cutscene = new Cutscene(this); this.fx = new FX(this);
    initInput(canvas, e => this.onKey(e)); if (this.touch) initTouch($('#touch'));
    $('#ver').textContent = 'v' + VERSION;
    this.secrets();
    $('#loadtxt').textContent = 'Ready.'; const sb = $('#startbtn'); sb.textContent = this.touch ? 'TAP TO START' : 'CLICK TO START'; sb.classList.remove('hidden');
    await new Promise(r => sb.onclick = r);
    audio.unlock(); audio.sfx('ui_click', { vol: 0.5 });
    if (this.touch) { try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch (e) {} this.checkRotate(); addEventListener('resize', () => this.checkRotate()); }
    $('#loading').classList.add('hidden');
    this.last = performance.now(); requestAnimationFrame(t => this.loop(t));
    const q = new URLSearchParams(location.search);
    if (q.get('dtcap')) this.dtCap = +q.get('dtcap');
    if (q.get('win')) this.debugWin = +q.get('win');
    if (q.has('noauto')) this.autoQ = false;
    if (q.get('level')) { this.startLevel(q.get('level'), q.get('cp') || null); return; }
    this.title();
  }
  checkRotate() { const portrait = innerHeight > innerWidth * 1.1; $('#rotate').classList.toggle('hidden', !portrait || this.rotateOk); $('#rotate-ok').onclick = () => { this.rotateOk = true; $('#rotate').classList.add('hidden'); }; }
  requestLock() { if (this.touch) return; input.wantLock = true; const c = $('#c'); if (document.pointerLockElement !== c) { try { const p = c.requestPointerLock?.(); p && p.catch && p.catch(() => {}); } catch (e) {} } }
  // ------------------------------------------------------------------ menus
  async title() {
    this.state.playing = false; this.ui.hud(false); audio.music('title');
    await this.loadLevel('title');
    this.ui.fade(0, 1.5);
    const cont = this.save.unlocked > 1 || this.save.cp;
    this.ui.menu('#title-menu', [
      cont && { label: 'Continue: ' + CHAPTERS[Math.min(this.save.unlocked, CHAPTERS.length) - 1].title, fn: () => this.newGame(CHAPTERS[Math.min(this.save.unlocked, CHAPTERS.length) - 1].id) },
      { label: cont ? 'New Game' : 'Start the Job', fn: () => this.newGame('shop') },
      { label: 'Chapter Select', fn: () => this.chapterSelect() },
      { label: 'Easter Eggs  ' + this.secretCount() + '/' + SECRETS.length, fn: () => this.eggPanel(() => this.ui.show('#title', true)) },
      { label: 'Settings', fn: () => { this.ui.show('#title', false); this.ui.settings(() => this.ui.show('#title', true)); } },
      { label: 'How to Play', fn: () => this.howTo(() => this.ui.show('#title', true)) },
    ]);
    this.ui.show('#title', true); this.konami = [];
  }
  chapterSelect() {
    this.ui.show('#title', false);
    const html = CHAPTERS.map((c, i) => `<div class="set-row"><span><b>${i + 1}. ${c.title}</b><br><small style="color:#9ab">${c.blurb}</small></span><button class="chbtn" data-ch="${c.id}" ${i + 1 > this.save.unlocked ? 'disabled' : ''} style="padding:8px 14px;border-radius:6px;border:1px solid #456;background:${i + 1 > this.save.unlocked ? '#222' : '#ffd84a'};color:#111;font-weight:800">${i + 1 > this.save.unlocked ? 'LOCKED' : 'PLAY'}</button></div>`).join('');
    this.ui.panel('CHAPTERS', html, () => this.ui.show('#title', true));
    document.querySelectorAll('.chbtn').forEach(b => b.onclick = () => { this.ui.show('#panel', false); this.newGame(b.dataset.ch); });
  }
  eggPanel(back) {
    this.ui.show('#title', false); this.ui.show('#pause', false);
    this.ui.panel('EASTER EGGS ' + this.secretCount() + '/' + SECRETS.length, SECRETS.map(s => `<div class="egg-row ${this.save.secrets[s.id] ? '' : 'no'}"><span class="st">${this.save.secrets[s.id] ? '\u2605' : '\u2606'}</span><span>${this.save.secrets[s.id] ? s.name : '???'} <small style="color:#789">- ${s.where}</small></span></div>`).join(''), back);
  }
  howTo(back) {
    this.ui.show('#title', false); this.ui.show('#pause', false);
    this.ui.panel('HOW TO PLAY', `<div class="set-row"><b>Desktop</b><span style="text-align:right">WASD move &middot; Mouse look (click to lock) &middot; Shift run &middot; C sneak &middot; Space jump<br>E use / pick up / drop &middot; F or click throw &middot; Q zap &middot; R compressed air<br>Tab phone &middot; Esc pause &middot; hold X skip cutscene &middot; Enter/click next line</span></div>
      <div class="set-row"><b>Touch</b><span style="text-align:right">Left side: joystick (push to the edge to run)<br>Right side: drag to look &middot; buttons USE, JUMP, SNEAK, THROW, ZAP, AIR<br>&#9742; phone &middot; II pause &middot; tap to advance dialogue &middot; SKIP button</span></div>
      <div class="set-row"><b>Gamepad</b><span style="text-align:right">Sticks move/look &middot; X use &middot; A jump &middot; B sneak &middot; RB zap &middot; LB air &middot; RT throw &middot; Y phone</span></div>
      <div class="set-row"><b>Tips</b><span style="text-align:right">Things you can use glow and show a prompt. Sneak to stay quiet and shorten guards' sight. Throw objects to distract guards. Zap guards from behind. Spray cameras with compressed air to frost their lenses. Your phone has hints, messages, your easter egg list, and Snake.</span></div>`, back);
  }
  newGame(ch) { this.ui.show('#title', false); this.state.messages = []; this.stats = {}; this.startLevel(ch, null); }
  pause(on) {
    if (on === undefined) on = !this.paused.menu; if (!this.state.playing && on) return;
    this.paused.menu = on; this.ui.show('#pause', on);
    if (on) {
      document.exitPointerLock?.(); audio.ctx?.suspend?.();
      this.ui.menu('#pause-menu', [
        { label: 'Resume', fn: () => this.pause(false) },
        { label: 'Restart from checkpoint', fn: () => { this.pause(false); this.startLevel(this.levelName, this.checkpoint); } },
        { label: 'Easter Eggs ' + this.secretCount() + '/' + SECRETS.length, fn: () => this.eggPanel(() => this.ui.show('#pause', true)) },
        { label: 'Settings', fn: () => { this.ui.show('#pause', false); this.ui.settings(() => this.ui.show('#pause', true)); } },
        { label: 'How to Play', fn: () => this.howTo(() => this.ui.show('#pause', true)) },
        { label: 'Quit to title', fn: () => { this.pause(false); this.ui.fade(1, 0.5).then(() => this.title()); } },
      ]);
    } else { audio.ctx?.resume?.(); if (!this.touch && this.state.playing && !this.cutscene.active) this.requestLock(); }
  }
  onKey(e) {
    if (!this.state.playing && !$('#title').classList.contains('hidden')) {
      const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
      this.konami = (this.konami || []).concat(e.code).slice(-10);
      if (this.konami.join() === seq.join()) { this.secret('konami'); this.bigHeads = !this.bigHeads; this.ui.toast(this.bigHeads ? 'BIG HEAD MODE ON' : 'BIG HEAD MODE OFF', 2.5); }
    }
  }
  // ------------------------------------------------------------------ levels
  async loadLevel(name, cp = null) {
    if (this.level) { this.level.dispose(); }
    this.cutscene.active = false; this.fx.clear();
    this.world.clear(); this.interactables = []; this.actors = []; this.guards = []; this.cams = []; this.player = null;
    if (this.physics) this.physics.dispose();
    this.physics = new Physics(); this.physics.onImpact = (d, f) => this.onImpact(d, f);
    const L = LEVELS[name]; this.level = new L(this); this.levelName = name; this.checkpoint = cp;
    this.world.scene.add(this.level.root);
    await this.level.build(cp);
    if (this.bigHeads) for (const a of this.actors) { const h = a.headBone; if (h) h.scale.setScalar(1.8); }
    return this.level;
  }
  async startLevel(name, cp) {
    await this.ui.fade(1, 0.4); this.ui.show('#title', false); this.ui.hud(false); this.ui.prompt(null); this.ui.subtitle(null); this.ui.detect(0, false); this.ui.timer(null);
    this.state.playing = false;
    await this.loadLevel(name, cp);
    this.state.playing = true; this.ui.hud(true);
    const idx = CHAPTERS.findIndex(c => c.id === name); if (idx >= 0) { this.save.unlocked = Math.max(this.save.unlocked, idx + 1); this.persist(); }
    if (!this.touch) input.wantLock = true;
    await this.level.start(cp);
  }
  setCheckpoint(cp) { this.checkpoint = cp; this.ui.toast('Checkpoint', 1.4); }
  makePlayer() { this.player = new Player(this); this.level.add(this.player.root); return this.player; }
  // ------------------------------------------------------------------ gameplay services
  interact(o) { o.enabled = o.enabled ?? true; this.interactables.push(o); return o; }
  secretCount() { return SECRETS.filter(s => this.save.secrets[s.id]).length; }
  secrets() { this.ui?.secrets(this.secretCount(), SECRETS.length); }
  secret(id) {
    if (this.save.secrets[id]) return false; const s = SECRETS.find(x => x.id === id); if (!s) return false;
    this.save.secrets[id] = Date.now(); this.persist(); this.secrets();
    this.ui.toast('\u2605 EASTER EGG: ' + s.name + '  (' + this.secretCount() + '/' + SECRETS.length + ')', 3.5, 'secret'); audio.sfx('secret', { vol: 0.8, vary: 0 });
    if (this.player) this.fx.sparkle(this.player.pos.clone().add(new THREE.Vector3(0, 1.8, 0)));
    return true;
  }
  floppy(id) {
    if (!this.save.floppies[id]) { this.save.floppies[id] = 1; this.persist(); }
    const n = Object.keys(this.save.floppies).length; this.ui.toast('Floppy disk ' + n + '/5 collected', 2.2); audio.sfx('pickup', { vol: 0.7 });
    if (n >= 5) this.secret('floppies');
  }
  noise(pos, radius, kind) { for (const g of this.guards) g.hear(pos, radius); this.level?.onNoise?.(pos, radius, kind); }
  reportSus(v, alert) { this.susMax = Math.max(this.susMax, v); if (alert) this.susAlert = true; }
  bark(id, actor = null, opts = {}) {
    const line = this.dialogue.lines[id]; if (!line) return Promise.resolve();
    if (this.barking && !opts.force) { if (opts.queue === false) return Promise.resolve(); }
    this.barking = id; this.ui.subtitle(this.dialogue.names[line.who], line.text, this.dialogue.colors[line.who]);
    if (actor) actor.speaking = true;
    return audio.voice(id).then(() => { if (actor) actor.speaking = false; if (this.barking === id) { this.barking = null; if (!this.cutscene.active) this.ui.subtitle(null); } });
  }
  caught(by) {
    if (this.caughtNow) return; this.caughtNow = true; audio.sfx('caught', { vol: 0.9, vary: 0 }); this.player.enabled = false;
    if (by && by.actor) by.actor.play('point', 0.2);
    this.player.actor.play('handsup', 0.2); this.player.override = true;
    const lines = ['Steve has been politely escorted off the premises. Then less politely.', 'Have you tried not being seen? Turning it off and on again works for stealth too.', 'Error 403: Steve is forbidden here.', 'The guard seems pleased. He will tell his mother about this.'];
    setTimeout(() => this.ui.caught('CAUGHT!', lines[(this.stats.caught = (this.stats.caught || 0) + 1) % lines.length], () => { this.caughtNow = false; this.startLevel(this.levelName, this.checkpoint); }), 1200);
    this.level.onCaught && this.level.onCaught();
  }
  onImpact(d, f) {
    const p = d.body.translation(); const pos = new THREE.Vector3(p.x, p.y, p.z); const s = d.opts.sound || 'thud';
    audio.sfx(s, { pos, vol: Math.min(1, 0.25 + f / 120), ref: 4 });
    if (d.thrown && f > 15) { this.noise(pos, d.opts.noiseRadius || 9, 'impact'); d.thrown = false; }
  }
  onZap(pos, fwd) {
    if (this.level?.onZap && this.level.onZap(pos, fwd)) return;
    let best = null, bd = 1.6;
    for (const g of this.guards) { if (g.state === 'down') continue; const to = g.pos.clone().sub(pos); to.y = 0; const d = to.length(); if (d < bd && to.normalize().dot(fwd) > 0.2) { best = g; bd = d; } }
    if (!best) return;
    const gf = new THREE.Vector3(Math.sin(best.actor.yaw), 0, Math.cos(best.actor.yaw)); const toMe = pos.clone().sub(best.pos).setY(0).normalize();
    const facing = gf.dot(toMe) > 0.35 && best.state !== 'stunned';
    if (facing && best.state === 'alert') { this.ui.toast('He sees it coming! Zap from behind, or chill him with compressed air first.', 2.5); best.sus = 1; return; }
    if (best.zap()) { this.fx.zap(best.pos.clone().setY(best.pos.y + 1.2)); audio.sfx('stun', { pos: best.pos, vol: 0.8 }); this.noise(best.pos, 4, 'zap'); this.level?.onGuardDown?.(best); }
  }
  onDuster(pos, dir) {
    if (this.level?.onDuster) this.level.onDuster(pos, dir);
    for (const c of this.cams) { if (c.frost > 0) continue; const to = c.worldPos().sub(pos.clone().setY(pos.y + 1.4)); const d = to.length(); if (d < 8 && to.normalize().dot(dir) > 0.82) { c.frostIt(); if (!this._frostSaid) { this._frostSaid = true; this.bark('cam_frost', this.player.actor); } } }
    for (const g of this.guards) { if (g.state === 'down') continue; const to = g.pos.clone().sub(pos); const d = to.length(); if (d < 4.5 && to.setY(0).normalize().dot(dir) > 0.7) { g.chill(); this.fx.puff(g.pos.clone().setY(g.pos.y + 1.5), 8, 0xddeeff); } }
  }
  locked() { return !this.state.playing || this.cutscene.active || this.paused.any() || this.caughtNow; }
  // ------------------------------------------------------------------ main loop
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    let dt = Math.min(this.dtCap || 0.05, (now - this.last) / 1000); this.last = now;
    pollGamepad();
    if (consume('pause')) { if (this.paused.phone) this.ui.phone(false); else if (this.paused.mini) {} else if (!this.cutscene.active && this.state.playing) this.pause(); }
    if (consume('phone') && this.state.playing && !this.cutscene.active && !this.paused.menu && !this.paused.mini) this.ui.phone();
    const frozen = this.paused.menu || this.paused.mini || this.paused.phone;
    if (!frozen) {
      this.time += dt;
      this.susMax = 0; this.susAlert = false;
      this.physics?.step(dt, this.time);
      this.player?.update(dt);
      for (const a of this.actors) if (!this.player || a !== this.player.actor) a.update(dt);
      for (const g of this.guards) g.update(dt);
      for (const c of this.cams) c.update(dt);
      this.cutscene.update(dt);
      this.level?.update(dt);
      this.fx.update(dt);
      if (this.state.playing) this.updateInteract();
      if (this.state.playing && this.player) { this.ui.detect(this.susMax, this.susAlert); this.ui.gadgets(this.player.gadgets, this.player.cool); document.body.classList.toggle('holding', !!this.player.held); }
    } else clearPressed();
    this.world.render(dt);
    if (this.settings.fps) { this._fpsEl = this._fpsEl || Object.assign(document.body.appendChild(document.createElement('div')), { style: 'position:fixed;left:4px;bottom:4px;font:11px monospace;color:#0f0;z-index:99' }); this._fpsEl.textContent = Math.round(this.world.fps) + ' fps ' + this.world.quality; }
    if (this.autoQ !== false && this.world.fps < 28 && this.time > 6 && this.world.quality !== 'low' && this.state.playing) { this.autoQ = false; const q = this.world.quality === 'high' ? 'medium' : 'low'; this.world.setQuality(q); this.settings.quality = q; this.ui.toast('Graphics quality lowered to ' + q + ' for smoother play', 2.5); }
  }
  // test helper: trigger an available interaction by label regex
  dbgUse(re) {
    const r = new RegExp(re, 'i');
    for (const it of this.interactables) { if (!it.enabled || (it.cond && !it.cond())) continue; const l = typeof it.label === 'function' ? it.label() : it.label; if (l && r.test(l)) { if (it.once) it.enabled = false; it.fn(); return l; } }
    return null;
  }
  dbgLabels() { return this.interactables.filter(it => it.enabled && (!it.cond || it.cond())).map(it => typeof it.label === 'function' ? it.label() : it.label); }
  updateInteract() {
    const pl = this.player; if (!pl || this.locked()) { this.ui.prompt(null); return; }
    let best = null, bs = 1e9; const f = pl.forward(new THREE.Vector3()); const cf = new THREE.Vector3(); this.world.camera.getWorldDirection(cf); cf.y = 0; cf.normalize();
    for (const it of this.interactables) {
      if (!it.enabled || (it.cond && !it.cond())) continue;
      const p = typeof it.pos === 'function' ? it.pos() : it.pos; if (!p) continue;
      if (typeof it.label === 'function' && !it.label()) continue;
      const dx = p.x - pl.pos.x, dz = p.z - pl.pos.z, dy = p.y - (pl.pos.y + 1); const d = Math.hypot(dx, dz);
      if (d > (it.r || 1.3) || Math.abs(dy) > (it.dy || 1.4)) continue;
      const dir = new THREE.Vector3(dx, 0, dz).normalize(); const facing = Math.max(f.dot(dir), cf.dot(dir));
      if (d > 0.5 && facing < -0.2) continue;
      const sc = d - facing * 0.5 - (it.priority || 0); if (sc < bs) { bs = sc; best = it; }
    }
    // pickables
    if (!pl.held) for (const d of this.physics.dyn) {
      if (!d.opts.pick) continue; const p = d.body.translation(); const dd = Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z);
      if (dd < 1.15 && Math.abs(p.y - pl.pos.y - 0.8) < 1.2) { const sc = dd + 0.4; if (sc < bs) { bs = sc; best = { label: 'Pick up ' + (d.opts.label || 'object'), fn: () => pl.pickup(d), _pick: true }; } }
    }
    if (pl.held && !best) best = { label: 'Drop ' + (pl.held.opts.label || ''), fn: () => pl.drop(), _drop: true };
    const label = best ? (typeof best.label === 'function' ? best.label() : best.label) : null;
    this.curInteract = best; this.curLabel = label;
    this.ui.prompt(label, this.touch ? '' : 'E');
    if (best && consume('use')) { if (best.once) best.enabled = false; audio.sfx('ui_use', { vol: 0.3, vary: 0 }); best.fn(); }
  }
}

const game = new Game(); window.__game = game; window.__audit = new Audit(game);
game.boot().catch(e => { console.error(e); $('#loadtxt').textContent = 'Error: ' + e.message; });
