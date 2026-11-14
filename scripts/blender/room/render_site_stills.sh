#!/usr/bin/env bash
# Renders the stills the website preview uses, with their overlay corner files, into out/site/.
# Usage: ./render_site_stills.sh [python-or-blender] [samples]    (add --gpu to EXTRA on a GPU machine)
set -euo pipefail
cd "$(dirname "$0")"
PY=${1:-python}; S=${2:-128}; EXTRA=${EXTRA:-}
mkdir -p out/site
run() { name=$1; shift; [ -f "out/site/$name.png" ] || $PY build_room.py "$@" --samples "$S" $EXTRA --out "out/site/$name.png" --meta "out/site/$name.json"; }
run close --view close --fire 0.3 --blank-photos --width 1920 --height 1080
run wide  --view wide  --fire 0.7 --blank-photos --width 1920 --height 1080
run play  --view play  --fire 1.0 --blank-photos --width 1920 --height 1080
run late  --view play  --late --blank-photos     --width 1920 --height 1080
run top   --view top   --fire 1.0 --blank-photos --width 4800 --height 1524
run end   --view close --late --fire 0.25 --blank-photos --width 1920 --height 1080   # the waitlist: the screen at the end of the night
run top2  --view top2  --late --chapters --blank-photos --fire 0.25 --width 4800 --height 2520   # after the waitlist: story, team, FAQ
echo done
