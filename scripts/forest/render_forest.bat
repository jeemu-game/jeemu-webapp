@echo off
REM Forest story on Windows: Blender render -> composite over the photo plates -> encode the site videos.
REM   1. Blender 4.2+; Python with:  pip install pillow numpy imageio-ffmpeg
REM   2. If blender is not on PATH:  set BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe   (no quotes)
REM   3. scripts\forest\render_forest.bat C:\path\to\jeemu-designs C:\path\to\plates [out_dir] [width] [samples]
REM      plates folder: hero-desktop.png, hero-phone.png (required); fg-desktop.png, fg-phone.png, bark.png, moss.png (optional)
REM   Resumable (Ctrl+C, run again). Use a NEW out_dir if you change the width. For a one-minute look first: preview_forest.bat
setlocal EnableDelayedExpansion
if "%~2"=="" (echo usage: render_forest.bat ^<jeemu-designs^> ^<plates dir^> [out_dir] [width] [samples] & exit /b 1)
set DESIGNS=%~f1
set PLATES=%~f2
set OUT=%~3
if "%OUT%"=="" set OUT=out_forest
set W=%~4
if "%W%"=="" set W=1920
set SAMPLES=%~5
if "%SAMPLES%"=="" set SAMPLES=64
if "%TAG%"=="" set TAG=-v3
set /a H=%W%*9/16
set /a PW=%H%
set /a PH=%W%
if "%BLENDER%"=="" set BLENDER=blender
set HERE=%~dp0
set BL=%HERE%..\blender
if not exist "%OUT%" mkdir "%OUT%"
for %%I in ("%OUT%") do set OUT=%%~fI
copy /y "%BL%\assets\screen.png" "%OUT%\screen.png" >nul
set FGD=
set FGP=
set EXTRA=
if exist "%PLATES%\fg-desktop.png" set FGD=--fg "%PLATES%\fg-desktop.png"
if exist "%PLATES%\fg-phone.png" set FGP=--fg "%PLATES%\fg-phone.png"
if exist "%PLATES%\bark.png" set EXTRA=%EXTRA% --bark "%PLATES%\bark.png"
if exist "%PLATES%\moss.png" set EXTRA=%EXTRA% --moss "%PLATES%\moss.png"
echo === desktop %W%x%H%, %SAMPLES% samples ===
"%BLENDER%" -b -P "%BL%\build_scene.py" -- --designs "%DESIGNS%" --frames all --out "%OUT%\desktop" --width %W% --height %H% --samples %SAMPLES% --gpu --screen-png "%OUT%\screen.png" --forest --numbers %EXTRA% || exit /b 1
echo === phone %PW%x%PH% ===
"%BLENDER%" -b -P "%BL%\build_scene.py" -- --designs "%DESIGNS%" --portrait --frames all --out "%OUT%\portrait" --width %PW% --height %PH% --samples %SAMPLES% --gpu --screen-png "%OUT%\screen.png" --forest --numbers %EXTRA% || exit /b 1
python "%HERE%composite_story.py" "%OUT%\desktop" "%PLATES%\hero-desktop.png" "%OUT%\final-desktop" %FGD% || exit /b 1
python "%HERE%composite_story.py" "%OUT%\portrait" "%PLATES%\hero-phone.png" "%OUT%\final-portrait" %FGP% || exit /b 1
python "%BL%\encode_story_video.py" "%OUT%\final-desktop" "%HERE%..\..\public\story" --width 1920 --tag=%TAG% || exit /b 1
python "%BL%\encode_story_video.py" "%OUT%\final-portrait" "%HERE%..\..\public\story\mobile" --width %PW% --tag=%TAG% || exit /b 1
pushd "%HERE%..\.."
where node >nul 2>nul && node scripts\sync-frontend.mjs || echo Run: node scripts\sync-frontend.mjs
popd
echo Done. New files: public\story\*%TAG%.* and public\story\mobile\*%TAG%.*  Commit them to a branch and push; check the Vercel preview.
