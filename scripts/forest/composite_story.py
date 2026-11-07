"""Puts the Blender render (transparent PNGs of the console + stump + shadows) over the photo plate, frame by frame.

The plate is a photograph, so it is not 3D: it is moved a little as the camera moves (it is far away, so only slightly), and an optional
foreground layer of out-of-focus leaves (dark leaves on WHITE, multiplied over everything) rushes past the camera as it dollies in, which
gives real parallax and makes the console look like it is inside the scene. A fixed film grain and a light vignette sit over the whole
frame so render and photo share one texture. Output: opaque PNGs, then encode_story_video.py makes the videos.

  pip install pillow numpy
  python composite_story.py <blender_out_dir> <plate_image> <out_dir> [--fg leaves.png] [--bg-depth 4.0] [--fg-depth 0.35] [--grain 1.3]

<blender_out_dir> must hold 0000.png ... plus screen_0.json written by build_scene.py (it records the camera distance per frame).
"""
import argparse, glob, json, math, os, shutil, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('plate'); ap.add_argument('out')
ap.add_argument('--fg', default='', help='optional foreground leaves: dark leaves on a white background, same aspect as the plate')
ap.add_argument('--bg-depth', type=float, default=4.0, help='metres from the stump to the backdrop: bigger = the photo moves less')
ap.add_argument('--fg-depth', type=float, default=0.35, help='metres from the camera at the wide shot to the foreground leaves')
ap.add_argument('--grain', type=float, default=1.3, help='film grain strength (0 = off)')
ap.add_argument('--vignette', type=float, default=0.22)
ap.add_argument('--anchor-y', type=float, default=0.64, help='where the backdrop zooms about (fraction of the height; the console stands there)')
ap.add_argument('--bg-dim', type=float, default=1.0, help='multiply the plate brightness (use < 1 if the console looks too bright against it)')
a = ap.parse_args()

meta = {}; info = None
for j in sorted(glob.glob(os.path.join(a.src, 'screen_*.json'))):
    m = json.load(open(j)); info = m
if not info: sys.exit('no screen_*.json in ' + a.src)
W, H, N = info['width'], info['height'], info['total']
cam = {int(k): v for k, v in info.get('camDist', {}).items()}
if not cam: sys.exit('screen_0.json has no camDist: re-render with the updated build_scene.py')
D_REF = max(cam.values())                                   # the farthest the camera ever is (the wide stop): zoom 1 there
os.makedirs(a.out, exist_ok=True)

def cover(im, w, h, scale=1.0):
    s = max(w / im.width, h / im.height) * scale
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

PLATE = cover(Image.open(a.plate).convert('RGB'), W, H, 1.0)
if a.bg_dim != 1.0: PLATE = Image.fromarray(np.clip(np.asarray(PLATE).astype(np.float32) * a.bg_dim, 0, 255).astype(np.uint8))
FG = cover(Image.open(a.fg).convert('RGB'), W, H, 1.0) if a.fg else None
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = 1 - a.vignette * np.clip(np.hypot((xx / W - 0.5) * 1.15, (yy / H - 0.5) * 1.3) - 0.35, 0, 1) ** 1.6

def zoom(img, z, ax, ay):
    if abs(z - 1) < 1e-4: return img
    inv = 1 / z
    return img.transform((W, H), Image.AFFINE, (inv, 0, ax * (1 - inv), 0, inv, ay * (1 - inv)), resample=Image.BICUBIC)

def work(f):
    d = cam[f]
    zb = (D_REF + a.bg_depth) / (d + a.bg_depth)
    bg = np.asarray(zoom(PLATE, zb, W / 2, H * a.anchor_y)).astype(np.float32)
    g = np.asarray(Image.open(os.path.join(a.src, f'{f:04d}.png')).convert('RGBA')).astype(np.float32)
    al = g[..., 3:4] / 255.0
    out = g[..., :3] * al + bg * (1 - al)
    if FG is not None:
        zf = (D_REF + a.fg_depth) / (d + a.fg_depth)
        op = float(np.clip((3.0 - zf) / 1.4, 0, 1))             # the leaves have swept past (and out of the frame) by the close-ups
        if op > 0:
            fg = np.asarray(zoom(FG, zf, W / 2, H / 2)).astype(np.float32) / 255.0
            out = out * (1 - op + op * fg)
    out = out * VIG[..., None]
    if a.grain > 0:
        rng = np.random.default_rng(1000 + f)
        out = out + rng.normal(0, a.grain, (H, W, 1)).astype(np.float32)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(a.out, f'{f:04d}.png'), compress_level=1)
    return f

if __name__ == '__main__':
    frames = [f for f in range(N) if os.path.exists(os.path.join(a.src, f'{f:04d}.png')) and not os.path.exists(os.path.join(a.out, f'{f:04d}.png'))]
    print(f'{len(frames)} frames to composite ({W}x{H})', flush=True)
    with Pool() as p:
        for i, f in enumerate(p.imap_unordered(work, frames, chunksize=4)):
            if i % 40 == 0: print(f'  {i + 1}/{len(frames)}', flush=True)
    for j in glob.glob(os.path.join(a.src, 'screen_*.json')): shutil.copy(j, a.out)
    print('done ->', a.out)
