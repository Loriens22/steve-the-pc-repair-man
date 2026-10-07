// Stealth AI: patrolling guards with vision cones + flashlights, noise investigation, chase, non-lethal takedowns; security cameras.
import * as THREE from 'three';
import { Actor } from './actor.js';
import { audio } from './audio.js';
import { find } from './assets.js';
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

function coneMesh(range, angle, color = 0xfff2c0, opacity = 0.09) {
  const r = Math.tan(angle / 2) * range;
  const g = new THREE.ConeGeometry(r, range, 24, 1, true); g.translate(0, -range / 2, 0); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5; return mesh;
}

export class Guard {
  constructor(game, o) {
    this.game = game; this.o = o;
    this.actor = new Actor(game, o.model || 'guard', { name: o.voice || 'guard1', scale: o.scale || 1, speed: 1.3 });
    this.actor.place(o.pos[0], o.pos[1], o.pos[2], o.yaw || 0); game.level.add(this.actor.root);
    this.patrol = (o.patrol || []).map(p => ({ p: new THREE.Vector3(p[0], p[1], p[2]), wait: p[3] || 0, yaw: p[4] })); this.pi = 0; this.waitT = o.patrol ? 0 : 1e9;
    this.state = 'patrol'; this.sus = 0; this.fov = (o.fov || 75) * Math.PI / 180; this.range = o.range || 9; this.lostT = 0; this.target = new THREE.Vector3();
    this.voice = o.voice || 'guard1'; this.barkT = 0; this.home = new THREE.Vector3(...o.pos); this.homeYaw = o.yaw || 0;
    this.cone = coneMesh(this.range, this.fov, o.night ? 0xfff2c0 : 0xffffff, o.night ? 0.11 : 0.05);
    this.cone.position.set(0, 1.45, 0.2); this.actor.root.add(this.cone);
    if (o.night && game.world.quality !== 'low') {
      const sl = new THREE.SpotLight(0xfff0d0, 9, this.range * 1.3, this.fov / 2, 0.5, 1.2); sl.position.set(0.2, 1.4, 0.3); sl.target.position.set(0, 0.2, this.range);
      this.actor.root.add(sl, sl.target); this.spot = sl;
    }
    this.icon = null; this.idleAnim = o.night ? 'flashidle' : 'idle'; this.walkAnim = o.night ? 'flashwalk' : 'walk';
    if (o.anim) { this.actor.play(o.anim); this.idleAnim = o.anim; }
    this.zzzT = 0;
    this.L = o.lines || (this.voice === 'guard1' ? { hm: 'g_hm', wind: 'g_wind', see: 'g_see' } : { hm: 'g_hm2', wind: 'g_wind2', see: 'g_see2' });
  }
  get pos() { return this.actor.root.position; }
  canSee(pt, rangeMul = 1) {
    const hp = _v.copy(this.pos); hp.y += 1.55;
    _v2.subVectors(pt, hp); const d = _v2.length(); if (d > this.range * rangeMul) return 0;
    const fwd = new THREE.Vector3(Math.sin(this.actor.yaw), 0, Math.cos(this.actor.yaw));
    const flat = _v2.clone().setY(0).normalize(); const ang = Math.acos(THREE.MathUtils.clamp(fwd.dot(flat), -1, 1));
    if (ang > this.fov / 2 && d > 1.4) return 0;
    if (!this.game.physics.lineOfSight(hp, pt)) return 0;
    return 1 - d / (this.range * rangeMul) * 0.6;
  }
  say(id) { if (this.barkT > 0) return; this.barkT = 3; this.game.bark(id, this.actor); }
  setIcon(k) { if (this.icon) { this.icon.parent?.remove(this.icon); this.icon = null; } if (k) { this.icon = new THREE.Sprite(this.game.fx.mat(k, THREE.NormalBlending)); this.icon.scale.setScalar(0.4); this.icon.position.set(0, 2.25, 0); this.actor.root.add(this.icon); } }
  hear(pos, radius) {
    if (this.state === 'down' || this.state === 'stunned' || this.state === 'alert') return;
    if (this.pos.distanceTo(pos) > radius) return;
    this.target.copy(pos); if (this.state !== 'investigate') { this.say(this.L.hm); audio.sfx('suspicious', { pos: this.pos, vol: 0.7 }); }
    this.state = 'investigate'; this.investT = 0; this.setIcon('q'); this.actor.stopWalk(); this.actor.faceTo(pos.x, pos.z);
  }
  zap() {
    if (this.state === 'down') return false;
    this.state = 'down'; this.sus = 0; this.setIcon(null); this.actor.walking = null; this.cone.visible = false; if (this.spot) this.spot.visible = false;
    this.actor.play('stunned', 0.05); this.actor.stunned = true; this.game.bark('g_zap', this.actor);
    setTimeout(() => this.actor.play('down', 0.4), 900);
    if (this.actor.col) this.actor.col.setEnabled(false);
    this.game.stats.zaps = (this.game.stats.zaps || 0) + 1;
    return true;
  }
  chill() { if (this.state === 'down') return; this.state = 'stunned'; this.stunT = 2.5; this.actor.walking = null; this.actor.play('stunned', 0.1); this.sus = Math.min(this.sus, 0.3); this.setIcon(null); }
  update(dt) {
    const g = this.game, pl = g.player; this.barkT -= dt;
    if (g.cutscene.active || this.paused) return;
    if (this.state === 'down') { this.zzzT -= dt; if (this.zzzT < 0) { this.zzzT = 1.2; g.fx.zzz(this.pos.clone().add(new THREE.Vector3(0, 0.4, 0))); } return; }
    if (this.state === 'stunned') { this.stunT -= dt; if (this.stunT <= 0) { this.state = 'investigate'; this.target.copy(pl.pos); this.investT = 0; } return; }
    // vision
    let see = 0;
    if (!g.locked() && !g.state.invisible) {
      const chest = pl.pos.clone(); chest.y += pl.crouch ? 0.7 : 1.2;
      see = this.canSee(chest, pl.crouch ? 0.62 : 1);
    }
    const susRate = this.state === 'alert' ? 4 : (0.55 + see * 1.6) * (g.difficulty || 1);
    if (see > 0) { this.sus = Math.min(1, this.sus + susRate * dt * (this.o.susMul || 1)); this.target.copy(pl.pos); this.lostT = 0; }
    else this.sus = Math.max(0, this.sus - dt * (this.state === 'alert' ? 0.12 : 0.25));
    if (this.state !== 'alert' && this.sus >= 1) { this.state = 'alert'; this.setIcon('ex'); this.say(this.L.see); audio.sfx('alert', { vol: 0.8, vary: 0 }); g.onAlert && g.onAlert(this); }
    else if (this.state === 'patrol' && this.sus > 0.4) { this.state = 'investigate'; this.investT = 0; this.setIcon('q'); this.say(this.L.hm); audio.sfx('suspicious', { vol: 0.6, vary: 0 }); }
    g.reportSus(this.sus, this.state === 'alert');
    const p = this.pos;
    if (this.state === 'alert') {
      if (see <= 0) { this.lostT += dt; if (this.lostT > 4) { this.state = 'investigate'; this.investT = 0; this.setIcon('q'); this.say(this.L.wind); } }
      this.moveToward(this.target, 3.6, 'run', dt);
      if (p.distanceTo(pl.pos) < (this.o.catchDist || 1.25) && see > 0) { if (this.o.onCatch) this.o.onCatch(this); else g.caught(this); }
    } else if (this.state === 'investigate') {
      this.investT += dt;
      const arrived = this.moveToward(this.target, 1.5, this.walkAnim, dt);
      if (arrived || this.investT > 9) {
        this.actor.play('lookaround', 0.3); this.lookT = (this.lookT || 0) + dt;
        if (this.lookT > 3.2 && this.sus < 0.5) { this.lookT = 0; this.state = 'return'; this.setIcon(null); this.say(this.L.wind); }
      }
    } else if (this.state === 'return') {
      const tgt = this.patrol.length ? this.patrol[this.pi].p : this.home;
      if (this.moveToward(tgt, 1.3, this.walkAnim, dt)) { this.state = 'patrol'; if (!this.patrol.length) { this.actor.faceYaw(this.homeYaw); this.actor.play(this.idleAnim, 0.3); } }
    } else { // patrol
      if (this.patrol.length) {
        const w = this.patrol[this.pi];
        if (this.waitT > 0) { this.waitT -= dt; this.actor.play(this.idleAnim, 0.3); if (this.waitT <= 0) this.pi = (this.pi + 1) % this.patrol.length; }
        else if (this.moveToward(w.p, 1.2, this.walkAnim, dt)) { this.waitT = w.wait || 0.01; if (w.wait > 1.5 && w.yaw !== undefined) this.actor.faceYaw(w.yaw); }
      }
    }
    if (this.spot) this.spot.intensity = 9 * (this.state === 'alert' ? 1.4 : 1);
    this.cone.material.color.setHex(this.state === 'alert' ? 0xff3020 : this.state === 'investigate' ? 0xffc040 : (this.o.night ? 0xfff2c0 : 0xffffff));
  }
  moveToward(t, speed, anim, dt) {
    const p = this.pos; _v.set(t.x - p.x, 0, t.z - p.z); const d = _v.length();
    if (d < 0.35) { if (this.actor.curName === anim) this.actor.play(this.idleAnim, 0.3); return true; }
    _v.multiplyScalar(1 / d);
    // obstacle check
    const from = p.clone(); from.y += 0.6;
    const hit = this.game.physics.raycast(from, _v, 0.55, m => m.type === 'static' || m.type === 'door');
    if (hit) { this.actor.play(this.idleAnim, 0.3); this.blockedT = (this.blockedT || 0) + dt; if (this.blockedT > 1.2) { this.blockedT = 0; return true; } return false; }
    this.blockedT = 0;
    p.addScaledVector(_v, Math.min(d, speed * dt)); this.actor.targetYaw = Math.atan2(_v.x, _v.z); this.actor.play(anim, 0.2);
    return false;
  }
}

export class SecCam {
  constructor(game, obj, o = {}) {
    this.game = game; this.obj = obj; this.head = find(obj, 'head') || obj; this.led = find(obj, 'led'); this.frostDisc = find(obj, 'frost');
    if (this.frostDisc) this.frostDisc.visible = false;
    this.base = o.yaw || 0; this.sweep = (o.sweep ?? 50) * Math.PI / 180; this.period = o.period || 7; this.t = Math.random() * 10; this.fov = 44 * Math.PI / 180; this.range = o.range || 11;
    this.frost = 0; this.seeT = 0; this.cooldown = 0; this.pitch = o.pitch ?? 0.45;
    this.cone = coneMesh(this.range, this.fov, 0xff4040, 0.07); this.head.add(this.cone); this.cone.position.set(0, -0.04, 0.3);
  }
  worldPos() { return this.head.getWorldPosition(new THREE.Vector3()); }
  dirWorld() { const d = new THREE.Vector3(0, 0, 1); return d.applyQuaternion(this.head.getWorldQuaternion(new THREE.Quaternion())); }
  update(dt) {
    const g = this.game; this.t += dt;
    if (this.frost > 0) { this.frost -= dt; if (this.frost <= 0) { this.frostDisc && (this.frostDisc.visible = false); this.cone.visible = true; } }
    const yaw = this.base + Math.sin(this.t * Math.PI * 2 / this.period) * this.sweep / 2;
    this.head.rotation.set(this.pitch, yaw, 0);
    if (this.led) this.led.visible = this.frost <= 0 && (Math.sin(this.t * 6) > 0 || this.seeT > 0);
    if (this.frost > 0 || g.locked() || g.state.invisible) return;
    const cp = this.worldPos(); const pp = g.player.pos.clone(); pp.y += 1.0;
    const to = pp.clone().sub(cp); const d = to.length(); let see = false;
    if (d < this.range) { to.normalize(); const dir = this.dirWorld(); if (dir.dot(to) > Math.cos(this.fov / 2) && g.physics.lineOfSight(cp, pp)) see = true; }
    if (see) { this.seeT += dt * (g.player.crouch ? 0.7 : 1); g.reportSus(Math.min(1, this.seeT / 1.1), false); if (Math.floor(this.seeT * 8) !== Math.floor((this.seeT - dt) * 8)) audio.sfx('cam_beep', { pos: cp, vol: 0.6, vary: 0 }); }
    else this.seeT = Math.max(0, this.seeT - dt);
    this.cone.material.color.setHex(see ? 0xff2020 : 0xff6060); this.cone.material.opacity = see ? 0.13 : 0.06;
    if (this.seeT > 1.1 && this.cooldown <= 0) {
      this.cooldown = 6; this.seeT = 0; audio.sfx('alarm', { vol: 0.8, vary: 0 }); g.ui.toast('CAMERA ALARM! Guards are on their way.', 2.5);
      for (const gd of g.guards) if (gd.state !== 'down' && gd.pos.distanceTo(g.player.pos) < 30) { gd.state = 'alert'; gd.sus = 1; gd.target.copy(g.player.pos); gd.setIcon('ex'); }
    }
    this.cooldown -= dt;
  }
  frostIt() { this.frost = 18; this.seeT = 0; if (this.frostDisc) this.frostDisc.visible = true; this.cone.visible = false; audio.sfx('frost', { pos: this.worldPos(), vol: 0.8 }); }
}
