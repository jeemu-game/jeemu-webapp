"""
Jeemu landing-page scene: builds the console + 45-block tower from the
jeemu-designs CAD exports and renders any frame of the scroll story.

  python build_scene.py --designs /path/to/jeemu-designs --frames 0,90,200 \
         --out ./out --width 960 --height 540 --samples 48

All poses are computed analytically from the frame number (no keyframes), so
any frame can be rendered alone, in any order, on any machine.
Units: metres. Z up. Screen faces -Y. NFC wordmark badge is on the +X wall.
"""
import argparse, json, math, os, random, sys
import bpy
from mathutils import Vector, Matrix, Euler, Quaternion
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--designs', required=True)
ap.add_argument('--frames', default='0')
ap.add_argument('--out', default='./out')
ap.add_argument('--width', type=int, default=960)
ap.add_argument('--height', type=int, default=540)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--gpu', action='store_true')
ap.add_argument('--step', type=int, default=1, help="with --frames all: render every Nth frame (3 = 140 frames, plenty for a smooth scroll)")
ap.add_argument('--portrait', action='store_true', help='9:16 phone framing: pass --width/--height as portrait (e.g. 1080x1920); camera is pulled in so the tall tower fills the frame')
ap.add_argument('--sloppiness', type=float, default=1.0, help='0 = machine-perfect tower, 1 = stacked by a careful human, 2 = rushed')
ap.add_argument('--save-blend', default='')
ap.add_argument('--screen-png', default='')

A = ap.parse_args(argv)

FPS = 30
MM = 0.001
# ---- standard Jenga block 75x25x15 mm, 54 blocks (tower sits on the 85 mm deck with a 5 mm margin) ----
BL, BW, BH = 75 * MM, 25 * MM, 15 * MM      # standard Jenga block
LAYERS, PER = 18, 3                          # 54 blocks
DECK_Z = 52 * MM
SEED = 7

# ---------------------------------------------------------------- helpers
def smooth(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def ease_out(x):
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def ease_in(x):
    x = max(0.0, min(1.0, x)); return x ** 2.2
def lerp(a, b, t): return a + (b - a) * t
def clamp01(x): return max(0.0, min(1.0, x))

def mat(name, base, rough=0.5, metal=0.0, emit=None, emit_strength=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m

def import_stl(path, name):
    before = set(bpy.data.objects)
    try: bpy.ops.wm.stl_import(filepath=path)
    except AttributeError: bpy.ops.import_mesh.stl(filepath=path)
    o = [x for x in bpy.data.objects if x not in before][0]
    o.name = name
    o.scale = (MM, MM, MM)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth(keep_sharp_edges=True) if False else None
    return o

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.render.resolution_x, sc.render.resolution_y = A.width, A.height
sc.render.fps = FPS
cy = sc.cycles
cy.samples = A.samples
cy.use_denoising = True
try: cy.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
cy.max_bounces = 8
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.adaptive_min_samples = 16
if A.gpu:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    chosen = None
    for dt in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = dt
            prefs.get_devices()
        except Exception:
            continue
        if any(d.type == dt for d in prefs.devices):
            chosen = dt; break
    if chosen is None:
        print('WARNING: no GPU backend found, falling back to CPU'); cy.device = 'CPU'
    else:
        for d in prefs.devices: d.use = (d.type == chosen) or d.type == 'CPU' and False
        cy.device = 'GPU'; print('Rendering on', chosen, [d.name for d in prefs.devices if d.use])
        if chosen == 'OPTIX':
            try: cy.denoiser = 'OPTIX'      # GPU denoiser: much faster than the CPU one
            except Exception: pass
else:
    cy.device = 'CPU'
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'AgX'
sc.view_settings.exposure = -0.9
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass

# world: dark brand charcoal + soft studio reflections
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
env = nt.nodes.new('ShaderNodeTexEnvironment')
hdr = os.path.join(bpy.utils.system_resource('DATAFILES'), 'studiolights', 'world', 'studio.exr')
env.image = bpy.data.images.load(hdr)
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 0.28
lp = nt.nodes.new('ShaderNodeLightPath')
bgdark = nt.nodes.new('ShaderNodeBackground'); bgdark.inputs['Color'].default_value = (0.012, 0.018, 0.015, 1)
mix = nt.nodes.new('ShaderNodeMixShader')
out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(env.outputs['Color'], bg.inputs['Color'])
nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
nt.links.new(bg.outputs['Background'], mix.inputs[1])
nt.links.new(bgdark.outputs['Background'], mix.inputs[2])
nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])

# ---- console
D = A.designs + '/cad/'
shell = import_stl(D + 'jeemu_monolithic_shell_black.stl', 'Shell')

def moulded_material():
    """Satin injection-moulded polymer: fine EDM-style stipple, low sheen, tight specular."""
    m = bpy.data.materials.new('MouldedBlack'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
    tc = N('ShaderNodeTexCoord'); mp = N('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1400, 1400, 1400)
    gr = N('ShaderNodeTexNoise'); gr.inputs['Scale'].default_value = 1.0; gr.inputs['Detail'].default_value = 2; gr.inputs['Roughness'].default_value = 0.6
    L(tc.outputs['Object'], mp.inputs['Vector']); L(mp.outputs['Vector'], gr.inputs['Vector'])
    bump = N('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.18; bump.inputs['Distance'].default_value = 0.00004
    L(gr.outputs['Fac'], bump.inputs['Height'])
    rr = N('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.5; rr.inputs['To Max'].default_value = 0.62
    L(gr.outputs['Fac'], rr.inputs['Value'])
    p = N('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = (0.011, 0.012, 0.013, 1)
    p.inputs['Specular IOR Level'].default_value = 0.1
    L(rr.outputs['Result'], p.inputs['Roughness']); L(bump.outputs['Normal'], p.inputs['Normal'])
    o = N('ShaderNodeOutputMaterial'); L(p.outputs['BSDF'], o.inputs['Surface'])
    return m
moulded = moulded_material()
shell.data.materials.append(moulded)
bev_s = shell.modifiers.new('Edge', 'BEVEL'); bev_s.width = 0.6 * MM; bev_s.segments = 3; bev_s.limit_method = 'ANGLE'; bev_s.angle_limit = math.radians(30)
bpy.context.view_layer.objects.active = shell; bpy.ops.object.modifier_apply(modifier='Edge')

inlay_mat = mat('InlayBone', (0.80, 0.82, 0.78), rough=0.36, emit=(0.0, 0.85, 0.49), emit_strength=0.0)
def split_plate_and_marks(o, is_mark):
    """slot 0 = plate (same moulded black as the baseplate), slot 1 = marks (white)."""
    o.data.materials.append(moulded); o.data.materials.append(inlay_mat)
    for p_ in o.data.polygons: p_.material_index = 1 if is_mark(p_.center) else 0
inl = import_stl(D + 'jeemu_monolithic_inlays_white.stl', 'Inlays')
split_plate_and_marks(inl, lambda c: ((abs(c.x) * 1 + c.z) - 94.5 * MM) / math.sqrt(2) > -0.75 * MM)   # letters stand 0.8 mm proud of the plate
logo = import_stl(D + 'jeemu_inlay_top_logo.stl', 'TopLogo')
split_plate_and_marks(logo, lambda c: c.z > 1.3 * MM and abs(c.x) < 28 * MM and abs(c.y) < 28 * MM)
logo.location = (0, 0, DECK_Z - 2 * MM + 0.0002)
for o in (shell, inl, logo):   # smooth the filleted corners, keep slope edges crisp
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(32))
    except Exception:
        for p_ in o.data.polygons: p_.use_smooth = False

# ---- display (slope on -Y face). centre 36.77 mm along the 45deg slant
S_MID = 36.77 * MM
sc_c = Vector((0, -(94.5 * MM) + S_MID * math.sqrt(.5), S_MID * math.sqrt(.5)))
sc_n = Vector((0, -math.sqrt(.5), math.sqrt(.5)))
sc_u = Vector((1, 0, 0))
sc_v = sc_n.cross(sc_u)  # up the slope
SW, SH = 68.5 * MM, 48.5 * MM
bpy.ops.mesh.primitive_plane_add(size=1)
screen = bpy.context.active_object; screen.name = 'Screen'
screen.dimensions = (SW, SH, 0)
rot = Matrix([[sc_u.x, sc_v.x, sc_n.x], [sc_u.y, sc_v.y, sc_n.y], [sc_u.z, sc_v.z, sc_n.z]])
screen.matrix_world = Matrix.Translation(sc_c - sc_n * 1.0 * MM) @ rot.to_4x4()
screen.dimensions = (SW, SH, 0)
sm = bpy.data.materials.new('ScreenMat'); sm.use_nodes = True
n = sm.node_tree.nodes; n.clear()
tex = n.new('ShaderNodeTexImage')
if A.screen_png and os.path.exists(A.screen_png):
    tex.image = bpy.data.images.load(A.screen_png); tex.interpolation = 'Closest'
em = n.new('ShaderNodeBsdfPrincipled')
em.inputs['Roughness'].default_value = 0.3; em.inputs['Specular IOR Level'].default_value = 0.0
em.inputs['Base Color'].default_value = (0, 0, 0, 1)

em.inputs['Emission Strength'].default_value = 2.0
uvn = sm.node_tree.nodes.new('ShaderNodeTexCoord'); sc2 = sm.node_tree.nodes.new('ShaderNodeVectorMath'); sc2.operation = 'MULTIPLY'
sc2.inputs[1].default_value = (320, 240, 1); sm.node_tree.links.new(uvn.outputs['UV'], sc2.inputs[0])
fr = sm.node_tree.nodes.new('ShaderNodeVectorMath'); fr.operation = 'FRACTION'; sm.node_tree.links.new(sc2.outputs[0], fr.inputs[0])
sx = sm.node_tree.nodes.new('ShaderNodeSeparateXYZ'); sm.node_tree.links.new(fr.outputs[0], sx.inputs[0])
def _m(op, a, b2=None):
    n_ = sm.node_tree.nodes.new('ShaderNodeMath'); n_.operation = op
    for k, v in ((0, a), (1, b2)):
        if v is None: continue
        if isinstance(v, (int, float)): n_.inputs[k].default_value = v
        else: sm.node_tree.links.new(v, n_.inputs[k])
    return n_.outputs[0]
ex = _m('MINIMUM', sx.outputs['X'], _m('SUBTRACT', 1.0, sx.outputs['X'])); ey = _m('MINIMUM', sx.outputs['Y'], _m('SUBTRACT', 1.0, sx.outputs['Y']))
edge = _m('MINIMUM', ex, ey)
pm = sm.node_tree.nodes.new('ShaderNodeMapRange'); pm.inputs['From Min'].default_value = 0.02; pm.inputs['From Max'].default_value = 0.2
pm.inputs['To Min'].default_value = 0.72; pm.inputs['To Max'].default_value = 1.0; pm.clamp = True; sm.node_tree.links.new(edge, pm.inputs['Value'])
mulc = sm.node_tree.nodes.new('ShaderNodeMix'); mulc.data_type = 'RGBA'; mulc.blend_type = 'MULTIPLY'; mulc.inputs['Factor'].default_value = 1.0
sm.node_tree.links.new(tex.outputs['Color'], mulc.inputs[6])
gm = sm.node_tree.nodes.new('ShaderNodeCombineXYZ'); [sm.node_tree.links.new(pm.outputs['Result'], gm.inputs[k]) for k in range(3)]
sm.node_tree.links.new(gm.outputs[0], mulc.inputs[7])
sm.node_tree.links.new(mulc.outputs[2], em.inputs['Emission Color'])
o = n.new('ShaderNodeOutputMaterial'); sm.node_tree.links.new(em.outputs['BSDF'], o.inputs['Surface'])
screen.data.materials.append(sm)
sc_corners = [sc_c + sc_u * (sx * SW / 2) + sc_v * (sy * SH / 2) for sx, sy in ((-1, 1), (1, 1), (1, -1), (-1, -1))]

# ---- table
bpy.ops.mesh.primitive_plane_add(size=40)
table = bpy.context.active_object; table.name = 'Table'
table.is_shadow_catcher = True
table.data.materials.append(mat('Table', (0.007, 0.010, 0.009), rough=0.95, coat=0.0))

# ---- wood block (shared mesh) + engraved wordmark
def wood_material():
    """Solid (3D) beech: growth rings from a virtual log, so every face -- incl. end grain --
    is consistent. Each block is cut from a different spot in the log (Object Info random)."""
    m = bpy.data.materials.new('Beech'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
    def math(op, a=None, b_=None, clamp=False):
        n_ = N('ShaderNodeMath'); n_.operation = op; n_.use_clamp = clamp
        for k, v in ((0, a), (1, b_)):
            if v is None: continue
            if isinstance(v, (int, float)): n_.inputs[k].default_value = v
            else: L(v, n_.inputs[k])
        return n_.outputs[0]
    tc = N('ShaderNodeTexCoord'); oi = N('ShaderNodeObjectInfo')
    sep = N('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sep.inputs['Vector'])
    X, Y, Z = sep.outputs
    r = oi.outputs['Random']
    r2 = math('FRACT', math('MULTIPLY', r, 7.13)); r3 = math('FRACT', math('MULTIPLY', r, 13.77)); r4 = math('FRACT', math('MULTIPLY', r, 3.31))
    y0 = math('ADD', 0.03, math('MULTIPLY', r2, 0.10))                    # log axis offset (m)
    z0 = math('MULTIPLY', math('SUBTRACT', r3, 0.5), 0.10)
    x0 = math('MULTIPLY', r4, 0.30)                                       # position along the log
    # slow wander (domain warp) so rings are never perfect arcs
    wv = N('ShaderNodeCombineXYZ'); L(math('ADD', X, x0), wv.inputs['X']); L(Y, wv.inputs['Y']); L(Z, wv.inputs['Z'])
    warp = N('ShaderNodeTexNoise'); warp.inputs['Scale'].default_value = 22; warp.inputs['Detail'].default_value = 3; L(wv.outputs[0], warp.inputs['Vector'])
    tilt = math('MULTIPLY', math('ADD', X, x0), 0.045)                    # log not perfectly parallel to the block
    dy = math('ADD', math('SUBTRACT', Y, y0), tilt)
    dz = math('SUBTRACT', Z, z0)
    rad = math('SQRT', math('ADD', math('MULTIPLY', dy, dy), math('MULTIPLY', dz, dz)))
    phase = math('ADD', math('MULTIPLY', rad, 520), math('MULTIPLY', warp.outputs['Fac'], 2.2))
    saw = math('FRACT', phase)
    late = math('POWER', saw, 3.2)                                        # earlywood -> latewood, abrupt ring edge
    # fine fibres along X
    fv = N('ShaderNodeCombineXYZ'); L(math('MULTIPLY', X, 9), fv.inputs['X']); L(math('MULTIPLY', Y, 700), fv.inputs['Y']); L(math('MULTIPLY', Z, 700), fv.inputs['Z'])
    fib = N('ShaderNodeTexNoise'); fib.inputs['Scale'].default_value = 1.0; fib.inputs['Detail'].default_value = 5; fib.inputs['Roughness'].default_value = 0.65
    L(fv.outputs[0], fib.inputs['Vector'])
    fv2 = N('ShaderNodeCombineXYZ'); L(math('MULTIPLY', X, 40), fv2.inputs['X']); L(math('MULTIPLY', Y, 180), fv2.inputs['Y']); L(math('MULTIPLY', Z, 180), fv2.inputs['Z'])
    fib2 = N('ShaderNodeTexNoise'); fib2.inputs['Scale'].default_value = 1.0; fib2.inputs['Detail'].default_value = 3; L(fv2.outputs[0], fib2.inputs['Vector'])
    t = math('ADD', math('MULTIPLY', late, 0.42), math('ADD', math('MULTIPLY', fib.outputs['Fac'], 0.30), math('MULTIPLY', fib2.outputs['Fac'], 0.14)))
    ramp = N('ShaderNodeValToRGB'); L(t, ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.30; ramp.color_ramp.elements[1].position = 0.80
    ramp.color_ramp.elements[0].color = (0.47, 0.31, 0.17, 1); ramp.color_ramp.elements[1].color = (0.29, 0.17, 0.085, 1)
    tr = N('ShaderNodeValToRGB'); L(r, tr.inputs['Fac'])
    tr.color_ramp.elements[0].color = (0.80, 0.76, 0.72, 1); tr.color_ramp.elements[1].color = (1.12, 1.07, 1.0, 1)
    tone = N('ShaderNodeMixRGB'); tone.blend_type = 'MULTIPLY'; tone.inputs['Fac'].default_value = 1
    L(ramp.outputs['Color'], tone.inputs['Color1']); L(tr.outputs['Color'], tone.inputs['Color2'])
    # ---- per-block character: hue drift + occasional mineral streak
    hue = N('ShaderNodeMixRGB'); hue.blend_type = 'MULTIPLY'; hue.inputs['Fac'].default_value = 1
    hr = N('ShaderNodeValToRGB'); L(r3, hr.inputs['Fac'])
    hr.color_ramp.elements[0].color = (1.0, 0.93, 0.82, 1); hr.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1)   # some blocks lean golden, some pinker
    L(tone.outputs['Color'], hue.inputs['Color1']); L(hr.outputs['Color'], hue.inputs['Color2'])
    sv = N('ShaderNodeCombineXYZ'); L(math('MULTIPLY', X, 6), sv.inputs['X']); L(math('MULTIPLY', Y, 90), sv.inputs['Y']); L(math('MULTIPLY', Z, 90), sv.inputs['Z'])
    sn = N('ShaderNodeTexNoise'); sn.inputs['Scale'].default_value = 1.0; sn.inputs['Detail'].default_value = 2; L(sv.outputs[0], sn.inputs['Vector'])
    ss = N('ShaderNodeMapRange'); ss.inputs['From Min'].default_value = 0.58; ss.inputs['From Max'].default_value = 0.72; ss.inputs['To Min'].default_value = 1.0; ss.inputs['To Max'].default_value = 0.72
    L(sn.outputs['Fac'], ss.inputs['Value'])
    gate = math('GREATER_THAN', r4, 0.62)                                     # ~1 in 3 blocks carry a streak
    sfac = math('ADD', math('MULTIPLY', gate, math('SUBTRACT', ss.outputs['Result'], 1.0)), 1.0)
    streak = N('ShaderNodeMixRGB'); streak.blend_type = 'MULTIPLY'; streak.inputs['Fac'].default_value = 1
    sc_ = N('ShaderNodeCombineColor'); [L(sfac, sc_.inputs[i]) for i in range(3)]
    L(hue.outputs['Color'], streak.inputs['Color1']); L(sc_.outputs[0], streak.inputs['Color2'])
    # ---- wear: worn edges (raw wood shows), fine scratches, tiny dings
    bev = N('ShaderNodeBevel'); bev.inputs['Radius'].default_value = 0.0012; bev.samples = 6
    geo = N('ShaderNodeNewGeometry')
    dt = N('ShaderNodeVectorMath'); dt.operation = 'DOT_PRODUCT'; L(bev.outputs['Normal'], dt.inputs[0]); L(geo.outputs['Normal'], dt.inputs[1])
    em_ = N('ShaderNodeMapRange'); em_.inputs['From Min'].default_value = 1.0; em_.inputs['From Max'].default_value = 0.82; em_.clamp = True
    L(dt.outputs['Value'], em_.inputs['Value'])
    en = N('ShaderNodeTexNoise'); en.inputs['Scale'].default_value = 380; en.inputs['Detail'].default_value = 4; L(tc.outputs['Object'], en.inputs['Vector'])
    ebreak = math('MULTIPLY', em_.outputs['Result'], math('MULTIPLY', en.outputs['Fac'], 1.9))                # patchy, not uniform
    edge = math('MINIMUM', ebreak, 1.0)
    # scratches: very thin stretched noise, random per block orientation via swapped axes
    scv = N('ShaderNodeCombineXYZ'); L(math('MULTIPLY', X, 500), scv.inputs['X']); L(math('MULTIPLY', Y, 14), scv.inputs['Y']); L(math('MULTIPLY', Z, 600), scv.inputs['Z'])
    scn = N('ShaderNodeTexNoise'); scn.inputs['Scale'].default_value = 1.0; scn.inputs['Detail'].default_value = 3; L(scv.outputs[0], scn.inputs['Vector'])
    scm = N('ShaderNodeMapRange'); scm.inputs['From Min'].default_value = 0.57; scm.inputs['From Max'].default_value = 0.60; scm.clamp = True; L(scn.outputs['Fac'], scm.inputs['Value'])
    sg = N('ShaderNodeTexNoise'); sg.inputs['Scale'].default_value = 18; L(tc.outputs['Object'], sg.inputs['Vector'])
    sgm = N('ShaderNodeMapRange'); sgm.inputs['From Min'].default_value = 0.60; sgm.inputs['From Max'].default_value = 0.66; sgm.clamp = True; L(sg.outputs['Fac'], sgm.inputs['Value'])
    scr = math('MULTIPLY', math('MULTIPLY', scm.outputs['Result'], sgm.outputs['Result']), 0.5)   # a few sparse scuffs, never a lattice
    dv = N('ShaderNodeTexVoronoi'); dv.inputs['Scale'].default_value = 900; dv.feature = 'F1'; L(tc.outputs['Object'], dv.inputs['Vector'])
    dm = N('ShaderNodeMapRange'); dm.inputs['From Min'].default_value = 0.08; dm.inputs['From Max'].default_value = 0.0; dm.clamp = True; L(dv.outputs['Distance'], dm.inputs['Value'])
    dgate = N('ShaderNodeTexNoise'); dgate.inputs['Scale'].default_value = 60; L(tc.outputs['Object'], dgate.inputs['Vector'])
    dgm = N('ShaderNodeMapRange'); dgm.inputs['From Min'].default_value = 0.62; dgm.inputs['From Max'].default_value = 0.68; dgm.clamp = True; L(dgate.outputs['Fac'], dgm.inputs['Value'])
    ding = math('MULTIPLY', dm.outputs['Result'], dgm.outputs['Result'])                                         # dents only in a few places
    raw = N('ShaderNodeMixRGB'); raw.blend_type = 'MULTIPLY'; raw.inputs['Fac'].default_value = 1
    rc = N('ShaderNodeCombineColor'); [L(math('ADD', 1.0, math('MULTIPLY', edge, 0.30)), rc.inputs[i]) for i in range(3)]
    L(streak.outputs['Color'], raw.inputs['Color1']); L(rc.outputs[0], raw.inputs['Color2'])                    # worn edges read lighter
    dark = N('ShaderNodeMixRGB'); dark.blend_type = 'MULTIPLY'; dark.inputs['Fac'].default_value = 1
    dcv = N('ShaderNodeCombineColor'); [L(math('SUBTRACT', 1.0, math('ADD', math('MULTIPLY', ding, 0.35), math('MULTIPLY', scr, 0.08))), dcv.inputs[i]) for i in range(3)]
    L(raw.outputs['Color'], dark.inputs['Color1']); L(dcv.outputs[0], dark.inputs['Color2'])
    b = N('ShaderNodeBsdfPrincipled')
    b.inputs['Coat Weight'].default_value = 0.18; b.inputs['Coat Roughness'].default_value = 0.3
    b.inputs['Specular IOR Level'].default_value = 0.4
    b.inputs['Subsurface Weight'].default_value = 0.03; b.inputs['Subsurface Radius'].default_value = (0.0015, 0.0008, 0.0004)
    rm = N('ShaderNodeMapRange'); rm.inputs['To Min'].default_value = 0.36; rm.inputs['To Max'].default_value = 0.52; L(t, rm.inputs['Value'])
    L(math('ADD', rm.outputs['Result'], math('MULTIPLY', edge, 0.25)), b.inputs['Roughness'])                  # worn edges lose their sheen
    cw = math('MULTIPLY', math('SUBTRACT', 1.0, edge), 0.18); L(cw, b.inputs['Coat Weight'])
    bump = N('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.30; bump.inputs['Distance'].default_value = 0.00010
    L(math('SUBTRACT', math('ADD', math('MULTIPLY', fib.outputs['Fac'], 0.6), math('MULTIPLY', late, 0.4)), math('ADD', math('MULTIPLY', ding, 2.5), math('MULTIPLY', scr, 1.2))), bump.inputs['Height'])
    L(bump.outputs['Normal'], b.inputs['Normal']); L(dark.outputs['Color'], b.inputs['Base Color'])
    out = N('ShaderNodeOutputMaterial'); L(b.outputs['BSDF'], out.inputs['Surface'])
    return m
wood = wood_material()

bpy.ops.mesh.primitive_cube_add(size=1)
proto = bpy.context.active_object; proto.name = 'BlockProto'
proto.dimensions = (BL, BW, BH); bpy.ops.object.transform_apply(scale=True)
bev = proto.modifiers.new('Bevel', 'BEVEL'); bev.width = 1.0 * MM; bev.segments = 4; bev.limit_method = 'ANGLE'
bpy.ops.object.modifier_apply(modifier='Bevel')
for p in proto.data.polygons: p.use_smooth = True
proto.data.materials.append(wood)
block_mesh = proto.data
bpy.data.objects.remove(proto)  # keep mesh datablock only

font = bpy.data.fonts.load(A.designs + '/cad/fonts/Combo-Regular.ttf')   # official wordmark font (CAD v5.3)
bpy.ops.object.text_add()
tx = bpy.context.active_object; tx.data.body = 'Jeemu'; tx.data.font = font
tx.data.size = 0.0083; tx.data.align_x = 'CENTER'; tx.data.align_y = 'CENTER'
tx.data.extrude = 0.00009
bpy.ops.object.convert(target='MESH')
word_mesh = tx.data; bpy.data.objects.remove(tx)
word_mesh.materials.append(mat('Brand', (0.012, 0.014, 0.013), rough=0.3, coat=0.5))

blocks = []
rnd = random.Random(SEED)
S = A.sloppiness
def tr(sigma, lim=2.2):                        # truncated gaussian: human error without absurd outliers
    return max(-lim * sigma, min(lim * sigma, rnd.gauss(0, sigma)))
lean = (tr(0.0035 * S), tr(0.0035 * S))        # whole tower leans ~0.2 deg
z_base = DECK_Z
k = 0
for L in range(LAYERS):
    along_x = (L % 2 == 0)
    layer_yaw = tr(0.0065 * S)                 # each layer is set down a little twisted (~0.4 deg)
    layer_sh = Vector((tr(0.0009 * S), tr(0.0009 * S)))
    layer_h = BH + abs(tr(0.00010 * S)) + 0.00003
    gl, gr = 0.0009 + abs(tr(0.0004 * S)), 0.0009 + abs(tr(0.0004 * S))   # uneven gaps (>= 0.9 mm: no interpenetration)
    for j in range(PER):
        ob = bpy.data.objects.new(f'Block{k:02d}', block_mesh); sc.collection.objects.link(ob)
        ob.scale = (1 + tr(0.0015 * S), 1 + tr(0.0015 * S), 1 + tr(0.0012 * S))   # block-to-block size tolerance
        for sgn, rot in ((-1, (math.pi / 2, 0, 0)), (1, (math.pi / 2, 0, math.pi))):   # "Jeemu" on both long sides
            wd = bpy.data.objects.new(f'Word{k:02d}{"ab"[sgn > 0]}', word_mesh); sc.collection.objects.link(wd)
            wd.parent = ob; wd.location = (tr(0.0008), sgn * (BW / 2 - 0.00004), tr(0.0003)); wd.rotation_euler = rot
        cross = (-(BW + gl), tr(0.0003 * S), (BW + gr))[j]
        along = tr(0.0016 * S)                                              # shifted along its length
        if rnd.random() < 0.16 * min(S, 1.5):                               # the odd block is left sticking out
            along += rnd.choice([-1, 1]) * rnd.uniform(0.003, 0.0065) * S
        pos2 = Vector((along, cross)) if along_x else Vector((cross, along))
        c, s_ = math.cos(layer_yaw), math.sin(layer_yaw)
        pos2 = Vector((pos2.x * c - pos2.y * s_, pos2.x * s_ + pos2.y * c)) + layer_sh
        z = z_base + layer_h / 2
        fp = Vector((pos2.x + lean[0] * (z - DECK_Z), pos2.y + lean[1] * (z - DECK_Z), z))
        yaw = (0 if along_x else math.pi / 2) + layer_yaw + tr(0.0075 * S)
        fr = Euler((tr(0.0015 * S), tr(0.0015 * S), yaw))
        blocks.append(dict(ob=ob, k=k, L=L, j=j, fp=fp, fq=fr.to_quaternion(),
                           start=40 + L * 3.3 + j * 1.1, dur=15 + rnd.uniform(0, 3),   # the last block has landed and settled well before the 4.4 s stop
                           off=Vector((rnd.uniform(-.03, .03), rnd.uniform(-.03, .03), 1.5 + rnd.uniform(0, .3))),   # starts well above the top of every shot, so blocks always fall INTO view
                           rq=Euler((rnd.uniform(-.7, .7), rnd.uniform(-.7, .7), rnd.uniform(-1.2, 1.2))).to_quaternion(),
                           rest=0))
        k += 1
    z_base += layer_h
PULL_L, PULL_J = 8, 1
pull = next(b for b in blocks if b['L'] == PULL_L and b['j'] == PULL_J)

# ---- tap pose on +X wall badge
wn = Vector((math.sqrt(.5), 0, math.sqrt(.5)))
badge_c = Vector((94.5 * MM - 25 * MM, 0, 25 * MM))
tap_x, tap_y = Vector((0, 1, 0)), Vector((-wn.z, 0, wn.x))
tap_q = Matrix([[tap_x.x, tap_y.x, wn.x], [tap_x.y, tap_y.y, wn.y], [tap_x.z, tap_y.z, wn.z]]).to_quaternion()
def tap_pos(gap): return badge_c + wn * (BH / 2 + gap)

# ---- timeline (seconds)
# Stops the page pauses on: frame 0 (screen close-up), hero_end 4.4 s (tower built, whole product), total 13.2 s (screen close-up). Everything between plays straight through.
T = dict(fall_end=3.7, hero_end=4.4, pull_end=7.0, carry_end=9.0, tap_end=9.9, lift_end=10.6, screen_end=12.6, total=13.2)
TAP_TIME = T['carry_end'] + (T['tap_end'] - T['carry_end']) * 0.5       # moment the block touches the wordmark
RESTS = [T['hero_end'], T['total']]
TOTAL = int(round(T['total'] * FPS))

def pull_pose(t):
    """returns (pos, quat) of the pulled block, or None if still part of the tower"""
    f = pull
    t0 = T['hero_end']
    if t < t0: return None
    p0, q0 = f['fp'], f['fq']
    slide_end = lerp(t0, T['pull_end'], 0.55)
    if t < T['pull_end']:
        s = smooth((t - t0) / (slide_end - t0)) if t < slide_end else 1
        lift = smooth((t - slide_end) / (T['pull_end'] - slide_end)) if t > slide_end else 0
        return p0 + Vector((s * (BL + 0.02), 0, lift * 0.035)), q0
    pa = p0 + Vector((BL + 0.02, 0, 0.035)); qa = q0
    hover = tap_pos(0.030)
    if t < T['carry_end']:
        u = smooth((t - T['pull_end']) / (T['carry_end'] - T['pull_end']))
        ctrl = Vector((pa.x + 0.10, 0.0, max(pa.z, hover.z) + 0.05))
        pos = (1 - u) ** 2 * pa + 2 * u * (1 - u) * ctrl + u * u * hover
        return pos, qa.slerp(tap_q, smooth(u * 1.15))
    if t < T['tap_end']:
        u = (t - T['carry_end']) / (T['tap_end'] - T['carry_end'])
        gap = 0.030 * (1 - ease_out(u * 2)) if u < .5 else 0.0003 + 0.03 * smooth((u - .5) * 2)
        return tap_pos(gap), tap_q
    u = smooth((t - T['tap_end']) / (T['lift_end'] - T['tap_end']))
    return tap_pos(0.030) + wn * (0.45 * u) + Vector((0, 0, 0.30 * u * u)), tap_q   # away from the wall and out of the shot before the zoom-in lands

def tap_glow(t):
    d = t - TAP_TIME
    return clamp01(1 - abs(d) / 0.35) if d < 0 else clamp01(math.exp(-d * 2.3))

def pose_blocks(t):
    fr = t * FPS
    for b in blocks:
        ob = b['ob']
        for ch in ob.children: ch.hide_render = ob.hide_render
        if b is pull:
            pp = pull_pose(t)
            if pp: ob.location, ob.rotation_quaternion = pp[0], pp[1]; ob.rotation_mode = 'QUATERNION'; continue
        s = (fr - b['start']) / b['dur']
        ob.rotation_mode = 'QUATERNION'
        if s <= 0:
            ob.location = b['fp'] + b['off']; ob.rotation_quaternion = b['rq'] @ b['fq']; ob.hide_render = True; ob.hide_viewport = True
            for ch in ob.children: ch.hide_render = True
            continue
        ob.hide_render = False; ob.hide_viewport = False
        for ch in ob.children: ch.hide_render = False
        if s < 1:
            z = ease_in(s); ob.location = b['fp'] + b['off'] * (1 - z) * Vector((.6, .6, 1)) * 1 + Vector((0, 0, 0))
            ob.location.x = lerp(b['fp'].x + b['off'].x, b['fp'].x, ease_out(s)); ob.location.y = lerp(b['fp'].y + b['off'].y, b['fp'].y, ease_out(s))
            ob.location.z = b['fp'].z + b['off'].z * (1 - z)
            ob.rotation_quaternion = (b['rq']).slerp(Quaternion((1, 0, 0, 0)), ease_out(s)) @ b['fq']
        else:
            d = (fr - b['start'] - b['dur'])
            bounce = 0.0016 * math.exp(-d / 3.0) * abs(math.sin(d * 0.9)) if d < 22 else 0
            ob.location = b['fp'] + Vector((0, 0, bounce)); ob.rotation_quaternion = b['fq']

# ---- camera + lights
cam_d = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
cam_d.sensor_width = 36; cam_d.dof.use_dof = True
cam_d.shift_x = 0.0
cam_d.shift_y = 0.0
focus = bpy.data.objects.new('Focus', None); sc.collection.objects.link(focus); cam_d.dof.focus_object = focus
TOWER_TOP = DECK_Z + BH * LAYERS
V = Vector
T2 = (sc_c + badge_c) / 2                       # midpoint of the screen and the wordmark badge: both stay in frame for the tap
TWO = Vector((0.31, -0.33, 0.19))
D_CLOSE = 0.13 if A.portrait else 0.17            # camera distance from the screen for the close-ups (the screen fills most of the frame)
KEYS = [  # time, cam pos, target, focal mm, f-stop, stop(=rest: zero velocity)
    (0.0, sc_c + sc_n * D_CLOSE, sc_c, 50, 8, True),   # opens on the screen close-up
    (2.4, V((-0.78, -0.96, 0.52)) * 0.84 + V((0, 0, 0.18)) * 0.16, V((0, 0, 0.18)), 42, 8, False),   # fully pulled back before the blocks start to fall
    (T['hero_end'], V((-0.72, -0.89, 0.48)) * 0.84 + V((0.005, 0, 0.18)) * 0.16, V((0.005, 0, 0.18)), 44, 8, True),
    (T['pull_end'], V((0.10, -0.80, 0.38)), V((0.05, 0, 0.19)), 50, 5.6, False),
    (8.1, V((0.28, -0.52, 0.30)), V((0.05, -0.01, 0.11)), 52, 5.6, False),
    (T['carry_end'], T2 + TWO * (1.3 if A.portrait else 1.7), T2, 55, 5.6, False),
    (T['tap_end'], T2 + TWO * (1.25 if A.portrait else 1.62), T2, 57, 5.6, False),
    (T['lift_end'], T2 + TWO * (1.24 if A.portrait else 1.6), T2, 56, 5.6, False),
    (T['screen_end'], sc_c + sc_n * (D_CLOSE + 0.07), sc_c, 50, 6.3, False),
    (T['total'], sc_c + sc_n * D_CLOSE, sc_c, 50, 8, True),
]
if A.portrait:
    cam_d.sensor_fit = 'HORIZONTAL'       # keep the landscape horizontal field of view; the extra height shows more tower
    pull_in = [1.0, 0.42, 0.45, 0.65, 0.85, 1.0, 1.0, 1.0, 1.0, 1.0]
    lift = [0, 0.05, 0.04, 0.02, 0, 0, 0, 0, 0, 0]
    KEYS = [(t_, tg + (p_ - tg) * f_ + V((0, 0, l_)), tg + V((0, 0, l_)), fl_, fs_, st_) for (t_, p_, tg, fl_, fs_, st_), f_, l_ in zip(KEYS, pull_in, lift)]
def _tangent(i, comp):
    """Catmull-Rom style velocity at key i (per second); zero at rests so the camera settles there."""
    zero = KEYS[i][comp] * 0.0
    if KEYS[i][5]: return zero
    a, c = KEYS[max(i - 1, 0)], KEYS[min(i + 1, len(KEYS) - 1)]
    dt = c[0] - a[0]
    return (c[comp] - a[comp]) / dt if dt else zero
def cam_pose(t):
    t = max(KEYS[0][0], min(KEYS[-1][0], t))
    for i in range(len(KEYS) - 1):
        a, c = KEYS[i], KEYS[i + 1]
        if t <= c[0]:
            h = c[0] - a[0]; u = (t - a[0]) / h
            h00, h10, h01, h11 = 2*u**3 - 3*u**2 + 1, u**3 - 2*u**2 + u, -2*u**3 + 3*u**2, u**3 - u**2
            out = []
            for comp in (1, 2, 3, 4):
                p0, p1 = a[comp], c[comp]; m0, m1 = _tangent(i, comp), _tangent(i + 1, comp)
                out.append(p0 * h00 + m0 * h * h10 + p1 * h01 + m1 * h * h11)
            return out[0], out[1], out[2], max(1.2, out[3])

key = bpy.data.lights.new('Key', 'AREA'); key.shape = 'RECTANGLE'; key.size = 0.9; key.size_y = 0.6; key.spread = math.radians(100)
key.energy = 26; key.color = (1.0, 0.90, 0.78)
ko = bpy.data.objects.new('Key', key); sc.collection.objects.link(ko); ko.location = (-0.9, -0.35, 0.8)
rim = bpy.data.lights.new('Rim', 'AREA'); rim.shape = 'RECTANGLE'; rim.size = 0.12; rim.size_y = 0.9; rim.energy = 16; rim.color = (0.85, 0.95, 1.0)
ro = bpy.data.objects.new('Rim', rim); sc.collection.objects.link(ro); ro.location = (0.55, 0.45, 0.55)
fill = bpy.data.lights.new('Fill', 'AREA'); fill.size = 1.0; fill.size_y = 0.5; fill.energy = 5; fill.color = (0.9, 0.95, 1.0)
fo = bpy.data.objects.new('Fill', fill); sc.collection.objects.link(fo); fo.location = (0.7, -0.6, 0.35)
tap_l = bpy.data.lights.new('TapGlow', 'POINT'); tap_l.color = (0.0, 1.0, 0.55); tap_l.energy = 0; tap_l.shadow_soft_size = 0.02
tlo = bpy.data.objects.new('TapGlow', tap_l); sc.collection.objects.link(tlo); tlo.location = badge_c + wn * 0.02
for ob_, tgt in ((ko, V((0, 0, .15))), (ro, V((0, 0, .15))), (fo, V((0, 0, .1)))):
    c = ob_.constraints.new('TRACK_TO'); c.target = focus; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
cc = cam.constraints.new('TRACK_TO'); cc.target = focus; cc.track_axis = 'TRACK_NEGATIVE_Z'; cc.up_axis = 'UP_Y'
focus_lookup = {}

os.makedirs(A.out, exist_ok=True)
manifest = {}
def set_time(f):
    t = f / FPS
    pose_blocks(t)
    p, tg, fl, fs = cam_pose(t)
    cam.location = p; focus.location = tg; cam_d.lens = fl; cam_d.dof.aperture_fstop = fs
    g = tap_glow(t)
    inlay_mat.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = g * 3.5
    tap_l.energy = g * 0.03
    bpy.context.view_layer.update()

frames = [int(x) for x in A.frames.split(',')] if A.frames != 'all' else list(range(0, TOTAL, max(1, A.step)))
for n_, f in enumerate(frames):
    set_time(f)
    sc.render.filepath = os.path.join(A.out, f'{f:04d}.png')
    cs = [world_to_camera_view(sc, cam, c) for c in sc_corners]
    manifest[f] = [[round(c.x * A.width, 2), round((1 - c.y) * A.height, 2)] for c in cs]
    if os.path.exists(sc.render.filepath) and os.path.getsize(sc.render.filepath) > 0:
        print(f'skip {f} (already rendered)  [{n_ + 1}/{len(frames)}]', flush=True); continue   # lets an interrupted run resume
    bpy.ops.render.render(write_still=True)
    print(f'rendered {f}  [{n_ + 1}/{len(frames)}]', flush=True)
json.dump(dict(fps=FPS, total=TOTAL, width=A.width, height=A.height, screen=manifest, timeline=T,
               rests=[min(TOTAL - 1, round(r * FPS)) for r in RESTS], tapFrame=round(TAP_TIME * FPS)),
          open(os.path.join(A.out, 'screen_%s.json' % frames[0]), 'w'))
if A.save_blend:
    set_time(frames[0]); bpy.ops.wm.save_as_mainfile(filepath=A.save_blend)
