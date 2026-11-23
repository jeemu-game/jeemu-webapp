"""Writes jeemu_enhance.json: the ComfyUI workflow for the AI pass (drag the file into ComfyUI).
SDXL image-to-image at low denoise with a depth ControlNet, so the room gains photo detail but nothing moves."""
import json, os

POS = ("RAW photo, interior photograph of a modern luxury living room at night, dark basalt stacked-stone fireplace "
       "with a real wood fire, black steel floor-to-ceiling windows, dark pine treeline outside, smoked walnut coffee "
       "table, pillar candles, wine glasses, warm firelight, full-frame camera, 35mm lens, f/1.8, shallow depth of "
       "field, natural film grain, Architectural Digest, photorealistic")
NEG = ("cgi, 3d render, video game, plastic, cartoon, illustration, painting, oversaturated, text, watermark, logo, "
       "blurry, deformed, extra objects, people")
NOTE = ("JEEMU AI PASS\n\n1. Load Image: pick one still (close, wide, play or late .jpg).\n"
        "2. Press Queue (Run). Result goes to ComfyUI/output as jeemu_ai_*.png.\n"
        "3. Do all four stills with the SAME settings, so they look like one room.\n\n"
        "Denoise (KSampler) is the one knob: 0.25 safe, 0.30 default, 0.35 more photo. Above 0.4 things move.\n"
        "Out of memory? Replace VAE Encode / VAE Decode with their (Tiled) versions.\n\n"
        "Models: RealVisXL_V5.0_fp16.safetensors in models/checkpoints,\n"
        "diffusion_pytorch_model_promax.safetensors (xinsir controlnet-union-sdxl-1.0) in models/controlnet.\n"
        "Depth node needs 'ComfyUI's ControlNet Auxiliary Preprocessors' (install with Manager).")

nodes, links = [], []
def node(nid, typ, pos, size, inputs, outputs, widgets, title=None, color=None):
    n = {'id': nid, 'type': typ, 'pos': pos, 'size': size, 'flags': {}, 'order': len(nodes), 'mode': 0,
         'inputs': [{'name': a, 'type': t, 'link': None} for a, t in inputs],
         'outputs': [{'name': a, 'type': t, 'slot_index': i, 'links': []} for i, (a, t) in enumerate(outputs)],
         'properties': {'Node name for S&R': typ}, 'widgets_values': widgets}
    if title: n['title'] = title
    if color: n['color'], n['bgcolor'] = color
    nodes.append(n); return nid
def link(a, ao, b, bi):
    na = next(n for n in nodes if n['id'] == a); nb = next(n for n in nodes if n['id'] == b)
    t = na['outputs'][ao]['type']; slot = [i['name'] for i in nb['inputs']].index(bi)
    assert nb['inputs'][slot]['type'] == t, (a, b, bi)
    lid = len(links) + 1; links.append([lid, a, ao, b, slot, t])
    na['outputs'][ao]['links'].append(lid); nb['inputs'][slot]['link'] = lid

GREEN, PURPLE = ('#232', '#353'), ('#323', '#535')
node(1, 'CheckpointLoaderSimple', [40, 120], [330, 100], [], [('MODEL', 'MODEL'), ('CLIP', 'CLIP'), ('VAE', 'VAE')],
     ['RealVisXL_V5.0_fp16.safetensors'])
node(2, 'CLIPTextEncode', [420, 40], [420, 200], [('clip', 'CLIP')], [('CONDITIONING', 'CONDITIONING')], [POS],
     title='Positive prompt', color=GREEN)
node(3, 'CLIPTextEncode', [420, 280], [420, 150], [('clip', 'CLIP')], [('CONDITIONING', 'CONDITIONING')], [NEG],
     title='Negative prompt', color=PURPLE)
node(4, 'LoadImage', [40, 480], [330, 380], [], [('IMAGE', 'IMAGE'), ('MASK', 'MASK')], ['wide.jpg', 'image'],
     title='Load Image (the still)')
node(5, 'DepthAnythingV2Preprocessor', [420, 480], [330, 82], [('image', 'IMAGE')], [('IMAGE', 'IMAGE')],
     ['depth_anything_v2_vitl.pth', 1024])
node(6, 'ControlNetLoader', [420, 620], [420, 60], [], [('CONTROL_NET', 'CONTROL_NET')],
     ['diffusion_pytorch_model_promax.safetensors'])
node(7, 'SetUnionControlNetType', [420, 720], [330, 60], [('control_net', 'CONTROL_NET')], [('CONTROL_NET', 'CONTROL_NET')],
     ['depth'])
node(8, 'ControlNetApplyAdvanced', [900, 300], [320, 190],
     [('positive', 'CONDITIONING'), ('negative', 'CONDITIONING'), ('control_net', 'CONTROL_NET'), ('image', 'IMAGE'), ('vae', 'VAE')],
     [('positive', 'CONDITIONING'), ('negative', 'CONDITIONING')], [0.6, 0.0, 0.8])
node(9, 'VAEEncode', [900, 560], [210, 46], [('pixels', 'IMAGE'), ('vae', 'VAE')], [('LATENT', 'LATENT')], [])
node(10, 'KSampler', [1270, 120], [320, 262],
     [('model', 'MODEL'), ('positive', 'CONDITIONING'), ('negative', 'CONDITIONING'), ('latent_image', 'LATENT')],
     [('LATENT', 'LATENT')], [24112026, 'fixed', 30, 5.0, 'dpmpp_2m', 'karras', 0.30], title='KSampler (denoise = strength)')
node(11, 'VAEDecode', [1640, 120], [210, 46], [('samples', 'LATENT'), ('vae', 'VAE')], [('IMAGE', 'IMAGE')], [])
node(12, 'SaveImage', [1640, 220], [520, 330], [('images', 'IMAGE')], [], ['jeemu_ai'])
node(13, 'Note', [1270, 600], [520, 300], [], [], [NOTE], title='How to use')

link(1, 0, 10, 'model'); link(1, 1, 2, 'clip'); link(1, 1, 3, 'clip')
link(2, 0, 8, 'positive'); link(3, 0, 8, 'negative')
link(4, 0, 5, 'image'); link(5, 0, 8, 'image'); link(6, 0, 7, 'control_net'); link(7, 0, 8, 'control_net')
link(1, 2, 8, 'vae'); link(4, 0, 9, 'pixels'); link(1, 2, 9, 'vae')
link(8, 0, 10, 'positive'); link(8, 1, 10, 'negative'); link(9, 0, 10, 'latent_image')
link(10, 0, 11, 'samples'); link(1, 2, 11, 'vae'); link(11, 0, 12, 'images')

wf = {'last_node_id': 13, 'last_link_id': len(links), 'nodes': nodes, 'links': links, 'groups': [], 'config': {},
      'extra': {'ds': {'scale': 0.75, 'offset': [40, 40]}}, 'version': 0.4}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jeemu_enhance.json')
json.dump(wf, open(out, 'w'), indent=1); print('wrote', out, len(nodes), 'nodes', len(links), 'links')
