// Chapter 1 (Steve's shop), the title-screen backdrop and the epilogue all share this office-park build.
import * as THREE from 'three';
import { Level, stdMat, texMat, makeDoor } from './base.js';
import { Actor } from '../engine/actor.js';
import { find, inst } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Mini } from '../engine/minigames.js';
import { pixText, pixWrap, scanlines, gen, getTex } from '../engine/textures.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- retro screen painters
export function drawDoors98(x, s, mode) {
  const W = s.w, H = s.h, t = s.t;
  if (mode === 'off') { x.fillStyle = '#060806'; x.fillRect(0, 0, W, H); return; }
  if (mode === 'post') {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H); const lines = ['AWARD MODULAR BIOS V4.51PG', 'PENTIUM-MMX CPU AT 233MHZ', 'MEMORY TEST : ' + Math.min(65536, Math.floor(t * 40000)) + 'K OK', '', 'DETECTING PRIMARY MASTER ... DOORS98', '', 'CMOS CHECKSUM ERROR - DEFAULTS LOADED', 'PRESS DEL TO ENTER SETUP'];
    lines.slice(0, Math.min(lines.length, Math.floor(t * 4) + 1)).forEach((l, i) => pixText(x, l, 10, 12 + i * 16, 1.5, i >= 6 ? '#fff' : '#aaa')); return;
  }
  if (mode === 'bios') { x.fillStyle = '#0000aa'; x.fillRect(0, 0, W, H); pixText(x, 'CMOS SETUP UTILITY', W / 2, 20, 2, '#ff5', 'center'); pixText(x, 'DATE: SETTING...', W / 2, 110, 2, '#fff', 'center'); scanlines(x, W, H); return; }
  if (mode === 'boot') {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H); const cx = W / 2, cy = H / 2 - 20;
    const cols = ['#f33', '#3c3', '#36f', '#fc0'];
    cols.forEach((c, i) => { const dx = (i % 2) * 34 - 17, dy = Math.floor(i / 2) * 30 - 15; x.fillStyle = c; x.save(); x.translate(cx + dx, cy + dy + Math.sin(t * 4 + i) * 3); x.transform(1, -0.1, 0, 1, 0, 0); x.fillRect(-15, -13, 30, 26); x.restore(); });
    pixText(x, 'DOORS', cx, cy + 46, 3, '#fff', 'center'); pixText(x, '98', cx + 60, cy + 40, 2, '#f80', 'left');
    x.fillStyle = '#123'; x.fillRect(40, H - 30, W - 80, 8); x.fillStyle = '#39f'; const k = (t * 80) % (W - 80); x.fillRect(40 + k, H - 30, 40, 8); return;
  }
  if (mode === 'desktop') {
    x.fillStyle = '#008080'; x.fillRect(0, 0, W, H);
    [['MY COMPUTER', 12], ['RECYCLE BIN', 62], ['SOLITAIRE', 112], ['HAROLD.DOC', 162]].forEach(([n, y]) => { x.fillStyle = '#ddd'; x.fillRect(16, y, 22, 18); x.fillStyle = '#004'; x.fillRect(19, y + 3, 16, 10); pixText(x, n, 27, y + 24, 1, '#fff', 'center'); });
    x.fillStyle = '#c0c0c0'; x.fillRect(90, 30, 200, 150); x.fillStyle = '#000080'; x.fillRect(92, 32, 196, 14); pixText(x, 'SOLITAIRE', 96, 35, 1, '#fff');
    x.fillStyle = '#060'; x.fillRect(94, 48, 192, 130);
    for (let i = 0; i < 7; i++) { x.fillStyle = '#fff'; x.fillRect(100 + i * 26, 90 + i * 6, 20, 28); x.fillStyle = i % 2 ? '#c00' : '#000'; x.fillRect(103 + i * 26, 93 + i * 6, 5, 5); }
    for (let i = 0; i < 4; i++) { x.strokeStyle = '#8c8'; x.strokeRect(178 + i * 26, 54, 20, 28); }
    x.fillStyle = '#c0c0c0'; x.fillRect(0, H - 18, W, 18); x.fillStyle = '#fff'; x.fillRect(0, H - 18, W, 1);
    x.fillStyle = '#c0c0c0'; x.fillRect(2, H - 16, 44, 14); pixText(x, 'START', 8, H - 12, 1, '#000');
    const d = new Date(); pixText(x, d.toTimeString().slice(0, 5), W - 8, H - 12, 1, '#000', 'right');
    return;
  }
}

function shopSignTexture(text, bg, fg) { return gen.label(text, bg, fg, 256, 48, 2); }

// ---------------------------------------------------------------- shared build
export async function buildShop(L, tod = 'day') {
  const g = L.game, w = g.world;
  const day = tod === 'day', dusk = tod === 'dusk', eve = tod === 'eve';
  // sky + lights
  if (day) { L.sky(0x3f86d6, 0xd8e8f2, 0x8a9a8a, { sun: [0.5, 0.35, 0.8], sunCol: 0xfff0c0 }); w.scene.fog = new THREE.Fog(0xc8dcec, 60, 220); }
  else if (dusk) { L.sky(0x0d1a3a, 0xe08850, 0x2a2a30, { sun: [0.6, 0.06, 0.8], sunCol: 0xff8040, stars: true }); w.scene.fog = new THREE.Fog(0x5a4a5a, 30, 150); }
  else { L.sky(0x070b1c, 0x3a4060, 0x151820, { sun: [0.6, -0.2, 0.8], sunCol: 0x000000, stars: true }); w.scene.fog = new THREE.Fog(0x1a1e2e, 25, 120); }
  const sun = w.sun(day ? 0xffe6c0 : dusk ? 0xffa060 : 0x8090c0, day ? 2.0 : dusk ? 1.5 : 0.4, day ? V(14, 18, 22) : V(20, 6, 26), V(0, 0, 0), 16);
  L.hemi(day ? 0xc4dcff : dusk ? 0x7a6aa0 : 0x303a60, day ? 0x6b5a48 : 0x2a2028, day ? 0.45 : dusk ? 0.5 : 0.4);
  w.scene.environmentIntensity = day ? 0.3 : 0.25; w.exposure(day ? 0.85 : 1.0, day ? 0.3 : 0.6);
  // ---------------- interior shell
  const H = 3.2, T = 0.2;
  const wall = (sx, sy, sz, x, y, z) => L.wbox([sx, sy, sz], [x, y, z], 'wall', 1.6, { mat: wallMat(L) });
  L.wbox([10.4, 0.2, 6.2], [0, -0.1, -1], 'tiles', 2.0, { texArgs: ['#e2ddd2', '#7f8ea6'] });
  L.wbox([7, 0.2, 4], [-1.5, -0.1, -6], 'wood', 2.4);
  L.wbox([2.2, 0.2, 2.6], [-6.1, -0.1, -6.2], 'carpet', 1.5, { texArgs: ['#4a2a2a'] });
  L.wbox([12.4, 0.2, 10.4], [-1, H + 0.1, -2.9], 'ceiling', 1.2);
  // front wall with windows + door (z=2)
  wall(0.4, H, T, -4.8, H / 2, 2); wall(5.5, 0.55, T, -1.85, 0.275, 2); wall(5.5, 0.6, T, -1.85, H - 0.3, 2);
  wall(2.5, 0.55, T, 3.35, 0.275, 2); wall(2.5, 0.6, T, 3.35, H - 0.3, 2); wall(0.4, H, T, 4.8, H / 2, 2); wall(1.25, 0.95, T, 1.5, H - 0.475, 2);
  L.glass([5.5, 2.05, 0.04], [-1.85, 1.575, 2]); L.glass([2.5, 2.05, 0.04], [3.35, 1.575, 2]);
  for (const x of [-4.6, -2.75, -0.95, 0.88, 2.12, 3.35, 4.6]) L.box([0.06, 2.05, 0.08], [x, 1.575, 2], stdMat('alu', { color: 0xa9b0b6, metalness: 0.9, roughness: 0.3 }), { col: false });
  wall(T, H, 6, 5, H / 2, -1); westWall(L);
  // back wall of main shop z=-4 with door at x=-3
  wall(1.5, H, T, -4.25, H / 2, -4); wall(5.5, H, T, 0.25, H / 2, -4); wall(2, H, T, 4, H / 2, -4); wall(1.1, 0.95, T, -3, H - 0.475, -4);
  wall(T, H, 4, 2, H / 2, -6); wall(7, H, T, -1.5, H / 2, -8); wall(3, H, T, 3.5, H / 2, -8); wall(T, H, 4, 5, H / 2, -6);
  // alcove walls
  wall(T, H, 2.6, -7.1, H / 2, -6.2); wall(2.2, H, T, -6.1, H / 2, -7.5); wall(2.2, H, T, -6.1, H / 2, -4.9);
  // trim strip / skirting
  L.box([10, 0.12, 0.03], [0, 0.06, -3.88], stdMat('skirt', { color: 0x6a5a48 }), { col: false });
  // doors
  const front = L.place('door_glass', [1.5, 0, 2.0], 0, { col: false });
  L.frontDoor = makeDoor(L, front, 'leaf', { angle: -1.6, sound: 'door_glass' });
  const backDoor = L.place('door_wood', [-3, 0, -4], 0, { col: false }); L.backDoor = makeDoor(L, backDoor, 'leaf', { angle: 1.7 });
  // ---------------- exterior: office park
  L.wbox([60, 0.2, 40], [0, -0.12, 22], 'asphalt', 4, { col: false }); L.groundTiles(0, 22, 60, 40, -0.02);
  L.wbox([40, 0.24, 2.4], [0, -0.02, 3.2], 'concrete', 2, { texArgs: ['#a8a69e'] });
  L.box([40, 0.14, 0.25], [0, 0.03, 4.45], stdMat('curb', { color: 0xb8b4aa, roughness: 0.9 }), { col: false });
  for (let i = -6; i <= 6; i++) L.box([0.12, 0.01, 4.5], [i * 2.8 + 1.4, 0.0, 8.2], stdMat('paint', { color: 0xf2f2e8, roughness: 0.6 }), { col: false, cast: false });
  L.box([40, 0.01, 0.15], [0, 0.0, 10.5], stdMat('paint', { color: 0xf2f2e8 }), { col: false, cast: false });
  // facade (outer skin of building + neighbours)
  const fac = new THREE.MeshStandardMaterial({ map: getTex('wall', '#cdbb9a'), roughness: 0.95 });
  L.box([30, 0.8, 0.3], [0, H + 0.4, 2.15], fac); L.box([30, 0.25, 0.6], [0, H + 0.85, 2.3], stdMat('cornice', { color: 0x8a7a62 }));
  L.box([0.6, H, 0.3], [-5.2, H / 2, 2.15], fac); L.box([0.6, H, 0.3], [5.2, H / 2, 2.15], fac);
  for (const [cx, name, col] of [[-10.5, 'SUNSHINE INSURANCE', '#2a7a3a'], [10.5, 'DR. MOLAR - DENTIST', '#2a4a8a']]) {
    L.box([10, H, 0.3], [cx, H / 2, 2.15], fac, { col: true });
    L.box([7, 1.9, 0.05], [cx, 1.5, 2.32], stdMat('darkglass', { color: 0x223040, metalness: 0.6, roughness: 0.15 }), { col: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.75), new THREE.MeshStandardMaterial({ map: shopSignTexture(name, col, '#fff'), emissive: 0xffffff, emissiveIntensity: dusk || eve ? 0.8 : 0.15, emissiveMap: shopSignTexture(name, col, '#fff') }));
    sg.position.set(cx, H + 0.4, 2.31); L.add(sg);
  }
  L.box([30, 0.4, 14], [0, H + 0.35, -4], stdMat('roof', { color: 0x5a5a5a, roughness: 1 }), { col: false });
  L.box([0.3, H + 0.6, 10.4], [-15, H / 2, -3], fac); L.box([0.3, H + 0.6, 10.4], [15, H / 2, -3], fac);
  L.box([30, H + 0.6, 0.3], [0, H / 2, -8.3], fac);
  L.place('shop_sign', [0, H + 0.42, 2.45], 0, { col: false });
  // parking lot dressing
  L.ellisCar = L.place('sedan', [3.6, 0, 8.6], Math.PI);
  L.olegCar = L.place('blackcar', [-2.0, 0, 8.6], Math.PI); L.olegCar.visible = tod !== 'day';
  for (const x of [-12, -6, 6, 12]) { L.place('lamp_post', [x, 0, 11.2], Math.PI, { shrink: V(0.4, 1, 0.4) }); if (!day) L.pointLight(0xffd8a0, 9, 12, [x, 4.2, 10.4]); }
  for (const [x, z] of [[-9, 13], [9, 13], [-14, 6], [14, 6], [0, 15], [-18, 16], [18, 16], [-6, 17], [6, 18]]) L.place('tree', [x, 0, z], Math.random() * 6, { shrink: V(0.15, 1, 0.15) });
  for (const x of [-7.5, -6.5, 6.5, 7.5, -13, 13]) L.place('shrub', [x, 0, 3.0], Math.random() * 6, { col: false });
  L.place('bench', [-7, 0, 3.6], Math.PI); L.place('mailbox', [6.2, 0, 4.0], 0); L.place('hydrant', [-5.8, 0, 4.0], 0);
  L.place('dumpster', [16.5, 0, 0.5], -Math.PI / 2);
  // distant backdrop: road + hills
  L.box([200, 0.05, 8], [0, -0.04, 26], stdMat('road', { color: 0x2c2e33, roughness: 0.95 }), { col: false, cast: false });
  for (let i = 0; i < 8; i++) { const hm = new THREE.Mesh(new THREE.SphereGeometry(30 + i * 3, 16, 8), stdMat('hill' + (i % 2), { color: i % 2 ? 0x5f7a4a : 0x6f8a55, roughness: 1 })); hm.scale.y = 0.35; hm.position.set(-100 + i * 30, -4, 80 + (i % 3) * 15); L.add(hm); }
  // invisible boundary walls outside
  for (const [sx, sz, x, z] of [[60, 1, 0, 24], [1, 30, -22, 10], [1, 30, 22, 10]]) L.physics.addBox(V(x, 2, z), V(sx / 2, 3, sz / 2));
  // ---------------- interior furniture
  L.counter = L.place('counter', [0.3, 0, -0.6], 0);
  L.place('register', [1.1, 1.04, -0.65], 0, { col: false }); L.bell = L.place('bell', [-0.3, 1.04, -0.38], 0, { col: false }); L.fax = L.place('fax', [-0.6, 1.04, -0.7], 0.2, { col: false });
  L.place('workbench', [-2.6, 0, -3.55], 0);
  L.pc = L.place('pc98', [-3.0, 0.945, -3.6], 0, { col: false }); L.crt = L.place('crt', [-2.2, 0.945, -3.65], -0.15, { col: false });
  L.place('keyboard', [-2.3, 0.95, -3.22], -0.1, { col: false }); L.place('mouse', [-1.95, 0.95, -3.2], 0, { col: false });
  L.drawers = L.place('parts_drawers', [-1.25, 0.945, -3.7], 0, { col: false });
  L.duck = L.place('duck', [-1.9, 0.95, -3.55], 0.6, { col: false });
  L.place('mug_red', [-3.55, 0.95, -3.3], 0, { col: false });
  L.place('desk', [3.3, 0, -3.55], 0); L.lcd = L.place('lcd', [3.0, 0.76, -3.7], 0, { col: false }); L.place('keyboard_black', [3.0, 0.77, -3.3], 0, { col: false });
  L.stevePC = L.place('pc98', [4.3, 0.76, -3.65], -0.2, { col: false }); L.place('office_chair', [3.0, 0, -2.75], Math.PI + 0.3);
  L.place('mug', [3.75, 0.77, -3.4], 0, { col: false });
  for (const z of [-2.6, -1.2]) { L.place('shelf', [4.62, 0, z], -Math.PI / 2); for (const y of [0.13, 0.61, 1.09, 1.57]) for (const dz of [-0.35, 0.3]) if (Math.random() < 0.8) L.place(Math.random() < 0.5 ? 'box_a' : 'box_s', [4.62, y, z + dz], Math.random() * 0.3 - 0.15, { col: false, scale: 0.75 }); }
  L.place('filing_cabinet', [-4.62, 0, -0.6], Math.PI / 2); L.coffee = L.place('coffee_machine', [-4.65, 1.3, -0.6], Math.PI / 2, { col: false });
  L.cooler = L.place('water_cooler', [4.55, 0, 1.3], -Math.PI / 2);
  L.place('plant', [-4.5, 0, 1.55], 0, { shrink: V(0.5, 1, 0.5) }); L.place('plant', [1.9, 0, -3.6], 1, { shrink: V(0.5, 1, 0.5) });
  L.place('bench', [-3.2, 0, 1.45], Math.PI);
  L.bsod = L.place('photo_bsod', [-4.88, 1.75, -2.4], Math.PI / 2, { col: false });
  L.y2k = L.place('y2k_box', [-3.6, 0, -3.35], 0.2);
  L.place('box_b', [-4.4, 0, -3.5], 0.3); L.place('box_a', [4.2, 0, 0.3], 0.5);
  // seniors sign
  const ss = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshStandardMaterial({ map: (() => { const t = gen.label('SENIORS 50% OFF', '#ffd84a', '#1e4f8f', 256, 96, 3); return t; })() }));
  ss.position.set(0.6, 2.0, -3.89); L.add(ss); L.seniorSign = ss;
  // ceiling lights
  for (const [x, z] of [[-2.5, -2.2], [2.5, -2.2], [-2.5, 0.6], [2.5, 0.6], [-1.5, -6]]) { L.place('ceiling_light', [x, H, z], 0, { col: false }); L.pointLight(0xfff2dc, day ? 2.2 : 5, 7, [x, H - 0.3, z]); }
  // back room
  L.place('sofa', [-0.6, 0, -7.45], 0); L.catBed = L.place('cat_bed', [1.25, 0, -6.9], 0, { col: false }); L.bowl = L.place('cat_bowl', [1.4, 0, -4.55], 0, { col: false });
  find(L.bowl, 'food').visible = false;
  L.place('box_b', [-2.6, 0, -4.6], 0); L.tv = L.place('crt', [-2.6, 0.4, -4.6], Math.PI, { col: false }); L.vhs = L.place('vhs', [-2.15, 0.4, -4.65], 0.3, { col: false });
  L.place('box_a', [-4.5, 0, -7.5], 0); L.radio = L.place('radio', [-4.5, 0.3, -7.5], 0.4, { col: false });
  L.place('plant', [1.6, 0, -7.6], 2, { shrink: V(0.5, 1, 0.5) });
  // secret shelf + armory alcove
  L.shelfObj = L.place('secret_shelf', [-4.82, 0, -6.2], Math.PI / 2, { col: false });
  L.secretShelf = makeDoor(L, L.shelfObj, 'shelf', { slide: [0, 0, 1.0], sound: 'secret_slide' });
  L.place('armory_wall', [-7.0, 0, -6.2], Math.PI / 2, { col: false }); L.globe = L.place('globe', [-5.6, 0, -5.3], 0);
  L.safe = L.place('safe', [-6.6, 0, -7.0], Math.PI / 2); L.photo = L.place('photo_ellis', [-5.9, 1.6, -7.38], 0, { col: false });
  L.pointLight(0xffc880, 3, 4, [-6.1, 2.6, -6.2]);
  // west wall pieces (main + back room with gap for the secret opening)
  return L;
}

// helper: west wall needs a gap; we built a full-length wall first and then removed it; add pieces
let _wm = null;
function wallMat() { if (!_wm) { const t = getTex('wall', '#e8e3d6').clone(); t.needsUpdate = true; t.repeat.set(1, 1); _wm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }); } return _wm; }
function westWall(L) {
  const w = (s, p) => L.wbox(s, p, 'wall', 1.6, { mat: wallMat() });
  w([0.2, 3.2, 7.0], [-5, 1.6, -1.5]); w([0.2, 3.2, 0.9], [-5, 1.6, -7.55]); w([0.2, 3.2, 0.5], [-5, 1.6, -5.15]); w([0.2, 1.0, 1.6], [-5, 2.7, -6.2]);
}

// ================================================================= CHAPTER 1
export class ShopLevel extends Level {
  constructor(g) { super(g); this.title = 'Chapter 1: Have You Tried Turning It Off And On Again?'; this.st = { step: 0, petted: 0 }; }
  async build(cp) {
    const g = this.game; await buildShop(this, 'day');
    audio.ambience('amb_shop', 0.6);
    // NPCs
    this.ellis = new Actor(g, 'ellis', { name: 'ellis', scale: 0.93 }); this.ellis.place(0.1, 0, 0.35, Math.PI); this.add(this.ellis.root);
    this.oleg = new Actor(g, 'oleg', { name: 'oleg', scale: 1.08 }); this.oleg.place(1.5, 0, 12, Math.PI); this.add(this.oleg.root); this.oleg.root.visible = false;
    this.cat = new Actor(g, 'cat', { name: 'cat', radius: 0.15, speed: 0.6 }); this.cat.place(1.25, 0.03, -6.9, 0.5); this.cat.play('sleep'); this.add(this.cat.root);
    const pl = g.makePlayer(); pl.place(-2.6, 0, -2.6, Math.PI); pl.surface = 'tile';
    // screens
    this.crtS = this.screenOn(this.crt, 320, 240, (x, s) => drawDoors98(x, s, this.st.crt || 'off')); this.crtS.rate = 0.1;
    this.lcdS = this.screenOn(this.lcd, 320, 190, (x, s) => { x.fillStyle = '#0b1a2a'; x.fillRect(0, 0, 320, 190); pixText(x, "STEVE'S JOB QUEUE", 12, 10, 2, '#ffd84a');
      ['ELLIS - CMOS BATT (TODAY)', 'MR GUPTA - FAN NOISE', 'MRS O - "INTERNET IS FULL"', 'MR THOMAS - ?????', 'SNAKE.EXE - HIGH SCORE'].forEach((l, i) => pixText(x, (i === 4 ? '> ' : '- ') + l, 12, 40 + i * 22, 1.5, i === 3 ? '#f66' : '#9cf')); scanlines(x, 320, 190, 0.1); });
    this.tvS = this.screenOn(this.tv, 160, 120, (x, s) => { const t = s.t; x.fillStyle = '#111'; x.fillRect(0, 0, 160, 120); for (let i = 0; i < 300; i++) { const v = Math.random() * 255 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.random() * 160, Math.random() * 120, 2, 2); } pixText(x, 'CH 3', 120, 8, 1, '#5f5'); });
    this.steveS = this.screenOn(this.stevePC, 4, 4, () => {}, 'mhz'); // 7-seg
    this.setupInteractions();
    this.hintText = 'Fix Ms. Ellis\'s PC on the workbench.';
  }
  hint() { return this.hintText; }
  setupInteractions() {
    const g = this.game, st = this.st, L = this;
    const pcPos = V(-2.85, 1.0, -3.1);
    const panel = find(this.pc, 'side_panel'), cmos = find(this.pc, 'cmos');
    this.interact({ pos: pcPos, r: 1.4, priority: 0.5, label: () => ['Open the case', 'Remove the old CMOS battery', 'Install a new battery (you need one)', 'Install the new CR2032', 'Close the case and power on', 'Ms. Ellis\'s PC (running Doors 98)'][st.step] || null,
      cond: () => st.phase === 'fix' || st.step >= 5,
      fn: async () => {
        if (st.step === 0) { g.player.actor.play('reach'); if (await Mini.screws(g)) { panel.position.x += 0.0; panel.visible = false; this.panelProp(); st.step = 1; g.bark('s_case_open', g.player.actor); this.objective('Remove the old CMOS battery from the motherboard'); } }
        else if (st.step === 1) { if (await Mini.battery(g, 'out')) { cmos.visible = false; st.step = 2; g.bark('s_need_batt', g.player.actor); this.objective('Get a fresh CR2032 from the BATTERIES drawer (blue parts drawers on the bench)'); this.hintText = 'The blue parts drawers are right next to the PC. Third drawer down: BATTERIES.'; } }
        else if (st.step === 2) { if (st.hasBatt) st.step = 3; else { g.ui.toast('You need a fresh CR2032 first. Check the BATTERIES drawer.'); return; } }
        if (st.step === 3) { if (await Mini.battery(g, 'in')) { cmos.visible = true; st.step = 4; g.bark('s_batt_in', g.player.actor); this.objective('Close the case and power on the PC'); } }
        else if (st.step === 4) { await this.bootPC(); }
        else if (st.step >= 5) { audio.sfx('click', { vol: 0.5 }); g.ui.toast('Doors 98 is running. Solitaire is ready. Life is good.'); }
      } });
    // drawers
    const labels = ['Resistors', 'BATTERIES', 'Odds & ends', 'Floppies'];
    for (let i = 0; i < 4; i++) {
      const d = find(this.drawers, 'drawer_' + i); const base = d.position.z; const ds = { open: false, t: 0 };
      this.every(dt => { ds.t += ((ds.open ? 1 : 0) - ds.t) * Math.min(1, dt * 8); d.position.z = base + ds.t * 0.2; });
      const wp = d.getWorldPosition(new THREE.Vector3()); wp.z += 0.35;
      this.interact({ pos: V(wp.x, 1.05, wp.z), r: 1.3, dy: 1.6, priority: i === 1 ? 0.6 : 0.1, label: () => (ds.open ? 'Close' : 'Open') + ' drawer: ' + labels[i],
        fn: () => {
          ds.open = !ds.open; audio.sfx('drawer', { vol: 0.6 });
          if (!ds.open) return;
          if (i === 1) { if (st.step >= 2 && !st.hasBatt) { st.hasBatt = true; if (st.step === 2) st.step = 3; g.bark('s_got_batt', g.player.actor); this.objective('Install the new battery in Ms. Ellis\'s PC'); audio.sfx('pickup'); } else if (!st.hasBatt) g.ui.toast('Coin cells. You\'ll need one once the old battery is out.'); }
          if (i === 2) { if (g.secret('golden')) g.bark('egg_golden', g.player.actor); else g.ui.toast('The golden CR2032. Still not using it.'); }
          if (i === 3 && !st.floppy1) { st.floppy1 = true; g.floppy('shop1'); g.bark('egg_floppy', g.player.actor); }
          if (i === 0) g.ui.toast('Resistors, sorted by colour. Mostly brown.');
        } });
    }
    // easter eggs + props
    const eggs = [
      [this.duck, 'Squeeze the rubber duck', () => { audio.sfx('squeak', { vol: 0.8 }); g.fx.icon('q', this.duck.position.clone().add(V(0, 0.3, 0))); if (g.secret('duck')) g.bark('egg_duck', g.player.actor); }, 1.2],
      [this.y2k, 'Open the Y2K box', () => { find(this.y2k, 'lid').rotation.x = -1.2; audio.sfx('crate_open'); if (g.secret('y2k')) g.bark('egg_y2k', g.player.actor); }, 1.3],
      [this.bsod, 'Look at the framed screenshot', () => { if (g.secret('bsod')) g.bark('egg_bsod', g.player.actor); else g.bark('egg_bsod', g.player.actor, { queue: false }); }, 1.6],
      [this.coffee, 'Use the coffee machine', () => { audio.sfx('coffee_brew', { vol: 0.8 }); g.bark('egg_coffee', g.player.actor, { queue: false }); g.player.turbo = Math.max(g.player.turbo, 4); }, 1.4],
      [this.seniorSign, 'Read the sign', () => g.bark('egg_sign', g.player.actor, { queue: false }), 1.8],
      [this.fax, 'Fax machine', () => { audio.sfx('fax', { vol: 0.7 }); g.bark('egg_fax', g.player.actor, { queue: false }); }, 1.3],
      [this.vhs, 'VHS tapes', () => g.bark('egg_vhs', g.player.actor, { queue: false }), 1.3],
      [this.bell, 'Ring the bell', () => { audio.sfx('bell', { vol: 0.9 }); if (this.ellis.root.visible) this.ellis.play('nod', 0.2, { once: true, restart: true }); }, 1.2],
      [this.cooler, 'Get a drink of water', () => audio.sfx('glug', { vol: 0.8 }), 1.3],
      [this.radio, 'Turn on the radio', () => { this.radioOn = !this.radioOn; audio.music(this.radioOn ? 'radio' : 'shop', 0.6); g.fx.notes(this.radio.position.clone().add(V(0, 0.3, 0))); }, 1.3],
      [this.globe, 'Spin the globe', () => { this.globeSpin = 12; audio.sfx('globe', { vol: 0.6 }); }, 1.3],
      [this.safe, 'The safe', () => g.ui.toast('Steve\'s retirement plan: one mint-condition Pentium Pro, still in the box.', 3), 1.3],
      [this.lcd, 'Play SNAKE.EXE', () => { g.bark('egg_snake', g.player.actor, { queue: false }); g.ui.phone(true); g.ui.phoneTab('snake'); }, 1.4],
    ];
    for (const [obj, label, fn, r] of eggs) { const p = obj.getWorldPosition(new THREE.Vector3()); this.interact({ pos: V(p.x, Math.max(1, p.y), p.z), r, dy: 1.8, label, fn }); }
    const globeBall = find(this.globe, 'ball'); this.every(dt => { if (this.globeSpin > 0) { globeBall.rotation.y += this.globeSpin * dt; this.globeSpin *= Math.pow(0.4, dt); } });
    // turbo button on Steve's PC
    this.interact({ pos: V(4.2, 1.0, -3.2), r: 1.2, label: 'Press the TURBO button', fn: () => { audio.sfx('click'); g.player.turbo = 12; g.ui.toast('TURBO: 66 MHz!', 2); g.fx.sparkle(g.player.pos.clone().add(V(0, 1.5, 0)), 8); if (g.secret('turbo')) g.bark('egg_turbo', g.player.actor); } });
    // secret wall: trigger book
    const book = find(this.shelfObj, 'trigger_book');
    this.interact({ pos: V(-4.55, 1.2, -5.85), r: 1.2, dy: 1.8, label: () => this.secretShelf.open ? 'Close the bookcase' : 'Pull the red book', fn: () => {
      this.secretShelf.set(!this.secretShelf.open); book.rotation.x = this.secretShelf.open ? -0.4 : 0;
      if (this.secretShelf.open && g.secret('wall')) { g.bark('egg_wall', g.player.actor); g.player.shake = 0.2; }
    } });
    this.interact({ pos: V(-6.4, 1.3, -6.2), r: 1.2, dy: 1.8, cond: () => this.secretShelf.open, label: 'Look at the gadget wall', fn: () => g.bark('egg_wall2', g.player.actor) });
    this.interact({ pos: V(-5.9, 1.3, -6.9), r: 1.2, dy: 1.8, cond: () => this.secretShelf.open, label: 'Look at the old photograph', fn: () => { g.bark('egg_photo', g.player.actor); g.secret('photo'); } });
    this.interact({ pos: V(-6.6, 1.0, -6.6), r: 1.0, dy: 1.8, cond: () => this.secretShelf.open && !st.floppy2, label: 'Floppy disk on the safe', fn: () => { st.floppy2 = true; g.floppy('shop2'); this.floppy2.visible = false; } });
    this.floppy2 = inst('floppy'); this.floppy2.position.set(-6.6, 0.71, -7.0); this.add(this.floppy2);
    // cat
    this.interact({ pos: () => this.cat.root.position.clone().setY(0.6), r: 1.1, dy: 1.6, label: () => st.catFed === 1 ? 'Pet Cache (she is eating)' : 'Pet Cache', priority: 0.2, fn: () => this.petCat() });
    // physics toys
    for (const [m, p, label, o] of [['box_s', [3.6, 0, 0.9], 'cardboard box', {}], ['box_s', [3.9, 0.2, 0.95], 'cardboard box', {}], ['mug', [-0.9, 1.05, -0.45], 'coffee mug', { sound: 'clink' }], ['box_a', [-4.2, 0, -5.0], 'box of cables', {}], ['floppy', [-1.6, 1.05, -0.5], 'floppy disk', { sound: 'clink' }]])
      this.place(m, p, Math.random(), { dyn: { pick: true, label, ...o } });
  }
  panelProp() { const p = inst('pc98'); /* visual: lean a spare side panel against the bench */ const sp = find(p, 'side_panel').clone(); sp.position.set(-3.6, 0.21, -3.0); sp.rotation.set(0, 0.4, 0.25); this.add(sp); this.loosePanel = sp; }
  async bootPC() {
    const g = this.game, st = this.st; const panel = find(this.pc, 'side_panel'); panel.visible = true; if (this.loosePanel) this.loosePanel.visible = false;
    audio.sfx('panel_off', { vol: 0.6 }); st.step = 4.5;
    g.player.actor.play('type'); audio.sfx('pc_power', { vol: 0.8 }); st.crt = 'post'; this.crtS.t = 0;
    await new Promise(r => setTimeout(r, 2600)); audio.sfx('beep', { vol: 0.6, vary: 0 });
    st.crt = 'bios';
    const ok = await Mini.bios(g);
    if (!ok) { st.step = 4; st.crt = 'off'; g.ui.toast('The PC is waiting for the date. Try again.'); return; }
    if (g.state.biosExact) g.secret('bios');
    st.crt = 'boot'; this.crtS.t = 0; audio.sfx('hdd', { vol: 0.6 }); await new Promise(r => setTimeout(r, 2200));
    audio.sfx('doors_chime', { vol: 0.9, vary: 0 }); st.crt = 'desktop'; st.step = 5;
    await g.bark('s_boot', g.player.actor); await g.bark('e_bios_done', this.ellis);
    this.oletArrives();
  }
  petCat() {
    const g = this.game, st = this.st;
    g.player.actor.play('pet', 0.2); g.player.override = true; setTimeout(() => g.player.override = false, 1200);
    this.cat.play('purr', 0.3); audio.sfx('purr', { pos: this.cat.root.position, vol: 0.9 }); g.fx.spawn('star', this.cat.root.position.clone().add(V(0, 0.5, 0)), { vel: V(0, 0.6, 0), life: 1, size: 0.12, blend: 'normal' });
    st.petted++; if (st.petted === 1) g.bark('egg_cat_pet', g.player.actor, { queue: false });
    if (st.petted === 5) g.secret('catpet');
    clearTimeout(this._catT); this._catT = setTimeout(() => this.cat.play(st.catFed ? 'sit' : 'sleep', 0.5), 2500);
  }
  update(dt) {
    super.update(dt);
    const g = this.game, pl = g.player; if (!pl) return;
    // auto front door: open when someone is near
    const near = [pl.pos, this.ellis.root.position, this.oleg.root.position].some(p => Math.abs(p.x - 1.5) < 1.3 && Math.abs(p.z - 2) < 1.4);
    if (near !== this.frontDoor.open) { this.frontDoor.set(near); if (near) audio.sfx('door_chime', { vol: 0.6, vary: 0 }); }
    const nb = Math.abs(pl.pos.x + 3) < 1 && Math.abs(pl.pos.z + 4) < 1.3; if (nb !== this.backDoor.open) this.backDoor.set(nb);
    pl.surface = pl.pos.z < -4 ? 'wood' : pl.pos.z > 2.1 ? 'concrete' : 'tile';
    this.ellis.lookAt(this.st.phase === 'fix' ? pl.actor.headPos() : null);
    // Ellis idle chatter
    if (this.st.phase === 'fix' && !g.barking) { this.chatT = (this.chatT ?? 25) - dt; if (this.chatT < 0) { this.chatT = 30; g.bark(Math.random() < 0.5 ? 'e_judge' : 'e_wait', this.ellis, { queue: false }); } }
    if (this.st.phase === 'leave' && this.cat && this.st.catFed === 1 && !this.cat.walking && this.cat.curName !== 'purr') { /* eating */ }
  }
  async start(cp) {
    const g = this.game, cs = g.cutscene, st = this.st;
    audio.music('shop'); audio.prefetchVoices(['c1_01', 'c1_02', 'c1_03', 'c1_04', 'c1_05']);
    if (cp === 'briefcase') return this.startBriefcase(true);
    st.phase = 'intro';
    g.ui.fade(0, 1.2);
    await cs.run(async c => {
      c.shot({ pos: [9, 6, 22], look: [1, 2.5, 2], fov: 40, to: { pos: [4, 2.5, 11], look: [0.5, 2.8, 2] }, dur: 7, ease: 'io' });
      g.ui.chapter('CHAPTER ONE', 'Have You Tried Turning It Off And On Again?');
      await c.wait(6.5);
      c.shot({ pos: [1.6, 1.55, -1.6], look: [0.1, 1.45, 0.35], fov: 38, dof: true });
      this.ellis.lookAt(g.player.actor.headPos());
      await c.say('c1_01', this.ellis);
      c.shot({ pos: [0.2, 1.6, 0.0], look: [-2.6, 1.5, -2.6], fov: 36, dof: true });
      g.player.actor.yaw = 0.9; g.player.yaw = 0.9;
      await c.say('c1_02', g.player.actor);
      c.shot({ pos: [-1.4, 1.5, -1.2], look: [0.1, 1.45, 0.35], fov: 34, dof: true });
      await c.say('c1_03', this.ellis);
      c.shot({ pos: [-0.8, 1.7, -1.0], look: [-2.6, 1.5, -2.6], fov: 40, dof: false, to: { pos: [-1.2, 1.8, -0.4] }, dur: 5 });
      await c.say('c1_04', g.player.actor);
      await c.say('c1_05', this.ellis);
    }, { endYaw: Math.PI * 0.15 });
    g.player.yaw = Math.PI; st.phase = 'fix';
    this.objective('Open Ms. Ellis\'s computer on the workbench');
    g.ui.toast(g.touch ? 'Drag on the right to look, joystick to move, USE to interact' : 'WASD to move, mouse to look (click to lock), E to interact', 5);
    g.save.cp = 'shop'; g.persist();
  }
  async oletArrives() {
    const g = this.game, cs = g.cutscene, st = this.st; st.phase = 'oleg';
    this.oleg.root.visible = true; this.oleg.place(1.5, 0, 6, Math.PI);
    await cs.run(async c => {
      c.shot({ pos: [-0.5, 1.4, -1.8], look: [1.5, 1.4, 2], fov: 40, dof: true });
      audio.sfx('door_chime', { vol: 0.8, vary: 0 });
      this.ellis.lookAt(this.oleg.headPos());
      g.player.actor.lookAt(this.oleg.headPos());
      await c.walk(this.oleg, [[1.5, 0, 2.6], [1.6, 0, 0.9]], { speed: 1.2, endYaw: Math.PI });
      this.oleg.play('nod', 0.2); await c.wait(0.4);
      await c.say('c1_06', this.ellis);
      c.shot({ pos: [1.5, 1.6, -1.4], look: [1.6, 1.75, 0.9], fov: 30, dof: true });
      this.oleg.lookAt(this.ellis.headPos()); this.oleg.play('nod', 0.2); this.ellis.play('nod', 0.2); await c.wait(1.0); // the subtle nod between them
      this.oleg.lookAt(g.player.actor.headPos());
      c.shot({ pos: [0.6, 1.6, 1.4], look: [-1.5, 1.4, -2.2], fov: 38, dof: true });
      g.player.place(-1.2, 0, -1.6, 0.6);
      await c.say('c1_07', g.player.actor);
      c.shot({ pos: [-0.2, 1.6, -0.6], look: [1.6, 1.8, 0.9], fov: 32, dof: true });
      await c.say('c1_08', this.oleg, { anim: 'nod' });
      this.oleg.lookAt(null);
      await c.walk(this.oleg, [[3.6, 0, 0.6]], { speed: 1.1, endYaw: -Math.PI / 2 });
      // Steve carries the PC
      c.shot({ pos: [-0.5, 1.7, 1.2], look: [-2.6, 1.0, -3.2], fov: 40 });
      await c.say('c1_09', g.player.actor);
      this.pc.visible = false; this.crt.visible = true; this.carried = inst('pc98'); const hb = g.player.actor.bone('hand_R');
      this.carried.scale.setScalar(0.95); this.add(this.carried); g.player.actor.play('carrywalk', 0.2); g.player.override = true;
      this.every(() => { if (this.carried && this.carried.visible) { const p = g.player.pos, y = g.player.actor.yaw; this.carried.position.set(p.x + Math.sin(y) * 0.38, p.y + 0.95, p.z + Math.cos(y) * 0.38); this.carried.rotation.y = y; } });
      // outside
      g.player.place(1.2, 0, 2.8, 0); this.ellis.place(1.8, 0, 3.0, 0); this.oleg.root.visible = true;
      c.shot({ pos: [6.5, 1.8, 6.0], look: [2.5, 1.2, 4], fov: 40, to: { pos: [6.0, 1.6, 9.5], look: [3.4, 1.2, 7.5] }, dur: 8 });
      const wSteve = c.walk(g.player.actor, [[2.6, 0, 6.0], [2.5, 0, 8.4]], { speed: 1.0, anim: 'carrywalk', endAnim: 'carry', endYaw: Math.PI / 2 });
      this.every(() => { if (cs.active && g.player.actor.walking) { g.player.root.position.copy(g.player.actor.root.position); } });
      await c.walk(this.ellis, [[2.0, 0, 5.8], [2.3, 0, 7.4]], { speed: 0.9, endYaw: Math.PI / 2 });
      await wSteve;
      this.ellis.lookAt(g.player.actor.headPos());
      c.shot({ pos: [1.0, 1.5, 9.5], look: [2.4, 1.4, 7.6], fov: 36, dof: true });
      await c.say('c1_10', this.ellis);
      c.shot({ pos: [3.4, 1.6, 6.0], look: [2.4, 1.6, 8.2], fov: 34, dof: true });
      await c.say('c1_11', g.player.actor, { anim: false });
      c.shot({ pos: [1.0, 1.5, 9.5], look: [2.4, 1.4, 7.6], fov: 36, dof: true });
      await c.say('c1_12', this.ellis);
      this.carried.visible = false; audio.sfx('car_door', { vol: 0.7, pos: V(3.6, 1, 8.6) });
      g.player.actor.play('idle'); this.cookies = true;
      await c.say('c1_13', g.player.actor);
      await c.say('c1_14', this.ellis, { anim: 'wave' });
      // she drives off
      c.shot({ pos: [-1, 2.2, 12], look: [3.6, 1, 8.6], fov: 42 });
      this.ellis.root.visible = false; audio.sfx('car_drive', { vol: 0.9, pos: V(3.6, 1, 8.6) });
      const car = this.ellisCar; const t0 = c.time;
      await new Promise(res => { const step = () => { const k = Math.min(1, (c.time - t0) / 3.5); car.position.z = 8.6 + k * k * 18; car.position.x = 3.6 + k * 4; if (k < 1 && !c.skipping) requestAnimationFrame(step); else { car.visible = false; res(); } }; step(); });
    });
    g.player.override = false; g.player.place(2.5, 0, 7.6, Math.PI); this.ellisCar.visible = false; this.ellisCar.position.y = -50;
    this.ellis.root.visible = false; if (this.ellis.col) this.ellis.col.setEnabled(false);
    st.phase = 'return'; this.objective('Head back inside. Mr. Thomas is waiting.');
    this.oleg.place(1.0, 0, -0.1, Math.PI); this.oleg.root.visible = true; this.oleg.play('idle');
    // cookie tin on the counter
    this.tin = this.place('cookie_tin', [0.95, 1.04, -0.45], 0, { col: false });
    this.trigger([1.5, 1, 0.8], [1.5, 1.5, 1.0], () => this.briefing());
  }
  async briefing() {
    const g = this.game, cs = g.cutscene, st = this.st; st.phase = 'brief';
    audio.prefetchVoices(['c2_01', 'c2_02', 'c2_03', 'c2_04', 'c2_05', 'c2_06', 'c2_07', 'c2_08', 'c2_09', 'c2_10', 'c2_11', 'c2_12', 'c2_13', 'c2_14', 'c2_15', 'c2_16', 'c2_17']);
    await cs.run(async c => {
      g.player.place(0.6, 0, -1.55, 0); this.oleg.place(0.4, 0, 0.3, Math.PI);
      g.player.actor.lookAt(this.oleg.headPos()); this.oleg.lookAt(g.player.actor.headPos());
      audio.music('brief', 1.5);
      c.shot({ pos: [2.6, 1.5, -0.6], look: [0.5, 1.5, -0.6], fov: 40, to: { pos: [2.3, 1.55, -0.2] }, dur: 10 });
      await c.say('c2_01', g.player.actor);
      c.shot({ pos: [0.65, 1.62, -1.2], look: [0.4, 1.78, 0.3], fov: 30, dof: true });
      await c.say('c2_02', this.oleg);
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.55], fov: 30, dof: true });
      await c.say('c2_03', g.player.actor);
      c.shot({ pos: [0.65, 1.62, -1.2], look: [0.4, 1.78, 0.3], fov: 30, dof: true });
      await c.say('c2_04', this.oleg, { anim: 'point' });
      // the photo
      const ph = this.photoCard(); ph.position.set(0.45, 1.06, -0.5); ph.rotation.x = -Math.PI / 2;
      audio.sfx('paper', { vol: 0.7 });
      c.shot({ pos: [0.45, 1.65, -0.85], look: [0.45, 1.05, -0.5], fov: 32, dof: true, to: { pos: [0.45, 1.45, -0.7] }, dur: 4 });
      await c.say('c2_05', g.player.actor, { anim: false });
      c.shot({ pos: [1.6, 1.5, -1.6], look: [0.4, 1.7, 0.3], fov: 38, dof: true, to: { pos: [1.3, 1.55, -1.3] }, dur: 8 });
      await c.say('c2_06', this.oleg); await c.say('c2_07', this.oleg);
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.55], fov: 30, dof: true });
      await c.say('c2_08', g.player.actor);
      c.shot({ pos: [0.65, 1.62, -1.2], look: [0.4, 1.78, 0.3], fov: 30, dof: true });
      await c.say('c2_09', this.oleg);
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.55], fov: 30, dof: true });
      await c.say('c2_10', g.player.actor, { anim: 'shrug' });
      c.shot({ pos: [0.5, 1.7, -0.9], look: [0.4, 1.78, 0.3], fov: 24, dof: true });
      await c.say('c2_11', this.oleg); ph.visible = false;
      // briefcase on counter
      this.case = this.place('briefcase', [0.25, 1.04, -0.55], Math.PI, { col: false }); audio.sfx('case_down', { vol: 0.8 });
      c.shot({ pos: [2.0, 1.9, -1.2], look: [0.3, 1.1, -0.5], fov: 34, dof: true });
      await c.say('c2_12', this.oleg);
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.55], fov: 30, dof: true });
      await c.say('c2_13', g.player.actor);
      c.shot({ pos: [0.65, 1.62, -1.2], look: [0.4, 1.78, 0.3], fov: 30, dof: true });
      await c.say('c2_14', this.oleg);
      c.shot({ pos: [2.6, 1.5, -0.6], look: [0.5, 1.5, -0.6], fov: 40 });
      await c.say('c2_15', g.player.actor);
      await c.wait(0.5); await c.say('c2_16', this.oleg);
      await c.wait(0.4);
      c.shot({ pos: [-1.0, 1.6, -1.4], look: [1.5, 1.5, 1.5], fov: 40 });
      this.oleg.lookAt(null);
      await c.say('c2_17', this.oleg);
      await c.walk(this.oleg, [[1.5, 0, 1.0], [1.5, 0, 3.2], [-2, 0, 7.5]], { speed: 1.3 });
    });
    this.oleg.root.visible = false; if (this.oleg.col) this.oleg.col.setEnabled(false); this.olegCar.visible = false;
    audio.music('shop', 1.5);
    this.startBriefcase(false);
  }
  photoCard() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 180; const x = cv.getContext('2d');
    x.fillStyle = '#eee'; x.fillRect(0, 0, 256, 180); x.fillStyle = '#111'; x.fillRect(12, 12, 232, 140);
    for (let i = 0; i < 4; i++) { x.fillStyle = '#222'; x.fillRect(30 + i * 52, 22, 44, 124); for (let k = 0; k < 14; k++) { x.fillStyle = Math.random() < 0.6 ? '#3f8' : '#3af'; x.fillRect(36 + i * 52, 28 + k * 8, 4, 3); } }
    x.fillStyle = '#c00'; x.font = 'bold 18px sans-serif'; x.fillText('W.I.N.S.T.O.N.', 70, 170);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.155), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); this.add(m); return m;
  }
  async startBriefcase(fromCp) {
    const g = this.game, st = this.st; st.phase = 'case';
    if (fromCp) {
      st.step = 5; st.crt = 'desktop'; this.pc.visible = false; this.ellis.root.visible = false; this.ellis.col?.setEnabled(false); this.ellisCar.visible = false;
      this.case = this.place('briefcase', [0.25, 1.04, -0.55], Math.PI, { col: false }); this.tin = this.place('cookie_tin', [0.95, 1.04, -0.45], 0, { col: false });
      g.player.place(0.6, 0, -1.55, 0); g.ui.fade(0, 0.8);
    }
    g.setCheckpoint('briefcase'); this.objective('Open the briefcase on the counter');
    this.hintText = 'The briefcase is on the counter. Then feed Cache in the back room and leave through the front door.';
    this.interact({ pos: V(0.3, 1.1, -0.9), r: 1.3, once: true, label: 'Open the briefcase', fn: () => this.openCase() });
  }
  async openCase() {
    const g = this.game, cs = g.cutscene, st = this.st;
    const lid = find(this.case, 'lid');
    await cs.run(async c => {
      g.player.place(0.4, 0, -1.4, 0);
      c.shot({ pos: [0.25, 1.75, -0.95], look: [0.25, 1.06, -0.52], fov: 38, dof: true });
      audio.sfx('case_open', { vol: 0.9 });
      const t0 = c.time; await new Promise(res => { const step = () => { const k = Math.min(1, (c.time - t0) / 0.9); lid.rotation.x = -k * 1.9; if (k < 1 && !c.skipping) requestAnimationFrame(step); else { lid.rotation.x = -1.9; res(); } }; step(); });
      const items = [['item_phone', 'bc_phone'], ['item_tickets', 'bc_tickets'], ['item_strap', 'bc_strap'], ['item_duster', 'bc_duster'], ['item_usb', 'bc_usb'], ['item_ties', 'bc_ties']];
      for (const [n, line] of items) {
        const it = find(this.case, n); const p = it.getWorldPosition(new THREE.Vector3()); const b = new THREE.Box3().setFromObject(it); b.getCenter(p);
        c.shot({ pos: [p.x + 0.0, p.y + 0.38, p.z - 0.3], look: [p.x, p.y, p.z], fov: 30, dof: 0.004, focus: [p.x, p.y, p.z] });
        it.position.y += 0.03; audio.sfx('pickup', { vol: 0.4 });
        await c.say(line, g.player.actor, { anim: false });
        it.position.y -= 0.03;
      }
    }, { endYaw: Math.PI });
    g.player.gadgets = true;
    g.ui.toast(g.touch ? 'Gadgets unlocked: ZAP (anti-static strap) and AIR (compressed air)' : 'Gadgets unlocked: Q = Zap (anti-static strap), R = compressed air. Try the air on those boxes.', 6);
    this.case.visible = false; st.phase = 'leave';
    this.objective('Feed Cache in the back room, then head for the airport (front door)');
    this.msg('MR. THOMAS', 'Plane at 9. Do not forget cat. I mean it.');
    this.interact({ pos: V(1.4, 0.6, -4.55), r: 1.2, dy: 1.6, once: true, label: 'Feed Cache', fn: () => {
      find(this.bowl, 'food').visible = true; audio.sfx('food_pour', { vol: 0.8 }); st.catFed = 1; g.ui.toast('Tuna. The good stuff.');
      this.cat.play('idle'); this.cat.walkTo([[1.2, 0.0, -5.6], [1.4, 0, -4.95]], { speed: 0.6, endAnim: 'sit', endYaw: Math.PI }).then(() => { audio.sfx('meow', { pos: this.cat.root.position, vol: 0.8 }); });
      this.objective('Head for the airport: leave through the front door');
    } });
    this.trigger([1.5, 1, 3.3], [1.4, 1.5, 0.8], async () => {
      if (!st.catFed) { g.ui.toast('Mr. Thomas said: feed your cat. You do not ignore Mr. Thomas.'); this.leaveTrig.enabled = true; return; }
      await this.leave();
    }, { once: true });
    this.leaveTrig = this.triggers[this.triggers.length - 1];
  }
  async leave() {
    const g = this.game, cs = g.cutscene;
    await cs.run(async c => {
      c.shot({ pos: [1.5, 1.6, -0.5], look: [1.5, 1.4, 3.5], fov: 42 });
      g.player.actor.yaw = Math.PI; g.player.yaw = Math.PI;
      await c.say('c2_18', g.player.actor);
      audio.sfx('meow', { vol: 0.8 });
      await c.fade(1, 1.2);
    });
    g.save.unlocked = Math.max(g.save.unlocked, 2); g.persist();
    g.startLevel('plane', null);
  }
}

// ================================================================= TITLE BACKDROP
export class TitleLevel extends Level {
  async build() {
    const g = this.game; await buildShop(this, 'dusk');
    this.cat = new Actor(g, 'cat', { name: 'cat', collider: false }); this.cat.place(-2.0, 0.55, 1.75, 0.3); this.cat.play('sit'); this.add(this.cat.root);
    this.steve = new Actor(g, 'steve', { collider: false }); this.steve.place(-2.6, 0, -2.9, Math.PI); this.steve.play('reach'); this.add(this.steve.root);
    this.screenOn(this.crt, 320, 240, (x, s) => drawDoors98(x, s, 'desktop'));
    audio.ambience('amb_night', 0.5);
  }
  async start() {}
  update(dt) {
    super.update(dt); const t = this.game.time * 0.05; const cam = this.game.world.camera;
    cam.position.set(1.5 + Math.sin(t) * 6, 2.9 + Math.sin(t * 0.7) * 0.4, 13 + Math.cos(t) * 2.5); cam.lookAt(0.8, 2.3, 1); cam.fov = 45; cam.updateProjectionMatrix();
    this.game.cutscene.active = false;
  }
}

// ================================================================= EPILOGUE
export class EpilogueLevel extends Level {
  constructor(g) { super(g); this.title = 'Chapter 5: Paid In Full'; }
  async build() {
    const g = this.game; await buildShop(this, 'eve');
    audio.ambience('amb_night', 0.4);
    this.cat = new Actor(g, 'cat', { name: 'cat', radius: 0.15, speed: 0.6 }); this.cat.place(-0.4, 0.5, -7.3, 0.3); this.cat.play('sleep'); this.add(this.cat.root);
    this.ellis = new Actor(g, 'ellis', { name: 'ellis', scale: 0.93 }); this.ellis.place(1.5, 0, 9, Math.PI); this.add(this.ellis.root); this.ellis.root.visible = false;
    this.oleg = new Actor(g, 'oleg', { name: 'oleg', scale: 1.08 }); this.oleg.place(-2, 0, 9, Math.PI); this.add(this.oleg.root); this.oleg.root.visible = false;
    this.ellisCar.visible = false; this.olegCar.visible = false;
    const pl = g.makePlayer(); pl.place(1.5, 0, 3.6, Math.PI); pl.gadgets = false;
    this.crtS = this.screenOn(this.crt, 320, 240, (x, s) => this.postCredits ? (() => { x.fillStyle = '#031'; x.fillRect(0, 0, 320, 240); pixText(x, 'HELLO, STEVE.', 160, 100, 3, '#6fb', 'center'); scanlines(x, 320, 240); })() : drawDoors98(x, s, 'off'));
    this.tvS = this.screenOn(this.tv, 160, 120, (x, s) => { x.fillStyle = '#103'; x.fillRect(0, 0, 160, 120); pixText(x, 'NEWS', 80, 20, 2, '#fff', 'center'); pixWrap(x, 'MYSTERY: EVERY OLD COMPUTER ON EARTH STILL WORKS', 10, 50, 1, '#ff5', 24); });
    this.st = { fed: false };
    this.interact({ pos: V(1.4, 0.6, -4.55), r: 1.2, dy: 1.6, once: true, label: 'Feed Cache', fn: () => { find(this.bowl, 'food').visible = true; audio.sfx('food_pour'); g.bark('e_feed', g.player.actor);
      this.cat.walkTo([[0.5, 0, -6.5], [1.4, 0, -4.95]], { speed: 0.7, endAnim: 'sit' }); this.st.fed = true; this.objective('Wait for Ms. Ellis... she always comes by on Fridays'); this.after(4, () => this.ellisArrives()); } });
    this.interact({ pos: () => this.cat.root.position.clone().setY(0.6), r: 1.1, dy: 1.6, label: 'Pet Cache', fn: () => { this.cat.play('purr'); audio.sfx('purr', { vol: 0.8 }); g.player.actor.play('pet'); g.player.override = true; setTimeout(() => { g.player.override = false; this.cat.play('sit'); }, 1400); } });
    this.floppyE = inst('floppy'); this.floppyE.position.set(-6.6, 0.71, -7.0); this.add(this.floppyE);
  }
  update(dt) {
    super.update(dt); const pl = this.game.player; if (!pl) return;
    const near = [pl.pos, this.ellis.root.position, this.oleg.root.position].some(p => Math.abs(p.x - 1.5) < 1.3 && Math.abs(p.z - 2) < 1.4);
    if (near !== this.frontDoor.open) { this.frontDoor.set(near); if (near) audio.sfx('door_chime', { vol: 0.6, vary: 0 }); }
    const nb = Math.abs(pl.pos.x + 3) < 1 && Math.abs(pl.pos.z + 4) < 1.3; if (nb !== this.backDoor.open) this.backDoor.set(nb);
    pl.surface = pl.pos.z < -4 ? 'wood' : pl.pos.z > 2.1 ? 'concrete' : 'tile';
  }
  hint() { return this.st.fed ? 'Ms. Ellis will be here any second.' : 'Cache\'s bowl is in the back room.'; }
  async start() {
    const g = this.game, cs = g.cutscene;
    audio.music('ending');
    await cs.run(async c => {
      c.shot({ pos: [6, 3, 14], look: [1, 2, 2], fov: 40, to: { pos: [3, 2, 7] }, dur: 6 });
      g.ui.fade(0, 1.5);
      g.ui.chapter('CHAPTER FIVE', 'Paid In Full');
      await c.wait(4);
      c.shot({ pos: [1.5, 1.6, 6], look: [1.5, 1.2, 3], fov: 40 });
      await c.say('e_01', g.player.actor);
    });
    this.objective('Feed Cache (back room)');
  }
  async ellisArrives() {
    const g = this.game, cs = g.cutscene, pl = g.player;
    this.ellis.root.visible = true; this.ellis.place(1.5, 0, 6, Math.PI);
    await cs.run(async c => {
      pl.place(0.6, 0, -1.5, 0);
      c.shot({ pos: [-1.2, 1.5, -1.6], look: [1.5, 1.3, 2.2], fov: 40 });
      audio.sfx('door_chime', { vol: 0.8, vary: 0 });
      const w = c.walk(this.ellis, [[1.5, 0, 2.6], [0.6, 0, 0.35]], { speed: 1.0, endYaw: Math.PI });
      await c.say('e_02', this.ellis, { anim: 'wave' }); await w;
      pl.actor.lookAt(this.ellis.headPos()); this.ellis.lookAt(pl.actor.headPos());
      c.shot({ pos: [2.0, 1.5, -0.8], look: [0.5, 1.5, -0.6], fov: 38 });
      await c.say('e_03', pl.actor); await c.say('e_04', this.ellis);
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.5], fov: 30, dof: true });
      await c.say('e_05', pl.actor, { anim: 'think' });
      c.shot({ pos: [0.65, 1.55, -1.1], look: [0.6, 1.5, 0.35], fov: 30, dof: true });
      const tin = this.place('cookie_tin', [0.6, 1.04, -0.5], 0, { col: false }); audio.sfx('case_down', { vol: 0.5 });
      await c.say('e_06', this.ellis);
      c.shot({ pos: [0.6, 1.6, -0.9], look: [0.6, 1.08, -0.5], fov: 30, dof: true });
      find(tin, 'lid').position.set(0.2, 0, 0.1); audio.sfx('tin_open', { vol: 0.8 });
      const note = this.noteCard(); note.position.set(0.6, 1.12, -0.5); note.rotation.x = -Math.PI / 2;
      await c.say('e_07', pl.actor, { anim: false });
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.5], fov: 30, dof: true });
      await c.say('e_08', pl.actor);
      c.shot({ pos: [0.65, 1.55, -1.1], look: [0.6, 1.5, 0.35], fov: 28, dof: true, to: { fov: 22 }, dur: 6 });
      await c.say('e_09', this.ellis);
      this.oleg.root.visible = true; this.oleg.place(1.5, 0, 2.6, Math.PI);
      c.shot({ pos: [-0.5, 1.5, -1.5], look: [1.5, 1.6, 2.4], fov: 36 });
      audio.sfx('door_chime', { vol: 0.6, vary: 0 });
      await c.walk(this.oleg, [[1.5, 0, 1.4]], { speed: 1.2, endYaw: Math.PI });
      await c.say('e_10', this.oleg, { anim: 'nod' });
      c.shot({ pos: [0.3, 1.7, 0.6], look: [0.6, 1.6, -1.5], fov: 30, dof: true });
      await c.say('e_11', pl.actor);
      c.shot({ pos: [0.65, 1.55, -1.1], look: [0.6, 1.5, 0.35], fov: 30, dof: true });
      await c.say('e_12', this.ellis);
      c.shot({ pos: [-1.0, 1.7, -1.6], look: [1.5, 1.2, 2.2], fov: 42 });
      const w2 = c.walk(this.ellis, [[1.5, 0, 1.0], [1.5, 0, 3.4], [1.5, 0, 7]], { speed: 1.0 }); const w3 = c.walk(this.oleg, [[1.7, 0, 3.2], [1.0, 0, 7]], { speed: 1.0 });
      await c.wait(3.5);
      // Steve and the cat
      this.cat.place(1.0, 1.04, -0.75, Math.PI); this.cat.play('sit');
      c.shot({ pos: [1.6, 1.5, -1.9], look: [0.9, 1.25, -0.8], fov: 34, dof: true });
      pl.actor.lookAt(this.cat.headPos());
      await c.say('e_13', pl.actor);
      c.shot({ pos: [1.0, 1.35, -1.5], look: [1.0, 1.25, -0.75], fov: 26, dof: true });
      this.cat.play('purr'); await c.say('e_14', this.cat, { anim: false });
      await c.wait(0.6);
      await c.fade(1, 1.5);
    });
    this.credits();
  }
  noteCard() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const x = cv.getContext('2d'); x.fillStyle = '#fbf6e8'; x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#223a7a'; x.font = 'italic 22px Georgia, serif'; x.fillText('Lovely work in Zurich.', 16, 60); x.font = 'italic bold 26px Georgia, serif'; x.fillText('- N.', 170, 120);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.11), new THREE.MeshStandardMaterial({ map: t })); this.add(m); return m;
  }
  credits() {
    const g = this.game; audio.music('ending'); g.ui.hud(false); g.state.playing = false;
    const s = g.stats;
    const html = `<h1>STEVE</h1><p>THE PC REPAIR MAN</p>
      <h3>THE JOB</h3><p>W.I.N.S.T.O.N.: taken down (turned off and on again)</p><p>Easter eggs found: ${g.secretCount()} / ${g.SECRETS.length}</p><p>Guards given a static nap: ${s.zaps || 0}</p><p>Times caught: ${s.caught || 0}</p><p>Things thrown: ${s.throws || 0}</p>
      <h3>CAST</h3><p>Steve ............ himself</p><p>Ms. Ellis ("Nightingale") ............ herself</p><p>Mr. Thomas (Oleg) ............ a large man</p><p>W.I.N.S.T.O.N. ............ a very smart computer</p><p>Konrad Brecht ............ world's best admin (self-assessed)</p><p>Brigitte, Lars, the Uptime Security team</p><p>Cache ............ the cat</p><p>Kernel ............ the other cat</p>
      <h3>MADE ENTIRELY FROM CODE</h3><p class="small">Every 3D model and character was generated by Python scripts running headless in Blender and exported to glTF. Skeletons, skin weights and all ${28} animations were keyframed procedurally.</p>
      <p class="small">Every texture, screen, poster and the 5x7 pixel font were drawn procedurally at load time.</p>
      <p class="small">Every sound effect and every piece of music was synthesized with NumPy: no samples, no recordings.</p>
      <p class="small">All voices were generated locally with the open-source Kokoro TTS model, then processed (pitch, EQ, reverb, radio and robot effects) in Python.</p>
      <h3>ENGINE</h3><p class="small">three.js renderer, Rapier physics, Web Audio. Built with Vite.</p>
      <h3>SPECIAL THANKS</h3><p>Everyone who ever asked "have you tried turning it off and on again?"</p><p>&nbsp;</p><p>Same time next month.</p><p>&nbsp;</p><p>&nbsp;</p>`;
    g.ui.fade(0, 0.5);
    g.ui.credits(html, async () => {
      g.secret('credits');
      // post-credits sting
      this.postCredits = true; g.ui.fade(1, 0.01);
      const cs = g.cutscene; g.state.playing = true;
      await cs.run(async c => { c.shot({ pos: [-2.2, 1.45, -2.6], look: [-2.2, 1.15, -3.65], fov: 35, dof: true }); this.crt.visible = true; await c.fade(0, 1.2); audio.sfx('crt_on', { vol: 0.8 }); await c.wait(1.0); await c.say('e_post', null); await c.wait(1.5); await c.fade(1, 1.0); });
      g.state.playing = false; g.save.unlocked = 5; g.persist(); g.title();
    });
  }
}
