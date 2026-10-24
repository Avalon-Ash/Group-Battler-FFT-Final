# C04-B 實作報告

- 開工 HEAD: 0af6b79a5a43471d44069504de798495134c29fa (feat/project-cleanup)
- 符號用途與引用證據路徑 (證據: tools/ui-e2e/out/c04b/grep_symbols.txt, grep_modules.txt):
  - HOSTILE_CC: 僅 TargetingSystem.ts 內 isHostileSkill 查詢，外部 BTRegistry 僅用 isHostileSkill。
  - FRIENDLY_BUFF_CC: 僅 TargetingSystem.ts 內 updateTarget 等查詢，外部移動/尋路皆用 TargetingSystem。
  - ELEMENT_RAMPS: 僅 element_ramps.ts 內 elementRamp 查表，外部 UnitAuraPainter 等僅用函式與 ULT_SANCTUM_EMBLEM。
  - PEDESTAL_CANVAS_SIZE: 僅 UnitFactory.ts 內 generateTokenBase 建立畫布，外部 engine/sprites.ts 僅用 UnitFactory。
  - VULNERABLE_VISUAL_HP_RATIO: 僅 StatusActivity.ts 內 isStatusActive 判斷，外部 StatusPartPainter 僅用 isStatusActive。
- 產品 diff: 恰好五行移除 export 前綴 (git diff --check 通過，TargetingSystem 2 行、其餘各 1 行)。
- 驗證命令結果 (日誌: tools/ui-e2e/out/agent-logs/):
  - c04b-lint: EXIT=0 (用時 6s, c04b-lint.log)
  - c04b-test: EXIT=0 (用時 11s, 90 passed / 714 tests, c04b-test.log)
  - c04b-build: EXIT=0 (用時 3s, c04b-build.log)
  - c04b-smoke: EXIT=0 (用時 11s, PASS, tools/ui-e2e/out/runtime-smoke.png, c04b-smoke.log)
  - c04b-guard: EXIT=0 (用時 107s, ALL FIDELITY CHECKS & ALL performance guardrails PASSED, c04b-guard.log)
- 未完成事項: C04-A/B 已處理8個符號；terrainAmbience 等其餘候選尚未結案。
