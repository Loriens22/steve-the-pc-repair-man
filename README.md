# Steve The PC Repair Man

**▶ Play in your browser: https://loriens22.github.io/steve-the-pc-repair-man/**  (desktop & mobile)

A 3D comedy spy game. Steve runs a nondescript PC repair shop in a small office park. He swaps CMOS batteries for elderly customers and naps with his cat, Cache. He is also the most reliable fixer on the planet, and agencies pay him 100% up front.

## Story
1. **Have You Tried Turning It Off And On Again?** Steve fixes Ms. Ellis's Doors 98 PC (open the case, swap the CR2032, set the BIOS date). The door chime rings and Mr. Thomas (Oleg) walks in and nods. Steve walks Ms. Ellis to her car ("I'll be right with you, Mr. Thomas"). Back inside: the job, an asset under a Swiss mountain, plus a briefcase with a phone, first-class tickets and tools.
2. **Seat 2A**: first class to Zurich. Clone a sleeping courier's keycard from the overhead bin without Brigitte the flight attendant catching you out of your seat.
3. **Cold Boot**: a ski chalet on top of a data vault. Night stealth with guards, flashlights and security cameras. There's always a sticky note.
4. **The Asset**: sneak through a guarded server hall (Kernel the server-room cat is asleep on a rack), re-patch the lift's patch panel, and descend to W.I.N.S.T.O.N., a rogue AI about to push a "Final Update" that bricks every legacy computer on Earth, including Ms. Ellis's. The boss fight is a repair job against a 5-minute timer: pull the breakers on three UPS units, find that the main breaker is retina-locked, open the maintenance hatch and pull out WINSTON's giant CMOS battery, then press and hold the power button. Meanwhile WINSTON throws "Are you sure?" pop-up dialogs at you; zap them or blow them away with compressed air.
5. **Paid In Full**: back at the shop. Ms. Ellis has reset her clock again. Or has she?

## Controls
| | Desktop | Touch | Gamepad |
|---|---|---|---|
| Move / run | WASD / Shift | Left joystick (push to edge to run) | Left stick |
| Look | Mouse (click to lock) | Drag right side | Right stick |
| Use / pick up / drop | E | USE | X |
| Throw | F / left click | THROW | RT |
| Sneak | C | SNEAK | B |
| Jump | Space | JUMP | A |
| Zap (anti-static strap) | Q | ZAP | RB |
| Compressed air | R | AIR | LB |
| Phone (hints, messages, eggs, Snake) | Tab | ☎ | Y |
| Pause / skip cutscene / next line | Esc / hold X / Enter or click | II / SKIP / tap | Start |

There are 22 easter eggs and 5 floppy disks to find.

## How it was made: every asset is generated
- **3D models and characters**: Python scripts in `blender/` run headless in Blender 4.5 (`lib.py`, `chars.py`, `props_shop.py`, `props_mission.py`). Meshes, skeletons, skin weights and all character animations are procedural, exported as glTF.
- **Textures, screens, signage, pixel font**: drawn procedurally at runtime (`web/src/engine/textures.js`).
- **Sound effects and music**: synthesized with NumPy/SciPy (`tools/gen_sfx.py`, `tools/gen_music.py`). No samples.
- **Voices**: generated locally with the open-source **Kokoro TTS** (kokoro-onnx, Apache-2.0 weights), with a distinct voice per character plus pitch/EQ/reverb/radio/robot processing in Python (`tools/dialogue.py`, `tools/gen_voice.py`). Encoded as compressed MP3.
- **Engine**: three.js (rendering, bloom, depth of field), Rapier (physics and character controller), Web Audio, Vite.

No downloaded models, textures, sounds, music or fonts-as-art are used.

## Known issues
- Guards steer with simple raycasts (no navmesh), so they can occasionally stall at a corner before turning back.
- Foliage (shrubs/plant leaves) is fairly low-detail.
- On very old phones the game automatically drops to Low quality; shadows and depth of field are disabled there.

## Build
```
cd web && npm ci && npx vite dev        # play locally
npx vite build                           # static build in web/dist
```
Regenerate assets: `blender -b -P blender/props_shop.py`, `python tools/gen_sfx.py`, `python tools/gen_music.py`, `python tools/gen_voice.py` (needs kokoro-onnx + model files in tools/kokoro, not committed).
