"""Exports the 'frame deck' for a story video: every 3rd frame (and the last) as a small WebP.

Phones in Low Power Mode, Data Saver and some in-app browsers refuse to play a <video> without a tap. The page then draws these frames on a
canvas instead (cross-fading neighbours, so it runs at the full frame rate), so the animation always plays, with no button, and the pixel
screen always sits exactly on the picture. About 1.5-3 MB per set; downloaded only by devices that need it.

  pip install pillow ; ffmpeg on PATH
  python export_deck.py <story video.mp4> <out_dir> [--width 1600] [--quality 65] [--step 3]
  e.g. python export_deck.py public/story/story-v2.mp4 public/story/deck-v2/d --width 1600
       python export_deck.py public/story/mobile/story-v2.mp4 public/story/deck-v2/m --width 720
The page expects public/story/deck<tag>/d (desktop) and /m (phone), matching V in StoryPlayer.jsx. Re-run after every re-render.
"""
import argparse, glob, json, os, subprocess, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=1600); ap.add_argument('--quality', type=int, default=65); ap.add_argument('--step', type=int, default=3)
a = ap.parse_args()
n = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', a.video]).decode().strip())
keep = list(range(0, n, a.step)) + ([n - 1] if (n - 1) % a.step else [])
os.makedirs(a.out, exist_ok=True)
sel = '+'.join(f'eq(n\\,{k})' for k in keep)
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', a.video, '-vf', f"select='{sel}',scale={a.width}:-2:flags=lanczos", '-vsync', 'vfr', os.path.join(a.out, 't%04d.png')])
files = sorted(glob.glob(os.path.join(a.out, 't*.png')))
assert len(files) == len(keep), (len(files), len(keep))
tot = 0
for f, k in zip(files, keep):
    out = os.path.join(a.out, f'{k:04d}.webp'); Image.open(f).convert('RGB').save(out, quality=a.quality, method=6); tot += os.path.getsize(out); os.remove(f)
json.dump(dict(frames=n, step=a.step, list=keep), open(os.path.join(a.out, 'deck.json'), 'w'))
print(f'{len(keep)} frames, {tot / 1e6:.2f} MB -> {a.out}')
