# Making the stills look photographed (free, on your own GPU)

Stable Diffusion XL in ComfyUI, image-to-image at low strength, with a depth ControlNet so nothing moves.
Runs on an RTX 3060 (12 GB). Afterwards `composite_ai.py` puts our exact Jeemu, blocks and polaroids back.

## 1. Install ComfyUI (once, about 15 minutes)
1. Download the Windows portable build for NVIDIA from the ComfyUI releases page on GitHub
   (`ComfyUI_windows_portable_nvidia.7z`) and extract it with 7-Zip, e.g. to `C:\ComfyUI`.
2. Run `run_nvidia_gpu.bat`. A browser tab opens at http://127.0.0.1:8188.
3. If there is no **Manager** button, install ComfyUI-Manager: in `C:\ComfyUI\ComfyUI\custom_nodes` run
   `git clone https://github.com/ltdrdata/ComfyUI-Manager`, then restart.
4. Manager → Custom Nodes Manager → install **ComfyUI's ControlNet Auxiliary Preprocessors** (comfyui_controlnet_aux). Restart.

## 2. Download the models (once, about 9 GB)
| What | File | Put it in |
|---|---|---|
| Photoreal SDXL checkpoint | **RealVisXL V5.0** (`RealVisXL_V5.0_fp16.safetensors`, Hugging Face `SG161222/RealVisXL_V5.0`) | `ComfyUI\models\checkpoints` |
| Depth ControlNet | **controlnet-union-sdxl-1.0** (`diffusion_pytorch_model_promax.safetensors`, Hugging Face `xinsir/controlnet-union-sdxl-1.0`) | `ComfyUI\models\controlnet` |

Check each model page's licence allows commercial use before publishing (both did when this was written).
Plain SDXL base (`stabilityai/stable-diffusion-xl-base-1.0`) also works if you'd rather use that.

## 3. Build the workflow (once)
Double-click empty canvas to search for nodes. Wire it like this:

```
Load Checkpoint ──MODEL──────────────────────────────────────► KSampler
               ├─CLIP──► CLIP Text Encode (positive) ──┐
               ├─CLIP──► CLIP Text Encode (negative) ──┤
               └─VAE───► VAE Encode / VAE Decode       ▼
Load Image ──► Depth Anything V2 ──► Apply ControlNet ◄── Load ControlNet Model
   │                                   (positive, negative in → out to KSampler)
   └──► VAE Encode ──LATENT──► KSampler ──► VAE Decode ──► Save Image
```

Settings:
- **Depth Anything V2**: model `depth_anything_v2_vitl.pth`, resolution 1024.
- **Apply ControlNet**: strength **0.6**, start 0.0, end **0.8**.
- **KSampler**: seed **24112026** (fixed, control after generate: *fixed*), steps **30**, cfg **5.0**,
  sampler **dpmpp_2m**, scheduler **karras**, denoise **0.30**.
- If it runs out of memory at 1920×1080, swap VAE Encode / VAE Decode for their **(Tiled)** versions.

Positive prompt:
```
RAW photo, interior photograph of a modern luxury living room at night, dark basalt stacked-stone fireplace with a real
wood fire, black steel floor-to-ceiling windows, dark pine treeline outside, smoked walnut coffee table, pillar candles,
wine glasses, warm firelight, full-frame camera, 35mm lens, f/1.8, shallow depth of field, natural film grain,
Architectural Digest, photorealistic
```
Negative prompt:
```
cgi, 3d render, video game, plastic, cartoon, illustration, painting, oversaturated, text, watermark, logo, blurry,
deformed, extra objects, people
```

Save the workflow (menu → Save) as `jeemu_enhance.json` so the next run is one click.

## 4. Run it
1. Load Image → pick `public/tonight/close.jpg` from the repo (or the files I send you). Queue.
2. Same for `wide.jpg`, `play.jpg`, `late.jpg`. **Do not change the seed, prompt or settings between them**, so the
   four pictures read as one room.
3. Try denoise 0.25, 0.30 and 0.35 on `wide.jpg` first, and keep the lowest that looks like a photo.
   Higher = more realistic but more changed. Above 0.4 things start moving.
4. Skip `top.jpg` (4800 px wide panorama of the table) for now; it needs a tiled upscaler.
5. Results land in `C:\ComfyUI\ComfyUI\output`. Rename them `close.png`, `wide.png`, `play.png`, `late.png`.

## 5. Put Jeemu back
Send the four PNGs back (or drop them in `scripts/blender/room/ai/`) and run, for each shot:
```
./render_masks.sh python      # once; mattes in out/mask/
uv run composite_ai.py ai/play.png ../../../public/tonight/play.jpg out/mask/play.png ../../../public/tonight/play.jpg
```
It lines the AI picture up with the render, matches colour, and pastes our product, blocks and polaroids back on,
so the site's live screen and photo overlays still fit exactly.
