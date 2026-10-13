"""Pack rendered PNG frames into trimmed shelf atlases (WebP) + manifest.json.

Usage: python pack_sprites.py <raw_root> <out_dir> [body=MALE]
Input : <raw_root>/<TEAM>_<ROLE>/<anim>_<DIR>_<NN>.png   (256x256 RGBA, anchor at (128, 184.32))
Output: <out_dir>/<team>_<role>_<body>.webp  and  <out_dir>/manifest.json
Frame rect {x,y,w,h} is the trimmed rect in the atlas; {ox,oy} = offset of the rect's top-left from the
anchor (feet) point in source pixels -- the engine draws at (anchorX + ox*scale, anchorY + oy*scale).
"""
import sys, os, re, json, glob
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
BODY = sys.argv[3] if len(sys.argv) > 3 else 'MALE'
RES = 256
SHIFT_Y = 0.22
ORTHO_SCALE = 3.6
ANCHOR_X = RES / 2
ANCHOR_Y = RES * (0.5 + SHIFT_Y)
ATLAS_W = 2048
PAD = 2
ALPHA_THRESHOLD = 8
WEBP_QUALITY = 82
ANIM_META = {'idle': (6, True), 'walk': (10, True), 'attack': (12, False),
             'cast': (10, False), 'hit': (12, False), 'death': (8, False)}
DIR_ORDER = ['SE', 'SW', 'NE', 'NW']

os.makedirs(OUT, exist_ok=True)
manifest = {
    'version': 1,
    'cellPx': RES,
    'anchor': {'x': ANCHOR_X, 'y': round(ANCHOR_Y, 2)},
    'pxPerWorldUnit': round(RES / ORTHO_SCALE, 3),
    'elevationDeg': 30,
    'directions': DIR_ORDER,
    'units': {},
}

pat = re.compile(r'^(\w+?)_(SE|SW|NE|NW)_(\d+)\.png$')
total_bytes = 0
heights = []
for unit_dir in sorted(glob.glob(os.path.join(RAW, '*_*'))):
    team, role = os.path.basename(unit_dir).split('_', 1)
    frames = []
    for f in sorted(os.listdir(unit_dir)):
        m = pat.match(f)
        if not m:
            continue
        anim, d, n = m.group(1), m.group(2), int(m.group(3))
        im = Image.open(os.path.join(unit_dir, f)).convert('RGBA')
        bbox = im.getchannel('A').point(lambda a: 255 if a > ALPHA_THRESHOLD else 0).getbbox()
        if bbox is None:
            continue
        frames.append({'anim': anim, 'dir': d, 'n': n, 'bbox': bbox, 'img': im.crop(bbox)})
    # shelf pack, tallest first
    order = sorted(frames, key=lambda fr: -fr['img'].size[1])
    x = y = shelf_h = 0
    for fr in order:
        w, h = fr['img'].size
        if x + w + PAD > ATLAS_W:
            x = 0
            y += shelf_h + PAD
            shelf_h = 0
        fr['x'], fr['y'] = x, y
        x += w + PAD
        shelf_h = max(shelf_h, h)
    atlas_h = y + shelf_h + PAD
    atlas = Image.new('RGBA', (ATLAS_W, atlas_h), (0, 0, 0, 0))
    for fr in order:
        atlas.paste(fr['img'], (fr['x'], fr['y']))
    name = f'{team.lower()}_{role.lower()}_{BODY.lower()}.webp'
    path = os.path.join(OUT, name)
    atlas.save(path, 'WEBP', quality=WEBP_QUALITY, alpha_quality=100, method=6)
    total_bytes += os.path.getsize(path)
    anims = {}
    for fr in sorted(frames, key=lambda q: (q['anim'], DIR_ORDER.index(q['dir']), q['n'])):
        a = anims.setdefault(fr['anim'], {'fps': ANIM_META[fr['anim']][0], 'loop': ANIM_META[fr['anim']][1], 'frames': {}})
        lst = a['frames'].setdefault(fr['dir'], [])
        w, h = fr['img'].size
        lst.append({'x': fr['x'], 'y': fr['y'], 'w': w, 'h': h,
                    'ox': round(fr['bbox'][0] - ANCHOR_X, 2), 'oy': round(fr['bbox'][1] - ANCHOR_Y, 2)})
    idle0 = next((fr for fr in frames if fr['anim'] == 'idle' and fr['dir'] == 'SE' and fr['n'] == 0), None)
    ref_h = (ANCHOR_Y - idle0['bbox'][1]) if idle0 else 0
    heights.append(ref_h)
    manifest['units'][f'{team}:{role}:{BODY}'] = {
        'file': name, 'atlas': {'w': ATLAS_W, 'h': atlas_h}, 'idleHeightPx': round(ref_h, 1), 'anims': anims}
    print(f'{team} {role}: {len(frames)} frames -> {name} {ATLAS_W}x{atlas_h} {os.path.getsize(path)/1024:.0f} KB')

heights.sort()
manifest['referenceHeightPx'] = round(heights[len(heights) // 2], 1) if heights else 0
with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, ensure_ascii=False, separators=(',', ':'))
print(f'TOTAL {total_bytes/1024/1024:.2f} MB, referenceHeightPx={manifest["referenceHeightPx"]}')
