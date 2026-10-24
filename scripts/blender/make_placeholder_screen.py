"""Writes screen.png (320x240 = the real display resolution): Jeemu logo on the brand charcoal.
The website overlays live game content on top; this is the baked fallback in the renders."""
import sys
from PIL import Image
out = sys.argv[1] if len(sys.argv) > 1 else 'screen.png'
logo = Image.open(__file__.replace('make_placeholder_screen.py', 'assets/jeemu-logo.jpg')).convert('RGB')
bg = Image.new('RGB', (320, 240), (6, 10, 8))
l = logo.resize((226, 226), Image.LANCZOS)
bg.paste(l, (47, 7))
bg.save(out)
