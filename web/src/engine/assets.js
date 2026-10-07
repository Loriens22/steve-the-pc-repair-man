// Asset loading (GLB models made in Blender + audio) with progress, material post-processing and cloning.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getTex } from './textures.js';

const BASE = import.meta.env.BASE_URL + 'assets/';
const loader = new GLTFLoader();
export const models = {};
export let animClips = [];
export let catClips = [];

// map Blender material names starting with T_ to generated textures
const TEXMAP = {
  T_wood: ['wood'], T_wood_dark: ['wood_dark'], T_timber: ['timber'], T_stone: ['stone'], T_roof_snow: ['roof_snow'], T_cardboard: ['cardboard'],
  T_pegboard: ['pegboard'], T_pegboard_dark: ['pegboard_dark'], T_carpet_plane: ['carpet_plane'], T_crate: ['crate'], T_hazard: ['hazard'],
  T_grate: ['grate'], T_mountain: ['mountain'], T_logo_patch: ['logo_patch'], T_uptime_patch: ['uptime_patch'], T_shop_sign: ['shop_sign'],
  T_door_decal: ['door_decal'], T_y2k: ['y2k'], T_vanlogo: ['vanlogo'], T_photo_ellis: ['photo_ellis'], T_photo_bsod: ['photo_bsod'],
  T_globe: ['globe'], T_planewin: ['planewin'], T_sticky_pin: ['sticky_pin'], T_snowface: ['snowface'], T_lavsign: ['lavsign'],
  T_vendfront: ['vendfront'], T_rackfront: ['rackfront'], T_label_batt: ['label_batt'],
};
export const emissiveTex = new Set(['T_shop_sign', 'T_planewin', 'T_snowface', 'T_lavsign', 'T_vendfront', 'T_rackfront']);

function processMaterial(m) {
  if (!m || m.userData.done) return m; m.userData.done = true;
  const name = m.name || '';
  const t = TEXMAP[name];
  if (t) {
    const tx = getTex(...t);
    if (tx) {
      m.map = tx; m.color.set(0xffffff);
      if (emissiveTex.has(name)) { m.emissiveMap = tx; m.emissive.set(0xffffff); m.emissiveIntensity = 1.2; }
      else { m.emissive.set(0x000000); }
      m.needsUpdate = true;
    }
  }
  if (m.transparent || m.opacity < 1) { m.depthWrite = false; }
  if (m.emissive && m.emissive.getHex() !== 0 && !t) m.emissiveIntensity = Math.max(1, m.emissiveIntensity || 1);
  return m;
}

export function prep(root) {
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (Array.isArray(o.material)) o.material = o.material.map(processMaterial); else processMaterial(o.material);
      const mn = (o.material && o.material.name) || '';
      if (o.material && o.material.transparent) o.castShadow = false;
      if (/glow|tube|led|lamp_head|bulb|window|light|lcd|screen|nav|sign/i.test(mn + o.name)) o.castShadow = false;
    }
  });
  return root;
}

export async function loadAll(list, onProgress) {
  let done = 0; const total = list.length;
  await Promise.all(list.map(async n => {
    try {
      const g = await loader.loadAsync(BASE + 'models/' + n + '.glb');
      prep(g.scene);
      models[n] = g;
      if (n === 'anims') animClips = g.animations;
      if (n === 'cat') catClips = g.animations;
    } catch (e) { console.warn('model failed', n, e); }
    done++; onProgress && onProgress(done / total, n);
  }));
}

// clone a prop (shares geometry/materials)
export function inst(name, opts = {}) {
  const g = models[name]; if (!g) { console.warn('missing model', name); return new THREE.Group(); }
  const hasSkin = !!g.scene.getObjectByProperty('type', 'SkinnedMesh');
  const o = hasSkin ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
  o.name = name; o.userData.model = name;
  if (opts.uniqueMaterials) o.traverse(c => { if (c.isMesh) c.material = c.material.clone(); });
  return o;
}

export function find(root, name) {
  let f = null; root.traverse(o => { if (!f && (o.name === name || o.name.replace(/_\d+$/, '') === name)) f = o; }); return f;
}

export const MODEL_LIST = [
  'anims', 'steve', 'ellis', 'oleg', 'brecht', 'guard', 'brigitte', 'lars', 'cat', 'kernel',
  'pc98', 'crt', 'keyboard', 'keyboard_black', 'mouse', 'lcd', 'laptop', 'counter', 'bell', 'register', 'workbench', 'parts_drawers', 'office_chair',
  'shelf', 'box_a', 'box_b', 'box_s', 'filing_cabinet', 'coffee_machine', 'mug', 'mug_red', 'plant', 'cat_bed', 'cat_bowl', 'sofa', 'fax',
  'ceiling_light', 'door_glass', 'door_wood', 'duck', 'y2k_box', 'briefcase', 'cookie_tin', 'floppy', 'sedan', 'blackcar', 'lamp_post', 'tree',
  'shrub', 'bench', 'dumpster', 'mailbox', 'hydrant', 'shop_sign', 'water_cooler', 'vhs', 'photo_ellis', 'photo_bsod', 'globe', 'safe',
  'secret_shelf', 'armory_wall', 'desk', 'radio',
  'cabin', 'seat_first', 'galley_cart', 'champagne', 'flute', 'pillow', 'jacket', 'plane_door', 'plane_ext', 'chalet', 'guard_hut', 'pine',
  'pine_big', 'rock', 'fence', 'floodlight', 'sec_cam', 'hot_tub', 'snowman_crt', 'ski_rack', 'van', 'generator', 'crate', 'barrel', 'snowmobile',
  'keypad', 'snow_drift', 'server_rack', 'patch_panel', 'elevator', 'crac', 'extinguisher', 'cable_tray', 'locker', 'vending', 'admin_desk',
  'winston_core', 'ups_unit', 'main_breaker', 'power_button', 'drone',
];
