// Animated character (shared humanoid skeleton) with crossfades, head look-at, blinking, lip-sync and path walking.
import * as THREE from 'three';
import { inst, animClips, models, find } from './assets.js';
import { audio } from './audio.js';
import { R } from './physics.js';
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

export class Actor {
  constructor(game, model, opts = {}) {
    this.game = game; this.name = opts.name || model; this.root = new THREE.Group(); this.root.name = 'actor_' + this.name;
    this.model = inst(model); this.model.scale.setScalar(opts.scale || 1); this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model); this.actions = {}; this.cur = null; this.curName = '';
    const clips = models[model]?.animations?.length ? models[model].animations : animClips;
    for (const c of clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.head = find(this.model, 'head') && this.model.getObjectByName('head');
    this.headBone = null; this.model.traverse(o => { if (o.isBone && (o.name === 'head' || o.name === 'c_head')) this.headBone = o; });
    this.mouth = this.model.getObjectByName('mouth'); this.eyes = ['eye_L', 'eye_R'].map(n => this.model.getObjectByName(n)).filter(Boolean);
    this.blinkT = 2 + Math.random() * 3; this.lookTarget = null; this.lookW = 0; this.yaw = 0; this.targetYaw = null; this.speaking = false;
    this.speed = opts.speed || 1.4; this.walking = null; this.lookYaw = 0; this.lookPitch = 0;
    this.play(opts.anim || 'idle', 0);
    if (opts.collider !== false && game.physics) {
      const p = game.physics;
      this.body = p.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
      const r = (opts.radius || 0.3) * (opts.scale || 1);
      this.col = p.world.createCollider(R.ColliderDesc.capsule(0.55 * (opts.scale || 1), r).setTranslation(0, 0.88 * (opts.scale || 1), 0), this.body);
      p.meta.set(this.col.handle, { type: 'npc', actor: this });
    }
    game.actors.push(this);
  }
  place(x, y, z, yaw = 0) { this.root.position.set(x, y, z); this.yaw = yaw; this.root.rotation.y = yaw; this.targetYaw = null; this.syncBody(true); return this; }
  syncBody(teleport) {
    if (!this.body) return; const p = this.root.position;
    if (teleport) { this.body.setTranslation({ x: p.x, y: p.y, z: p.z }, true); this.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z }); } else this.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
  }
  play(name, fade = 0.25, opts = {}) {
    const a = this.actions[name]; if (!a) { return; }
    if (this.curName === name && !opts.restart) return a;
    a.reset(); a.setEffectiveTimeScale(opts.speed || 1); a.setEffectiveWeight(1);
    a.setLoop(opts.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!opts.once;
    if (this.cur && fade > 0) { a.play(); this.cur.crossFadeTo(a, fade, false); } else { if (this.cur) this.cur.stop(); a.play(); }
    this.cur = a; this.curName = name; return a;
  }
  faceTo(x, z) { this.targetYaw = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  faceYaw(y) { this.targetYaw = y; }
  lookAt(target) { this.lookTarget = target; } // Vector3 or Object3D or null
  walkTo(points, opts = {}) {
    if (!Array.isArray(points[0]) && !(points[0] instanceof THREE.Vector3)) points = [points];
    const pts = points.map(p => p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1] ?? this.root.position.y, p[2]));
    return new Promise(res => { this.walking = { pts, i: 0, speed: opts.speed || this.speed, anim: opts.anim || (opts.speed > 2.6 ? 'run' : 'walk'), res, endYaw: opts.endYaw, endAnim: opts.endAnim ?? 'idle' }; this.play(this.walking.anim, 0.2); });
  }
  stopWalk() { if (this.walking) { const r = this.walking.res; this.walking = null; this.play('idle'); r(); } }
  update(dt) {
    // walking along path
    if (this.walking) {
      const w = this.walking, tgt = w.pts[w.i], p = this.root.position;
      _v.set(tgt.x - p.x, 0, tgt.z - p.z); const d = _v.length();
      const step = w.speed * dt;
      if (d <= step + 0.01) { p.x = tgt.x; p.z = tgt.z; p.y = tgt.y; w.i++;
        if (w.i >= w.pts.length) { this.walking = null; if (w.endAnim) this.play(w.endAnim, 0.25); if (w.endYaw !== undefined) this.targetYaw = w.endYaw; w.res(); } }
      else { _v.multiplyScalar(step / d); p.add(_v); p.y += (tgt.y - p.y) * Math.min(1, dt * 6); this.targetYaw = Math.atan2(_v.x, _v.z); }
    }
    if (this.targetYaw !== null) {
      let dy = this.targetYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * Math.min(1, dt * (this.walking ? 8 : 5)); if (Math.abs(dy) < 0.002) this.targetYaw = null;
    }
    this.root.rotation.y = this.yaw;
    this.mixer.update(dt);
    // head look
    if (this.headBone) {
      let ty = 0, tp = 0;
      if (this.lookTarget) {
        const t = this.lookTarget.isObject3D ? this.lookTarget.getWorldPosition(_v) : _v.copy(this.lookTarget);
        const hp = this.headBone.getWorldPosition(new THREE.Vector3());
        const dx = t.x - hp.x, dz = t.z - hp.z, dyy = t.y - hp.y;
        let a = Math.atan2(dx, dz) - this.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < 1.9) { ty = THREE.MathUtils.clamp(a, -1.1, 1.1); tp = THREE.MathUtils.clamp(-Math.atan2(dyy, Math.hypot(dx, dz)), -0.5, 0.6); }
      }
      this.lookYaw += (ty - this.lookYaw) * Math.min(1, dt * 6); this.lookPitch += (tp - this.lookPitch) * Math.min(1, dt * 6);
      if (Math.abs(this.lookYaw) + Math.abs(this.lookPitch) > 0.001) {
        // rotate head in world space about world up (yaw) and actor-right (pitch)
        const hb = this.headBone; const parentQ = hb.parent.getWorldQuaternion(new THREE.Quaternion());
        const worldQ = hb.getWorldQuaternion(new THREE.Quaternion());
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, this.yaw);
        const qy = new THREE.Quaternion().setFromAxisAngle(UP, this.lookYaw); const qp = new THREE.Quaternion().setFromAxisAngle(right.applyQuaternion(qy), this.lookPitch);
        const nq = qp.multiply(qy).multiply(worldQ);
        hb.quaternion.copy(parentQ.invert().multiply(nq));
      }
    }
    // blink
    this.blinkT -= dt; let bl = 1;
    if (this.blinkT < 0.12) bl = Math.max(0.08, Math.abs(this.blinkT - 0.06) / 0.06);
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = this.stunned ? 0.15 : bl;
    // mouth
    if (this.mouth) {
      const lv = this.speaking ? audio.voiceLevel() : 0;
      const target = 1 + lv * 3.2; this.mouth.scale.y += (target - this.mouth.scale.y) * Math.min(1, dt * 25); this.mouth.scale.x = 1 - lv * 0.15;
    }
    this.syncBody(false);
  }
  remove() {
    this.root.parent && this.root.parent.remove(this.root);
    if (this.body) { this.game.physics.world.removeRigidBody(this.body); this.body = null; }
    this.game.actors = this.game.actors.filter(a => a !== this);
  }
  headPos(out = new THREE.Vector3()) { return this.headBone ? this.headBone.getWorldPosition(out) : out.copy(this.root.position).setY(this.root.position.y + 1.6); }
  bone(name) { let b = null; this.model.traverse(o => { if (o.isBone && o.name === name) b = o; }); return b; }
}
