// Cinematic sequencer: camera shots with easing, letterbox, depth of field, voiced subtitled dialogue, skipping.
import * as THREE from 'three';
import { audio } from './audio.js';
import { input, consume, held } from './input.js';
const ease = { lin: t => t, io: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t };
const V = a => a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(...a);

export class Cutscene {
  constructor(game) {
    this.game = game; this.active = false; this.skipping = false; this.time = 0; this.waits = []; this.cam = null; this.tw = null; this.holdSkip = 0;
    this.lineSkip = false; this.freeLook = false;
    const sb = document.querySelector('#skipbtn');
    sb.addEventListener('click', e => { e.stopPropagation(); if (this.active && this.skippable) this.skip(); });
    addEventListener('pointerdown', e => { if (this.active && e.target.id !== 'skipbtn' && !this.game.paused.any()) this.lineSkip = true; });
  }
  async run(fn, opts = {}) {
    const g = this.game;
    this.active = true; this.skipping = false; this.skippable = opts.skippable !== false; this.time = 0; this.freeLook = false;
    g.ui.cine(opts.letterbox !== false); g.ui.prompt(null); g.ui.show('#skip', this.skippable); g.ui.show('#skipbtn', this.skippable && g.touch);
    document.exitPointerLock?.();
    this.cam = { pos: g.world.camera.position.clone(), look: new THREE.Vector3(), fov: g.world.camera.fov };
    g.world.camera.getWorldDirection(this.cam.look); this.cam.look.multiplyScalar(5).add(this.cam.pos);
    try { await fn(this); } catch (e) { console.error('cutscene error', e); }
    this.active = false; this.tw = null; this.skipping = false; g.ui.cine(false); g.ui.subtitle(null); g.world.dof(false);
    g.ui.show('#skip', false); g.ui.show('#skipbtn', false);
    for (const a of g.actors) a.speaking = false;
    if (g.player) { g.player.snapCam = true; g.player.camYaw = opts.endYaw ?? g.player.yaw + Math.PI; g.player.camPitch = 0.25; }
    input.look.x = input.look.y = 0; this.waits = [];
    if (!g.touch && g.state.playing) g.requestLock();
  }
  skip() { if (this.skipping) return; this.skipping = true; audio.stopVoice(); for (const w of this.waits) w.res(); this.waits = []; this.game.ui.subtitle(null); this.holdSkip = 0; }
  update(dt) {
    if (!this.active) return;
    this.time += dt;
    for (const w of [...this.waits]) if (this.time >= w.t) { w.res(); this.waits.splice(this.waits.indexOf(w), 1); }
    // hold-to-skip on keyboard
    if (this.skippable && (held('skip') || held('pause'))) { this.holdSkip += dt; if (this.holdSkip > 0.7) this.skip(); } else this.holdSkip = Math.max(0, this.holdSkip - dt * 2);
    document.querySelector('#skipbar').style.setProperty('--s', Math.min(100, this.holdSkip / 0.7 * 100) + '%');
    if (consume('confirm') || consume('use') || consume('jump')) this.lineSkip = true;
    // camera tween
    const cam = this.game.world.camera;
    if (this.tw) {
      const w = this.tw; w.t += dt; const k = w.ease(Math.min(1, w.t / w.dur));
      this.cam.pos.lerpVectors(w.p0, w.p1, k); this.cam.look.lerpVectors(w.l0, w.l1, k); this.cam.fov = w.f0 + (w.f1 - w.f0) * k;
      if (w.orbit) { const a = w.orbit.a0 + (w.orbit.a1 - w.orbit.a0) * k; this.cam.pos.set(w.orbit.c.x + Math.sin(a) * w.orbit.r, w.orbit.c.y + w.orbit.h, w.orbit.c.z + Math.cos(a) * w.orbit.r); }
      if (w.track) { this.cam.look.copy(w.track.isObject3D ? w.track.getWorldPosition(new THREE.Vector3()) : w.track).add(w.trackOff || new THREE.Vector3()); }
      if (w.t >= w.dur) { this.tw = null; w.res && w.res(); }
    }
    if (!this.freeLook) {
      cam.position.copy(this.cam.pos);
      if (this.shakeAmt) { cam.position.x += (Math.random() - 0.5) * this.shakeAmt; cam.position.y += (Math.random() - 0.5) * this.shakeAmt; this.shakeAmt *= 0.92; }
      cam.lookAt(this.cam.look); cam.fov = this.cam.fov; cam.updateProjectionMatrix();
      if (this.dofOn) this.game.world.dof(true, cam.position.distanceTo(this.focusPt || this.cam.look), this.aperture);
      audio.listener.copy(cam.position);
    }
  }
  wait(s) { if (this.skipping || s <= 0) return Promise.resolve(); return new Promise(res => this.waits.push({ t: this.time + s, res })); }
  cut(pos, look, fov = 40) { this.tw = null; this.cam.pos.copy(V(pos)); this.cam.look.copy(V(look)); this.cam.fov = fov; }
  shot(o) {
    if (o.pos) this.cut(o.pos, o.look, o.fov ?? 40);
    if (o.dof !== undefined) { this.dofOn = !!o.dof; this.aperture = typeof o.dof === 'number' ? o.dof : 0.0025; this.focusPt = o.focus ? V(o.focus) : null; if (!o.dof) this.game.world.dof(false); }
    if (!o.to && !o.orbit && !o.track) return Promise.resolve();
    const to = o.to || {};
    return new Promise(res => {
      this.tw = { t: 0, dur: o.dur || 3, ease: ease[o.ease || 'io'], p0: this.cam.pos.clone(), p1: to.pos ? V(to.pos) : this.cam.pos.clone(), l0: this.cam.look.clone(), l1: to.look ? V(to.look) : this.cam.look.clone(),
        f0: this.cam.fov, f1: to.fov ?? this.cam.fov, res, track: o.track, trackOff: o.trackOff ? V(o.trackOff) : null,
        orbit: o.orbit ? { c: V(o.orbit.c), r: o.orbit.r, h: o.orbit.h, a0: o.orbit.a0, a1: o.orbit.a1 } : null };
      if (this.skipping) { this.tw.t = this.tw.dur; this.update(0); }
      if (o.nowait) res();
    });
  }
  shake(a = 0.15) { this.shakeAmt = a; }
  async say(id, actor = null, o = {}) {
    const g = this.game; if (this.skipping) return;
    const line = g.dialogue.lines[id]; if (!line) { console.warn('no line', id); return; }
    this.lineSkip = false;
    if (actor) { actor.speaking = true; if (o.anim !== false) actor.play(o.anim || 'talk', 0.3); }
    g.ui.subtitle(g.dialogue.names[line.who], line.text, g.dialogue.colors[line.who]);
    const dur = g.vo[id] || 2.5;
    let done = false;
    const vp = audio.voice(id).then(() => done = true);
    const start = this.time;
    while (!done && !this.skipping && !this.lineSkip) { await this.wait(0.05); if (this.time - start > dur + 1.5) break; }
    if (this.lineSkip || this.skipping) audio.stopVoice();
    this.lineSkip = false;
    if (actor) { actor.speaking = false; if (o.anim !== false && actor.curName === (o.anim || 'talk')) actor.play(o.after || 'idle', 0.4); }
    g.ui.subtitle(null);
    await this.wait(o.gap ?? 0.18);
  }
  walk(actor, pts, o = {}) {
    if (this.skipping) { const last = pts[pts.length - 1]; actor.place(last[0], last[1] ?? actor.root.position.y, last[2], o.endYaw ?? actor.yaw); actor.play(o.endAnim || 'idle', 0); return Promise.resolve(); }
    const p = actor.walkTo(pts, o);
    return Promise.race([p, new Promise(res => { const chk = () => { if (this.skipping) { actor.walking = null; const last = pts[pts.length - 1]; actor.place(last[0], last[1] ?? actor.root.position.y, last[2], o.endYaw ?? actor.yaw); actor.play(o.endAnim || 'idle', 0); res(); } else if (actor.walking) setTimeout(chk, 50); else res(); }; chk(); })]);
  }
  fade(to, d = 0.6) { return this.skipping ? this.game.ui.fade(to, 0.05) : this.game.ui.fade(to, d); }
}
