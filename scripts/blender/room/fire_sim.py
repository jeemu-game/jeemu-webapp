"""A linear fireplace fire, simulated (Mantaflow) and rendered on black, for the site to lay into the firebox.

Modern linear fireplaces burn as a row of flames along a long burner, not a log pile: that's what this makes.
Only the fire is rendered (no room), framed to the firebox mouth's shape (about 2.5 : 1), on pure black so the site
can blend it in. Frames then become a seamless loop (make_fire_loop.py).

  python fire_sim.py -- --out out/fire_sim --frames 150 --res 96 --width 640 --height 256 --samples 24 [--gpu]
"""
import argparse, math, os, sys
import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='out/fire_sim'); ap.add_argument('--frames', type=int, default=150)
ap.add_argument('--res', type=int, default=96); ap.add_argument('--width', type=int, default=640); ap.add_argument('--height', type=int, default=256)
ap.add_argument('--samples', type=int, default=24); ap.add_argument('--gpu', action='store_true')
ap.add_argument('--only', type=int, nargs='*', default=None, help='render only these frames (to look at it)')
A = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# the burner: a long, narrow strip at the bottom of the firebox (the mouth is 1.24 m wide, 0.5 m tall)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.03))
burner = bpy.context.active_object; burner.name = 'Burner'; burner.scale = (1.10, 0.05, 0.03)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.quick_smoke()                # sets up a domain round it, an emitter, and a fire material
dom = next(o for o in sc.objects if o.name.startswith('Smoke Domain'))
dom.scale = (0.66, 0.16, 0.42); dom.location = (0, 0, 0.38)   # room above the burner for the flames to rise
fs = burner.modifiers['Fluid'].flow_settings
fs.flow_type = 'FIRE'; fs.fuel_amount = 1.4; fs.surface_distance = 0.6; fs.subframes = 2
fs.use_initial_velocity = True; fs.velocity_coord = (0, 0, 0.6)
fs.flow_source = 'MESH'
# flames come out unevenly along a real burner: break the emission up with a moving texture
tex = bpy.data.textures.new('BurnerNoise', 'CLOUDS'); tex.noise_scale = 0.12
fs.use_texture = True; fs.noise_texture = tex; fs.texture_map_type = 'AUTO'; fs.texture_size = 1.0
ds = dom.modifiers['Fluid'].domain_settings
ds.resolution_max = A.res; ds.cache_type = 'MODULAR'
ds.cache_directory = os.path.abspath(os.path.join(A.out, 'cache'))
ds.cache_frame_start = 1; ds.cache_frame_end = A.frames + 20
ds.burning_rate = 0.85; ds.flame_smoke = 0.0; ds.flame_vorticity = 0.6; ds.flame_ignition = 1.3; ds.flame_max_temp = 3.2
ds.vorticity = 0.15; ds.alpha = -0.0006; ds.beta = 1.2; ds.use_dissolve_smoke = True; ds.dissolve_speed = 6
ds.time_scale = 0.85
sc.frame_start, sc.frame_end = 1, A.frames + 20

# the fire's look: flames only (no smoke shown), warm blackbody colour
mat = dom.active_material
pv = next(n for n in mat.node_tree.nodes if n.type == 'PRINCIPLED_VOLUME')
pv.inputs['Density'].default_value = 0.0
pv.inputs['Blackbody Intensity'].default_value = 3.0
pv.inputs['Temperature'].default_value = 1300

# camera: straight into the mouth, framed to it
cam_data = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, -3.0, 0.30); cam.rotation_euler = (math.radians(90), 0, 0)
cam_data.type = 'ORTHO'; cam_data.ortho_scale = 1.24
r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = A.width, A.height; r.film_transparent = False
w = bpy.data.worlds.new('Black'); sc.world = w; w.color = (0, 0, 0)
cy = sc.cycles; cy.samples = A.samples; cy.use_denoising = True; cy.volume_bounces = 1; cy.volume_step_rate = 0.5
if A.gpu:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for t in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
        try: prefs.compute_device_type = t; prefs.get_devices(); break
        except Exception: pass
    for d in prefs.devices: d.use = d.type != 'CPU'
    cy.device = 'GPU'
sc.view_settings.view_transform = 'Standard'
r.image_settings.file_format = 'PNG'

# simulate, then render (the first 20 frames are the fire catching: skipped)
bpy.context.view_layer.objects.active = dom
bpy.ops.fluid.bake_data()
os.makedirs(A.out, exist_ok=True)
frames = A.only if A.only else range(21, A.frames + 21)
for f in frames:
    sc.frame_set(f); r.filepath = os.path.abspath(os.path.join(A.out, f'{f - 20:04d}.png'))
    if not os.path.exists(r.filepath): bpy.ops.render.render(write_still=True)
print('wrote', A.out)
