"""Turns a full Blender render (every frame, transparent PNGs + screen_0.json) into the website's story video.

  pip install pillow numpy imageio-ffmpeg        (imageio-ffmpeg bundles ffmpeg; a system ffmpeg is used if present)
  python encode_story_video.py <render_dir> <out_dir> [--width 1920] [--crf 20] [--no-webm]

Writes <out_dir>/story.mp4 (+ story.webm), poster.jpg and timeline.json:
  fps, width, height, frames, rests (frame numbers the player pauses on), tapFrame, screen (4 corner px per frame).
The page plays the video in real time between rests and pins the live pixel-art screen to the per-frame corners.
"""
import argparse, glob, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=0, help='video width (default: render width)')
ap.add_argument('--crf', type=int, default=20)
ap.add_argument('--no-webm', action='store_true')
ap.add_argument('--no-reverse', action='store_true', help='skip the reversed copy the page plays when you scroll back up')
a = ap.parse_args()

def ffmpeg_exe():
    exe = shutil.which('ffmpeg')
    if exe: return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found. Run:  pip install imageio-ffmpeg   (or install ffmpeg and put it on PATH)')

meta = {}; info = None
for j in sorted(glob.glob(os.path.join(a.src, 'screen_*.json'))):
    m = json.load(open(j)); meta.update({int(k): v for k, v in m['screen'].items()}); info = m
if not info: sys.exit('no screen_*.json in ' + a.src)
n = info['total']
missing = [f for f in range(n) if not os.path.exists(os.path.join(a.src, f'{f:04d}.png'))]
if missing: sys.exit(f'{len(missing)} frames missing (first: {missing[0]}). Render EVERY frame (the default render_sequence step is now 1).')
fps, W0, H0 = info['fps'], info['width'], info['height']
W = a.width or W0; H = round(H0 * W / W0); W -= W % 2; H -= H % 2
os.makedirs(a.out, exist_ok=True)

# page-matching background: charcoal with a faint jade glow, dithered so 8-bit video does not band
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx / W - 0.5) / 0.62) ** 2 + ((yy / H - 0.60) / 0.55) ** 2)
g = np.clip(1 - r, 0, 1) ** 1.6
base = np.array([10, 14, 12], np.float32); glow = np.array([0, 217, 126], np.float32) * 0.075
img = base[None, None, :] + g[..., None] * glow[None, None, :]
img += np.random.default_rng(3).uniform(-0.9, 0.9, img.shape)
bg = os.path.join(a.out, 'bg.png'); Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(bg)

rests = info['rests']
keys = ','.join(f'{r / fps:.4f}' for r in [0] + rests)
fc = f'[0:v][1:v]overlay=shortest=1:format=auto,scale={W}:{H}:flags=lanczos,format=yuv420p'
common = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-stats', '-loop', '1', '-framerate', str(fps), '-i', bg,
          '-framerate', str(fps), '-start_number', '0', '-i', os.path.join(a.src, '%04d.png'), '-frames:v', str(n),
          '-filter_complex', fc, '-force_key_frames', keys, '-an']
print('encoding story.mp4 ...')
subprocess.check_call(common + ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf), '-g', '30', '-movflags', '+faststart',
                                os.path.join(a.out, 'story.mp4')])
if not a.no_webm:
    print('encoding story.webm ...')
    subprocess.check_call(common + ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-g', '30',
                                    os.path.join(a.out, 'story.webm')])
if not a.no_reverse:
    # the same frames in reverse order (a concat list, so nothing is buffered); keyframes land on the same stops
    lst = os.path.join(a.out, 'rev.txt')
    with open(lst, 'w') as fh:
        fh.write('ffconcat version 1.0\n')
        for f in range(n - 1, -1, -1):
            fh.write(f"file '{os.path.abspath(os.path.join(a.src, f'{f:04d}.png')).replace(chr(92), '/')}'\nduration {1 / fps:.6f}\n")
    rkeys = ','.join(f'{(n - 1 - r) / fps:.4f}' for r in sorted([0] + rests, reverse=True))
    rfc = f'[1:v]fps={fps}[f];[0:v][f]overlay=shortest=1:format=auto,scale={W}:{H}:flags=lanczos,format=yuv420p'
    rcommon = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-stats', '-loop', '1', '-framerate', str(fps), '-i', bg,
               '-f', 'concat', '-safe', '0', '-i', lst, '-frames:v', str(n), '-filter_complex', rfc, '-force_key_frames', rkeys, '-an']
    print('encoding story-rev.mp4 ...')
    subprocess.check_call(rcommon + ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf), '-g', '30', '-movflags', '+faststart',
                                     os.path.join(a.out, 'story-rev.mp4')])
    if not a.no_webm:
        print('encoding story-rev.webm ...')
        subprocess.check_call(rcommon + ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-g', '30',
                                         os.path.join(a.out, 'story-rev.webm')])
    os.remove(lst)
poster = Image.alpha_composite(Image.open(bg).convert('RGBA'), Image.open(os.path.join(a.src, '0000.png')).convert('RGBA').resize((W, H), Image.LANCZOS))
poster.convert('RGB').save(os.path.join(a.out, 'poster.jpg'), quality=82)
k = W / W0
json.dump(dict(fps=fps, width=W, height=H, frames=n, rests=rests, reverse=not a.no_reverse, tapFrame=info['tapFrame'],
               screen=[[[round(x * k, 2), round(y * k, 2)] for x, y in meta[f]] for f in range(n)]),
          open(os.path.join(a.out, 'timeline.json'), 'w'))
os.remove(bg)
mb = sum(os.path.getsize(os.path.join(a.out, f)) for f in os.listdir(a.out)) / 1e6
print(f'done: {n} frames @ {fps} fps, {W}x{H}, rests {rests}, tap frame {info["tapFrame"]}, {mb:.1f} MB in {a.out}')
