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

## Other options
`--look dark|light|scandi`, `--view wide|play|over|close|top`, `--fire 0..1`, `--sky`, `--sky-rot`, `--samples`,
`--gpu`, `--save-blend file.blend` (to open the built scene in Blender).

`post.py` adds what a real lens adds (bloom, slight colour fringing, vignette). Film grain is added live by the site.
