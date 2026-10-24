"""Builds public/og-image.jpg (1200x630) from the tower-built frame of the story video.
   python scripts/make_og_image.py   (needs ffmpeg on PATH; run again after each final render is pushed)"""
import json, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter
root = os.path.join(os.path.dirname(__file__), '..')
tl = json.load(open(os.path.join(root, 'public/story/timeline.json')))
hero = 132 if len(tl['rests']) < 3 else tl['rests'][0]
src = os.path.join(root, 'public/story/story.webm')
tmp = os.path.join(tempfile.mkdtemp(), 'f.png')
subprocess.check_call(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', f'select=eq(n\\,{hero})', '-frames:v', '1', tmp])
fr = Image.open(tmp).convert('RGB')
W, H = 1200, 630
bg = Image.new('RGB', (W, H), (10, 14, 12))
# the frame is already on the page background; crop the product and place it right of the text
box = fr.point(lambda v: 255 if v > 40 else 0).convert('L').getbbox() or (0, 0, fr.width, fr.height)
pad = 30; fr = fr.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(fr.width, box[2] + pad), min(fr.height, box[3] + pad)))
s = min(570 / fr.height, 560 / fr.width); fr = fr.resize((round(fr.width * s), round(fr.height * s)), Image.LANCZOS)
bg.paste(fr, (W - fr.width - 70, (H - fr.height) // 2))
d = ImageDraw.Draw(bg)
def font(sz, bold=True):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()
frog = Image.open(os.path.join(root, 'public/story/frog-pixel.png')).convert('RGBA'); frog = frog.resize((frog.width * 2, frog.height * 2), Image.NEAREST)
bg.paste(frog, (60, 56), frog); d.text((60 + frog.width + 18, 74), 'JEEMU', font=font(34), fill=(255, 255, 255))
lines = ['We help people achieve', 'deeper connections without', 'the awkwardness of starting', 'the conversation.']
for n, line in enumerate(lines):
    d.text((60, 190 + n * 56), line, font=font(40), fill=(255, 255, 255))
d.text((60, 470), 'Launching on Kickstarter in November', font=font(26, False), fill=(142, 168, 154))
d.text((60, 512), 'Early bird $89.99 USD', font=font(26), fill=(0, 217, 126))
bg.save(os.path.join(root, 'public/og-image.jpg'), quality=90)
print('wrote public/og-image.jpg from frame', hero)
