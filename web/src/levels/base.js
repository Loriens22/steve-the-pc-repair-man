// Shared level helpers: placing Blender props with colliders, procedural rooms, skies, lights, screens, triggers.
import * as THREE from 'three';
import { inst, find, models } from '../engine/assets.js';
import { localBox } from '../engine/physics.js';
import { getTex, Screen } from '../engine/textures.js';
import { audio } from '../engine/audio.js';

const matCache = {};
export function stdMat(key, o) { if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(o); return matCache[key]; }
export function texMat(name, rep = [1, 1], o = {}) {
  const k = name + rep.join('x') + JSON.stringify(o);
  if (!matCache[k]) { const t = getTex(name).clone(); t.needsUpdate = true; t.repeat.set(...rep); matCache[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...o }); }
  return matCache[k];
}

export class Level {
  constructor(game) { this.game = game; this.root = new THREE.Group(); this.screens = []; this.updaters = []; this.triggers = []; this.timers = []; this.title = ''; }
  add(o) { this.root.add(o); return o; }
  get physics() { return this.game.physics; }
  place(model, pos, ry = 0, o = {}) {
    const obj = inst(model, o); obj.position.set(...pos); obj.rotation.y = ry; if (o.scale) obj.scale.setScalar(o.scale); if (o.rx) obj.rotation.x = o.rx; if (o.rz) obj.rotation.z = o.rz;
    (o.parent || this.root).add(obj); obj.updateMatrixWorld(true);
    if (o.dyn) { const d = this.physics.addDynamic(obj, o.dyn); d.home = obj.getWorldPosition(new THREE.Vector3()); { const q = obj.getWorldQuaternion(new THREE.Quaternion()); d.homeQ = { x: q.x, y: q.y, z: q.z, w: q.w }; } if (o.dyn.pick) d.opts.pick = true; obj.userData.d = d; }
    else if (o.col !== false) this.physics.addStatic(obj, { type: o.colType || 'static', shrink: o.shrink, ignoreCols: o.ignoreCols });
    return obj;
  }
  box(size, pos, mat, o = {}) {
    const g = new THREE.BoxGeometry(...size);
    if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const n = Math.floor(i / 4); const face = Math.floor(n); } }
    const m = new THREE.Mesh(g, mat); m.position.set(...pos); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast ?? true; m.receiveShadow = true; (o.parent || this.root).add(m);
    if (o.col !== false) this.physics.addBox(m.position, new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2), m.quaternion, { type: o.colType || 'static' });
    return m;
  }
  // world-UV box: texture repeats scale with size
  wbox(size, pos, texName, scale = 1, o = {}) {
    const g = new THREE.BoxGeometry(...size); const uv = g.attributes.uv, pos_ = g.attributes.position, nrm = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      const x = pos_.getX(i) + pos[0], y = pos_.getY(i) + pos[1], z = pos_.getZ(i) + pos[2];
      if (ny > 0.5) uv.setXY(i, x / scale, z / scale); else if (nx > 0.5) uv.setXY(i, z / scale, y / scale); else uv.setXY(i, x / scale, y / scale);
    }
    const t = getTex(texName, ...(o.texArgs || [])); const tx = t.clone(); tx.repeat.set(1, 1); tx.needsUpdate = true;
    const mat = o.mat || new THREE.MeshStandardMaterial({ map: tx, roughness: o.rough ?? 0.85, color: o.color || 0xffffff, metalness: o.metal || 0 });
    const m = new THREE.Mesh(g, mat); m.position.set(...pos); m.castShadow = o.cast ?? true; m.receiveShadow = true; (o.parent || this.root).add(m);
    if (o.col !== false) this.physics.addBox(m.position, new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2), null, { type: 'static' });
    return m;
  }
  // many copies of one prop as InstancedMeshes (+ a box collider each)
  instanced(model, list, o = {}) {
    const src = models[model]?.scene; if (!src) return;
    src.updateMatrixWorld(true); const meshes = []; src.traverse(m => { if (m.isMesh && !/^col_/.test(m.name)) meshes.push(m); });
    const T = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1);
    const out = [];
    for (const m of meshes) {
      const im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.castShadow = !!o.cast; im.receiveShadow = true;
      list.forEach((it, i) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[3] || 0); T.compose(new THREE.Vector3(it[0], it[1], it[2]), Q, S.setScalar(it[4] || 1)); im.setMatrixAt(i, T.clone().multiply(m.matrixWorld)); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); this.add(im); out.push(im);
    }
    if (o.col !== false) { const lb = localBox(src); const c = lb.getCenter(new THREE.Vector3()), h = lb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      for (const it of list) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it[3] || 0); const cc = c.clone().applyQuaternion(q).add(new THREE.Vector3(it[0], it[1], it[2])); this.physics.addBox(cc, h, q); } }
    return out;
  }
  // large flat ground as 16 m collider tiles (huge single boxes break GJK precision in the character controller)
  groundTiles(cx, cz, w, d, top = 0, tile = 16) {
    const nx = Math.ceil(w / tile), nz = Math.ceil(d / tile), tw = w / nx, td = d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) this.physics.addBox(new THREE.Vector3(cx - w / 2 + tw * (i + 0.5), top - 1, cz - d / 2 + td * (j + 0.5)), new THREE.Vector3(tw / 2, 1, td / 2));
  }
  glass(size, pos, o = {}) {
    const m = this.box(size, pos, stdMat('glass' + (o.tint || ''), { color: o.tint || 0x9fc4d8, transparent: true, opacity: o.opacity ?? 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }), { ...o, cast: false });
    m.renderOrder = 2; return m;
  }
  sky(top, mid, bottom, o = {}) {
    const g = new THREE.SphereGeometry(o.r || 400, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bot: { value: new THREE.Color(bottom) }, sun: { value: new THREE.Vector3(...(o.sun || [0.3, 0.2, -1])).normalize() }, sunCol: { value: new THREE.Color(o.sunCol || 0xffe0a0) }, stars: { value: o.stars ? 1 : 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, mid, bot, sun, sunCol; uniform float stars; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y,0.0,1.0), 0.6)) : mix(mid, bot, clamp(-y*4.0,0.0,1.0));
          float s = max(dot(vP, sun), 0.0); c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.25);
          if (stars > 0.5 && y > 0.05) { vec3 q = floor(vP * 300.0); float st = step(0.9975, h(q)); c += vec3(st) * (0.6 + 0.4*h(q+1.0)) * clamp(y*3.0,0.0,1.0); }
          gl_FragColor = vec4(c, 1.0); }` });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = -10; mesh.frustumCulled = false; this.add(mesh); this.skyMesh = mesh; return mesh;
  }
  pointLight(color, intensity, dist, pos, o = {}) {
    const l = new THREE.PointLight(color, intensity, dist, o.decay ?? 2); l.position.set(...pos);
    if (o.shadow && this.game.world.quality === 'high') { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.002; }
    this.add(l); return l;
  }
  hemi(sky, ground, i) { const h = new THREE.HemisphereLight(sky, ground, i); this.add(h); return h; }
  screenOn(obj, w, h, draw, meshName = 'screen') {
    const mesh = typeof obj === 'string' ? null : (find(obj, meshName) || obj);
    const s = new Screen(w, h, draw); if (mesh) mesh.material = s.material(1.1); this.screens.push(s); s.mesh = mesh; return s;
  }
  interact(o) { o.level = this; return this.game.interact(o); }
  trigger(center, half, fn, o = {}) { const t = { c: new THREE.Vector3(...center), h: new THREE.Vector3(...half), fn, once: o.once ?? true, enabled: true, cond: o.cond }; this.triggers.push(t); return t; }
  every(fn) { this.updaters.push(fn); }
  // zones [x, z, halfX, halfZ] that physics props must never come to rest in (doorways, key interaction spots)
  keepClear(...zones) { (this.clearZones = this.clearZones || []).push(...zones.map(([x, z, hx, hz]) => ({ x, z, hx, hz }))); }
  inClearZone(p, m = 0.12) { return (this.clearZones || []).some(z => Math.abs(p.x - z.x) < z.hx + m && Math.abs(p.z - z.z) < z.hz + m && p.y < 2.6); }
  // safety net: props that fell out of the world, flew out of bounds, or settle in a keep-clear zone go back to where they started
  propSafety(dt) {
    this._psT = (this._psT || 0) + dt; if (this._psT < 0.5) return; const step = this._psT; this._psT = 0;
    const ph = this.game.physics; if (!ph) return; const b = this.bounds;
    for (const d of ph.dyn) {
      if (d.held || !d.home || d.noReset) continue;
      const p = d.body.translation(), v = d.body.linvel(); const sp = Math.hypot(v.x, v.y, v.z);
      const lost = p.y < (this.floorY ?? 0) - 3 || (b && (p.x < b[0] || p.x > b[1] || p.z < b[2] || p.z > b[3]));
      if (this.inClearZone(p) && sp < 0.6) d.zoneT = (d.zoneT || 0) + step; else d.zoneT = 0;
      if (lost || d.zoneT >= 1.5) this.resetProp(d);
    }
  }
  resetProp(d) {
    const p = d.body.translation(); this.game.fx?.puff(new THREE.Vector3(p.x, p.y + 0.2, p.z), 6, 0xffffff);
    const h = d.home, q = d.homeQ || { x: 0, y: 0, z: 0, w: 1 };
    d.body.setTranslation({ x: h.x, y: h.y + 0.05, z: h.z }, true); d.body.setRotation(q, true); d.body.setLinvel({ x: 0, y: 0, z: 0 }, true); d.body.setAngvel({ x: 0, y: 0, z: 0 }, true); d.zoneT = 0; d.resets = (d.resets || 0) + 1;
  }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  async build() {}
  async start() {}
  update(dt) {
    if (this.skyMesh) this.skyMesh.position.copy(this.game.world.camera.position);
    for (const s of this.screens) if (s.draw && s.live !== false) { s.acc = (s.acc || 0) + dt; if (s.acc > (s.rate || 0.1)) { s.update(s.acc); s.acc = 0; } }
    for (const f of this.updaters) f(dt);
    this.propSafety(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    const pl = this.game.player;
    if (pl && !this.game.locked()) for (const t of this.triggers) {
      if (!t.enabled || (t.cond && !t.cond())) continue; const p = pl.pos;
      if (Math.abs(p.x - t.c.x) < t.h.x && Math.abs(p.y + 0.9 - t.c.y) < t.h.y && Math.abs(p.z - t.c.z) < t.h.z) { if (t.once) t.enabled = false; t.fn(); }
    }
  }
  dispose() { this.root.traverse(o => { if (o.isMesh && o.geometry && !o.userData.shared) { /* geometry shared by clones; leave */ } }); this.screens = []; this.updaters = []; this.timers = []; }
  hint() { return ''; }
  objective(t) { this.game.ui.objective(t); }
  msg(from, text) { this.game.ui.message(from, text); }
}

// a hinged / sliding door helper
export function makeDoor(level, obj, leafName, o = {}) {
  const leaf = find(obj, leafName) || obj; const st = { open: false, t: 0, leaf, base: leaf.rotation.y, basePos: leaf.position.clone() };
  obj.updateMatrixWorld(true);
  const wp = leaf.getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3().setFromObject(leaf); const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
  st.col = level.physics.addBox(c, new THREE.Vector3(Math.max(0.05, s.x / 2), s.y / 2, Math.max(0.05, s.z / 2)), null, { type: 'door' });
  st.set = (open, silent) => { if (st.open === open) return; st.open = open; st.col.setEnabled(!open); if (!silent) audio.sfx(o.sound || (open ? 'door_open' : 'door_close'), { pos: wp, vol: 0.7 }); };
  level.every(dt => { st.t += ((st.open ? 1 : 0) - st.t) * Math.min(1, dt * 5);
    if (o.slide) leaf.position.copy(st.basePos).add(new THREE.Vector3(...o.slide).multiplyScalar(st.t)); else leaf.rotation.y = st.base + (o.angle ?? -1.7) * st.t; });
  return st;
}
