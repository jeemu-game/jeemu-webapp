# Jeemu forest: art brief and render guide

## The idea
One photographic scene carries the whole story: **the Jeemu console on a mossy tree stump in a night forest**, shot like macro product
photography (low camera, shallow depth of field, creamy out-of-focus background). Because the background is deep bokeh, a small tabletop
game looks natural there and the scale problem disappears. The console, the stump and their shadows are rendered in Blender with lights
that match the photo, so they belong in it. Pixel art stays only where it is the brand's retro touch: the Jeemu screen, buttons and labels.

## What to generate (in this order)
Use any image generator (GPT image, Midjourney, Firefly). Generate 8 to 16 variations of each, pick the best, then upscale to at least
2560 px wide (Magnific, Topaz, Krea or similar). Save as PNG with exactly these names.

| File | Size | Purpose |
|---|---|---|
| `hero-desktop.png` | 16:9, 2560x1440 or larger | wide shot behind the console |
| `hero-phone.png` | 9:16, 1440x2560 or larger | the same scene for phones |
| `fg-desktop.png` | 16:9 | optional: dark out-of-focus leaves on pure WHITE, laid over everything |
| `fg-phone.png` | 9:16 | optional: same, portrait |
| `bark.png`, `moss.png` | 2048x2048, seamless | optional: replaces the procedural stump textures |

### Shared style block (paste at the start of every prompt)
```
PHOTOGRAPHIC, not illustrated. Cinematic macro photography in an enchanted old-growth forest at night. Shot on a full-frame camera,
85mm lens at f/1.8, very shallow depth of field, creamy bokeh, fine film grain, natural colour, subtle teal-and-amber grade.
Lighting: cool teal moonlight filtering through the canopy from high behind the scene on the right, soft warm amber lantern glow from the
left, tiny glowing fireflies as out-of-focus bokeh. Deep green and teal shadows, never pure black. Mood: cosy, magical, calm.
Absolutely no text, no people, no animals, no UI, no logos, no watermark, no illustration or cartoon look, no pixel art.
```

### 1. hero-desktop.png
```
[STYLE BLOCK]
Wide 16:9 frame. A mossy forest clearing floor seen from a low camera about 50 cm above the ground, looking slightly downward (about 15
degrees). The centre of the frame, from 38% to 62% of the width and from 55% to 88% of the height, is calm, EMPTY, softly moonlit moss and
leaf litter with nothing standing on it (an object will be added there later): no stump, no rock, no mushroom, no log in that area.
Fine moss, tiny ferns and a few red-capped mushrooms and small yellow wildflowers sit only near the left and right edges and the bottom
corners, slightly out of focus. The background is a deep, hazy night forest of tall tree trunks, dissolving into teal mist and large soft
bokeh, with a faint beam of moonlight and a few fireflies. The horizon, where the ground meets the trunks, is at about 42% of the height.
The brightest, sharpest area is the ground just behind where the object will stand. Keep the left third slightly darker and calmer.
```

### 2. hero-phone.png
Same prompt as 1 with these changes: replace "Wide 16:9 frame" with "Tall 9:16 portrait frame"; the empty area is
"from 25% to 75% of the width and from 52% to 84% of the height"; "the horizon is at about 38% of the height"; add "taller trunks, more
canopy and a little moon glow at the top of the frame".

### 3. fg-desktop.png and fg-phone.png (optional but recommended)
```
Out-of-focus foreground leaves and ferns photographed from a few centimetres away, so they are huge, dark and heavily blurred, as dark
green-black silhouettes with a soft edge. They frame the LEFT and RIGHT edges and the bottom corners only. The whole centre of the frame
(from 25% to 75% of the width and the whole height between 10% and 80%) is EMPTY.
THE BACKGROUND MUST BE PURE FLAT WHITE (#FFFFFF), with no shadows, no gradient and no texture. 16:9 (or 9:16 for the phone version).
No text, no watermark.
```

### 4. bark.png and moss.png (optional)
```
Seamless tileable texture, top-down flat lighting, no perspective, no shadows, 2048x2048: weathered dark tree bark with deep vertical
grooves and lichen.   |   Seamless tileable texture: dense deep-green moss with tiny ferns, soft even light.
```

## Acceptance checklist (check each plate before sending)
- Looks like a photo (no painterly or cartoon look). Teal moonlight and warm lantern light are visible.
- The marked centre area really is empty (no stump, rock or mushroom).
- No text, watermark, people or animals. Horizon roughly where the prompt says. Dark overall: the console is brighter than the scene.
- `fg-*` has a pure white background (check with a colour picker), and the centre is empty.

## Preview, then the full render
1. Put the files in one folder, for example `plates`.
2. **Preview (about a minute, low resolution):**
   - Windows: `scripts\forest\preview_forest.bat C:\path\to\jeemu-designs C:\path\to\plates`
   - macOS or Linux: `scripts/forest/preview_forest.sh /path/to/jeemu-designs /path/to/plates`

   Look at `out_forest_preview/preview_desktop/0132.jpg` (the wide shot) and `preview_phone/0132.jpg`, and send them to me.
3. **Full render** (a GPU PC, resumable): the same command with `render_forest` instead of `preview_forest`. It renders both sets, composites
   them over your plates, encodes the videos as `public/story/*-v3.*` and `public/story/mobile/*-v3.*`, and copies them into `frontend/public`.
4. Commit the new files to a branch and push it, so Vercel makes a preview.

Requirements: Blender 4.2 or newer, Python 3 with `pip install pillow numpy imageio-ffmpeg`, and the `jeemu-designs` repo. Add `--gpu`
automatically happens in the scripts; if the log says it fell back to CPU, the GPU drivers are not visible to Blender.

## What the render changes
- The console stands on a 3D mossy stump (cut top, bark, moss) 15 cm tall, with a real shadow on the forest floor.
- The camera pulls back further at the wide stop (`--pull 1.5`), so the console is about 40% of the frame height.
- Lights: warm lantern from the front left, cool moonlight rim from the back right, teal bounce. Change them in `build_scene.py` under `if A.forest:`.
- Every block carries a number on both short ends (1 to 54).
- The photo moves slightly with the camera and the foreground leaves sweep past as the camera moves in, so the console really is inside the scene.
- Videos are re-encoded lighter (`--crf 27`) and named with a new tag (`-v3`) because `/story/*` is cached for a year.

Tuning options on `build_scene.py`: `--pull`, `--stump-h`, `--bark`, `--moss`. On `composite_story.py`: `--bg-dim` (darken the photo),
`--grain`, `--vignette`, `--bg-depth`, `--fg-depth`.
