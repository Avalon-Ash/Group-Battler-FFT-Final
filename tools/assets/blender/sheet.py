"""Build a contact sheet: rows = clip x direction, columns = frames. Usage: python sheet.py <frames_dir> <out.png> [cell]"""
import sys, os, glob
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 256
clips = ['idle', 'attack', 'death']
dirs = ['SE', 'SW', 'NE', 'NW']
rows = []
for c in clips:
    for d in dirs:
        files = sorted(glob.glob(os.path.join(src, f'{c}_{d}_*.png')))
        rows.append(files)
cols = max(len(r) for r in rows)
sheet = Image.new('RGBA', (cols * cell, len(rows) * cell), (58, 62, 70, 255))
for ri, files in enumerate(rows):
    for ci, f in enumerate(files):
        im = Image.open(f).convert('RGBA')
        if im.size[0] != cell:
            im = im.resize((cell, cell), Image.LANCZOS)
        sheet.alpha_composite(im, (ci * cell, ri * cell))
sheet.convert('RGB').save(out)
print('saved', out, sheet.size)
