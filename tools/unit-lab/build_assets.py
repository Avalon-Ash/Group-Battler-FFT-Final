"""Original, offline-authored pixel assets for the isolated Unit Lab.

Requires Pillow only to REBUILD. PNG + JSON are checked in; runtime needs
neither Python nor Pillow. Polygon coordinates and pixel marks are art source,
not runtime character geometry. No FFT files, traced sprites or external art.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / "public/unit-lab/assets"
OUT.mkdir(parents=True, exist_ok=True)
CELL = 64
sprites = {}
INK = "#252937"
SKIN = "#efc898"
SHADE = "#b67e67"
LIGHT = "#ffe1ad"
PALETTES = {
    "scout": ["#34495f", "#526c87", "#829bac", "#d4ba82", "#635244"],
    "guard": ["#535969", "#89919b", "#d3d5cd", "#dab879", "#5e3c43"],
}


def canvas():
    im = Image.new("RGBA", (CELL, CELL))
    d = ImageDraw.Draw(im)
    def poly(points, color):
        d.polygon([(x + 32, y + 32) for x, y in points], fill=color)
    def rect(box, color):
        x, y, xx, yy = box
        d.rectangle((x + 32, y + 32, xx + 32, yy + 32), fill=color)
    return im, poly, rect


for direction in ["front", "back"]:
    im, p, r = canvas()
    p([(-6,-12),(-3,-15),(5,-14),(8,-10),(8,-3),(4,2),(-3,1),(-6,-3)], INK)
    p([(-5,-10),(-2,-13),(5,-12),(7,-8),(7,-3),(3,0),(-2,-1),(-5,-4)], SHADE)
    p([(-3,-11),(3,-12),(6,-9),(6,-3),(2,-1),(-2,-3)], SKIN)
    if direction == "front":
        r((0,-9,4,-7), LIGHT)
        r((-2,-6,-1,-5), INK)
        r((4,-6,5,-5), INK)
        r((2,-3,3,-3), SHADE)
    else:
        r((-3,-11,4,-3), "#634432")
    r((-2,1,2,3), SHADE)
    sprites[f"head.{direction}"] = im
    for style in ["crop", "tied"]:
        im, p, r = canvas()
        p([(-7,-7),(-7,-13),(-4,-17),(2,-18),(7,-15),(9,-11),(7,-7),(5,-10),(1,-9),(-2,-10),(-4,-5)], INK)
        p([(-6,-9),(-6,-13),(-3,-16),(2,-17),(6,-14),(7,-11),(4,-12),(1,-10),(-3,-12)], "#70482f")
        p([(-4,-13),(-2,-16),(2,-16),(5,-14),(0,-14),(-2,-12)], "#b0864e")
        r((-5,-11,-4,-7), "#94673c")
        if direction == "back":
            p([(-6,-10),(7,-10),(6,-3),(2,0),(-4,-2)], "#70482f")
            p([(-3,-10),(0,-11),(1,-2),(-2,-3)], "#94673c")
        if style == "tied":
            p([(-6,-8),(-9,-6),(-10,2),(-7,6),(-5,2),(-6,-3)], INK)
            p([(-7,-6),(-8,-3),(-8,2),(-6,4),(-6,0)], "#94673c")
            r((-8,-6,-6,-5), "#d4ba82")
        sprites[f"hair.{style}.{direction}"] = im

im, p, r = canvas()
p([(-3,-2),(2,-2),(3,6),(5,8),(5,10),(-3,10),(-4,7)], INK)
p([(-2,-1),(1,-1),(2,5),(0,6),(-2,5)], "#716655")
p([(-2,5),(2,5),(3,8),(-2,8)], "#6b4636")
r((-2,5,2,5), "#bf9b67")
r((-2,9,4,9), "#382f30")
sprites["boots"] = im

for skin, colors in PALETTES.items():
    dark, mid, high, gold, leather = colors
    for rig in ["male", "female"]:
        width = 8 if rig == "male" else 7
        for direction in ["front", "back"]:
            im, p, r = canvas()
            p([(-width,-5),(-3,-7),(3,-7),(width,-4),(width-1,5),
               (width+1,11),(1,13),(-width,11),(-width+1,4)], INK)
            p([(-width+1,-4),(-3,-6),(3,-6),(width-1,-3),(width-2,5),
               (width,10),(1,11),(-width+1,10),(-width+2,4)], dark)
            p([(-width+2,-3),(-3,-5),(2,-5),(3,3),(1,5),(-width+2,3)], mid)
            p([(-4,-4),(-2,-5),(2,-5),(2,-2),(-3,-1)], high)
            p([(2,-5),(width-2,-3),(width-2,3),(3,3)], dark)
            r((-width+2,4,width-2,5), leather)
            r((0,4,2,6), gold)
            r((1,5,1,5), INK)
            p([(-width+2,7),(-2,7),(-2,10),(-width+1,9)], mid)
            if skin == "guard":
                r((-4,-1,3,0), high)
                r((-4,2,3,2), dark)
                p([(3,-3),(5,-2),(4,2),(3,1)], high)
            else:
                p([(-5,-5),(-3,-5),(5,4),(3,4)], leather)
                r((-1,-1,0,0), gold)
            if direction == "back":
                p([(-4,-5),(3,-5),(4,2),(-4,2)], mid)
                r((-1,-4,0,2), dark)
            sprites[f"{skin}.{rig}.torso.{direction}"] = im
            im, p, r = canvas()
            p([(-5,-5),(5,-4),(7,4),(10,17),(4,16),(0,18),(-9,15),(-6,4)], INK)
            p([(-4,-4),(4,-3),(6,5),(8,15),(3,14),(0,16),(-7,14),(-5,4)], dark)
            p([(-3,-3),(-1,-2),(-2,13),(-5,13)], mid)
            p([(2,0),(4,4),(6,13),(3,12)], mid)
            r((-3,-4,3,-4), gold)
            sprites[f"{skin}.{rig}.cape.{direction}"] = im
    for pose, tip in [("rest",(1,8)), ("raised",(-2,-8)), ("strike",(10,1))]:
        im, p, r = canvas()
        tx, ty = tip
        dx, dy = tx / 10, ty / 10
        # Offline raster pose replacement. Runtime NEVER rotates this PNG.
        normal = (-dy * 2.5, dx * 2.5)
        nx, ny = normal
        p([(-nx,-ny),(nx,ny),(tx+nx,ty+ny),(tx-nx,ty-ny)], INK)
        p([(-nx*.65,-ny*.65),(nx*.65,ny*.65),(tx+nx*.65,ty+ny*.65),(tx-nx*.65,ty-ny*.65)], mid)
        r((-2,-3,2,-2), high)
        r((tx-2,ty-2,tx+2,ty+2), INK)
        r((tx-1,ty-1,tx+1,ty+1), SKIN)
        sprites[f"{skin}.arm.{pose}"] = im

for pose, vector in [("rest",(5,-18)), ("raised",(-5,-20)), ("strike",(21,-3))]:
    im, p, r = canvas()
    vx, vy = vector
    length = math.hypot(vx, vy)
    nx, ny = -vy/length, vx/length
    def at(t, w):
        return (round(vx*t + nx*w), round(vy*t + ny*w))
    p([at(.12,-2),at(.9,-2),at(1,0),at(.9,2),at(.12,2)], INK)
    p([at(.18,-1),at(.88,-1),at(.97,0),at(.18,1)], "#b7c9cc")
    p([at(.18,0),at(.9,0),at(.96,0),at(.18,1)], "#eff0d9")
    p([at(.1,-5),at(.17,-5),at(.17,5),at(.1,5)], "#ab844e")
    p([at(-.2,-1),at(.1,-1),at(.1,1),at(-.2,1)], "#634532")
    p([at(-.22,-2),at(-.15,-2),at(-.15,2),at(-.22,2)], "#d4ba82")
    sprites[f"sword.{pose}"] = im

cols = 8
atlas = Image.new("RGBA", (cols*CELL, math.ceil(len(sprites)/cols)*CELL))
frames = {}
for i, (key, im) in enumerate(sprites.items()):
    x, y = (i % cols)*CELL, (i // cols)*CELL
    atlas.paste(im, (x, y))
    frames[key] = {"rect": [x, y, CELL, CELL], "pivot": [32,32]}
atlas.save(OUT / "character-atlas.png", optimize=True)
(OUT / "atlas.json").write_text(json.dumps({
    "version": 1, "image": "character-atlas.png", "cellSize": CELL,
    "provenance": "Original offline-authored raster art; no extracted FFT assets.",
    "frames": frames,
}, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(frames)} original sprite cells, {atlas.width}×{atlas.height}")
