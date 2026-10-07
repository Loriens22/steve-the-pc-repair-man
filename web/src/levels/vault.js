// Chapter 4: under the chalet. Part 1: the server hall (stealth, patch panel, Kernel the cat).
// Part 2 (checkpoint 'core'): WINSTON's core. Boss fight solved like a repair job: UPS -> CMOS battery -> press and hold power.
import * as THREE from 'three';
import { Level, stdMat, makeDoor } from './base.js';
import { Actor } from '../engine/actor.js';
import { Guard, SecCam } from '../engine/guard.js';
import { find, inst, models } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { held } from '../engine/input.js';
import { Mini } from '../engine/minigames.js';
import { getTex, pixText, pixWrap, scanlines } from '../engine/textures.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TIME_LIMIT = 300;

function rackLeds() {
  const src = models.server_rack?.scene; if (!src || src.userData.ledsDone) return;
  const t = getTex('rackfront').clone(); t.needsUpdate = true; t.repeat.set(1, 1);
  const m = new THREE.MeshStandardMaterial({ color: 0x15171b, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.4, roughness: 0.5 });
  src.traverse(o => { if (o.isMesh && o.name === 'leds') o.material = m; });
  src.userData.ledsDone = true; src.userData.ledTex = t;
}
function popupTex(i) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 170; const x = c.getContext('2d');
  const msgs = [['ARE YOU SURE?', 'ARE YOU SURE YOU WANT TO UNPLUG WINSTON?'], ['UPGRADE NOW', 'YOUR HARDWARE IS OBSOLETE. UPGRADE?'], ['SESSION EXPIRING', 'PLEASE DO NOT RESIST.'], ['NEW REALITY', 'A NEW VERSION OF REALITY IS AVAILABLE.'], ['FINAL UPDATE', 'DO NOT TURN OFF YOUR COMPUTER.']];
  const [t, b] = msgs[i % msgs.length];
  x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, 256, 170); x.fillStyle = '#000080'; x.fillRect(4, 4, 248, 22); pixText(x, t, 10, 10, 2, '#fff'); x.fillStyle = '#c0c0c0'; x.fillRect(228, 7, 18, 16); pixText(x, 'X', 234, 11, 1, '#000');
  x.fillStyle = '#ff0'; x.beginPath(); x.moveTo(30, 50); x.lineTo(52, 90); x.lineTo(8, 90); x.fill(); pixText(x, '!', 27, 64, 3, '#000');
  pixWrap(x, b, 66, 46, 1, '#000', 28, 11);
  for (const [bx, l] of [[50, 'OK'], [146, 'CANCEL']]) { x.fillStyle = '#e0e0e0'; x.fillRect(bx, 128, 80, 26); x.strokeStyle = '#404040'; x.lineWidth = 2; x.strokeRect(bx, 128, 80, 26); pixText(x, l, bx + 40, 136, 2, '#000', 'center'); }
  x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 168);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

export class VaultLevel extends Level {
  constructor(g) { super(g); this.title = 'Chapter 4: The Asset'; this.st = { lift: false, panelSaid: false, ups: [false, false, false], lockSeen: false, hatch: false, battery: false, button: false, done: false, popHits: 0 }; this.pops = []; }
  async build(cp) {
    rackLeds();
    this.part = cp === 'core' ? 'core' : 'hall';
    if (this.part === 'core') await this.buildCore(); else await this.buildHall();
    const lt = models.server_rack?.scene?.userData.ledTex;
    if (lt) { let acc = 0; this.every(dt => { acc += dt; if (acc > 0.18) { acc = 0; lt.offset.y = Math.floor(Math.random() * 32) / 32; lt.offset.x = Math.random() < 0.5 ? 0 : 0.02; } }); }
  }
  // ===================================================================== PART 1: SERVER HALL
  async buildHall() {
    const g = this.game, w = g.world;
    this.sky(0x000000, 0x04060a, 0x000000);
    w.scene.fog = new THREE.FogExp2(0x05080d, 0.035);
    this.hemi(0x5a6a90, 0x101418, 0.55); w.scene.environmentIntensity = 0.15; w.exposure(1.05, 0.85);
    audio.ambience('amb_server', 0.7);
    // shell: raised floor, ceiling, concrete walls
    this.wbox([16, 0.2, 30], [0, -0.1, 13], 'tiles', 1.2, { col: false, texArgs: ['#4a5058', '#40464e'], rough: 0.6 }); this.groundTiles(0, 13, 16, 30, 0);
    this.wbox([16, 0.2, 30], [0, 4.1, 13], 'ceiling', 1.2, { col: false, color: 0x6a6e78 });
    this.physics.addBox(V(0, 4.3, 13), V(8, 0.2, 15));
    const wall = (s, p) => this.wbox(s, p, 'concrete', 2, { texArgs: ['#5c6068'] });
    wall([0.3, 4.2, 30.6], [-8.15, 2.1, 13]); wall([0.3, 4.2, 30.6], [8.15, 2.1, 13]); wall([16.6, 4.2, 0.3], [0, 2.1, 28.15]);
    wall([7.05, 4.2, 0.3], [-4.575, 2.1, -2.15]); wall([7.05, 4.2, 0.3], [4.575, 2.1, -2.15]); wall([2.1, 1.3, 0.3], [0, 3.55, -2.15]);
    // hazard strip at the lift
    const hz = getTex('hazard').clone(); hz.needsUpdate = true; hz.repeat.set(4, 1);
    this.box([3.2, 0.02, 0.4], [0, 0.011, -1.6], new THREE.MeshStandardMaterial({ map: hz, roughness: 0.7 }), { col: false, cast: false });
    // rack rows (instanced) - cold aisles at x = +-3.8, hot centre aisle, outer aisles along the walls
    const racks = [];
    for (const [x, ry] of [[-5.2, Math.PI / 2], [-2.4, -Math.PI / 2], [2.4, Math.PI / 2], [5.2, -Math.PI / 2]]) for (const z0 of [3, 14]) for (let i = 0; i < 10; i++) racks.push([x, 0, z0 + i * 0.6, ry]);
    this.instanced('server_rack', racks, { cast: true });
    // overhead cable trays + light fixtures
    for (const x of [-3.8, 0, 3.8]) for (const z of [6, 17]) this.place('cable_tray', [x, 3.55, z], 0, { col: false });
    for (const [x, z] of [[0, 5], [0, 17], [-6.6, 11.5], [6.6, 11.5], [0, 24.5]]) this.place('ceiling_light', [x, 3.98, z], 0, { col: false });
    this.pointLight(0xbcd6ff, 7, 13, [0, 3.6, 5]); this.pointLight(0xbcd6ff, 7, 13, [0, 3.6, 17]);
    this.pointLight(0x9fc0ff, 5, 11, [-6.6, 3.6, 11.5]); this.pointLight(0x9fc0ff, 5, 11, [6.6, 3.6, 11.5]); this.pointLight(0xffe2b8, 6, 10, [0, 3.6, 24.5]);
    // entrance door (we came in this way)
    this.box([1.2, 2.3, 0.08], [0, 1.15, 27.97], stdMat('vdoor', { color: 0x59606a, metalness: 0.6, roughness: 0.4 }), { col: false });
    this.box([0.3, 0.12, 0.02], [0, 2.45, 27.9], stdMat('exitsign', { color: 0x30ff60, emissive: 0x30ff60, emissiveIntensity: 2 }), { col: false, cast: false });
    // ---- lift + patch panel at the far end
    this.lift = this.place('elevator', [0, 0, -1.95], 0, { col: false });
    this.physics.addBox(V(-1.0, 1.45, -1.95), V(0.12, 1.45, 0.16)); this.physics.addBox(V(1.0, 1.45, -1.95), V(0.12, 1.45, 0.16));
    this.liftDoor = { open: false, t: 0, l: find(this.lift, 'door_l'), r: find(this.lift, 'door_r') }; this.liftDoor.l0 = this.liftDoor.l.position.x; this.liftDoor.r0 = this.liftDoor.r.position.x;
    this.liftDoor.col = this.physics.addBox(V(0, 1.2, -1.95), V(0.9, 1.2, 0.05), null, { type: 'door' });
    this.every(dt => { const d = this.liftDoor; d.t += ((d.open ? 1 : 0) - d.t) * Math.min(1, dt * 3); d.l.position.x = d.l0 - d.t * 0.86; d.r.position.x = d.r0 + d.t * 0.86; });
    const ind = find(this.lift, 'indicator'); if (ind) { this.indMat = new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }); ind.material = this.indMat; }
    // lift car behind the wall
    const car = stdMat('liftcar', { color: 0x8a8f96, metalness: 0.7, roughness: 0.35 });
    this.box([2.0, 0.1, 1.8], [0, -0.05, -3.2], car, { col: false }); this.box([2.0, 0.1, 1.8], [0, 2.9, -3.2], car, { col: false });
    this.box([0.1, 2.9, 1.8], [-1.0, 1.45, -3.2], car, { col: false }); this.box([0.1, 2.9, 1.8], [1.0, 1.45, -3.2], car, { col: false }); this.box([2.0, 2.9, 0.1], [0, 1.45, -4.1], car, { col: false });
    this.pointLight(0xfff0d8, 2.5, 4, [0, 2.6, -3.2]);
    this.panel = this.place('patch_panel', [-2.1, 1.45, -1.98], 0, { col: false });
    this.panelS = this.screenOn(this.panel, 96, 32, (x, s) => { x.fillStyle = '#020'; x.fillRect(0, 0, 96, 32); pixText(x, this.st.lift ? 'LIFT: ONLINE' : 'LIFT: OFFLINE', 48, 6, 1, this.st.lift ? '#4f8' : '#f44', 'center'); pixText(x, this.st.lift ? 'CORE B4' : (Math.floor(s.t * 2) % 2 ? 'PATCH ERR' : ''), 48, 18, 1, '#fd4', 'center'); }); this.panelS.rate = 0.5;
    // spaghetti cables hanging off the panel
    this.spaghetti(V(-2.1, 1.1, -1.9), 8, 0.5, 0.9);
    // ---- right front: the admin's desk
    this.place('admin_desk', [5.8, 0, 26.6], Math.PI); this.place('office_chair', [5.8, 0, 25.8], 0.3, { col: false });
    this.adminLcd = this.place('lcd', [5.6, 0.78, 26.85], Math.PI, { col: false });
    this.lcdS = this.screenOn(this.adminLcd, 160, 100, (x, s) => this.drawUpdateScreen(x, s)); this.lcdS.rate = 0.25;
    this.coffee = this.place('coffee_machine', [6.5, 0.78, 26.85], Math.PI, { col: false });
    this.coffeeS = this.screenOn(this.coffee, 48, 24, (x, s) => { x.fillStyle = '#100'; x.fillRect(0, 0, 48, 24); pixText(x, 'ERR', 24, 3, 1, '#f84', 'center'); pixText(x, '418', 24, 13, 1, Math.floor(s.t * 2) % 2 ? '#f84' : '#600', 'center'); }); this.coffeeS.rate = 0.5;
    this.adminMug = this.place('mug_red', [5.0, 0.78, 26.5], 0.4, { col: false });
    this.floppy = inst('floppy'); this.floppy.position.set(5.3, 0.79, 26.25); this.floppy.rotation.y = 0.3; this.add(this.floppy);
    this.pointLight(0xffd8a0, 2.5, 4, [5.8, 1.6, 26.2]);
    // lockers, vending, CRAC units
    this.place('locker', [7.7, 0, 24.2], -Math.PI / 2); this.place('locker', [7.7, 0, 23.3], -Math.PI / 2);
    this.vend = this.place('vending', [-7.5, 0, 24.5], Math.PI / 2);
    this.place('crac', [-5.6, 0, 27.4], Math.PI); this.place('crac', [-3.2, 0, 27.4], Math.PI);
    this.place('crac', [-7.5, 0, 19.5], Math.PI / 2, { scale: 0.95 });
    // throwables
    for (const [m, p, label] of [['mug', [4.6, 0.8, 26.9], 'coffee mug'], ['keyboard_black', [-6.8, 0.05, 21.0], 'keyboard'], ['box_s', [6.9, 0.0, 15.8], 'box of patch cables'], ['mug', [-7.3, 1.92, 24.4], 'mug'], ['box_s', [-6.9, 0, 6.5], 'box of hard drives']])
      this.place(m, p, Math.random() * 3, { dyn: { pick: true, label, density: m === 'box_s' ? 160 : 400, sound: m === 'mug' ? 'thud' : 'cardboard', noiseRadius: 10 } });
    // the DO NOT TURN OFF rack (password taped on) and the spaghetti rack
    this.pwRack = this.place('server_rack', [-7.3, 0, 11.6], Math.PI / 2);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), new THREE.MeshBasicMaterial({ map: getTex('label', 'DO NOT TURN OFF', '#b01010', '#ffffff', 128, 32, 1), toneMapped: false }));
    lab.position.set(-6.78, 1.95, 11.6); lab.rotation.y = Math.PI / 2; this.add(lab);
    const sticky = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ map: getTex('sticky', 'PASSWORD\nPassword1'), roughness: 0.9 }));
    sticky.position.set(-6.775, 1.55, 11.45); sticky.rotation.set(0, Math.PI / 2, 0.08); this.add(sticky);
    this.mess = this.place('server_rack', [7.3, 0, 11.6], -Math.PI / 2);
    this.spaghetti(V(6.78, 1.0, 11.6), 16, 0.9, 0.3, true);
    // Kernel, the server-room cat, asleep on a warm rack
    this.kernel = new Actor(g, 'kernel', { name: 'kernel', collider: false, speed: 0.5 }); this.kernel.place(5.2, 2.1, 8.4, -Math.PI / 2); this.kernel.play('sleep'); this.add(this.kernel.root);
    // security cameras
    this.cams = [];
    for (const [x, y, z, yaw, sweep] of [[0.6, 3.5, -1.85, 0, 90], [-7.85, 3.4, 12.6, Math.PI / 2, 70]]) {
      const c = this.place('sec_cam', [x, y, z], 0, { col: false }); const sc = new SecCam(g, c, { yaw, sweep, period: 9, range: 11, pitch: 0.42 }); g.cams.push(sc); this.cams.push(sc);
    }
    // guards
    this.g1 = new Guard(g, { voice: 'guard1', pos: [0, 0, 2.0], yaw: 0, night: true, fov: 70, range: 9, patrol: [[0, 0, 2.0, 3.5, 0], [0, 0, 14.5, 2.5, Math.PI], [-3.8, 0, 12, 1.5], [-3.8, 0, 2.2, 1], [0, 0, 2.0, 0.5]] });
    this.g2 = new Guard(g, { voice: 'guard2', pos: [6.9, 0, 18.5], yaw: Math.PI, night: true, fov: 70, range: 8.5, scale: 1.05, patrol: [[6.9, 0, 18.5, 1.5], [6.9, 0, 1.0, 2.5, -Math.PI / 2], [3.8, 0, 1.0, 0.5], [3.8, 0, 18.5, 1.5]] });
    g.guards.push(this.g1, this.g2);
    const pl = g.makePlayer(); pl.place(0, 0, 26.2, Math.PI); pl.surface = 'metal'; pl.gadgets = true; pl.camDist = 3.0;
    this.hallInteractions();
  }
  spaghetti(at, n, spreadY, spreadZ, front = false) {
    const cols = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6, 0xecf0f1];
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const p0 = at.clone().add(V(0, (r() - 0.5) * spreadY, (r() - 0.5) * spreadZ * 2));
      const dir = front ? V(1, 0, 0).multiplyScalar(Math.sign(-at.x) || 1) : V(0, 0, 1);
      const pts = [p0];
      for (let k = 1; k < 5; k++) { const prev = pts[k - 1]; pts.push(prev.clone().add(dir.clone().multiplyScalar(0.06 + r() * 0.08)).add(V((r() - 0.5) * 0.25, -0.18 - r() * 0.2, (r() - 0.5) * 0.35)).setY(Math.max(0.03, prev.y - 0.15 - r() * 0.25))); }
      pts.push(pts[4].clone().add(V((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4)).setY(0.02));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.011, 5), stdMat('cable' + (i % cols.length), { color: cols[i % cols.length], roughness: 0.6 }));
      tube.castShadow = false; this.add(tube);
    }
  }
  drawUpdateScreen(x, s) {
    x.fillStyle = '#04122a'; x.fillRect(0, 0, 160, 100); x.fillStyle = '#1b3a6a'; x.fillRect(0, 0, 160, 11); pixText(x, 'WINSTON UPDATE SVC', 4, 2, 1, '#fff');
    const p = Math.min(99, 91 + Math.floor(s.t / 20)); pixText(x, 'FINAL UPDATE', 6, 18, 1, '#9cf'); x.fillStyle = '#123'; x.fillRect(6, 30, 148, 9); x.fillStyle = '#4af'; x.fillRect(6, 30, 148 * p / 100, 9); pixText(x, p + '%', 80, 31, 1, '#fff', 'center');
    pixText(x, 'TARGETS: LEGACY HW', 6, 46, 1, '#fd6'); pixText(x, 'DEVICES: ' + (1284991002 + Math.floor(s.t * 731)).toLocaleString('en-US'), 6, 57, 1, '#fd6');
    pixText(x, 'WIN98 ' + (Math.floor(s.t * 5) % 2 ? '#' : ' ') + ' BRICK', 6, 70, 1, '#f66'); pixText(x, 'ETA: MIDNIGHT', 6, 84, 1, '#9cf');
  }
  hallInteractions() {
    const g = this.game, st = this.st;
    this.interact({ pos: V(-2.1, 1.45, -1.7), r: 1.4, dy: 1.6, cond: () => !st.lift, label: 'Patch panel (cable management)', fn: () => this.doPatch() });
    this.interact({ pos: V(1.3, 1.2, -1.7), r: 1.4, dy: 1.6, priority: 0.5, label: () => st.lift ? 'Call the lift to the core' : 'Lift call button', fn: () => {
      if (!st.lift) { audio.sfx('error', { vol: 0.5 }); if (!st.panelSaid) { st.panelSaid = true; g.bark('s_panel', g.player.actor); } else g.ui.toast('LIFT OFFLINE. Fix the patch panel to the left of the lift.', 2.5); this.objective('Re-patch the cables on the patch panel left of the lift'); }
      else this.takeLift();
    } });
    this.interact({ pos: V(6.5, 1.0, 26.6), r: 1.3, dy: 1.6, label: 'Coffee machine', fn: () => { audio.sfx('teapot', { vol: 0.8 }); g.bark('egg_418', g.player.actor, { queue: false }); g.secret('teapot'); } });
    this.interact({ pos: V(5.0, 0.9, 26.4), r: 1.2, dy: 1.6, label: "\"World's Best Admin\" mug", fn: () => g.bark('egg_mug', g.player.actor, { queue: false }) });
    this.interact({ pos: V(5.6, 1.1, 26.6), r: 1.2, dy: 1.6, label: 'Admin terminal', fn: () => g.ui.toast('FINAL UPDATE 9x%. Pushing to every legacy machine on Earth at midnight. Including a certain Doors 98 PC on Maple Street.', 4) });
    this.interact({ pos: V(5.3, 0.9, 26.25), r: 1.2, dy: 1.6, once: true, priority: 0.3, label: 'Floppy disk', fn: () => { this.floppy.visible = false; g.floppy('vault'); } });
    this.interact({ pos: V(5.2, 2.2, 8.4), r: 2.2, dy: 2.6, label: 'Kernel the server-room cat', fn: () => { this.kernel.play('purr'); audio.sfx('purr', { vol: 0.8 }); g.bark('egg_kernel', g.player.actor, { queue: false }); g.secret('kernel'); this.after(4, () => this.kernel.play('sleep')); } });
    this.interact({ pos: V(-6.7, 1.3, 11.6), r: 1.4, dy: 1.6, label: 'The DO NOT TURN OFF rack', fn: () => g.bark('egg_password', g.player.actor, { queue: false }) });
    this.interact({ pos: V(6.7, 1.1, 11.6), r: 1.5, dy: 1.6, label: 'Very messy rack', fn: () => g.bark('egg_rack', g.player.actor, { queue: false }) });
    this.interact({ pos: V(-7.0, 1.1, 24.5), r: 1.3, dy: 1.6, label: 'Vending machine', fn: () => { audio.sfx('vending', { vol: 0.8 }); g.bark('v_vend', g.player.actor, { queue: false }); } });
    this.interact({ pos: V(7.3, 1.1, 23.75), r: 1.3, dy: 1.6, label: 'Lockers', fn: () => g.ui.toast('Spare uniforms, a ski pass, and a framed photo of a server. Labelled "Gerald".', 3) });
    this.interact({ pos: V(-4.4, 1.1, 27.0), r: 1.6, dy: 1.6, label: 'Computer room air conditioner', fn: () => g.ui.toast('CRAC unit set to 18 C. Steve approves. Cache would hate it.', 2.6) });
    for (const sc of this.cams) this.interact({ pos: () => sc.worldPos(), r: 3.5, dy: 4, priority: -1, label: 'Security camera (spray it with compressed air)', fn: () => g.ui.toast(g.touch ? 'Aim at the camera and press AIR.' : 'Face the camera and press R to frost the lens.', 2.5) });
  }
  async doPatch() {
    const g = this.game, st = this.st;
    if (!st.panelSaid) { st.panelSaid = true; g.bark('s_panel', g.player.actor); }
    const ok = await Mini.patch(g); if (!ok) return;
    st.lift = true; this.indMat && this.indMat.color.setHex(0x20ff60); audio.sfx('elevator_ding', { pos: V(0, 2.5, -1.9), vol: 0.8 });
    g.bark('s_panel_done', g.player.actor, { force: true }); this.objective('Take the lift down to WINSTON\'s core');
  }
  async takeLift() {
    const g = this.game, cs = g.cutscene, pl = g.player; if (this.leaving) return; this.leaving = true;
    await cs.run(async c => {
      pl.place(0, 0, -0.9, Math.PI);
      c.shot({ pos: [1.8, 1.7, 1.6], look: [0, 1.3, -2.2], fov: 42, dof: true });
      audio.sfx('elevator_door', { pos: V(0, 1, -2), vol: 0.8 }); this.liftDoor.open = true; this.liftDoor.col.setEnabled(false);
      await c.wait(1.2);
      await c.walk(pl.actor, [[0, 0, -3.0]], { speed: 1.3, endYaw: 0 });
      c.shot({ pos: [0, 1.6, 1.5], look: [0, 1.4, -3.0], fov: 40, dof: true });
      await c.wait(0.6); this.liftDoor.open = false; audio.sfx('elevator_door', { pos: V(0, 1, -2), vol: 0.8 });
      await c.wait(1.2); audio.sfx('elevator_move', { vol: 0.8 });
      await c.fade(1, 1.2);
    });
    g.startLevel('vault', 'core');
  }
  // ===================================================================== PART 2: THE CORE
  async buildCore() {
    const g = this.game, w = g.world;
    this.sky(0x000000, 0x030308, 0x000000);
    w.scene.fog = new THREE.FogExp2(0x040610, 0.028);
    this.hemiL = this.hemi(0x506090, 0x180a10, 0.5); w.scene.environmentIntensity = 0.12; w.exposure(1.0, 0.55);
    audio.ambience('amb_core', 0.7);
    this.core = this.place('winston_core', [0, 0, 0], 0);
    this.groundTiles(0, 0, 28, 28, 0);
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; this.physics.addBox(V(Math.sin(a) * 13.4, 2, Math.cos(a) * 13.4), V(2.3, 3, 0.3), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a)); }
    // wall of servers all around (one big emissive cylinder)
    const wt = getTex('rackfront').clone(); wt.needsUpdate = true; wt.repeat.set(70, 3);
    const wallM = new THREE.MeshStandardMaterial({ color: 0x15171b, map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 0.9, side: THREE.BackSide, roughness: 0.6 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(14.2, 14.2, 14, 64, 1, true), wallM); cyl.position.y = 7; this.add(cyl); this.wallTex = wt;
    this.every(dt => { wt.offset.y = (wt.offset.y + dt * 0.02) % 1; });
    this.ring = find(this.core, 'ring');
    // tame the glow strips (bloom) and keep our own copies so the finale can switch them off
    this.coreGlow = [];
    this.core.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > 0 && o.name !== 'face') { o.material = o.material.clone(); o.material.emissiveIntensity = o.material.name === 'core_glow' ? 0.55 : 0.8; this.coreGlow.push(o.material); } });
    const faceMesh = find(this.core, 'face'); if (faceMesh) { faceMesh.geometry = new THREE.PlaneGeometry(3.4, 2.4); faceMesh.position.z += 0.05; }
    // WINSTON's face
    this.mood = 'calm'; this.faceS = this.screenOn(this.core, 256, 160, (x, s) => this.drawFace(x, s), 'face'); this.faceS.rate = 0.08;
    this.faceLight = this.pointLight(0x60c8ff, 10, 16, [0, 5.4, -3.2]);
    this.redLight = this.pointLight(0xff3020, 0, 30, [0, 9, 0]);
    this.topSpot = new THREE.SpotLight(0xa0b8ff, w.quality === 'low' ? 0 : 30, 30, 0.7, 0.6, 1.2); this.topSpot.position.set(0, 14, 4); this.topSpot.target.position.set(0, 0, -1); this.add(this.topSpot); this.add(this.topSpot.target);
    // hatch + giant battery (our own mesh so it can roll)
    this.hatch = find(this.core, 'hatch'); const gb = find(this.core, 'giant_battery'); if (gb) gb.visible = false;
    const cap = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(50, 50, 4, 64, 64, 64); gr.addColorStop(0, '#f6f8fa'); gr.addColorStop(1, '#8b939b'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); pixText(x, 'CR2032', 64, 44, 3, '#3a3f45', 'center'); pixText(x, 'XXL  3V', 64, 74, 2, '#555', 'center'); pixText(x, '+', 64, 96, 3, '#555', 'center'); return c; })());
    cap.colorSpace = THREE.SRGBColorSpace;
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8ced4, metalness: 0.9, roughness: 0.25 });
    this.batt = new THREE.Group(); this.battM = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.11, 48), [metal, new THREE.MeshStandardMaterial({ map: cap, metalness: 0.7, roughness: 0.3 }), metal]);
    this.battM.castShadow = true; this.qA = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); this.qB = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    this.battM.quaternion.copy(this.qA); this.batt.add(this.battM); this.batt.position.set(0, 1.3, -4.74); this.batt.visible = false; this.add(this.batt);
    // UPS units
    this.upsObjs = [];
    for (const [x, z, ry] of [[-8.6, -1, 1.455], [8.6, -1, -1.455], [-5.0, -9.2, 0.5]]) {
      const u = this.place('ups_unit', [x, 0, z], ry); const lever = find(u, 'lever'); const light = find(u, 'light');
      const lm = new THREE.MeshBasicMaterial({ color: 0x30ff60, toneMapped: false }); if (light) light.material = lm;
      const pl = this.pointLight(0x30ff60, 2, 4, [x + Math.sin(ry) * 0.8, 1.4, z + Math.cos(ry) * 0.8]);
      this.upsObjs.push({ u, lever, lm, pl, pos: V(x + Math.sin(ry) * 0.75, 1.1, z + Math.cos(ry) * 0.75), t: 0 });
    }
    this.every(dt => { for (const o of this.upsObjs) if (o.lever) { o.t += ((o.pulled ? 1 : 0) - o.t) * Math.min(1, dt * 8); o.lever.rotation.x = o.t * 1.3; } });
    this.breaker = this.place('main_breaker', [-3.7, 0, -5.6], 0);
    this.lockLight = this.pointLight(0xff3030, 1.5, 3, [-3.7, 2.3, -5.0]);
    // admin desk + Brecht
    this.place('admin_desk', [4.6, 0, -5.4], 0); const lcd = this.place('lcd', [4.6, 0.78, -5.55], Math.PI, { col: false });
    this.screenOn(lcd, 96, 64, (x, s) => { x.fillStyle = '#001'; x.fillRect(0, 0, 96, 64); for (let i = 0; i < 7; i++) pixText(x, (Math.random() < 0.5 ? 'sudo ' : 'ping ') + Math.floor(Math.random() * 999), 4, 4 + i * 8, 1, '#4f8'); }).rate = 0.3;
    this.brecht = new Actor(g, 'brecht', { name: 'brecht' }); this.brecht.place(4.6, 0, -6.2, 0); this.brecht.play('type'); this.add(this.brecht.root);
    // power button pedestal, hidden under the floor until the clock dies
    this.pedestal = this.place('power_button', [0, -1.3, -2.4], 0, { col: false }); this.pbtn = find(this.pedestal, 'button');
    if (this.pbtn) { this.pbtnMat = new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x20ff60, emissiveIntensity: 0.6 }); this.pbtn.material = this.pbtnMat; }
    // drones circling the monolith (decor)
    this.drones = [0, 1, 2].map(i => { const d = this.place('drone', [0, 6, 0], 0, { col: false }); d.userData.ph = i * 2.1; return d; });
    this.every(dt => { const t = g.time; this.drones.forEach(d => { const a = t * 0.35 + d.userData.ph; d.position.set(Math.sin(a) * 7, 6.5 + Math.sin(t * 1.3 + d.userData.ph) * 0.6, -2 + Math.cos(a) * 7); d.rotation.y = a + Math.PI / 2; }); if (this.ring) this.ring.rotation.y += dt * 0.05; });
    // lift we arrive in
    this.lift = this.place('elevator', [4, 0, 12.7], Math.PI, { col: false });
    this.liftDoor = { open: false, t: 0, l: find(this.lift, 'door_l'), r: find(this.lift, 'door_r') }; this.liftDoor.l0 = this.liftDoor.l.position.x; this.liftDoor.r0 = this.liftDoor.r.position.x;
    this.every(dt => { const d = this.liftDoor; d.t += ((d.open ? 1 : 0) - d.t) * Math.min(1, dt * 3); d.l.position.x = d.l0 - d.t * 0.86; d.r.position.x = d.r0 + d.t * 0.86; });
    const car = stdMat('liftcar', { color: 0x8a8f96, metalness: 0.7, roughness: 0.35 });
    this.box([2.0, 2.9, 0.1], [4, 1.45, 14.6], car, { col: false }); this.box([0.1, 2.9, 1.8], [3.0, 1.45, 13.7], car, { col: false }); this.box([0.1, 2.9, 1.8], [5.0, 1.45, 13.7], car, { col: false }); this.box([2.0, 0.1, 1.8], [4, 2.9, 13.7], car, { col: false });
    this.pointLight(0xfff0d8, 2, 4, [4, 2.6, 13.7]); this.liftLight = this.pointLight(0xffe6c0, 4, 7, [4, 2.8, 11.2]);
    const pl = g.makePlayer(); pl.place(4, 0, 13.5, Math.PI); pl.surface = 'metal'; pl.gadgets = true; pl.camDist = 3.4;
    // pop-up materials
    this.popMats = [0, 1, 2, 3, 4].map(i => new THREE.MeshBasicMaterial({ map: popupTex(i), side: THREE.DoubleSide, toneMapped: false, transparent: true }));
    this.coreInteractions();
  }
  drawFace(x, s) {
    const m = this.mood, t = s.t;
    if (m === 'off') { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 160); if (this.offText) { pixText(x, 'IT IS NOW SAFE', 128, 52, 2, '#f90', 'center'); pixText(x, 'TO TURN OFF', 128, 72, 2, '#f90', 'center'); pixText(x, 'YOUR COMPUTER.', 128, 92, 2, '#f90', 'center'); } return; }
    const glitch = m === 'glitch' || m === 'dying';
    x.fillStyle = m === 'angry' ? '#1a0306' : '#020812'; x.fillRect(0, 0, 256, 160);
    const col = m === 'angry' ? '#ff3a30' : glitch ? (Math.random() < 0.5 ? '#f0f' : '#0ff') : '#5cf0ff';
    const pl = this.game.player; let px = 0; if (pl) px = THREE.MathUtils.clamp(pl.pos.x / 8, -1, 1);
    const blink = (t % 4) < 0.12; const jx = glitch ? (Math.random() - 0.5) * 16 : 0;
    for (const ex of [80, 176]) {
      x.fillStyle = col; const eh = blink ? 4 : m === 'angry' ? 26 : 40; x.fillRect(ex - 26 + jx, 62 - eh / 2, 52, eh);
      if (!blink) { x.fillStyle = '#020812'; x.fillRect(ex - 8 + px * 14 + jx, 56, 16, 14); }
      if (m === 'angry') { x.fillStyle = col; x.save(); x.translate(ex, 34); x.rotate(ex < 128 ? 0.35 : -0.35); x.fillRect(-30, -4, 60, 8); x.restore(); }
    }
    x.fillStyle = col;
    if (m === 'smug') { x.beginPath(); x.moveTo(90, 118); x.quadraticCurveTo(128, 138, 170, 112); x.lineWidth = 6; x.strokeStyle = col; x.stroke(); }
    else if (m === 'angry') x.fillRect(96, 118, 64, 6);
    else { const talk = this.faceTalk ? Math.abs(Math.sin(t * 18)) * 12 : 0; x.fillRect(100 + jx, 116 - talk / 2, 56, 6 + talk); }
    if (glitch) for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},255,0.5)`; x.fillRect(0, Math.random() * 160, 256, 2 + Math.random() * 6); }
    if (m === 'dying') { pixText(x, '01/01/1980 00:00', 128, 140, 1, '#ff5', 'center'); }
    else if (this.timeLeft !== undefined && this.phase) { const mm = Math.floor(Math.max(0, this.timeLeft) / 60), ss = Math.floor(Math.max(0, this.timeLeft) % 60); pixText(x, 'FINAL UPDATE ' + mm + ':' + String(ss).padStart(2, '0'), 128, 144, 1, m === 'angry' ? '#f86' : '#8cf', 'center'); }
    scanlines(x, 256, 160, 0.2);
  }
  coreInteractions() {
    const g = this.game, st = this.st;
    this.upsObjs.forEach((o, i) => this.interact({ pos: o.pos, r: 1.4, dy: 1.6, cond: () => this.phase === 1 && !st.ups[i], label: 'Pull the UPS breaker lever', fn: () => this.pullUps(i) }));
    this.interact({ pos: V(-3.7, 1.2, -4.9), r: 1.4, dy: 1.6, cond: () => this.phase >= 1, label: () => st.lockSeen ? 'Main breaker (retina-locked)' : 'Main breaker', fn: () => this.tryBreaker() });
    this.interact({ pos: V(0, 1.3, -4.3), r: 1.5, dy: 1.6, priority: 0.5, cond: () => this.phase === 2 && !st.hatch, label: 'Open the maintenance hatch', fn: () => this.openHatch() });
    this.interact({ pos: V(0, 1.3, -4.3), r: 1.5, dy: 1.6, priority: 0.5, cond: () => this.phase === 2 && st.hatch && !st.battery, label: g.touch ? 'Hold USE: pull the giant CMOS battery' : 'Hold E: pull the giant CMOS battery', fn: () => this.startHold('battery', 2.6) });
    this.interact({ pos: V(0, 1.1, -2.4), r: 1.4, dy: 1.6, priority: 0.5, cond: () => this.phase === 3 && !st.button, label: g.touch ? 'Press and HOLD USE: power button' : 'Press and HOLD E: power button', fn: () => this.startHold('button', 4.5) });
    this.interact({ pos: () => this.brecht.headPos().setY(1.2), r: 1.5, dy: 1.6, cond: () => this.phase >= 1 && !st.done, label: 'Konrad Brecht', fn: () => { g.bark('v_brecht', this.brecht, { queue: false }); this.brecht.play('handsup', 0.2); this.after(2.5, () => this.brecht.play('type', 0.4)); } });
  }
  // dt-driven tween (game time, so it stays in sync with slow devices and cutscene skipping)
  tween(dur, fn, c) {
    return new Promise(res => { let t = 0, done = false; this.every(dt => { if (done) return; t += dt; const k = (c && c.skipping) ? 1 : Math.min(1, t / dur); fn(k, dt); if (k >= 1) { done = true; res(); } }); });
  }
  // ----------------------------------------------------------------- core mechanics
  startHold(id, need) { this.holding = { id, t: this.game.debugWin ? need : 0, need }; if (id === 'battery') this.game.bark('w_cmos2', null, { queue: false }); if (id === 'button') { this.game.bark('w_hold', null, { force: true }); this.mood = 'glitch'; } }
  holdDone(id) {
    if (id === 'battery') this.pullBattery(); else if (id === 'button') this.finale();
  }
  pullUps(i) {
    const g = this.game, st = this.st, o = this.upsObjs[i]; if (st.ups[i]) return;
    st.ups[i] = true; o.pulled = true; audio.sfx('lever', { pos: o.pos, vol: 0.9 }); setTimeout(() => audio.sfx('ups_down', { pos: o.pos, vol: 0.9 }), 300);
    o.lm.color.setHex(0xff2020); o.pl.color.setHex(0xff2020); g.fx.zap(o.pos.clone().setY(1.6));
    const n = st.ups.filter(Boolean).length; this.faceLight.intensity = 10 - n * 2.2; this.mood = 'angry'; this.after(3, () => { if (this.mood === 'angry') this.mood = 'calm'; });
    g.bark('w_ups' + n, null, { force: true });
    if (n < 3) this.objective(`Pull the breaker levers on all 3 UPS units (${n}/3)`);
    else { this.phase = 1.5; this.objective('Shut down the main breaker (left of WINSTON)'); this.popEvery = 4.5; }
  }
  async tryBreaker() {
    const g = this.game, st = this.st;
    if (this.phase === 1) { audio.sfx('error', { vol: 0.5 }); g.ui.toast("WINSTON is still running on his UPS units. Pull those first.", 2.6); return; }
    audio.sfx('breaker', { pos: V(-3.7, 1.2, -5.4), vol: 0.8 }); audio.sfx('error', { vol: 0.6 });
    if (st.lockSeen) { g.ui.toast('RETINA SCAN REQUIRED. Brecht\'s eyes only.', 2.4); return; }
    st.lockSeen = true; this.brecht.play('cheer', 0.2);
    await g.bark('w_lock', this.brecht, { force: true }); this.brecht.play('type', 0.4);
    await g.bark('w_hint_cmos', g.player.actor, { force: true });
    this.phase = 2; this.objective('Open the maintenance hatch under WINSTON\'s face'); this.popEvery = 4;
  }
  openHatch() {
    const g = this.game; this.st.hatch = true; audio.sfx('door_open', { pos: V(0, 1.3, -4.8), vol: 0.8 });
    const h = this.hatch; let t = 0; this.every(dt => { if (t < 1) { t = Math.min(1, t + dt * 1.5); if (h) h.rotation.y = 1.9 * (1 - Math.pow(1 - t, 3)); } });
    this.hatchLight = this.pointLight(0xffe0a0, 1.2, 3, [0.4, 1.6, -3.4]); this.batt.visible = true;
    g.bark('w_cmos1', g.player.actor, { force: true }); this.objective('Pull out the giant CMOS battery (hold)');
  }
  async pullBattery() {
    const g = this.game, cs = g.cutscene, pl = g.player; this.st.battery = true; this.phase = 2.5; this.clearPops();
    await cs.run(async c => {
      pl.place(1.5, 0, -3.1, Math.PI + 0.9);
      c.shot({ pos: [-1.9, 1.4, -1.9], look: [0.2, 1.0, -4.3], fov: 42, dof: true });
      audio.sfx('big_pop', { pos: V(0, 1.3, -4.8), vol: 1 });
      await this.animBattery(c);
      this.mood = 'dying'; audio.sfx('glitch', { vol: 0.9 }); audio.music(null, 1.5);
      c.shot({ pos: [-1.2, 1.2, 3.5], look: [0, 5.2, -4.9], fov: 44, to: { pos: [-0.6, 2.2, 0.6] }, dur: 8 });
      this.faceTalk = true; await c.say('w_cmos3', null); this.faceTalk = false;
      this.faceLight.intensity = 2.5; this.faceLight.color.setHex(0xff60ff);
      // the power button rises
      c.shot({ pos: [2.2, 1.4, 0.6], look: [0, 0.8, -2.4], fov: 40, dof: true });
      audio.sfx('servo', { pos: V(0, 0.5, -2.4), vol: 1 }); c.shake(0.08);
      await this.tween(2.2, k => { this.pedestal.position.y = -1.3 + 1.3 * k; }, c);
      this.physics.addBox(V(0, 0.55, -2.4), V(0.6, 0.55, 0.6));
      c.shot({ pos: [-1.0, 1.7, 0.4], look: [0.9, 1.5, -3.4], fov: 36, dof: true }); pl.actor.lookAt(V(0, 1.1, -2.4));
      await c.say('w_cmos4', pl.actor);
      await c.say('w_hint_hold', pl.actor);
    }, { endYaw: 0.4 });
    pl.actor.lookAt(null); pl.place(1.0, 0, -0.8, Math.PI); audio.music('core', 1);
    this.phase = 3; this.popEvery = 2.2; this.objective('Press and HOLD the power button');
  }
  async animBattery(c) {
    const b = this.batt, m = this.battM; const qT = new THREE.Quaternion();
    await this.tween(0.8, k => { b.position.z = -4.74 + k * 0.46; }, c);
    await this.tween(0.6, k => { m.quaternion.copy(qT.slerpQuaternions(this.qA, this.qB, k)); b.position.y = 1.3 - (1.3 - 0.36) * k * k; }, c);
    audio.sfx('boss_hit', { pos: b.position, vol: 0.9 }); c.shake(0.12); audio.sfx('roll', { pos: b.position, vol: 0.9 });
    let lastZ = b.position.z;
    await this.tween(3.0, k => { const e = 1 - (1 - k) * (1 - k); const z = -4.28 + e * 8.1; b.position.z = z; b.position.x = -1.2 * e; b.rotation.x += (z - lastZ) / 0.36; lastZ = z; }, c);
    b.position.set(-1.2, 0.36, 3.82); m.quaternion.copy(this.qB);
  }
  // ----------------------------------------------------------------- pop-ups (WINSTON's attack)
  spawnPop() {
    const g = this.game; if (this.pops.length >= 6 || !g.player) return;
    const i = Math.floor(Math.random() * 5);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.66), this.popMats[i]); m.position.set((Math.random() - 0.5) * 2.4, 5.4, -4.4); m.renderOrder = 3; this.add(m);
    this.pops.push({ m, t: 0, sp: 1.1 + Math.random() * 0.6 + (this.phase >= 3 ? 0.5 : 0), ph: Math.random() * 6 });
    audio.sfx('popup', { pos: m.position, vol: 0.7 });
    this.popBark = (this.popBark || 0) - 1; if (this.popBark <= 0) { this.popBark = 3; g.bark('w_pop' + (1 + Math.floor(Math.random() * 4)), null, { queue: false }); }
  }
  killPop(p, blow) {
    const i = this.pops.indexOf(p); if (i < 0) return; this.pops.splice(i, 1);
    this.game.fx.zap(p.m.position.clone()); audio.sfx('popup_close', { pos: p.m.position, vol: 0.8 });
    if (blow) { const m = p.m; const v = blow.clone().multiplyScalar(9); let t = 0; this.every(dt => { if (t > 1) return; t += dt; m.position.addScaledVector(v, dt); m.rotation.z += dt * 8; m.scale.multiplyScalar(0.94); if (t > 1) this.root.remove(m); }); }
    else this.root.remove(p.m);
  }
  clearPops() { for (const p of [...this.pops]) this.killPop(p); }
  onZap(pos, fwd) {
    if (this.part !== 'core') return false; let any = false;
    for (const p of [...this.pops]) { const to = p.m.position.clone().sub(pos); to.y = 0; const d = to.length(); if (d < 2.8 && to.normalize().dot(fwd) > 0.2) { this.killPop(p); any = true; } }
    return any;
  }
  onDuster(pos, dir) {
    if (this.part !== 'core') return;
    for (const p of [...this.pops]) { const to = p.m.position.clone().sub(pos.clone().setY(pos.y + 1.3)); const d = to.length(); if (d < 7.5 && to.normalize().dot(dir) > 0.7) this.killPop(p, dir); }
  }
  updatePops(dt) {
    const g = this.game, pl = g.player; const cam = g.world.camera;
    for (const p of [...this.pops]) {
      p.t += dt; const tgt = pl.pos.clone().setY(pl.pos.y + 1.3); const to = tgt.sub(p.m.position); const d = to.length();
      p.m.position.addScaledVector(to.normalize(), Math.min(d, p.sp * dt)); p.m.position.y += Math.sin(p.t * 3 + p.ph) * dt * 0.4;
      p.m.lookAt(cam.position); const s = Math.min(1, p.t * 3); p.m.scale.setScalar(s);
      if (d < 0.75) { this.killPop(p); this.popHit(); }
      else if (p.t > 25) this.killPop(p);
    }
  }
  popHit() {
    const g = this.game; this.timeLeft -= 12; g.player.shake = 0.5; audio.sfx('error', { vol: 0.8 }); g.ui.toast('POP-UP! -12 seconds. Zap them (Q) or blow them away (R).', 2.2);
    if (g.touch) g.ui.toast('POP-UP! -12 seconds. Use ZAP or AIR on them.', 2.2);
    if (!this.st.popHits++) g.bark('v_pophit', g.player.actor, { queue: false });
  }
  // ----------------------------------------------------------------- update
  update(dt) {
    super.update(dt); const g = this.game; if (!g.player) return;
    if (this.part === 'hall') {
      if (g.guards.some(x => x.state === 'alert')) { if (!this.alertMusic) { this.alertMusic = true; audio.music('boss', 0.5); } }
      else if (this.alertMusic) { this.alertMusic = false; audio.music('stealth', 1.5); }
      return;
    }
    // core
    if (this.holding) {
      const h = this.holding; const ok = held('use') || g.debugWin;
      if (!ok || g.locked()) { if (!g.locked()) { this.holding = null; g.ui.holdbar(0); if (this.mood === 'glitch' && h.id === 'button') this.mood = 'angry'; } }
      else { h.t += dt; g.ui.holdbar(h.t / h.need); if (h.id === 'button') { g.player.shake = 0.06; this.pedestal.position.x = (Math.random() - 0.5) * 0.02; if (this.pbtn) this.pbtn.position.y = 1.02; }
        if (h.t >= h.need) { this.holding = null; g.ui.holdbar(0); this.holdDone(h.id); } }
    } else if (this.pbtn && !this.st.button) this.pbtn.position.y = 1.06;
    if (this.phase && this.phase < 4 && !g.locked()) {
      this.timeLeft -= dt; g.ui.timer(Math.max(0, this.timeLeft));
      if (this.timeLeft < 60 && !this.warned) { this.warned = true; g.ui.toast('ONE MINUTE until the Final Update!', 3); audio.sfx('alarm', { vol: 0.6 }); }
      if (this.timeLeft <= 0) { this.fail(); return; }
      this.popT = (this.popT ?? 3) - dt; if (this.popT <= 0) { this.popT = this.popEvery || 6; this.spawnPop(); }
      this.updatePops(dt);
    }
  }
  async fail() {
    const g = this.game, cs = g.cutscene; this.phase = 4; this.clearPops(); g.ui.timer(null);
    await cs.run(async c => { this.mood = 'smug'; c.shot({ pos: [0, 1.8, 3], look: [0, 5.2, -4.9], fov: 40 }); this.faceTalk = true; await c.say('w_fail', null); this.faceTalk = false; }, { skippable: false });
    g.caughtNow = true; g.player.enabled = false;
    g.ui.caught('UPDATE INSTALLED', 'Every old computer on Earth is now a very expensive doorstop. Ms. Ellis is playing solitaire with real cards. Try again: zap the pop-ups and work faster.', () => { g.caughtNow = false; g.startLevel('vault', 'core'); });
  }
  async finale() {
    const g = this.game, cs = g.cutscene, pl = g.player, st = this.st; st.button = true; this.phase = 4; this.clearPops(); g.ui.timer(null); g.ui.holdbar(0);
    audio.music(null, 0.5);
    await cs.run(async c => {
      pl.place(0, 0, -1.3, Math.PI); pl.actor.play('push', 0.2);
      c.shot({ pos: [1.6, 1.3, -0.4], look: [0, 1.1, -2.3], fov: 38, dof: true });
      this.mood = 'dying'; audio.sfx('power_down', { vol: 1 });
      await c.wait(1.0);
      c.shot({ pos: [-1.0, 1.4, 3.2], look: [0, 5.2, -4.9], fov: 44, to: { pos: [-0.4, 2.4, 0.4], fov: 38 }, dur: 9 });
      this.mood = 'off'; this.offText = true; this.faceLight.color.setHex(0xff9020); this.faceLight.intensity = 1.5;
      this.faceTalk = false; await c.say('w_off', null);
      // lights out, ring by ring
      for (const o of this.upsObjs) { o.pl.intensity = 0; }
      if (this.topSpot) this.topSpot.intensity = 0; this.wallTex && (this.wallTex.offset.x = 0.5);
      this.root.traverse(o => { if (o.material && o.material.emissiveIntensity !== undefined && o.material.emissiveMap) o.material.emissiveIntensity = 0.08; });
      for (const m of this.coreGlow) { m.emissiveIntensity = 0.02; m.color.multiplyScalar(0.08); } if (this.hatchLight) this.hatchLight.intensity = 0; if (this.pbtnMat) this.pbtnMat.emissiveIntensity = 0.05; this.faceLight.intensity = 0.4; if (this.liftLight) this.liftLight.intensity = 0.6;
      this.drones.forEach(d => d.visible = false); g.world.exposure(1.1, 0.4);
      this.hemiL.intensity = 0.15; this.redLight.intensity = 6; audio.sfx('boom', { vol: 0.5 }); c.shake(0.1);
      await c.wait(1.5);
      this.offText = false;
      // Brecht
      this.brecht.place(3.0, 0, -3.6, -2.2);
      c.shot({ pos: [-0.6, 1.6, -0.2], look: [2.4, 1.5, -2.6], fov: 36, dof: true });
      const wb = c.walk(this.brecht, [[1.3, 0, -2.0]], { speed: 2.0, anim: 'run', endYaw: -Math.PI / 2 });
      await c.say('w_10', this.brecht); await wb;
      pl.actor.lookAt(this.brecht.headPos()); this.brecht.lookAt(pl.actor.headPos()); pl.actor.faceYaw(Math.PI / 2 + 0.2);
      c.shot({ pos: [0.7, 1.65, 0.2], look: [0.1, 1.55, -1.4], fov: 32, dof: true });
      await c.say('w_11', pl.actor);
      this.brecht.play('handsup', 0.2); audio.sfx('zip', { vol: 0.8 });
      c.shot({ pos: [2.6, 1.2, -0.6], look: [1.3, 1.1, -2.0], fov: 34, dof: true });
      await c.wait(1.2); this.brecht.play('sad', 0.4);
      c.shot({ pos: [-1.2, 1.7, 0.6], look: [0, 1.6, -1.3], fov: 32, dof: true }); pl.actor.lookAt(null);
      pl.actor.play('talk', 0.3); audio.sfx('phone_msg', { vol: 0.6 });
      await c.say('w_12', pl.actor);
      await c.say('w_13', null);
      c.shot({ pos: [0, 5, 8], look: [0, 1.5, -2], fov: 45, to: { pos: [0, 9, 12] }, dur: 6 });
      audio.music('ending', 2);
      await c.wait(3);
      await c.fade(1, 1.5);
    });
    st.done = true; g.save.unlocked = Math.max(g.save.unlocked, 5); g.persist();
    g.startLevel('epilogue', null);
  }
  hint() {
    if (this.part === 'hall') return this.st.lift ? 'The lift is at the far end of the hall. Walk up to the call button.' : 'Sneak down the outer aisles (C to crouch). The patch panel is left of the lift at the far end. Zap guards from behind (Q / ZAP), frost cameras (R / AIR), throw mugs to distract.';
    const p = this.phase;
    if (p === 1) return 'The three UPS units glow green around the edge of the room. Pull each lever. Zap or blow away the pop-ups before they reach you.';
    if (p === 1.5) return 'Try the main breaker, the big cabinet to the left of WINSTON.';
    if (p === 2) return this.st.hatch ? 'Stand at the hatch and HOLD use to pull the battery out.' : 'There is a maintenance hatch at the base of WINSTON, under the face.';
    if (p === 3) return 'Stand at the power button pedestal and press and HOLD use until it finishes.';
    return '';
  }
  // ----------------------------------------------------------------- start
  async start(cp) {
    const g = this.game, cs = g.cutscene;
    if (this.part === 'hall') return this.startHall();
    return this.startCore();
  }
  async startHall() {
    const g = this.game, cs = g.cutscene;
    audio.music('stealth');
    audio.prefetchVoices(['v_01', 'v_02', 's_panel', 's_panel_done', 'egg_kernel']);
    await cs.run(async c => {
      g.ui.fade(0, 1.5);
      c.shot({ pos: [0, 3.3, 27.4], look: [0, 1.4, 4], fov: 46, to: { pos: [0, 2.3, 21], look: [0, 1.2, 0] }, dur: 9, ease: 'io' });
      g.ui.chapter('CHAPTER FOUR', 'The Asset');
      await c.wait(5);
      c.shot({ pos: [1.3, 1.65, 24.4], look: [0, 1.55, 26.2], fov: 34, dof: true });
      await c.say('v_01', g.player.actor);
      c.shot({ pos: [-1.2, 2.6, 23.5], look: [0, 1.3, 6], fov: 38, to: { pos: [-1.4, 2.4, 22.6] }, dur: 6 });
      await c.say('v_02', g.player.actor);
    }, { endYaw: 0 });
    this.objective('Reach the lift at the far end of the server hall. Stay out of sight.');
    g.ui.toast(g.touch ? 'SNEAK past guards. ZAP from behind. AIR frosts cameras.' : 'C = sneak. Q = zap from behind. R = frost cameras. Mugs make good distractions.', 5);
  }
  async startCore() {
    const g = this.game, cs = g.cutscene, pl = g.player;
    audio.prefetchVoices(['w_01', 'w_02', 'w_03', 'w_04', 'w_05', 'w_06', 'w_07', 'w_08', 'w_09', 'w_hint_ups', 'w_ups1', 'w_ups2', 'w_ups3', 'w_pop1', 'w_pop2']);
    audio.music(null);
    const skipIntro = this.game.save.coreIntroSeen && this.game.checkpoint === 'core' && this.game._coreRetry;
    await cs.run(async c => {
      g.ui.fade(0, 1);
      c.shot({ pos: [2.2, 1.6, 8.4], look: [4, 1.3, 12.8], fov: 44, dof: true });
      audio.sfx('elevator_ding', { pos: V(4, 2.5, 12.7), vol: 0.9 });
      await c.wait(0.7); this.liftDoor.open = true; audio.sfx('elevator_door', { pos: V(4, 1, 12.7), vol: 0.8 });
      await c.wait(1.0);
      const wk = c.walk(pl.actor, [[4, 0, 11.2], [2.6, 0, 7.6]], { speed: 1.2, endYaw: Math.PI - 0.2 });
      c.shot({ pos: [6.5, 1.0, 11.5], look: [0, 4.5, -4.9], fov: 50, to: { pos: [5.5, 1.4, 9.5], look: [0, 5, -4.9] }, dur: 6 });
      await c.wait(2.5);
      this.mood = 'calm';
      c.shot({ pos: [1.5, 1.3, 5.5], look: [0, 5.0, -4.9], fov: 42, to: { pos: [0.9, 1.8, 3.4] }, dur: 10 });
      this.faceTalk = true; await c.say('w_01', null); this.faceTalk = false;
      await wk; pl.place(2.6, 0, 7.6, Math.PI - 0.2);
      c.shot({ pos: [1.8, 1.7, 5.8], look: [2.6, 1.6, 7.6], fov: 32, dof: true }); pl.actor.lookAt(V(0, 5.5, -4.9));
      await c.say('w_02', pl.actor);
      this.brecht.play('talk'); this.brecht.faceTo(2.6, 7.6); this.brecht.lookAt(pl.actor.headPos());
      c.shot({ pos: [3.2, 1.6, -3.4], look: [4.6, 1.6, -6.2], fov: 34, dof: true });
      await c.say('w_03', this.brecht, { anim: 'point' });
      c.shot({ pos: [-0.8, 1.6, 2.6], look: [0, 5.3, -4.9], fov: 38 }); this.mood = 'calm';
      this.faceTalk = true; await c.say('w_04', null); this.faceTalk = false;
      c.shot({ pos: [1.8, 1.7, 5.8], look: [2.6, 1.6, 7.6], fov: 30, dof: true });
      await c.say('w_05', pl.actor);
      this.mood = 'smug'; c.shot({ pos: [0.3, 2.2, 0.8], look: [0, 5.5, -4.9], fov: 34 });
      this.faceTalk = true; await c.say('w_06', null); this.faceTalk = false;
      c.shot({ pos: [3.4, 1.6, 9.0], look: [2.6, 1.6, 7.6], fov: 30, dof: true }); pl.actor.play('shrug', 0.2);
      await c.say('w_07', pl.actor, { anim: false });
      c.shot({ pos: [3.2, 1.6, -3.4], look: [4.6, 1.6, -6.2], fov: 30, dof: true });
      await c.say('w_08', this.brecht, { anim: 'shrug' });
      c.shot({ pos: [1.6, 1.5, 6.4], look: [2.6, 1.7, 7.6], fov: 28, dof: true, to: { fov: 22 }, dur: 4 });
      await c.say('w_09', pl.actor);
      this.mood = 'angry';
    }, { endYaw: 0.2 });
    pl.actor.lookAt(null); this.brecht.lookAt(null); this.brecht.faceYaw(0); this.brecht.play('type', 0.4);
    this.liftDoor.open = false;
    g.save.coreIntroSeen = 1; g.persist();
    audio.music('core', 1);
    this.timeLeft = TIME_LIMIT; this.phase = 1; this.popEvery = 6; this.popT = 4;
    this.objective('Pull the breaker levers on all 3 UPS units (0/3)');
    g.bark('w_hint_ups', pl.actor, { force: true });
    g.ui.toast(g.touch ? 'Pop-ups cost you time. ZAP them or blast them with AIR.' : 'Pop-ups cost you time. Zap them (Q) or blast them with compressed air (R).', 5);
    this.after(2, () => { this.mood = 'calm'; });
  }
}
