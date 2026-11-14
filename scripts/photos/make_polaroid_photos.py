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

def crop(im, cx, cy, frac):
    W, H = im.size; s = int(min(W, H) * frac)
    x = int(np.clip(cx * W - s / 2, 0, W - s)); y = int(np.clip(cy * H - s / 2, 0, H - s))
    return im.crop((x, y, x + s, y + s)).resize((SIZE, SIZE), Image.LANCZOS)

def grade(im, seed=0):
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
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
    glow = np.asarray(Image.fromarray((hi * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SIZE * 0.02)), dtype=np.float32) / 255.0
    a = 1 - (1 - a) * (1 - glow * 0.35)                                  # screen blend
    # 5. vignette and grain
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]; d = np.hypot(xx - SIZE / 2, yy - SIZE / 2) / (SIZE * 0.707)
    a = a * (1 - 0.32 * np.clip(d, 0, 1) ** 2.4)[..., None]
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, (SIZE, SIZE)).astype(np.float32)
    g = np.asarray(Image.fromarray(np.clip(g * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32) / 255.0 - 0.5
    a = a + g[..., None] * 0.07
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

if __name__ == '__main__':
    src = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
    for i, (f, cx, cy, frac) in enumerate(CROPS, 1):
        grade(crop(Image.open(os.path.join(src, f)), cx, cy, frac), seed=i).save(os.path.join(OUT, f'{i}.jpg'), quality=86)
        convert(os.path.join(OUT, f'{i}.jpg'))   # .avif and .webp copies for the site
        print('wrote', i, f)
