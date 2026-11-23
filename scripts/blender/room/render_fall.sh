#!/usr/bin/env bash
# The tower falling (for "Be there when it falls"), and the two shots that come after it with the blocks where they landed.
# fallen.json is the saved end of the collapse (the simulation is deterministic: same scene, same result).
# Usage: ./render_fall.sh [python-or-blender] [samples]
set -euo pipefail
cd "$(dirname "$0")"
PY=${1:-python}; S=${2:-64}; EXTRA=${EXTRA:-}
mkdir -p out/site/fall
$PY build_room.py --view play --late --blank-photos --fall out/site/fall --fall-frames 48 --fall-range 12 42 --width 1280 --height 720 --samples "$S" $EXTRA
cp out/site/fall/fallen.json fallen.json
for v in end top2; do rm -f "out/site/$v.png" "out/site/$v.json"; done
$PY build_room.py --view close --late --fire 0.25 --blank-photos --fallen fallen.json --width 1920 --height 1080 --samples 128 $EXTRA --out out/site/end.png --meta out/site/end.json
$PY build_room.py --view top2 --late --chapters --blank-photos --fallen fallen.json --fire 0.25 --width 4800 --height 2520 --samples 128 $EXTRA --out out/site/top2.png --meta out/site/top2.json
echo done
