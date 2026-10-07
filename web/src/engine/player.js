// Steve: kinematic character controller (Rapier), third-person camera, carrying/throwing, gadgets.
import * as THREE from 'three';
import { R } from './physics.js';
import { Actor } from './actor.js';
import { input, consume, held } from './input.js';
import { audio } from './audio.js';
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(game) {
    this.game = game; const p = game.physics;
    this.actor = new Actor(game, 'steve', { name: 'steve', collider: false });
    this.root = this.actor.root;
    this.body = p.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 0));
    this.col = p.world.createCollider(R.ColliderDesc.capsule(0.58, 0.28).setTranslation(0, 0.88, 0), this.body);
    p.meta.set(this.col.handle, { type: 'player' });
    this.cc = p.world.createCharacterController(0.03);
    this.cc.enableAutostep(0.32, 0.15, true); this.cc.enableSnapToGround(0.35); this.cc.setMaxSlopeClimbAngle(0.85); this.cc.setMinSlopeSlideAngle(1.0);
    this.cc.setApplyImpulsesToDynamicBodies(true); this.cc.setCharacterMass(70);
    this.vel = new THREE.Vector3(); this.vy = 0; this.grounded = true; this.yaw = 0; this.camYaw = 0; this.camPitch = 0.25; this.camDist = 3.0;
    this.held = null; this.crouch = false; this.stepAcc = 0; this.cool = { zap: 0, duster: 0 }; this.turbo = 0; this.gadgets = false;
    this.camPos = new THREE.Vector3(); this.camTarget = new THREE.Vector3(); this.shake = 0; this.surface = 'tile'; this.noiseT = 0; this.enabled = true;
    this.fovKick = 0; this.speedMul = 1; this.bob = 0; this.landT = 0;
  }
  get pos() { return this.root.position; }
  place(x, y, z, yaw = 0) {
    this.root.position.set(x, y, z); this.body.setTranslation({ x, y, z }, true); this.body.setNextKinematicTranslation({ x, y, z }); try { this.game.physics.world.propagateModifiedBodyPositionsToColliders(); } catch (e) {} this.lastSafe = new THREE.Vector3(x, y, z); this.teleportF = 3; this.yaw = yaw; this.camYaw = yaw + Math.PI; this.actor.yaw = yaw;
    this.vy = 0; this.vel.set(0, 0, 0); this.snapCam = true;
  }
  sit(x, y, z, yaw, anim = 'sit') { this.seated = true; this.col.setEnabled(false); this.place(x, y, z, yaw); this.override = true; this.actor.play(anim, 0.3); if (this.held) this.drop(); }
  stand(x, z, yaw = this.yaw) { this.seated = false; this.col.setEnabled(true); this.place(x, 0, z, yaw); this.override = false; this.actor.play('idle', 0.3); }
  forward(out = _f) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  update(dt) {
    const g = this.game, lock = g.locked();
    // look
    const sens = g.settings.sens * 0.0024;
    if (!lock || g.cutscene.freeLook) { this.camYaw -= input.look.x * sens; this.camPitch += input.look.y * sens * (g.settings.invertY ? -1 : 1); }
    input.look.x = input.look.y = 0;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, -0.6, 1.1);
    if (this.seated) { this.actor.yaw = this.yaw; this.actor.update(dt); this.updateCamera(dt, 0); return; }
    // scripted cutscene walk: the actor drives the position, the kinematic body follows (otherwise the body snaps him back every frame)
    if (lock && this.actor.walking) { this.actor.update(dt); const p = this.root.position; this.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z }); this.vel.set(0, 0, 0); this.vy = 0; this.yaw = this.actor.yaw; this.updateCamera(dt, 0); return; }
    // movement intent
    let mx = 0, my = 0;
    if (!lock && this.enabled) {
      mx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0) + input.move.x + (input.gpMove?.x || 0);
      my = (held('up') ? 1 : 0) - (held('down') ? 1 : 0) + input.move.y + (input.gpMove?.y || 0);
    }
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    this.crouch = !lock && input.crouchToggle && !this.held;
    const sprint = !this.crouch && (held('sprint') || input.sprint) && ml > 0.5;
    let speed = (this.crouch ? 1.35 : sprint ? 4.7 : 2.5) * (this.turbo > 0 ? 1.8 : 1) * this.speedMul;
    if (this.held) speed = Math.min(speed, this.held.heavy ? 1.8 : 3.2);
    // camera-relative
    const cy = this.camYaw + Math.PI;
    const fx = Math.sin(cy), fz = Math.cos(cy);
    let tx = ml > 0.05 ? (fx * my - fz * mx) : 0, tz = ml > 0.05 ? (fz * my + fx * mx) : 0, mlx = ml;
    if (g.autoDir && !lock && this.enabled) { tx = g.autoDir.x; tz = g.autoDir.z; mlx = Math.min(1, Math.hypot(tx, tz)); } // test autopilot
    const tl = Math.hypot(tx, tz) || 1;
    const targetV = _v.set(tx / tl * speed * Math.min(1, mlx), 0, tz / tl * speed * Math.min(1, mlx));
    const accel = this.grounded ? 14 : 4;
    this.vel.x += (targetV.x - this.vel.x) * Math.min(1, dt * accel); this.vel.z += (targetV.z - this.vel.z) * Math.min(1, dt * accel);
    if (mlx > 0.05) { const ty = Math.atan2(targetV.x, targetV.z); let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
    // jump/gravity
    if (!lock && consume('jump') && this.grounded && !this.crouch) { this.vy = 4.6; this.grounded = false; audio.sfx('jump', { vol: 0.5 }); }
    this.vy -= 13 * dt; if (this.vy < -20) this.vy = -20;
    if (this.teleportF > 0) { this.teleportF--; this.vy = 0; const p0 = this.root.position; this.body.setNextKinematicTranslation({ x: p0.x, y: p0.y, z: p0.z }); this.actor.yaw = this.yaw; this.actor.update(dt); this.updateCamera(dt, 0); return; }
    const desired = { x: this.vel.x * dt, y: this.vy * dt, z: this.vel.z * dt };
    this.cc.computeColliderMovement(this.col, desired, undefined, undefined, c => { const m = g.physics.meta.get(c.handle); return !(m && m.dyn && m.dyn.held); });
    const mv = this.cc.computedMovement(); const wasG = this.grounded; this.grounded = this.cc.computedGrounded();
    if (this.grounded && this.vy < 0) { if (!wasG && this.vy < -6) { audio.sfx('land', { vol: 0.6 }); this.shake = Math.max(this.shake, 0.15); this.landT = 0.2; } this.vy = -1; }
    if (!this.grounded && mv.y > desired.y * 0.5 && this.vy > 0 && Math.abs(mv.y) < 1e-4) this.vy = 0; // bonk
    const t = this.body.translation(); const np = { x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z };
    this.body.setNextKinematicTranslation(np); this.root.position.set(np.x, np.y, np.z);
    this.actor.yaw = this.yaw; this.actor.targetYaw = null;
    if (this.grounded) { this.safeT = (this.safeT || 0) + dt; if (this.safeT > 0.5) { this.safeT = 0; (this.lastSafe = this.lastSafe || new THREE.Vector3()).set(np.x, np.y, np.z); } }
    if (np.y < -8 && this.lastSafe) { this.place(this.lastSafe.x, this.lastSafe.y + 0.3, this.lastSafe.z, this.yaw); }
    // anim
    const hs = Math.hypot(mv.x, mv.z) / Math.max(dt, 1e-4);
    let anim = 'idle';
    if (!this.grounded && Math.abs(this.vy) > 2) anim = 'jump';
    else if (this.held) anim = hs > 0.3 ? 'carrywalk' : 'carry';
    else if (this.crouch) anim = hs > 0.3 ? 'sneak' : 'crouch';
    else if (hs > 3.4) anim = 'run'; else if (hs > 0.3) anim = 'walk';
    if (!lock || !this.actor.walking) {
      if (!this.override) { this.actor.play(anim, 0.18); const a = this.actor.cur; if (a && (anim === 'walk' || anim === 'run' || anim === 'sneak' || anim === 'carrywalk')) a.setEffectiveTimeScale(THREE.MathUtils.clamp(hs / (anim === 'run' ? 4.7 : anim === 'sneak' ? 1.3 : 2.4), 0.5, 1.6)); }
    }
    // footsteps + noise
    if (this.grounded && hs > 0.3) {
      this.stepAcc += hs * dt; const stride = anim === 'run' ? 1.05 : anim === 'sneak' ? 0.55 : 0.78;
      if (this.stepAcc > stride) { this.stepAcc = 0; audio.sfx('step_' + this.surface, { vol: this.crouch ? 0.18 : anim === 'run' ? 0.6 : 0.35 });
        if (!this.crouch) g.noise(this.pos, anim === 'run' ? 7 : 2.2, 'step'); }
    }
    if (this.turbo > 0) this.turbo -= dt;
    for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);
    // carrying
    if (this.held) this.updateHeld(dt);
    if (!lock) this.actions();
    this.actor.update(dt);
    this.updateCamera(dt, hs);
  }
  actions() {
    const g = this.game;
    if (consume('throw') && this.held) this.throwHeld();
    if (consume('zap') && this.gadgets) this.zap();
    if (consume('duster') && this.gadgets) this.duster();
  }
  pickup(d) {
    if (this.held) this.drop();
    this.held = d; d.held = true; d.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); d.col.setSensor(true);
    audio.sfx('pickup', { vol: 0.6 }); this.game.ui.toast(d.opts.label ? 'Holding: ' + d.opts.label + (this.game.touch ? ' (THROW / USE to drop)' : ' (F/click throw, E drop)') : '', 1.6);
    d.heavy = !!d.opts.heavy;
  }
  updateHeld(dt) {
    const d = this.held; const f = this.forward(_v2);
    const tgt = _v.copy(this.pos).addScaledVector(f, 0.55 + (d.opts.holdDist || 0)).add(new THREE.Vector3(0, d.opts.holdY ?? 1.05, 0));
    const p = d.body.translation(); const np = { x: p.x + (tgt.x - p.x) * Math.min(1, dt * 18), y: p.y + (tgt.y - p.y) * Math.min(1, dt * 18), z: p.z + (tgt.z - p.z) * Math.min(1, dt * 18) };
    d.body.setNextKinematicTranslation(np);
    const q = new THREE.Quaternion().setFromAxisAngle(UP, this.yaw + (d.opts.holdYaw || 0)); d.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    d.obj.position.set(np.x, np.y, np.z); d.obj.quaternion.copy(q);
  }
  release() {
    const d = this.held; if (!d) return null; this.held = null; d.held = false; d.col.setSensor(false); d.body.setBodyType(R.RigidBodyType.Dynamic, true); return d;
  }
  drop() { const d = this.release(); if (d) { d.body.setLinvel({ x: this.vel.x, y: 0.5, z: this.vel.z }, true); audio.sfx('drop', { vol: 0.4 }); } return d; }
  throwHeld() {
    const d = this.release(); if (!d) return;
    const dir = new THREE.Vector3(); this.game.world.camera.getWorldDirection(dir); dir.y = Math.max(dir.y + 0.25, 0.1); dir.normalize();
    const m = d.body.mass(); const sp = d.heavy ? 4 : 9;
    d.body.setLinvel({ x: dir.x * sp + this.vel.x, y: dir.y * sp, z: dir.z * sp + this.vel.z }, true);
    d.body.setAngvel({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 }, true);
    d.thrown = true; audio.sfx('whoosh', { vol: 0.6 }); this.actor.play('point', 0.1); this.override = true; setTimeout(() => this.override = false, 350);
    this.game.stats.throws = (this.game.stats.throws || 0) + 1;
  }
  zap() {
    if (this.cool.zap > 0) { audio.sfx('error', { vol: 0.3 }); return; }
    this.cool.zap = 2.5; audio.sfx('zap', { vol: 0.8 }); this.game.fx.zap(this.handPos()); this.actor.play('push', 0.08); this.override = true; setTimeout(() => this.override = false, 400);
    this.game.onZap && this.game.onZap(this.pos, this.forward(new THREE.Vector3()));
  }
  duster() {
    if (this.cool.duster > 0) { audio.sfx('error', { vol: 0.3 }); return; }
    this.cool.duster = 1.4; audio.sfx('spray', { vol: 0.8 });
    const dir = new THREE.Vector3(); this.game.world.camera.getWorldDirection(dir); dir.y *= 0.6; dir.normalize();
    this.game.fx.spray(this.handPos(), dir);
    this.actor.play('point', 0.08); this.override = true; setTimeout(() => this.override = false, 500);
    // push dynamic props
    for (const d of this.game.physics.dyn) {
      if (d.held) continue; const p = d.body.translation(); _v.set(p.x, p.y, p.z).sub(this.pos); const dist = _v.length();
      if (dist < 4 && _v.normalize().dot(dir) > 0.6) { const k = (4 - dist) * 1.2; d.body.applyImpulse({ x: dir.x * k * d.body.mass(), y: 1.0 * d.body.mass(), z: dir.z * k * d.body.mass() }, true); }
    }
    this.game.onDuster && this.game.onDuster(this.pos, dir);
  }
  handPos() { const b = this.actor.bone('hand_R'); return b ? b.getWorldPosition(new THREE.Vector3()) : this.pos.clone().setY(this.pos.y + 1); }
  updateCamera(dt, hs) {
    const g = this.game; if (g.cutscene.active && !g.cutscene.freeLook) return;
    const cam = g.world.camera;
    if (this.camOverride) { this.camOverride(cam, dt); audio.listener.copy(this.pos); audio.listenerYaw = this.yaw; return; }
    const dist = (this.crouch ? 2.3 : this.camDist) * (g.cameraZoom || 1);
    const pivot = _v.copy(this.pos).add(new THREE.Vector3(0, this.crouch ? 1.05 : 1.55, 0));
    const right = _r.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    pivot.addScaledVector(right, 0.32);
    const back = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    let d = dist;
    const hit = g.physics.raycast(pivot, back, dist + 0.3, m => m.type === 'static' || m.type === 'door');
    if (hit) d = Math.max(0.35, hit.toi - 0.25);
    const want = _v2.copy(pivot).addScaledVector(back, d);
    if (this.snapCam) { this.camPos.copy(want); this.snapCam = false; }
    else { const k = d < this.lastD ? 30 : 8; this.camPos.lerp(want, Math.min(1, dt * k)); }
    this.lastD = d;
    cam.position.copy(this.camPos);
    if (this.shake > 0) { cam.position.x += (Math.random() - 0.5) * this.shake * 0.2; cam.position.y += (Math.random() - 0.5) * this.shake * 0.2; this.shake = Math.max(0, this.shake - dt * 1.5); }
    cam.lookAt(pivot);
    const fovT = (cam.aspect < 1 ? 75 : 60) + (hs > 4 ? 6 : 0) + (this.turbo > 0 ? 8 : 0);
    cam.fov += (fovT - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix();
    audio.listener.copy(this.pos); audio.listenerYaw = this.camYaw + Math.PI;
  }
}
