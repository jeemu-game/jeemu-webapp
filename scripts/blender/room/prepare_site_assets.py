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
for name in ('close', 'wide', 'play', 'top', 'late', 'end', 'top2') + tuple(f'faq{k}' for k in range(7)):
    png, js = os.path.join(SRC, name + '.png'), os.path.join(SRC, name + '.json')
    if not (os.path.exists(png) and os.path.exists(js)): print('missing', name); continue
    raw = Image.open(png).convert('RGBA')
    pp = os.path.join(SRC, name + '_patch.png')
    if os.path.exists(pp):   # the firebox re-rendered without flames (the site adds filmed fire): blend it in, feathered
        from PIL import ImageFilter
        patch = Image.open(pp).convert('RGBA')
        a = patch.split()[3].point(lambda v: 255 if v > 250 else 0).filter(ImageFilter.MinFilter(41)).filter(ImageFilter.GaussianBlur(14))
        raw = Image.composite(patch, raw, a); print('  patched', name)
    ins_json = os.path.join(SRC, name + '_insets.json')
    if os.path.exists(ins_json):   # the sharp close-ups, scaled down into the base, so the two match when one fades in
        for iname, (x0, y0, x1, y1) in json.load(open(ins_json)).get('insets', {}).items():
            f = os.path.join(SRC, 'insets', iname + '.png')
            if os.path.exists(f):
                raw.paste(Image.open(f).convert('RGBA').resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))
        print('  insets pasted', name)
    im = post(raw.convert('RGB'), vig=0.0 if name in ('top', 'top2') else 0.30)
    im.save(os.path.join(DST, name + '.jpg'), quality=84, optimize=True, progressive=True)
    shutil.copy(js, os.path.join(DST, name + '.json'))
    print('ok', name, im.size, 'jpg/webp/avif KB:', *convert(os.path.join(DST, name + '.jpg')))
    # the phone copy (the site picks it on small screens): phones can't hold the full renders decoded while scrolling
    mw = 3200 if name in ('top', 'top2') else 1100 if name.startswith('faq') else 1280
    im.resize((mw, round(im.height * mw / im.width)), Image.LANCZOS).save(os.path.join(DST, name + '_m.jpg'), quality=86, optimize=True, progressive=True)
    convert(os.path.join(DST, name + '_m.jpg'))
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
        sm = os.path.join(fdst, f'{i:02d}_m.jpg'); im.resize((800, 450), Image.LANCZOS).save(sm, quality=82, optimize=True, progressive=True)   # phones
        convert(sm)
    json.dump({'count': len(frames), 'width': 1280, 'height': 720}, open(os.path.join(fdst, 'index.json'), 'w'))
    print('ok fall', len(frames), 'frames')

# sharp close-ups for the chapters table (build_room.py --insets): where they go, and the pictures
ins_meta = os.path.join(SRC, 'top2_insets.json'); top2_json = os.path.join(DST, 'top2.json')
if os.path.exists(ins_meta) and os.path.exists(top2_json):
    m = json.load(open(top2_json)); extra = json.load(open(ins_meta))
    m['insets'] = extra.get('insets', {}); m['burnt'] = m.get('burnt') or extra.get('burnt', False)
    json.dump(m, open(top2_json, 'w'), indent=1)
    idst = os.path.join(DST, 'insets'); os.makedirs(idst, exist_ok=True)
    for name in m['insets']:
        f = os.path.join(SRC, 'insets', name + '.png')
        if not os.path.exists(f): continue
        out = os.path.join(idst, name + '.jpg'); big = post(Image.open(f).convert('RGB'), vig=0.0); big.save(out, quality=84, optimize=True, progressive=True)
        convert(out)
        # half size for phones: a phone shows a print a few hundred points wide, and can't afford six full ones decoded
        small = os.path.join(idst, name + '_s.jpg'); big.resize((big.width // 2, big.height // 2), Image.LANCZOS).save(small, quality=84, optimize=True, progressive=True)
        convert(small)
    print('ok insets', len(m['insets']))

# version stamp (scripts/web/stamp_assets.py): browsers fetch the new files after a re-render, never a stale cache
from stamp_assets import stamp
print('asset version', stamp())
