#!/usr/bin/env bash
# One-minute look: renders 5 stills at low resolution (the wide stop, two mid-move frames and both close-ups), composites them over your plates,
# and writes preview_desktop/*.jpg and preview_phone/*.jpg. Check the lighting, scale and shadows here BEFORE the full render.
#   ./preview_forest.sh <path to jeemu-designs> <plates dir> [out_dir]
set -euo pipefail
DESIGNS="${1:?path to jeemu-designs}"; PLATES="${2:?plates dir}"; OUT="${3:-./out_forest_preview}"
HERE="$(cd "$(dirname "$0")" && pwd)"; BL="$HERE/../blender"
mkdir -p "$OUT"; cp "$BL/assets/screen.png" "$OUT/screen.png"
FR="0,132,170,230,395"
FGD=(); FGP=(); [ -f "$PLATES/fg-desktop.png" ] && FGD=(--fg "$PLATES/fg-desktop.png"); [ -f "$PLATES/fg-phone.png" ] && FGP=(--fg "$PLATES/fg-phone.png")
BARK=(); [ -f "$PLATES/bark.png" ] && BARK=(--bark "$PLATES/bark.png"); MOSS=(); [ -f "$PLATES/moss.png" ] && MOSS=(--moss "$PLATES/moss.png")
"${BLENDER:-blender}" -b -P "$BL/build_scene.py" -- --designs "$DESIGNS" --frames "$FR" --out "$OUT/desktop" --width 1280 --height 720 --samples 32 --screen-png "$OUT/screen.png" --forest --numbers "${BARK[@]}" "${MOSS[@]}"
"${BLENDER:-blender}" -b -P "$BL/build_scene.py" -- --designs "$DESIGNS" --portrait --frames "$FR" --out "$OUT/portrait" --width 720 --height 1280 --samples 32 --screen-png "$OUT/screen.png" --forest --numbers "${BARK[@]}" "${MOSS[@]}"
python3 "$HERE/composite_story.py" "$OUT/desktop" "$PLATES/hero-desktop.png" "$OUT/preview_desktop" "${FGD[@]}"
python3 "$HERE/composite_story.py" "$OUT/portrait" "$PLATES/hero-phone.png" "$OUT/preview_phone" "${FGP[@]}"
python3 - "$OUT" <<'PY'
import sys, glob, os
from PIL import Image
for k in ('preview_desktop', 'preview_phone'):
    for f in glob.glob(os.path.join(sys.argv[1], k, '*.png')):
        Image.open(f).convert('RGB').save(f[:-4] + '.jpg', quality=88)
PY
echo "Open $OUT/preview_desktop and $OUT/preview_phone (the .jpg files; frame 0132 is the wide shot)."
