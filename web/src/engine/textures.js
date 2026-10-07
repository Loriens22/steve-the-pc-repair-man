// Procedural canvas textures + a hand-made 5x7 pixel font. Nothing here is loaded from disk.
import * as THREE from 'three';

const G = {
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[28,18,17,17,17,18,28],E:[31,16,16,30,16,16,31],
  F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],
  K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
  U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],
  Z:[31,1,2,4,8,16,31],'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[31,2,4,2,1,17,14],
  '4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],'6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],
  '9':[14,17,17,15,1,2,12],' ':[0,0,0,0,0,0,0],'.':[0,0,0,0,0,12,12],',':[0,0,0,0,12,4,8],':':[0,12,12,0,12,12,0],
  '!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],'-':[0,0,0,31,0,0,0],'/':[1,1,2,4,8,16,16],"'":[4,4,8,0,0,0,0],'"':[10,10,0,0,0,0,0],
  '(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'_':[0,0,0,0,0,0,31],'=':[0,0,31,0,31,0,0],'+':[0,4,4,31,4,4,0],'>':[8,4,2,1,2,4,8],
  '<':[2,4,8,16,8,4,2],'%':[24,25,2,4,8,19,3],'#':[10,10,31,10,31,10,10],'*':[0,4,21,14,21,4,0],'@':[14,17,1,13,21,21,14],
  '$':[4,15,20,14,5,30,4],'&':[12,18,20,8,21,18,13],'[':[14,8,8,8,8,8,14],']':[14,2,2,2,2,2,14],'|':[4,4,4,4,4,4,4],
  '\\':[16,16,8,4,2,1,1],'^':[4,10,17,0,0,0,0],'~':[0,0,8,21,2,0,0],
};
export function pixText(ctx, str, x, y, s = 2, color = '#fff', align = 'left') {
  str = String(str).toUpperCase();
  const w = str.length * 6 * s;
  if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const g = G[str[i]] || G['?'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) ctx.fillRect(Math.round(x + (i * 6 + c) * s), Math.round(y + r * s), s, s);
  }
  return w;
}
export function pixWrap(ctx, str, x, y, s, color, maxChars, lh = 9) {
  const words = String(str).split(' '); let line = ''; let yy = y;
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { pixText(ctx, line.trim(), x, yy, s, color); yy += lh * s; line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) pixText(ctx, line.trim(), x, yy, s, color);
  return yy + lh * s;
}

// ---------------------------------------------------------------- noise helpers
let seed = 1337;
export function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function noiseFill(ctx, w, h, base, amt, scale = 1) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}
function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- generators
const gen = {
  wood(c = '#9a6b42') {
    const [cv, x] = canvas(256, 256); x.fillStyle = c; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(40,20,5,${0.05 + rnd() * 0.12})`; x.lineWidth = 1 + rnd() * 2; x.beginPath(); const yy = rnd() * 256;
      x.moveTo(0, yy); for (let k = 0; k <= 256; k += 16) x.lineTo(k, yy + Math.sin(k / 30 + i) * 3 + rnd() * 2); x.stroke(); }
    for (let p = 0; p < 4; p++) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, p * 64, 256, 2); }
    noiseFill(x, 256, 256, 0, 10); return tex(cv);
  },
  timber() {
    const [cv, x] = canvas(256, 256); x.fillStyle = '#7a4e2c'; x.fillRect(0, 0, 256, 256);
    for (let p = 0; p < 8; p++) { x.fillStyle = `hsl(25,${35 + rnd() * 10}%,${22 + rnd() * 8}%)`; x.fillRect(p * 32, 0, 30, 256); x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(p * 32 + 30, 0, 2, 256);
      for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(20,10,0,${rnd() * 0.15})`; x.fillRect(p * 32 + rnd() * 30, 0, 1, 256); } }
    noiseFill(x, 256, 256, 0, 14); return tex(cv, [3, 3]);
  },
  stone() {
    const [cv, x] = canvas(256, 256); x.fillStyle = '#555'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 5; k++) { const w = 52, off = (r % 2) * 26; x.fillStyle = `hsl(30,6%,${42 + rnd() * 20}%)`;
      x.beginPath(); x.roundRect(k * w - off + 2, r * 32 + 2, w - 4, 28, 6); x.fill(); }
    noiseFill(x, 256, 256, 0, 18); return tex(cv, [4, 1]);
  },
  roof_snow() { const [cv, x] = canvas(128, 128); x.fillStyle = '#eef3f8'; x.fillRect(0, 0, 128, 128); noiseFill(x, 128, 128, 0, 10); return tex(cv, [4, 4]); },
  snow() { const [cv, x] = canvas(256, 256); x.fillStyle = '#e9f0f7'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(160,180,210,${rnd() * 0.12})`; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 2 + rnd() * 10, 0, 7); x.fill(); }
    for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(rnd() * 256, rnd() * 256, 1, 1); }
    return tex(cv, [20, 20]); },
  carpet(c = '#5a5f6a') { const [cv, x] = canvas(128, 128); x.fillStyle = c; x.fillRect(0, 0, 128, 128); noiseFill(x, 128, 128, 0, 26); return tex(cv, [6, 6]); },
  carpet_plane() { const [cv, x] = canvas(128, 128); x.fillStyle = '#2b3550'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(200,170,110,0.35)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, i * 32 + 16); x.lineTo(64, i * 32); x.lineTo(128, i * 32 + 16); x.stroke(); }
    noiseFill(x, 128, 128, 0, 16); return tex(cv, [2, 8]); },
  tiles(a = '#d9d6cf', b = '#7d8aa0') { const [cv, x] = canvas(256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * 64, j * 64, 64, 64); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(i * 64, j * 64, 64, 1); x.fillRect(i * 64, j * 64, 1, 64); }
    noiseFill(x, 256, 256, 0, 10); return tex(cv, [6, 6]); },
  ceiling() { const [cv, x] = canvas(128, 128); x.fillStyle = '#e6e2d8'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(80,70,60,${rnd() * 0.25})`; x.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); }
    x.fillStyle = '#bdb8ac'; x.fillRect(0, 0, 128, 3); x.fillRect(0, 0, 3, 128); return tex(cv, [8, 8]); },
  wall(c = '#e8e3d6') { const [cv, x] = canvas(128, 128); x.fillStyle = c; x.fillRect(0, 0, 128, 128); noiseFill(x, 128, 128, 0, 8); return tex(cv, [4, 2]); },
  asphalt() { const [cv, x] = canvas(256, 256); x.fillStyle = '#3c3f44'; x.fillRect(0, 0, 256, 256); noiseFill(x, 256, 256, 0, 30);
    for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.moveTo(rnd() * 256, rnd() * 256); x.lineTo(rnd() * 256, rnd() * 256); x.stroke(); } return tex(cv, [10, 10]); },
  concrete(c = '#9a9a96') { const [cv, x] = canvas(256, 256); x.fillStyle = c; x.fillRect(0, 0, 256, 256); noiseFill(x, 256, 256, 0, 18);
    x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, 127, 256, 2); x.fillRect(127, 0, 2, 256); return tex(cv, [6, 6]); },
  grate() { const [cv, x] = canvas(128, 128); x.fillStyle = '#2a2d31'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#5a6068';
    for (let i = 0; i < 8; i++) { x.fillRect(i * 16, 0, 4, 128); x.fillRect(0, i * 16, 128, 4); } return tex(cv, [20, 20]); },
  pegboard(c = '#c9a77a') { const [cv, x] = canvas(128, 128); x.fillStyle = c; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.beginPath(); x.arc(i * 16 + 8, j * 16 + 8, 2.2, 0, 7); x.fill(); } return tex(cv, [6, 4]); },
  cardboard() { const [cv, x] = canvas(128, 128); x.fillStyle = '#b58a5a'; x.fillRect(0, 0, 128, 128); noiseFill(x, 128, 128, 0, 14);
    pixText(x, 'FRAGILE', 20, 50, 2, '#7a2a1a'); pixText(x, '^ ^', 44, 80, 3, '#3a2a1a'); return tex(cv); },
  crate() { const [cv, x] = canvas(128, 128); x.fillStyle = '#8a6a3a'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#5a4020'; x.lineWidth = 8; x.strokeRect(4, 4, 120, 120); x.beginPath(); x.moveTo(8, 8); x.lineTo(120, 120); x.stroke(); noiseFill(x, 128, 128, 0, 16); return tex(cv); },
  hazard() { const [cv, x] = canvas(128, 64); x.fillStyle = '#f2c94c'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#111';
    for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(i * 16, 64); x.lineTo(i * 16 + 8, 64); x.lineTo(i * 16 + 40, 0); x.lineTo(i * 16 + 32, 0); x.fill(); } return tex(cv); },
  mountain() { const [cv, x] = canvas(256, 256); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f4f7fb'); g.addColorStop(0.6, '#c9d3de'); g.addColorStop(1, '#6a7480');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(70,80,95,${rnd() * 0.4})`; x.fillRect(rnd() * 256, 80 + rnd() * 176, 2 + rnd() * 12, 1 + rnd() * 4); } return tex(cv, [3, 1]); },
  label(text, bg, fg, w = 128, h = 32, s = 2) { const [cv, x] = canvas(w, h); x.fillStyle = bg; x.fillRect(0, 0, w, h); pixText(x, text, w / 2, h / 2 - 3.5 * s, s, fg, 'center'); return tex(cv); },
  logo_patch() { const [cv, x] = canvas(64, 32); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 32); pixText(x, "STEVE'S", 32, 5, 1, '#1d4f8a', 'center'); pixText(x, 'PC FIX', 32, 17, 1, '#c0392b', 'center'); return tex(cv); },
  uptime_patch() { const [cv, x] = canvas(64, 32); x.fillStyle = '#c0392b'; x.fillRect(0, 0, 64, 32); pixText(x, 'UPTIME', 32, 5, 1, '#fff', 'center'); pixText(x, 'SECURITY', 32, 17, 1, '#fff', 'center'); return tex(cv); },
  shop_sign() { const [cv, x] = canvas(512, 100); const g = x.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, '#1e4f8f'); g.addColorStop(1, '#123a6b');
    x.fillStyle = g; x.fillRect(0, 0, 512, 100); pixText(x, "STEVE'S PC REPAIR", 256, 18, 5, '#ffd84a', 'center'); pixText(x, 'HONEST PRICES - SENIORS 50% OFF', 256, 70, 2, '#ffffff', 'center'); return tex(cv); },
  door_decal() { const [cv, x] = canvas(256, 100); x.clearRect(0, 0, 256, 100); x.fillStyle = 'rgba(255,255,255,0.0)'; x.fillRect(0, 0, 256, 100);
    pixText(x, 'OPEN', 128, 8, 6, '#d02020', 'center'); pixText(x, 'MON-SAT 9-6', 128, 62, 2, '#ffffff', 'center'); pixText(x, 'WE FIX IT. NO JUDGEMENT.', 128, 82, 1, '#ffffff', 'center'); return tex(cv); },
  y2k() { const [cv, x] = canvas(128, 64); x.fillStyle = '#e8e0c8'; x.fillRect(0, 0, 128, 64); pixText(x, 'Y2K', 64, 6, 4, '#222', 'center'); pixText(x, 'SURVIVAL KIT', 64, 42, 1, '#a02020', 'center'); return tex(cv); },
  vanlogo() { const [cv, x] = canvas(512, 160); x.fillStyle = '#5a3a22'; x.fillRect(0, 0, 512, 160); x.fillStyle = '#f0e6d0'; x.fillRect(0, 0, 512, 10); x.fillRect(0, 150, 512, 10);
    pixText(x, 'SWISS', 256, 22, 5, '#f8e8c0', 'center'); pixText(x, 'CHOCOLATE DELIVERY', 256, 70, 3, '#f8e8c0', 'center'); pixText(x, 'WE DELIVER. ALWAYS. ANYWHERE.', 256, 115, 2, '#e8b860', 'center'); return tex(cv); },
  photo_ellis() { const [cv, x] = canvas(256, 192); x.fillStyle = '#c8b898'; x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#8a7a60'; x.fillRect(0, 120, 256, 72); x.fillStyle = '#6a5a48'; x.fillRect(150, 30, 90, 90); x.fillStyle = '#e8dcc0'; x.fillRect(158, 40, 74, 22);
    pixText(x, 'CHECKPOINT', 195, 47, 1, '#3a2a1a', 'center'); x.fillStyle = '#3a3028';
    [[70, 1], [110, 0.9]].forEach(([px, s]) => { x.beginPath(); x.arc(px, 70, 12 * s, 0, 7); x.fill(); x.fillRect(px - 14 * s, 82, 28 * s, 60 * s); });
    x.fillStyle = 'rgba(255,240,200,0.25)'; x.fillRect(0, 0, 256, 192); noiseFill(x, 256, 192, 0, 30); pixText(x, 'H & D - BERLIN 1962', 128, 175, 1, '#3a2a1a', 'center'); return tex(cv); },
  photo_bsod() { const [cv, x] = canvas(256, 192); x.fillStyle = '#0000aa'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#aaa'; x.fillRect(96, 20, 64, 11);
    pixText(x, 'WINDOWS', 128, 22, 1, '#0000aa', 'center'); pixWrap(x, 'A FATAL EXCEPTION 0E HAS OCCURRED AT 0028:C0011E36. THE CURRENT APPLICATION WILL BE TERMINATED.', 14, 46, 1, '#fff', 38);
    pixText(x, 'PRESS ANY KEY TO CONTINUE _', 128, 150, 1, '#fff', 'center'); return tex(cv); },
  globe() { const [cv, x] = canvas(256, 128); x.fillStyle = '#2a5d9a'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#7aa05a';
    for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(rnd() * 256, 20 + rnd() * 88, 6 + rnd() * 20, 4 + rnd() * 14, rnd() * 3, 0, 7); x.fill(); }
    x.fillStyle = '#e03030'; [[140, 40], [150, 70], [80, 80], [120, 60], [200, 50]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); }); return tex(cv); },
  planewin() { const [cv, x] = canvas(64, 96); const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#05081a'); g.addColorStop(0.6, '#1a2648'); g.addColorStop(1, '#5a6a8a');
    x.fillStyle = g; x.fillRect(0, 0, 64, 96); for (let i = 0; i < 20; i++) { x.fillStyle = '#fff'; x.fillRect(rnd() * 64, rnd() * 50, 1, 1); }
    x.fillStyle = 'rgba(200,210,230,0.5)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(rnd() * 64, 70 + rnd() * 20, 14, 5, 0, 0, 7); x.fill(); }
    x.fillStyle = '#f8f4e0'; x.beginPath(); x.arc(44, 20, 6, 0, 7); x.fill(); return tex(cv); },
  sticky(text, s = 1) { const [cv, x] = canvas(64, 64); x.fillStyle = '#ffe066'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, 0, 64, 8);
    const lines = text.split('\n'); lines.forEach((l, i) => pixText(x, l, 32, 14 + i * 12 * s, s, '#203070', 'center')); return tex(cv); },
  snowface() { const [cv, x] = canvas(64, 48); x.fillStyle = '#103010'; x.fillRect(0, 0, 64, 48); pixText(x, '^ ^', 32, 10, 2, '#5f5', 'center'); pixText(x, '\\_/', 32, 28, 2, '#5f5', 'center');
    x.fillStyle = '#5f5'; x.fillRect(20, 30, 24, 3); return tex(cv); },
  lavsign() { return gen.label('OCCUPIED', '#300', '#f44', 64, 16, 1); },
  vendfront() { const [cv, x] = canvas(128, 256); x.fillStyle = '#223'; x.fillRect(0, 0, 128, 256);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { x.fillStyle = ['#c33', '#3a3', '#fc3', '#39f', '#f80'][(r + c) % 5]; x.fillRect(10 + c * 28, 14 + r * 38, 20, 26); }
    return tex(cv); },
  rackfront() { // LED matrix; animated by offset in code
    const [cv, x] = canvas(64, 256); x.fillStyle = '#0c0d10'; x.fillRect(0, 0, 64, 256);
    for (let u = 0; u < 32; u++) { x.fillStyle = '#1a1c21'; x.fillRect(2, u * 8 + 1, 60, 6);
      for (let k = 0; k < 6; k++) if (rnd() < 0.55) { const c = rnd(); x.fillStyle = c < 0.6 ? '#2f6' : c < 0.85 ? '#3af' : '#fa2'; x.fillRect(6 + k * 4, u * 8 + 3, 2, 2); }
      x.fillStyle = '#333840'; x.fillRect(40, u * 8 + 2, 18, 4); }
    const t = tex(cv); return t; },
};
gen.wood_dark = () => gen.wood('#4a3020');
gen.pegboard_dark = () => gen.pegboard('#2a2d33');
gen.label_batt = () => gen.label('BATTERIES', '#f2c94c', '#222', 128, 32, 2);
gen.sticky_pin = () => gen.sticky('DOOR PIN\n0451\nDONT\nFORGET');

const cache = {};
export function getTex(name, ...args) {
  const key = name + JSON.stringify(args);
  if (!cache[key]) { if (!gen[name]) return null; cache[key] = gen[name](...args); }
  return cache[key];
}
export { gen };

// A dynamic screen: canvas texture with draw callback, updated on demand.
export class Screen {
  constructor(w = 320, h = 240, draw = null) {
    [this.canvas, this.ctx] = canvas(w, h); this.w = w; this.h = h; this.draw = draw;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter;
    this.t = 0; this.state = {};
    if (draw) { draw(this.ctx, this, 0); this.tex.needsUpdate = true; }
  }
  update(dt) { if (!this.draw) return; this.t += dt; this.draw(this.ctx, this, dt); this.tex.needsUpdate = true; }
  material(emissive = 1.0) {
    return new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, color: new THREE.Color(emissive, emissive, emissive) });
  }
}
// CRT scanline overlay helper
export function scanlines(ctx, w, h, a = 0.18) { ctx.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1); }
