"""
Copies rendered stills + their overlay corner files into the website (public/tonight/), with the camera post step.
  python prepare_site_assets.py [render_dir]        (default out/site)
The top-down table shot gets no vignette: the site pans across it, so darkened corners would travel with the picture.
"""
import json, os, shutil, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'web'))
from post import post
from modern_formats import convert

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'site')
DST = os.path.join(HERE, '..', '..', '..', 'public', 'tonight')
os.makedirs(DST, exist_ok=True)
for name in ('close', 'wide', 'play', 'top', 'late', 'end', 'top2'):
    png, js = os.path.join(SRC, name + '.png'), os.path.join(SRC, name + '.json')
    if not (os.path.exists(png) and os.path.exists(js)): print('missing', name); continue
    raw = Image.open(png).convert('RGBA')
    pp = os.path.join(SRC, name + '_patch.png')
    if os.path.exists(pp):   # the firebox re-rendered without flames (the site adds filmed fire): blend it in, feathered
        from PIL import ImageFilter
        patch = Image.open(pp).convert('RGBA')
        a = patch.split()[3].point(lambda v: 255 if v > 250 else 0).filter(ImageFilter.MinFilter(41)).filter(ImageFilter.GaussianBlur(14))
        raw = Image.composite(patch, raw, a); print('  patched', name)
    im = post(raw.convert('RGB'), vig=0.0 if name in ('top', 'top2') else 0.30)
    im.save(os.path.join(DST, name + '.jpg'), quality=84, optimize=True, progressive=True)
    shutil.copy(js, os.path.join(DST, name + '.json'))
    print('ok', name, im.size, 'jpg/webp/avif KB:', *convert(os.path.join(DST, name + '.jpg')))
    if name in ('top', 'top2'):   # out-of-focus copy for the site's depth of field (quarter size is plenty once blurred, and light on phones)
        from PIL import ImageFilter
        soft = im.resize((im.width // 4, im.height // 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3.5))
        soft.save(os.path.join(DST, name + '_blur.jpg'), quality=82, optimize=True, progressive=True)
        convert(os.path.join(DST, name + '_blur.jpg'))

# firebox mattes for the live fire: alpha only, half size is plenty for a soft mask
for name in ('wide', 'close', 'play', 'late', 'end'):
    fm = os.path.join(SRC, name + '_firemask.png')
    if os.path.exists(fm):
        a = Image.open(fm).split()[-1]
        a = a.resize((a.width // 2, a.height // 2), Image.LANCZOS)
        Image.merge('LA', (a, a)).save(os.path.join(DST, name + '_firemask.png'), optimize=True)
        print('ok firemask', name)

# the tower falling: numbered frames, scrubbed by the scroll on the site (camera post on each, same as the late shot)
import glob
frames = sorted(glob.glob(os.path.join(SRC, 'fall', '[0-9][0-9][0-9].png')))
if frames:
    fdst = os.path.join(DST, 'fall'); os.makedirs(fdst, exist_ok=True)
    for i, f in enumerate(frames):
        im = post(Image.open(f), vig=0.30)
        out = os.path.join(fdst, f'{i:02d}.jpg'); im.save(out, quality=80, optimize=True, progressive=True)
        convert(out)
    json.dump({'count': len(frames), 'width': 1280, 'height': 720}, open(os.path.join(fdst, 'index.json'), 'w'))
    print('ok fall', len(frames), 'frames')
