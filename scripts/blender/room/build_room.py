"""
Jeemu "Tonight" living room: opens the product scene (../jeemu.blend), builds a modern living room around it
(stone fireplace wall, floor-to-ceiling night windows, low coffee table) and renders a look-development still.

  blender -b -P build_room.py -- --look dark --view wide --out out/dark_wide.png --width 960 --height 540 --samples 48
  (or with the pip `bpy` module: python build_room.py --look dark ...)

Looks: dark (basalt + smoked oak + walnut), light (ledgestone + oak + travertine), scandi (whitewashed brick + ash).
Views: wide (establishing shot, fireplace + both windows), play (locked gameplay shot, background soft).
--fire 0..1 scales the flames (0 = embers only, 1 = full fire) for the "Tonight" progression.

Free CC0 assets come from Poly Haven and are cached in ./.cache (downloaded on first run).
Units: metres, Z up. The tabletop is z = 0 with Jeemu at the origin; its screen faces -Y (towards the camera).
"""
import argparse, json, math, os, sys, urllib.request
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--product', default=os.path.join(HERE, '..', 'jeemu.blend'))
ap.add_argument('--look', default='dark', choices=['dark', 'light', 'scandi'])
ap.add_argument('--view', default='wide', choices=['wide', 'play', 'over'])
ap.add_argument('--fire', type=float, default=1.0)
ap.add_argument('--sky', type=float, default=0.12, help='night-sky (HDRI) strength')
ap.add_argument('--sky-rot', type=float, default=240.0, help='turn the night photo (degrees) to frame the treeline')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'frame.png'))
ap.add_argument('--width', type=int, default=960)
ap.add_argument('--height', type=int, default=540)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--gpu', action='store_true')
ap.add_argument('--save-blend', default='')
A = ap.parse_args(argv)

CACHE = os.path.join(HERE, '.cache')
FLOOR = -0.40            # coffee-table top is z = 0, so the floor is 40 cm below
CEIL = FLOOR + 3.0
WALL_Y = 2.60            # glass line / back wall
BREAST = (-1.10, 1.10, 2.22)   # chimney breast x-min, x-max, front face y
FIRE = (-0.62, 0.62, FLOOR + 0.48, FLOOR + 0.98)   # firebox opening x0, x1, z0, z1

LOOKS = {
    'dark':   dict(wall='rock_wall_08', wall_tile=1.4, wall_val=0.85, wall_sat=0.8,
                   floor='wood_floor', floor_val=0.45, floor_sat=0.85, floor_tint=(1.0, 0.92, 0.85),
                   table='smoked_walnut_veneer', table_tint=(0.42, 0.27, 0.18), table_val=0.7,
                   rug_tint=(0.80, 0.74, 0.66), plaster=(0.20, 0.19, 0.18), hearth=(0.035, 0.035, 0.037)),
    'light':  dict(wall='rustic_stone_wall_02', wall_tile=1.6, wall_val=1.0, wall_sat=0.75,
                   floor='wood_floor', floor_val=0.85, floor_sat=0.8, floor_tint=(1.0, 0.97, 0.92),
                   table='marble_01', table_tint=(1.0, 0.96, 0.9), table_val=1.0,
                   rug_tint=(0.80, 0.76, 0.69), plaster=(0.62, 0.58, 0.53), hearth=(0.30, 0.28, 0.26)),
    'scandi': dict(wall='whitewashed_brick', wall_tile=1.2, wall_val=1.1, wall_sat=0.5,
                   floor='wood_floor', floor_val=1.05, floor_sat=0.45, floor_tint=(1.0, 0.98, 0.95),
                   table='ash_veneer', table_tint=(1.0, 0.97, 0.92), table_val=1.0,
                   rug_tint=(0.85, 0.83, 0.79), plaster=(0.78, 0.76, 0.72), hearth=(0.10, 0.10, 0.10)),
}
L = LOOKS[A.look]

# ---------------------------------------------------------------- Poly Haven cache
def _get(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 0: return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'jeemu-render/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(dst + '.part', 'wb') as f: f.write(r.read())
    os.replace(dst + '.part', dst); return dst

def _files(asset):
    p = os.path.join(CACHE, 'api', asset + '.json')
    if not os.path.exists(p): _get(f'https://api.polyhaven.com/files/{asset}', p)
    return json.load(open(p))

def ph_texture(asset, res='2k'):
    """Returns {map: path} for diffuse, roughness and displacement (whichever exist)."""
    f = _files(asset); out = {}
    for key, name in (('Diffuse', 'diff'), ('Rough', 'rough'), ('Displacement', 'disp')):
        if key in f and res in f[key]:
            url = f[key][res]['jpg']['url'] if 'jpg' in f[key][res] else f[key][res]['png']['url']
            out[name] = _get(url, os.path.join(CACHE, 'tex', asset, os.path.basename(url)))
    return out

def ph_hdri(asset, res='2k'):
    url = _files(asset)['hdri'][res]['hdr']['url']
    return _get(url, os.path.join(CACHE, 'hdri', os.path.basename(url)))

def ph_model(asset, res='1k'):
    g = _files(asset)['gltf'][res]
    root = os.path.join(CACHE, 'models', asset)
    main = _get(g['gltf']['url'], os.path.join(root, os.path.basename(g['gltf']['url'])))
    for rel, info in g['gltf'].get('include', {}).items(): _get(info['url'], os.path.join(root, rel))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=main)
    new = [o for o in bpy.data.objects if o not in before]
    root_objs = [o for o in new if o.parent is None]
    if len(root_objs) == 1: return root_objs[0]
    e = bpy.data.objects.new(asset, None); bpy.context.scene.collection.objects.link(e)
    for o in root_objs: o.parent = e
    return e

# ---------------------------------------------------------------- scene from the product file
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(A.product))
sc = bpy.context.scene
for n in ('Table', 'Key', 'Fill', 'Rim'):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
COL = sc.collection

# ---------------------------------------------------------------- helpers
def link(o): COL.objects.link(o); return o

def mesh_obj(name, verts, faces):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    return link(bpy.data.objects.new(name, me))

def box(name, x0, y0, z0, x1, y1, z1, bevel=0.0, mat=None):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    o = mesh_obj(name, v, f)              # vertices in world space, origin at 0: object coords == world coords
    if bevel:
        m = o.modifiers.new('Bevel', 'BEVEL'); m.width = bevel; m.segments = 3; m.limit_method = 'ANGLE'
    if mat: o.data.materials.append(mat)
    return o

def nodes_of(m):
    m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    return nt, nt.nodes['Material Output']

def plain(name, color, rough=0.6, metal=0.0, noise=0.0):
    m = bpy.data.materials.new(name); nt, out = nodes_of(m)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if noise:   # subtle large-scale variation so flat paint does not look CG
        tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = 1.5; nz.inputs['Detail'].default_value = 6
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 1 - noise; mr.inputs['To Max'].default_value = 1 + noise
        nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0; mix.inputs['A'].default_value = (*color, 1)
        nt.links.new(mr.outputs[0], mix.inputs['B']); nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.05
        nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 60
        nt.links.new(tc.outputs['Object'], nz2.inputs['Vector']); nt.links.new(nz2.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs[0], b.inputs['Normal'])
    return m

def pbr(name, asset, tile, val=1.0, sat=1.0, tint=(1, 1, 1), bump=0.4, rough_mul=1.0, rot=0.0, coat=0.0, res='2k', vary=0.0):
    """Poly Haven texture, box-projected in world space (tile = metres per texture repeat)."""
    t = ph_texture(asset, res)
    m = bpy.data.materials.new(name); nt, out = nodes_of(m)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    if coat and 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = 0.25
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / tile,) * 3; mp.inputs['Rotation'].default_value = (0, 0, rot)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    def img(path, colour):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(path, check_existing=True)
        n.image.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        n.projection = 'BOX'; n.projection_blend = 0.25
        nt.links.new(mp.outputs[0], n.inputs['Vector']); return n
    d = img(t['diff'], True)
    hsv = nt.nodes.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = sat; hsv.inputs['Value'].default_value = val
    nt.links.new(d.outputs['Color'], hsv.inputs['Color'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    nt.links.new(hsv.outputs[0], mix.inputs['A']); mix.inputs['B'].default_value = (*tint, 1)
    col = mix.outputs['Result']
    if vary:   # low-frequency light/dark patches break up the texture repeat
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 3
        nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 1 - vary; mr.inputs['To Max'].default_value = 1 + vary
        nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
        m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.blend_type = 'MULTIPLY'; m2.inputs['Factor'].default_value = 1
        nt.links.new(col, m2.inputs['A']); nt.links.new(mr.outputs[0], m2.inputs['B']); col = m2.outputs['Result']
    nt.links.new(col, b.inputs['Base Color'])
    if 'rough' in t:
        r = img(t['rough'], False); mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rough_mul
        nt.links.new(r.outputs['Color'], mm.inputs[0]); nt.links.new(mm.outputs[0], b.inputs['Roughness'])
    h = t.get('disp')
    if bump and h:
        bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = bump; bn.inputs['Distance'].default_value = 0.02
        nt.links.new(img(h, False).outputs['Color'], bn.inputs['Height']); nt.links.new(bn.outputs[0], b.inputs['Normal'])
    return m

def glass_mat(name, color=(1, 1, 1), rough=0.0):
    m = bpy.data.materials.new(name); nt, out = nodes_of(m)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Transmission Weight'].default_value = 1.0; b.inputs['IOR'].default_value = 1.5
    return m

# ---------------------------------------------------------------- materials
M_WALL = pbr('Stone', L['wall'], L['wall_tile'] * 1.3, val=L['wall_val'], sat=L['wall_sat'], bump=1.0, rough_mul=1.1, res='4k', vary=0.25)
M_FLOOR = pbr('Floor', L['floor'], 2.4, vary=0.15, val=L['floor_val'], sat=L['floor_sat'], tint=L['floor_tint'], bump=0.1, rough_mul=0.8, rot=math.pi / 2)
M_TABLE = pbr('TableTop', L['table'], 1.4, val=L['table_val'], tint=L['table_tint'], bump=0.03, rough_mul=0.55, coat=0.22, res='4k')
def scuff(m, lo=0.75, hi=1.6, scale=7.0, pores=0.015):
    """Real surfaces never have an even sheen: break the roughness up with smudges and add fine pores."""
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = 0.65
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.35; mr.inputs['From Max'].default_value = 0.65
    mr.inputs['To Min'].default_value = lo; mr.inputs['To Max'].default_value = hi; nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
    old = b.inputs['Roughness'].links[0].from_socket if b.inputs['Roughness'].is_linked else None
    mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.use_clamp = True
    if old: nt.links.new(old, mm.inputs[0])
    else: mm.inputs[0].default_value = b.inputs['Roughness'].default_value
    nt.links.new(mr.outputs[0], mm.inputs[1]); nt.links.new(mm.outputs[0], b.inputs['Roughness'])
    if 'Coat Roughness' in b.inputs: nt.links.new(mm.outputs[0], b.inputs['Coat Roughness'])
    if pores:
        pn = nt.nodes.new('ShaderNodeTexNoise'); pn.inputs['Scale'].default_value = 900; nt.links.new(tc.outputs['Object'], pn.inputs['Vector'])
        bn = nt.nodes.new('ShaderNodeBump'); bn.inputs['Strength'].default_value = pores; nt.links.new(pn.outputs['Fac'], bn.inputs['Height'])
        prev = b.inputs['Normal'].links[0].from_socket if b.inputs['Normal'].is_linked else None
        if prev: nt.links.new(prev, bn.inputs['Normal'])
        nt.links.new(bn.outputs[0], b.inputs['Normal'])
scuff(M_TABLE)
M_RUG = pbr('Rug', 'curly_teddy_natural', 0.5, sat=0.35, val=0.9, tint=L['rug_tint'], bump=1.0, rough_mul=1.3, vary=0.1)
M_PLASTER = plain('Plaster', L['plaster'], rough=0.85, noise=0.08)
M_HEARTH = plain('Hearth', L['hearth'], rough=0.45, noise=0.15)
M_STEEL = plain('BlackSteel', (0.018, 0.018, 0.02), rough=0.35, metal=0.9)
M_SOOT = plain('Soot', (0.012, 0.011, 0.010), rough=0.95, noise=0.3)
M_GLASS = glass_mat('WindowGlass', (0.97, 0.99, 0.98))
M_GROUND = plain('Ground', (0.02, 0.025, 0.018), rough=1.0, noise=0.4)

# ---------------------------------------------------------------- architecture
box('Floor', -4.2, -4.2, FLOOR - 0.05, 4.2, WALL_Y, FLOOR, mat=M_FLOOR)
box('Ceiling', -4.2, -4.2, CEIL, 4.2, WALL_Y + 0.2, CEIL + 0.05, mat=M_PLASTER)
box('WallBehind', -4.2, -4.25, FLOOR, 4.2, -4.2, CEIL, mat=M_PLASTER)
box('WallL', -4.25, -4.2, FLOOR, -4.2, WALL_Y, CEIL, mat=M_PLASTER)
box('WallR', 4.2, -4.2, FLOOR, 4.25, WALL_Y, CEIL, mat=M_PLASTER)

# chimney breast with a linear firebox cut into it
bx0, bx1, by = BREAST
breast = box('Breast', bx0, by, FLOOR, bx1, WALL_Y + 0.05, CEIL, bevel=0.006, mat=M_WALL)
fx0, fx1, fz0, fz1 = FIRE
cut = box('FireCut', fx0, by - 0.1, fz0, fx1, WALL_Y - 0.05, fz1)
cut.display_type = 'WIRE'; cut.hide_render = True
bo = breast.modifiers.new('Firebox', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
breast.modifiers.move(1, 0)    # boolean before bevel
FB_BACK = WALL_Y - 0.05
box('FireboxBack', fx0, FB_BACK, fz0, fx1, FB_BACK + 0.01, fz1, mat=M_SOOT)
box('FireboxFloor', fx0, by, fz0 - 0.01, fx1, FB_BACK, fz0, mat=M_SOOT)
box('FireboxTop', fx0, by, fz1, fx1, FB_BACK, fz1 + 0.01, mat=M_SOOT)
box('FireboxSideL', fx0, by, fz0, fx0 + 0.01, FB_BACK, fz1, mat=M_SOOT)
box('FireboxSideR', fx1 - 0.01, by, fz0, fx1, FB_BACK, fz1, mat=M_SOOT)
box('FireboxTrim', fx0 - 0.012, by - 0.004, fz0 - 0.012, fx1 + 0.012, by + 0.002, fz1 + 0.012, mat=M_STEEL).hide_render = True
# floating hearth bench that runs past the breast into the window bays
box('Hearth', -1.85, by - 0.42, FLOOR + 0.26, 1.85, by, FLOOR + 0.32, bevel=0.004, mat=M_HEARTH)
box('HearthPlinth', -1.80, by - 0.36, FLOOR, 1.80, by, FLOOR + 0.26, mat=M_SOOT)

# floor-to-ceiling glass either side, thin black steel frames
for s in (-1, 1):
    xa, xb = (bx1, 4.2) if s > 0 else (-4.2, bx0)
    g = box('Glass' + ('R' if s > 0 else 'L'), xa, WALL_Y - 0.006, FLOOR, xb, WALL_Y, CEIL, mat=M_GLASS)
    for x in (xa, xb, (xa + xb) / 2 - 0.5, (xa + xb) / 2 + 0.5):
        box('Mullion', x - 0.022, WALL_Y - 0.06, FLOOR, x + 0.022, WALL_Y + 0.01, CEIL, mat=M_STEEL)
    for z in (FLOOR, CEIL - 0.045):
        box('Rail', xa, WALL_Y - 0.06, z, xb, WALL_Y + 0.01, z + 0.045, mat=M_STEEL)

# outside is the night photograph itself (world HDRI): a real treeline against distant town glow

# ---------------------------------------------------------------- fire: charred logs with embers + flame cards
def ember_mat():
    m = bpy.data.materials.new('Logs'); nt, out = nodes_of(m)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 28
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9; nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.0; cr.color_ramp.elements[1].position = 0.06
    cr.color_ramp.elements[0].color = (1, 1, 1, 1); cr.color_ramp.elements[1].color = (0, 0, 0, 1)
    nt.links.new(vor.outputs['Distance'], cr.inputs['Fac'])
    mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'
    nt.links.new(cr.outputs['Color'], mm.inputs[0]); nt.links.new(nz.outputs['Fac'], mm.inputs[1])
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Base Color'].default_value = (0.02, 0.016, 0.013, 1); b.inputs['Roughness'].default_value = 0.9
    b.inputs['Emission Color'].default_value = (1.0, 0.22, 0.03, 1)
    em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = 6.0
    nt.links.new(mm.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], b.inputs['Emission Strength'])
    nt.links.new(b.outputs[0], out.inputs[0]); return m

def flame_mat(strength):
    m = bpy.data.materials.new('Flame'); nt, out = nodes_of(m)
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 4
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.5, 0.7, 1)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], nz.inputs['Vector'])
    # tongue shape: wide at the base, tapering to licks at the top, broken up by noise
    cx = nt.nodes.new('ShaderNodeMath'); cx.operation = 'SUBTRACT'; cx.inputs[1].default_value = 0.5; nt.links.new(sep.outputs['X'], cx.inputs[0])
    ax = nt.nodes.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; nt.links.new(cx.outputs[0], ax.inputs[0])
    w = nt.nodes.new('ShaderNodeMath'); w.operation = 'MULTIPLY_ADD'; w.inputs[1].default_value = -0.42; w.inputs[2].default_value = 0.5
    nt.links.new(sep.outputs['Y'], w.inputs[0])                      # half-width shrinks with height (plane: local Y is up)
    nn = nt.nodes.new('ShaderNodeMath'); nn.operation = 'MULTIPLY_ADD'; nn.inputs[1].default_value = 0.5; nn.inputs[2].default_value = -0.25
    nt.links.new(nz.outputs['Fac'], nn.inputs[0])
    w2 = nt.nodes.new('ShaderNodeMath'); w2.operation = 'ADD'; nt.links.new(w.outputs[0], w2.inputs[0]); nt.links.new(nn.outputs[0], w2.inputs[1])
    d = nt.nodes.new('ShaderNodeMath'); d.operation = 'SUBTRACT'; nt.links.new(w2.outputs[0], d.inputs[0]); nt.links.new(ax.outputs[0], d.inputs[1])
    fade = nt.nodes.new('ShaderNodeMath'); fade.operation = 'MULTIPLY'; fade.inputs[1].default_value = 6.0; nt.links.new(d.outputs[0], fade.inputs[0])
    vz = nt.nodes.new('ShaderNodeMath'); vz.operation = 'SUBTRACT'; vz.inputs[0].default_value = 1.0; nt.links.new(sep.outputs['Y'], vz.inputs[1])
    a = nt.nodes.new('ShaderNodeMath'); a.operation = 'MULTIPLY'; a.use_clamp = True
    nt.links.new(fade.outputs[0], a.inputs[0]); nt.links.new(vz.outputs[0], a.inputs[1])
    cr = nt.nodes.new('ShaderNodeValToRGB'); r = cr.color_ramp
    r.elements[0].position = 0.0; r.elements[0].color = (0.6, 0.06, 0.0, 1)
    r.elements[1].position = 1.0; r.elements[1].color = (1.0, 0.85, 0.45, 1)
    mid = r.elements.new(0.45); mid.color = (1.0, 0.38, 0.05, 1)
    nt.links.new(a.outputs[0], cr.inputs['Fac'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(cr.outputs['Color'], em.inputs['Color'])
    es = nt.nodes.new('ShaderNodeMath'); es.operation = 'MULTIPLY'; es.inputs[1].default_value = 1.3 * strength
    nt.links.new(a.outputs[0], es.inputs[0]); nt.links.new(es.outputs[0], em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(a.outputs[0], mx.inputs['Fac']); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m

M_LOGS = ember_mat()
LOG_Z = fz0 + 0.05
fire_cy = (by + FB_BACK) / 2
for i, (x, rz, r, ln) in enumerate(((-0.22, 0.12, 0.048, 0.46), (0.18, -0.08, 0.052, 0.5), (-0.02, 0.5, 0.042, 0.42))):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=ln, location=(x, fire_cy, LOG_Z + (0.07 if i == 2 else 0)),
                                        rotation=(0, math.pi / 2, rz))
    lg = bpy.context.active_object; lg.name = f'Log{i}'; lg.data.materials.append(M_LOGS)
    lg.modifiers.new('Bevel', 'BEVEL').width = 0.008

if A.fire > 0.02:
    M_FLAME = flame_mat(A.fire)
    for i, (x, h, w, rz) in enumerate(((-0.25, 0.30, 0.30, 0.25), (0.0, 0.38, 0.36, -0.15), (0.24, 0.28, 0.30, 0.1),
                                        (-0.1, 0.24, 0.26, -0.45), (0.12, 0.33, 0.28, 0.5))):
        h *= 0.55 + 0.45 * A.fire
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x, fire_cy + 0.02 * (i % 2), LOG_Z + h / 2 + 0.01), rotation=(math.pi / 2, 0, rz))
        fl = bpy.context.active_object; fl.name = f'Flame{i}'; fl.scale = (w, h, 1); fl.data.materials.append(M_FLAME)
        fl.visible_shadow = False

# fire light: a wide warm area light in the firebox mouth + a hot point at the logs
def light(name, kind, loc, energy, color, size=0.1, rot=None, size_y=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
    if kind == 'AREA':
        ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = size_y or size
    else: ld.shadow_soft_size = size
    o = link(bpy.data.objects.new(name, ld)); o.location = loc
    if rot: o.rotation_euler = rot
    return o

f = 0.25 + 0.75 * A.fire
light('FireMouth', 'AREA', (0, by + 0.02, (fz0 + fz1) / 2 - 0.05), 240 * f, (1.0, 0.42, 0.13), size=1.1, size_y=0.32,
      rot=(math.pi / 2, 0, 0)).data.cycles.is_caustics_light = False
light('FireCore', 'POINT', (0, fire_cy - 0.05, LOG_Z + 0.12), 45 * f, (1.0, 0.36, 0.08), size=0.15)
for i, (x, e, c) in enumerate(((-0.35, 40, (1.0, 0.33, 0.07)), (0.05, 60, (1.0, 0.45, 0.14)), (0.32, 32, (1.0, 0.30, 0.06)))):
    light(f'FireLick{i}', 'POINT', (x, by - 0.02, LOG_Z + 0.18 + 0.05 * (i % 2)), e * f, c, size=0.12)
# off-screen practical: a warm floor lamp camera-left, the soft key on Jeemu
light('FloorLamp', 'AREA', (-1.9, -1.6, 1.15), 35, (1.0, 0.70, 0.45), size=1.0,
      rot=Euler((math.radians(62), 0, math.radians(-50)), 'XYZ'))
# no fill lights: the room is lit only by things you could point to (fire, candles, an off-screen lamp)

# ---------------------------------------------------------------- furniture
def world_bbox(o):
    pts = []
    for ob in [o] + list(o.children_recursive):
        if ob.type == 'MESH':
            pts += [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    if not pts: return Vector((0, 0, 0)), Vector((0, 0, 0))
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def stadium(name, cx, cy, length, width, z0, z1, mat, bevel=0.0, seg=24):
    """Racetrack-shaped slab: two half-circles joined by straight sides (long axis along X)."""
    r = width / 2; hx = length / 2 - r; ring = []
    for i in range(seg + 1):
        a = -math.pi / 2 + math.pi * i / seg; ring.append((cx + hx + r * math.cos(a), cy + r * math.sin(a)))
    for i in range(seg + 1):
        a = math.pi / 2 + math.pi * i / seg; ring.append((cx - hx + r * math.cos(a), cy + r * math.sin(a)))
    n = len(ring)
    v = [(x, y, z0) for x, y in ring] + [(x, y, z1) for x, y in ring]
    f = [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    o = mesh_obj(name, v, f)
    for p in o.data.polygons: p.use_smooth = True
    if bevel:
        m = o.modifiers.new('Bevel', 'BEVEL'); m.width = bevel; m.segments = 6; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(50)
        o.modifiers.new('Normals', 'WEIGHTED_NORMAL').keep_sharp = True
    o.data.materials.append(mat); return o

# low racetrack coffee table in smoked walnut on a recessed dark plinth
TCX, TCY, TL, TW = 0.18, 0.02, 1.75, 0.92
stadium('TableTop', TCX, TCY, TL, TW, -0.05, 0.0, M_TABLE, bevel=0.018)
stadium('TablePlinth', TCX, TCY, TL - 0.5, TW - 0.36, FLOOR + 0.01, -0.05, plain('Plinth', (0.025, 0.02, 0.016), rough=0.45))
stadium('Rug', 0.05, -0.05, 3.6, 2.5, FLOOR, FLOOR + 0.018, M_RUG, bevel=0.008, seg=40)

# glassware (lathe profiles)
def lathe(name, prof, mat, steps=48):
    bm = bmesh.new(); rings = []
    for i in range(steps):
        a = 2 * math.pi * i / steps; ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, r * sa, z)) for r, z in prof])
    for i in range(steps):
        r0, r1 = rings[i], rings[(i + 1) % steps]
        for j in range(len(prof) - 1): bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat); return o

glass_prof = [(0.0, 0.0), (0.038, 0.0), (0.039, 0.002), (0.006, 0.006), (0.0035, 0.012), (0.0035, 0.095), (0.012, 0.102),
              (0.036, 0.125), (0.044, 0.16), (0.042, 0.19), (0.036, 0.215), (0.0355, 0.216), (0.0405, 0.19), (0.0425, 0.16),
              (0.0345, 0.126), (0.011, 0.104), (0.0, 0.103)]
def wine_prof(level):   # level: height of the wine surface above the bowl bottom
    zt = 0.1035 + level; rt = min(0.0412, 0.0105 + level * 1.1)
    return [(0.0, 0.1035), (0.0105, 0.1045), (min(0.034, rt), min(0.126, zt)), (rt, zt), (0.0, zt)]
M_CRYSTAL = glass_mat('Crystal'); M_WINE = glass_mat('Wine', (0.50, 0.025, 0.05))
for name, (gx, gy), level in (('GlassA', (0.36, -0.10), 0.048), ('GlassB', (0.62, 0.24), 0.012)):
    lathe(name, glass_prof, M_CRYSTAL).location = (gx, gy, 0.0)
    if level: lathe(name + 'Wine', wine_prof(level), M_WINE).location = (gx, gy, 0.0)

# ---------------------------------------------------------------- polaroids from tonight, scattered on the table
# Instant-film proportions: 88 x 107 mm card, 79 x 79 mm picture, deep bottom border for the handwriting.
# The pictures here are placeholders; on the site the real photos and the handwritten copy are laid over each
# polaroid (its corners are exported per frame, the same way the Jeemu screen is tracked today).
PHOTOS = [os.path.join(HERE, '..', 'previews', f) for f in sorted(os.listdir(os.path.join(HERE, '..', 'previews'))) if f.endswith('.jpg')]
M_CARD = plain('PolaroidCard', (0.86, 0.85, 0.82), rough=0.55, noise=0.03)
def photo_mat(i):
    m = bpy.data.materials.new(f'Photo{i}'); nt, out = nodes_of(m)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = 0.22
    nt.links.new(b.outputs[0], out.inputs[0])
    if PHOTOS:
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (0.5625, 1, 1); mp.inputs['Location'].default_value = (0.22, 0, 0)   # centre-crop 16:9 to square
        im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(PHOTOS[i % len(PHOTOS)], check_existing=True)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], im.inputs['Vector'])
        warm = nt.nodes.new('ShaderNodeMix'); warm.data_type = 'RGBA'; warm.blend_type = 'MULTIPLY'; warm.inputs['Factor'].default_value = 0.35
        warm.inputs['B'].default_value = (1.0, 0.8, 0.6, 1)
        nt.links.new(im.outputs['Color'], warm.inputs['A']); nt.links.new(warm.outputs['Result'], b.inputs['Base Color'])
    return m

def polaroid(i, x, y, rz, lift=0.0):
    z = 0.0004 + lift
    card = box(f'Polaroid{i}', -0.044, -0.0535, 0.0, 0.044, 0.0535, 0.0008, mat=M_CARD)
    bpy.ops.mesh.primitive_plane_add(size=0.079, location=(0, 0.008, 0.00085))
    ph = bpy.context.active_object; ph.name = f'Polaroid{i}Photo'; ph.data.materials.append(photo_mat(i)); ph.parent = card
    card.location = (x, y, z); card.rotation_euler = (0, 0, rz)
    return card

for i, (x, y, rz, lift) in enumerate(((0.30, -0.30, 0.18, 0.0), (0.44, -0.25, -0.22, 0.0009), (0.60, -0.31, 0.09, 0.0),
                                      (0.78, -0.18, -0.35, 0.0), (0.93, -0.02, 0.5, 0.0), (-0.30, -0.28, -0.12, 0.0),
                                      (-0.43, -0.22, 0.28, 0.0009), (0.73, -0.36, 1.45, 0.0018))):
    polaroid(i, x, y, rz, lift)

# ---------------------------------------------------------------- props (Poly Haven, CC0)
def place(asset, x, y, z=FLOOR, rz=0.0, scale=1.0, sit=True):
    """Imports a model and stands it on the surface at height z (its lowest point touches z)."""
    try: o = ph_model(asset)
    except Exception as e: print('model failed', asset, e); return None
    o.rotation_mode = 'XYZ'; o.rotation_euler = (0, 0, rz); o.scale = (scale,) * 3; o.location = (x, y, z)
    bpy.context.view_layer.update()
    if sit:
        lo, hi = world_bbox(o); o.location.z += z - lo.z
    bpy.context.view_layer.update(); return o

HEARTH_TOP = FLOOR + 0.32
# seating: sofa along the left window (facing the fire/table) with cushions; Eames-style lounge chair + ottoman by the fire
def tint_model(o, rgb, rough_add=0.0):
    """Darkens/recolours an imported model by multiplying its base colour."""
    seen = set()
    for ob in [o] + list(o.children_recursive):
        for slot in getattr(ob, 'material_slots', []):
            m = slot.material
            if not m or m.name in seen or not m.use_nodes: continue
            seen.add(m.name); nt = m.node_tree; b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not b: continue
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
            mx.inputs['B'].default_value = (*rgb, 1)
            if b.inputs['Base Color'].is_linked: nt.links.new(b.inputs['Base Color'].links[0].from_socket, mx.inputs['A'])
            else: mx.inputs['A'].default_value = b.inputs['Base Color'].default_value
            nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])

sofa = place('sofa_02', -2.15, 0.05, rz=math.radians(90))
if sofa: tint_model(sofa, (0.16, 0.16, 0.15))     # charcoal wool
if sofa:
    lo, hi = world_bbox(sofa); seat = lo.z + (hi.z - lo.z) * 0.48
    pil = place('throw_pillows_01', lo.x + 0.30, 0.55, seat, rz=math.radians(80))
    pil2 = place('throw_pillows_01', lo.x + 0.30, -0.45, seat, rz=math.radians(105))
    for pl in (pil, pil2):
        if pl: tint_model(pl, (0.75, 0.62, 0.48))   # rust/ochre cushions against the charcoal
place('mid_century_lounge_chair', 1.95, 1.05, rz=math.radians(-40))
place('Ottoman_01', 1.45, 0.55, rz=math.radians(-40))
# plants in the window corners and beside the chair
place('pachira_aquatica_01', -3.35, 1.95, rz=0.6)
place('potted_plant_02', 3.25, 2.05, rz=1.2, scale=1.15)
place('calathea_orbifolia_01', 2.65, 1.75, rz=0.3)
# side table by the sofa with a plant on it
st = place('side_table_01', -2.05, 1.05)
if st:
    lo, hi = world_bbox(st); place('anthurium_botany_01', -2.05, 1.05, hi.z, rz=0.4)
# hearth styling: ceramic vases on the left, a cat sculpture, stacked firewood on the right
place('ceramic_vase_03', -1.62, 1.98, HEARTH_TOP, rz=0.2)
place('ceramic_vase_01', -1.45, 2.06, HEARTH_TOP, rz=1.0)
place('antique_ceramic_vase_01', -1.30, 1.95, HEARTH_TOP, rz=2.0, scale=0.8)
place('concrete_cat_statue', 0.85, 1.98, HEARTH_TOP, rz=math.radians(-150), scale=0.9)
# on the table: wine bottle, wooden bowl, brass candlesticks with lit candles
bottles = place('wine_bottles_01', 0.80, 0.28, 0.0)
if bottles:   # keep only the bordeaux bottle
    for c in list(bottles.children_recursive):
        if c.type == 'MESH' and 'bordeaux' not in c.name.lower(): bpy.data.objects.remove(c, do_unlink=True)
    bpy.context.view_layer.update(); lo, hi = world_bbox(bottles)
    bottles.location.x += 0.80 - (lo.x + hi.x) / 2; bottles.location.y += 0.28 - (lo.y + hi.y) / 2; bottles.location.z += -lo.z
place('wooden_bowl_01', -0.40, 0.22, 0.0, rz=0.5)
M_WAX = plain('Wax', (0.62, 0.57, 0.50), rough=0.4)
M_WAX.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = 0.6
M_WAX.node_tree.nodes['Principled BSDF'].inputs['Subsurface Radius'].default_value = (0.02, 0.012, 0.006)
def candle_flame(x, y, z):
    m = bpy.data.materials.new('CandleFlame'); nt, out = nodes_of(m)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.55, 0.18, 1); em.inputs['Strength'].default_value = 12
    nt.links.new(em.outputs[0], out.inputs[0])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.006, location=(x, y, z + 0.012))
    fl = bpy.context.active_object; fl.scale = (0.6, 0.6, 1.9); fl.data.materials.append(m); fl.visible_shadow = False
    light('Candle', 'POINT', (x, y, z + 0.02), 0.35, (1.0, 0.55, 0.22), size=0.01)
# three pillar candles of different heights on a small round stone tray
stadium('CandleTray', -0.42, 0.06, 0.20, 0.20, 0.0, 0.012, plain('TrayStone', (0.05, 0.048, 0.045), rough=0.35, noise=0.2), bevel=0.003)
for cx, cy, h, r in ((-0.45, 0.09, 0.15, 0.034), (-0.385, 0.075, 0.10, 0.03), (-0.43, 0.01, 0.07, 0.03)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=h, location=(cx, cy, 0.012 + h / 2))
    c = bpy.context.active_object; c.data.materials.append(M_WAX); c.modifiers.new('Bevel', 'BEVEL').width = 0.003
    for p in c.data.polygons: p.use_smooth = True
    candle_flame(cx, cy, 0.012 + h + 0.008)

# ---------------------------------------------------------------- product realism
scr_img = bpy.data.images.get('screen.png')
if scr_img:   # standby: a black panel. The website overlays the live screen content on top of the render.
    px = [0.004, 0.004, 0.005, 1.0] * (scr_img.size[0] * scr_img.size[1]); scr_img.pixels = px; scr_img.pack()
scr = bpy.data.materials.get('ScreenMat')
if scr:
    sb = next(n for n in scr.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    sb.inputs['Roughness'].default_value = 0.06; sb.inputs['Coat Weight'].default_value = 0.0
    scuff(scr, lo=0.4, hi=3.0, scale=40, pores=0)
if bpy.data.materials.get('MouldedBlack'): scuff(bpy.data.materials['MouldedBlack'], lo=0.85, hi=1.35, scale=12, pores=0)

# ---------------------------------------------------------------- world: clear night sky
w = bpy.data.worlds.new('Night'); sc.world = w; w.use_nodes = True; wn = w.node_tree
for n in list(wn.nodes): wn.nodes.remove(n)
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(ph_hdri('moonless_golf', '4k'))
emap = wn.nodes.new('ShaderNodeMapping'); emap.inputs['Rotation'].default_value = (0, 0, math.radians(A.sky_rot))
etc = wn.nodes.new('ShaderNodeTexCoord'); wn.links.new(etc.outputs['Generated'], emap.inputs['Vector']); wn.links.new(emap.outputs[0], env.inputs['Vector'])
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = A.sky
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(env.outputs[0], bg.inputs[0]); wn.links.new(bg.outputs[0], wo.inputs[0])

# ---------------------------------------------------------------- camera
cam = bpy.data.objects['Cam']; cd = cam.data
for c in list(cam.constraints): cam.constraints.remove(c)   # the product file aims the camera at Jeemu; views here set it explicitly
VIEWS = {   # location, look-at, lens mm, f-stop
    'wide': ((0.05, -1.40, 0.24), (0.0, 2.4, 0.80), 26, 1.8),
    'play': ((0.24, -0.82, 0.30), (0.0, 0.0, 0.15), 35, 2.4),
    'over': ((0.52, -0.66, 0.36), (0.50, -0.24, 0.0), 40, 3.2),     # leaning over the photos on the table
}
loc, tgt, lens, fstop = VIEWS[A.view]
cam.location = loc
cam.rotation_mode = 'XYZ'; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
cd.lens = lens; cd.sensor_width = 36; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
cd.dof.focus_object = bpy.data.objects.get('Focus') if A.view != 'over' else None
if A.view == 'over': cd.dof.focus_distance = (Vector(tgt) - Vector(loc)).length; cd.clip_start = 0.01; cd.clip_end = 200
sc.camera = cam

# ---------------------------------------------------------------- render settings
r = sc.render; cy = sc.cycles
r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = A.width, A.height; r.resolution_percentage = 100
r.film_transparent = False
cy.samples = A.samples; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.01
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 8; cy.diffuse_bounces = 6; cy.glossy_bounces = 4; cy.transmission_bounces = 8; cy.transparent_max_bounces = 24
cy.sample_clamp_indirect = 6.0; cy.caustics_reflective = False; cy.caustics_refractive = False
if A.gpu:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for t in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
        try: prefs.compute_device_type = t; prefs.get_devices(); break
        except Exception: pass
    for d in prefs.devices: d.use = d.type != 'CPU'
    cy.device = 'GPU'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.0
r.image_settings.file_format = 'PNG'
# camera effects (bloom, lens fringing, vignette) are applied afterwards by post.py on the saved frames

if A.save_blend: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(A.save_blend))
os.makedirs(os.path.dirname(os.path.abspath(A.out)), exist_ok=True)
r.filepath = os.path.abspath(A.out)
bpy.ops.render.render(write_still=True)
print('wrote', r.filepath)
