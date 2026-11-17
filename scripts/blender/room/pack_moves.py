"""
Turns rendered camera moves into what the site plays (public/tonight/seq/):
  python pack_moves.py RENDERS [--only NAME ...] [--device desk|phone]
RENDERS/<device>/<move>/ holds a move from build_room.py --move (NNN.png, its fire mattes mNNN.png from a --fire-mask
run, meta.json). For every frame this
  1. lays the filmed fire (public/tonight/fire.mp4) into the firebox: sunk to how far the fire has burned down, softened
     to how out of focus the fireplace is in that frame, behind anything in front of it (the matte), screen-blended,
     exactly as the site's live fire does (src/components/tonight/LiveFire.jsx);
  2. adds the camera's own look (post.py: bloom, fringing, vignette);
  3. writes a small web frame for scrubbing (NN.webp), and the first and last frames in full (first/last .jpg .webp)
     with a short loop of the fire for each (first_fire.mp4 / last_fire.mp4), shown while the reader is stopped there.
Then public/tonight/seq/index.json says what's there. Needs: pip install pillow numpy imageio-ffmpeg
"""
import argparse, glob, json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from post import post

SITE = os.path.join(HERE, '..', '..', '..', 'public', 'tonight')
OUT = os.path.join(SITE, 'seq')
MOTION = {'desk': (1280, 720), 'phone': (540, 960)}   # scrubbed frames: the picture is moving, so smaller is fine
BURN = {False: (0.88, 1.02, 0.9), True: (0.66, 0.82, 1.25)}   # (flame height, brightness, saturation): evening / late
LOOP = 150                                                  # the fire clip: 10 s at 15 fps, seamless


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:   # an ffmpeg on the PATH works too
        return 'ffmpeg'


def fire_frames():
    src = os.path.join(SITE, 'fire.mp4')
    raw = subprocess.run([ffmpeg(), '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 256, 640, 3)
    return [Image.fromarray(f) for f in fr[:LOOP]]


def persp_coeffs(dst, src):
    """PIL PERSPECTIVE coefficients mapping output points dst -> input points src (4 pairs)."""
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def sunk(q, d):
    tl, tr, br, bl = [np.array(p, float) for p in q]
    return [tl + (bl - tl) * d, tr + (br - tr) * d, br + (br - tr) * d, bl + (bl - tl) * d]


def saturate(a, s):
    lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return lum[..., None] + (a - lum[..., None]) * s


EMBER = None
def ember_glow():
    """The late fire's glowing bed (the site's .tn-emberglow), in the clip's own 1280 x 512 space."""
    global EMBER
    if EMBER is None:
        yy, xx = np.mgrid[0:512, 0:1280].astype(np.float32)
        r = np.sqrt(((xx - 640) / (0.58 * 1280)) ** 2 + ((yy - 512) / (0.34 * 512)) ** 2)   # ellipse at the bottom middle
        c0, c1 = np.array([255, 96, 22, 0.62], np.float32), np.array([190, 52, 8, 0.26], np.float32)
        a = np.where(r < 0.5, c0 + (c1 - c0) * (r / 0.5)[..., None], c1 * np.clip(1 - (r - 0.5) / 0.35, 0, 1)[..., None])
        rgb, al = a[..., :3] / 255.0, a[..., 3] * 0.85
        EMBER = Image.fromarray(np.dstack([rgb * 255, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    return EMBER


def fire_layer(size, fire, fm, late, origin=(0, 0)):
    """The fire as the site draws it, before the matte: RGB plus how much of it there is (0..1), in `size` pixels
    whose top-left is `origin` in the frame."""
    W, H = size; ox, oy = origin
    hgt, bright, sat = BURN[late]
    q = [(p[0] - ox, p[1] - oy) for p in sunk(fm['firebox'], 1 - hgt)]
    clip = fire.resize((1280, 512), Image.BICUBIC)
    cov = Image.new('L', (1280, 512), 255)
    if late:   # its left end fades out where the tower stands in front of it
        g = np.clip((np.arange(1280) / 1280 - 0.04) / 0.12, 0, 1)
        cov = Image.fromarray((np.tile(g, (512, 1)) * 255).astype(np.uint8))
    co = persp_coeffs(q, [(0, 0), (1280, 0), (1280, 512), (0, 512)])
    rgb = np.asarray(Image.merge('RGBA', (*clip.split(), cov)).transform((W, H), Image.PERSPECTIVE, co, Image.BICUBIC), np.float32) / 255
    a = rgb[..., 3:4]; col = rgb[..., :3]
    if late:   # the glowing bed under the flames
        qe = [(p[0] - ox, p[1] - oy) for p in fm['firebox']]
        eg = np.asarray(ember_glow().transform((W, H), Image.PERSPECTIVE, persp_coeffs(qe, [(0, 0), (1280, 0), (1280, 512), (0, 512)]), Image.BICUBIC), np.float32) / 255
        ea = eg[..., 3:4]; layer = eg[..., :3] * ea
        layer = col * a + layer * (1 - a)
    else:
        layer = col * a
    blur = fm.get('fireBlur', 3)
    if blur > 0.3:
        layer = np.asarray(Image.fromarray((layer.clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255
    layer = saturate(layer * bright, sat).clip(0, 1)
    return layer


def composite(base, fire, fm, matte, late, region=None):
    """base: the render (RGB, PIL), matte: where the fire may show (L, PIL). Screen blend, like the site."""
    x0, y0, x1, y1 = region or (0, 0, base.width, base.height)
    b = np.asarray(base.crop((x0, y0, x1, y1)), np.float32) / 255
    layer = fire_layer((x1 - x0, y1 - y0), fire, fm, late, (x0, y0))
    m = (np.asarray(matte.crop((x0, y0, x1, y1)), np.float32) / 255)[..., None]
    out = 1 - (1 - b) * (1 - layer * m)
    return Image.fromarray((out * 255 + 0.5).clip(0, 255).astype(np.uint8))


def post_region(im, full, origin, vig):
    """post() on part of a frame, with the vignette of the whole frame (for the fire loops); no colour fringing."""
    out = np.asarray(post(im, ca=0.0, vig=0.0), np.float32) / 255
    W, H = full; h, w = out.shape[:2]; ox, oy = origin
    yy, xx = np.mgrid[oy:oy + h, ox:ox + w]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / np.sqrt(2)
    out = out * (1 - vig * np.clip(d, 0, 1) ** 2.2)[..., None]
    return Image.fromarray((out * 255 + 0.5).clip(0, 255).astype(np.uint8))


def save_still(im, path):
    im.save(path + '.jpg', quality=86, optimize=True, progressive=True)
    im.save(path + '.webp', quality=82, method=5)
    try: im.save(path + '.avif', quality=60)
    except Exception: pass


def fire_loop(base, fires, fm, matte, late, vig, path):
    """A seamless loop of the fire for a frame the reader can stop on: only the patch round the firebox."""
    W, H = base.size
    q = np.array(list(fm['firebox']) + [list(p) for p in sunk(fm['firebox'], 1 - BURN[late][0])])
    pad = 3 * fm.get('fireBlur', 3) + 0.03 * W
    x0, y0 = max(0, int(q[:, 0].min() - pad)) // 2 * 2, max(0, int(q[:, 1].min() - pad)) // 2 * 2
    x1, y1 = min(W, int(q[:, 0].max() + pad + 1)) // 2 * 2, min(H, int(q[:, 1].max() + pad + 1)) // 2 * 2
    if x1 - x0 < 16 or y1 - y0 < 16: return None
    if (np.asarray(matte.crop((x0, y0, x1, y1))) > 8).mean() < 0.02: return None   # the fire is hidden here
    B = int(0.15 * W)   # bloom reaches this far: work on a bigger patch, keep the middle
    X0, Y0, X1, Y1 = max(0, x0 - B), max(0, y0 - B), min(W, x1 + B), min(H, y1 + B)
    tmp = tempfile.mkdtemp()
    for f, fire in enumerate(fires):
        im = post_region(composite(base, fire, fm, matte, late, (X0, Y0, X1, Y1)), (W, H), (X0, Y0), vig)
        im.crop((x0 - X0, y0 - Y0, x1 - X0, y1 - Y0)).save(os.path.join(tmp, f'{f:03d}.png'))
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-framerate', '15', '-i', os.path.join(tmp, '%03d.png'), '-c:v', 'libx264', '-profile:v', 'main',
                    '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-g', '30', '-movflags', '+faststart', '-an', path], check=True)
    for f in glob.glob(os.path.join(tmp, '*.png')): os.remove(f)
    os.rmdir(tmp)
    return [x0, y0, x1 - x0, y1 - y0]


def pack(device, move, src, fires, index):
    meta = json.load(open(os.path.join(src, 'meta.json')))
    frames = sorted(glob.glob(os.path.join(src, '[0-9][0-9][0-9].png')))
    n = len(meta['frames'])
    if len(frames) < n: print(f'  {device}/{move}: {len(frames)} of {n} frames rendered, skipped'); return
    dst = os.path.join(OUT, device, move); os.makedirs(dst, exist_ok=True)
    late = meta.get('late', False); entry = {'n': n, 'width': meta['width'], 'height': meta['height'], 'motion': MOTION[device]}
    for k in ('handoffIn', 'handoffOut'):
        if k in meta: entry[k] = meta[k]
    for i, f in enumerate(frames[:n]):
        fm = meta['frames'][i]; base = Image.open(f).convert('RGB')
        mp = os.path.join(src, f'm{i:03d}.png')
        matte = Image.open(mp).split()[-1] if os.path.exists(mp) else Image.new('L', base.size, 0)
        if matte.size != base.size: matte = matte.resize(base.size, Image.BILINEAR)
        im = post(composite(base, fires[i % LOOP], fm, matte, late), vig=fm.get('vig', 0.30))
        im.resize(MOTION[device], Image.LANCZOS).save(os.path.join(dst, f'{i:03d}.webp'), quality=72, method=4)
        for which, at in (('first', 0), ('last', n - 1)):
            if i != at: continue
            save_still(im, os.path.join(dst, which))
            info = {}
            rect = fire_loop(base, fires, fm, matte, late, fm.get('vig', 0.30), os.path.join(dst, which + '_fire.mp4'))
            if rect: info['fire'] = rect
            if fm.get('screen'): info['screen'] = fm['screen']
            entry[which] = info
        if i % 20 == 0: print(f'  {device}/{move} {i}/{n}', flush=True)
    index.setdefault(device, {})[move] = entry
    print(f'  {device}/{move}: {n} frames')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('renders'); ap.add_argument('--only', nargs='*'); ap.add_argument('--device', nargs='*')
    a = ap.parse_args()
    fires = fire_frames()
    ip = os.path.join(OUT, 'index.json')
    index = json.load(open(ip)) if os.path.exists(ip) else {}
    for device in a.device or ('desk', 'phone'):
        for src in sorted(glob.glob(os.path.join(a.renders, device, '*', 'meta.json'))):
            move = os.path.basename(os.path.dirname(src))
            if a.only and move not in a.only: continue
            pack(device, move, os.path.dirname(src), fires, index)
            os.makedirs(OUT, exist_ok=True); json.dump(index, open(ip, 'w'), indent=1)
    # the site reads this at build time (it decides the page's layout): src/components/tonight/seqIndex.json
    json.dump(index, open(os.path.join(HERE, '..', '..', '..', 'src', 'components', 'tonight', 'seqIndex.json'), 'w'), indent=1)
    print('wrote', ip)
