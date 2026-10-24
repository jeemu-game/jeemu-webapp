# Landing-page animation (Blender)

`build_scene.py` builds the Jeemu console and the 54-block tower from the `jeemu-designs` CAD exports and renders any
frame of the scroll story. Every pose is computed from the frame number, so frames can be rendered alone, in any order,
on any machine. Output is transparent PNG (the page supplies the background) plus `screen_<n>.json` with the four
screen-corner pixel positions for every rendered frame, which the website uses to overlay the live pixel-art screen.

## Quick test (CPU, any machine)
```
pip install bpy pillow
python make_placeholder_screen.py screen.png          # logo on the 320x240 screen; the site overlays live content
python build_scene.py --designs ../../../jeemu-designs --frames 125,290,400 --out ./out \
       --width 1920 --height 1080 --samples 48 --screen-png screen.png
```

## Final render (GPU machine)
macOS/Linux: `./render_sequence.sh /path/to/jeemu-designs ./out`
Windows: `render_sequence.bat C:\path\to\jeemu-designs out` (set `BLENDER` to blender.exe if it is not on PATH, without quotes).
Defaults: 1920 px wide, 64 samples, every 3rd frame -> 140 desktop + 140 phone (1080x1920) frames. The site scales frames to
1920 px anyway, so 4K only costs time; 140 frames per set scrubs smoothly. Add more samples or a smaller step only if you see noise or judder.
The run is resumable: stop it with Ctrl+C and run the same command again; finished frames are skipped. Use a fresh out folder if you change the width.
Use Blender 4.2+ (tested on 5.2). The log prints `Rendering on OPTIX/CUDA/HIP...`; if it says it fell back to CPU, the GPU drivers are not visible to Blender.
Smoother scrub: render more frames into the SAME out folder (`... out 1920 64 1` renders all 420; finished frames are skipped). The web export keeps an even spread of at most 210 frames per set (`--max-frames`) so downloads stay reasonable (~25 MB desktop, ~13 MB phone, streamed coarse-to-fine).
Output: transparent WebP frames + `manifest.json` in `public/story/` and `public/story/mobile/`. The page picks the phone set automatically on tall screens.

## Stacking
The tower is deliberately imperfect (twist per layer, slight lean, uneven gaps, blocks shifted along their length, the odd one left sticking out). `--sloppiness 0` gives a machine-perfect tower, `1` (default) a careful human, `2` a rushed one. Every block carries "Jeemu" on both long sides.

## Timeline
fall 0-3.7s -> hero -5.4s -> pull -8s -> carry to the +X wall badge -9.3s -> tap + jade glow -10s -> dolly into the screen -12.6s -> hold -14s.
Beat copy and progress ranges live in `src/components/story/storyBeats.js` (progress = seconds / 14).

## Materials
- Wood: solid 3D beech (growth rings from a virtual log, fibres, per-block hue and mineral streaks, edge wear, scratches, dings).
- Baseplate: satin injection-moulded black polymer with fine stipple and bevelled edges. The wordmark and top-logo plates are the
  same black; only the letters/marks are white (split by height above the plate).
- Screen: 320x240 LCD pixel structure; shows the Jeemu logo (placeholder). The website overlays the live UI.

## Assumptions to confirm
Standard Jenga block 75x25x15 mm, 54 blocks, on the 85 mm CAD deck (5 mm margin each side).
`previews/` holds test renders only.

## Quick GPU check before the long render
Render two frames first and look at them: `blender -b -P build_scene.py -- --designs <jeemu-designs> --frames 125,290 --out out_test --width 1920 --height 1080 --samples 128 --gpu --screen-png out_test/screen.png`
(make `out_test/screen.png` with `python make_placeholder_screen.py out_test/screen.png`). The log line `Rendering on OPTIX ...` confirms the GPU is used.
