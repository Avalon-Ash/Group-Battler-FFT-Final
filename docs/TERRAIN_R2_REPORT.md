# 地形 R2 報告（草稿：T0 基線）

分支 `feat/terrain-r2`。量測：`node tools/ui-e2e/terrain-cost.mjs`（2560x1440 有頭、不鎖幀率、RTX 4070、只有地形、ROUNDS=3、每回合 5 秒；各開關切換後等 7 秒讓天氣粒子重新填滿或排空）。
輸出 `tools/ui-e2e/out/terrain_cost_T0.json`（gitignored）。

## 1. T0 基線（R1 狀態）
單位 ms。`cost` = baseline - no_all（地表細節＋液面＋天氣粒子）；`surface` = baseline - no_surface（只關地表細節＋液面，天氣照跑）。`detail`／`liquid` 是 `drawTerrainDetail`／`drawLiquid` 的每幀自耗（`performance.now()` 包裝）。幀間隔解析度只有 0.1 ms。

| biome | base med | base p99 | no_all med | no_all p99 | cost med | cost p99 | surface med | surface p99 | detail self | liquid self | ATMOSPHERE 粒子 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| VOID | 1.8 | 6.5 | 1.0 | 2.6 | 0.8 | 3.9 | 0.5 | 3.2 | 0.304 | 0 | 39.6 |
| FOREST | 2.4 | 8.0 | 1.0 | 2.4 | 1.4 | 5.6 | 1.1 | 5.1 | 0.724 | 0 | 39.5 |
| ICE | 2.9 | 20.2 | 2.3 | 17.8 | 0.6 | 2.4 | 1.0 | 0.9 | 0.542 | 0 | 117.8 |
| MAGMA | 1.7 | 6.3 | 1.1 | 2.6 | 0.6 | 3.7 | 0.4 | 3.2 | 0.114 | 0.207 | 16.5 |
| DESERT | 2.2 | 8.0 | 0.9 | 5.8 | 1.3 | 2.2 | 0.3 | 1.5 | 0.434 | 0 | 188.4 |

量測工具備註：
- R0 版讀到的粒子數是 `-1/0`，原因有二：路徑 `engine.vfx.state.particles` 正確，但那時引擎沒有在跑（`engine.isRunning` 為 false 時 `simDt` 為 0，天氣粒子根本不生成）。把引擎設為 running 也不行：沒有單位時 `VictorySystem.check` 立刻進入勝利階段並 `engine.stop()`。現在改為攔截 `VFXSystem.prototype.update`，dt 為 0 時改餵真實幀間隔，天氣就會像實戰一樣生成。粒子數改為計 `type === 'ATMOSPHERE'`。
- 因此 R0 的「天氣粒子量不到差異」不成立：DESERT 的天氣常駐約 188 顆、ICE 約 118 顆，是 `baseline - no_all` 裡的大宗（DESERT 的 `cost` 1.3 ms 裡只有約 0.3 ms 是地表細節）。
