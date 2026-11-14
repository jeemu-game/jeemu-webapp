"""Make the CAD Jeemu look like the real prototype from the photoshoot.

  * shell: 3D-printed "galaxy" black PLA: near-black with fine silver flecks and 0.2 mm layer lines
  * +X face: a recessed dark plate with JEEMU in mint (Bagel Fat One, the brand face), flush with the shell
  * -X face: the frog mark in mint on the same kind of plate
  * blocks: pale pine with strong grain, a hand-written number in pen on the sides and ends, a grey frog stamp on top

Called from build_room.py after the late-night block removal: apply(cache_dir, brand_dir).
"""
import math, os, random, urllib.request
import bpy, bmesh
from mathutils import Vector, Matrix

MINT = (0.36, 0.80, 0.58)          # linear RGB of the mint PLA (about #a3e8c8 in sRGB)
PEN_FONT = 'https://fonts.gstatic.com/s/nanumpenscript/v25/daaDSSYiLGqEal3MvdA_FOL_3FkN2z4.ttf'


def _nodes(m):
    nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs[0], out.inputs[0]); return nt, b


def galaxy_black(m):
    """Black PLA with sparkle flecks and printed layer lines."""
    nt, b = _nodes(m); L = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord')
    # flecks: small voronoi cells, only a few percent of them light up
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 2600.0
    vor.feature = 'F1'; L(tc.outputs['Object'], vor.inputs['Vector'])
    rnd = nt.nodes.new('ShaderNodeMath'); rnd.operation = 'GREATER_THAN'; rnd.inputs[1].default_value = 0.955
    sep = nt.nodes.new('ShaderNodeSeparateColor'); L(vor.outputs['Color'], sep.inputs[0]); L(sep.outputs[0], rnd.inputs[0])
    dot = nt.nodes.new('ShaderNodeMath'); dot.operation = 'LESS_THAN'; dot.inputs[1].default_value = 0.30
    L(vor.outputs['Distance'], dot.inputs[0])
    fleck = nt.nodes.new('ShaderNodeMath'); fleck.operation = 'MULTIPLY'; L(rnd.outputs[0], fleck.inputs[0]); L(dot.outputs[0], fleck.inputs[1])
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs['A'].default_value = (0.010, 0.010, 0.011, 1); col.inputs['B'].default_value = (0.42, 0.42, 0.45, 1)
    L(fleck.outputs[0], col.inputs['Factor']); L(col.outputs['Result'], b.inputs['Base Color'])
    L(fleck.outputs[0], b.inputs['Metallic'])
    rough = nt.nodes.new('ShaderNodeMapRange'); rough.inputs['To Min'].default_value = 0.52; rough.inputs['To Max'].default_value = 0.28
    L(fleck.outputs[0], rough.inputs['Value']); L(rough.outputs['Result'], b.inputs['Roughness'])
    # layer lines: 0.2 mm ridges stacked along the print direction (world Z), plus a little unevenness
    sz = nt.nodes.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sz.inputs[0])
    ln = nt.nodes.new('ShaderNodeMath'); ln.operation = 'MULTIPLY'; ln.inputs[1].default_value = 2 * math.pi / 0.0002
    L(sz.outputs['Z'], ln.inputs[0])
    sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'; L(ln.outputs[0], sn.inputs[0])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 90.0; L(tc.outputs['Object'], nz.inputs['Vector'])
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'; h.inputs[1].default_value = 0.6
    L(sn.outputs[0], h.inputs[0]); L(nz.outputs['Fac'], h.inputs[2])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.10; bump.inputs['Distance'].default_value = 0.00004
    L(h.outputs[0], bump.inputs['Height']); L(bump.outputs[0], b.inputs['Normal'])
    b.inputs['Coat Weight'].default_value = 0.0
    return m


def plate_black(m):
    """The recessed label plate: printed face-down on the bed, so smoother and a touch glossier than the shell."""
    galaxy_black(m)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for n in m.node_tree.nodes:
        if n.type == 'BUMP': n.inputs['Strength'].default_value = 0.03
        if n.type == 'MAP_RANGE': n.inputs['To Min'].default_value = 0.36
    return m


def mint_pla():
    m = bpy.data.materials.new('MintPLA'); nt, b = _nodes(m)
    b.inputs['Base Color'].default_value = (*MINT, 1); b.inputs['Roughness'].default_value = 0.42
    b.inputs['Subsurface Weight'].default_value = 0.25; b.inputs['Subsurface Radius'].default_value = (0.002, 0.003, 0.0025)
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3000.0
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.05
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    return m


def _face_frame(sx):
    """Frame on the sloped side face: X along the face (to the viewer's right), Y up the slope, Z out of the face."""
    n = Vector((sx * 0.70711, 0, 0.70711)); up = Vector((-sx * 0.70711, 0, 0.70711)); right = up.cross(n) * -1
    if right.dot(Vector((0, sx, 0))) < 0: right = -right
    return right.normalized(), up, n


def _plate_centre(inl, sx):
    """Centre of the recessed plate on one side, and its height above the pocket floor, from the Inlays mesh."""
    right, up, n = _face_frame(sx); W = inl.matrix_world
    vs = [W @ v.co for v in inl.data.vertices if v.co.x * sx > 0]
    mid = lambda ax: (min(v.dot(ax) for v in vs) + max(v.dot(ax) for v in vs)) / 2
    plate = min((W @ p.center).dot(n) for p in inl.data.polygons
                if p.material_index == 0 and p.normal.dot(n) > 0.99 and p.center.x * sx > 0)
    top = max(v.dot(n) for v in vs)
    return right * mid(right) + up * mid(up) + n * plate, top - plate


BADGE_UP = 0.0005   # the badge stands this far proud of the shell


def _badge(name, c, right, up, n, w, h, mat, r=0.004, depth=0.0015):
    """A flat rounded-rectangle badge with a small bevel, standing slightly proud of the sloped face."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(9):
            a = math.radians(a0 + i * 90 / 8); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, BADGE_UP - depth)) for x, y in pts]; hi = [bm.verts.new((x, y, BADGE_UP)) for x, y in pts]
    bm.faces.new(hi); bm.faces.new(lo[::-1])
    for i in range(len(pts)): j = (i + 1) % len(pts); bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.matrix_world = Matrix.Translation(c) @ Matrix((right, up, n)).transposed().to_4x4()
    bv = o.modifiers.new('Bevel', 'BEVEL'); bv.width = 0.0003; bv.segments = 3; bv.limit_method = 'ANGLE'
    bv.harden_normals = True   # the big flat face stays dead flat; only the rounded edge is smoothed
    for p in me.polygons: p.use_smooth = True
    return o


def _remove_letters(inl):
    """Delete the old bone-white lettering from the inlay; its pockets stay filled by the plate."""
    bm = bmesh.new(); bm.from_mesh(inl.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == 1], context='FACES')
    bm.to_mesh(inl.data); bm.free()


def _wordmark(c, sx, brand_dir, mat, raise_to):
    """JEEMU in the brand face, set flush with the shell surface."""
    right, up, n = _face_frame(sx)
    cu = bpy.data.curves.new('ProtoWordmark', 'FONT'); cu.body = 'JEEMU'
    cu.font = bpy.data.fonts.load(os.path.join(brand_dir, 'BagelFatOne-Regular.ttf'))
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.size = 0.0155; cu.space_character = 1.04
    cu.extrude = 0.0005; cu.bevel_depth = 0.00012; cu.bevel_resolution = 2
    o = bpy.data.objects.new('ProtoWordmark', cu); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    rot = Matrix((right, up, n)).transposed().to_4x4()
    o.matrix_world = Matrix.Translation(c + n * (raise_to - 0.0005)) @ rot
    return o


def _frog_png(path, px=1024):
    from PIL import Image, ImageDraw
    s = px / 472.0; im = Image.new('RGBA', (px, px), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    M = (168, 237, 205, 255); K = (6, 8, 9, 255)
    def T(x, y): return ((x - 40) * s + (px - 432 * s) / 2, (y - 14) * s)
    def ell(cx, cy, rx, ry, f): x0, y0 = T(cx - rx, cy - ry); x1, y1 = T(cx + rx, cy + ry); d.ellipse((x0, y0, x1, y1), fill=f)
    def rr(x, y, w, h, r, f): x0, y0 = T(x, y); x1, y1 = T(x + w, y + h); d.rounded_rectangle((x0, y0, x1, y1), r * s, fill=f)
    for cx in (170, 342): ell(cx, 200, 74, 74, M)
    ell(256, 322, 216, 162, M)
    # the leaf drop on the head (the logo's own bezier outline)
    segs = [((256, 20), (274, 52), (304, 78), (304, 108)), ((304, 108), (304, 134), (284, 152), (256, 152)),
            ((256, 152), (228, 152), (208, 134), (208, 108)), ((208, 108), (208, 78), (238, 52), (256, 20))]
    drop = []
    for p0, p1, p2, p3 in segs:
        for i in range(24):
            t = i / 24; a, b, c, e = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
            drop.append(T(a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]))
    d.polygon(drop, fill=M)
    rr(104, 170, 132, 74, 34, K); rr(276, 170, 132, 74, 34, K); rr(236, 184, 40, 12, 6, K)
    d.line([T(190, 322), T(223, 342), T(256, 347), T(289, 342), T(322, 322)], fill=K, width=int(15 * s), joint='curve')
    for x, y in (T(190, 322), T(322, 322)): r = 7.5 * s; d.ellipse((x - r, y - r, x + r, y + r), fill=K)
    im.save(path)


def _decal_mat(name, img_path, color, alpha_mul, rough=0.5, use_rgb=False, bump=0.0):
    m = bpy.data.materials.new(name); nt, b = _nodes(m); L = nt.links.new
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img_path); tex.interpolation = 'Cubic'
    tex.extension = 'CLIP'
    if use_rgb: L(tex.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*color, 1)
    a = nt.nodes.new('ShaderNodeMath'); a.operation = 'MULTIPLY'; a.inputs[1].default_value = alpha_mul
    L(tex.outputs['Alpha'], a.inputs[0]); L(a.outputs[0], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = rough
    if bump:
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.0002
        L(tex.outputs['Alpha'], bp.inputs['Height']); L(bp.outputs[0], b.inputs['Normal'])
    return m


def _quad(name, parent, matrix, w, h, mat, uv=(0, 0, 1, 1)):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [], [(0, 1, 2, 3)])
    u0, v0, u1, v1 = uv; lay = me.uv_layers.new()
    for li, (u, v) in zip(range(4), ((u0, v0), (u1, v0), (u1, v1), (u0, v1))): lay.data[li].uv = (u, v)
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.visible_shadow = False
    if parent: o.parent = parent; o.matrix_parent_inverse = Matrix()
    o.matrix_local = matrix if parent else o.matrix_local
    if not parent: o.matrix_world = matrix
    return o


def _number_atlas(path, font, numbers, cols=16, cw=256, ch=128, seed=7):
    """Every block's number, hand-written a few times (sides and ends), each a little different."""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    rows = math.ceil(len(numbers) / cols); im = Image.new('L', (cols * cw, rows * ch), 0); rng = random.Random(seed)
    for i, num in enumerate(numbers):
        cell = Image.new('L', (cw * 2, ch * 2), 0); d = ImageDraw.Draw(cell)
        f = ImageFont.truetype(font, int(ch * 2 * rng.uniform(0.80, 0.95)))
        bx = d.textbbox((0, 0), str(num), font=f); tw, th = bx[2] - bx[0], bx[3] - bx[1]
        d.text(((cw * 2 - tw) / 2 - bx[0] + rng.uniform(-14, 14), (ch * 2 - th) / 2 - bx[1] + rng.uniform(-8, 8)), str(num), font=f, fill=255)
        cell = cell.filter(ImageFilter.MaxFilter(5)).rotate(rng.uniform(-9, 9), resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.4))   # felt-tip width
        cell = cell.point(lambda v: int(min(255, v * rng.uniform(0.85, 1.0))))   # pen pressure varies
        im.paste(cell.resize((cw, ch), Image.LANCZOS), ((i % cols) * cw, (i // cols) * ch))
    rgba = Image.new('RGBA', im.size, (0, 0, 0, 0)); rgba.putalpha(im); rgba.save(path)
    return cols, rows


def pine(m):
    """Retint the procedural beech into the pale, high-contrast pine of the real blocks."""
    for n in m.node_tree.nodes:
        if n.type == 'VALTORGB' and n.name == 'Color Ramp':
            e = n.color_ramp.elements
            e[0].position = 0.36; e[0].color = (0.66, 0.44, 0.21, 1)     # early wood: pale straw
            e[1].position = 0.86; e[1].color = (0.40, 0.19, 0.055, 1)   # late wood: orange-brown rings


def apply(cache_dir, brand_dir):
    os.makedirs(os.path.join(cache_dir, 'proto'), exist_ok=True)
    font = os.path.join(cache_dir, 'fonts', 'NanumPen.ttf')
    if not os.path.exists(font):
        os.makedirs(os.path.dirname(font), exist_ok=True); urllib.request.urlretrieve(PEN_FONT, font)

    # ---- the base
    shell_m = bpy.data.materials.get('MouldedBlack')
    if shell_m: galaxy_black(shell_m)
    sh = bpy.data.objects.get('Shell')
    if sh:   # keep crisp edges crisp: without this the shell's smoothing smears round the badge pocket and corners
        # CAD tessellation: long thin triangles drag the fillets' smoothing across the flat faces (dark smudges,
        # spikes and streaks round the badge and the slot). Faces lying in one of the shell's flat planes are shaded
        # flat; only the real fillets and rounds stay smooth.
        planes = [Vector(v).normalized() for v in ((1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (0, 0, 1), (0, 0, -1),
                                                    (1, 0, -1), (-1, 0, -1), (0, 1, -1), (0, -1, -1))]
        flat = 0
        for p in sh.data.polygons:
            if any(p.normal.dot(q) > 0.9995 for q in planes): p.use_smooth = False; flat += 1
        print(f'shell: {flat} of {len(sh.data.polygons)} faces shaded flat')
    plate_m = plate_black(bpy.data.materials.new('PlateBlack'))
    mint = mint_pla()
    inl = bpy.data.objects.get('Inlays')
    if inl:
        cen = {}
        for sx in (1, -1):   # one solid badge per side, a touch bigger than the old pocket so no gap or recess shows
            right, up, n = _face_frame(sx); W = inl.matrix_world
            vs = [W @ v.co for v in inl.data.vertices if v.co.x * sx > 0]
            span = lambda ax: (min(v.dot(ax) for v in vs), max(v.dot(ax) for v in vs))
            (r0, r1), (u0, u1), (_, top) = span(right), span(up), span(n)
            c = right * (r0 + r1) / 2 + up * (u0 + u1) / 2 + n * top     # on the shell surface
            cen[sx] = c
            _badge(f'Badge{sx}', c, right, up, n, r1 - r0 + 0.002, u1 - u0 + 0.002, plate_m)
        bpy.data.objects.remove(inl, do_unlink=True)
        _wordmark(cen[1], 1, brand_dir, mint, BADGE_UP + 0.0003)   # letters stand 0.3 mm proud of the badge
        frog = os.path.join(cache_dir, 'proto', 'frog.png'); _frog_png(frog)
        right, up, n = _face_frame(-1)
        fm = _decal_mat('ProtoFrog', frog, (1, 1, 1), 1.0, rough=0.42, use_rgb=True, bump=0.25)
        c = cen[-1] + n * (BADGE_UP + 0.00005)
        _quad('ProtoFrog', None, Matrix.Translation(c) @ Matrix((right, up, n)).transposed().to_4x4(), 0.0215, 0.0215, fm)
    top = bpy.data.objects.get('TopLogo')
    if top:
        for s in top.material_slots: s.material = plate_m

    # ---- the blocks
    beech = bpy.data.materials.get('Beech')
    if beech: pine(beech)
    for o in [o for o in bpy.data.objects if o.name.startswith('Word')]:
        bpy.data.objects.remove(o, do_unlink=True)
    blocks = sorted([o for o in bpy.data.objects if o.name.startswith('Block') and o.type == 'MESH'], key=lambda o: o.name)
    rng = random.Random(24); nums = list(range(1, 55)); rng.shuffle(nums)
    per = 4   # two sides, two ends
    atlas = os.path.join(cache_dir, 'proto', 'numbers.png')
    cols, rows = _number_atlas(atlas, font, [nums[int(b.name[5:]) % 54] for b in blocks for _ in range(per)])
    ink = _decal_mat('PenInk', atlas, (0.018, 0.012, 0.008), 0.92, rough=0.55)
    stamp_png = os.path.join(cache_dir, 'proto', 'stamp.png')
    from PIL import Image
    fr = Image.open(os.path.join(cache_dir, 'proto', 'frog.png')) if inl else None
    if fr:
        a = fr.split()[3]; Image.merge('RGBA', (a.point(lambda v: 0),) * 3 + (a,)).save(stamp_png)
        stamp = _decal_mat('FrogStamp', stamp_png, (0.06, 0.055, 0.05), 0.70, rough=0.6)
    k = 0
    for b in blocks:
        bb = [Vector(v) for v in b.bound_box]
        hx = max(v.x for v in bb); hy = max(v.y for v in bb); hz = max(v.z for v in bb); eps = 0.00008
        end = 1 if rng.random() < 0.5 else -1
        faces = [  # (location, rotation, width, height) of each decal in the block's own frame
            (Vector((end * hx * 0.62, -hy - eps, 0)), Matrix.Rotation(math.pi / 2, 4, 'X'), 0.021, 0.0105),
            (Vector((-end * hx * 0.62, hy + eps, 0)), Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Rotation(math.pi, 4, 'Y'), 0.021, 0.0105),
            (Vector((hx + eps, 0, 0)), Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X'), 0.019, 0.0095),
            (Vector((-hx - eps, 0, 0)), Matrix.Rotation(-math.pi / 2, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X'), 0.019, 0.0095),
        ]
        for loc, rot, w, h in faces:
            c, r = k % cols, k // cols
            uv = (c / cols, 1 - (r + 1) / rows, (c + 1) / cols, 1 - r / rows)
            _quad(f'{b.name}_ink{k % per}', b, Matrix.Translation(loc) @ rot, w, h, ink, uv); k += 1
        if fr:
            for sz in (1, -1):
                _quad(f'{b.name}_stamp{sz}', b, Matrix.Translation((0, 0, sz * (hz + eps))) @ Matrix.Rotation(0 if sz > 0 else math.pi, 4, 'X'),
                      0.016, 0.016, stamp)
