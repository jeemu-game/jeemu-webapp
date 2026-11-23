#!/usr/bin/env bash
# The FAQ close-ups: one per question, low and square to the block it's burnt into, the table soft behind (resumable).
# Usage: ./render_faq.sh [python-or-blender] [samples]
set -euo pipefail
cd "$(dirname "$0")"
PY=${1:-python3}; S=${2:-96}; EXTRA=${EXTRA:-}
BLOCKS=Block11,Block51,Block39,Block43,Block52,Block42,Block09
for k in 0 1 2 3 4 5 6; do
  [ -f "out/site/faq$k.png" ] || $PY build_room.py --view top2 --late --chapters --fallen fallen.json --faq-blocks $BLOCKS --faq-shot $k \
    --fire 0.25 --width 1600 --height 1600 --samples "$S" $EXTRA --out "out/site/faq$k.png" --meta "out/site/faq$k.json"
done
echo done
