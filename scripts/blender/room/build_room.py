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
try:
    import PIL  # noqa: F401  (Pillow draws the handwriting, the screens' textures and the laser burns)
except ImportError:
    # Blender has its own Python without Pillow; borrow it from the computer's own Python of the same version
    _v = f'{sys.version_info[0]}{sys.version_info[1]}'
    for _p in (os.path.expandvars(rf'%LOCALAPPDATA%\Programs\Python\Python{_v}\Lib\site-packages'),
               os.path.expandvars(rf'%APPDATA%\Python\Python{_v}\site-packages'),
               rf'C:\Program Files\Python{_v}\Lib\site-packages',
               os.path.expanduser(f'~/.local/lib/python{sys.version_info[0]}.{sys.version_info[1]}/site-packages')):
        if os.path.isdir(os.path.join(_p, 'PIL')): sys.path.append(_p); break
    try:
        import PIL  # noqa: F401,F811
    except ImportError:
        raise SystemExit(f'Pillow is missing. Install it for Python {sys.version_info[0]}.{sys.version_info[1]} '
                         f'(the version inside Blender):  py -{sys.version_info[0]}.{sys.version_info[1]} -m pip install pillow')
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--product', default=os.path.join(HERE, '..', 'jeemu.blend'))
ap.add_argument('--look', default='dark', choices=['dark', 'light', 'scandi'])
ap.add_argument('--view', default='wide', choices=['wide', 'play', 'over', 'close', 'top', 'product', 'frog', 'badge', 'story', 'team', 'faq', 'top2'])
ap.add_argument('--fire', type=float, default=1.0)
ap.add_argument('--sky', type=float, default=0.12, help='night-sky (HDRI) strength')
ap.add_argument('--sky-rot', type=float, default=240.0, help='turn the night photo (degrees) to frame the treeline')
ap.add_argument('--out', default=os.path.join(HERE, 'out', 'frame.png'))
ap.add_argument('--width', type=int, default=960)
ap.add_argument('--height', type=int, default=540)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--gpu', action='store_true')
ap.add_argument('--save-blend', default='')
ap.add_argument('--blank-photos', action='store_true', help='plain white picture areas: the website lays the real photos over them')
ap.add_argument('--bake-ui', action='store_true', help="the site's photos, handwriting and Jeemu's screen in the picture itself (camera moves: no live overlays)")
ap.add_argument('--screen', default='', help="with --bake-ui: what Jeemu's screen shows (screens/<name>.png); 'a>b' switches from a to b halfway through a move")
ap.add_argument('--late', action='store_true', help='end of the night: embers, empty glasses, burnt-down candles, a gappy tower')
ap.add_argument('--mask', action='store_true', help='render only a matte of Jeemu, the blocks and the polaroids (alpha), for compositing over an AI-enhanced still')
ap.add_argument('--chapters', action='store_true', help='the after-party table: story polaroids, the team print and the FAQ cards instead of the how-it-plays polaroids')
ap.add_argument('--fall', default='', help='render the tower falling, frame by frame, into this folder (use with --late)')
ap.add_argument('--fall-frames', type=int, default=60)
ap.add_argument('--fall-range', type=int, nargs=2, default=None, help='only render these frames of the fall (first last)')
ap.add_argument('--fall-sub', type=int, default=1, help='slow motion: render N steps per simulation frame (in between from the cached collapse, same outcome)')
ap.add_argument('--fall-test', action='store_true', help='run the collapse and print the tower height, no rendering')
ap.add_argument('--fall-save', default='', help='with --fall-test: save where the blocks land to this JSON')
ap.add_argument('--fallen', default='', help='JSON of where the blocks landed (from --fall): show the fallen tower')
ap.add_argument('--no-flames', action='store_true', help='no rendered fireplace flames or logs (the site lays filmed fire over the firebox); the firelight stays')
ap.add_argument('--patch', action='store_true', help='render only a region around the firebox (transparent elsewhere), to patch into an existing still')
ap.add_argument('--faq-shot', type=int, default=None, help='with --faq-blocks: a close-up of the K-th question block (camera low and square to the text)')
ap.add_argument('--faq-blocks', default='', help='comma-separated fallen blocks to burn the FAQ questions into (chapters table)')
ap.add_argument('--insets', default='', help='comma-separated objects: render a sharp close-up of each (cropped, --inset-scale x the resolution) into out/site/insets/')
ap.add_argument('--inset-scale', type=float, default=5.0)
ap.add_argument('--meta-only', action='store_true', help='write the --meta corners without rendering')
ap.add_argument('--fire-mask', action='store_true', help='render only where the firebox opening is visible (white on transparent), for the live fire footage')
ap.add_argument('--move', default='', help='render a camera move (a name from MOVES) frame by frame into --out (a folder)')
ap.add_argument('--move-range', type=int, nargs=2, default=None, help='only these frames of the move (first last, from 0)')
ap.add_argument('--portrait', action='store_true', help='a phone frame: --width/--height portrait, same vertical view as the landscape shot')
ap.add_argument('--meta', default='', help='write JSON with the screen and polaroid corners in image pixels')
A = ap.parse_args(argv)
if A.late: A.fire = 0.0

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
    import time as _time
    for attempt in range(8):   # a shaky connection: wait and try again rather than give up (5 s, 10 s, 20 s ... )
        try:
            with urllib.request.urlopen(req, timeout=120) as r, open(dst + '.part', 'wb') as f: f.write(r.read())
            break
        except OSError as e:
            if attempt == 7: raise
            wait = min(120, 5 * 2 ** attempt); print(f'download failed ({e}); trying again in {wait} s: {url}', flush=True); _time.sleep(wait)
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
for name, (gx, gy), level in (('GlassA', (0.36, -0.10), 0.003 if A.late else 0.048), ('GlassB', (0.62, 0.24), 0.0 if A.late else 0.012)):
    lathe(name, glass_prof, M_CRYSTAL).location = (gx, gy, 0.0)
    if level: lathe(name + 'Wine', wine_prof(level), M_WINE).location = (gx, gy, 0.0)

# ---------------------------------------------------------------- snacks: a stoneware bowl of crisps, and a tumbler of iced tea
import random as _rnd
_rnd.seed(11)
M_STONEWARE = plain('Stoneware', (0.055, 0.05, 0.045), rough=0.42, noise=0.25)
scuff(M_STONEWARE, lo=0.8, hi=1.4, scale=30)
CHIPS_AT = (0.24, 0.13)
bowl_prof = [(0.0, 0.0), (0.045, 0.0), (0.05, 0.004), (0.072, 0.03), (0.086, 0.056), (0.088, 0.058), (0.083, 0.057),
             (0.069, 0.032), (0.046, 0.008), (0.0, 0.007)]
lathe('ChipBowl', bowl_prof, M_STONEWARE, steps=64).location = (*CHIPS_AT, 0.0)

def chip_mat():
    m = bpy.data.materials.new('Crisp'); nt, out = nodes_of(m); L_ = nt.links.new
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); L_(b.outputs[0], out.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 140.0
    L_(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); L_(nz.outputs['Fac'], ramp.inputs['Fac'])
    e = ramp.color_ramp.elements; e[0].position = 0.5; e[0].color = (0.95, 0.66, 0.22, 1); e[1].position = 0.8; e[1].color = (0.60, 0.30, 0.07, 1)   # golden, browned spots
    L_(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.38; b.inputs['Subsurface Weight'].default_value = 0.35
    b.inputs['Subsurface Radius'].default_value = (0.004, 0.002, 0.001); b.inputs['Coat Weight'].default_value = 0.15   # a little oil
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; L_(nz.outputs['Fac'], bp.inputs['Height']); L_(bp.outputs[0], b.inputs['Normal'])
    return m
M_CHIP = chip_mat()

def crisp(name, rad):
    """One crisp: an irregular disc, curled like a saddle, with ruffled edges."""
    bm = bmesh.new(); n = 22
    edge = []
    k1, k2 = _rnd.uniform(4, 14), _rnd.uniform(-12, 8)
    for i in range(n):
        a = 2 * math.pi * i / n; r = rad * _rnd.uniform(0.82, 1.08)
        x, y = r * math.cos(a), r * math.sin(a)
        edge.append(bm.verts.new((x, y, k1 * x * x + k2 * y * y + _rnd.uniform(-0.0012, 0.0012))))
    mid = []
    for i in range(n):
        x, y = edge[i].co.x * 0.5, edge[i].co.y * 0.5
        mid.append(bm.verts.new((x, y, k1 * x * x + k2 * y * y)))
    c = bm.verts.new((0, 0, 0))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((mid[i], edge[i], edge[j], mid[j])); bm.faces.new((c, mid[i], mid[j]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p_ in me.polygons: p_.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(M_CHIP)
    so = o.modifiers.new('Thick', 'SOLIDIFY'); so.thickness = 0.0009
    o.modifiers.new('Sub', 'SUBSURF').levels = 1
    return o

n_chips = 22 if A.late else 70   # most of them are gone by the end of the night
for k in range(n_chips):
    u = math.sqrt(_rnd.random()); a = _rnd.uniform(0, 2 * math.pi)
    r = u * (0.060 if not A.late else 0.040)
    heap = (0.034 if not A.late else 0.004) * (1 - u ** 2)
    ch = crisp(f'Crisp{k}', _rnd.uniform(0.017, 0.025))
    ch.location = (CHIPS_AT[0] + r * math.cos(a), CHIPS_AT[1] + r * math.sin(a), 0.012 + heap + 0.026 * u ** 1.6 + _rnd.uniform(0, 0.006))
    ch.rotation_euler = (_rnd.uniform(-0.8, 0.8), _rnd.uniform(-0.8, 0.8), _rnd.uniform(0, 2 * math.pi))
if not A.late:   # one that didn't make it into the bowl
    ch = crisp('CrispStray', 0.02); ch.location = (CHIPS_AT[0] + 0.11, CHIPS_AT[1] - 0.06, 0.003); ch.rotation_euler = (0.05, -0.04, 1.1)

# a heavy tumbler of iced tea, with ice
TUMBLER_AT = (-0.20, 0.21)
tumbler_prof = [(0.0, 0.0), (0.036, 0.0), (0.038, 0.003), (0.039, 0.096), (0.0355, 0.096), (0.0345, 0.016), (0.0, 0.015)]
lathe('Tumbler', tumbler_prof, M_CRYSTAL, steps=64).location = (*TUMBLER_AT, 0.0)
tea_level = 0.024 if A.late else 0.066
M_TEA = glass_mat('IcedTea', (1.0, 0.72, 0.36), rough=0.02)
lathe('TumblerTea', [(0.0, 0.0151), (0.0344, 0.0151), (0.0344, 0.0151 + tea_level), (0.0, 0.0151 + tea_level)], M_TEA, steps=64).location = (*TUMBLER_AT, 0.0)
M_ICE = glass_mat('Ice', (0.96, 0.98, 1.0), rough=0.08)
for k, (dx, dy, rz) in enumerate(((-0.010, 0.006, 0.3), (0.011, -0.004, 1.1), (0.001, -0.013, 2.0))):
    if A.late and k: break   # the last of the ice
    cube = box(f'Ice{k}', -0.011, -0.011, -0.011, 0.011, 0.011, 0.011, bevel=0.004, mat=M_ICE)
    cube.location = (TUMBLER_AT[0] + dx, TUMBLER_AT[1] + dy, 0.0151 + tea_level - 0.004 - (0.008 if A.late else 0))
    cube.rotation_euler = (0.25 * k, -0.2, rz)

# ---------------------------------------------------------------- polaroids from tonight, scattered on the table
# Instant-film proportions: 88 x 107 mm card, 79 x 79 mm picture, deep bottom border for the handwriting.
# The pictures here are placeholders; on the site the real photos and the handwritten copy are laid over each
# polaroid (its corners are exported per frame, the same way the Jeemu screen is tracked today).
PHOTOS = [os.path.join(HERE, '..', 'previews', f) for f in sorted(os.listdir(os.path.join(HERE, '..', 'previews'))) if f.endswith('.jpg')]
SITE = os.path.join(HERE, '..', '..', '..')
def site_prints():
    """The site's own photos and handwritten notes, in the render's print order (src/components/tonight/copy.js)."""
    import re as _re
    src = open(os.path.join(SITE, 'src', 'components', 'tonight', 'copy.js'), encoding='utf-8').read()
    def items(block):
        return [(m.group(1), (m.group(2) or '').replace("\\'", "'")) for m in
                _re.finditer(r"photo: '([^']+)'(?:, note: '((?:[^'\\]|\\.)*)')?", block)]
    how = items(src[src.index('export const POLAROIDS'):src.index('export const EXTRA_PHOTOS')])
    how += [(p_, '') for p_ in _re.findall(r"'(photos/[^']+)'", src[src.index('export const EXTRA_PHOTOS'):src.index('export const FINALE')])]
    story = items(src[src.index('export const STORY'):src.index('export const TEAM_PRINT')])
    story += items(src[src.index('export const TEAM_PRINT'):])
    return story if A.chapters else how
PRINTS_SITE = site_prints() if A.bake_ui else []
def cover_mapping(nt, img, quad_aspect):
    """UV mapping that crops the picture to fill a quad of this aspect (like CSS object-fit: cover)."""
    ia = img.size[0] / max(1, img.size[1]); mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
    sx, sy = (quad_aspect / ia, 1.0) if ia > quad_aspect else (1.0, ia / quad_aspect)
    mp.inputs['Scale'].default_value = (sx, sy, 1); mp.inputs['Location'].default_value = ((1 - sx) / 2, (1 - sy) / 2, 0)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); return mp.outputs[0]
def note_texture(i, text, w_m, h_m):
    """The handwritten caption, as the site writes it: Kalam, ink #23243a, a slight tilt, sized to the strip."""
    from PIL import Image as _I, ImageDraw as _D, ImageFont as _F
    PX = 20000; W_, H_ = max(8, round(w_m * PX)), max(8, round(h_m * PX))
    capH = 600 * h_m / w_m; size = min(capH * 0.45, 1050 / max(10, len(text))) * W_ / 600
    im = _I.new('RGBA', (W_ * 2, H_ * 2), (0, 0, 0, 0)); dr = _D.Draw(im)
    fo = _F.truetype(os.path.join(CACHE, 'fonts', 'Kalam.ttf'), round(size * 2))
    tw = dr.textlength(text, font=fo); bb = dr.textbbox((0, 0), text, font=fo)
    dr.text(((W_ * 2 - tw) / 2, (H_ * 2 - (bb[3] - bb[1])) / 2 - bb[1]), text, fill=(0x23, 0x24, 0x3a, 235), font=fo)
    im = im.rotate(1.5, resample=_I.BICUBIC).resize((W_, H_), _I.LANCZOS)
    os.makedirs(os.path.join(CACHE, 'notes'), exist_ok=True)
    fp = os.path.join(CACHE, 'notes', f'{"c" if A.chapters else "p"}{i}.png'); im.save(fp); return fp
M_CARD = plain('PolaroidCard', (0.86, 0.85, 0.82), rough=0.55, noise=0.03)
def photo_mat(i):
    m = bpy.data.materials.new(f'Photo{i}'); nt, out = nodes_of(m)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = 0.22
    nt.links.new(b.outputs[0], out.inputs[0])
    if A.bake_ui and i < len(PRINTS_SITE):   # the site's own (already graded) photo, cropped like the site crops it
        im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(os.path.join(SITE, 'public', 'tonight', PRINTS_SITE[i][0]), check_existing=True)
        im.interpolation = 'Cubic'; nt.links.new(cover_mapping(nt, im.image, PHOTO_ASPECT.get(i, 1.0)), im.inputs['Vector'])
        nt.links.new(im.outputs['Color'], b.inputs['Base Color'])
    elif A.blank_photos:
        b.inputs['Base Color'].default_value = (0.9, 0.9, 0.9, 1)
    elif PHOTOS:
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (0.5625, 1, 1); mp.inputs['Location'].default_value = (0.22, 0, 0)   # centre-crop 16:9 to square
        im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(PHOTOS[i % len(PHOTOS)], check_existing=True)
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], im.inputs['Vector'])
        warm = nt.nodes.new('ShaderNodeMix'); warm.data_type = 'RGBA'; warm.blend_type = 'MULTIPLY'; warm.inputs['Factor'].default_value = 0.35
        warm.inputs['B'].default_value = (1.0, 0.8, 0.6, 1)
        nt.links.new(im.outputs['Color'], warm.inputs['A']); nt.links.new(warm.outputs['Result'], b.inputs['Base Color'])
    return m

# Instant prints. Square (88 x 107 mm, 79 mm picture) or wide (108 x 86 mm, 99 x 62 mm picture, for the team photo).
# The site lays the real photo and the handwriting over each one using the corners written to --meta.
PRINT = {
    'square': dict(card=(-0.044, -0.0535, 0.044, 0.0535), photo=(-0.0395, -0.0315, 0.0395, 0.0475), caption=(-0.040, -0.051, 0.040, -0.033)),
    'wide': dict(card=(-0.054, -0.043, 0.054, 0.043), photo=(-0.0495, -0.026, 0.0495, 0.036), caption=(-0.050, -0.041, 0.050, -0.028)),
}
PHOTO_ASPECT = {}
def polaroid(i, x, y, rz, lift=0.0, kind='square', face_down=False):
    k = PRINT[kind]; x0, y0, x1, y1 = k['card']; p0, q0, p1, q1 = k['photo']
    PHOTO_ASPECT[i] = (p1 - p0) / (q1 - q0)
    card = box(f'Polaroid{i}', x0, y0, 0.0, x1, y1, 0.0008, mat=M_CARD)
    bpy.ops.mesh.primitive_plane_add(size=1, location=((p0 + p1) / 2, (q0 + q1) / 2, 0.00085))
    ph = bpy.context.active_object; ph.scale = (p1 - p0, q1 - q0, 1); ph.name = f'Polaroid{i}Photo'; ph.data.materials.append(photo_mat(i)); ph.parent = card
    card.location = (x, y, 0.0004 + lift + (0.0008 if face_down else 0)); card.rotation_euler = (math.pi if face_down else 0, 0, rz)
    card['kind'] = kind
    note = PRINTS_SITE[i][1] if A.bake_ui and i < len(PRINTS_SITE) else ''
    if note and not face_down:   # the handwritten caption on the bottom strip
        c0, d0, c1, d1 = k['caption']
        bpy.ops.mesh.primitive_plane_add(size=1, location=((c0 + c1) / 2, (d0 + d1) / 2, 0.00086))
        nt_ = bpy.context.active_object; nt_.scale = (c1 - c0, d1 - d0, 1); nt_.name = f'Polaroid{i}Note'; nt_.parent = card
        m = bpy.data.materials.new(f'Note{i}'); n_, out_ = nodes_of(m)
        bs = n_.nodes.new('ShaderNodeBsdfPrincipled'); bs.inputs['Roughness'].default_value = 0.6
        tx = n_.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(note_texture(i, note, c1 - c0, d1 - d0)); tx.interpolation = 'Cubic'
        n_.links.new(tx.outputs['Color'], bs.inputs['Base Color']); n_.links.new(tx.outputs['Alpha'], bs.inputs['Alpha'])
        n_.links.new(bs.outputs[0], out_.inputs[0]); nt_.data.materials.append(m); nt_.visible_shadow = False
    return card

if not A.chapters:
    # seven in story order along the front of the table (the site pans from one to the next), plus one face-down extra
    POLAROIDS = [polaroid(i, x, y, rz, lift) for i, (x, y, rz, lift) in enumerate((
        (-0.52, -0.23, 0.16, 0.0), (-0.30, -0.30, -0.22, 0.0), (-0.08, -0.25, 0.09, 0.0), (0.14, -0.31, -0.13, 0.0),
        (0.37, -0.24, 0.24, 0.0), (0.60, -0.30, -0.18, 0.0), (0.83, -0.24, 0.12, 0.0)))]
    polaroid(7, 0.70, -0.06, 1.2, 0.0, face_down=True)
    FAQ_CARD = None
else:
    # after the waitlist: our story (five prints along the front), the team (a wide print at the right end),
    # and the questions people ask (a stack of 5 x 3 inch index cards at the back)
    POLAROIDS = [polaroid(i, x, y, rz) for i, (x, y, rz) in enumerate((
        (-0.55, -0.22, 0.12), (-0.31, -0.30, -0.17), (-0.06, -0.33, 0.08), (0.20, -0.31, -0.12), (0.45, -0.27, 0.18)))]
    POLAROIDS.append(polaroid(5, 0.80, -0.20, -0.07, kind='wide'))
    FAQ_CARD = None   # the questions are etched on fallen blocks now (see --meta: faqBlocks)
    for k in range(0):   # a slightly messy stack; the top one carries the question
        c = box(f'FaqCard{k}', -0.0635, -0.038, 0.0, 0.0635, 0.038, 0.00028, mat=M_INDEX)
        c.location = (-0.04 + _r.uniform(-0.004, 0.004), 0.31 + _r.uniform(-0.004, 0.004), k * 0.00029)
        c.rotation_euler = (0, 0, -0.18 + _r.uniform(-0.05, 0.05))
        FAQ_CARD = c

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
FLAMES = []   # candle flame positions, for the live flames on the site
def candle_flame(x, y, z):
    FLAMES.append((x, y, z))
    m = bpy.data.materials.new('CandleFlame'); nt, out = nodes_of(m)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1.0, 0.55, 0.18, 1); em.inputs['Strength'].default_value = 12
    nt.links.new(em.outputs[0], out.inputs[0])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.006, location=(x, y, z + 0.012))
    fl = bpy.context.active_object; fl.scale = (0.6, 0.6, 1.9); fl.data.materials.append(m); fl.visible_shadow = False
    light('Candle', 'POINT', (x, y, z + 0.02), 0.35, (1.0, 0.55, 0.22), size=0.01)
# three pillar candles of different heights on a small round stone tray
stadium('CandleTray', -0.42, 0.06, 0.20, 0.20, 0.0, 0.012, plain('TrayStone', (0.05, 0.048, 0.045), rough=0.35, noise=0.2), bevel=0.003)
for cx, cy, h, r in ((-0.45, 0.09, 0.15, 0.034), (-0.385, 0.075, 0.10, 0.03), (-0.43, 0.01, 0.07, 0.03)):
    if A.late: h *= 0.45
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=h, location=(cx, cy, 0.012 + h / 2))
    c = bpy.context.active_object; c.data.materials.append(M_WAX); c.modifiers.new('Bevel', 'BEVEL').width = 0.003
    for p in c.data.polygons: p.use_smooth = True
    candle_flame(cx, cy, 0.012 + h + 0.008)

# ---------------------------------------------------------------- end of the night: a gappy tower
if A.late:
    gone = {3: (0, 2), 4: (1,), 6: (0, 2), 7: (0,), 9: (0, 2), 10: (1,), 12: (0, 2), 14: (2,), 15: (0,)}
    out_on_table = [(0.16, -0.13, 0.4), (-0.17, -0.11, -0.25)]      # two pulled blocks left lying by the base
    k = 0
    for layer, idxs in gone.items():
        for j in idxs:
            b = bpy.data.objects.get(f'Block{layer * 3 + j:02d}')
            if not b: continue
            if k < len(out_on_table):
                x, y, rz = out_on_table[k]; b.location = (x, y, 0.0075); b.rotation_euler = (0, 0, rz)
            else:
                for c in list(b.children_recursive) + [b]: bpy.data.objects.remove(c, do_unlink=True)
            k += 1

# ---------------------------------------------------------------- product realism
scr_img = bpy.data.images.get('screen.png')
SCREEN_NODE = None; SCREEN_IMGS = {}
def screen_image(name):
    if name not in SCREEN_IMGS:
        SCREEN_IMGS[name] = bpy.data.images.load(os.path.join(HERE, 'screens', name + '.png'), check_existing=True)
    return SCREEN_IMGS[name]
if A.bake_ui and A.screen and bpy.data.materials.get('ScreenMat'):   # what the site shows on it, in the picture itself
    SCREEN_NODE = next(n for n in bpy.data.materials['ScreenMat'].node_tree.nodes if n.type == 'TEX_IMAGE')
    SCREEN_NODE.image = screen_image(A.screen.split('>')[0]); SCREEN_NODE.interpolation = 'Cubic'
elif scr_img:   # standby: a black panel. The website overlays the live screen content on top of the render.
    px = [0.004, 0.004, 0.005, 1.0] * (scr_img.size[0] * scr_img.size[1]); scr_img.pixels = px; scr_img.pack()
scr = bpy.data.materials.get('ScreenMat')
if scr:
    sb = next(n for n in scr.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    sb.inputs['Roughness'].default_value = 0.06; sb.inputs['Coat Weight'].default_value = 0.0
    scuff(scr, lo=0.4, hi=3.0, scale=40, pores=0)
# the real prototype: speckled black print, mint JEEMU and frog, pine blocks with numbers written on in pen
sys.path.insert(0, HERE); import prototype
prototype.apply(CACHE, os.path.join(HERE, '..', '..', '..', 'public', 'brand'))

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
    'close': ((0.07, -0.42, 0.15), (0.0, -0.06, 0.06), 45, 2.0),  # tight on the screen, fire soft behind
    'product': ((0.26, -0.24, 0.13), (0.0, 0.0, 0.05), 55, 5.6),   # checks: the JEEMU side and the screen
    'frog': ((-0.28, -0.20, 0.12), (0.0, 0.0, 0.05), 55, 5.6),     # checks: the frog side
    'story': ((-0.20, -0.36, 0.11), (0.0, -0.06, 0.05), 45, 2.0),   # the screen from the left: fire and candles behind
    'team': ((0.24, -0.33, 0.13), (0.0, -0.06, 0.05), 45, 2.0),     # from the right: the window side
    'faq': ((0.05, -0.30, 0.30), (0.0, -0.065, 0.04), 45, 2.2),     # from above: blocks on the table around the base
    'badge': ((0.24, -0.09, 0.15), (0.066, 0.0, 0.026), 70, 16),   # checks: the JEEMU badge, sharp
    'top': ((0.20, -0.14, 2.0), (0.20, -0.14, 0.0), 0, 0),          # straight down on the polaroids (orthographic)
    'top2': ((0.18, 0.02, 2.0), (0.18, 0.02, 0.0), 0, 0),           # straight down on the whole table (the chapters)
}
loc, tgt, lens, fstop = VIEWS[A.view]
cam.location = loc
cam.rotation_mode = 'XYZ'; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
cd.lens = lens; cd.sensor_width = 36; cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop
cd.dof.focus_object = bpy.data.objects.get('Focus') if A.view not in ('over', 'close', 'product', 'frog', 'badge', 'story', 'team', 'faq') else None
if A.view in ('over', 'close', 'product', 'frog', 'badge', 'story', 'team', 'faq'): cd.dof.focus_distance = (Vector(tgt) - Vector(loc)).length
cd.clip_start = 0.01; cd.clip_end = 200
if A.view in ('top', 'top2'):
    cam.rotation_euler = (0, 0, 0); cd.type = 'ORTHO'; cd.ortho_scale = 1.80 if A.view == 'top' else 1.96; cd.dof.use_dof = False
if A.portrait and cd.type != 'ORTHO':   # a phone frame: the same height of view as the landscape shot, narrower
    cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36 * 9 / 16
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
if A.mask:   # keep what must stay exact (the product, the blocks, the polaroids); everything else is cut out of the frame
    keep = ('Shell', 'Inlays', 'TopLogo', 'Screen', 'Block', 'Proto', 'PlateSkin', 'Badge', 'Polaroid', 'FaqCard')
    for o in sc.objects:
        if o.type in ('MESH', 'CURVE', 'FONT') and not o.name.startswith(keep): o.visible_camera = False
    r.film_transparent = True; cy.samples = 16; cy.use_denoising = False
    r.image_settings.color_mode = 'RGBA'
if A.chapters:   # the FAQ is etched on fallen blocks here: no frog stamps underneath it
    for o in sc.objects:
        if '_stamp' in o.name: o.hide_render = True
if A.no_flames:
    for o in sc.objects:
        if o.name.startswith(('Flame', 'Log')) and not o.name.startswith('FlameL'): o.hide_render = True
if A.patch:   # just the firebox and a margin round it, so the change can be dropped into the finished still
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view as _w2c
    trim = bpy.data.objects['FireboxTrim']; bb = [trim.matrix_world @ Vector(c) for c in trim.bound_box]
    pts = [_w2c(sc, sc.camera, v) for v in bb]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts); y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    mx, my = (x1 - x0) * 0.35 + 0.02, (y1 - y0) * 0.6 + 0.03
    r.use_border = True; r.use_crop_to_border = False
    r.border_min_x, r.border_max_x = max(0, x0 - mx), min(1, x1 + mx); r.border_min_y, r.border_max_y = max(0, y0 - my), min(1, y1 + my)
    r.film_transparent = False; r.image_settings.color_mode = 'RGBA'
    print('patch region', round(r.border_min_x, 3), round(r.border_max_x, 3), round(r.border_min_y, 3), round(r.border_max_y, 3))
import fall as _fall
if A.fallen: _fall.apply_final(A.fallen)
FAQ_CAMS = {}
if A.faq_blocks:   # the questions people ask, laser-burnt into the top of fallen blocks
    import re as _re, textwrap as _tw
    faq_src = open(os.path.join(HERE, '..', '..', '..', 'src', 'data', 'faq.js'), encoding='utf-8').read()
    questions = _re.findall(r"q: '((?:[^'\\]|\\.)*)'", faq_src)
    font_path = os.path.join(CACHE, 'fonts', 'Manrope-600.ttf')
    # Laser engraving as a texture on the block's face, not geometry: the letters are charred dark brown, a bump map
    # shades their edges like the walls of a shallow groove, and the heat leaves a faint scorch round each stroke.
    from PIL import Image as _Im, ImageDraw as _Dr, ImageFont as _Fo, ImageFilter as _Fi
    PXM = 40000                                    # texture pixels per metre (40 per mm): crisp at any zoom the site uses
    FW, FH = 0.075, 0.025                          # the block's wide face
    os.makedirs(os.path.join(CACHE, 'burn'), exist_ok=True)
    def burn_texture(k, lines, size):
        W_, H_ = round(FW * PXM), round(FH * PXM)
        im = _Im.new('L', (W_, H_), 0); dr = _Dr.Draw(im); fo = _Fo.truetype(font_path, round(size * PXM))
        lh = round(size * PXM * 1.0); y0 = H_ / 2 - lh * len(lines) / 2
        for i, ln in enumerate(lines):
            w_ = dr.textlength(ln, font=fo); dr.text(((W_ - w_) / 2, y0 + i * lh), ln, fill=255, font=fo)
        im = im.filter(_Fi.MaxFilter(3))                       # the beam is a little wider than the font's strokes
        groove = im.filter(_Fi.GaussianBlur(5))                # rounded walls: the bump map
        halo = im.filter(_Fi.GaussianBlur(14))                 # scorch round the strokes
        paths = []
        for nm, img in (('mask', im), ('groove', groove), ('halo', halo)):
            fp = os.path.join(CACHE, 'burn', f'{k}_{nm}.png'); img.save(fp); paths.append(fp)
        return paths
    def burn_material(k, paths):
        m = bpy.data.materials.new(f'LaserBurn{k}')
        nt_ = m.node_tree; N_ = nt_.nodes; L_ = nt_.links.new; bs = N_['Principled BSDF']; out_ = N_['Material Output']
        tex = {}
        for nm, fp in zip(('mask', 'groove', 'halo'), paths):
            n = N_.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(fp); n.image.colorspace_settings.name = 'Non-Color'
            n.interpolation = 'Cubic'; tex[nm] = n.outputs['Color']
        # colour: scorch brown at the edge of the halo, charred dark brown in the letters, darkest at their edges
        col = N_.new('ShaderNodeMix'); col.data_type = 'RGBA'
        col.inputs['A'].default_value = (0.13, 0.05, 0.014, 1); col.inputs['B'].default_value = (0.032, 0.011, 0.003, 1)
        L_(tex['mask'], col.inputs['Factor']); L_(col.outputs['Result'], bs.inputs['Base Color'])
        bs.inputs['Roughness'].default_value = 0.9
        # alpha: the letters, plus a faint scorch round them; elsewhere the block's own wood shows
        hs = N_.new('ShaderNodeMath'); hs.operation = 'MULTIPLY'; hs.inputs[1].default_value = 0.32; L_(tex['halo'], hs.inputs[0])
        al = N_.new('ShaderNodeMath'); al.operation = 'MAXIMUM'; L_(tex['mask'], al.inputs[0]); L_(hs.outputs[0], al.inputs[1])
        L_(al.outputs[0], bs.inputs['Alpha'])
        # the groove: letters sit lower than the surface, with soft walls (bump from the blurred mask)
        bu = N_.new('ShaderNodeBump'); bu.invert = True; bu.inputs['Strength'].default_value = 1.0; bu.inputs['Distance'].default_value = 0.0004
        L_(tex['groove'], bu.inputs['Height']); L_(bu.outputs['Normal'], bs.inputs['Normal'])
        return m
    for k, name in enumerate([n for n in A.faq_blocks.split(',') if n]):
        b = bpy.data.objects.get(name)
        if not b or k >= len(questions): continue
        M = b.matrix_world; up = 1 if M.col[2][2] > 0 else -1
        lines = _tw.wrap(questions[k].replace("\\'", "'"), 22)
        longest = max(len(l) for l in lines)
        size = min(0.0068, 0.062 / (longest * 0.56), 0.019 / (len(lines) * 0.98))
        me = bpy.data.meshes.new(f'Burn{k}')
        me.from_pydata([(-FW / 2, -FH / 2, 0), (FW / 2, -FH / 2, 0), (FW / 2, FH / 2, 0), (-FW / 2, FH / 2, 0)], [], [(0, 1, 2, 3)])
        uv = me.uv_layers.new(); 
        for li, (u, v) in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (u, v)
        t = bpy.data.objects.new(f'Burn{k}', me); COL.objects.link(t)
        t.data.materials.append(burn_material(k, burn_texture(k, lines, size)))
        t.parent = b; t.matrix_parent_inverse = Matrix()
        flip_z = math.pi if up < 0 else 0.0
        turn = math.pi if M.col[0][0] < 0 else 0.0   # read left to right from above
        t.location = (0, 0, up * 0.00762); t.rotation_euler = (flip_z, 0, turn)
        t.visible_shadow = False
        print('burnt', name, '|', ' / '.join(lines))
        if A.faq_shot == k or (A.move and f'faq{k}' in A.move):   # the close-up: low, square to the lettering, the block left of centre, the table soft behind
            bpy.context.view_layer.update()
            Mt = t.matrix_world; P = Mt.translation.copy()
            R = Vector(Mt.col[0][:3]); R.z = 0; R.normalize(); U = Vector(Mt.col[1][:3]); U.z = 0; U.normalize()
            d = 0.42
            bpy.context.view_layer.update(); dg_ = bpy.context.evaluated_depsgraph_get()
            Mb = b.matrix_world
            probe = [Mb @ Vector((x, y, up * 0.0076)) for x in (-0.034, -0.017, 0, 0.017, 0.034) for y in (-0.011, 0, 0.011)]   # the face with the question
            def clear(pos):   # nothing between the lens and the block (or just round it), so nothing smears across the frame
                for q in probe:
                    v = q - pos; hit, _, _, _, ob, _ = sc.ray_cast(dg_, pos, v.normalized(), distance=v.length - 0.003)
                    if hit and ob and ob.name != b.name and not ob.name.startswith('Burn'): HITS.append(ob.name); return False
                # and nothing big and blurred in the foreground: rays to the table between the camera and the block
                # (and either side of it) must get most of the way there before they hit anything
                base_ = P - Vector((0, 0, 0.015))
                fwd = (P - pos); fwd.z = 0; fwd.normalize(); side = fwd.cross(Vector((0, 0, 1)))
                for along in (-0.10, -0.06, -0.03):
                    for across in (-0.09, -0.045, 0, 0.045, 0.09):
                        q = base_ + fwd * along + side * across; v = q - pos
                        hit, loc_, _, _, ob, _ = sc.ray_cast(dg_, pos, v.normalized(), distance=v.length - 0.004)
                        if hit and ob and not ob.name.startswith(('Table', 'Burn')) and (loc_ - pos).length < 0.8 * v.length:
                            HITS.append('fg:' + ob.name); return False
                return True
            pos = None; HITS = []
            for deg in (36, 44, 52, 60, 68, 76):
                for az in (0, -15, 15, -30, 30, -45, 45):
                    el, ar = math.radians(deg), math.radians(az)
                    Ua = Matrix.Rotation(ar, 3, 'Z') @ U
                    cand = P - Ua * d * math.cos(el) + Vector((0, 0, d * math.sin(el)))
                    if clear(cand): pos = cand; break
                if pos: break
            print('faq shot camera', deg, az, 'clear' if pos else 'BLOCKED', sorted(set(HITS)))
            pos = pos or cand
            f = (P - pos).normalized(); Rx = (R - f * R.dot(f)).normalized(); Zc = -f; Yc = Zc.cross(Rx)
            FAQ_CAMS[k] = dict(loc=pos.copy(), rot=Matrix((Rx, Yc, Zc)).transposed().to_quaternion(), focus=d)
            if A.faq_shot != k: continue
            cam.matrix_world = Matrix((Rx, Yc, Zc)).transposed().to_4x4()
            cam.location = pos
            cd.type = 'PERSP'; cd.lens = 85; cd.sensor_width = 36; cd.sensor_fit = 'AUTO'; cd.shift_x = 0.09; cd.shift_y = -0.06
            cd.dof.use_dof = True; cd.dof.focus_object = None; cd.dof.focus_distance = d; cd.dof.aperture_fstop = 4.5
            FAQ_SUBJECT = (b, up)
if A.fire_mask:   # everything else cuts a hole; only the firebox mouth shows, so the site's fire footage stays behind the tower
    bpy.ops.mesh.primitive_plane_add(size=1, location=((fx0 + fx1) / 2, by + 0.02, (fz0 + fz1) / 2), rotation=(math.pi / 2, 0, 0))
    fm = bpy.context.active_object; fm.name = 'FireMatte'; fm.scale = (fx1 - fx0, fz1 - fz0, 1)
    mm = bpy.data.materials.new('FireMatte'); nt_, out_ = nodes_of(mm); em_ = nt_.nodes.new('ShaderNodeEmission'); em_.inputs['Strength'].default_value = 1.0
    nt_.links.new(em_.outputs[0], out_.inputs[0]); fm.data.materials.append(mm)
    for o in sc.objects:
        if o.type in ('MESH', 'CURVE', 'FONT') and o is not fm: o.is_holdout = True
        if o.type == 'LIGHT': o.hide_render = True
    sc.world = None; r.film_transparent = True; cy.samples = 8; cy.use_denoising = False
    sc.view_settings.view_transform = 'Standard'; r.image_settings.color_mode = 'RGBA'
# ---------------------------------------------------------------- camera moves (the site scrubs these with the scroll)
# A move is a list of camera states, each reached after so many frames; the whole move is one eased path (it starts
# and stops gently), so its first and last frames are exactly the shots before and after it. States:
#   a view name (wide, close, play)       the shot itself
#   over:NAME@H                           straight down on the table from H metres, framing OVER[NAME] (desktop handoff
#                                         to the site's pan over the overhead still: at 20 m it's as flat as that still)
#   print:I@H                             phone: straight down on print I, turned to read level, above the words
#   faqK                                  the close-up of the K-th question block
OVER = {'topIn': (0.0, -0.14, 0.95), 'topOut': (0.0, -0.14, 0.95), 'top2In': (0.0, -0.10, 1.40), 'top2Out': (0.0, -0.10, 1.40)}
ORTHO = {'top': ((0.20, -0.14), 1.80, (4800, 1524)), 'top2': ((0.18, 0.02), 1.96, (4800, 2520))}
MOVES = {
    'wide-close': ['wide', ('close', 48)],
    'close-play': ['close', ('play', 48)],
    'play-top': ['play', ('over:topIn@1.4', 54), ('over:topIn@20', 18)],
    'top-late': ['over:topOut@20', ('over:topOut@1.4', 18), ('play', 54)],
    'fallen-end': ['play', ('close', 48)],
    'end-top2': ['close', ('over:top2In@1.4', 54), ('over:top2In@20', 18)],
    'top2-faq0': ['over:top2Out@20', ('over:top2Out@1.4', 18), ('faq0', 54)],
    # phones: no overhead stills, the camera glides from print to print
    'p-play-print0': ['play', ('print:0@0.9', 60)],
    'p-prints-out': ['print:5@0.9', ('over:topOut@1.4', 36)],
    'p-top-late': ['over:topOut@1.4', ('play', 60)],
    'p-end-print0': ['close', ('print:0@0.9', 60)],
    'p-team-faq0': ['print:5@0.9', ('faq0', 54)],
}
for i in range(5): MOVES[f'p-print{i}-print{i + 1}'] = [f'print:{i}@0.9', (f'print:{i + 1}@0.9', 30)]
for k in range(6): MOVES[f'faq{k}-faq{k + 1}'] = [f'faq{k}', (f'faq{k + 1}', 36)]

def cam_state(name):
    from mathutils import Quaternion, Euler
    sh = (0.0, 0.0)
    if name in VIEWS:
        loc_, tgt_, lens_, fs_ = VIEWS[name]; loc_, tgt_ = Vector(loc_), Vector(tgt_)
        fo = bpy.data.objects.get('Focus')
        focus = (fo.matrix_world.translation - loc_).length if (fo and name in ('wide', 'play')) else (tgt_ - loc_).length
        return dict(loc=loc_, rot=(tgt_ - loc_).to_track_quat('-Z', 'Y'), lens=lens_, fstop=fs_, focus=focus, shift=sh, vig=0.30)
    if name.startswith('over:'):
        key, h = name[5:].split('@'); h = float(h); cx, cy, w = OVER[key]
        return dict(loc=Vector((cx, cy, h)), rot=Quaternion(), lens=36 * h / w, fstop=16, focus=h, shift=sh, vig=0.0)
    if name.startswith('print:'):
        i, h = name[6:].split('@'); i, h = int(i), float(h)
        card = POLAROIDS[i]; c = card.matrix_world.translation; rz = card.rotation_euler.z
        roll = rz * 0.6; V = 0.15 * 16 / 9                        # 15 cm across on a phone (the print fills most of it); the frame's height
        up = Vector((-math.sin(roll), math.cos(roll), 0))
        loc_ = Vector((c.x, c.y, h)) - up * (0.5 - 0.36) * V        # the print sits a little above the middle
        return dict(loc=loc_, rot=Euler((0, 0, roll)).to_quaternion(), lens=20.25 * h / V, fstop=8, focus=h, shift=sh, vig=0.0)
    if name.startswith('faq'):
        fc = FAQ_CAMS[int(name[3:])]
        # a phone is narrow: a wider lens there, so the whole question fits across
        return dict(loc=fc['loc'], rot=fc['rot'], lens=46 if A.portrait else 85, fstop=2.8 if A.portrait else 4.5, focus=fc['focus'], shift=(0.0, -0.15) if A.portrait else (0.09, -0.06), vig=0.30)
    raise SystemExit('unknown camera state ' + name)

def aimed(st):
    """Where a state's camera aims (a point at its focus distance) and its up direction."""
    M = st['rot'].to_matrix(); st['tgt'] = st['loc'] - Vector(M.col[2]) * st['focus']; st['up'] = Vector(M.col[1]); return st

def look(pos, tgt, up):
    from mathutils import Matrix as _M
    f = (tgt - pos).normalized(); r = f.cross(up)
    if r.length < 1e-6: r = f.cross(Vector((0, 1, 0)))
    r.normalize(); u = r.cross(f)
    return _M((r, u, -f)).transposed().to_quaternion()

def move_frames(spec):
    states = [aimed(cam_state(spec[0]))] + [aimed(cam_state(n)) for n, _ in spec[1:]]
    counts = [n for _, n in spec[1:]]; total = sum(counts)
    ease_ = lambda x: x * x * x * (x * (x * 6 - 15) + 10)   # smootherstep: starts and stops at rest
    pts = [s_['loc'] for s_ in states]
    def cr(i, t):   # Catmull-Rom through the states (a smooth path, no corners where legs meet)
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    out = []
    for f in range(total + 1):
        u = ease_(f / total) * total
        i = 0
        while i < len(counts) - 1 and u > sum(counts[:i + 1]): i += 1
        t = (u - sum(counts[:i])) / counts[i]
        a, b = states[i], states[i + 1]
        pos = cr(i, t); tgt = a['tgt'].lerp(b['tgt'], t); up = a['up'].lerp(b['up'], t)
        out.append(dict(loc=pos, rot=look(pos, tgt, up), lens=math.exp(math.log(a['lens']) * (1 - t) + math.log(b['lens']) * t),
                        fstop=a['fstop'] + (b['fstop'] - a['fstop']) * t, focus=(tgt - pos).length,   # sharp where it aims
                        shift=(a['shift'][0] + (b['shift'][0] - a['shift'][0]) * t, a['shift'][1] + (b['shift'][1] - a['shift'][1]) * t),
                        vig=a['vig'] + (b['vig'] - a['vig']) * t))
    return out

if A.fall or A.fall_test:
    _fall.setup(A.fall_frames)
    if A.fall_test:
        for f in range(1, A.fall_frames + 1, 5):
            sc.frame_set(f); print(f'frame {f}: tower top {_fall.tower_height():.3f} m')
        if A.fall_save: _fall.save_final(A.fall_save); print('saved', A.fall_save)
        raise SystemExit
    os.makedirs(A.fall, exist_ok=True)
    if not A.fire_mask:   # the camera is fixed: one set of corners for every frame, like a move's meta
        from bpy_extras.object_utils import world_to_camera_view as _w2c
        bpy.context.view_layer.update(); W_, H_ = r.resolution_x, r.resolution_y
        def _px(v): c = _w2c(sc, cam, v); return [round(c.x * W_, 1), round((1 - c.y) * H_, 1)]
        trim = bpy.data.objects['FireboxTrim']; bb = [trim.matrix_world @ Vector(c) for c in trim.bound_box]
        _x0, _x1 = min(v.x for v in bb) + 0.012, max(v.x for v in bb) - 0.012
        _z0, _z1 = min(v.z for v in bb) + 0.012, max(v.z for v in bb) - 0.012; _by = min(v.y for v in bb)
        fc_ = Vector(((_x0 + _x1) / 2, _by, (_z0 + _z1) / 2)); S1 = cd.dof.focus_distance * 1000
        if cd.dof.focus_object: S1 = (cd.dof.focus_object.matrix_world.translation - cam.matrix_world.translation).length * 1000
        S2 = (cam.matrix_world.inverted() @ fc_).length * 1000; fl = cd.lens
        coc = (fl * fl / cd.dof.aperture_fstop) * abs(S2 - S1) / max(1e-6, S2 * (S1 - fl))
        s_ = bpy.data.objects.get('Screen'); v_ = [s_.matrix_world @ x.co for x in s_.data.vertices]
        one = {'firebox': [_px(Vector(c)) for c in ((_x0, _by, _z1), (_x1, _by, _z1), (_x1, _by, _z0), (_x0, _by, _z0))],
               'screen': [_px(v_[2]), _px(v_[3]), _px(v_[1]), _px(v_[0])], 'vig': 0.30,
               'fireBlur': round(coc / (cd.sensor_height if A.portrait else 36) * (H_ if A.portrait else W_) / 2, 2)}
        n_ = max(1, A.fall_sub); f0_, f1_ = A.fall_range or (1, A.fall_frames)
        json.dump({'move': 'fall', 'width': W_, 'height': H_, 'portrait': A.portrait, 'late': A.late,
                   'frames': [one] * ((f1_ - f0_) * n_ + 1)}, open(os.path.join(A.fall, 'meta.json'), 'w'))
    f0, f1 = A.fall_range or (1, A.fall_frames)
    n = max(1, A.fall_sub)
    steps = [(f, k / n) for f in range(f0, f1) for k in range(n)] + [(f1, 0.0)]   # f0 .. f1 in 1/n frame steps
    for i, (f, sf) in enumerate(steps):
        r.filepath = os.path.join(os.path.abspath(A.fall), f'{"m" if A.fire_mask else ""}{i:03d}.png')
        if os.path.exists(r.filepath): continue   # resumable
        sc.frame_set(f, subframe=sf); bpy.ops.render.render(write_still=True)
    if not A.fire_mask: _fall.save_final(os.path.join(A.fall, 'fallen.json'))
    print('wrote', A.fall); raise SystemExit
if A.move:
    from bpy_extras.object_utils import world_to_camera_view
    spec = MOVES[A.move]; frames = move_frames(spec)
    os.makedirs(A.out, exist_ok=True)
    cd.type = 'PERSP'; cd.dof.use_dof = True; cd.dof.focus_object = None
    if A.portrait: cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 36 * 9 / 16
    else: cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    r.use_persistent_data = True
    W, H = r.resolution_x, r.resolution_y
    trim = bpy.data.objects['FireboxTrim']; bb = [trim.matrix_world @ Vector(c) for c in trim.bound_box]
    _x0, _x1 = min(v.x for v in bb) + 0.012, max(v.x for v in bb) - 0.012
    _z0, _z1 = min(v.z for v in bb) + 0.012, max(v.z for v in bb) - 0.012; _by = min(v.y for v in bb)
    fire_c = Vector(((_x0 + _x1) / 2, _by, (_z0 + _z1) / 2))
    scr_names = A.screen.split('>') if A.screen else []
    def place_cam(st):
        cam.location = st['loc']; cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = st['rot']
        cd.lens = st['lens']; cd.shift_x, cd.shift_y = st['shift']; cd.dof.focus_distance = st['focus']; cd.dof.aperture_fstop = st['fstop']
        cd.clip_start = max(0.01, st['loc'].z - 1.9)   # high above the table the camera looks through the ceiling
        bpy.context.view_layer.update()
    def px(v):
        c = world_to_camera_view(sc, cam, v); return [round(c.x * W, 1), round((1 - c.y) * H, 1)]
    meta = {'move': A.move, 'width': W, 'height': H, 'portrait': A.portrait, 'late': A.late, 'frames': []}
    for i, st in enumerate(frames):   # where things are in every frame (cheap), for the fire and the waitlist on the site
        place_cam(st); fm_ = {}
        s_ = bpy.data.objects.get('Screen')
        if s_:
            v = [s_.matrix_world @ x.co for x in s_.data.vertices]; fm_['screen'] = [px(v[2]), px(v[3]), px(v[1]), px(v[0])]
        fm_['firebox'] = [px(Vector(c)) for c in ((_x0, _by, _z1), (_x1, _by, _z1), (_x1, _by, _z0), (_x0, _by, _z0))]
        # how out of focus the fire is (circle of confusion, image pixels), so the filmed fire is softened to match
        S1 = st['focus'] * 1000; S2 = (cam.matrix_world.inverted() @ fire_c).length * 1000; fl = st['lens']
        coc = (fl * fl / st['fstop']) * abs(S2 - S1) / max(1e-6, S2 * (S1 - fl))
        fm_['vig'] = round(st['vig'], 3)
        fm_['fireBlur'] = round(coc / (cd.sensor_height if A.portrait else 36) * (H if A.portrait else W) / 2, 2)
        meta['frames'].append(fm_)
    # the overhead handoffs: which part of the overhead still (pixels) the frame shows
    for end, name in ((0, spec[0]), (-1, spec[-1][0])):
        if isinstance(name, str) and name.startswith('over:') and not A.portrait:
            cx, cy, w = OVER[name[5:].split('@')[0]]; h_ = w * H / W
            o = 'top2' if A.chapters else 'top'; (ox, oy), osc, (OW, OH) = ORTHO[o]
            k_ = OW / osc; x0_ = ox - osc / 2; y1_ = oy + osc * OH / OW / 2
            meta['handoff' + ('In' if end == 0 else 'Out')] = {'still': o, 'rect': [round((cx - w / 2 - x0_) * k_, 1), round((y1_ - (cy + h_ / 2)) * k_, 1),
                                                                     round((cx + w / 2 - x0_) * k_, 1), round((y1_ - (cy - h_ / 2)) * k_, 1)]}
    if not A.fire_mask: json.dump(meta, open(os.path.join(A.out, 'meta.json'), 'w'))
    f0, f1 = A.move_range or (0, len(frames) - 1)
    for i in range(f0, min(f1, len(frames) - 1) + 1):
        r.filepath = os.path.join(os.path.abspath(A.out), f'{"m" if A.fire_mask else ""}{i:03d}.png')
        if os.path.exists(r.filepath): continue   # resumable
        if SCREEN_NODE and len(scr_names) > 1: SCREEN_NODE.image = screen_image(scr_names[0 if i < len(frames) / 2 else 1])
        place_cam(frames[i]); bpy.ops.render.render(write_still=True)
        print(f'move {A.move} frame {i}/{len(frames) - 1}', flush=True)
    print('wrote', A.out); raise SystemExit

if not A.meta_only:
    bpy.ops.render.render(write_still=True)
bpy.context.view_layer.update()   # make sure the camera's new placement is applied (a render does this; --meta-only doesn't)
if A.meta:   # where the live overlays go: corners in image pixels, clockwise from top-left as the viewer reads them
    from bpy_extras.object_utils import world_to_camera_view
    W, H = r.resolution_x, r.resolution_y
    def px(v):
        c = world_to_camera_view(sc, cam, v); return [round(c.x * W, 1), round((1 - c.y) * H, 1)]
    meta = {'width': W, 'height': H, 'view': A.view}
    s_ = bpy.data.objects.get('Screen')
    if s_:
        v = [s_.matrix_world @ x.co for x in s_.data.vertices]          # 0 low-left, 1 low-right, 2 high-left, 3 high-right
        meta['screen'] = [px(v[2]), px(v[3]), px(v[1]), px(v[0])]
    meta['polaroids'] = []
    for card in POLAROIDS:
        M = card.matrix_world
        def quad(x0, y0, x1, y1, z=0.0009):
            return [px(M @ Vector(c)) for c in ((x0, y1, z), (x1, y1, z), (x1, y0, z), (x0, y0, z))]
        k = PRINT[card.get('kind', 'square')]
        meta['polaroids'].append({'kind': card.get('kind', 'square'), 'photo': quad(*k['photo']), 'caption': quad(*k['caption']), 'card': quad(*k['card'])})
    if A.chapters and A.fallen:   # fallen blocks lying flat, wide face up, clear of the tower: the FAQ is etched on these
        cands = []
        blocks = [b for b in bpy.data.objects if b.name.startswith('Block') and b.type == 'MESH' and len(b.name) == 7]
        for b in blocks:
            M = b.matrix_world; c = M.translation; z = Vector(M.col[2][:3]).normalized(); xa = Vector(M.col[0][:3]).normalized()
            if abs(z.z) < 0.93 or c.z > 0.03 or math.hypot(c.x, c.y) < 0.13: continue
            if any(o is not b and (o.matrix_world.translation - c).to_2d().length < 0.05 and o.matrix_world.translation.z > c.z + 0.008 for o in blocks): continue
            up = 1 if z.z > 0 else -1
            if xa.x < 0: xa = -xa   # text runs left to right in the picture
            # corners of the face that looks up, clockwise from top-left as the picture reads
            ya = z.cross(xa) * up if up > 0 else -z.cross(xa)
            if ya.y < 0: ya = -ya
            ctr = c + Vector((0, 0, 0.0076))
            q = [ctr - xa * 0.0375 + ya * 0.0125, ctr + xa * 0.0375 + ya * 0.0125, ctr + xa * 0.0375 - ya * 0.0125, ctr - xa * 0.0375 - ya * 0.0125]
            cands.append((math.atan2(c.y, c.x), b.name, [px(v) for v in q]))
        cands.sort()
        meta['faqBlocks'] = [{'block': n, 'quad': q} for _, n, q in cands]
        print('faq blocks', len(cands))
    if A.faq_shot is not None and 'FAQ_SUBJECT' in globals():
        b, up = FAQ_SUBJECT; Mb = b.matrix_world
        cs = [Mb @ Vector((x, y, up * 0.00756)) for x, y in ((-0.0375, 0.0125), (0.0375, 0.0125), (0.0375, -0.0125), (-0.0375, -0.0125))]
        pts = sorted([px(v) for v in cs], key=lambda q: q[1]); top_, bot_ = sorted(pts[:2]), sorted(pts[2:])
        meta['subject'] = [top_[0], top_[1], bot_[1], bot_[0]]   # clockwise from top-left as the picture reads
    if FAQ_CARD:   # the top index card, for the questions
        M = FAQ_CARD.matrix_world
        meta['faq'] = [px(M @ Vector(c)) for c in ((-0.0635, 0.038, 0.0003), (0.0635, 0.038, 0.0003), (0.0635, -0.038, 0.0003), (-0.0635, -0.038, 0.0003))]
    # the firebox mouth and the candle flames, for the moving fire laid over the still
    trim = bpy.data.objects['FireboxTrim']   # the firebox mouth, read off the scene itself
    bb = [trim.matrix_world @ Vector(c) for c in trim.bound_box]
    _x0, _x1 = min(v.x for v in bb) + 0.012, max(v.x for v in bb) - 0.012
    _z0, _z1 = min(v.z for v in bb) + 0.012, max(v.z for v in bb) - 0.012; _by = min(v.y for v in bb)
    meta['firebox'] = [px(Vector(c)) for c in ((_x0, _by, _z1), (_x1, _by, _z1), (_x1, _by, _z0), (_x0, _by, _z0))]
    meta['flames'] = [{'base': px(Vector((x, y, z))), 'tip': px(Vector((x, y, z + 0.034)))} for x, y, z in FLAMES]
    if A.faq_blocks: meta['burnt'] = True   # the questions are in the picture (the site skips its own lettering)
    if A.bake_ui: meta['baked'] = True      # photos and handwriting are in the picture (the site lays nothing over them)
    if A.insets:   # where each close-up sits in the base image (pixels): the site lays them over it when it zooms in
        meta['insets'] = {}
        from bpy_extras.object_utils import world_to_camera_view as _w2c
        for name in [n for n in A.insets.split(',') if n]:
            o = bpy.data.objects.get(name)
            if not o: continue
            pts = [px(o.matrix_world @ Vector(c)) for c in o.bound_box]
            x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
            mx, my = (x1 - x0) * 0.35 + 12, (y1 - y0) * 0.35 + 12
            # named after the still too (both overhead tables have a Polaroid0): top2_Polaroid0
            meta['insets'][f'{os.path.splitext(os.path.basename(A.out))[0]}_{name}' if A.bake_ui else name] = [max(0, round(x0 - mx)), max(0, round(y0 - my)), min(W, round(x1 + mx)), min(H, round(y1 + my))]
    json.dump(meta, open(A.meta, 'w'), indent=1)
    print('wrote', A.meta)
print('wrote', r.filepath if not A.meta_only else '(meta only)')
if A.insets and A.meta:   # sharp close-ups: the same picture, rendered only inside each box at a higher resolution
    boxes = json.load(open(A.meta)).get('insets', {})
    W0, H0 = r.resolution_x, r.resolution_y
    os.makedirs(os.path.join(os.path.dirname(os.path.abspath(A.out)), 'insets'), exist_ok=True)
    r.resolution_x, r.resolution_y = round(W0 * A.inset_scale), round(H0 * A.inset_scale)
    r.use_border = True; r.use_crop_to_border = True
    for name, (x0, y0, x1, y1) in boxes.items():
        r.border_min_x, r.border_max_x = x0 / W0, x1 / W0
        r.border_min_y, r.border_max_y = 1 - y1 / H0, 1 - y0 / H0
        r.filepath = os.path.join(os.path.dirname(os.path.abspath(A.out)), 'insets', f'{name}.png')
        if not os.path.exists(r.filepath): bpy.ops.render.render(write_still=True)
        print('inset', name, (x0, y0, x1, y1))
