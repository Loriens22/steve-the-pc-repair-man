// Lightweight particle effects (sprites + instanced points), all procedural.
import * as THREE from 'three';
function dotTex(color = '#fff', soft = true) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, color); g.addColorStop(soft ? 0.4 : 0.8, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
function textTex(str, color) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = 'bold 48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.strokeStyle = '#000'; x.lineWidth = 6; x.strokeText(str, 32, 34); x.fillText(str, 32, 34); return new THREE.CanvasTexture(c); }

export class FX {
  constructor(game) {
    this.game = game; this.parts = [];
    this.tex = { glow: dotTex('#fff'), spark: dotTex('#9cf', false), mist: dotTex('rgba(230,245,255,0.8)'), z: textTex('Z', '#bdf'), q: textTex('?', '#ffd84a'), ex: textTex('!', '#ff4030'), star: textTex('\u2605', '#ffd84a'), note: textTex('\u266a', '#fff') };
    this.mats = {};
  }
  mat(key, blend = THREE.AdditiveBlending) { const k = key + blend; if (!this.mats[k]) this.mats[k] = new THREE.SpriteMaterial({ map: this.tex[key], blending: blend, depthWrite: false, transparent: true }); return this.mats[k]; }
  spawn(key, pos, o = {}) {
    const s = new THREE.Sprite(o.blend === 'normal' ? this.mat(key, THREE.NormalBlending) : this.mat(key)); s.position.copy(pos); const sc = o.size || 0.2; s.scale.setScalar(sc);
    s.material = s.material.clone(); if (o.color) s.material.color.set(o.color);
    this.game.world.scene.add(s);
    this.parts.push({ s, v: o.vel ? o.vel.clone() : new THREE.Vector3(), life: o.life || 1, t: 0, grow: o.grow || 0, g: o.gravity || 0, sc, fade: o.fade ?? true, drag: o.drag || 0 });
    return s;
  }
  zap(p) { for (let i = 0; i < 18; i++) this.spawn('spark', p, { vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), life: 0.35 + Math.random() * 0.2, size: 0.12, gravity: -6 }); this.flash(p, 0x88ccff, 3, 0.15); }
  spray(p, dir) { for (let i = 0; i < 26; i++) { const v = dir.clone().multiplyScalar(4 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.6, (Math.random() - 0.5))); this.spawn('mist', p, { vel: v, life: 0.7 + Math.random() * 0.4, size: 0.15, grow: 1.5, drag: 2.5, blend: 'normal' }); } }
  puff(p, n = 10, color) { for (let i = 0; i < n; i++) this.spawn('mist', p, { vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5), life: 0.8, size: 0.2, grow: 1.2, drag: 2, blend: 'normal', color }); }
  sparkle(p, n = 14) { for (let i = 0; i < n; i++) this.spawn('star', p, { vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 1.1, size: 0.16, gravity: -3, blend: 'normal' }); }
  zzz(p) { this.spawn('z', p, { vel: new THREE.Vector3(0.15, 0.4, 0), life: 2, size: 0.18, grow: 0.3, blend: 'normal' }); }
  icon(key, p) { return this.spawn(key, p, { vel: new THREE.Vector3(0, 0.5, 0), life: 1.2, size: 0.35, blend: 'normal' }); }
  notes(p) { this.spawn('note', p, { vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.5, 0), life: 1.6, size: 0.15, blend: 'normal' }); }
  flash(p, color = 0xffffff, intensity = 4, dur = 0.2) {
    const l = new THREE.PointLight(color, intensity, 5); l.position.copy(p); this.game.world.scene.add(l);
    this.parts.push({ light: l, life: dur, t: 0, i0: intensity });
  }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.t += dt; const k = p.t / p.life;
      if (p.light) { p.light.intensity = p.i0 * (1 - k); if (k >= 1) { p.light.parent.remove(p.light); this.parts.splice(i, 1); } continue; }
      p.v.y += p.g * dt; if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.s.position.addScaledVector(p.v, dt);
      p.s.scale.setScalar(p.sc * (1 + p.grow * k)); if (p.fade) p.s.material.opacity = 1 - k * k;
      if (k >= 1) { p.s.parent && p.s.parent.remove(p.s); p.s.material.dispose(); this.parts.splice(i, 1); }
    }
  }
  clear() { for (const p of this.parts) { if (p.s) p.s.parent?.remove(p.s); if (p.light) p.light.parent?.remove(p.light); } this.parts = []; }
}
