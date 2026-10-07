// Level QA harness (used by tools/audit.py in headless Chromium; harmless in normal play).
//  - grid(): samples the level on a 0.2 m grid with the player's real capsule against the real Rapier colliders
//  - reach(): flood-fills from the player's position and checks every interactable / trigger is reachable
//  - goTo()/use(): an autopilot that walks the real character controller along the flood-fill path and presses USE
//  - chain(): plays a chapter's objective chain end to end (cutscenes are NOT skipped)
import * as THREE from 'three';
import { R } from './physics.js';
import { press } from './input.js';

const CELL = 0.2, RAD = 0.28, HALF = 0.58;
const BOUNDS = { shop: [-21, 21, -9, 23.5], epilogue: [-21, 21, -9, 23.5], plane: [-2.2, 2.2, -6.3, 6.3], chalet: [-37, 37, -39, 43], vault: [-8.3, 8.3, -4.3, 28.3], vault_core: [-14, 14, -14, 14] };
const lbl = it => { try { return typeof it.label === 'function' ? it.label() : it.label; } catch (e) { return null; } };

export class Audit {
  constructor(game) { this.g = game; this.log = []; }
  key() { const L = this.g.level; return this.g.levelName + (L && L.part === 'core' ? '_core' : ''); }
  // ------------------------------------------------------------------ walkability grid
  grid(o = {}) {
    const g = this.g, P = g.physics, W = P.world;
    const b = o.bounds || BOUNDS[this.key()] || [-20, 20, -20, 20], floor = o.floor ?? 0, cell = o.cell || CELL;
    const nx = Math.ceil((b[1] - b[0]) / cell), nz = Math.ceil((b[3] - b[2]) / cell);
    const gy = new Float32Array(nx * nz), st = new Uint8Array(nx * nz), why = new Array(nx * nz);
    const shape = new R.Capsule(HALF, RAD), rot = { x: 0, y: 0, z: 0, w: 1 };
    const types = o.block || ['static'];
    const pred = c => { const m = P.meta.get(c.handle); return !!m && types.includes(m.type) && !c.isSensor() && !(m.dyn && m.dyn.held); };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = b[0] + (i + 0.5) * cell, z = b[2] + (j + 0.5) * cell;
      const hit = W.castRay(new R.Ray({ x, y: floor + 1.0, z }, { x: 0, y: -1, z: 0 }), 2.0, true, undefined, undefined, undefined, undefined, pred);
      if (!hit) { st[k] = 0; continue; }
      const y = floor + 1.0 - (hit.timeOfImpact ?? hit.toi); gy[k] = y;
      if (y > floor + 0.45) { st[k] = 1; why[k] = hit.collider.handle; continue; }
      const c = W.intersectionWithShape({ x, y: y + HALF + RAD + 0.3, z }, rot, shape, undefined, undefined, undefined, undefined, pred);
      if (c) { st[k] = 1; why[k] = c.handle; } else st[k] = 2;
    }
    return { b, nx, nz, gy, st, why, cell, floor };
  }
  cellOf(G, x, z) { const i = Math.floor((x - G.b[0]) / G.cell), j = Math.floor((z - G.b[2]) / G.cell); return (i < 0 || j < 0 || i >= G.nx || j >= G.nz) ? -1 : j * G.nx + i; }
  cpos(G, k) { return { x: G.b[0] + ((k % G.nx) + 0.5) * G.cell, z: G.b[2] + (Math.floor(k / G.nx) + 0.5) * G.cell, y: G.gy[k] }; }
  nearestWalk(G, x, z, maxR = 1.2) {
    let best = -1, bd = 1e9; const r = Math.ceil(maxR / G.cell), c0 = this.cellOf(G, x, z); if (c0 < 0) return -1;
    const i0 = c0 % G.nx, j0 = Math.floor(c0 / G.nx);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) continue; const k = j * G.nx + i; if (G.st[k] !== 2) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = k; } }
    return best;
  }
  flood(G, start) {
    const n = G.nx * G.nz, dist = new Int32Array(n).fill(-1), par = new Int32Array(n).fill(-1); if (start < 0) return { dist, par };
    const q = new Int32Array(n); let h = 0, t = 0; q[t++] = start; dist[start] = 0;
    const ok = (a, b2) => G.st[b2] === 2 && Math.abs(G.gy[a] - G.gy[b2]) < 0.33;
    while (h < t) {
      const k = q[h++], i = k % G.nx, j = Math.floor(k / G.nx);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= G.nx || jj >= G.nz) continue; const kk = jj * G.nx + ii;
        if (dist[kk] >= 0 || !ok(k, kk)) continue;
        if (di && dj && (!ok(k, j * G.nx + ii) || !ok(k, jj * G.nx + i))) continue;
        dist[kk] = dist[k] + 1; par[kk] = k; q[t++] = kk;
      }
    }
    return { dist, par };
  }
  // what counts as "standing in range" of a target, from a cell
  goalFn(t) {
    if (t.kind === 'trigger') return (c) => Math.abs(c.x - t.c.x) < t.h.x - 0.08 && Math.abs(c.z - t.c.z) < t.h.z - 0.08 && Math.abs(c.y + 0.9 - t.c.y) < t.h.y;
    // in range AND a clear line from Steve's chest to the target (static geometry only; a hit within 0.45 m of the target is the object itself)
    return (c, noLos) => { const p = t.p(); if (!p) return false; if (!(Math.hypot(c.x - p.x, c.z - p.z) <= t.r - 0.1 && Math.abs(p.y - (c.y + 1)) <= t.dy)) return false;
      if (noLos) return true; const P = this.g.physics, a = new THREE.Vector3(c.x, c.y + 1.2, c.z), d = new THREE.Vector3().subVectors(p, a), len = d.length(); if (len < 0.5) return true; d.normalize();
      const h = P.raycast(a, d, len, m => m.type === 'static'); return !h || h.toi >= len - 0.45; };
  }
  targets() {
    const g = this.g, out = [];
    for (const it of g.interactables) { if (!it.enabled) continue; out.push({ kind: 'interact', it, label: lbl(it) || '(hidden label)', active: !it.cond || !!it.cond(), r: it.r || 1.3, dy: it.dy || 1.4, p: () => { try { return typeof it.pos === 'function' ? it.pos() : it.pos; } catch (e) { return null; } } }); }
    (g.level.triggers || []).forEach((tr, i) => { if (tr.enabled) out.push({ kind: 'trigger', tr, label: 'trigger#' + i + ' @' + tr.c.x.toFixed(1) + ',' + tr.c.z.toFixed(1), c: tr.c, h: tr.h, active: !tr.cond || !!tr.cond() }); });
    return out;
  }
  reach(o = {}) {
    const g = this.g, pl = g.player, G = this.grid(o), t0 = performance.now();
    const sp = pl.pos, spawnCell = this.cellOf(G, sp.x, sp.z), spawnFree = spawnCell >= 0 && G.st[spawnCell] === 2;
    const start = spawnFree ? spawnCell : this.nearestWalk(G, sp.x, sp.z, 1.0);
    const F = this.flood(G, start);
    const res = [];
    for (const t of this.targets()) {
      const goal = this.goalFn(t); let ok = false, best = 1e9;
      for (let k = 0; k < G.st.length; k++) { if (F.dist[k] < 0) continue; const c = this.cpos(G, k); if (goal(c)) { ok = true; break; } }
      let wall = false; if (!ok && t.kind === 'interact') for (let k = 0; k < G.st.length; k++) { if (F.dist[k] >= 0 && goal(this.cpos(G, k), true)) { wall = true; break; } }
      if (!ok && t.kind === 'interact') { const p = t.p(); if (p) for (let k = 0; k < G.st.length; k++) if (F.dist[k] >= 0) { const c = this.cpos(G, k); best = Math.min(best, Math.hypot(c.x - p.x, c.z - p.z)); } }
      res.push({ label: t.label, kind: t.kind, active: t.active, ok, throughWall: wall, gap: ok ? 0 : +(best - t.r).toFixed(2), seated: !!pl.seated });
    }
    // name the colliders that block cells next to reachable area (for oversized-collider review)
    let walk = 0, reached = 0; for (let k = 0; k < G.st.length; k++) { if (G.st[k] === 2) walk++; if (F.dist[k] >= 0) reached++; }
    const out = { level: this.key(), spawn: { x: +sp.x.toFixed(2), z: +sp.z.toFixed(2), free: spawnFree, seated: !!pl.seated }, walk, reached, ms: Math.round(performance.now() - t0), targets: res, image: o.image === false ? null : this.image(G, F, res) };
    this.lastGrid = G; return out;
  }
  image(G, F, res) {
    const s = Math.max(2, Math.min(6, Math.floor(900 / Math.max(G.nx, G.nz)))), cv = document.createElement('canvas'); cv.width = G.nx * s; cv.height = G.nz * s; const x = cv.getContext('2d');
    for (let k = 0; k < G.st.length; k++) { const i = k % G.nx, j = Math.floor(k / G.nx); x.fillStyle = G.st[k] === 0 ? '#000' : G.st[k] === 1 ? '#a33' : F.dist[k] >= 0 ? '#3a6' : '#556'; x.fillRect(i * s, j * s, s, s); }
    const dot = (px, pz, col, r = 4) => { x.fillStyle = col; x.beginPath(); x.arc((px - G.b[0]) / G.cell * s, (pz - G.b[2]) / G.cell * s, r, 0, 7); x.fill(); };
    for (const t of this.targets()) { const r = res.find(q => q.label === t.label); const p = t.kind === 'trigger' ? t.c : t.p(); if (p) dot(p.x, p.z, r && r.ok ? '#ff0' : '#f0f'); }
    dot(this.g.player.pos.x, this.g.player.pos.z, '#39f', 5);
    return cv.toDataURL('image/png');
  }
  probe(x, z, y = 0) { const P = this.g.physics, out = []; P.world.intersectionsWithShape({ x, y: y + HALF + RAD + 0.06, z }, { x: 0, y: 0, z: 0, w: 1 }, new R.Capsule(HALF, RAD), c => { const m = P.meta.get(c.handle) || {}; const t = c.translation(); out.push({ type: m.type, label: m.dyn && m.dyn.label, at: [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)], he: c.halfExtents ? (({ x, y, z }) => [+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)])(c.halfExtents()) : null, enabled: c.isEnabled() }); return true; }); return out; }
  // ------------------------------------------------------------------ autopilot
  sleep(gameSec) { const t0 = this.g.time; return new Promise(r => { const f = () => (this.g.time - t0 >= gameSec ? r() : requestAnimationFrame(f)); f(); }); }
  waitFor(fn, maxReal = 600, label = '') { const t0 = performance.now(); return new Promise((res, rej) => { const f = () => { let v = false; try { v = fn(); } catch (e) {} if (v) res(true); else if (performance.now() - t0 > maxReal * 1000) rej(new Error('timeout waiting for ' + label)); else requestAnimationFrame(f); }; f(); }); }
  waitIdle(maxReal = 900) { const g = this.g; return this.waitFor(() => g.state.playing && !g.cutscene.active && !g.paused.any() && !g.caughtNow && g.player && !g.ui._fading, maxReal, 'idle'); }
  note(s) { const m = '[' + this.key() + ' t=' + this.g.time.toFixed(1) + '] ' + s; this.log.push(m); console.log('AUDIT ' + m); }
  find(re) { const r = new RegExp(re, 'i'); return this.targets().find(t => t.kind === 'interact' && t.active && r.test(t.label)); }
  async goTo(t, o = {}) {
    const g = this.g; let replans = 0; const goal = this.goalFn(t);
    for (;;) {
      await this.waitIdle();
      const pl = g.player, here = { x: pl.pos.x, z: pl.pos.z, y: pl.pos.y };
      if (goal(here)) { g.autoDir = null; return { ok: true }; }
      const G = this.grid(replans ? { block: ['static', 'npc', 'dyn'] } : {}); const start = this.nearestWalk(G, here.x, here.z, 1.0); const F = this.flood(G, start);
      let gk = -1, gd = 1e9; for (let k = 0; k < G.st.length; k++) if (F.dist[k] >= 0 && F.dist[k] < gd && goal(this.cpos(G, k))) { gd = F.dist[k]; gk = k; }
      if (gk < 0) { g.autoDir = null; return { ok: false, reason: 'no walkable path to ' + t.label }; }
      const path = []; for (let k = gk; k >= 0; k = F.par[k]) path.unshift(this.cpos(G, k));
      let wi = 0, lastProg = g.time, lastPos = { ...here }, stuck = false;
      while (true) {
        if (g.locked()) { g.autoDir = null; await this.waitIdle(); }
        const p = g.player.pos;
        if (goal({ x: p.x, z: p.z, y: p.y })) { g.autoDir = null; return { ok: true }; }
        while (wi < path.length - 1 && Math.hypot(path[wi].x - p.x, path[wi].z - p.z) < 0.3) wi++;
        // look ahead: aim at the furthest waypoint within 1.2 m to smooth the staircase path
        // string-pull: aim at the furthest waypoint (<= 1.5 m) whose straight line stays on walkable cells, so it never cuts a door frame
        const clear = (q) => { const dx = q.x - p.x, dz = q.z - p.z, n = Math.ceil(Math.hypot(dx, dz) / 0.08); for (let s2 = 1; s2 <= n; s2++) { const k = this.cellOf(G, p.x + dx * s2 / n, p.z + dz * s2 / n); if (k < 0 || G.st[k] !== 2) return false; } return true; };
        let aim = wi; while (aim < path.length - 1 && Math.hypot(path[aim + 1].x - p.x, path[aim + 1].z - p.z) < 1.5 && clear(path[aim + 1])) aim++;
        const dx = path[aim].x - p.x, dz = path[aim].z - p.z, dl = Math.hypot(dx, dz) || 1;
        g.autoDir = { x: dx / dl, z: dz / dl };
        await new Promise(r => requestAnimationFrame(r));
        if (g.time - lastProg > 3) { const moved = Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (moved < 0.2) { stuck = true; break; } lastProg = g.time; lastPos = { x: p.x, z: p.z }; }
        if (wi >= path.length - 1 && Math.hypot(path[path.length - 1].x - p.x, path[path.length - 1].z - p.z) < 0.15) break;
      }
      const ad = g.autoDir || { x: 0, z: 0 }, pp = g.player.pos, ahead = stuck ? this.probe(pp.x + ad.x * 0.3, pp.z + ad.z * 0.3, pp.y).filter(q => q.type !== 'player') : [];
      g.autoDir = null;
      if (stuck) { this.note('STUCK (blocked by ' + JSON.stringify(ahead) + ') at ' + g.player.pos.x.toFixed(2) + ',' + g.player.pos.z.toFixed(2) + ' going to ' + t.label); if (++replans > 3) return { ok: false, reason: 'stuck at ' + g.player.pos.x.toFixed(2) + ',' + g.player.pos.z.toFixed(2) }; }
      else if (++replans > 6) return { ok: false, reason: 'could not settle in range' };
    }
  }
  async use(re, o = {}) {
    const g = this.g; await this.waitIdle(); const t = this.find(re);
    if (!t) throw new Error('no active interactable matching /' + re + '/. Active: ' + this.targets().filter(q => q.active && q.kind === 'interact').map(q => q.label).join(' | '));
    const r = await this.goTo(t); if (!r.ok) throw new Error('cannot reach "' + t.label + '": ' + r.reason);
    const p = t.p(), pl = g.player; pl.yaw = Math.atan2(p.x - pl.pos.x, p.z - pl.pos.z); pl.camYaw = pl.yaw + Math.PI;
    const rx = new RegExp(re, 'i');
    try { await this.waitFor(() => g.curLabel && rx.test(g.curLabel), 20, 'prompt'); }
    catch (e) { throw new Error('in range of "' + t.label + '" but prompt shows "' + g.curLabel + '"'); }
    press('use'); this.note('USE "' + g.curLabel + '"');
    await this.sleep(0.3);
  }
  async walkTrigger(idx, label) {
    const tr = this.g.level.triggers[idx]; const t = { kind: 'trigger', label: label || 'trigger', c: tr.c, h: tr.h };
    const r = await this.goTo(t); if (!r.ok) throw new Error('cannot reach ' + t.label + ': ' + r.reason); this.note('entered ' + t.label);
  }
  // ------------------------------------------------------------------ chapter objective chains (no cutscene skipping)
  async chain(name) {
    const g = this.g; g.debugWin = 250; this.log = []; const A = this; const L = () => g.level;
    const calm = () => { for (const gd of g.guards) gd.paused = true; };
    const steps = {
      async shop() {
        await A.waitIdle(); A.note('intro done');
        await A.use('Open the case'); await A.waitFor(() => L().st.step >= 1, 120, 'case open');
        await A.use('Remove the old CMOS'); await A.waitFor(() => L().st.step >= 2, 120, 'battery out');
        await A.use('drawer: BATTERIES'); await A.waitFor(() => L().st.hasBatt, 60, 'battery picked');
        await A.use('Install the new CR2032'); await A.waitFor(() => L().st.step >= 4, 120, 'battery in');
        await A.use('Close the case'); await A.waitFor(() => L().st.phase === 'return', 900, 'Oleg + walk Ellis out');
        await A.walkTrigger(L().triggers.length - 1, 'return-inside trigger'); await A.waitFor(() => L().st.phase === 'case', 900, 'briefing');
        await A.use('Open the briefcase'); await A.waitFor(() => L().st.phase === 'leave', 600, 'briefcase cutscene');
        await A.use('Feed Cache'); await A.waitFor(() => L().st.catFed, 30, 'cat fed');
        await A.walkTrigger(L().triggers.indexOf(L().leaveTrig), 'front-door trigger'); await A.waitFor(() => g.levelName === 'plane', 300, 'plane');
      },
      async plane() {
        await A.waitIdle(); calm(); A.note('intro done');
        await A.use('Stand up'); await A.use('Open the overhead bin'); await A.use('Clone Lars'); await A.waitFor(() => L().st.cloned, 120, 'cloned');
        await A.use('Sit down'); await A.waitFor(() => g.levelName === 'chalet', 300, 'chalet');
      },
      async chalet() {
        await A.waitIdle(); calm(); g.state.invisible = true; A.note('intro done');
        await A.goTo({ kind: 'interact', label: 'near the guard hut', r: 4, dy: 3, p: () => new THREE.Vector3(4, 1, 15) });
        await A.waitFor(() => L().st.chatDone, 300, 'guard chat'); calm();
        await A.use('Look at the monitor'); await A.waitFor(() => L().st.pin, 30, 'pin');
        await A.use('keypad'); await A.waitFor(() => g.levelName === 'vault', 300, 'vault');
      },
      async vault() {
        await A.waitIdle(); calm(); g.state.invisible = true; A.note('hall intro done');
        await A.use('Patch panel'); await A.waitFor(() => L().st.lift, 120, 'lift online');
        await A.use('Call the lift'); await A.waitFor(() => L().part === 'core' && L().phase === 1, 900, 'core intro');
        const noPops = () => { L().popEvery = 1e9; L().popT = 1e9; L().clearPops?.(); }; noPops();
        for (let i = 0; i < 3; i++) await A.use('Pull the UPS breaker');
        await A.use('Main breaker'); await A.waitFor(() => L().phase === 2, 120, 'breaker locked'); noPops();
        await A.use('Open the maintenance hatch'); await A.use('giant CMOS battery'); await A.waitFor(() => L().phase === 3, 300, 'battery out'); noPops();
        await A.use('power button'); await A.waitFor(() => g.levelName === 'epilogue', 600, 'epilogue');
      },
      async epilogue() {
        await A.waitIdle(); A.note('intro done');
        await A.use('Feed Cache'); await A.waitFor(() => g.levelName === 'title', 1500, 'credits + post-credits back to title');
      },
    };
    const order = ['shop', 'plane', 'chalet', 'vault', 'epilogue']; let i = order.indexOf(name); const only = arguments[1] === 'one';
    const t0 = performance.now();
    try { for (; i < order.length; i++) { const t1 = performance.now(); await steps[order[i]](); this.note('CHAPTER OK: ' + order[i] + ' (' + Math.round((performance.now() - t1) / 1000) + ' s real)'); if (only) break; } }
    catch (e) { this.note('FAIL: ' + e.message); g.autoDir = null; return { ok: false, log: this.log, err: e.message }; }
    return { ok: true, log: this.log, s: Math.round((performance.now() - t0) / 1000) };
  }
}
