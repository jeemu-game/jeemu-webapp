"""Writes .avif and .webp copies next to website JPEGs. The site serves the smallest format the browser supports
(AVIF, then WebP, then the JPEG), so keep all three.
    python scripts/web/modern_formats.py public/tonight/close.jpg public/tonight/photos/*.jpg ...
"""
import os, sys
from PIL import Image

def convert(path, avif_q=58, webp_q=80):
    im = Image.open(path).convert('RGB'); base = os.path.splitext(path)[0]
    im.save(base + '.avif', quality=avif_q, speed=5, subsampling='4:4:4' if im.width * im.height < 400_000 else '4:2:0')
    im.save(base + '.webp', quality=webp_q, method=6)
    return [os.path.getsize(p) // 1024 for p in (path, base + '.webp', base + '.avif')]

if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(os.path.basename(p), 'jpg/webp/avif KB:', *convert(p))
