// Chapter 3: a Swiss ski chalet on top of a data vault. Night stealth: guards, cameras, a sticky note, a keypad.
import * as THREE from 'three';
import { Level, stdMat, makeDoor } from './base.js';
import { Actor } from '../engine/actor.js';
import { Guard, SecCam } from '../engine/guard.js';
import { find, inst } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Mini } from '../engine/minigames.js';
import { getTex, pixText } from '../engine/textures.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function mountain(r, h, seed, color = 0xdfe7f0) {
  const g = new THREE.ConeGeometry(r, h, 40, 12, true); const p = g.attributes.position; const cols = [];
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = (y + h / 2) / h;
    const n = 1 + 0.18 * Math.sin(a * 3 + ph[0]) + 0.1 * Math.sin(a * 7 + ph[1] + k * 4) + 0.06 * Math.sin(a * 13 + ph[2] + k * 9);
    p.setX(i, x * n); p.setZ(i, z * n); p.setY(i, y + Math.sin(a * 5 + ph[1]) * h * 0.04 * (1 - k));
    const rock = k < 0.55 && Math.sin(a * 9 + k * 20 + ph[2]) > 0.35; const c = new THREE.Color(rock ? 0x5a6270 : color); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); g.translate(0, h / 2, 0);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
}

export class ChaletLevel extends Level {
  constructor(g) { super(g); this.title = 'Chapter 3: Cold Boot'; this.st = { pin: false, alarms: 0, chatDone: false, triedPad: false }; }
  async build(cp) {
    const g = this.game, w = g.world;
    this.sky(0x02040d, 0x14203f, 0x0b1020, { sun: [-0.5, 0.35, -0.7], sunCol: 0xbfd0ff, stars: true });
    w.scene.fog = new THREE.FogExp2(0x101a30, 0.012);
    w.sun(0x9ab4ff, 0.9, V(-20, 30, -18), V(0, 0, 0), 30); this.hemi(0x5870b0, 0x283048, 0.55); w.scene.environmentIntensity = 0.2; w.exposure(1.1, 0.7);
    audio.ambience('amb_wind', 0.7);
    // ground
    const snowT = getTex('snow').clone(); snowT.needsUpdate = true; snowT.repeat.set(40, 40);
    const gg = new THREE.PlaneGeometry(260, 260, 80, 80); const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i); const d = Math.hypot(x, y); if (d > 45) gp.setZ(i, Math.pow((d - 45) / 40, 1.6) * 6 * (0.6 + 0.4 * Math.sin(x * 0.07) * Math.cos(y * 0.05))); }
    gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: snowT, color: 0xe8f0ff, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.add(ground);
    this.groundTiles(0, 2, 80, 90, 0);
    for (const [sx, sz, x, z] of [[1, 100, -38, 0], [1, 100, 38, 0], [80, 1, 0, -40], [80, 1, 0, 44]]) this.physics.addBox(V(x, 2, z), V(sx / 2, 4, sz / 2));
    // mountains
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.3; const r = 150 + (i % 3) * 30; const m = mountain(40 + (i % 4) * 14, 60 + (i % 5) * 18, i * 97 + 11); m.position.set(Math.cos(a) * r, -4, Math.sin(a) * r); this.add(m); }
    // chalet compound
    this.chalet = this.place('chalet', [0, 0, -10], 0);
    this.serviceDoor = makeDoor(this, this.chalet, 'service_door', { slide: [0, 0, 1.2], sound: 'door_open' });
    this.pointLight(0xffc880, 6, 9, [0, 2.6, -5.0]);
    this.keypad = this.place('keypad', [6.12, 1.3, -6.55], Math.PI / 2, { col: false });
    this.padS = this.screenOn(this.keypad, 64, 24, (x, s) => { x.fillStyle = '#031'; x.fillRect(0, 0, 64, 24); pixText(x, this.st.open ? 'OPEN' : 'PIN?', 32, 8, 1, '#4f8', 'center'); }); this.padS.rate = 0.5;
    this.pointLight(0xb0d0ff, 2.5, 6, [7.2, 2.6, -7.5]);
    // fence with a gate at x 1..4
    for (let x = -18; x < 18; x += 3) { if (x >= 0 && x < 4) continue; this.place('fence', [x + 1.5, 0, 8], 0); }
    for (let z = 8; z > -24; z -= 3) { this.place('fence', [-18, 0, z - 1.5], Math.PI / 2); this.place('fence', [18, 0, z - 1.5], Math.PI / 2); }
    this.hut = this.place('guard_hut', [6.2, 0, 10], Math.PI);
    this.hutS = this.screenOn(this.hut, 160, 110, (x, s) => this.drawMines(x, s)); this.hutS.rate = 0.5;
    this.pointLight(0xfff0d0, 2.5, 5, [6.2, 2.3, 10]);
    // floodlights
    for (const [x, z, ry] of [[-9, 6, 2.6], [10, -2, -2.2]]) { this.place('floodlight', [x, 0, z], ry, { shrink: V(0.2, 1, 0.2) }); if (w.quality !== 'low') { const sl = new THREE.SpotLight(0xfff4e0, 14, 20, 0.6, 0.6, 1.4); sl.position.set(x, 4.8, z); sl.target.position.set(x + Math.sin(ry) * 7, 0, z + Math.cos(ry) * 7); this.add(sl); this.add(sl.target); } }
    // props / cover
    this.tub = this.place('hot_tub', [-10, 0, -9], 0); this.snowman = this.place('snowman_crt', [-6, 0, 16], 0.4);
    this.place('ski_rack', [-4, 0, -4.6], 0); this.place('snowmobile', [9.5, 0, 3], 0.6); this.gen = this.place('generator', [9, 0, -16], Math.PI / 2);
    this.van = this.place('van', [-5.2, 0, 31], Math.PI * 0.95);
    for (const [m, x, z, r] of [['crate', 12, -9, 0.3], ['crate', 12.8, -10.2, 0.8], ['crate', 12.4, -9.6, 0], ['barrel', 11, -12, 0], ['barrel', 11.6, -12.6, 0], ['crate', -12, 2, 0.4], ['barrel', -11, 3, 0], ['crate', 3, 2, 0.2], ['crate', -3, -1, 0.6], ['snow_drift', 14, 5, 0], ['snow_drift', -14, -3, 1], ['rock', 15, 12, 0], ['rock', -16, 18, 2], ['rock', 9, 22, 1], ['snow_drift', 6, -3.5, 2]]) this.place(m, [x, 0, z], r);
    this.cams = [];
    for (const [x, y, z, yaw, sweep] of [[6.1, 3.4, -5.6, 2.1, 60], [-6.1, 3.4, -5.6, -0.4, 70], [1, 3.4, 8.2, Math.PI * 0.9, 80]]) {
      const c = this.place('sec_cam', [x, y, z], 0, { col: false }); const sc = new SecCam(g, c, { yaw, sweep, period: 8, range: 12, pitch: 0.4 }); g.cams.push(sc); this.cams.push(sc);
    }
    if (g.cams[2]) { const pole = this.box([0.12, 3.4, 0.12], [1, 1.7, 8.2], stdMat('pole', { color: 0x444a50, metalness: 0.6, roughness: 0.4 })); }
    // trees
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, r = 24 + rnd() * 16; const x = Math.cos(a) * r, z = Math.sin(a) * r + 2; if (Math.abs(x + 3) < 6 && z > 20) continue; this.place(rnd() < 0.3 ? 'pine_big' : 'pine', [x, 0, z], rnd() * 6, { shrink: V(0.12, 1, 0.12), scale: 0.8 + rnd() * 0.6 }); }
    for (const [x, z] of [[-14, 12], [14, 14], [-12, -18], [15, -20], [-20, 6], [20, -6], [-8, 22], [10, 26]]) this.place('pine', [x, 0, z], rnd() * 6, { shrink: V(0.12, 1, 0.12) });
    // guards (start chatting at the hut)
    this.g1 = new Guard(g, { voice: 'guard1', pos: [4.6, 0, 12.2], yaw: Math.PI / 2, night: true, fov: 70, range: 10 });
    this.g2 = new Guard(g, { voice: 'guard2', pos: [6.6, 0, 12.4], yaw: -Math.PI / 2, night: true, fov: 70, range: 10, scale: 1.05 });
    this.g3 = new Guard(g, { voice: 'guard1', pos: [8.5, 0, -2], yaw: Math.PI, night: true, fov: 70, range: 10, patrol: [[8.5, 0, -2, 2], [8.5, 0, -15, 3], [-8, 0, -16, 2], [8.5, 0, -15, 1]] });
    g.guards.push(this.g1, this.g2, this.g3);
    this.patrols = { g1: [[2.5, 0, 6, 1], [-12, 0, 6, 3], [-12, 0, -4, 2], [-7, 0, -4.5, 2.5], [-12, 0, 6, 1]], g2: [[9.0, 0, 6.5, 2], [13.5, 0, 0, 1], [13.5, 0, -6, 3], [9.0, 0, -4.5, 2.5], [13.5, 0, 0, 1]] };
    // player at the van
    const pl = g.makePlayer(); pl.place(-0.5, 0, 27.2, -Math.PI * 0.35); pl.surface = 'snow'; pl.gadgets = true; pl.camDist = 3.2;
    this.oleg = new Actor(g, 'oleg', { name: 'oleg', scale: 1.08 }); this.oleg.place(-3, 0, 29.2, Math.PI * 0.7); this.add(this.oleg.root);
    // snow pile: make snowballs
    this.snowPile = this.place('snow_drift', [-1, 0, 22], 0, { col: false });
    this.floppy = inst('floppy'); this.floppy.position.set(9.5, 0.82, 3); this.floppy.rotation.y = 0.6; this.add(this.floppy);
    this.setupInteractions();
    // steam from the hot tub
    this.every(dt => { this.steamT = (this.steamT || 0) - dt; if (this.steamT < 0) { this.steamT = 0.25; g.fx.spawn('mist', V(-10 + (Math.random() - 0.5) * 2, 0.9, -9 + (Math.random() - 0.5) * 2), { vel: V(0, 0.4, 0), life: 2.5, size: 0.4, grow: 1.2, blend: 'normal', color: 0xdde8ff }); } });
    audio.ambience('amb_wind', 0.6);
  }
  drawMines(x, s) {
    x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, 160, 110); x.fillStyle = '#000080'; x.fillRect(0, 0, 160, 10); pixText(x, 'MINESWEEPER', 4, 2, 1, '#fff');
    x.fillStyle = '#000'; x.fillRect(6, 14, 30, 12); pixText(x, '099', 8, 16, 1, '#f00'); x.fillStyle = '#000'; x.fillRect(124, 14, 30, 12); pixText(x, String(Math.min(999, 11 + Math.floor(s.t))).padStart(3, '0'), 126, 16, 1, '#f00');
    for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) { const open = ((i * 7 + j * 13) % 5) !== 0; x.fillStyle = open ? '#bdbdbd' : '#e0e0e0'; x.fillRect(8 + i * 12, 32 + j * 11, 11, 10); if (open && (i + j) % 4 === 1) pixText(x, String(1 + (i * j) % 3), 11 + i * 12, 34 + j * 11, 1, ['#00f', '#080', '#f00'][(i * j) % 3]); }
    x.fillStyle = '#ffe066'; x.fillRect(128, 84, 26, 22); pixText(x, '0451', 141, 92, 1, '#333', 'center');
  }
  hint() { return this.st.pin ? 'Service door is on the right-hand (east) side of the chalet. Keypad PIN: 0451.' : 'Get close to the guard hut at the gate and listen to the guards. The PIN is written down somewhere in the hut.'; }
  setupInteractions() {
    const g = this.game, st = this.st;
    this.interact({ pos: V(6.0, 1.2, 9.4), r: 1.3, dy: 2, label: () => st.pin ? 'Minesweeper (expert)' : 'Look at the monitor', fn: () => {
      if (!st.pin) { st.pin = true; g.bark('s_note', g.player.actor); this.objective('Go to the service door on the east side of the chalet and enter the PIN (0451)'); g.ui.message('NOTES', 'Door PIN: 0451'); }
      else { g.bark('egg_minesweeper', g.player.actor, { queue: false }); g.secret('minesweeper'); }
    } });
    this.interact({ pos: V(6.4, 1.3, -6.55), r: 1.3, dy: 2, priority: 1, cond: () => !st.open, label: 'Use the keypad (card + PIN)', fn: () => this.keypadUse() });
    this.interact({ pos: V(0, 1.2, -5.0), r: 1.6, dy: 2, label: 'Front door', fn: () => g.ui.toast('Locked, alarmed, and made of solid oak. The service entrance is on the east side.', 3) });
    this.interact({ pos: V(-6, 1.2, 16), r: 1.6, dy: 2, label: 'The snowman', fn: () => { if (g.secret('snowman')) g.bark('egg_snowman', g.player.actor); else g.bark('egg_snowman', g.player.actor, { queue: false }); } });
    this.interact({ pos: V(-10, 1.0, -9), r: 2.0, dy: 2, label: 'The hot tub', fn: () => { audio.sfx('splash', { pos: V(-10, 1, -9) }); g.bark('egg_tub', g.player.actor, { queue: false }); g.noise(V(-10, 0, -9), 6); } });
    this.interact({ pos: V(9.5, 1.0, 3), r: 1.4, dy: 2, once: true, label: 'Floppy disk on the snowmobile', fn: () => { this.floppy.visible = false; g.floppy('chalet'); } });
    this.interact({ pos: V(-1, 0.6, 22), r: 1.8, dy: 2, cond: () => !g.player.held, label: 'Make a snowball', fn: () => this.snowball() });
    this.interact({ pos: V(-5.2, 1.2, 30.5), r: 2.4, dy: 2, label: 'The van', fn: () => g.ui.toast('SWISS CHOCOLATE DELIVERY. Mr. Thomas is eating the cover story.', 3) });
    for (const sc of this.cams) this.interact({ pos: () => sc.worldPos(), r: 3.5, dy: 4, priority: -1, label: 'Security camera (spray it with compressed air)', fn: () => g.ui.toast(g.touch ? 'Aim at the camera and press AIR.' : 'Face the camera and press R to frost the lens.', 2.5) });
  }
  snowball() {
    const g = this.game; const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), stdMat('snowball', { color: 0xf4f8ff, roughness: 0.8 }));
    const p = g.player.pos; m.position.set(p.x, 1.0, p.z); m.castShadow = true; this.add(m);
    const d = this.physics.addDynamic(m, { shape: 'ball', density: 400, label: 'snowball', sound: 'step_snow', noiseRadius: 11, restitution: 0.1 }); d.opts.pick = true; d.home = m.position.clone();
    g.player.pickup(d); audio.sfx('step_snow', { vol: 0.6 });
    if (!this.sbTip) { this.sbTip = true; g.ui.toast(g.touch ? 'THROW the snowball near a guard to distract him.' : 'Throw (F / left click) near guards to distract them.', 3); }
  }
  async keypadUse() {
    const g = this.game, st = this.st;
    if (!st.pin && !st.triedPad) { st.triedPad = true; g.bark('s_needpin', g.player.actor); }
    audio.sfx('key_beep'); const ok = await Mini.keypad(g, '0451');
    if (!ok) return;
    st.open = true; audio.sfx('access'); this.serviceDoor.set(true);
    if (!st.alarms && !this.anyAlert) g.secret('ghost');
    await this.enter();
  }
  update(dt) {
    super.update(dt); const g = this.game; if (!g.player) return;
    // overhear chat when close
    if (!this.st.chatDone && !this.chatting && g.player.pos.distanceTo(this.hut.position) < 17 && !g.locked()) this.chat();
    if (g.guards.some(x => x.state === 'alert')) { this.anyAlert = true; if (!this.alertMusic) { this.alertMusic = true; audio.music('boss', 0.5); } }
    else if (this.alertMusic) { this.alertMusic = false; audio.music('stealth', 1.5); }
    for (const c of this.cams) if (c.cooldown > 5.9) this.st.alarms++;
  }
  async chat() {
    const g = this.game; this.chatting = true;
    const lines = [['g_chat1', this.g1], ['g_chat2', this.g2], ['g_chat3', this.g1], ['g_chat4', this.g2], ['g_chat5', this.g1]];
    for (const [id, gd] of lines) { if (gd.state !== 'patrol') break; gd.actor.play('talk', 0.3); await g.bark(id, gd.actor, { force: true }); gd.actor.play(gd.idleAnim, 0.3); await new Promise(r => setTimeout(r, 250)); }
    this.st.chatDone = true; this.startPatrols();
    if (!this.st.pin) this.objective('The PIN is on a sticky note on the guard hut monitor. Sneak in and read it.');
  }
  startPatrols() {
    for (const [k, gd] of [['g1', this.g1], ['g2', this.g2]]) { gd.patrol = this.patrols[k].map(p => ({ p: V(p[0], p[1], p[2]), wait: p[3] })); gd.pi = 0; gd.waitT = 0; }
  }
  onCaught() {}
  async start(cp) {
    const g = this.game, cs = g.cutscene;
    audio.music('stealth');
    if (cp === 'inside') { g.player.place(4, 0, 3, Math.PI); this.st.pin = true; this.st.chatDone = true; this.startPatrols(); this.oleg.root.visible = false; this.objective('Go to the service door on the east side of the chalet and enter the PIN (0451)'); g.ui.fade(0, 0.6); return; }
    audio.prefetchVoices(['m_01', 'm_02', 'm_03', 'm_04', 'm_05', 'm_06', 'g_chat1', 'g_chat2', 'g_chat3', 'g_chat4', 'g_chat5']);
    await cs.run(async c => {
      g.ui.fade(0, 2);
      c.shot({ pos: [-30, 18, 50], look: [0, 3, -10], fov: 38, to: { pos: [-12, 6, 34], look: [0, 3, -8] }, dur: 9, ease: 'io' });
      g.ui.chapter('CHAPTER THREE', 'Cold Boot');
      await c.wait(5.5);
      g.player.actor.lookAt(this.oleg.headPos()); this.oleg.lookAt(g.player.actor.headPos());
      c.shot({ pos: [0.8, 1.7, 26.0], look: [-3, 1.8, 29.2], fov: 34, dof: true });
      await c.say('m_01', this.oleg);
      c.shot({ pos: [-2.6, 1.75, 28.6], look: [-0.5, 1.6, 27.2], fov: 34, dof: true });
      await c.say('m_02', g.player.actor);
      c.shot({ pos: [-1.4, 2.0, 25.5], look: [3, 2, -8], fov: 40, dof: false, to: { pos: [-2.0, 2.2, 25.0], look: [5, 2.5, -8] }, dur: 8 });
      await c.say('m_03', this.oleg);
      c.shot({ pos: [-2.6, 1.75, 28.6], look: [-0.5, 1.6, 27.2], fov: 34, dof: true });
      await c.say('m_04', g.player.actor);
      c.shot({ pos: [0.8, 1.7, 26.0], look: [-3, 1.8, 29.2], fov: 30, dof: true });
      await c.say('m_05', this.oleg);
      c.shot({ pos: [-2.6, 1.75, 28.6], look: [-0.5, 1.6, 27.2], fov: 30, dof: true });
      await c.say('m_06', g.player.actor, { anim: 'shrug' });
    }, { endYaw: 0 });
    this.oleg.lookAt(null); g.player.actor.lookAt(null); this.oleg.play('idle');
    this.objective('Find the door PIN. Listen in on the guards at the gate hut.');
    g.ui.toast(g.touch ? 'SNEAK to stay hidden. ZAP guards from behind. AIR frosts cameras.' : 'C = sneak. Q = zap a guard from behind. R = compressed air (frost cameras). Snowballs distract.', 6);
    g.setCheckpoint(null);
  }
  async enter() {
    const g = this.game, cs = g.cutscene;
    await cs.run(async c => {
      c.shot({ pos: [9.5, 1.8, -4.5], look: [6.1, 1.4, -7.4], fov: 40, dof: true });
      await c.say('s_door', g.player.actor);
      await c.walk(g.player.actor, [[6.9, 0, -7.5], [5.4, 0, -7.5]], { speed: 1.4 });
      audio.sfx('door_close', { vol: 0.6 });
      await c.fade(1, 1);
    });
    g.save.unlocked = Math.max(g.save.unlocked, 4); g.persist();
    g.startLevel('vault', null);
  }
}
