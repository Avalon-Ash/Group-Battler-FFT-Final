"""Pack render_obstacle.py output into per-type WebP atlases + public/assets/obstacles/manifest.json (VISUAL_ROADMAP O1).

Usage: python tools/assets/blender/pack_obstacles.py <render_dir> [out_dir=public/assets/obstacles]
Each variant is trimmed to its alpha bbox (+PAD) and laid out left to right. Per variant the manifest stores the
atlas rect and the anchor (cell centre on the ground) inside that rect; runtime scale = HEX_SIZE / pxPerHex.
"""
import json, os, sys
from PIL import Image

PAD = 2
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else 'public/assets/obstacles'
os.makedirs(out, exist_ok=True)
with open(os.path.join(src, 'meta.json')) as f:
    meta = json.load(f)
ax0, ay0 = meta['anchor']
manifest = {'version': 1, 'pxPerHex': meta['pxPerHex'], 'elevationDeg': meta['elevationDeg'], 'types': {}}
for type_id, variants in meta['types'].items():
    frames = []
    for v in variants:
        im = Image.open(os.path.join(src, v['file'])).convert('RGBA')
        x0, y0, x1, y1 = im.getchannel('A').getbbox()
        x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
        x1, y1 = min(im.width, x1 + PAD), min(im.height, y1 + PAD)
        frames.append((im.crop((x0, y0, x1, y1)), ax0 - x0, ay0 - y0, v))
    w = sum(fr[0].width for fr in frames)
    h = max(fr[0].height for fr in frames)
    atlas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = 0
    defs = []
    for img, ax, ay, v in frames:
        atlas.paste(img, (x, 0))
        defs.append({'x': x, 'y': 0, 'w': img.width, 'h': img.height, 'ax': ax, 'ay': ay, 'heightHex': round(v['heightHex'], 3), 'source': v['source']})
        x += img.width
    name = f'{type_id.lower()}.webp'
    atlas.save(os.path.join(out, name), 'WEBP', lossless=True, method=6)
    manifest['types'][type_id] = {'file': name, 'atlas': {'w': w, 'h': h}, 'variants': defs}
    print(type_id, name, w, h, os.path.getsize(os.path.join(out, name)))
with open(os.path.join(out, 'manifest.json'), 'w', newline='\n') as f:
    json.dump(manifest, f, indent=1)
    f.write('\n')
