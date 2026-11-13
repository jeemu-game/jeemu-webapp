"""
Copies rendered stills + their overlay corner files into the website (public/tonight/), with the camera post step.
  python prepare_site_assets.py [render_dir]        (default out/site)
The top-down table shot gets no vignette: the site pans across it, so darkened corners would travel with the picture.
"""
import json, os, shutil, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from post import post

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'site')
DST = os.path.join(HERE, '..', '..', '..', 'public', 'tonight')
os.makedirs(DST, exist_ok=True)
for name in ('close', 'wide', 'play', 'top', 'late'):
    png, js = os.path.join(SRC, name + '.png'), os.path.join(SRC, name + '.json')
    if not (os.path.exists(png) and os.path.exists(js)): print('missing', name); continue
    im = post(Image.open(png), vig=0.0 if name == 'top' else 0.30)
    im.save(os.path.join(DST, name + '.jpg'), quality=84, optimize=True, progressive=True)
    shutil.copy(js, os.path.join(DST, name + '.json'))
    print('ok', name, im.size, os.path.getsize(os.path.join(DST, name + '.jpg')) // 1024, 'KB')
