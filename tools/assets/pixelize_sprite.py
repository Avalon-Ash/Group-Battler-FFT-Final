"""P0b 3D-to-pixel pass: Blender frames (no outline) -> pixel sprites (ART_SPEC §12-4, §12-5).

Steps per target height:
  1. one framing for all frames (union bbox), area-downscale in premultiplied alpha
  2. binary alpha (threshold 0.5)
  3. one shared palette for all frames (median cut, no dither)
  4. 1px outline in the sprite's darkest palette color, darkened (not pure black)
Outputs <out>/<name>_h<H>_sheet.png (rows = anim x dir, cols = frames), a nearest-neighbour
zoom view (_zoom.png) and a palette strip (_palette.png).

Usage: python -I tools/assets/pixelize_sprite.py <frames_dir> <out_dir> [--heights=20,30] [--colors=14] [--zoom=6]
Frames are named <anim>_<DIR>_<NN>.png (render_unit.py convention).
"""
import os
import re
import sys
from PIL import Image, ImageEnhance

ALPHA_THRESHOLD = 128
GAP = 2  # px between cells in the sheet
BG = (0, 0, 0, 0)
ZOOM_BG = (112, 112, 120, 255)  # mid grey so the dark outline is visible
# pixel art reads punchier than the toon render; lift before quantizing
SATURATION = 1.25
CONTRAST = 1.15
# outline = darkest palette color darkened (the raw darkest is often a mid-tone shadow and vanishes as an outline)
OUTLINE_DARKEN = 0.45
DIR_ORDER = ['SE', 'SW', 'NE', 'NW']


def arg(name, default):
    for a in sys.argv[3:]:
        if a.startswith(f'--{name}='):
            return a.split('=', 1)[1]
    return default


def load_frames(src):
    pat = re.compile(r'^(?P<anim>[a-z]+)_(?P<dir>[A-Z]{2})_(?P<n>\d+)\.png$')
    frames = {}
    for f in sorted(os.listdir(src)):
        m = pat.match(f)
        if not m:
            continue
        frames.setdefault((m['anim'], m['dir']), []).append((int(m['n']), Image.open(os.path.join(src, f)).convert('RGBA')))
    if not frames:
        sys.exit(f'no <anim>_<DIR>_<NN>.png frames in {src}')
    return {k: [im for _, im in sorted(v, key=lambda t: t[0])] for k, v in frames.items()}


def union_bbox(images):
    box = None
    for im in images:
        b = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return box


def downscale(im, scale):
    w, h = im.size
    tw, th = max(1, round(w * scale)), max(1, round(h * scale))
    small = im.convert('RGBa').resize((tw, th), Image.BOX).convert('RGBA')
    a = small.getchannel('A').point(lambda v: 255 if v >= ALPHA_THRESHOLD else 0)
    small.putalpha(a)
    rgb = ImageEnhance.Color(small.convert('RGB')).enhance(SATURATION)
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out


def opaque_mean(images):
    total, n = 0.0, 0
    for im in images:
        for r, g, b, a in pixel_data(im):
            if a:
                total += luminance((r, g, b))
                n += 1
    return total / max(1, n)


def apply_contrast(im, pivot):
    """Contrast around one pivot shared by every frame (per-frame pivots shift colors frame to frame)."""
    lut = [max(0, min(255, round(pivot + (v - pivot) * CONTRAST))) for v in range(256)]
    rgb = im.convert('RGB').point(lut * 3)
    out = rgb.convert('RGBA')
    out.putalpha(im.getchannel('A'))
    return out


def pixel_data(im):
    return im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()


def luminance(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def build_palette(images, colors):
    pixels = []
    for im in images:
        for r, g, b, a in pixel_data(im):
            if a:
                pixels.append((r, g, b))
    strip = Image.new('RGB', (len(pixels), 1))
    strip.putdata(pixels)
    q = strip.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[: colors * 3]
    return q, [tuple(pal[i:i + 3]) for i in range(0, len(pal), 3)]


def apply_palette(im, pal_img, palette):
    rgb = im.convert('RGB').quantize(palette=pal_img, dither=Image.Dither.NONE).convert('RGB')
    out = rgb.convert('RGBA')
    out.putalpha(im.getchannel('A'))
    return out


def add_outline(im, color):
    w, h = im.size
    padded = Image.new('RGBA', (w + 2, h + 2), BG)
    padded.paste(im, (1, 1))
    src = padded.load()
    out = padded.copy()
    dst = out.load()
    for y in range(h + 2):
        for x in range(w + 2):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w + 2 and 0 <= ny < h + 2 and src[nx, ny][3]:
                    dst[x, y] = (*color, 255)
                    break
    return out


def main():
    src, out = sys.argv[1], sys.argv[2]
    heights = [int(v) for v in arg('heights', '20,30').split(',')]
    colors = int(arg('colors', '14'))
    zoom = int(arg('zoom', '6'))
    name = os.path.basename(os.path.normpath(src))
    os.makedirs(out, exist_ok=True)
    frames = load_frames(src)
    keys = sorted(frames, key=lambda k: (k[0], DIR_ORDER.index(k[1]) if k[1] in DIR_ORDER else 9))
    all_imgs = [im for k in keys for im in frames[k]]
    box = union_bbox(all_imgs)
    idle_box = union_bbox([im for k in keys if k[0] == 'idle' for im in frames[k]]) or box
    char_h = idle_box[3] - idle_box[1]
    for th in heights:
        scale = th / char_h
        cropped = {k: [downscale(im.crop(box), scale) for im in frames[k]] for k in keys}
        pivot = opaque_mean([im for k in keys for im in cropped[k]])
        cropped = {k: [apply_contrast(im, pivot) for im in v] for k, v in cropped.items()}
        flat = [im for k in keys for im in cropped[k]]
        pal_img, palette = build_palette(flat, colors)
        darkest = tuple(round(v * OUTLINE_DARKEN) for v in min(palette, key=luminance))
        cells = {k: [add_outline(apply_palette(im, pal_img, palette), darkest) for im in cropped[k]] for k in keys}
        cw, ch = cells[keys[0]][0].size
        cols = max(len(v) for v in cells.values())
        sheet = Image.new('RGBA', (cols * (cw + GAP), len(keys) * (ch + GAP)), BG)
        for r, k in enumerate(keys):
            for c, im in enumerate(cells[k]):
                sheet.paste(im, (c * (cw + GAP), r * (ch + GAP)))
        base = os.path.join(out, f'{name}_h{th}')
        sheet.save(f'{base}_sheet.png')
        z = Image.new('RGBA', sheet.size, ZOOM_BG)
        z.alpha_composite(sheet)
        z.resize((sheet.width * zoom, sheet.height * zoom), Image.NEAREST).save(f'{base}_zoom.png')
        strip = Image.new('RGB', ((len(palette) + 1) * 16, 16))  # last swatch = outline
        for i, c in enumerate(sorted(palette, key=luminance) + [darkest]):
            strip.paste(c, (i * 16, 0, (i + 1) * 16, 16))
        strip.save(f'{base}_palette.png')
        print(f'{name} h={th}: cell {cw}x{ch}, {len(keys)} rows x {cols} frames, {len(palette)} colors, outline {darkest}')


if __name__ == '__main__':
    main()
