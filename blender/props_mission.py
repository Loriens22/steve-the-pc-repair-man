"""Plane, chalet, data-vault and WINSTON core props."""
import bpy, math, sys, os, random
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from mathutils import Vector
from props_shop import steel, darkp, blackp, wood, emis, beige
pi = math.pi

# ------------------------------------------------------------------ PLANE
def cabin():
    """First-class cabin shell, centred on origin, aisle along Y (Blender), 12 m long. Floor at z=0."""
    wall = M('cabin_wall', '#e9e4da', 0.6); carpet = M('T_carpet_plane', '#2b3550', 0.95); trim = M('cabin_trim', '#b9a27a', 0.4, 0.4)
    L = 12.0; R = 2.0; cz = 0.85
    # curved shell (inside faces): half cylinder above floor
    bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=L, location=(0, 0, cz), rotation=(pi / 2, 0, 0), vertices=48, end_fill_type='NOTHING')
    sh = act(); setmat(sh, wall); select([sh]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    for v in sh.data.vertices: v.select = (sh.matrix_world @ v.co).z < -0.02
    import bmesh as _bm
    me = sh.data; bm = _bm.new(); bm.from_mesh(me); _bm.ops.delete(bm, geom=[v for v in bm.verts if me.vertices[v.index].select], context='VERTS'); bm.to_mesh(me); bm.free()
    smooth(sh, 180); sh.name = 'shell'
    fl = box(3.9, L, 0.1, (0, 0, -0.05), carpet, name='floor')
    ends = [box(4.2, 0.1, 3.0, (0, L / 2, 1.4), wall), box(4.2, 0.1, 3.0, (0, -L / 2, 1.4), wall)]
    join('ends', ends)
    # windows: recessed panes along both walls
    wins = []; frames = []
    for side in (1, -1):
        for i in range(10):
            y = -5.0 + i * 1.1
            a = math.radians(70); x = side * (R - 0.06) * math.sin(a); z = cz + (R - 0.06) * math.cos(a) * 0.15 + 0.35
            wins.append(box(0.02, 0.26, 0.36, (side * 1.82, y, 1.25), M('T_planewin', '#203050', 0.2, emit=(0.15, 0.2, 0.35), estr=1.0), rot=(0, side * -0.35, 0), bev=0.0))
            frames.append(box(0.03, 0.34, 0.44, (side * 1.85, y, 1.25), M('winframe', '#d8d2c6', 0.5), rot=(0, side * -0.35, 0), bev=0.03))
    join('windows', wins); join('winframes', frames)
    # overhead bins (one row each side) + doors
    bins = []
    for side in (1, -1):
        bins.append(box(0.75, L - 0.4, 0.45, (side * 1.4, 0, 2.15), wall, bev=0.04))
        bins.append(box(0.04, L - 0.4, 0.03, (side * 1.02, 0, 1.92), trim))
    join('bins', bins)
    for side, nm in ((1, 'R'), (-1, 'L')):
        for i in range(5):
            y = -4.4 + i * 2.2
            d = box(0.04, 2.1, 0.42, (side * 1.02, y, 2.13), M('bindoor', '#f2eee6', 0.5), bev=0.01, name='bin_%s%d' % (nm, i))
            set_origin(d, (side * 1.02, y, 2.34))
    # ceiling strip lights
    join('ceil_lights', [box(0.25, L - 1, 0.02, (0, 0, 2.6), emis('cabin_light', '#ffe9c8', 2.0))])
    # colliders
    cols = [box(0.2, L, 3, (2.0, 0, 1.5)), box(0.2, L, 3, (-2.0, 0, 1.5)), box(4, 0.2, 3, (0, L / 2 + 0.05, 1.5)), box(4, 0.2, 3, (0, -L / 2 - 0.05, 1.5)),
            box(0.9, L, 0.6, (1.5, 0, 2.15)), box(0.9, L, 0.6, (-1.5, 0, 2.15))]
    for i, c in enumerate(cols): c.name = 'col_%d' % i

def seat_first():
    """Open first-class pod: passenger faces -Y (front). Low armrests so a seated character is visible."""
    sh = M('seat_shell', '#3d2f2a', 0.5); lea = M('seat_leather', '#c9b089', 0.55); wd = M('T_wood_dark', '#4a3020', 0.5)
    join('shell', [box(0.8, 1.3, 0.28, (0, 0.1, 0.14), sh, bev=0.04),
                   box(0.12, 1.2, 0.42, (0.41, 0.12, 0.5), sh, bev=0.04), box(0.12, 1.2, 0.42, (-0.41, 0.12, 0.5), sh, bev=0.04),
                   box(0.86, 0.2, 1.15, (0, 0.72, 0.62), sh, bev=0.06, rot=(0.12, 0, 0)),
                   box(0.8, 0.07, 0.95, (0, -0.86, 0.47), sh, bev=0.03)])
    join('cushion', [box(0.64, 0.66, 0.13, (0, 0.18, 0.36), lea, bev=0.05), box(0.6, 0.13, 0.72, (0, 0.56, 0.82), lea, bev=0.06, rot=(0.14, 0, 0)),
                     box(0.32, 0.1, 0.18, (0, 0.66, 1.3), lea, bev=0.04), box(0.56, 0.42, 0.3, (0, -0.55, 0.15), lea, bev=0.05)])
    join('table', [box(0.22, 0.95, 0.04, (0.42, 0.05, 0.73), wd, bev=0.01)])
    box(0.36, 0.03, 0.24, (0, -0.81, 0.88), blackp(), bev=0.01)
    box(0.32, 0.004, 0.2, (0, -0.794, 0.88), M('T_ife', '#102030', 0.2, emit=(0.2, 0.3, 0.5), estr=1.0), rot=(0, 0, pi), name='screen')
    box(0.03, 0.03, 0.02, (0.42, 0.35, 0.76), emis('callbtn', '#ffb000', 1.0), name='callbtn')

def galley_cart():
    m = M('cart', '#b8bfc6', 0.3, 0.8)
    join('cart', [box(0.4, 0.75, 0.95, (0, 0, 0.52), m, bev=0.02), box(0.38, 0.02, 0.9, (0, -0.38, 0.52), M('cartred', '#a52a2a', 0.5))] +
         [cyl(0.04, 0.03, (x, y, 0.04), blackp(), rot=(0, pi / 2, 0)) for x in (-0.15, 0.15) for y in (-0.3, 0.3)])

def champagne():
    g = M('bottle_green', '#1f4a2a', 0.1, 0.2)
    lathe([(0, 0), (0.045, 0), (0.045, 0.2), (0.035, 0.24), (0.015, 0.28), (0.015, 0.32), (0, 0.32)], g, 'bottle')
    cyl(0.017, 0.05, (0, 0, 0.3), M('foil', '#d4b04a', 0.3, 1.0))
    box(0.06, 0.004, 0.07, (0, -0.046, 0.12), M('label', '#efe6cc', 0.6))

def flute():
    lathe([(0, 0), (0.035, 0), (0.035, 0.005), (0.004, 0.01), (0.004, 0.1), (0.025, 0.13), (0.03, 0.22), (0.0, 0.2)], M('glassf', '#d8eef5', 0.05, alpha=0.35), 'flute')

def pillow():
    sph(0.22, (0, 0, 0.07), M('pillow', '#f2efe8', 0.95), (1, 0.7, 0.3), seg=20, rings=10)

def jacket():
    j = M('jacket', '#3a2a22', 0.6)
    join('jacket', [box(0.55, 0.35, 0.1, (0, 0, 0.05), j, bev=0.04), box(0.2, 0.3, 0.08, (0.28, 0.05, 0.05), j, rot=(0, 0, 0.3), bev=0.03)])
    box(0.06, 0.09, 0.006, (0.05, -0.05, 0.105), M('keycard', '#ffffff', 0.4), name='card')

def plane_door():
    join('door', [box(0.9, 0.08, 2.0, (0, 0, 1.0), M('cabin_door', '#d8d2c6', 0.5), bev=0.02), box(0.3, 0.02, 0.1, (0, -0.05, 1.6), M('T_lavsign', '#222', 0.5, emit=(0.6, 0.1, 0.1), estr=0.8))])

def plane_ext():
    w = M('jet_white', '#f2f2f2', 0.35, 0.2); b = M('jet_blue', '#1f3a68', 0.4, 0.2); g = M('jet_glass', '#111', 0.1)
    body = lathe([(0.0, -9), (0.6, -8.4), (1.2, -7.2), (1.5, -5.5), (1.5, 6), (1.2, 8), (0.5, 9.5), (0.1, 10)], w, 'fuselage', seg=24)
    body.rotation_euler = (pi / 2, 0, 0); bpy.ops.object.transform_apply(rotation=True)
    o = [body, extrude_poly([(0, 0), (8, 3.0), (8, 4.0), (0, 2.8)], 0.25, w, loc=(1.2, 0, -0.2), rot=(0, 0, 0)),
         extrude_poly([(0, 0), (-8, 3.0), (-8, 4.0), (0, 2.8)], 0.25, w, loc=(-1.2, 0, -0.2))]
    for wobj in o[1:]: wobj.rotation_euler = (pi / 2, 0, 0)
    o.append(extrude_poly([(0, 0), (0, 3.2), (1.6, 3.6), (2.6, 0)], 0.2, b, loc=(0, 7.0, 1.2)))
    o[-1].rotation_euler = (0, 0, pi / 2)
    for x in (-3.5, 3.5): o.append(cyl(0.5, 2.2, (x, -1.0, -0.9), M('engine', '#c8ccd0', 0.3, 0.6), rot=(pi / 2, 0, 0)))
    o.append(box(0.04, 14, 0.25, (1.45, 0, 0.35), b)); o.append(box(0.04, 14, 0.25, (-1.45, 0, 0.35), b))
    for i in range(18):
        for x in (1.46, -1.46): o.append(box(0.03, 0.18, 0.22, (x, -6 + i * 0.7, 0.75), emis('jetwin', '#ffd890', 2.0)))
    jet = join('jet', o)
    for wobj in [jet]: pass
    # navigation lights
    box(0.2, 0.2, 0.2, (8.0, 0.6, -0.1), emis('navred', '#ff2020', 6), name='nav_l'); box(0.2, 0.2, 0.2, (-8.0, 0.6, -0.1), emis('navgreen', '#20ff40', 6), name='nav_r')

# ------------------------------------------------------------------ CHALET / OUTDOOR
def chalet():
    stone = M('T_stone', '#8a8580', 0.9); timber = M('T_timber', '#7a4e2c', 0.75); roof = M('T_roof_snow', '#e8eef5', 0.8); trimw = M('chalet_trim', '#e8e0d0', 0.6)
    win = emis('chalet_window', '#ffb860', 1.6)
    W, D = 12.0, 9.0
    o = [box(W, D, 1.2, (0, 0, 0.6), stone)]
    o.append(box(W - 0.2, D - 0.2, 5.0, (0, 0, 3.6), timber))
    join('walls', o)
    # roof (gable along X)
    r1 = extrude_poly([(-W / 2 - 1.0, 6.0), (0, 9.2), (W / 2 + 1.0, 6.0), (W / 2 + 1.0, 5.75), (0, 8.9), (-W / 2 - 1.0, 5.75)], D + 2.0, roof)
    gable = extrude_poly([(-W / 2 + 0.1, 6.1), (0, 8.9), (W / 2 - 0.1, 6.1)], D - 0.2, timber)
    r1.name = 'roof'; gable.name = 'gable'
    # balcony
    bal = [box(W + 0.4, 1.4, 0.15, (0, -D / 2 - 0.7, 3.4), timber)]
    for i in range(25): bal.append(box(0.07, 0.07, 0.9, (-W / 2 + i * 0.5, -D / 2 - 1.35, 3.9), trimw))
    bal.append(box(W + 0.4, 0.1, 0.1, (0, -D / 2 - 1.35, 4.35), timber))
    join('balcony', bal)
    ws = []
    for x in (-4, -1.5, 1.5, 4):
        ws.append(box(1.2, 0.08, 1.4, (x, -D / 2 + 0.06, 2.3), win)); ws.append(box(1.2, 0.08, 1.4, (x, -D / 2 + 0.06, 5.0), win))
    for y in (-2.5, 0, 2.5): ws.append(box(0.08, 1.2, 1.4, (W / 2 - 0.06, y, 5.0), win)); ws.append(box(0.08, 1.2, 1.4, (-W / 2 + 0.06, y, 2.3), win))
    join('windows', ws)
    shut = []
    for x in (-4, -1.5, 1.5, 4):
        for z in (2.3, 5.0):
            for dx in (-0.8, 0.8): shut.append(box(0.4, 0.06, 1.5, (x + dx, -D / 2 - 0.02, z), M('shutter', '#7a2a24', 0.6)))
    join('shutters', shut)
    join('chimney', [box(1.0, 1.0, 3.0, (3.0, 1.5, 9.0), stone), box(1.2, 1.2, 0.2, (3.0, 1.5, 10.6), roof)])
    # main door (front, locked) and service door (east wall, +X)
    box(1.6, 0.15, 2.4, (0, -D / 2 - 0.02, 1.3), M('chalet_door', '#4a2a18', 0.6), name='front_door')
    box(0.12, 1.1, 2.2, (W / 2 + 0.02, -2.5, 1.1), M('service_door', '#555b62', 0.4, 0.6), name='service_door')
    box(0.3, 0.3, 0.06, (0, -D / 2 - 0.3, 2.8), emis('porchlight', '#ffd090', 3), name='porchlight')
    cols = [box(W, D, 9, (0, 0, 4.5))]
    for i, c in enumerate(cols): c.name = 'col_%d' % i

def guard_hut():
    w = M('hut', '#5a6b7a', 0.6); glass = M('hutglass', '#9bc', 0.05, alpha=0.3)
    join('hut', [box(2.2, 2.0, 0.15, (0, 0, 0.075), w), box(2.2, 0.1, 1.0, (0, -0.95, 0.6), w), box(2.2, 0.1, 2.6, (0, 0.95, 1.3), w), box(0.1, 2.0, 2.6, (1.05, 0, 1.3), w),
                 box(0.1, 1.0, 2.6, (-1.05, 0.5, 1.3), w), box(2.4, 2.2, 0.15, (0, 0, 2.65), M('T_roof_snow', '#e8eef5')), box(2.2, 0.03, 1.3, (0, -0.95, 1.75), glass),
                 box(1.6, 0.6, 0.05, (0, 0.6, 0.85), M('desk_top', '#d9d4c8', 0.5)), box(0.05, 0.5, 0.8, (-0.7, 0.6, 0.42), w), box(0.05, 0.5, 0.8, (0.7, 0.6, 0.42), w)])
    m = join('monitor', [box(0.45, 0.04, 0.32, (0.2, 0.75, 1.15), blackp(), bev=0.01), cyl(0.01, 0.25, (0.2, 0.78, 0.98), steel())])
    box(0.42, 0.004, 0.28, (0.2, 0.728, 1.15), M('T_minesweeper', '#888', 0.3, emit=(0.4, 0.4, 0.4), estr=1.0), name='screen')
    box(0.06, 0.004, 0.06, (0.37, 0.725, 1.3), M('T_sticky_pin', '#ffe066', 0.7), name='sticky')
    cols = [box(2.2, 0.1, 1.0, (0, -0.95, 0.5)), box(2.2, 0.1, 2.6, (0, 0.95, 1.3)), box(0.1, 2.0, 2.6, (1.05, 0, 1.3)), box(0.1, 1.0, 2.6, (-1.05, 0.5, 1.3)), box(1.6, 0.6, 0.85, (0, 0.6, 0.42))]
    for i, c in enumerate(cols): c.name = 'col_%d' % i

def pine(name='pine', h=6.0):
    random.seed(hash(name) % 100)
    cyl(0.18, h * 0.3, (0, 0, h * 0.15), M('bark', '#5a4030', 0.9))
    green = M('pine_green', '#2c4f3a', 0.85); snow = M('snow_white', '#f2f6fa', 0.7)
    o = []; s = []
    for i in range(5):
        z = h * 0.2 + i * h * 0.16; r = h * 0.28 * (1 - i * 0.17)
        o.append(cyl(r, h * 0.26, (0, 0, z + h * 0.13), green, r2=r * 0.15, v=10))
        s.append(cyl(r * 0.7, h * 0.07, (0, 0, z + h * 0.19), snow, r2=r * 0.25, v=10))
    join('needles', o); join('snowcaps', s)

def rock():
    random.seed(4); o = sph(0.8, (0, 0, 0.3), M('rock', '#6b6d70', 0.95), (1.3, 1.0, 0.7), seg=10, rings=6)
    for v in o.data.vertices: v.co += Vector((random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), random.uniform(-0.1, 0.1)))
    cap = sph(0.7, (0, 0, 0.65), M('snow_white', '#f2f6fa', 0.7), (1.2, 0.9, 0.25), seg=10, rings=6)

def fence():
    m = M('fence', '#555b62', 0.5, 0.7); o = []
    for i in range(5): o.append(cyl(0.04, 2.2, (i * 1.0 - 2.0, 0, 1.1), m, v=8))
    for z in (0.3, 1.1, 1.9): o.append(box(4.1, 0.03, 0.04, (0, 0, z), m))
    for i in range(12): o.append(box(0.012, 0.012, 1.8, (-2 + i * 0.36, 0, 1.1), m, rot=(0, 0.35, 0)))
    join('fence', o)

def floodlight():
    join('pole', [cyl(0.08, 5.0, (0, 0, 2.5), M('pole', '#3a3f45', 0.5, 0.6)), box(0.6, 0.3, 0.35, (0, -0.15, 5.0), M('fl_head', '#333', 0.4, 0.6), rot=(0.5, 0, 0))])
    box(0.5, 0.02, 0.28, (0, -0.32, 4.92), emis('fl_glass', '#fff4dd', 4), rot=(0.5, 0, 0), name='bulb')

def sec_cam():
    join('mount', [box(0.1, 0.1, 0.2, (0, 0.1, 0), M('cam_body', '#e8e8e8', 0.4)), cyl(0.02, 0.15, (0, 0.03, -0.08), steel(), rot=(pi / 2, 0, 0))])
    head = join('head', [box(0.14, 0.32, 0.14, (0, -0.12, -0.12), M('cam_body', '#e8e8e8'), bev=0.02), box(0.18, 0.36, 0.02, (0, -0.13, -0.04), M('cam_hood', '#ccc', 0.5)),
                         cyl(0.04, 0.03, (0, -0.29, -0.12), M('lens', '#05070a', 0.05, 0.5), rot=(pi / 2, 0, 0))], origin=(0, -0.02, -0.08))
    parent_keep(sph(0.012, (0.05, -0.26, -0.07), emis('cam_led', '#ff2020', 4), name='led'), head)
    parent_keep(cyl(0.038, 0.005, (0, -0.307, -0.12), M('frost', '#e8f4ff', 0.6, alpha=0.9), rot=(pi / 2, 0, 0), name='frost'), head)
def hot_tub():
    w = M('T_timber', '#7a4e2c'); join('tub', [lathe([(0, 0), (1.3, 0), (1.3, 0.9), (1.2, 0.9), (1.2, 0.1), (0, 0.1)], w, 'tub', seg=32)])
    cyl(1.2, 0.02, (0, 0, 0.75), M('water', '#3aa8c8', 0.05, 0.2, emit=(0.1, 0.4, 0.5), estr=0.6), v=32, name='water')

def snowman_crt():
    sn = M('snow_white', '#f2f6fa', 0.7)
    join('snow', [sph(0.6, (0, 0, 0.5), sn), sph(0.45, (0, 0, 1.25), sn)] + [sph(0.04, (0, -0.44, 1.1 + i * 0.15), blackp()) for i in range(3)] +
         [cyl(0.02, 0.9, (sx * 0.6, 0, 1.35), M('bark', '#5a4030'), rot=(0, sx * 1.0, 0)) for sx in (1, -1)])
    head = join('head', [box(0.5, 0.45, 0.42, (0, 0, 1.92), beige(), bev=0.04), box(0.38, 0.02, 0.3, (0, -0.23, 1.93), M('T_snowface', '#204020', 0.2, emit=(0.2, 0.5, 0.2), estr=1.2))], origin=(0, 0, 1.7))
    tor(0.24, 0.06, (0, 0, 1.62), M('scarf', '#c0392b', 0.7))

def ski_rack():
    m = M('pole', '#3a3f45'); o = [box(2.0, 0.08, 0.08, (0, 0, 1.2), m), box(0.08, 0.08, 1.2, (-0.95, 0, 0.6), m), box(0.08, 0.08, 1.2, (0.95, 0, 0.6), m)]
    for i in range(6): o.append(box(0.09, 0.03, 1.7, (-0.75 + i * 0.3, -0.06, 0.95), M('ski' + str(i % 3), ['#c0392b', '#2980b9', '#f1c40f'][i % 3], 0.3), rot=(0.12, 0, 0)))
    join('rack', o)

def van():
    w = M('van_white', '#f0ede6', 0.35, 0.2); g = M('carglass', '#1c2833', 0.05, 0.3)
    join('van', [box(2.0, 5.2, 2.0, (0, 0.3, 1.3), w, bev=0.12), box(2.0, 1.2, 1.2, (0, -2.6, 0.9), w, bev=0.12), box(1.9, 0.05, 0.6, (0, -2.75, 1.6), g, rot=(0.5, 0, 0)),
                 box(2.05, 3.6, 1.0, (0, 0.6, 1.5), M('T_vanlogo', '#5a3a22', 0.5))] +
         [box(2.02, 0.4, 0.15, (0, -3.1, 0.5), M('chrome', '#d8dde2', 0.15, 1.0))])
    for x in (-0.95, 0.95):
        for y in (-2.0, 1.9): cyl(0.4, 0.3, (x, y, 0.4), M('tire', '#151515', 0.85), rot=(0, pi / 2, 0))

def generator():
    join('gen', [box(1.6, 0.9, 1.0, (0, 0, 0.5), M('gen', '#d4a017', 0.5, 0.3), bev=0.03), cyl(0.08, 0.6, (0.5, 0.2, 1.3), M('exhaust', '#444', 0.5, 0.6)),
                 box(0.5, 0.02, 0.3, (-0.3, -0.46, 0.6), M('T_hazard', '#222', 0.6))])

def crate():
    join('crate', [box(0.9, 0.9, 0.9, (0, 0, 0.45), M('T_crate', '#8a6a3a', 0.8), bev=0.01)])

def barrel():
    join('barrel', [cyl(0.3, 0.9, (0, 0, 0.45), M('barrel', '#2a5d8f', 0.4, 0.5)), tor(0.3, 0.015, (0, 0, 0.2), steel()), tor(0.3, 0.015, (0, 0, 0.7), steel())])

def snowmobile():
    r = M('sled_red', '#c0392b', 0.3, 0.3)
    join('sled', [box(0.9, 2.2, 0.5, (0, 0, 0.55), r, bev=0.15), box(0.6, 0.9, 0.2, (0, 0.4, 0.9), blackp(), bev=0.05), box(0.6, 0.05, 0.4, (0, -0.8, 1.05), M('windsh', '#9bc', 0.05, alpha=0.4), rot=(0.4, 0, 0)),
                  box(0.08, 1.4, 0.06, (0.4, -0.7, 0.05), steel(), rot=(0.1, 0, 0)), box(0.08, 1.4, 0.06, (-0.4, -0.7, 0.05), steel(), rot=(0.1, 0, 0)), box(0.7, 1.2, 0.3, (0, 0.5, 0.2), blackp())])

def keypad():
    join('kp', [box(0.16, 0.05, 0.26, (0, 0, 0), M('kp', '#2a2d33', 0.4, 0.5), bev=0.01)] + [box(0.035, 0.012, 0.03, (-0.045 + (i % 3) * 0.045, -0.03, 0.04 - (i // 3) * 0.04), steel()) for i in range(12)])
    box(0.11, 0.004, 0.04, (0, -0.027, 0.095), emis('kp_lcd', '#40ff80', 1.5), name='screen')
    box(0.03, 0.004, 0.01, (0, -0.027, -0.115), emis('kp_led', '#ff3020', 3), name='led')

def snow_drift():
    o = sph(2.0, (0, 0, -0.6), M('snow_white', '#f2f6fa', 0.7), (1.6, 1.0, 0.45), seg=16, rings=8)

def mountain():
    random.seed(9)
    bpy.ops.mesh.primitive_cone_add(radius1=60, radius2=0, depth=50, vertices=14, location=(0, 0, 25)); o = act()
    bpy.ops.object.modifier_add(type='SUBSURF'); o.modifiers[-1].levels = 2; apply_mods(o)
    for v in o.data.vertices:
        v.co.x += random.uniform(-4, 4); v.co.y += random.uniform(-4, 4); v.co.z += random.uniform(-3, 3) * (v.co.z / 50)
    setmat(o, M('T_mountain', '#d8e2ec', 0.9)); smooth(o, 180)

# ------------------------------------------------------------------ DATA VAULT INTERIOR
def server_rack():
    f = M('rack', '#16181c', 0.35, 0.6)
    join('rack', [box(0.62, 1.0, 2.1, (0, 0, 1.05), f, bev=0.01)])
    box(0.56, 0.01, 1.9, (0, -0.505, 1.05), M('T_rackfront', '#222', 0.4, emit=(1, 1, 1), estr=1.4), name='leds')
    join('grille', [box(0.6, 0.01, 0.06, (0, -0.51, 2.05 - i * 0.12), M('rackbar', '#2a2d33', 0.4, 0.6)) for i in range(2)])

def patch_panel():
    join('panel', [box(1.2, 0.12, 0.8, (0, 0, 0), M('patch', '#2a2d33', 0.4, 0.6), bev=0.01)] + [box(0.03, 0.02, 0.025, (-0.5 + (i % 24) * 0.0435, -0.065, 0.28 - (i // 24) * 0.1), blackp()) for i in range(96)])
    box(1.1, 0.01, 0.25, (0, -0.07, -0.22), M('T_patchscreen', '#103020', 0.3, emit=(0.2, 0.6, 0.3), estr=1.0), name='screen')

def elevator():
    m = M('elev_steel', '#aab2ba', 0.25, 0.9); fr = M('elev_frame', '#3a3f45', 0.4, 0.6)
    join('frame', [box(0.2, 0.3, 2.6, (-1.0, 0, 1.3), fr), box(0.2, 0.3, 2.6, (1.0, 0, 1.3), fr), box(2.2, 0.3, 0.3, (0, 0, 2.75), fr)])
    box(0.9, 0.06, 2.4, (-0.45, 0, 1.2), m, name='door_l'); box(0.9, 0.06, 2.4, (0.45, 0, 1.2), m, name='door_r')
    box(0.24, 0.02, 0.1, (0, -0.16, 2.75), M('T_elev_ind', '#100', 0.4, emit=(1, 0.2, 0.1), estr=1.5), name='indicator')
    join('callpanel', [box(0.12, 0.04, 0.25, (1.3, -0.02, 1.2), fr), sph(0.025, (1.3, -0.05, 1.22), emis('callbtn2', '#ff9000', 1))])

def crac():
    join('crac', [box(1.8, 0.9, 2.2, (0, 0, 1.1), M('crac', '#d8dde2', 0.4, 0.3), bev=0.02)] + [box(1.6, 0.02, 0.04, (0, -0.46, 0.3 + i * 0.08), M('louver', '#888', 0.5)) for i in range(10)])
    box(0.3, 0.01, 0.15, (0.5, -0.46, 1.8), M('T_crac_lcd', '#102030', 0.3, emit=(0.3, 0.6, 1.0), estr=1.0), name='screen')

def extinguisher():
    join('ext', [cyl(0.08, 0.5, (0, 0, 0.25), M('ext_red', '#c0392b', 0.3, 0.2)), sph(0.08, (0, 0, 0.5), M('ext_red', '#c0392b')), box(0.04, 0.12, 0.04, (0, -0.05, 0.6), blackp())])

def cable_tray():
    join('tray', [box(0.6, 6.0, 0.02, (0, 0, 0), M('tray', '#8a9096', 0.4, 0.7)), box(0.02, 6.0, 0.1, (0.3, 0, 0.05), M('tray', '#8a9096')), box(0.02, 6.0, 0.1, (-0.3, 0, 0.05), M('tray', '#8a9096'))] +
         [cyl(0.025, 6.0, (-0.2 + i * 0.08, 0, 0.035), M('cable_' + str(i % 3), ['#d63', '#28f', '#fd0'][i % 3], 0.6), rot=(pi / 2, 0, 0), v=8) for i in range(6)])

def locker():
    g = M('locker', '#4a6b8a', 0.45, 0.5)
    join('locker', [box(0.9, 0.5, 1.9, (0, 0, 0.95), g, bev=0.01)] + [box(0.42, 0.01, 1.8, (-0.22 + i * 0.44, -0.255, 0.95), M('locker2', '#557799', 0.45, 0.5)) for i in range(2)] +
         [box(0.1, 0.01, 0.02, (-0.22 + i * 0.44, -0.262, 1.75 - k * 0.04), blackp()) for i in range(2) for k in range(3)])

def vending():
    join('vend', [box(1.0, 0.8, 1.9, (0, 0, 0.95), M('vend', '#c0392b', 0.4, 0.2), bev=0.03), box(0.6, 0.02, 1.3, (-0.12, -0.41, 1.1), M('T_vendfront', '#334', 0.2, emit=(0.6, 0.6, 0.6), estr=1.0))])

def admin_desk():
    w = M('desk_black', '#1c1d20', 0.4)
    join('desk', [box(2.0, 0.9, 0.05, (0, 0, 0.75), w, bev=0.01), box(0.05, 0.8, 0.75, (-0.95, 0, 0.375), w), box(0.05, 0.8, 0.75, (0.95, 0, 0.375), w)])

# ------------------------------------------------------------------ WINSTON CORE
def winston_core():
    dark = M('core_dark', '#14161b', 0.35, 0.7); glow = emis('core_glow', '#38ffb0', 3.0); grate = M('T_grate', '#3a3f45', 0.4, 0.8)
    # floor disc + ring
    join('floor', [cyl(14, 0.3, (0, 0, -0.15), grate, v=48)])
    join('ring', [tor(7.5, 0.25, (0, 0, 0.05), M('ring_metal', '#5a6068', 0.3, 0.9), maj=64, mn=8)])
    # monolith
    mono = [box(4.2, 2.2, 8.0, (0, 6.0, 4.0), dark, bev=0.05)]
    for i in range(14): mono.append(box(3.8, 0.05, 0.08, (0, 4.88, 0.6 + i * 0.5), glow))
    join('monolith', mono)
    box(3.4, 0.05, 2.4, (0, 4.86, 5.6), M('T_winston_face', '#103020', 0.2, emit=(0.2, 0.9, 0.5), estr=1.5), name='face')
    # server blade columns around
    cols = []
    for k in range(10):
        a = pi * 0.15 + k * pi * 1.7 / 9
        x, y = math.cos(a) * 11, math.sin(a) * 11 + 1.0
        if y > 7: continue
        cols.append(box(1.2, 1.2, 6.0, (x, y, 3.0), dark, rot=(0, 0, a), bev=0.03))
    join('columns', cols)
    strips = []
    for k in range(10):
        a = pi * 0.15 + k * pi * 1.7 / 9
        x, y = math.cos(a) * 10.38, math.sin(a) * 10.38 + 1.0
        if y > 7: continue
        strips.append(box(0.04, 0.9, 5.2, (x, y, 3.0), M('T_rackfront', '#222', 0.4, emit=(1, 1, 1), estr=1.4), rot=(0, 0, a)))
    join('blades', strips)
    # cable bundles from ceiling
    cab = [cyl(0.12, 10, (math.cos(i) * 3, 6 + math.sin(i) * 0.6, 13), M('cable_bk', '#111', 0.6), v=8) for i in range(6)]
    join('cables', cab)
    # hatch for CMOS (below face, front of monolith)
    join('hatch_frame', [box(1.4, 0.1, 1.0, (0, 4.86, 1.3), M('hatchframe', '#f2c94c', 0.5))])
    h = box(1.2, 0.08, 0.85, (0, 4.82, 1.3), M('hatch', '#2a2d33', 0.4, 0.6), name='hatch'); set_origin(h, (0.6, 4.82, 1.3))
    gb = cyl(0.35, 0.1, (0, 4.95, 1.3), M('cr2032', '#c9ccd0', 0.25, 1.0), rot=(pi / 2, 0, 0), v=40, name='giant_battery'); set_origin(gb, (0, 4.95, 1.3))
    cols = [box(4.2, 2.2, 8.0, (0, 6.0, 4.0))]
    for k in range(10):
        a = pi * 0.15 + k * pi * 1.7 / 9
        x, y = math.cos(a) * 11, math.sin(a) * 11 + 1.0
        if y > 7: continue
        cols.append(box(1.2, 1.2, 6.0, (x, y, 3.0), rot=(0, 0, a)))
    for i, c in enumerate(cols): c.name = 'col_%d' % i

def ups_unit():
    d = M('ups', '#1f2228', 0.4, 0.5)
    join('ups', [box(1.2, 0.8, 1.8, (0, 0, 0.9), d, bev=0.02), box(1.0, 0.02, 0.3, (0, -0.41, 1.5), M('T_ups_lcd', '#102030', 0.3, emit=(0.3, 1.0, 0.6), estr=1.0)),
                 box(0.3, 0.1, 0.5, (0.3, -0.45, 0.9), M('leverbase', '#f2c94c', 0.5))])
    lv = join('lever', [box(0.06, 0.06, 0.45, (0.3, -0.55, 1.12), M('lever', '#c0392b', 0.4)), sph(0.06, (0.3, -0.55, 1.35), blackp())], origin=(0.3, -0.5, 0.9))
    box(0.1, 0.02, 0.1, (-0.3, -0.41, 1.1), emis('ups_light', '#40ff80', 3), name='light')

def main_breaker():
    join('breaker', [box(1.4, 0.6, 2.2, (0, 0, 1.1), M('breaker', '#2a2d33', 0.4, 0.6), bev=0.02), box(0.8, 0.05, 0.4, (0, -0.32, 1.6), M('T_hazard', '#222', 0.6)),
                     box(0.3, 0.12, 0.3, (0, -0.35, 1.0), M('lockbox', '#888', 0.3, 0.8)), cyl(0.06, 0.03, (0, -0.42, 1.0), emis('retina', '#ff2020', 2), rot=(pi / 2, 0, 0))])

def power_button():
    join('pedestal', [cyl(0.6, 1.0, (0, 0, 0.5), M('ped', '#22252b', 0.35, 0.7), v=32), tor(0.45, 0.04, (0, 0, 1.0), emis('ped_ring', '#38ffb0', 2.5))])
    b = cyl(0.38, 0.12, (0, 0, 1.06), M('bigbtn', '#d8dde2', 0.3, 0.5), v=32, name='button')
    parent_keep(box(0.04, 0.2, 0.02, (0, -0.04, 1.125), M('pwr_sym', '#38ffb0', 0.3, emit=(0.2, 1.0, 0.6), estr=2)), b)
    parent_keep(tor(0.13, 0.02, (0, 0, 1.125), M('pwr_sym', '#38ffb0'), maj=20, mn=6), b)
def drone():
    join('drone', [sph(0.25, (0, 0, 0), M('drone', '#e8e8e8', 0.3, 0.3), (1, 1, 0.6)), sph(0.08, (0, -0.22, 0), emis('drone_eye', '#ff3030', 3))] +
         [cyl(0.15, 0.02, (math.cos(a) * 0.35, math.sin(a) * 0.35, 0.12), M('prop', '#333', 0.5, alpha=0.6)) for a in (0.8, 2.4, 3.9, 5.5)])

def office_window():
    join('win', [box(2.0, 0.1, 1.4, (0, 0, 0), M('winframe2', '#d8d2c6', 0.5)), ])

ALL = dict(cabin=cabin, seat_first=seat_first, galley_cart=galley_cart, champagne=champagne, flute=flute, pillow=pillow, jacket=jacket,
           plane_door=plane_door, plane_ext=plane_ext, chalet=chalet, guard_hut=guard_hut, pine=lambda: pine('pine', 6.0), pine_big=lambda: pine('pine_big', 10.0),
           rock=rock, fence=fence, floodlight=floodlight, sec_cam=sec_cam, hot_tub=hot_tub, snowman_crt=snowman_crt, ski_rack=ski_rack, van=van,
           generator=generator, crate=crate, barrel=barrel, snowmobile=snowmobile, keypad=keypad, snow_drift=snow_drift, mountain=mountain,
           server_rack=server_rack, patch_panel=patch_panel, elevator=elevator, crac=crac, extinguisher=extinguisher, cable_tray=cable_tray,
           locker=locker, vending=vending, admin_desk=admin_desk, winston_core=winston_core, ups_unit=ups_unit, main_breaker=main_breaker,
           power_button=power_button, drone=drone)

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    reset()
    for n in (argv or ALL):
        clear_scene(); ALL[n](); export(n)
