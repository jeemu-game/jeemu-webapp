#!/usr/bin/env bash
# The fireplace with filmed fire: every shot that shows the firebox gets it lit but empty (no rendered flames or logs);
# the site lays the filmed flames over it. Room shots get a small patch (only the firebox region is re-rendered);
# the fall frames and the waitlist close-up are rendered that way from the start.
# Usage: ./render_clean.sh [python-or-blender] [samples]
set -euo pipefail
cd "$(dirname "$0")"
PY=${1:-python}; S=${2:-128}; EXTRA=${EXTRA:-}
mkdir -p out/site
patch() { name=$1; shift; [ -f "out/site/${name}_patch.png" ] || $PY build_room.py "$@" --no-flames --patch --blank-photos --samples "$S" $EXTRA --width 1920 --height 1080 --out "out/site/${name}_patch.png"; }
patch wide  --view wide  --fire 0.7
patch close --view close --fire 0.3
patch play  --view play  --fire 1.0
patch late  --view play  --late
# the fall, then the two shots after it with the blocks where they landed
mkdir -p out/site/fall
$PY build_room.py --view play --late --no-flames --blank-photos --fall out/site/fall --fall-frames 48 --fall-range 12 42 --width 1280 --height 720 --samples 64 $EXTRA
cp out/site/fall/fallen.json fallen.json
[ -f out/site/end.png ] || $PY build_room.py --view close --late --fire 0.25 --no-flames --blank-photos --fallen fallen.json --width 1920 --height 1080 --samples "$S" $EXTRA --out out/site/end.png --meta out/site/end.json
[ -f out/site/top2.png ] || $PY build_room.py --view top2 --late --chapters --blank-photos --fallen fallen.json --fire 0.25 --width 4800 --height 2520 --samples "$S" $EXTRA --out out/site/top2.png --meta out/site/top2.json
# where the firebox mouth shows, so the filmed fire stays behind the tower
fm() { name=$1; shift; [ -f "out/site/${name}_firemask.png" ] || $PY build_room.py "$@" --fire-mask --out "out/site/${name}_firemask.png"; }
fm wide  --view wide  --width 1920 --height 1080
fm close --view close --width 1920 --height 1080
fm play  --view play  --width 1920 --height 1080
fm late  --view play  --late --width 1920 --height 1080
fm end   --view close --late --fallen fallen.json --width 1920 --height 1080
echo done
