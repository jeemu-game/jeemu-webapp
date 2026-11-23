"""A linear fireplace fire, procedural (no simulation): a row of flame tongues rising off a long burner, made from
animated noise in a glowing volume, rendered on black for the site to lay into the firebox.
(Blender's Mantaflow fire is the other route, fire_sim.py, but it doesn't run in the pip build of bpy.)

  python fire_proc.py -- --out out/fire_proc --frames 120 --width 640 --height 256 --samples 32 [--only 1 30] [--gpu]
The loop: every noise moves along a circle in its 4th dimension, so frame N+1 == frame 1 (seamless, no crossfade).
"""
import argparse, math, os, sys
import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='out/fire_proc'); ap.add_argument('--frames', type=int, default=120)
ap.add_argument('--width', type=int, default=640); ap.add_argument('--height', type=int, default=256)
ap.add_argument('--samples', type=int, default=32); ap.add_argument('--gpu', action='store_true')
ap.add_argument('--only', type=int, nargs='*', default=None)
A = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# the flame volume: as wide as the firebox mouth, shallow, tall enough for the tallest tongues
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.25))
vol = bpy.context.active_object; vol.name = 'FireVolume'; vol.scale = (1.22, 0.14, 0.5)
bpy.ops.object.transform_apply(scale=True)

m = bpy.data.materials.new('Fire'); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
for n in list(N): N.remove(n)
out = N.new('ShaderNodeOutputMaterial')
pv = N.new('ShaderNodeVolumePrincipled'); L(pv.outputs[0], out.inputs['Volume'])
pv.inputs['Density'].default_value = 0.0

tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sep.inputs[0])
# loop phase: a value that goes once round a circle over the animation (drivers set it per frame)
phase = N.new('ShaderNodeValue'); phase.name = 'Phase'
def math_(op, a=None, b=None, va=None, vb=None):
    n = N.new('ShaderNodeMath'); n.operation = op
    if a is not None: L(a, n.inputs[0])
    elif va is not None: n.inputs[0].default_value = va
    if b is not None: L(b, n.inputs[1])
    elif vb is not None: n.inputs[1].default_value = vb
    return n.outputs[0]
cosw = math_('MULTIPLY', math_('COSINE', phase.outputs[0]), vb=0.9)
sinw = math_('MULTIPLY', math_('SINE', phase.outputs[0]), vb=0.9)

def noise4(x, y, z, w, scale, detail=3, rough=0.55):
    cv = N.new('ShaderNodeCombineXYZ'); L(x, cv.inputs[0]); L(y, cv.inputs[1]); L(z, cv.inputs[2])
    t = N.new('ShaderNodeTexNoise'); t.noise_dimensions = '4D'; t.inputs['Scale'].default_value = scale
    t.inputs['Detail'].default_value = detail; t.inputs['Roughness'].default_value = rough
    L(cv.outputs[0], t.inputs['Vector']); L(w, t.inputs['W'])
    return t.outputs['Fac']

X, Y, Z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
# rising motion: sample the noise lower down as time goes on (z - rise), done on the loop circle
zr = math_('SUBTRACT', Z, math_('MULTIPLY', sinw, vb=0.35))
w1 = math_('ADD', cosw, vb=3.0)
turb = noise4(math_('MULTIPLY', X, vb=1.6), Y, math_('MULTIPLY', zr, vb=0.45), w1, 5.0, detail=5)                                       # big licking shapes
fine = noise4(math_('MULTIPLY', X, vb=4.0), Y, math_('MULTIPLY', zr, vb=0.9), math_('ADD', sinw, vb=7.0), 10.0, detail=3)
# tongues: a wavy height limit along the burner, different everywhere and always moving
tongue = noise4(math_('MULTIPLY', X, vb=1.8), Y, math_('MULTIPLY', cosw, vb=0.3), math_('ADD', sinw, vb=11.0), 7.0, detail=3)
height = math_('ADD', math_('MULTIPLY', math_('POWER', tongue, vb=2.2), vb=0.9), vb=0.03)              # 0.04 .. 0.46 m tall
# shape: dense near the burner, thinning upward, pinched front-to-back, ragged edges from the noise
up = math_('DIVIDE', Z, height)
body = math_('SUBTRACT', math_('SUBTRACT', va=1.0, b=up), math_('MULTIPLY', math_('SUBTRACT', turb, vb=0.5), vb=2.6))
depth = math_('SUBTRACT', va=1.0, b=math_('ABSOLUTE', math_('MULTIPLY', Y, vb=14.0)))
shape = math_('MULTIPLY', math_('MAXIMUM', body, vb=0.0), math_('MAXIMUM', depth, vb=0.0))
shape = math_('MULTIPLY', shape, math_('ADD', math_('MULTIPLY', fine, vb=0.7), vb=0.65))
shape = math_('POWER', math_('MAXIMUM', math_('SUBTRACT', shape, vb=0.08), vb=0.0), vb=0.9)   # crisp edges
# colour: hottest low down and in the cores; blackbody-ish ramp from deep red to pale yellow
heat = math_('MULTIPLY', shape, math_('SUBTRACT', va=1.25, b=math_('MULTIPLY', up, vb=0.6)))
ramp = N.new('ShaderNodeValToRGB'); L(heat, ramp.inputs['Fac']); e = ramp.color_ramp.elements
e[0].position = 0.0; e[0].color = (0, 0, 0, 1); e[1].position = 1.0; e[1].color = (1.0, 0.92, 0.65, 1)
e[1].color = (1.0, 0.78, 0.38, 1)
for pos, col in ((0.10, (0.30, 0.02, 0.0, 1)), (0.30, (0.95, 0.16, 0.01, 1)), (0.55, (1.0, 0.38, 0.04, 1)), (0.8, (1.0, 0.58, 0.14, 1))):
    el = e.new(pos); el.color = col
L(ramp.outputs['Color'], pv.inputs['Emission Color'])
L(math_('MULTIPLY', heat, vb=18.0), pv.inputs['Emission Strength'])
vol.data.materials.append(m)

# drive the loop phase from the frame: 2*pi over the animation
fc = phase.outputs[0].driver_add('default_value'); fc.driver.expression = f'(frame - 1) / {A.frames} * 2 * pi'

cam_data = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, -3.0, 0.25); cam.rotation_euler = (math.radians(90), 0, 0); cam_data.type = 'ORTHO'; cam_data.ortho_scale = 1.24
r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = A.width, A.height
w = bpy.data.worlds.new('Black'); sc.world = w; w.use_nodes = True
for n in w.node_tree.nodes:
    if n.type == 'BACKGROUND': n.inputs['Color'].default_value = (0, 0, 0, 1); n.inputs['Strength'].default_value = 0.0
cy = sc.cycles; cy.samples = A.samples; cy.use_denoising = True; cy.volume_bounces = 0; cy.volume_step_rate = 0.4; cy.volume_max_steps = 256
if A.gpu:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for t in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
        try: prefs.compute_device_type = t; prefs.get_devices(); break
        except Exception: pass
    for d in prefs.devices: d.use = d.type != 'CPU'
    cy.device = 'GPU'
sc.view_settings.view_transform = 'Standard'
r.image_settings.file_format = 'PNG'
sc.frame_start, sc.frame_end = 1, A.frames
os.makedirs(A.out, exist_ok=True)
for f in (A.only or range(1, A.frames + 1)):
    sc.frame_set(f); r.filepath = os.path.abspath(os.path.join(A.out, f'{f:04d}.png'))
    if not os.path.exists(r.filepath): bpy.ops.render.render(write_still=True)
print('wrote', A.out)
