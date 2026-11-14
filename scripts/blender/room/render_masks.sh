#!/usr/bin/env bash
# Mattes of Jeemu, the blocks and the polaroids for each site still, for composite_ai.py. Quick: 16 samples each.
# Usage: ./render_masks.sh [python-or-blender]
set -euo pipefail
cd "$(dirname "$0")"
PY=${1:-python}; EXTRA=${EXTRA:-}
mkdir -p out/mask
run() { name=$1; shift; [ -f "out/mask/$name.png" ] || $PY build_room.py "$@" --mask $EXTRA --out "out/mask/$name.png"; }
run close --view close --width 1920 --height 1080
run wide  --view wide  --width 1920 --height 1080
run play  --view play  --width 1920 --height 1080
run late  --view play  --late --width 1920 --height 1080
run top   --view top   --blank-photos --width 4800 --height 1524
run end   --view close --late --width 1920 --height 1080
echo done
