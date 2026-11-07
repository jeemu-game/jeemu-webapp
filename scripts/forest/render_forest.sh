#!/usr/bin/env bash
# Forest story: render the console on its stump in Blender, composite it over the photo plates, encode the site videos.
# Needs Blender 4.2+, Python with:  pip install pillow numpy imageio-ffmpeg   (and `node` for the final mirror step; optional)
#
#   ./render_forest.sh <path to jeemu-designs> <plates dir> [out_dir] [width] [samples]
#
# <plates dir> must contain  hero-desktop.png  and  hero-phone.png  (the generated forest photos; see docs/forest-art-brief.md)
# and may contain            fg-desktop.png    and  fg-phone.png    (dark out-of-focus leaves on WHITE, multiplied over the shot).
# Resumable: stop with Ctrl+C and run it again, finished frames are skipped. Use a NEW out_dir if you change the width.
# Quick look first (about a minute):  ./preview_forest.sh <designs> <plates dir>
set -euo pipefail
DESIGNS="${1:?path to jeemu-designs}"; PLATES="${2:?folder with hero-desktop.png and hero-phone.png}"; OUT="${3:-./out_forest}"; W="${4:-1920}"; SAMPLES="${5:-64}"
TAG="${TAG:--v3}"
H=$(( W * 9 / 16 )); PW=$H; PH=$W        # the phone render is the same size rotated: 1080x1920 for a 1920 wide desktop render
HERE="$(cd "$(dirname "$0")" && pwd)"; BL="$HERE/../blender"
mkdir -p "$OUT"; cp "$BL/assets/screen.png" "$OUT/screen.png"
FGD=(); FGP=(); [ -f "$PLATES/fg-desktop.png" ] && FGD=(--fg "$PLATES/fg-desktop.png"); [ -f "$PLATES/fg-phone.png" ] && FGP=(--fg "$PLATES/fg-phone.png")
BARK=(); [ -f "$PLATES/bark.png" ] && BARK=(--bark "$PLATES/bark.png"); MOSS=(); [ -f "$PLATES/moss.png" ] && MOSS=(--moss "$PLATES/moss.png")
"${BLENDER:-blender}" -b -P "$BL/build_scene.py" -- --designs "$DESIGNS" --frames all --out "$OUT/desktop" --width "$W" --height "$H" --samples "$SAMPLES" --gpu --screen-png "$OUT/screen.png" --forest --numbers "${BARK[@]}" "${MOSS[@]}"
"${BLENDER:-blender}" -b -P "$BL/build_scene.py" -- --designs "$DESIGNS" --portrait --frames all --out "$OUT/portrait" --width "$PW" --height "$PH" --samples "$SAMPLES" --gpu --screen-png "$OUT/screen.png" --forest --numbers "${BARK[@]}" "${MOSS[@]}"
python3 "$HERE/composite_story.py" "$OUT/desktop" "$PLATES/hero-desktop.png" "$OUT/final-desktop" "${FGD[@]}"
python3 "$HERE/composite_story.py" "$OUT/portrait" "$PLATES/hero-phone.png" "$OUT/final-portrait" "${FGP[@]}"
python3 "$BL/encode_story_video.py" "$OUT/final-desktop" "$HERE/../../public/story" --width 1920 --tag="$TAG"
python3 "$BL/encode_story_video.py" "$OUT/final-portrait" "$HERE/../../public/story/mobile" --width "$PW" --tag="$TAG"
(cd "$HERE/../.." && command -v node >/dev/null && node scripts/sync-frontend.mjs) || echo "Run: node scripts/sync-frontend.mjs"
echo "Done. New files are public/story/*$TAG.* and public/story/mobile/*$TAG.*  (mirrored into frontend/). Commit them and push to a branch, then check the Vercel preview."
