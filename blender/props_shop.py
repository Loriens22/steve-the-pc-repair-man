"""Shop + office park props. Front of every prop faces Blender -Y (=> +Z in three.js)."""
import bpy, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from mathutils import Vector
pi = math.pi

def beige(): return M('beige', '#d8cfb4', 0.55)
def beige2(): return M('beige_dark', '#bfb497', 0.6)
def steel(): return M('steel', '#9aa2aa', 0.35, 0.8)
def darkp(): return M('dark_plastic', '#26282c', 0.5)
def blackp(): return M('black_plastic', '#141518', 0.45)
def wood(): return M('T_wood', '#9a6b42', 0.6)
def emis(name, h, s=2.0): c = hexc(h); return mat(name, c, 0.4, emit=c, estr=s)

def P(name, fn):
    clear_scene(); objs = fn(); export(name, objs=None)

# ------------------------------------------------------------------ PC 98 tower with removable panel
def pc98():
    b = beige(); d = beige2()
    shell = [box(0.2, 0.44, 0.42, (0, 0, 0.21), b, bev=0.01)]
    # front bezel details
    shell.append(box(0.205, 0.02, 0.4, (0, -0.225, 0.21), d, bev=0.006))
    for i, z in enumerate((0.36, 0.31)):
        shell.append(box(0.15, 0.012, 0.04, (0, -0.236, z), b, bev=0.004))
        shell.append(box(0.11, 0.006, 0.008, (0, -0.243, z), blackp()))
    shell.append(box(0.1, 0.012, 0.028, (0, -0.236, 0.255), b, bev=0.003)); shell.append(box(0.07, 0.006, 0.004, (0, -0.243, 0.255), blackp()))
    for z in [0.05 + i * 0.012 for i in range(8)]: shell.append(box(0.14, 0.004, 0.004, (0, -0.238, z), d))  # vents
    body = join('tower', shell)
    # side panel (left, +X side) removable
    panel = box(0.006, 0.43, 0.41, (0.103, 0, 0.21), b, name='side_panel'); bevel(panel, 0.002, 1)
    for y, z in ((0.2, 0.39), (0.2, 0.03), (-0.2, 0.39), (-0.2, 0.03)):
        s = cyl(0.006, 0.006, (0.107, y, z), steel(), rot=(0, pi / 2, 0), v=10, name='screw'); parent_keep(s, panel)
    # internals
    mb = box(0.004, 0.36, 0.33, (-0.08, 0.02, 0.22), M('pcb', '#1f6b3a', 0.5), name='motherboard')
    parts = [mb]
    parts.append(box(0.03, 0.08, 0.08, (-0.06, 0.08, 0.3), M('cpu_cooler', '#8a8f96', 0.4, 0.7)))
    for i in range(2): parts.append(box(0.025, 0.13, 0.008, (-0.065, -0.03, 0.34 - i * 0.02), M('ram', '#2a4f7a', 0.4)))
    for i in range(3): parts.append(box(0.06, 0.008, 0.1, (-0.04, -0.06 - i * 0.03, 0.1), M('card', '#2b6b41', 0.5)))
    parts.append(box(0.15, 0.13, 0.09, (0.0, 0.14, 0.36), M('psu', '#7d8389', 0.4, 0.6)))
    parts.append(box(0.1, 0.15, 0.03, (0.0, -0.13, 0.31), M('drivecage', '#888', 0.4, 0.6)))
    for i in range(6): parts.append(cyl(0.004, 0.25, (-0.03 + i * 0.008, 0.05, 0.25), M('cable_' + str(i % 3), ['#d63', '#222', '#fd0'][i % 3], 0.6), rot=(0.3, 0, 0), v=6))
    internals = join('internals', parts)
    holder = cyl(0.016, 0.006, (-0.075, -0.05, 0.16), M('holder', '#111', 0.4), rot=(0, pi / 2, 0), v=20)
    batt = cyl(0.0125, 0.004, (-0.07, -0.05, 0.16), M('cr2032', '#c9ccd0', 0.25, 1.0), rot=(0, pi / 2, 0), v=24, name='cmos'); set_origin(batt, (-0.07, -0.05, 0.16))
    turbo = box(0.02, 0.012, 0.014, (0.05, -0.24, 0.12), M('turbo_btn', '#c8bfa4', 0.5), name='turbo'); bevel(turbo, 0.002, 1)
    power = box(0.04, 0.014, 0.03, (-0.03, -0.24, 0.12), M('power_btn', '#c8bfa4', 0.5), name='power'); bevel(power, 0.004, 2)
    led1 = box(0.008, 0.006, 0.005, (0.05, -0.236, 0.15), emis('led_green', '#2f6', 3), name='led_power')
    led2 = box(0.008, 0.006, 0.005, (0.065, -0.236, 0.15), emis('led_amber', '#fa2', 3), name='led_turbo')
    disp = box(0.03, 0.005, 0.014, (0.045, -0.236, 0.18), emis('led_red7', '#f22', 2), name='mhz')

def crt():
    b = beige(); s = []
    s.append(box(0.38, 0.06, 0.32, (0, -0.15, 0.2), b, bev=0.02))  # bezel
    s.append(box(0.34, 0.3, 0.28, (0, 0.04, 0.2), b, bev=0.04))
    s.append(box(0.24, 0.12, 0.2, (0, 0.2, 0.2), b, bev=0.04))
    s.append(box(0.22, 0.2, 0.03, (0, 0.0, 0.015), b, bev=0.01)); s.append(cyl(0.05, 0.05, (0, 0, 0.05), b))
    s.append(box(0.3, 0.01, 0.23, (0, -0.178, 0.215), blackp()))
    s.append(box(0.02, 0.006, 0.01, (0.15, -0.18, 0.07), emis('led_green', '#2f6', 2)))
    body = join('crt', s)
    scr = box(0.285, 0.004, 0.215, (0, -0.184, 0.215), M('T_screen', '#103010', 0.2, emit=(0.1, 0.2, 0.1), estr=1.0), name='screen')

def keyboard(col='#d8cfb4', name='kb'):
    k = M('kb_' + name, col, 0.6); kc = M('keys_' + name, '#ece6d4' if col == '#d8cfb4' else '#2b2d31', 0.5)
    o = [box(0.44, 0.15, 0.025, (0, 0, 0.0125), k, bev=0.006)]
    for r in range(5):
        for c in range(15):
            o.append(box(0.022, 0.022, 0.012, (-0.18 + c * 0.026, -0.055 + r * 0.027, 0.03), kc))
    o.append(box(0.13, 0.022, 0.012, (-0.02, 0.06, 0.03), kc))
    join('keyboard', o)

def mouse(col='#d8cfb4'):
    o = sph(0.03, (0, 0, 0.015), M('mouse_' + col, col, 0.5), (0.8, 1.2, 0.5)); cyl(0.002, 0.3, (0, 0.15, 0.003), darkp(), rot=(pi / 2, 0, 0), v=6)

def lcd(name='lcd'):
    f = blackp(); o = [box(0.56, 0.03, 0.34, (0, 0, 0.36), f, bev=0.008), cyl(0.012, 0.18, (0, 0.04, 0.18), steel()), box(0.2, 0.15, 0.012, (0, 0.03, 0.006), f, bev=0.004)]
    join('lcd', o); box(0.53, 0.004, 0.305, (0, -0.016, 0.365), M('T_screen2', '#101820', 0.2, emit=(0.1, 0.15, 0.2), estr=1.0), name='screen')

def laptop():
    m = M('laptop', '#3a3d42', 0.35, 0.6)
    join('base', [box(0.34, 0.24, 0.018, (0, 0, 0.009), m, bev=0.004), box(0.3, 0.1, 0.002, (0, 0.03, 0.019), blackp())])
    lid = box(0.34, 0.012, 0.22, (0, 0.125, 0.12), m, bev=0.004, name='lid')
    s = box(0.31, 0.003, 0.19, (0, 0.117, 0.12), M('T_screen3', '#102030', 0.2, emit=(0.1, 0.15, 0.2), estr=1.0), name='screen'); parent_keep(s, lid)
    lid.rotation_euler = (-0.25, 0, 0)

def counter():
    lam = M('laminate', '#e9e6df', 0.35); front = M('counter_front', '#3a6ea5', 0.6)
    o = [box(2.4, 0.7, 0.04, (0, 0, 1.02), lam, bev=0.01), box(2.36, 0.08, 1.0, (0, -0.3, 0.5), front, bev=0.01),
         box(2.36, 0.02, 0.08, (0, -0.345, 0.85), M('stripe', '#f2c94c', 0.5)), box(0.04, 0.6, 1.0, (1.16, 0, 0.5), front), box(0.04, 0.6, 1.0, (-1.16, 0, 0.5), front),
         box(2.3, 0.55, 0.03, (0, 0.03, 0.45), lam), box(2.36, 0.05, 0.08, (0, -0.28, 0.04), M('kick', '#222', 0.8))]
    join('counter', o)

def bell():
    lathe([(0.0, 0.0), (0.035, 0.0), (0.035, 0.008), (0.03, 0.012), (0.028, 0.03), (0.018, 0.045), (0.0, 0.05)], M('bellmetal', '#d4c38a', 0.2, 1.0), 'bell')
    cyl(0.004, 0.012, (0, 0, 0.056), steel())

def register():
    b = beige(); join('reg', [box(0.32, 0.3, 0.1, (0, 0, 0.05), b, bev=0.01), box(0.28, 0.14, 0.06, (0, 0.04, 0.12), b, rot=(0.4, 0, 0), bev=0.01),
                              box(0.12, 0.02, 0.06, (0, 0.12, 0.2), blackp())])
    box(0.1, 0.004, 0.04, (0, 0.108, 0.2), emis('reg_lcd', '#5f5', 1.5), name='screen')

def workbench():
    w = wood(); s = steel()
    o = [box(1.8, 0.75, 0.05, (0, 0, 0.92), w, bev=0.006)]
    for x in (-0.85, 0.85):
        for y in (-0.33, 0.33): o.append(box(0.05, 0.05, 0.9, (x, y, 0.45), s))
    o.append(box(1.75, 0.6, 0.02, (0, 0, 0.2), s))
    o.append(box(1.8, 0.03, 0.9, (0, 0.36, 1.42), M('T_pegboard', '#c9a77a', 0.8)))
    # ESD mat
    o.append(box(0.9, 0.5, 0.004, (-0.2, -0.03, 0.947), M('esd', '#2f6f8f', 0.8)))
    join('bench', o)
    tools = []
    for i in range(6):
        x = -0.7 + i * 0.12; c = ['#c0392b', '#f1c40f', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'][i]
        tools.append(cyl(0.012, 0.1, (x, 0.33, 1.6), M('handle' + str(i), c, 0.5))); tools.append(cyl(0.003, 0.12, (x, 0.33, 1.49), steel(), v=8))
    for i in range(3):
        tools.append(box(0.02, 0.01, 0.16, (0.2 + i * 0.1, 0.33, 1.55), M('pliers', '#333', 0.4, 0.5), rot=(0, 0.2, 0)))
    tools.append(tor(0.07, 0.008, (0.6, 0.33, 1.45), M('wire', '#c0392b', 0.5), rot=(pi / 2, 0, 0)))
    tools.append(tor(0.06, 0.008, (0.6, 0.33, 1.25), M('wire2', '#333', 0.5), rot=(pi / 2, 0, 0)))
    join('tools', tools)
    # magnifier lamp
    lamp = [cyl(0.06, 0.02, (0.7, 0.2, 0.955), darkp()), cyl(0.01, 0.4, (0.7, 0.2, 1.15), steel(), rot=(0.3, 0, 0)), cyl(0.01, 0.35, (0.7, 0.05, 1.42), steel(), rot=(-1.0, 0, 0)),
            tor(0.07, 0.015, (0.7, -0.12, 1.32), M('lamp_white', '#eeeeee', 0.4), rot=(0.5, 0, 0))]
    join('lamp', lamp)
    # soldering station
    join('solder', [box(0.14, 0.12, 0.08, (-0.65, 0.15, 0.985), M('solder', '#2a5d8f', 0.5), bev=0.01), cyl(0.008, 0.18, (-0.55, 0.12, 1.0), M('iron', '#444', 0.4, 0.6), rot=(0, 1.2, 0.3))])
    box(0.04, 0.004, 0.02, (-0.65, 0.088, 1.0), emis('solder_lcd', '#f40', 2))

def parts_drawers():
    c = M('drawer_body', '#2f6fb5', 0.5)
    join('cabinet', [box(0.42, 0.32, 0.44, (0, 0.0, 0.22), c, bev=0.008)])
    for i in range(4):
        z = 0.38 - i * 0.1
        d = [box(0.39, 0.3, 0.085, (0, -0.012, z), M('drawer_front', '#e8eef5', 0.4, alpha=None), bev=0.004), box(0.08, 0.02, 0.02, (0, -0.17, z), M('pull', '#555', 0.4, 0.5))]
        if i == 1: d.append(box(0.12, 0.004, 0.03, (0.12, -0.163, z), M('T_label_batt', '#f2c94c', 0.6)))
        dr = join('drawer_%d' % i, d, origin=(0, 0, z))

def office_chair():
    blk = M('chair_fabric', '#2b2f36', 0.9)
    o = [box(0.48, 0.46, 0.08, (0, 0, 0.48), blk, bev=0.03), box(0.46, 0.08, 0.55, (0, 0.24, 0.82), blk, bev=0.035), cyl(0.025, 0.36, (0, 0, 0.28), steel())]
    for k in range(5):
        a = k * 2 * pi / 5; o.append(box(0.3, 0.035, 0.03, (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.08), blackp(), rot=(0, 0, a)))
        o.append(sph(0.03, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.03), blackp()))
    for x in (-0.26, 0.26): o.append(box(0.04, 0.3, 0.03, (x, 0.02, 0.66), blackp(), bev=0.01)); o.append(box(0.03, 0.03, 0.16, (x, 0.05, 0.57), blackp()))
    join('chair', o)

def shelf():
    s = M('shelf_metal', '#7f8b96', 0.4, 0.7); o = []
    for x in (-0.58, 0.58):
        for y in (-0.2, 0.2): o.append(box(0.03, 0.03, 1.9, (x, y, 0.95), s))
    for z in (0.12, 0.6, 1.08, 1.56, 1.88): o.append(box(1.2, 0.43, 0.02, (0, 0, z), s))
    join('shelf', o)

def cardboard_box(name='box', sx=0.4, sy=0.3, sz=0.3):
    c = M('T_cardboard', '#b58a5a', 0.85); o = [box(sx, sy, sz, (0, 0, sz / 2), c, bev=0.004), box(sx * 0.2, sy + 0.002, 0.04, (0, 0, sz - 0.03), M('tape', '#c9a46c', 0.4))]
    join(name, o)

def filing_cabinet():
    g = M('file_grey', '#8d939a', 0.45, 0.5); o = [box(0.46, 0.6, 1.3, (0, 0, 0.65), g, bev=0.008)]
    for i in range(4): o.append(box(0.42, 0.02, 0.28, (0, -0.305, 0.17 + i * 0.31), g, bev=0.004)); o.append(box(0.12, 0.03, 0.02, (0, -0.32, 0.25 + i * 0.31), steel()))
    join('fcab', o)

def coffee_machine():
    r = M('coffee_red', '#a32c2c', 0.4, 0.2)
    o = [box(0.3, 0.32, 0.42, (0, 0, 0.21), r, bev=0.02), box(0.26, 0.16, 0.12, (0, -0.07, 0.07), blackp()), box(0.2, 0.2, 0.06, (0, 0.04, 0.45), M('hopper', '#2a1a10', 0.3, alpha=None)),
         cyl(0.02, 0.05, (0, -0.1, 0.27), steel())]
    join('coffee', o)
    box(0.1, 0.004, 0.05, (0, -0.162, 0.36), M('T_coffee_lcd', '#203040', 0.3, emit=(0.2, 0.4, 0.6), estr=1.0), name='screen')

def mug(col='#ffffff', name='mug'):
    m = M('mug_' + name, col, 0.3)
    lathe([(0.0, 0.0), (0.04, 0.0), (0.042, 0.01), (0.042, 0.1), (0.037, 0.1), (0.037, 0.008), (0.0, 0.008)], m, 'mug', seg=24)
    tor(0.025, 0.006, (0.05, 0, 0.055), m, rot=(pi / 2, 0, 0), maj=14, mn=6)

def plant():
    lathe([(0.0, 0.0), (0.13, 0.0), (0.17, 0.32), (0.18, 0.34), (0.0, 0.34)], M('pot', '#b5603a', 0.7), 'pot')
    lv = M('leaf', '#2e7d3a', 0.6); o = []
    import random; random.seed(3)
    for i in range(16):
        a = random.uniform(0, 2 * pi); t = random.uniform(0.3, 1.1); L = random.uniform(0.3, 0.55)
        o.append(sph(0.06, (math.cos(a) * L * 0.4, math.sin(a) * L * 0.4, 0.38 + L * 0.6), lv, (0.6, 1.8, 0.15), rot=(t * math.cos(a), t * math.sin(a), a)))
    join('leaves', o)

def cat_bed():
    lathe([(0.0, 0.0), (0.28, 0.0), (0.32, 0.04), (0.33, 0.12), (0.29, 0.15), (0.25, 0.1), (0.24, 0.05), (0.0, 0.05)], M('catbed', '#c0392b', 0.95), 'bed', seg=28)
def cat_bowl():
    lathe([(0.0, 0.0), (0.08, 0.0), (0.1, 0.05), (0.09, 0.055), (0.07, 0.02), (0.0, 0.02)], M('bowl', '#3a7bd5', 0.3), 'bowl', seg=24)
    cyl(0.068, 0.01, (0, 0, 0.025), M('food', '#8a5a3a', 0.9), name='food')

def sofa():
    f = M('sofa', '#6b4f7a', 0.95)
    o = [box(1.7, 0.8, 0.4, (0, 0, 0.25), f, bev=0.06), box(1.7, 0.25, 0.5, (0, 0.3, 0.65), f, bev=0.08),
         box(0.22, 0.8, 0.35, (0.85, 0, 0.55), f, bev=0.08), box(0.22, 0.8, 0.35, (-0.85, 0, 0.55), f, bev=0.08)]
    for x in (-0.42, 0.42): o.append(box(0.8, 0.7, 0.14, (x, -0.04, 0.5), f, bev=0.05))
    join('sofa', o)

def fax():
    b = beige(); join('fax', [box(0.36, 0.3, 0.12, (0, 0, 0.06), b, bev=0.02), box(0.28, 0.12, 0.05, (0, 0.12, 0.15), b, rot=(-0.5, 0, 0)),
                             box(0.2, 0.01, 0.2, (0, 0.17, 0.25), M('paper', '#f6f4ef', 0.9), rot=(-0.3, 0, 0)), box(0.14, 0.1, 0.01, (0.06, -0.08, 0.125), blackp())])
    box(0.06, 0.004, 0.02, (-0.1, -0.15, 0.09), emis('fax_lcd', '#7f7', 1.2), name='screen')

def ceiling_light():
    join('fixture', [box(1.2, 0.3, 0.06, (0, 0, -0.03), M('fixture', '#eeeeee', 0.5), bev=0.01)])
    box(1.12, 0.24, 0.01, (0, 0, -0.065), emis('tube', '#fff6e0', 3.0), name='tube')

def door_glass():
    fr = M('alu', '#a9b0b6', 0.3, 0.9)
    join('frame', [box(0.06, 0.1, 2.25, (-0.53, 0, 1.125), fr), box(0.06, 0.1, 2.25, (0.53, 0, 1.125), fr), box(1.12, 0.1, 0.06, (0, 0, 2.22), fr)])
    leaf = [box(0.98, 0.05, 0.06, (0, 0, 2.15), fr), box(0.98, 0.05, 0.12, (0, 0, 0.06), fr), box(0.05, 0.05, 2.12, (-0.465, 0, 1.08), fr), box(0.05, 0.05, 2.12, (0.465, 0, 1.08), fr),
            box(0.88, 0.012, 2.0, (0, 0, 1.1), M('glass', '#a8c8d8', 0.05, alpha=0.25)), box(0.03, 0.06, 0.5, (0.38, -0.05, 1.05), steel()), box(0.03, 0.06, 0.5, (0.38, 0.05, 1.05), steel())]
    join('leaf', leaf, origin=(-0.49, 0, 0))
    box(0.6, 0.004, 0.25, (0, -0.031, 1.4), M('T_door_decal', '#ffffff', 0.5, alpha=0.9), name='decal')

def door_wood():
    fr = M('doorframe', '#e8e4dc', 0.6)
    join('frame', [box(0.08, 0.14, 2.15, (-0.5, 0, 1.075), fr), box(0.08, 0.14, 2.15, (0.5, 0, 1.075), fr), box(1.08, 0.14, 0.08, (0, 0, 2.11), fr)])
    leaf = [box(0.92, 0.045, 2.05, (0, 0, 1.03), M('door_paint', '#c6b9a3', 0.55), bev=0.005), sph(0.03, (0.36, -0.05, 1.0), M('knob', '#c9b26a', 0.25, 0.9)), sph(0.03, (0.36, 0.05, 1.0), M('knob', '#c9b26a'))]
    join('leaf', leaf, origin=(-0.46, 0, 0))

def duck():
    y = M('duck', '#ffd21f', 0.35)
    o = [sph(0.05, (0, 0, 0.045), y, (1.0, 1.25, 0.8)), sph(0.032, (0, -0.04, 0.1), y), sph(0.012, (0.0, -0.075, 0.095), M('beak', '#ff7a1a', 0.4), (1.2, 1.4, 0.5)),
         sph(0.006, (0.015, -0.064, 0.11), blackp()), sph(0.006, (-0.015, -0.064, 0.11), blackp()), sph(0.02, (0, 0.06, 0.07), y, (1, 1, 0.5))]
    join('duck', o)

def y2k_box():
    join('y2k', [box(0.5, 0.35, 0.3, (0, 0, 0.15), M('crate_olive', '#5b6b3a', 0.8), bev=0.01), box(0.3, 0.004, 0.14, (0, -0.177, 0.16), M('T_y2k', '#e8e0c8', 0.8))])
    box(0.52, 0.37, 0.04, (0, 0, 0.32), M('crate_olive', '#5b6b3a'), bev=0.01, name='lid')

def briefcase():
    lea = M('leather', '#3b2a20', 0.45); met = M('brass', '#c9a64a', 0.25, 1.0); foam = M('foam', '#1c1c20', 0.95)
    join('base', [box(0.5, 0.36, 0.06, (0, 0, 0.03), lea, bev=0.01), box(0.47, 0.33, 0.012, (0, 0, 0.055), foam)])
    lid = join('lid', [box(0.5, 0.36, 0.05, (0, 0, 0.085), lea, bev=0.01), box(0.47, 0.33, 0.01, (0, 0, 0.062), foam),
                       box(0.12, 0.03, 0.02, (0, -0.19, 0.08), met), box(0.03, 0.02, 0.025, (0.12, -0.185, 0.07), met), box(0.03, 0.02, 0.025, (-0.12, -0.185, 0.07), met)],
               origin=(0, 0.18, 0.06))
    # items in foam
    ph = join('item_phone', [box(0.06, 0.13, 0.025, (-0.16, -0.02, 0.07), M('nokia', '#2a3542', 0.4), bev=0.008), box(0.04, 0.035, 0.004, (-0.16, -0.05, 0.084), M('nokia_lcd', '#9fbf7a', 0.3, emit=(0.3, 0.4, 0.2), estr=0.8))])
    tk = join('item_tickets', [box(0.09, 0.17, 0.006, (-0.06, 0.03, 0.065), M('ticket', '#f0e6c8', 0.8), rot=(0, 0, 0.1)), box(0.09, 0.03, 0.007, (-0.06, -0.03, 0.066), M('ticket_red', '#b22', 0.6), rot=(0, 0, 0.1))])
    ws = join('item_strap', [tor(0.03, 0.008, (0.04, -0.07, 0.066), M('strap', '#1c5fa8', 0.7)), cyl(0.012, 0.012, (0.07, -0.07, 0.07), met, rot=(0, pi / 2, 0)),
                             cyl(0.003, 0.12, (0.13, -0.05, 0.065), M('coil', '#222', 0.5), rot=(0, pi / 2, 0.3), v=6)])
    du = join('item_duster', [cyl(0.025, 0.15, (0.16, 0.05, 0.08), M('duster', '#2d7ccf', 0.4, 0.3), rot=(pi / 2, 0, 0)), cyl(0.01, 0.03, (0.16, -0.035, 0.08), M('nozzle', '#111', 0.5), rot=(pi / 2, 0, 0))])
    us = join('item_usb', [box(0.02, 0.06, 0.008, (0.05, 0.09, 0.066), M('usb', '#c0392b', 0.4), bev=0.002), box(0.012, 0.015, 0.005, (0.05, 0.05, 0.066), steel())])
    zt = join('item_ties', [box(0.004, 0.2, 0.002, (0.1 + i * 0.008, 0.06, 0.064), M('ziptie', '#111', 0.6)) for i in range(5)])

def cookie_tin():
    t = M('tin', '#2c5aa0', 0.3, 0.6)
    lathe([(0.0, 0.0), (0.12, 0.0), (0.12, 0.07), (0.0, 0.07)], t, 'tin', seg=32)
    l = lathe([(0.0, 0.08), (0.125, 0.08), (0.125, 0.065), (0.0, 0.065)], M('tinlid', '#c0392b', 0.3, 0.6), 'lid', seg=32); l.name = 'lid'

def floppy():
    join('floppy', [box(0.09, 0.093, 0.004, (0, 0, 0.002), M('floppy', '#2b2d31', 0.5)), box(0.05, 0.03, 0.0045, (0, 0.028, 0.002), steel()),
                    box(0.07, 0.04, 0.0045, (0, -0.02, 0.002), M('floppy_label', '#f0ece0', 0.8))])

def car(name='sedan'):
    paint = M('paint_' + name, '#7fb8a4' if name == 'sedan' else '#16181c', 0.3, 0.4); chrome = M('chrome', '#d8dde2', 0.15, 1.0); glass = M('carglass', '#1c2833', 0.05, 0.3, alpha=0.75)
    o = [box(1.8, 4.6, 0.55, (0, 0, 0.6), paint, bev=0.06), box(1.6, 2.3, 0.5, (0, 0.25, 1.1), paint, bev=0.08),
         box(1.62, 2.1, 0.42, (0, 0.25, 1.1), glass), box(1.84, 0.12, 0.18, (0, -2.32, 0.5), chrome, bev=0.03), box(1.84, 0.12, 0.18, (0, 2.32, 0.5), chrome, bev=0.03)]
    for x in (-0.65, 0.65): o.append(box(0.3, 0.02, 0.14, (x, -2.31, 0.7), emis('headlight', '#fff8d0', 1.5))); o.append(box(0.3, 0.02, 0.12, (x, 2.31, 0.7), emis('taillight', '#d01010', 1.5)))
    o.append(box(0.6, 0.02, 0.18, (0, -2.31, 0.66), M('grille', '#222', 0.5, 0.5)))
    join('car', o)
    for x in (-0.82, 0.82):
        for y in (-1.45, 1.45):
            w = cyl(0.33, 0.24, (x, y, 0.33), M('tire', '#151515', 0.85), rot=(0, pi / 2, 0)); h = cyl(0.18, 0.25, (x, y, 0.33), chrome, rot=(0, pi / 2, 0))

def lamp_post():
    join('post', [cyl(0.07, 4.5, (0, 0, 2.25), M('pole', '#3a3f45', 0.5, 0.6)), box(0.12, 0.9, 0.08, (0, -0.42, 4.45), M('pole', '#3a3f45'))])
    box(0.25, 0.4, 0.05, (0, -0.8, 4.4), emis('lamp_head', '#ffe8b0', 3.0), name='bulb')

def tree():
    import random; random.seed(11)
    cyl(0.12, 2.4, (0, 0, 1.2), M('bark', '#5a4030', 0.9), r2=0.08)
    lv = [M('foliage', '#4f8a3a', 0.85), M('foliage2', '#3f7a32', 0.85)]
    o = []
    for i in range(9):
        a = random.uniform(0, 2 * pi); r = random.uniform(0.2, 0.8); o.append(sph(random.uniform(0.6, 0.9), (math.cos(a) * r, math.sin(a) * r, 2.6 + random.uniform(-0.3, 0.8)), lv[i % 2], seg=12, rings=8))
    f = join('crown', o)

def shrub():
    import random; random.seed(5); o = []
    for i in range(5): o.append(sph(random.uniform(0.3, 0.45), (random.uniform(-0.4, 0.4), random.uniform(-0.3, 0.3), 0.3), M('foliage2', '#3f7a32'), seg=12, rings=8))
    join('shrub', o)

def bench():
    w = wood(); m = M('pole', '#3a3f45')
    o = [box(1.6, 0.12, 0.04, (0, -0.15 + i * 0.13, 0.45), w) for i in range(3)] + [box(1.6, 0.04, 0.1, (0, 0.24, 0.65 + i * 0.13), w) for i in range(2)]
    for x in (-0.7, 0.7): o += [box(0.05, 0.5, 0.05, (x, 0.03, 0.42), m), box(0.05, 0.05, 0.45, (x, -0.18, 0.22), m), box(0.05, 0.05, 0.8, (x, 0.24, 0.4), m)]
    join('bench', o)

def dumpster():
    g = M('dumpster', '#2f6b3f', 0.6, 0.3)
    join('dumpster', [box(1.8, 1.1, 1.1, (0, 0, 0.65), g, bev=0.02), box(1.85, 1.15, 0.05, (0, 0.05, 1.22), M('dlid', '#222', 0.6), rot=(0.05, 0, 0))] +
         [cyl(0.07, 0.05, (x, y, 0.07), M('tire', '#151515'), rot=(0, pi / 2, 0)) for x in (-0.8, 0.8) for y in (-0.45, 0.45)])

def mailbox():
    join('mailbox', [cyl(0.04, 1.0, (0, 0, 0.5), M('pole', '#3a3f45')), box(0.22, 0.45, 0.22, (0, 0, 1.1), M('mbox', '#2a4e8a', 0.4, 0.4), bev=0.05)])

def hydrant():
    r = M('hydrant', '#c0392b', 0.4, 0.2)
    join('hydrant', [cyl(0.12, 0.6, (0, 0, 0.3), r), sph(0.12, (0, 0, 0.6), r), cyl(0.05, 0.36, (0, 0, 0.4), r, rot=(0, pi / 2, 0)), cyl(0.15, 0.06, (0, 0, 0.03), r)])

def shop_sign():
    join('signbox', [box(4.0, 0.25, 0.9, (0, 0, 0), M('signbox', '#1d2733', 0.5), bev=0.02)])
    box(3.8, 0.01, 0.75, (0, -0.13, 0), M('T_shop_sign', '#ffffff', 0.4, emit=(1, 1, 1), estr=1.2), name='sign')

def water_cooler():
    join('cooler', [box(0.32, 0.32, 0.95, (0, 0, 0.475), M('cooler', '#e8e8e8', 0.4), bev=0.02), box(0.06, 0.04, 0.06, (0.06, -0.17, 0.75), M('tapblue', '#2a6fd5', 0.4)),
                    box(0.06, 0.04, 0.06, (-0.06, -0.17, 0.75), M('tapred', '#d52a2a', 0.4))])
    lathe([(0.0, 0.95), (0.14, 0.95), (0.15, 1.3), (0.06, 1.38), (0.0, 1.38)], M('bottle', '#7ab8e8', 0.05, alpha=0.45), 'bottle').name = 'bottle'

def vhs_stack():
    o = []
    for i in range(5): o.append(box(0.19, 0.105, 0.025, (0, 0, 0.0125 + i * 0.026), M('vhs' + str(i % 2), ['#111', '#1a2a4a'][i % 2], 0.6), rot=(0, 0, (i % 3 - 1) * 0.06)))
    join('vhs', o)

def frame_photo(name='photo', w=0.3, h=0.22):
    join('frame', [box(w + 0.04, 0.02, h + 0.04, (0, 0, 0), M('frame_wood', '#4a3020', 0.6))])
    box(w, 0.004, h, (0, -0.011, 0), M('T_' + name, '#cccccc', 0.7), name='picture')

def globe():
    join('stand', [cyl(0.1, 0.02, (0, 0, 0.01), wood()), cyl(0.012, 0.25, (0, 0, 0.13), M('brass', '#c9a64a', 0.25, 1.0)), tor(0.17, 0.008, (0, 0, 0.42), M('brass', '#c9a64a'), rot=(pi / 2, 0.4, 0))])
    sph(0.16, (0, 0, 0.42), M('T_globe', '#3a6ea5', 0.5), seg=32, rings=16, name='ball')

def safe():
    s = M('safe', '#3a3d42', 0.4, 0.6)
    join('safe', [box(0.6, 0.55, 0.7, (0, 0, 0.35), s, bev=0.02)])
    join('door', [box(0.52, 0.04, 0.6, (0, -0.29, 0.36), s, bev=0.01), cyl(0.07, 0.03, (0, -0.32, 0.4), M('brass', '#c9a64a'), rot=(pi / 2, 0, 0)), box(0.12, 0.03, 0.02, (0.15, -0.32, 0.25), steel())], origin=(-0.26, -0.29, 0))

def secret_shelf():
    w = M('shelf_wood', '#6b4a30', 0.7); o = [box(1.6, 0.35, 2.2, (0, 0.0, 1.1), w)]
    for z in (0.4, 0.95, 1.5): o.append(box(1.5, 0.32, 0.03, (0, -0.02, z), w))
    import random; random.seed(2)
    for z in (0.42, 0.97, 1.52):
        x = -0.7
        while x < 0.65:
            bw = random.uniform(0.03, 0.06); bh = random.uniform(0.22, 0.32)
            o.append(box(bw, 0.22, bh, (x + bw / 2, -0.04, z + 0.015 + bh / 2), M('book' + str(random.randint(0, 5)), ['#7a2a2a', '#2a4a7a', '#2a6a3a', '#7a6a2a', '#4a2a6a', '#222'][random.randint(0, 5)], 0.7)))
            x += bw + 0.004
    shelfo = join('shelf', o)
    bk = box(0.05, 0.22, 0.3, (0.4, -0.06, 1.68), M('book_red', '#c0392b', 0.5), name='trigger_book')

def armory_wall():
    peg = M('T_pegboard_dark', '#2a2d33', 0.8); o = [box(2.4, 0.04, 1.6, (0, 0, 1.4), peg)]
    join('board', o)
    g = []
    g.append(box(0.3, 0.06, 0.12, (-0.8, -0.05, 1.8), M('gadget1', '#222', 0.4, 0.6), bev=0.01))
    g.append(cyl(0.02, 0.4, (-0.4, -0.05, 1.8), M('gadget2', '#8a8f96', 0.3, 0.8), rot=(0, pi / 2, 0)))
    for i in range(5): g.append(cyl(0.003, 0.14, (0.0 + i * 0.03, -0.05, 1.85), steel(), v=6))
    g.append(box(0.25, 0.04, 0.18, (0.5, -0.05, 1.8), M('passports', '#5a1a1a', 0.6)))
    g.append(sph(0.07, (0.9, -0.08, 1.8), M('gadget3', '#2d7ccf', 0.3, 0.3)))
    g.append(box(0.5, 0.05, 0.08, (-0.6, -0.05, 1.2), M('gadget4', '#333', 0.4, 0.6), bev=0.02))
    join('gadgets', g)

def desk_simple():
    w = M('desk_top', '#d9d4c8', 0.5)
    join('desk', [box(1.4, 0.7, 0.04, (0, 0, 0.74), w, bev=0.005), box(0.04, 0.66, 0.72, (-0.67, 0, 0.36), w), box(0.04, 0.66, 0.72, (0.67, 0, 0.36), w),
                  box(0.4, 0.62, 0.6, (0.45, 0, 0.4), w, bev=0.005), box(1.3, 0.02, 0.4, (0, 0.33, 0.5), w)])

def radio():
    join('radio', [box(0.3, 0.1, 0.16, (0, 0, 0.08), M('radio', '#7a4a2a', 0.5), bev=0.02), cyl(0.05, 0.01, (-0.07, -0.05, 0.08), M('grill', '#222', 0.7), rot=(pi / 2, 0, 0)),
                   box(0.1, 0.01, 0.04, (0.07, -0.05, 0.1), M('dial', '#e8d8a8', 0.4, emit=(0.5, 0.4, 0.2), estr=0.5)), cyl(0.003, 0.4, (0.12, 0.03, 0.3), steel(), rot=(0.4, 0, 0), v=6)])

def tickets_prop():
    box(0.09, 0.2, 0.004, (0, 0, 0.002), M('ticket', '#f0e6c8'))

ALL = dict(pc98=pc98, crt=crt, keyboard=lambda: keyboard(), keyboard_black=lambda: keyboard('#2b2d31', 'blk'), mouse=lambda: mouse(), lcd=lcd, laptop=laptop,
           counter=counter, bell=bell, register=register, workbench=workbench, parts_drawers=parts_drawers, office_chair=office_chair, shelf=shelf,
           box_a=lambda: cardboard_box('box_a', 0.4, 0.3, 0.3), box_b=lambda: cardboard_box('box_b', 0.6, 0.4, 0.4), box_s=lambda: cardboard_box('box_s', 0.25, 0.2, 0.18),
           filing_cabinet=filing_cabinet, coffee_machine=coffee_machine, mug=lambda: mug('#ffffff'), mug_red=lambda: mug('#c0392b', 'red'), plant=plant,
           cat_bed=cat_bed, cat_bowl=cat_bowl, sofa=sofa, fax=fax, ceiling_light=ceiling_light, door_glass=door_glass, door_wood=door_wood, duck=duck,
           y2k_box=y2k_box, briefcase=briefcase, cookie_tin=cookie_tin, floppy=floppy, sedan=lambda: car('sedan'), blackcar=lambda: car('blackcar'),
           lamp_post=lamp_post, tree=tree, shrub=shrub, bench=bench, dumpster=dumpster, mailbox=mailbox, hydrant=hydrant, shop_sign=shop_sign,
           water_cooler=water_cooler, vhs=vhs_stack, photo_ellis=lambda: frame_photo('photo_ellis'), photo_bsod=lambda: frame_photo('photo_bsod', 0.36, 0.27),
           globe=globe, safe=safe, secret_shelf=secret_shelf, armory_wall=armory_wall, desk=desk_simple, radio=radio)

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    reset()
    for n in (argv or ALL):
        clear_scene(); ALL[n](); export(n)
