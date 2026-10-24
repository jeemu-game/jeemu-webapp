"""Converts a Blender frame sequence (RGBA PNGs + screen_<n>.json) into the web story assets.

  python export_web_frames.py <render_dir> <out_dir> [--width 1920] [--quality 82] [--step 1]

Writes <out_dir>/frames/NNN.webp (transparent WebP) and <out_dir>/manifest.json:
  { count, width, height, fps, sourceFrames: [n...], screen: [[[x,y]*4] per frame, TL TR BR BL, in image px] }
"""
import argparse, glob, json, os
from PIL import Image
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=1920); ap.add_argument('--quality', type=int, default=82)
ap.add_argument('--step', type=int, default=1)
ap.add_argument('--max-frames', type=int, default=0, help='cap the web payload: keep an even spread of at most N frames (first and last always kept)')
a = ap.parse_args()
pngs = sorted(glob.glob(os.path.join(a.src, '[0-9][0-9][0-9][0-9].png')))[::a.step]
if a.max_frames and len(pngs) > a.max_frames:
    n_ = a.max_frames
    pngs = [pngs[round(i * (len(pngs) - 1) / (n_ - 1))] for i in range(n_)]
meta = {}
for j in glob.glob(os.path.join(a.src, 'screen_*.json')):
    m = json.load(open(j)); meta.update({int(k): v for k, v in m['screen'].items()}); W0, H0, FPS, TL = m['width'], m['height'], m['fps'], m['timeline']
os.makedirs(os.path.join(a.out, 'frames'), exist_ok=True)
for f in glob.glob(os.path.join(a.out, 'frames', '*.webp')): os.remove(f)
src_frames, screen = [], []
w = a.width; h = None; k = W0 and (w / W0)
for i, p in enumerate(pngs):
    n = int(os.path.basename(p)[:4]); im = Image.open(p).convert('RGBA')
    h = round(im.height * w / im.width); im = im.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(a.out, 'frames', f'{i:03d}.webp'), 'WEBP', quality=a.quality, method=4)
    src_frames.append(n); screen.append([[round(x * w / W0, 2), round(y * w / W0, 2)] for x, y in meta[n]])
json.dump(dict(count=len(pngs), width=w, height=h, fps=FPS, totalSourceFrames=int(TL['total'] * FPS), timeline=TL,
               sourceFrames=src_frames, screen=screen), open(os.path.join(a.out, 'manifest.json'), 'w'))
print(len(pngs), 'frames', w, 'x', h)
