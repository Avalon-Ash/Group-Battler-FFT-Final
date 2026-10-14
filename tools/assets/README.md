# Asset Verification & Processing Pipeline

This directory contains standalone, deterministic automation tools for verifying and processing art assets without adding extra runtime or build dependencies.

---

## 1. Sprite Verification Tool (`verify-sprites.mjs`)

Validates pre-rendered 3D unit sprite sheets and manifest data using `playwright-core` headless browser canvas.

### What it checks:
- Atlas image dimensions match `manifest.json` declarations (`atlas.w`, `atlas.h`).
- Presence of all required animations (`idle`, `walk`, `attack`, `hit`, `death`; plus `cast` for MAGE and SUPPORT).
- Frame count consistency across all 4 native directions (`SE`, `SW`, `NE`, `NW`).
- Bounding rectangle bounds: `{x, y, w, h}` are strictly within atlas limits.
- Non-blank pixels: asserts that frame rectangles contain visible pixels (`alpha > 10`).

### Output:
- Verification status for each unit (`PASS` or error list with non-zero exit code).
- Visual preview: `tools/ui-e2e/out/assets_preview_units.png` (10 units x 4 directions idle frame 0 aligned to anchor base).

### Command:
```bash
node tools/assets/verify-sprites.mjs
```

---

## 2. Terrain Texture Processing Tool (`process-terrain.mjs`)

Processes the AI-synthesized 2x5 biome terrain swatch palette (`art-source/terrain_grid.jpg`) into seamlessly tileable 512x512 game textures.

### Pipeline:
1. **Swatch Segmentation**: Identifies the 2x5 grid regions corresponding to `VOID`, `FOREST`, `ICE`, `MAGMA`, and `DESERT`.
2. **Crop & Margin Inset**: Insets each swatch by 2% to strip border artifacts while ignoring bottom text labels.
3. **Resampling**: Upscales each swatch to 512x512.
4. **Seamless Synthesis**:
   - **Top Surfaces (`<theme>_top.webp`)**: Applies 2D wrap-shift cross-fade blending with a 22% feather band, ensuring seamless tiling in all 4 directions.
   - **Cliff Sides (`<theme>_side.webp`)**: Applies 1D horizontal wrap-shift cross-fade blending only. The vertical axis is unshifted, preserving the top edge moss/frost/sand line and stratified rock layers.
5. **Output**:
   - WebP textures: `public/assets/terrain/<theme>_{top,side}.webp` (5 biomes x 2 = 10 textures).
   - Visual preview: `tools/ui-e2e/out/assets_preview_terrain.png`.

### Command:
```bash
node tools/assets/process-terrain.mjs
```

---

## 3. Blender Offline Assets (`tools/assets/blender/`)

Refer to `tools/assets/blender/README.md` for instructions on the offline 3D rendering and packing scripts (`render_unit.py`, `pack_sprites.py`).
