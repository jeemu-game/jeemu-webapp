#!/usr/bin/env bash
# Final render on a GPU machine. Resumable. Needs Blender 4.2+ and `pip install pillow numpy imageio-ffmpeg`.
#   ./render_sequence.sh /path/to/jeemu-designs [out_dir] [width] [samples]
# Renders every frame (396 desktop + 396 phone) then encodes public/story/story.mp4|webm (+ mobile/). Use a NEW out_dir when the camera/timeline changes.
set -euo pipefail
DESIGNS="${1:?path to the jeemu-designs repo}"; OUT="${2:-./out_story}"; W="${3:-1920}"; SAMPLES="${4:-48}"
H=$(( W * 9 / 16 ))
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
cp "$HERE/assets/screen.png" "$OUT/screen.png"
"${BLENDER:-blender}" -b -P "$HERE/build_scene.py" -- --designs "$DESIGNS" --frames all --out "$OUT" \
  --width "$W" --height "$H" --samples "$SAMPLES" --gpu --screen-png "$OUT/screen.png"
"${BLENDER:-blender}" -b -P "$HERE/build_scene.py" -- --designs "$DESIGNS" --portrait --frames all --out "$OUT/portrait" \
  --width 1080 --height 1920 --samples "$SAMPLES" --gpu --screen-png "$OUT/screen.png"
python3 "$HERE/encode_story_video.py" "$OUT" "$HERE/../../public/story" --width 1920
python3 "$HERE/encode_story_video.py" "$OUT/portrait" "$HERE/../../public/story/mobile" --width 1080
echo "Done. Run npm run sync:frontend, then commit and push."
