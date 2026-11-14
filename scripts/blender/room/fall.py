"""The tower falls: a rigid-body collapse of the late-night (gappy) tower, for "Be there when it falls".

setup(frames)        give every block real physics, make the base and table solid, and add a hidden "hand" that pulls
                     one block from low in the tower; bake the simulation over `frames` frames
save_final(path)     where every block ended up (JSON), so later shots can show the fallen tower
apply_final(path)    put the blocks where they fell (for the waitlist close-up and the chapters table)

Used by build_room.py: --fall OUTDIR renders the collapse frame by frame; --fallen FILE uses the saved result.
"""
import json, math
import bpy
from mathutils import Vector, Matrix


def _blocks():
    return sorted([o for o in bpy.data.objects if o.name.startswith('Block') and o.type == 'MESH' and len(o.name) == 7], key=lambda o: o.name)


def setup(frames=60, pull='Block22'):
    sc = bpy.context.scene
    if sc.rigidbody_world is None:
        bpy.ops.rigidbody.world_add()
    rw = sc.rigidbody_world
    rw.substeps_per_frame = 40; rw.solver_iterations = 40
    rw.point_cache.frame_start = 1; rw.point_cache.frame_end = frames
    sc.frame_start = 1; sc.frame_end = frames

    def body(o, kind, shape, mass=0.014, friction=0.55, bounce=0.08):
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.rigidbody.object_add(); o.select_set(False)
        rb = o.rigid_body; rb.type = kind; rb.collision_shape = shape; rb.friction = friction; rb.restitution = bounce
        rb.use_margin = True; rb.collision_margin = 0.0004
        if kind == 'ACTIVE':
            rb.mass = mass; rb.linear_damping = 0.08; rb.angular_damping = 0.12
            rb.use_deactivation = True; rb.use_start_deactivated = True   # still until something touches it
        return rb

    for o in bpy.data.objects: o.select_set(False)
    for b in _blocks():
        body(b, 'ACTIVE', 'BOX')
    for name, shape in (('TableTop', 'MESH'), ('Shell', 'CONVEX_HULL')):
        o = bpy.data.objects.get(name)
        if o: body(o, 'PASSIVE', shape, friction=0.6)

    # a player pulls one low block straight out along its length (from the back), quicker than they should;
    # once it's out it drops, and what was standing on it goes with it
    target = bpy.data.objects.get(pull)
    if target:
        ax = Vector(target.matrix_world.col[0][:3]).normalized()
        d = ax if ax.y > 0 else -ax   # out of the back: the tower falls away from the screen side
        rb = target.rigid_body; rb.use_start_deactivated = False; rb.kinematic = True
        loc0 = target.location.copy()
        for f, k in ((1, 0.0), (6, 0.0), (16, 0.115)):
            target.location = loc0 + d * k; target.keyframe_insert('location', frame=f)
        rb.keyframe_insert('kinematic', frame=16)
        rb.kinematic = False; rb.keyframe_insert('kinematic', frame=17)
        target.location = loc0 + d * 0.115

    bpy.ops.ptcache.bake_all(bake=True)


def save_final(path, frame=None):
    sc = bpy.context.scene
    sc.frame_set(frame or sc.frame_end)
    out = {b.name: [list(r) for r in b.matrix_world] for b in _blocks()}
    json.dump(out, open(path, 'w'))


def apply_final(path):
    data = json.load(open(path))
    for b in _blocks():
        if b.name in data:
            b.matrix_world = Matrix(data[b.name])


def tower_height():
    return max((b.matrix_world @ Vector(c)).z for b in _blocks() for c in b.bound_box)
