# "Tonight" room: renders for the landing page

`build_room.py` opens the product scene (`../jeemu.blend`), builds the night living room around it and renders one
still. Free CC0 textures, models and the night sky come from Poly Haven and are cached in `.cache/` on first run.

## Stills the website uses
```
./render_site_stills.sh blender 256          # or: EXTRA=--gpu ./render_site_stills.sh "blender -b -P" 512
python prepare_site_assets.py                # post-processes and copies them to public/tonight/
npm run sync:frontend                        # mirror into frontend/ (what Vercel builds)
```
`render_site_stills.sh` writes `out/site/{close,wide,play,late,top}.png` plus a `.json` next to each with the corners
of the Jeemu screen and of every polaroid's picture and caption strip, in image pixels. The site warps the live
screen, the photos and the handwriting onto those corners, so copy and photos change without re-rendering.
Finished files are skipped, so the script can be stopped and resumed.

| Shot | View | Notes |
|---|---|---|
| close | `--view close --fire 0.3` | opening shot: the screen, embers |
| wide | `--view wide --fire 0.7` | the room |
| play | `--view play` | locked gameplay shot, full fire |
| top | `--view top --blank-photos` | straight down on the polaroids (orthographic); white picture areas take the photos |
| late | `--view play --late` | end of the night: embers, empty glasses, gappy tower, pulled blocks on the table |

On a GPU, render `top` larger for a sharper pan, e.g. `--width 7200 --height 2286` (keep the 3.15:1 ratio).

## The product
`prototype.py` dresses the CAD model as the real prototype from the shoot: speckled black print with layer lines,
JEEMU in mint (Bagel Fat One) on the recessed plate, the frog on the other side, pale pine blocks with a number
written on in pen (sides and ends) and a grey frog stamp top and bottom. Check it with `--view product` and `--view frog`.

## Making the room look photographed (optional AI pass)
An image model can add real-photo detail to the room, but it redraws the product. So keep its room and put our
Jeemu back:
```
./render_masks.sh python                     # mattes of Jeemu, blocks and polaroids -> out/mask/
# run public/tonight/<shot>.jpg through the image model (image-to-image, low strength), save as ai/<shot>.png
uv run composite_ai.py ai/play.png ../../../public/tonight/play.jpg out/mask/play.png ../../../public/tonight/play.jpg
```
`composite_ai.py` lines the AI picture up with the render (it may be cropped or a different size), matches its
colour, and pastes the render's product, blocks and polaroids over it, so the site's overlays stay exact.

## Other options
`--look dark|light|scandi`, `--view wide|play|over|close|top|product|frog`, `--mask`, `--fire 0..1`, `--sky`, `--sky-rot`, `--samples`,
`--gpu`, `--save-blend file.blend` (to open the built scene in Blender).

`post.py` adds what a real lens adds (bloom, slight colour fringing, vignette). Film grain is added live by the site.
