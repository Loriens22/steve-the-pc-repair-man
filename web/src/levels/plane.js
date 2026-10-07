// Chapter 2: first class to Zurich. Clone Lars's keycard without waking him or annoying Brigitte.
import * as THREE from 'three';
import { Level, stdMat } from './base.js';
import { Actor } from '../engine/actor.js';
import { Guard } from '../engine/guard.js';
import { find, inst } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Mini } from '../engine/minigames.js';
import { pixText, pixWrap, scanlines } from '../engine/textures.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ROWS = [3.2, 1.0, -1.4, -3.6];

function cloudTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { const px = Math.random() * 512, py = Math.random() * 512, r = 20 + Math.random() * 70; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g;
    for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) { x.save(); x.translate(ox, oy); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.restore(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}

export class PlaneLevel extends Level {
  constructor(g) { super(g); this.title = 'Chapter 2: Seat 2A'; this.st = { cloned: false, binOpen: false, lavTries: 0, stirred: false, sent: 0 }; }
  async build(cp) {
    const g = this.game, w = g.world;
    this.sky(0x02040c, 0x0a1430, 0x05070f, { sun: [-0.4, 0.25, 0.6], sunCol: 0xc8d8ff, stars: true });
    w.sun(0x9fb4ff, 0.5, V(-6, 10, 8), V(0, 0, 0), 9); this.hemi(0xffe6c8, 0x302830, 0.55); w.scene.environmentIntensity = 0.35; w.exposure(1.05, 0.7);
    audio.ambience('amb_plane', 0.55);
    // cabin
    this.cabin = this.place('cabin', [0, 0, 0], 0);
    this.physics.addBox(V(0, 2.8, 0), V(2, 0.1, 6)); this.physics.addBox(V(0, -0.1, 0), V(2, 0.1, 6));
    for (const [i, z] of [-4.5, -1.5, 1.5, 4.5].entries()) this.pointLight(0xffe2c0, 2.4, 5, [0, 2.4, z]);
    this.seats = [];
    for (const z of ROWS) for (const x of [-1.15, 1.15]) this.seats.push(this.place('seat_first', [x, 0, z], 0));
    this.mySeat = this.seats[2]; // row 2, left = 2A
    // galley + cockpit end (+Z)
    this.place('galley_cart', [-1.2, 0, 5.1], Math.PI / 2);
    this.champ = this.place('champagne', [-1.2, 1.02, 5.25], 0, { col: false });
    for (let i = 0; i < 3; i++) this.place('flute', [-1.05 - i * 0.08, 1.02, 4.95], 0, { col: false });
    this.cockpit = this.place('plane_door', [0, 0, 5.94], Math.PI);
    this.lav = this.place('plane_door', [-1.0, 0, -5.94], 0);
    const lsign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.08), new THREE.MeshBasicMaterial({ map: (await import('../engine/textures.js')).getTex('lavsign'), toneMapped: false }));
    lsign.position.set(-1.0, 2.15, -5.86); this.add(lsign);
    // curtain to economy (+ snoring)
    const cm = stdMat('curtain', { color: 0x31406a, roughness: 0.95, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.0, 0.04), cm); m.position.set(0.2 + i * 0.17, 1.0, -5.75 + (i % 2) * 0.05); this.add(m); }
    // passengers: Lars (row 3, right) asleep; a sleeping lady in 1A for flavour
    this.lars = new Actor(g, 'lars', { name: 'lars', scale: 1.12, collider: false }); this.lars.place(1.15, 0.0, ROWS[2] + 0.12, 0); this.lars.play('sitsleep'); this.add(this.lars.root);
    // bins / jacket
    this.bin = find(this.cabin, 'bin_R3'); this.binBase = this.bin.rotation.z;
    this.jacket = inst('jacket'); this.jacket.position.set(0.95, 1.62, -2.2); this.jacket.rotation.set(0, -Math.PI / 2, 0); this.jacket.visible = false; this.add(this.jacket);
    // pillows to throw (distraction) + nuts
    for (const [x, z] of [[-1.15, ROWS[0]], [1.15, ROWS[1]], [-1.15, ROWS[3]], [1.15, ROWS[3]]]) this.place('pillow', [x, 0.62, z - 0.1], 0, { dyn: { pick: true, label: 'pillow', density: 40, sound: 'cardboard', noiseRadius: 10 } });
    this.nuts = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.05, 16), stdMat('nutbowl', { color: 0xf4f0e8, roughness: 0.4 })); this.nuts.position.set(-0.77, 0.76, 0.95); this.add(this.nuts);
    const nm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), stdMat('nuts', { color: 0xb07a3a, roughness: 0.8 })); nm.scale.y = 0.35; nm.position.set(-0.77, 0.79, 0.95); this.add(nm);
    this.floppy = inst('floppy'); this.floppy.position.set(1.15, 0.5, ROWS[3] + 0.68); this.floppy.rotation.x = -1.2; this.add(this.floppy);
    // IFE screen on my seat
    this.ife = this.screenOn(this.mySeat, 256, 160, (x, s) => {
      x.fillStyle = '#081428'; x.fillRect(0, 0, 256, 160); pixText(x, 'SKYFLIX', 10, 8, 2, '#4cf');
      const films = ['HACKERS 4: THE TYPENING', 'FIREWALL OF LOVE', 'I, SPREADSHEET', 'THE NETWORK GUY'];
      films.forEach((f, i) => { const sel = Math.floor(s.t / 2) % 4 === i; x.fillStyle = sel ? '#1d3f6e' : '#0e2240'; x.fillRect(8, 32 + i * 30, 240, 26); pixText(x, f, 14, 41 + i * 30, 1, sel ? '#fff' : '#8ab'); });
      const t = new Date(); pixText(x, 'ZRH 02:' + String(14 + Math.floor(s.t / 60) % 40).padStart(2, '0'), 246, 10, 1, '#9cf', 'right');
    });
    this.ife.rate = 0.25;
    // Brigitte: the flight attendant (soft-fail "guard")
    this.brig = new Guard(g, { model: 'brigitte', voice: 'brigitte', pos: [0, 0, 5.2], yaw: Math.PI, fov: 80, range: 6.5, susMul: 1.3, catchDist: 2.2,
      patrol: [[0, 0, 5.2, 7, 0], [0, 0, 2.0, 1.5], [0, 0, -0.5, 1.5], [0, 0, -4.8, 3, Math.PI], [0, 0, -1.0, 1], [0, 0, 2.4, 1]],
      lines: { hm: 'p_brig_hm', wind: 'p_brig_ok', see: 'p_brig_see' }, onCatch: () => this.sendBack('p_brig_see') });
    this.brig.cone.material.opacity = 0.035; g.guards.push(this.brig);
    // player
    const pl = g.makePlayer(); pl.surface = 'plane'; pl.camDist = 2.2; this.sitDown(true);
    pl.gadgets = true;
    this.setupInteractions();
    // exterior (intro) - far below the cabin, own little world
    this.ext = new THREE.Group(); this.ext.position.set(0, -400, 0); this.add(this.ext);
    this.extPlane = inst('plane_ext'); this.ext.add(this.extPlane);
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: cloudTex(), color: 0x8090b8, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); clouds.rotation.x = -Math.PI / 2; clouds.position.y = -14; this.ext.add(clouds); this.clouds = clouds;
    const clouds2 = clouds.clone(); clouds2.material = clouds.material.clone(); clouds2.material.opacity = 0.5; clouds2.position.y = -9; clouds2.material.map = clouds.material.map.clone(); clouds2.material.map.repeat.set(3, 3); this.ext.add(clouds2); this.clouds2 = clouds2;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 12), new THREE.MeshBasicMaterial({ color: 0xf0f2ff, fog: false })); moon.position.set(-90, 45, 160); this.ext.add(moon);
    this.every(dt => { clouds.material.map.offset.y += dt * 0.02; clouds2.material.map.offset.y += dt * 0.035; });
    this.hintText = 'Wait until Brigitte walks into the galley at the front (or throw a pillow to distract her), then open the overhead bin above Lars (row 3, right side).';
  }
  hint() { return this.st.cloned ? 'Get back to seat 2A (row 2, left) and sit down.' : this.hintText; }
  seatCam(cam, dt) {
    const pl = this.game.player; const t = this.game.time;
    const want = V(0.15 + Math.sin(t * 0.2) * 0.05, 1.72, ROWS[1] + 1.05); this.sc = this.sc || want.clone(); this.sc.lerp(want, Math.min(1, dt * 3));
    cam.position.copy(this.sc); if (pl.shake > 0) { cam.position.y += (Math.random() - 0.5) * pl.shake * 0.2; pl.shake = Math.max(0, pl.shake - dt * 1.5); }
    cam.lookAt(-1.05, 1.05, ROWS[1] - 0.1); cam.fov += (55 - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix();
  }
  sitDown(silent) { const pl = this.game.player; pl.sit(-1.15, 0.0, ROWS[1] + 0.12, 0); pl.camOverride = (c, dt) => this.seatCam(c, dt); this.sc = null; this.seated = true; this.game.state.invisible = true; if (!silent) audio.sfx('drop', { vol: 0.3 }); }
  standUp() { const pl = this.game.player; pl.camOverride = null; pl.stand(-0.35, ROWS[1] + 0.3, 0); pl.camYaw = Math.PI * 0.8; pl.snapCam = true; this.seated = false; this.game.state.invisible = false; }
  async sendBack(line) {
    const g = this.game; if (this.sending) return; this.sending = true; this.st.sent++; g.stats.caught = (g.stats.caught || 0) + 1;
    g.bark(line, this.brig.actor, { force: true }); this.brig.actor.play('point', 0.2);
    await new Promise(r => setTimeout(r, 1400)); await g.ui.fade(1, 0.4);
    if (this.st.binOpen && !this.st.cloned) this.closeBin();
    this.sitDown(true); this.brig.state = 'return'; this.brig.sus = 0; this.brig.setIcon(null); this.brig.actor.place(0, 0, 3.0, Math.PI); this.brig.pi = 0;
    if (g.player.held) g.player.drop();
    await g.ui.fade(0, 0.5); this.sending = false;
    g.ui.toast('Back to your seat. Brigitte will keep an eye on you... for a bit.', 3);
  }
  closeBin() { this.st.binOpen = false; this.jacket.visible = false; audio.sfx('door_close', { vol: 0.4 }); }
  setupInteractions() {
    const g = this.game, st = this.st;
    this.interact({ pos: V(-1.15, 1.0, ROWS[1] + 0.3), r: 1.0, dy: 2, priority: 1, cond: () => this.seated, label: 'Stand up', fn: () => this.standUp() });
    this.interact({ pos: V(-0.6, 1.0, ROWS[1] + 0.2), r: 1.0, dy: 2, cond: () => !this.seated && !this.game.player.held, label: () => st.cloned ? 'Sit down (land in Zurich)' : 'Sit down', fn: () => { this.sitDown(); if (st.cloned) this.landing(); } });
    this.interact({ pos: V(-0.9, 1.0, ROWS[1] + 0.9), r: 0.9, dy: 2, cond: () => this.seated, label: 'Watch the in-flight entertainment', fn: () => g.bark('p_ife', g.player.actor, { queue: false }) });
    this.interact({ pos: V(-0.8, 1.0, ROWS[1]), r: 0.9, dy: 2, cond: () => this.seated, label: 'Eat the warm nuts', fn: () => { audio.sfx('crunch'); g.bark('p_nuts', g.player.actor, { queue: false }); g.secret('nuts'); } });
    this.interact({ pos: V(-0.8, 1.0, ROWS[1] + 0.1), r: 0.9, dy: 2, priority: -0.2, cond: () => this.seated, label: 'Press the call button', fn: () => this.callBell() });
    this.interact({ pos: V(0, 1.2, 5.5), r: 1.1, dy: 2, label: 'Knock on the cockpit door', fn: () => { audio.sfx('knock', { vol: 0.9 }); g.noise(V(0, 0, 5.5), 5); setTimeout(() => { audio.sfx('pa_chime', { vol: 0.5 }); g.bark('p_knock', null); g.secret('knock'); }, 900); } });
    this.interact({ pos: V(-1.0, 1.2, -5.4), r: 1.1, dy: 2, label: 'Lavatory', fn: () => { st.lavTries++; audio.sfx('lav_lock'); if (st.lavTries === 3) { audio.sfx('flush', { vol: 0.8 }); g.ui.toast('...flush...'); } else g.bark('p_lav', g.player.actor, { queue: false }); } });
    this.interact({ pos: V(-1.2, 1.2, 5.0), r: 1.0, dy: 2, once: true, label: 'Pop the champagne', fn: () => { audio.sfx('champagne_pop'); g.noise(V(-1.2, 1, 5), 8); g.fx.puff(V(-1.2, 1.4, 5.25), 10, 0xfff4d8); } });
    this.interact({ pos: V(1.15, 0.7, ROWS[3] + 0.6), r: 1.0, dy: 2, once: true, label: 'Something in the seat pocket', fn: () => { this.floppy.visible = false; g.floppy('plane'); } });
    this.interact({ pos: V(0.4, 1.6, -2.2), r: 1.2, dy: 2, priority: 0.5, cond: () => !st.cloned, label: () => st.binOpen ? 'Clone Lars\'s keycard (jacket pocket)' : 'Open the overhead bin (Lars\'s jacket)', fn: () => this.useBin() });
    this.interact({ pos: () => this.lars.headPos(), r: 1.4, dy: 2, priority: -0.5, label: 'Lars (asleep)', fn: () => { audio.sfx('snore'); g.ui.toast('Lars sleeps the sleep of the very large.'); } });
  }
  callBell() {
    const g = this.game; audio.sfx('call_bell'); if (this.called) return; this.called = true;
    const b = this.brig; b.state = 'return'; const pt = b.patrol[1]; const old = pt.p.clone(); pt.p.set(0, 0, ROWS[1] + 0.2);
    b.pi = 1; setTimeout(() => { g.bark('p_call', b.actor); b.actor.faceTo(-1.15, ROWS[1]); }, 2500); setTimeout(() => { pt.p.copy(old); this.called = false; }, 8000);
  }
  async useBin() {
    const g = this.game, st = this.st;
    if (!st.binOpen) { st.binOpen = true; this.jacket.visible = true; audio.sfx('door_open', { vol: 0.5 }); g.noise(V(0.8, 1, -2.2), 2.5); if (!st.stirred) { st.stirred = true; setTimeout(() => { audio.sfx('snore'); g.bark('p_lars_stir', this.lars); }, 600); } return; }
    if (await Mini.rfid(g)) {
      st.cloned = true; audio.sfx('success'); g.bark('p_card', g.player.actor); this.closeBin(); find(this.jacket, 'card');
      this.objective('Return to seat 2A and sit down'); g.setCheckpoint('cloned');
    }
  }
  update(dt) {
    super.update(dt);
    const g = this.game, st = this.st; if (!g.player) return;
    if (this.bin) this.bin.rotation.z += ((st.binOpen ? -1.25 : 0) + this.binBase - this.bin.rotation.z) * Math.min(1, dt * 6);
    // Lars wakes if you run around him
    const dl = g.player.pos.distanceTo(this.lars.root.position);
    if (!this.seated && !g.locked() && dl < 1.8 && g.player.vel.length() > 3.6 && !this.sending) { g.bark('p_lars_wake', this.lars, { force: true }); this.sendBack('p_brig_see'); }
    // turbulence every so often
    if (g.state.playing && !g.locked()) {
      this.turbT = (this.turbT ?? 55) - dt;
      if (this.turbT < 0) { this.turbT = 60; this.turbulence(); }
    }
    if (this.shakeT > 0) { this.shakeT -= dt; g.player.shake = Math.max(g.player.shake || 0, 0.06); if (Math.random() < dt * 1.5) audio.sfx('turbulence_bump', { vol: 0.6 }); }
  }
  onNoise(pos, r, kind) { if (kind === 'impact' && !this.saidHm) { this.saidHm = true; setTimeout(() => this.saidHm = false, 6000); } }
  async turbulence() {
    const g = this.game; audio.sfx('pa_chime', { vol: 0.5 }); audio.sfx('seatbelt', { vol: 0.6, delay: 0.8 });
    await new Promise(r => setTimeout(r, 1200)); g.bark('p_turb', null, { force: true }); this.shakeT = 10;
    const b = this.brig; if (b.state === 'patrol' || b.state === 'return') { b.patrol[0].wait = 14; b.pi = 0; b.waitT = 0; b.state = 'return'; setTimeout(() => b.patrol[0].wait = 7, 16000); }
    g.ui.toast('Turbulence! Brigitte heads for her jump seat in the galley.', 3);
  }
  async start(cp) {
    const g = this.game, cs = g.cutscene;
    audio.music('plane'); audio.prefetchVoices(['p_01', 'p_02', 'p_03', 'p_04', 'p_05', 'p_06', 'p_07', 'p_08']);
    if (cp === 'cloned') { this.st.cloned = true; this.standUp(); g.player.place(0, 0, -1.0, Math.PI); this.objective('Return to seat 2A and sit down'); g.ui.fade(0, 0.6); return; }
    await cs.run(async c => {
      // exterior: the jet at night above the clouds
      const P = this.ext.position;
      g.ui.fade(0, 1.5);
      this.extPlane.position.set(0, 0, 0);
      c.shot({ pos: [P.x - 30, P.y + 6, P.z + 40], look: [P.x, P.y, P.z], fov: 40, to: { pos: [P.x + 25, P.y + 3, P.z + 22], look: [P.x, P.y + 1, P.z - 5] }, dur: 9, ease: 'io' });
      g.ui.chapter('CHAPTER TWO', 'Seat 2A');
      audio.sfx('pa_chime', { vol: 0.6 });
      await c.wait(2.0);
      await c.say('p_01', null);
      // inside
      c.shot({ pos: [0.2, 1.65, 3.2], look: [-1.15, 1.0, 1.0], fov: 42, dof: true, to: { pos: [0.1, 1.6, 2.6] }, dur: 6 });
      this.brig.actor.place(0.0, 0, 3.0, Math.PI); this.brigPaused = true;
      await c.walk(this.brig.actor, [[-0.2, 0, 1.6]], { speed: 1.2, endYaw: -Math.PI / 2 });
      this.brig.actor.lookAt(g.player.actor.headPos()); g.player.actor.lookAt(this.brig.actor.headPos());
      c.shot({ pos: [-0.95, 1.3, 1.25], look: [-0.2, 1.55, 1.7], fov: 36, dof: true });
      await c.say('p_02', this.brig.actor);
      c.shot({ pos: [-0.6, 1.42, 2.3], look: [-1.15, 1.2, 1.1], fov: 34, dof: true });
      await c.say('p_03', g.player.actor, { anim: false });
      c.shot({ pos: [-0.95, 1.3, 1.25], look: [-0.2, 1.55, 1.7], fov: 36, dof: true });
      await c.say('p_04', this.brig.actor);
      c.shot({ pos: [-0.6, 1.42, 2.3], look: [-1.15, 1.2, 1.1], fov: 34, dof: true });
      await c.say('p_05', g.player.actor, { anim: false });
      c.shot({ pos: [-0.95, 1.3, 1.25], look: [-0.2, 1.55, 1.7], fov: 30, dof: true });
      await c.say('p_06', this.brig.actor);
      this.brig.actor.lookAt(null); g.player.actor.lookAt(null);
      const bw = c.walk(this.brig.actor, [[0, 0, 5.2]], { speed: 1.2, endYaw: 0 });
      // phone call from Oleg
      audio.sfx('phone_msg', { vol: 0.7 });
      c.shot({ pos: [-0.3, 1.5, 2.2], look: [1.15, 1.2, -1.4], fov: 38, dof: true, to: { pos: [-0.2, 1.7, 1.6], look: [1.0, 1.9, -2.2] }, dur: 7 });
      await c.say('p_07', null);
      c.shot({ pos: [-0.6, 1.42, 2.3], look: [-1.15, 1.2, 1.1], fov: 34, dof: true });
      await c.say('p_08', g.player.actor, { anim: false });
      await bw;
    }, { endYaw: Math.PI });
    this.brig.actor.place(0, 0, 5.2, 0); this.brig.pi = 0; this.brig.waitT = 4; this.brig.state = 'patrol';
    this.objective('Clone Lars\'s keycard: overhead bin above row 3 (right side). Don\'t let Brigitte catch you out of your seat.');
    g.ui.toast(g.touch ? 'USE to stand up. Throw pillows (pick up, THROW) to distract Brigitte.' : 'E to stand up. Pick up pillows (E) and throw them (F) to distract Brigitte. C to sneak.', 6);
    g.setCheckpoint(null);
  }
  async landing() {
    const g = this.game, cs = g.cutscene;
    await cs.run(async c => {
      this.brig.actor.place(0, 0, 5.2, 0); c.shot({ pos: [-0.6, 1.42, 2.3], look: [-1.15, 1.2, 1.1], fov: 40, dof: true, to: { pos: [-0.4, 1.5, 2.0] }, dur: 6 });
      audio.sfx('pa_chime', { vol: 0.6 });
      await c.say('p_end', null);
      const P = this.ext.position; this.extPlane.position.set(0, 0, 0); this.extPlane.rotation.x = 0.08;
      c.shot({ pos: [P.x + 20, P.y - 4, P.z - 30], look: [P.x, P.y, P.z], fov: 40, to: { pos: [P.x + 8, P.y - 6, P.z - 50], look: [P.x, P.y - 3, P.z + 20] }, dur: 5 });
      await c.wait(4); await c.fade(1, 1);
    });
    g.save.unlocked = Math.max(g.save.unlocked, 3); g.persist();
    g.startLevel('chalet', null);
  }
}
