"""
Turns shoot photos into instant-film pictures that belong in the "Tonight" room:
square crop, warm firelit white balance, faded blacks with warm shadows and cream highlights, soft halation,
vignette and film grain. Output: public/tonight/photos/<n>.jpg (800 x 800).

  python make_polaroid_photos.py <folder with the originals>

Edit CROPS to change which photo goes on which polaroid or how it is framed:
(source file, centre x, centre y, square size as a fraction of the photo's short side), all 0..1.
"""
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', 'web'))
from modern_formats import convert
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'tonight', 'photos')
CROPS = [
    ('4.jpg', 0.40, 0.45, 1.00),   # 1 Stack: building the tower
    ('5.jpg', 0.45, 0.50, 1.00),   # 2 Pull: reaching for a block
    ('3.jpg', 0.50, 0.50, 1.00),   # 3 Tap: block and base in hand
    ('1.jpg', 0.50, 0.52, 1.00),   # 4 Answer: the whole table laughing
    ('2.jpg', 0.50, 0.60, 1.00),   # 5 Never ran out of questions
    ('3.jpg', 0.47, 0.70, 0.62),   # 6 What's in the box: the base and a block
    ('1.jpg', 0.66, 0.70, 0.42),   # 7 (on the table, not visited): hands at the tower
]
SIZE = 800
# after the waitlist, on the chapters table: our story (square prints) and the team (one wide print, 99 x 62 mm)
BRAND = os.path.join(HERE, '..', '..', 'public', 'brand')
CHAPTER_CROPS = [   # (output name, source: 'shoot:<file>' or 'brand:<file>', cx, cy, frac, aspect w/h)
    ('s1', 'shoot:6.jpg', 0.47, 0.76, 0.42, 1.0),                  # the problem: a phone on the table next to the game
    ('s2', 'shoot:2.jpg', 0.50, 0.42, 0.80, 1.0),                  # asking players
    ('s3', 'brand:jeemu-prototype-tower.jpg', 0.50, 0.50, 1.0, 1.0),   # the idea
    ('s4', 'brand:jeemu-prototype-angled.jpg', 0.40, 0.55, 1.0, 1.0),  # sketch to workbench
    ('s5', 'brand:jeemu-prototype-side.jpg', 0.50, 0.50, 1.0, 1.0),    # building in the open
    ('team', 'shoot:6.jpg', 0.50, 0.50, 1.0, 99 / 62),             # the six of us
]

def crop(im, cx, cy, frac, aspect=1.0):
    W, H = im.size
    h = min(H, W / aspect) * frac; w = h * aspect
    x = int(np.clip(cx * W - w / 2, 0, W - w)); y = int(np.clip(cy * H - h / 2, 0, H - h))
    out = (SIZE, SIZE) if aspect == 1.0 else (int(SIZE * 1.5), int(SIZE * 1.5 / aspect))
    return im.crop((x, y, int(x + w), int(y + h))).resize(out, Image.LANCZOS)

def grade(im, seed=0):
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    H, W = a.shape[:2]
    # 1. white balance: pull every photo to the same warm, firelit neutral (kitchen LEDs and blue windows included)
    lum = a.mean(axis=2, keepdims=True)
    mean = a.reshape(-1, 3).mean(0); target = np.array([1.0, 0.90, 0.74]) * mean.mean()
    a = np.clip(a * (0.35 + 0.65 * target / np.maximum(mean, 1e-4)), 0, 1)
    # 2. calmer colour: overall desaturation, blues and cyans pulled down harder
    lum = (a * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    blue = np.clip((a[..., 2:3] - np.maximum(a[..., 0:1], a[..., 1:2])) * 4, 0, 1)
    sat = 0.80 - 0.45 * blue
    a = lum + (a - lum) * sat
    # 3. instant-film tone: gentle S-curve, then map black -> warm brown and white -> cream (faded, split-toned)
    x = np.clip(a, 0, 1); x = x * x * (3 - 2 * x) * 0.55 + x * 0.45
    shadow, high = np.array([0.105, 0.075, 0.055]), np.array([0.985, 0.945, 0.86])
    a = shadow + (high - shadow) * x
    # 4. halation: bright areas bleed a warm glow, and the picture is a touch soft like real instant film
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(img, dtype=np.float32) / 255.0
    hi = np.clip((a.mean(2, keepdims=True) - 0.72) / 0.28, 0, 1) * np.array([1.0, 0.55, 0.3])
    glow = np.asarray(Image.fromarray((hi * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(min(W, H) * 0.02)), dtype=np.float32) / 255.0
    a = 1 - (1 - a) * (1 - glow * 0.35)                                  # screen blend
    # 5. vignette and grain
    yy, xx = np.mgrid[0:H, 0:W]; d = np.hypot((xx - W / 2) / W, (yy - H / 2) / H) / 0.707
    a = a * (1 - 0.32 * np.clip(d, 0, 1) ** 2.4)[..., None]
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, (H, W)).astype(np.float32)
    g = np.asarray(Image.fromarray(np.clip(g * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32) / 255.0 - 0.5
    a = a + g[..., None] * 0.07
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

if __name__ == '__main__':
    src = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
    for i, (f, cx, cy, frac) in enumerate(CROPS, 1):
        grade(crop(Image.open(os.path.join(src, f)), cx, cy, frac), seed=i).save(os.path.join(OUT, f'{i}.jpg'), quality=86)
        convert(os.path.join(OUT, f'{i}.jpg'))   # .avif and .webp copies for the site
        print('wrote', i, f)
    for name, source, cx, cy, frac, aspect in CHAPTER_CROPS:
        kind, f = source.split(':', 1)
        path = os.path.join(src if kind == 'shoot' else BRAND, f)
        grade(crop(Image.open(path), cx, cy, frac, aspect), seed=hash(name) % 1000).save(os.path.join(OUT, f'{name}.jpg'), quality=86)
        convert(os.path.join(OUT, f'{name}.jpg'))
        print('wrote', name, f)
