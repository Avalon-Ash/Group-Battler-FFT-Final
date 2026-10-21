# 近戰攻擊與受擊特效（MF）執行報告

> 任務目標：依 `docs/MELEE_FX_AGENT_PROMPT.md` 盤點並補全近戰普攻揮擊動作與主動技專屬受擊特效，解決「近戰普攻空序列／直線雷射、主動技沿用普攻受擊包」之問題。
> 分支：`feat/melee-fx`
> 規格門檻：`tests/MeleeFxSpec.test.ts`（M1～M4 棘輪測試，最終達成 0 違規）。

---

## 1. 規格驗收成果（MeleeFxSpec 改前／改後對照）

測試檔案：[`tests/MeleeFxSpec.test.ts`](file:///c:/Git/Group-Battler-FFT-Final/tests/MeleeFxSpec.test.ts)
棘輪基準：[`tests/melee-fx.baseline.json`](file:///c:/Git/Group-Battler-FFT-Final/tests/melee-fx.baseline.json)

| 規格代號 | 規格定義 | MF1 改前違規清單（32 項次） | 最終改後違規清單 | 達成狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **M1** | 近戰普攻序列至少有 1 個揮擊（`PARTICLE` 或 `BEAM`），且不含 `SHAKE`／`GRID_PULSE` | `tb_b1`, `tb_b2`, `tb_b3`, `tb_b4`, `wb_b4`, `tr_b3`, `tr_b4`, `wr_b4`（共 8 招空序列） | **0（無違規）** | **PASS** |
| **M2** | 普攻揮擊＋命中包，各發射器最晚結束 $\le 0.35\text{ s}$，粒子上限總和 $\le 14$ | `tb_b4`, `wb_b5`, `tr_b1`, `tr_b2`, `tr_b3`, `tr_b4`, `tr_b5`, `wr_b1`, `wr_b3`, `wr_b4`, `wr_b5`（共 11 招） | **0（無違規）** | **PASS** |
| **M3** | 近戰主動技 `visualHitEffect` 不得沿用普攻命中包；發射器 2～6 個、最晚結束 $\le 0.8\text{ s}$、粒子數 $\le 36$ | `tb_a5`, `wb_a5`, `tr_a4`, `wr_a1`, `wr_a2`, `wr_a4`, `sr_a3`（共 7 招） | **0（無互撞／無違規）** | **PASS** |
| **M4** | 同一主動技序列 `PARTICLE` 不得與其 `visualHitEffect` 同 ID 重複播放 | `tb_a5`, `wb_a5`, `tr_a4`, `wr_a1`, `wr_a2`, `wr_a4`（共 6 招疊兩次） | **0（無重複／無違規）** | **PASS** |

---

## 2. 渲染保真度（Fidelity 6 場景改前／改後）

門檻規定：`meanAbsDiff <= 0.8`，`badPixelPct <= 0.5%`。
5 個地形場景本輪不碰地形與背景代碼，數值必須與 MF0 相同；`battle_frozen` 因包含戰鬥中單位普攻特效而產生像素變動。

| 場景 ID | MF0 基準數值 | MF5 最終數值 | 變化量 ($\Delta$) | 狀態與說明 |
| :--- | :--- | :--- | :--- | :--- |
| **VOID** | mean=0.216, bad=0.03% | mean=0.216, bad=0.03% | 0.000 (0.00%) | **PASS**（完全一致） |
| **FOREST** | mean=0.651, bad=0.17% | mean=0.651, bad=0.17% | 0.000 (0.00%) | **PASS**（完全一致） |
| **ICE** | mean=0.253, bad=0.22% | mean=0.253, bad=0.22% | 0.000 (0.00%) | **PASS**（完全一致） |
| **MAGMA** | mean=0.249, bad=0.04% | mean=0.249, bad=0.04% | 0.000 (0.00%) | **PASS**（完全一致） |
| **DESERT** | mean=0.530, bad=0.23% | mean=0.530, bad=0.23% | 0.000 (0.00%) | **PASS**（完全一致） |
| **battle_frozen** | mean=0.308, bad $\le 0.50\%$ | mean=0.418, bad=0.50% | +0.110 mean | **超標待主代理審查重錄**（見 §5） |

---

## 3. 手感對照圖（Feel Sheet Artifacts）

使用 `tools/vfx/ult-sheet.mjs --feel --ids=... --times=0.02,0.1,0.25` 擷取 25 招近戰技能在目標身上於出招瞬間、打擊瞬間及收招後之對照圖：
- **改前**：[`tools/ui-e2e/out/ult/melee_before.png`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/ult/melee_before.png)（21,002,973 位元組）
- **改後**：[`tools/ui-e2e/out/ult/melee_after.png`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/ult/melee_after.png)（21,208,086 位元組）

---

## 4. 新增與調整特效構成一覽

所有新特效集中定義於 [`data/vfx/registry/melee_parts.ts`](file:///c:/Git/Group-Battler-FFT-Final/data/vfx/registry/melee_parts.ts)，並於 [`data/vfx/VFXRegistry.ts`](file:///c:/Git/Group-Battler-FFT-Final/data/vfx/VFXRegistry.ts) 統一登記。

### A. 藍方近戰普攻揮擊特效（MF2）
1. `FX_SWING_BLUE_SLASH`：`slashArc`（R=38, 115°, 厚度 8, `LION_PHYSICAL`），1 顆粒子，時長 0.18 s。
2. `FX_SWING_BLUE_SLASH_HOLY`：`slashArc`（R=40, 120°, 厚度 9, `LION_HOLY`），1 顆粒子，時長 0.18 s。
3. `FX_SWING_BLUE_CLEAVE`：`slashArc`（R=46, 150°, 厚度 11, `LION_PHYSICAL`），1 顆粒子，時長 0.20 s。
4. `FX_SWING_BLUE_CLEAVE_ARCANE`：`slashArc`（R=46, 150°, 厚度 11, `LION_ARCANE`），1 顆粒子，時長 0.20 s。
5. `FX_SWING_BLUE_CROSS_1`：`slashArc`（R=36, 105°, 厚度 8, `LION_LIGHTNING`），1 顆粒子，時長 0.16 s。
6. `FX_SWING_BLUE_CROSS_2`：`slashArc`（R=36, 105°, 厚度 8, `LION_LIGHTNING`，延遲 0.08 s，反向旋轉），1 顆粒子，時長 0.24 s。
7. `FX_SWING_BLUE_SMASH`：縱向放射光束 `rays`（R=36, 5 道, `LION_PHYSICAL`），1 顆粒子，時長 0.18 s。
8. `FX_SWING_BLUE_SMASH_LIGHTNING`：縱向放射光束 `rays`（R=36, 6 道, `LION_LIGHTNING`），1 顆粒子，時長 0.18 s。
9. `FX_SWING_BLUE_SMASH_HOLY`：縱向放射光束 `rays`（R=36, 6 道, `LION_HOLY`），1 顆粒子，時長 0.18 s。
10. `FX_SWING_BLUE_PIERCE_TIP`：尖端微光 `glow`（R=18）＋放射微光 `rays`（R=24, 4 道），2 顆粒子，時長 0.18 s。

### B. 紅方近戰普攻揮擊特效（MF3）
11. `FX_SWING_RED_SLASH`：`slashArc`（R=38, 110°, 厚度 9, `ASH_BLOOD`），1 顆粒子，時長 0.18 s。
12. `FX_SWING_RED_CLEAVE`：`slashArc`（R=48, 150°, 厚度 12, `ASH_PHYSICAL`），1 顆粒子，時長 0.20 s。
13. `FX_SWING_RED_CROSS_1`：`slashArc`（R=36, 105°, 厚度 9, `ASH_BLOOD`），1 顆粒子，時長 0.16 s。
14. `FX_SWING_RED_CROSS_2`：`slashArc`（R=36, 105°, 厚度 9, `ASH_BLOOD`，延遲 0.08 s，反向旋轉），1 顆粒子，時長 0.24 s。
15. `FX_SWING_RED_SMASH`：縱向下壓重擊 `rays`（R=38, 6 道, `ASH_PHYSICAL`），1 顆粒子，時長 0.18 s。
16. `FX_SWING_RED_PIERCE_TIP`：尖端血光 `glow`（R=18, `ASH_BLOOD`）＋火星 `spark`（size 10, `ASH_FIRE`），2 顆粒子，時長 0.18 s。

### C. 7 招近戰主動技專屬命中包（MF4）
17. `FX_ACTIVE_BLUE_PRISM_REFLECT`（`tb_a5`）：4 個發射器（`sigil` 稜鏡陣、閃光 `flash`、地面環 `groundRing`、6 道電光 `rays`、電弧噴濺 `spray`），最晚結束 0.60 s，粒子數上限 15 $\le 36$。
18. `FX_ACTIVE_BLUE_JUDGMENT_SLASH`（`wb_a5`）：5 個發射器（斷罪重斬弧 `slashArc` R=56 厚度 14、閃光、衝擊環、8 道聖光、聖光火花），最晚結束 0.47 s，粒子數上限 15 $\le 36$。
19. `FX_ACTIVE_RED_BLOOD_BARRIER`（`tr_a4`）：4 個發射器（血之倒三角法陣、暗紅閃光、血色粗糙衝擊環、血液噴濺滴落 `droplet`），最晚結束 0.70 s，粒子數上限 9 $\le 36$。
20. `FX_ACTIVE_RED_WHIRLWIND`（`wr_a1`）：5 個發射器（狂暴烈焰斬弧 R=58、二次斬弧 R=52、火光、地面重擊裂環、碎石 `debris`），最晚結束 0.55 s，粒子數上限 9 $\le 36$。
21. `FX_ACTIVE_RED_HAMSTRING_STRIKE`（`wr_a2`）：5 個發射器（斷筋斬弧 R=48、暗紅閃光、重擊地環、碎骨濺射、血液濺射），最晚結束 0.49 s，粒子數上限 12 $\le 36$。
22. `FX_ACTIVE_RED_EXECUTE_SLASH`（`wr_a4`）：5 個發射器（巨型嗜血處決弧 R=60 厚度 15、角顱法陣 `hornSkull`、火光、血環、高壓血霧噴射），最晚結束 0.56 s，粒子數上限 12 $\le 36$。
23. `FX_ACTIVE_RED_BLOOD_TOTEM`（`sr_a3`）：4 個發射器（血圖騰地陣 R=56、血光、擴散地環 R=60、慢速上升血氣滴露），最晚結束 0.80 s，粒子數上限 11 $\le 36$。

### D. 命中包時長微調（`data/vfx/registry/basic_parts.ts`）
為滿足 M2 規格（最晚結束 $\le 0.35\text{ s}$），微調以下命中包內過長之尾隨發射器時長：
- `FX_HIT_BLUE_HOLY`：餘暉發射器 lifetime 由 `[0.3, 0.4]` 調為 `[0.2, 0.28]`（最晚結束 0.33 s）。
- `FX_HIT_RED_PHYSICAL`：碎石與煙塵 lifetime 微調，最晚結束 0.34 s。
- `FX_HIT_RED_HEAVY`：重擊碎石 lifetime 微調，最晚結束 0.35 s。
- `FX_HIT_RED_BLOOD`：血滴噴濺 lifetime 微調，最晚結束 0.33 s。

---

## 5. 未完成項目與日誌路徑（誠實揭露）

依合約誠實記錄本輪執行細節：
1. **保真度測試 `battle_frozen` 超出門檻**：
   - 狀況：`battle_frozen` 的 `meanAbsDiff` 為 0.418（$\le 0.8$ 合格），但 `badPixelPct` 達到 0.50%（門檻為 $\le 0.50\%$，四捨五入後略超小數點後位數判定為 FAIL）。
   - 原因分析：`battle_frozen` 是讓 10 個英雄在戰場中自主交戰 120 幀後凍結畫面擷取。在第 120 幀時，近戰英雄正實機播放本輪新增的刀光斬弧特效，與原先空序列／直線光束相比存在合理的視覺差異。
   - 處置依據：依 AGENTS.md §5 與執行指令 §4，執行代理嚴格禁止重錄基準（`perf:fidelity:record`）或放寬門檻。
   - 差異幀輸出路徑：[`tools/ui-e2e/out/fidelity/battle_frozen_diff_curr.png`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/fidelity/battle_frozen_diff_curr.png)
   - 執行記錄檔路徑：[`tools/ui-e2e/out/agent-logs/guard.log`](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/agent-logs/guard.log)
   - 建議處置：由主代理人工檢視差異圖確認純屬近戰揮刀新特效後，以標準流程取證並重錄 `battle_frozen` 基準。

---

## 6. 各 Commit 回退指南（Rollback Guide）

若需退回個別階段，請依反向順序執行：

1. **回退 MF4（7 招主動技命中包與序列去重）**：
   ```bash
   git revert 0e7150d
   ```
   *還原檔案*：`data/skills/blue_active.ts`, `data/skills/red_active.ts`, `data/vfx/SkillSequences.ts`, `data/vfx/active_visuals.ts`, `data/vfx/registry/melee_parts.ts`, `tests/melee-fx.baseline.json`

2. **回退 MF3（紅方普攻揮擊特效）**：
   ```bash
   git revert 85ffd5d
   ```
   *還原檔案*：`data/vfx/SkillSequences.ts`, `data/vfx/registry/basic_parts.ts`, `data/vfx/registry/melee_parts.ts`, `tests/melee-fx.baseline.json`

3. **回退 MF2（藍方普攻揮擊特效）**：
   ```bash
   git revert 6f2b699
   ```
   *還原檔案*：`data/vfx/SkillSequences.ts`, `data/vfx/VFXRegistry.ts`, `data/vfx/registry/basic_parts.ts`, `data/vfx/registry/melee_parts.ts`, `tests/melee-fx.baseline.json`

4. **回退 MF1（規格測試 MeleeFxSpec）**：
   ```bash
   git revert 68822b8
   ```
   *還原檔案*：`tests/MeleeFxSpec.test.ts`, `tests/melee-fx.baseline.json`

5. **回退 MF0（ult-sheet 工具擴充）**：
   ```bash
   git revert 2fb31cd
   ```
   *還原檔案*：`tools/vfx/ult-sheet.mjs`
