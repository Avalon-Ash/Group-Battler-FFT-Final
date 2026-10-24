# C04-C 實作報告

- 開工 HEAD: ae486c6faa942544509b78f2ef618eac6b724841 (feat/project-cleanup)
- 引用證據路徑: tools/ui-e2e/out/c04c/ (SAND_PEBBLES, ICE_SHARDS, VOID_RUBBLE, FOREST_FRINGE, ICE_EAVE, MAGMA_GLOW, VOID_GLOW, PART_PARTICLE_TYPES, terrainAmbience, PartPainter.txt)
- 保留理由:
  - 動態入口: tools/ui-e2e/terrain-contrast.mjs 讀取 A.TERRAIN_AMBIENCE/A.TERRAIN_LIQUID；perf-vfx-attribution 僅讀 PartPainter.drawBeam，vfx-coverage 僅列 PartPainter，故保留 TERRAIN_AMBIENCE/LIQUID 並安全刪除 PartPainter 的 PART_PARTICLE_TYPES 重匯出。
  - Python/常數: tools/assets/blender/render_obstacle.py 的 VOID_GLOW 為自有顏色變數，constants/terrain.ts:317 為其註解，非 TS 消費者，均保留。
- 實際差異: terrainAmbience.ts 7 行移除 export 前綴；PartPainter.ts 刪除 PART_PARTICLE_TYPES 重匯出及單行註解共 2 行。git diff --check 通過。
- 驗證命令結果 (日誌: tools/ui-e2e/out/agent-logs/):
  - c04c-lint: EXIT=0 (用時 5s, c04c-lint.log)
  - c04c-test: EXIT=0 (用時 11s, 90 passed / 714 tests, c04c-test.log)
  - c04c-build: EXIT=0 (用時 3s, c04c-build.log)
  - c04c-smoke: EXIT=0 (用時 10s, PASS, tools/ui-e2e/out/runtime-smoke.png, c04c-smoke.log)
  - c04c-guard: EXIT=0 (用時 107s, ALL FIDELITY CHECKS & ALL performance guardrails PASSED, c04c-guard.log)
- 未完成事項: C04-A/B/C 累計處理 16 個已指定匯出／重匯出；這不是全庫整理完成，C02、C03、C05 及功能問題仍未結案。
