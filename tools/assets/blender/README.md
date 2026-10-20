# KayKit Unit Sprite Blender Pipeline

This directory contains offline scripts used by the principal engineer to render and pack 3D KayKit models into 2.5D isometric directional sprite sheets for TACTICAL.OS.

> **Note for AI Agents**: The sprite atlases in `public/assets/units/` are already rendered and packed (the duplicate copy in `art-source/sprites/` was removed; Blender sources live outside the repo in `C:\Git\_asset_staging\`). **Do not execute Blender or rerun these scripts autonomously.** If sprite defects are observed, report them to the main agent (add a TBD in `docs/HANDOFF.md`) for offline adjustment.

---

## 1. Prerequisites

- **Blender**: Version 4.2+ or 4.5+ (configured in system PATH or called via full path).
- **Python**: 3.10+ with `Pillow` installed (`pip install Pillow`).
- **Source Assets**:
  - [KayKit Character Pack: Adventurers 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) (CC0).
  - Unpack the KayKit glTF/GLB models and animations into a folder, e.g. `C:/Git/_asset_staging/kaykit/Characters/gltf/`.

---

## 2. Rendering Pipeline (`render_unit.py`)

Renders 4 native directions (SE, SW, NE, NW) at an orthographic camera elevation of 30° (matching the engine's isometric projection `ISO_SCALE_Y = 0.5`). Toon shading, faction tinting, and dark brown outlines are applied directly.

```bash
# Syntax:
blender -b -P tools/assets/blender/render_unit.py -- <characters_dir> <out_raw_root> <TEAM> <ROLE> [resolution=256]

# Examples:
blender -b -P tools/assets/blender/render_unit.py -- ./kaykit/Characters/gltf ./raw_frames BLUE TANK 256
blender -b -P tools/assets/blender/render_unit.py -- ./kaykit/Characters/gltf ./raw_frames RED MAGE 256
```

Supported Teams: `BLUE`, `RED`
Supported Roles: `TANK`, `WARRIOR`, `RANGER`, `MAGE`, `SUPPORT`

---

## 3. Packing Pipeline (`pack_sprites.py`)

Trims transparent margins, shelf-packs frames into 2048xN WebP atlases with quality 82, and calculates relative anchor offsets `{ox, oy}` relative to feet origin `(128, 184.32)`.

```bash
# Syntax:
python tools/assets/blender/pack_sprites.py <raw_root> <out_dir> [body=MALE]

# Example:
python tools/assets/blender/pack_sprites.py ./raw_frames public/assets/units MALE
```

Output:
- `public/assets/units/<team>_<role>_male.webp` (10 atlases)
- `public/assets/units/manifest.json` (metadata with frame rects and offsets)
