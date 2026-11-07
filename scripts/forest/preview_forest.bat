@echo off
REM One-minute look: 5 low-res stills composited over your plates. Check lighting, scale and shadows BEFORE the full render.
REM   scripts\forest\preview_forest.bat C:\path\to\jeemu-designs C:\path\to\plates [out_dir]
REM   Then open out_forest_preview\preview_desktop and \preview_phone (the .jpg files; 0132 is the wide shot).
setlocal EnableDelayedExpansion
if "%~2"=="" (echo usage: preview_forest.bat ^<jeemu-designs^> ^<plates dir^> [out_dir] & exit /b 1)
set DESIGNS=%~f1
set PLATES=%~f2
set OUT=%~3
if "%OUT%"=="" set OUT=out_forest_preview
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
"%BLENDER%" -b -P "%BL%\build_scene.py" -- --designs "%DESIGNS%" --frames 0,132,170,230,395 --out "%OUT%\desktop" --width 1280 --height 720 --samples 32 --screen-png "%OUT%\screen.png" --forest --numbers %EXTRA% || exit /b 1
"%BLENDER%" -b -P "%BL%\build_scene.py" -- --designs "%DESIGNS%" --portrait --frames 0,132,170,230,395 --out "%OUT%\portrait" --width 720 --height 1280 --samples 32 --screen-png "%OUT%\screen.png" --forest --numbers %EXTRA% || exit /b 1
python "%HERE%composite_story.py" "%OUT%\desktop" "%PLATES%\hero-desktop.png" "%OUT%\preview_desktop" %FGD% || exit /b 1
python "%HERE%composite_story.py" "%OUT%\portrait" "%PLATES%\hero-phone.png" "%OUT%\preview_phone" %FGP% || exit /b 1
python -c "import sys,glob,os; from PIL import Image; [Image.open(f).convert('RGB').save(f[:-4]+'.jpg',quality=88) for k in ('preview_desktop','preview_phone') for f in glob.glob(os.path.join(sys.argv[1],k,'*.png'))]" "%OUT%"
echo Open %OUT%\preview_desktop and %OUT%\preview_phone
