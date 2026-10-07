// Rapier physics wrapper: static boxes from Blender meshes, dynamic props, raycasts, kinematic doors.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
export let R = null;
export async function initPhysics() { await RAPIER.init(); R = RAPIER; }
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _b = new THREE.Box3();

export function localBox(obj, filter) {
  obj.updateMatrixWorld(true); const inv = _m.copy(obj.matrixWorld).invert(); const box = new THREE.Box3(); const tmp = new THREE.Matrix4();
  obj.traverse(o => {
    if (!o.isMesh || (filter && !filter(o))) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _b.copy(o.geometry.boundingBox).applyMatrix4(tmp.multiplyMatrices(inv, o.matrixWorld)); box.union(_b);
  });
  return box;
}

export class Physics {
  constructor() {
    this.world = new R.World({ x: 0, y: -9.81, z: 0 }); this.dyn = []; this.acc = 0; this.meta = new Map(); this.onImpact = null;
    this.events = new R.EventQueue(true);
  }
  fixed() { return this.world.createRigidBody(R.RigidBodyDesc.fixed()); }
  addBox(center, half, quat = null, opts = {}) {
    const body = opts.body || this.fixed();
    const d = R.ColliderDesc.cuboid(Math.max(0.01, half.x), Math.max(0.01, half.y), Math.max(0.01, half.z)).setTranslation(center.x, center.y, center.z).setFriction(opts.friction ?? 0.7);
    if (quat) d.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    const c = this.world.createCollider(d, body); this.meta.set(c.handle, { type: opts.type || 'static', obj: opts.obj, ...opts.meta }); return c;
  }
  // static collider from the object's local bounding box (or from its col_* children if present)
  addStatic(obj, opts = {}) {
    obj.updateMatrixWorld(true);
    const cols = []; obj.traverse(o => { if (/^col_/.test(o.name)) cols.push(o); });
    const out = [];
    if (cols.length && !opts.ignoreCols) {
      for (const c of cols) { c.visible = false; out.push(this._boxFor(c, () => true, opts)); }
      return out;
    }
    out.push(this._boxFor(obj, opts.filter, opts, opts.shrink)); return out;
  }
  _boxFor(obj, filter, opts, shrink) {
    const lb = localBox(obj, filter || (m => !/^col_/.test(m.name)));
    if (lb.isEmpty()) return null;
    const c = lb.getCenter(new THREE.Vector3()), h = lb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    if (shrink) h.multiply(shrink);
    obj.matrixWorld.decompose(_v, _q, _s); h.multiply(_s);
    c.applyMatrix4(obj.matrixWorld);
    return this.addBox(c, h, _q, opts);
  }
  addDynamic(obj, opts = {}) {
    obj.updateMatrixWorld(true);
    const lb = localBox(obj); const size = lb.getSize(new THREE.Vector3()); const ctr = lb.getCenter(new THREE.Vector3());
    obj.getWorldPosition(_v); obj.getWorldQuaternion(_q);
    const bd = R.RigidBodyDesc.dynamic().setTranslation(_v.x, _v.y, _v.z).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
      .setLinearDamping(opts.damping ?? 0.1).setAngularDamping(opts.angDamping ?? 0.3).setCcdEnabled(!!opts.ccd);
    const body = this.world.createRigidBody(bd);
    const s = obj.scale;
    let cd;
    if (opts.shape === 'ball') cd = R.ColliderDesc.ball(Math.max(size.x * s.x, size.y * s.y, size.z * s.z) / 2);
    else if (opts.shape === 'cyl') cd = R.ColliderDesc.cylinder(size.y * s.y / 2, Math.max(size.x * s.x, size.z * s.z) / 2);
    else cd = R.ColliderDesc.cuboid(Math.max(0.01, size.x * s.x / 2), Math.max(0.01, size.y * s.y / 2), Math.max(0.01, size.z * s.z / 2));
    cd.setTranslation(ctr.x * s.x, ctr.y * s.y, ctr.z * s.z).setRestitution(opts.restitution ?? 0.25).setFriction(opts.friction ?? 0.6)
      .setDensity(opts.density ?? 300).setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(opts.impactThreshold ?? 8);
    const col = this.world.createCollider(cd, body);
    const d = { obj, body, col, opts, lastImpact: 0 };
    this.meta.set(col.handle, { type: 'dyn', obj, dyn: d });
    this.dyn.push(d); obj.userData.dyn = d;
    return d;
  }
  removeDynamic(d) { this.world.removeRigidBody(d.body); this.dyn = this.dyn.filter(x => x !== d); this.meta.delete(d.col.handle); }
  kinematicBox(center, half, opts = {}) {
    const body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(center.x, center.y, center.z));
    const c = this.world.createCollider(R.ColliderDesc.cuboid(half.x, half.y, half.z), body); this.meta.set(c.handle, { type: opts.type || 'static', ...opts.meta });
    return { body, col: c };
  }
  step(dt, t) {
    this.acc += Math.min(dt, 0.1); let n = 0;
    while (this.acc >= 1 / 60 && n < 4) { this.world.step(this.events); this.acc -= 1 / 60; n++;
      this.events.drainContactForceEvents(e => {
        const m1 = this.meta.get(e.collider1()), m2 = this.meta.get(e.collider2());
        const f = e.totalForceMagnitude(); for (const m of [m1, m2]) if (m && m.dyn && t - m.dyn.lastImpact > 0.15) { m.dyn.lastImpact = t; this.onImpact && this.onImpact(m.dyn, f); }
      });
    }
    for (const d of this.dyn) {
      if (d.held) continue;
      const p = d.body.translation(), r = d.body.rotation();
      if (d.obj.parent && d.obj.parent.isScene !== true && d.obj.parent.type !== 'Scene') {
        // convert to parent space
        _v.set(p.x, p.y, p.z); d.obj.parent.worldToLocal(_v); d.obj.position.copy(_v);
      } else d.obj.position.set(p.x, p.y, p.z);
      d.obj.quaternion.set(r.x, r.y, r.z, r.w);
      if (p.y < -30) { d.body.setTranslation({ x: d.home?.x ?? 0, y: (d.home?.y ?? 2) + 0.5, z: d.home?.z ?? 0 }, true); d.body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
    }
  }
  raycast(from, dir, max, pred) {
    const ray = new R.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRay(ray, max, true, undefined, undefined, undefined, undefined, pred ? (c => pred(this.meta.get(c.handle) || {}, c)) : undefined);
    if (!hit) return null;
    const toi = hit.timeOfImpact ?? hit.toi;
    return { toi, collider: hit.collider, meta: this.meta.get(hit.collider.handle) || {} };
  }
  lineOfSight(a, b, pred) {
    const d = _v.subVectors(b, a); const len = d.length(); d.normalize();
    const h = this.raycast(a, d, len, pred || (m => m.type === 'static' || m.type === 'door'));
    return !h || h.toi >= len - 0.05;
  }
  dispose() { this.world.free(); }
}
