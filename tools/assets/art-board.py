"""Art candidate board: paste candidates onto real game captures at on-screen size.

Rows = candidates. Columns = one cell per background capture (candidate pasted at
its on-screen height), a grayscale copy of the first background cell (value
check, ART_SPEC §11), and a nearest-neighbor zoom on a checkerboard (edge check).
Used by the `art-round` skill; judge the native-size cells, not the zoom.

Usage:
  python tools/assets/art-board.py CAND.png [CAND2.png ...] --bg BG.png [BG2.png ...]
      --height PX --out tools/ui-e2e/out/board.png [--at X,Y] [--cell 192] [--zoom 3] [--json]

Exit: 0 board written; 1 a candidate failed a check (still writes the board);
2 missing file or bad argument.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

LABEL_H = 18
BOARD_BG = (40, 42, 48, 255)
CHECKER = ((70, 70, 76, 255), (96, 96, 104, 255))
CHECKER_PX = 12
LABEL_RGB = (230, 230, 230, 255)


def parse_point(text: str) -> tuple[int, int]:
    try:
        x, y = (int(v) for v in text.split(",", 1))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("point must look like X,Y") from exc
    return x, y


def trim(img: Image.Image) -> Image.Image:
    box = img.getchannel("A").getbbox()
    return img.crop(box) if box else img


def fit_height(img: Image.Image, height: int) -> Image.Image:
    w = max(1, round(img.width * height / img.height))
    return img.resize((w, height), Image.LANCZOS)


def bg_cell(bg: Image.Image, at: tuple[int, int], cell: int) -> Image.Image:
    x0 = min(max(0, at[0] - cell // 2), max(0, bg.width - cell))
    y0 = min(max(0, at[1] - cell // 2), max(0, bg.height - cell))
    out = Image.new("RGBA", (cell, cell), BOARD_BG)
    out.alpha_composite(bg.crop((x0, y0, x0 + cell, y0 + cell)))
    return out


def checker(size: int) -> Image.Image:
    out = Image.new("RGBA", (size, size), CHECKER[0])
    draw = ImageDraw.Draw(out)
    for y in range(0, size, CHECKER_PX):
        for x in range(0, size, CHECKER_PX):
            if (x // CHECKER_PX + y // CHECKER_PX) % 2:
                draw.rectangle((x, y, x + CHECKER_PX - 1, y + CHECKER_PX - 1), fill=CHECKER[1])
    return out


def paste_feet(cell: Image.Image, sprite: Image.Image) -> None:
    """Bottom-center of the sprite on the cell center (the --at ground point)."""
    c = cell.width // 2
    cell.alpha_composite(sprite, (c - sprite.width // 2, c - sprite.height))


def check(img: Image.Image) -> list[str]:
    alpha = img.getchannel("A")
    lo, _ = alpha.getextrema()
    problems = []
    if lo == 255:
        problems.append("no transparent pixel: baked background or fake checkerboard")
    if alpha.getbbox() is None:
        problems.append("fully transparent")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("candidates", nargs="+", type=Path)
    ap.add_argument("--bg", nargs="+", type=Path, required=True, help="real game captures")
    ap.add_argument("--height", type=int, required=True, help="on-screen height in px")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--at", type=parse_point, help="ground point in the captures (default: center)")
    ap.add_argument("--cell", type=int, default=192)
    ap.add_argument("--zoom", type=int, default=3)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    missing = [str(p) for p in [*args.candidates, *args.bg] if not p.is_file()]
    if missing or args.height <= 0 or args.cell <= 0 or args.zoom <= 0:
        print(f"ERROR missing or bad input: {missing or 'non-positive size'}", file=sys.stderr)
        return 2

    bgs = [Image.open(p).convert("RGBA") for p in args.bg]
    cols = len(bgs) + 2
    rows = len(args.candidates)
    board = Image.new("RGBA", (cols * args.cell, LABEL_H + rows * (args.cell + LABEL_H)), BOARD_BG)
    draw = ImageDraw.Draw(board)
    for i, p in enumerate(args.bg):
        draw.text((i * args.cell + 4, 3), p.stem, fill=LABEL_RGB)
    draw.text((len(bgs) * args.cell + 4, 3), f"gray:{args.bg[0].stem}", fill=LABEL_RGB)
    draw.text(((len(bgs) + 1) * args.cell + 4, 3), f"x{args.zoom}", fill=LABEL_RGB)

    report = []
    for r, path in enumerate(args.candidates):
        src = Image.open(path).convert("RGBA")
        problems = check(src)
        sprite = fit_height(trim(src), args.height)
        y = LABEL_H + r * (args.cell + LABEL_H)
        draw.text((4, y + 2), path.name, fill=LABEL_RGB)
        y += LABEL_H
        first = None
        for c, bg in enumerate(bgs):
            at = args.at or (bg.width // 2, bg.height // 2)
            cell = bg_cell(bg, at, args.cell)
            paste_feet(cell, sprite)
            first = first or cell
            board.alpha_composite(cell, (c * args.cell, y))
        gray = ImageOps.grayscale(first).convert("RGBA")
        board.alpha_composite(gray, (len(bgs) * args.cell, y))
        zoomed = sprite.resize((sprite.width * args.zoom, sprite.height * args.zoom), Image.NEAREST)
        zoomed.thumbnail((args.cell, args.cell), Image.NEAREST)
        zcell = checker(args.cell)
        zcell.alpha_composite(zoomed, ((args.cell - zoomed.width) // 2, (args.cell - zoomed.height) // 2))
        board.alpha_composite(zcell, ((len(bgs) + 1) * args.cell, y))
        report.append({"candidate": str(path), "size": list(src.size), "problems": problems})
        for msg in problems:
            print(f"WARNING {path}: {msg}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    board.convert("RGB").save(args.out)
    bad = sum(1 for item in report if item["problems"])
    if args.json:
        print(json.dumps({"tool": "art-board", "out": str(args.out), "candidates": report}, ensure_ascii=False))
    print(f"Summary: {rows} candidates x {len(bgs)} backgrounds -> {args.out} ({bad} with problems)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
