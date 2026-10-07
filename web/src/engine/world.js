// Renderer, post-processing (bloom, depth of field), lighting presets and quality management.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class World {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 600);
    const pm = new THREE.PMREMGenerator(r); this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.scene.environment = this.envTex; this.scene.environmentIntensity = 0.5;
    this.composer = new EffectComposer(r);
    this.renderPass = new RenderPass(this.scene, this.camera); this.composer.addPass(this.renderPass);
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 3.0, aperture: 0.004, maxblur: 0.006 }); this.bokeh.enabled = false; this.composer.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.86); this.composer.addPass(this.bloom);
    this.output = new OutputPass(); this.composer.addPass(this.output);
    this.setQuality(quality);
    addEventListener('resize', () => this.resize()); this.resize();
    this.fpsAcc = 0; this.fpsN = 0; this.fps = 60;
  }
  setQuality(q) {
    this.quality = q; const r = this.renderer; const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = q === 'high' ? Math.min(dpr, 2) : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 1);
    r.setPixelRatio(this.pixelRatio);
    this.shadowSize = q === 'high' ? 2048 : q === 'medium' ? 1024 : 512;
    r.shadowMap.enabled = true; r.shadowMap.type = q === 'low' ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    this.bloom.enabled = q !== 'low'; this.usePost = q !== 'low';
    this.scene.traverse(o => { if (o.isLight && o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; o.shadow.mapSize.set(this.shadowSize, this.shadowSize); } });
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.composer.setPixelRatio(this.pixelRatio); this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h; this.camera.fov = w / h < 1 ? 75 : 60; this.camera.updateProjectionMatrix();
  }
  sun(color, intensity, pos, target = new THREE.Vector3(), extent = 18) {
    const d = new THREE.DirectionalLight(color, intensity); d.position.copy(pos); d.target.position.copy(target);
    d.castShadow = true; d.shadow.mapSize.set(this.shadowSize, this.shadowSize); const c = d.shadow.camera;
    c.left = c.bottom = -extent; c.right = c.top = extent; c.near = 0.5; c.far = pos.distanceTo(target) + extent * 2; d.shadow.bias = -0.0004; d.shadow.normalBias = 0.03;
    this.scene.add(d, d.target); return d;
  }
  exposure(e, bloom = 0.55) { this.renderer.toneMappingExposure = e; this.bloom.strength = bloom; }
  dof(on, focus = 3, aperture = 0.003) {
    this.bokeh.enabled = on && this.quality === 'high';
    if (on) { this.bokeh.uniforms.focus.value = focus; this.bokeh.uniforms.aperture.value = aperture; }
  }
  render(dt) {
    this.fpsAcc += dt; this.fpsN++; if (this.fpsAcc > 1) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
    if (this.usePost) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
  }
  clear() {
    const keep = new Set([this.camera]);
    for (const o of [...this.scene.children]) if (!keep.has(o)) this.scene.remove(o);
    this.renderer.toneMappingExposure = 1; this.bloom.strength = 0.55; this.scene.environmentIntensity = 0.5;
    this.scene.fog = null; this.scene.background = null;
  }
}
