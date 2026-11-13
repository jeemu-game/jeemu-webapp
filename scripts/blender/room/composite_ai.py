# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow", "opencv-python-headless"]
# ///
"""Put the exact Jeemu back into an AI-enhanced still.

An image model makes the room look photographed, but it redraws the product (wrong logo, wobbly blocks, a moved
screen). This keeps the AI's room and takes Jeemu, the blocks and the polaroids from our render, using the matte
from `build_room.py --mask`. Because the product pixels are the render's, the site's overlay corners stay exact.

    uv run composite_ai.py AI.png RENDER.jpg MASK.png OUT.jpg [--match 0.6] [--grow 3] [--feather 4]

  AI.png      the enhanced picture (any size or crop; it is matched to the render by its features)
  RENDER.jpg  the still the site uses now, e.g. public/tonight/play.jpg
  MASK.png    the matte, e.g. out/mask/play.png
"""
import argparse, sys
import numpy as np, cv2
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('ai'); ap.add_argument('render'); ap.add_argument('mask'); ap.add_argument('out')
ap.add_argument('--match', type=float, default=0.6, help='0..1: pull the AI picture\'s overall colour toward the render so the product sits in it')
ap.add_argument('--grow', type=int, default=3, help='pixels to grow the matte by (covers AI halos round the product)')
ap.add_argument('--feather', type=float, default=4.0, help='softness of the seam, in pixels')
ap.add_argument('--no-align', action='store_true')
A = ap.parse_args()

R = np.asarray(Image.open(A.render).convert('RGB')).astype(np.float32) / 255
H, W = R.shape[:2]
ai = np.asarray(Image.open(A.ai).convert('RGB')).astype(np.float32) / 255
X = cv2.resize(ai, (W, H), interpolation=cv2.INTER_AREA)   # first guess: same framing, scaled

m = Image.open(A.mask)
m = (m.split()[-1] if m.mode in ('RGBA', 'LA') else m.convert('L')).resize((W, H), Image.LANCZOS)
if A.grow: m = m.filter(ImageFilter.MaxFilter(2 * A.grow + 1))
if A.feather: m = m.filter(ImageFilter.GaussianBlur(A.feather))
M = (np.asarray(m).astype(np.float32) / 255)[..., None]

# 1. line the AI picture up with the render: matched features for the rough fit (image models crop, pad and drift),
#    then ECC for the last pixel
def gray(im, s): return cv2.cvtColor((cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
if not A.no_align:
    s = 1280 / W; sa = 1280 / ai.shape[1]
    gr, ga = gray(R, s), gray(ai, sa)
    orb = cv2.ORB_create(6000); kr, dr = orb.detectAndCompute(gr, None); ka, da = orb.detectAndCompute(ga, None)
    Hm = None
    if dr is not None and da is not None:
        pairs = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(da, dr), key=lambda x: x.distance)[:1500]
        if len(pairs) >= 12:
            src = np.float32([ka[p.queryIdx].pt for p in pairs]) / sa; dst = np.float32([kr[p.trainIdx].pt for p in pairs]) / s
            Hm, inl = cv2.findHomography(src, dst, cv2.RANSAC, 4.0 / s)
            print(f'features: {int(inl.sum())} of {len(pairs)} matches agree')
    if Hm is None:
        print('feature match failed; assuming the same framing', file=sys.stderr)
        Hm = np.diag([W / ai.shape[1], H / ai.shape[0], 1])
    X = cv2.warpPerspective(ai, Hm, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    try:   # refine
        q = 960 / W; warp = np.eye(3, dtype=np.float32)
        blur = lambda im: cv2.GaussianBlur(gray(im, q), (5, 5), 0)
        _, warp = cv2.findTransformECC(blur(R), blur(X), warp, cv2.MOTION_HOMOGRAPHY,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
        Q = np.diag([q, q, 1]).astype(np.float32); warp = np.linalg.inv(Q) @ warp @ Q
        X = cv2.warpPerspective(X, warp, (W, H), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    except cv2.error:
        print('fine alignment skipped', file=sys.stderr)

# 2. pull its colour toward the render (outside the product), so the pasted product matches its surroundings
if A.match > 0:
    lab = lambda im: cv2.cvtColor(im, cv2.COLOR_RGB2LAB)
    Lx, Lr = lab(X), lab(R); bg = M[..., 0] < 0.05
    for c in range(3):
        mx, sx, mr, sr = Lx[..., c][bg].mean(), Lx[..., c][bg].std() + 1e-6, Lr[..., c][bg].mean(), Lr[..., c][bg].std()
        Lx[..., c] = (1 - A.match) * Lx[..., c] + A.match * ((Lx[..., c] - mx) / sx * sr + mr)
    X = np.clip(cv2.cvtColor(Lx, cv2.COLOR_LAB2RGB), 0, 1)

# 3. the render's product over the AI's room
out = X * (1 - M) + R * M
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(A.out, quality=92)
print('wrote', A.out)
