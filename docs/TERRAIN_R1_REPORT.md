# 地形 R1 報告（草稿，T5 定稿）

## T0 基線（`node tools/ui-e2e/terrain-contrast.mjs`，FLAT，height=2*BLOCK_HEIGHT，Rec.709 luma）
| biome | path | top | lightSide | darkSide | light/top | dark/top |
| :-- | :-- | --: | --: | --: | --: | --: |
| VOID | texture | 43.1 | 27.2 | 20.0 | 0.629 | 0.463 |
| VOID | procedural | 40.0 | 63.5 | 22.7 | 1.588 | 0.567 |
| FOREST | texture | 88.1 | 57.7 | 61.3 | 0.655 | 0.696 |
| FOREST | procedural | 66.9 | 80.7 | 35.6 | 1.206 | 0.532 |
| ICE | texture | 164.1 | 107.8 | 126.9 | 0.657 | 0.774 |
| ICE | procedural | 123.3 | 95.6 | 57.8 | 0.776 | 0.469 |
| MAGMA | texture | 96.8 | 28.5 | 27.7 | 0.295 | 0.286 |
| MAGMA | procedural | 49.8 | 53.8 | 22.5 | 1.079 | 0.452 |
| DESERT | texture | 150.2 | 125.8 | 92.5 | 0.838 | 0.616 |
| DESERT | procedural | 98.3 | 131.7 | 64.5 | 1.340 | 0.656 |
