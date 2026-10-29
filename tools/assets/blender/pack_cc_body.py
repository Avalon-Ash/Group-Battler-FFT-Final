"""Pack render_cc_body.py output into per-type WebP atlases + public/assets/cc_bodies/manifest.json.

Usage: python tools/assets/blender/pack_cc_body.py <render_dir> [out_dir=public/assets/cc_bodies]
Each direction (SE, SW, NE, NW) is trimmed to the colour frame's alpha bbox (+PAD) and laid out left to right; the
faction mask (sheep collar) is cropped with the same rect into a second atlas. Per frame the manifest stores the atlas
rect and the anchor (foot centre on the ground) inside that rect; runtime scale = HEX_SIZE / pxPerHex.
"""
import json, os, sys
from PIL import Image

PAD = 2
DIR_ORDER = ('SE', 'SW', 'NE', 'NW')
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else 'public/assets/cc_bodies'
os.makedirs(out, exist_ok=True)
with open(os.path.join(src, 'meta.json')) as f:
    meta = json.load(f)
ax0, ay0 = meta['anchor']
manifest = {'version': 1, 'pxPerHex': meta['pxPerHex'], 'elevationDeg': meta['elevationDeg'], 'types': {}}
for type_id, variants in meta['types'].items():
    by_dir = {v['dir']: v for v in variants}
    frames = []
    for d in DIR_ORDER:
        v = by_dir[d]
        im = Image.open(os.path.join(src, v['file'])).convert('RGBA')
        x0, y0, x1, y1 = im.getchannel('A').getbbox()
        box = (max(0, x0 - PAD), max(0, y0 - PAD), min(im.width, x1 + PAD), min(im.height, y1 + PAD))
        mask = Image.open(os.path.join(src, v['maskFile'])).convert('RGBA').crop(box) if 'maskFile' in v else None
        frames.append((d, im.crop(box), mask, ax0 - box[0], ay0 - box[1], v))
    w = sum(fr[1].width for fr in frames)
    h = max(fr[1].height for fr in frames)
    atlas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    mask_atlas = Image.new('RGBA', (w, h), (0, 0, 0, 0)) if frames[0][2] is not None else None
    x = 0
    defs = {}
    for d, img, mask, ax, ay, v in frames:
        atlas.paste(img, (x, 0))
        if mask_atlas is not None:
            mask_atlas.paste(mask, (x, 0))
        defs[d] = {'x': x, 'y': 0, 'w': img.width, 'h': img.height, 'ax': ax, 'ay': ay}
        x += img.width
    name = f'{type_id.lower()}.webp'
    atlas.save(os.path.join(out, name), 'WEBP', lossless=True, method=6)
    entry = {'file': name, 'atlas': {'w': w, 'h': h}, 'heightHex': max(fr[5]['heightHex'] for fr in frames), 'frames': defs}
    size = os.path.getsize(os.path.join(out, name))
    if mask_atlas is not None:
        mname = f'{type_id.lower()}_mask.webp'
        mask_atlas.save(os.path.join(out, mname), 'WEBP', lossless=True, method=6)
        entry['maskFile'] = mname
        size += os.path.getsize(os.path.join(out, mname))
    manifest['types'][type_id] = entry
    print(type_id, name, w, h, size)
with open(os.path.join(out, 'manifest.json'), 'w', newline='\n') as f:
    json.dump(manifest, f, indent=1)
    f.write('\n')
