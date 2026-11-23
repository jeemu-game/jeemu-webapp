"""
Camera post-processing for rendered frames: what a real lens and sensor add to a photo.
  python post.py in.png out.jpg            (or a folder: python post.py frames_in/ frames_out/)
- bloom: bright sources (flames, candles, specular glints) glow softly into their surroundings
- lateral chromatic aberration: a faint red/blue fringe that grows towards the frame edges
- vignette: gentle corner fall-off
Film grain is NOT baked in: video compression destroys it, so the website adds it live on top of the video.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

def post(im, bloom=0.30, thresh=0.72, ca=0.0012, vig=0.30):
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    lin = a ** 2.2                                                  # work in (approximately) linear light
    hi = np.clip(lin - thresh ** 2.2, 0, None)
    glow = np.zeros_like(lin)
    for rad, wt in ((w * 0.004, 0.5), (w * 0.015, 0.35), (w * 0.05, 0.25)):   # layered blur ~ a lens's long-tailed glow
        g = Image.fromarray(np.clip(hi * 255 / max(hi.max(), 1e-6), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))
        glow += np.asarray(g, dtype=np.float32) / 255.0 * max(hi.max(), 1e-6) * wt
    lin = lin + glow * bloom * 4
    out = np.clip(lin, 0, 1) ** (1 / 2.2)
    if ca:   # scale red out and blue in about the centre
        img = Image.fromarray((out * 255).astype(np.uint8)); r, g, b = img.split()
        def scale(ch, k):
            nw, nh = int(round(w * k)), int(round(h * k)); c = ch.resize((nw, nh), Image.BICUBIC)
            x0, y0 = (nw - w) // 2, (nh - h) // 2
            return c.crop((x0, y0, x0 + w, y0 + h)) if k > 1 else ch
        r = scale(r, 1 + ca); img = Image.merge('RGB', (r, g, b))
        b2 = img.split()[2]; g2 = img.split()[1]
        out = np.asarray(img, dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:h, 0:w]; d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
    out = out * (1 - vig * np.clip(d, 0, 1) ** 2.2)[..., None]
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        for f in sorted(os.listdir(src)):
            if f.lower().endswith(('.png', '.jpg')): post(Image.open(os.path.join(src, f))).save(os.path.join(dst, f))
    else:
        post(Image.open(src)).save(dst, quality=92)
