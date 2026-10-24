@echo off
REM Final render on a Windows GPU PC. Resumable: Ctrl+C, then run the same command again and finished frames are skipped.
REM   1. Blender 4.2+ (tested on 5.2) and Python with:  pip install pillow numpy imageio-ffmpeg
REM   2. If blender is not on PATH:  set BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe   (no quotes)
REM   3. Run:  scripts\blender\render_sequence.bat C:\path\to\jeemu-designs [out_dir] [width] [samples]
REM      Renders EVERY frame (396 desktop + 396 phone), then encodes the story videos into public\story.
REM      Use a NEW out_dir each time the camera/timeline changes (old frames are not re-rendered).
setlocal
if "%~1"=="" (echo usage: render_sequence.bat ^<path to jeemu-designs^> [out_dir] [width] [samples] & exit /b 1)
set DESIGNS=%~1
set OUT=%~2
if "%OUT%"=="" set OUT=out_story
set W=%~3
if "%W%"=="" set W=1920
set SAMPLES=%~4
if "%SAMPLES%"=="" set SAMPLES=48
set /a H=%W%*9/16
if "%BLENDER%"=="" set BLENDER=blender
if not exist "%OUT%" mkdir "%OUT%"
for %%I in ("%OUT%") do set OUT=%%~fI
for %%I in ("%DESIGNS%") do set DESIGNS=%%~fI
copy /y "%~dp0assets\screen.png" "%OUT%\screen.png"
if not exist "%OUT%\screen.png" (echo COULD NOT CREATE %OUT%\screen.png from %~dp0assets\screen.png & exit /b 1)
echo === desktop (%W%x%H%, %SAMPLES% samples, all frames) ===
"%BLENDER%" -b -P "%~dp0build_scene.py" -- --designs "%DESIGNS%" --frames all --out "%OUT%" --width %W% --height %H% --samples %SAMPLES% --gpu --screen-png "%OUT%\screen.png" || exit /b 1
echo === phone (1080x1920) ===
"%BLENDER%" -b -P "%~dp0build_scene.py" -- --designs "%DESIGNS%" --portrait --frames all --out "%OUT%\portrait" --width 1080 --height 1920 --samples %SAMPLES% --gpu --screen-png "%OUT%\screen.png" || exit /b 1
python "%~dp0encode_story_video.py" "%OUT%" "%~dp0..\..\public\story" --width 1920 || exit /b 1
python "%~dp0encode_story_video.py" "%OUT%\portrait" "%~dp0..\..\public\story\mobile" --width 1080 || exit /b 1
echo Done. Copy public\story to frontend\public\story (npm run sync:frontend), commit and push.
