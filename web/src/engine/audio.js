// WebAudio manager: music crossfades, ducking under dialogue, positional-ish SFX, voice with lip-sync level.
import * as THREE from 'three';
const BASE = import.meta.env.BASE_URL + 'assets/audio/';

class Audio {
  constructor() {
    this.ctx = null; this.buffers = {}; this.loading = {}; this.musicCur = null; this.musicName = null; this.ambs = {};
    this.settings = { master: 0.9, music: 0.55, sfx: 0.85, voice: 1.0 };
    this.listener = new THREE.Vector3(); this.listenerYaw = 0; this.level = 0; this.voiceSrc = null;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.connect(this.master);
    this.musicBus = c.createGain(); this.musicDuck = c.createGain(); this.musicBus.connect(this.musicDuck); this.musicDuck.connect(this.comp);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
    this.voiceBus = c.createGain(); this.analyser = c.createAnalyser(); this.analyser.fftSize = 512; this.voiceBus.connect(this.analyser); this.analyser.connect(this.comp);
    this.ambBus = c.createGain(); this.ambBus.connect(this.comp);
    this.abuf = new Float32Array(this.analyser.fftSize);
    this.apply();
  }
  unlock() { this.init(); if (this.ctx.state !== 'running') this.ctx.resume(); }
  apply() {
    if (!this.ctx) return; const s = this.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.05); this.musicBus.gain.setTargetAtTime(s.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05); this.voiceBus.gain.setTargetAtTime(s.voice * 1.25, t, 0.05); this.ambBus.gain.setTargetAtTime(s.sfx * 0.7, t, 0.05);
  }
  async load(path) {
    if (this.buffers[path]) return this.buffers[path];
    if (this.loading[path]) return this.loading[path];
    this.init();
    this.loading[path] = fetch(BASE + path).then(r => { if (!r.ok) throw new Error(path); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then(b => { this.buffers[path] = b; return b; }).catch(e => { console.warn('audio fail', path, e); return null; });
    return this.loading[path];
  }
  sfx(name, o = {}) {
    if (!this.ctx) return null; const b = this.buffers['sfx/' + name + '.mp3'];
    if (!b) { this.load('sfx/' + name + '.mp3'); return null; }
    const c = this.ctx, src = c.createBufferSource(); src.buffer = b;
    src.playbackRate.value = (o.rate || 1) * (1 + (o.vary ?? 0.06) * (Math.random() * 2 - 1));
    const g = c.createGain(); let vol = o.vol ?? 1;
    let node = src;
    if (o.pos) {
      const d = this.listener.distanceTo(o.pos); const ref = o.ref || 3; vol *= Math.min(1, ref / Math.max(ref, d)) ** 1.3;
      if (d > (o.max || 40)) return null;
      if (c.createStereoPanner) {
        const p = c.createStereoPanner(); const dx = o.pos.x - this.listener.x, dz = o.pos.z - this.listener.z;
        const ang = Math.atan2(dx, dz) - this.listenerYaw; p.pan.value = Math.max(-0.85, Math.min(0.85, -Math.sin(ang) * Math.min(1, d / 2)));
        src.connect(p); node = p;
      }
    }
    g.gain.value = vol; node.connect(g); g.connect(this.sfxBus); src.loop = !!o.loop; src.start(c.currentTime + (o.delay || 0));
    return { src, gain: g, stop: (f = 0.1) => { try { g.gain.setTargetAtTime(0, c.currentTime, f); src.stop(c.currentTime + f * 5); } catch (e) {} } };
  }
  async music(name, fade = 2.0) {
    if (this.musicName === name) return; this.musicName = name; this.init();
    const c = this.ctx, old = this.musicCur;
    if (old) { old.g.gain.setTargetAtTime(0, c.currentTime, fade / 3); old.src.stop(c.currentTime + fade * 2); this.musicCur = null; }
    if (!name) return;
    const b = await this.load('music/' + name + '.mp3'); if (!b || this.musicName !== name) return;
    const src = c.createBufferSource(); src.buffer = b; src.loop = true; const g = c.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(this.musicBus); src.start(); g.gain.setTargetAtTime(1, c.currentTime, fade / 3);
    this.musicCur = { src, g, name };
  }
  ambience(name, vol = 1) {
    this.init(); const c = this.ctx;
    for (const k in this.ambs) if (k !== name) { const a = this.ambs[k]; a.g.gain.setTargetAtTime(0, c.currentTime, 0.6); a.src.stop(c.currentTime + 3); delete this.ambs[k]; }
    if (!name || this.ambs[name]) { if (name) this.ambs[name].g.gain.setTargetAtTime(vol, c.currentTime, 0.5); return; }
    this.load('sfx/' + name + '.mp3').then(b => {
      if (!b || this.ambs[name]) return; const src = c.createBufferSource(); src.buffer = b; src.loop = true; const g = c.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.ambBus); src.start(); g.gain.setTargetAtTime(vol, c.currentTime, 0.8); this.ambs[name] = { src, g };
    });
  }
  async voice(id, onStart) {
    this.init(); const c = this.ctx;
    const b = await this.load('vo/' + id + '.mp3');
    this.stopVoice();
    if (!b) return 0;
    const src = c.createBufferSource(); src.buffer = b; src.connect(this.voiceBus); src.start();
    this.voiceSrc = src; this.musicDuck.gain.setTargetAtTime(0.4, c.currentTime, 0.15);
    onStart && onStart(b.duration);
    return new Promise(res => { src.onended = () => { if (this.voiceSrc === src) { this.voiceSrc = null; this.musicDuck.gain.setTargetAtTime(1, c.currentTime, 0.4); } res(b.duration); }; this._voiceRes = res; });
  }
  stopVoice() { if (this.voiceSrc) { try { this.voiceSrc.onended && this.voiceSrc.onended(); this.voiceSrc.stop(); } catch (e) {} this.voiceSrc = null; } }
  prefetchVoices(ids) { ids.forEach(id => this.load('vo/' + id + '.mp3')); }
  voiceLevel() {
    if (!this.ctx || !this.voiceSrc) { this.level *= 0.7; return this.level; }
    this.analyser.getFloatTimeDomainData(this.abuf); let s = 0; for (let i = 0; i < this.abuf.length; i++) s += this.abuf[i] * this.abuf[i];
    const v = Math.min(1, Math.sqrt(s / this.abuf.length) * 7); this.level = this.level * 0.4 + v * 0.6; return this.level;
  }
}
export const audio = new Audio();
