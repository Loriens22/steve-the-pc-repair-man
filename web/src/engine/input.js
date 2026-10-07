// Unified input: keyboard + mouse (pointer lock) + touch (virtual joystick, look drag, buttons) + gamepad.
export const input = {
  move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, keys: {}, pressed: {}, touch: false, locked: false, sprint: false, crouchToggle: false,
  gp: null,
};
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump', KeyE: 'use', KeyF: 'throw', KeyQ: 'zap', KeyR: 'duster', KeyC: 'crouch', ControlLeft: 'crouch',
  Tab: 'phone', Escape: 'pause', KeyP: 'pause', Enter: 'confirm', KeyX: 'skip' };
export function press(a) { input.pressed[a] = true; }
export function consume(a) { const v = input.pressed[a]; input.pressed[a] = false; return v; }
export function clearPressed() { for (const k in input.pressed) input.pressed[k] = false; }

export function initInput(canvas, onKey) {
  addEventListener('keydown', e => {
    const a = KEYMAP[e.code]; if (e.code === 'Tab') e.preventDefault();
    if (a) { if (!input.keys[a]) press(a); input.keys[a] = true; if (a === 'crouch') input.crouchToggle = !input.crouchToggle; }
    onKey && onKey(e);
  });
  addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) input.keys[a] = false; });
  addEventListener('blur', () => { for (const k in input.keys) input.keys[k] = false; });
  canvas.addEventListener('mousedown', e => {
    if (input.touch) return;
    if (!input.locked && input.wantLock) { canvas.requestPointerLock?.(); return; }
    if (e.button === 0) press('throw'); if (e.button === 2) press('zap');
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => { input.locked = document.pointerLockElement === canvas; });
  addEventListener('mousemove', e => { if (input.locked) { input.look.x += e.movementX; input.look.y += e.movementY; } });
}

// ---------------------------------------------------------------- touch controls
export function initTouch(root) {
  input.touch = true; document.body.classList.add('touch');
  const stick = root.querySelector('#stick'), knob = root.querySelector('#knob'), lookZone = root.querySelector('#lookzone');
  let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
  const R = 55;
  const zone = root.querySelector('#stickzone');
  zone.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; sid = t.identifier; sx = t.clientX; sy = t.clientY;
    stick.style.left = (sx - 60) + 'px'; stick.style.top = (sy - 60) + 'px'; stick.classList.add('on'); }, { passive: false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) {
    let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.move.x = dx / R; input.move.y = -dy / R; input.sprint = d > R * 0.98; } }, { passive: false });
  const endS = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; input.move.x = input.move.y = 0; knob.style.transform = ''; stick.classList.remove('on'); input.sprint = false; } };
  zone.addEventListener('touchend', endS); zone.addEventListener('touchcancel', endS);
  lookZone.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
  lookZone.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === lid) {
    input.look.x += (t.clientX - lx) * 1.6; input.look.y += (t.clientY - ly) * 1.6; lx = t.clientX; ly = t.clientY; } }, { passive: false });
  const endL = e => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; };
  lookZone.addEventListener('touchend', endL); lookZone.addEventListener('touchcancel', endL);
  root.querySelectorAll('[data-act]').forEach(b => {
    const a = b.dataset.act;
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); press(a); input.keys[a] = true; b.classList.add('down');
      if (a === 'crouch') input.crouchToggle = !input.crouchToggle; }, { passive: false });
    const up = e => { e.preventDefault(); input.keys[a] = false; b.classList.remove('down'); };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
  });
}

export function pollGamepad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : []; const g = gps && [...gps].find(x => x);
  if (!g) return false;
  const dz = v => Math.abs(v) < 0.15 ? 0 : v;
  input.gpMove = { x: dz(g.axes[0]), y: -dz(g.axes[1]) }; input.look.x += dz(g.axes[2]) * 14; input.look.y += dz(g.axes[3]) * 10;
  const map = { 0: 'jump', 2: 'use', 1: 'crouch', 5: 'zap', 4: 'duster', 7: 'throw', 3: 'phone', 9: 'pause', 10: 'sprint' };
  input.gpPrev = input.gpPrev || {};
  for (const i in map) { const p = g.buttons[i] && g.buttons[i].pressed; if (p && !input.gpPrev[i]) { press(map[i]); if (map[i] === 'crouch') input.crouchToggle = !input.crouchToggle; } input.keys['gp_' + map[i]] = p; input.gpPrev[i] = p; }
  return true;
}
export function held(a) { return input.keys[a] || input.keys['gp_' + a]; }
