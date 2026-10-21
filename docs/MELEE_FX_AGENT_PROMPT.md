# 執行指令：近戰攻擊與受擊特效（MF）

> 用法：在 IDE 代理對話輸入 `/goal docs/MELEE_FX_AGENT_PROMPT.md`。可以跑一整晚，照 §4 的觀測與重試規則，不要停在等待。
> 背景：使用者 2026-10-21：「近戰技能是不是漏掉了攻擊和受擊 vfx？看起來很白菜」。主代理盤點過：沒有技能缺命中特效，但 ① 8 招近戰普攻的出手序列是空的（沒有任何揮擊），其餘的「揮擊」是一條從攻擊者連到目標的直線光束（`SLASH_CONNECT`，寬 10 px），看起來像雷射不像刀；② 7 招近戰主動技直接沿用普攻的命中包（例如 `wr_a2`／`wr_a4` 與普攻 `wr_b1` 同為 `FX_HIT_RED_BLOOD`），放招和普攻看起來一樣。本輪**只改特效資料**（序列、登記特效、技能的 `visualHitEffect` 欄位），不改單位動作、位置、排序與戰鬥數值。攻擊者的前衝／揮擊動作屬於下一輪「位移技能」，本輪不做。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部，**特別是 §7「Long commands」**）、`docs/ART_SPEC.md` §4～§6（形狀語言、元素×陣營語彙、技能層級規則）、`engine/renderers/RenderSpec.ts`（只讀，本輪不改任何座標規則）、`data/vfx/SkillSequences.ts`、`data/vfx/basic_visuals.ts`、`data/vfx/active_visuals.ts`、`data/vfx/registry/basic_parts.ts`、`data/vfx/registry/active_parts.ts`、`data/vfx/parts/partGallery.ts`（可用零件）、`data/vfx/parts/vfxPalette.ts`（色階）、`engine/presentation/visuals/handlers/CombatVFXHandler.ts`、`tests/UltSpec.test.ts`（規格測試的寫法範例）、`tools/vfx/ult-sheet.mjs`，以及每個要改的檔案的方框檔頭。
- 從 `main` 開分支 `feat/melee-fx`；`git status` 必須乾淨。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`。**指令還在跑時不得結束回合，不得只回覆「等待中」**；`STATE=LOST` 就改用前景 `node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令>` 跑一次。同一步失敗或逾時兩次就記進報告、跳下一個任務。**一次只跑一個瀏覽器類指令**（`perf:guard`、`perf:fidelity`、`ult-sheet`、`runtime-smoke` 不可同時跑，會互相干擾而失敗）。
- 先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`（記下 6 個場景 meanAbsDiff）、`node tools/ui-e2e/runtime-smoke.mjs`。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/VFX_PIPELINE_MAP.md`、`docs/ART_SPEC.md`、`.claude/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`tests/ult-spec.baseline.json`、`data/vfx/ult_visuals.ts`、`data/vfx/registry/ult_parts*.ts`、`engine/**`（本輪不改引擎程式）、`constants/**`（除非只是新增特效用的命名常數）。**保真基準一律不得重錄**。不准 `push`、不准動 `main`、不准合併。
- **可以改**：`data/vfx/SkillSequences.ts`（普攻與主動技區段）、`data/vfx/basic_visuals.ts`、`data/vfx/active_visuals.ts`、`data/vfx/beam_styles.ts`（只新增樣式）、`data/vfx/registry/basic_parts.ts`、`data/vfx/registry/active_parts.ts`（或新檔 `data/vfx/registry/melee_parts.ts`，並在 `VFXRegistry.ts` 登記）、`data/skills/*.ts` **只限下表近戰主動技的 `visualHitEffect` 欄位**、`tests/**`（新增規格測試）、`tools/vfx/ult-sheet.mjs`（只加參數，不改既有行為）、新報告 `docs/MELEE_FX_REPORT.md`。

### 1. 已查證的事實（DOM，2026-10-21 的 main）
- **命中特效怎麼播**：`engine/systems/combat/SkillExecutor.ts:238` 在扣血時推 `HIT_FX` 事件（`text` = 技能的 `visualHitEffect`）；`CombatVFXHandler.ts` 在受擊者身體高度播放，傷害 ≥ `COMBAT_PARAM.HIT_MEDIUM_THRESHOLD`（150）時再偏移 8 px 播第二次。受擊者另有閃白（`hitFlashTimer`）與晃動（`triggerHitShake`），不用動。
- **出手序列**：`SkillSequences.ts` 第 31～62 行建普攻序列，只放出手線條，命中特效交給 `HIT_FX`（註解：普攻禁止震動與大範圍效果）。`MELEE_SMASH` 這個原型完全沒有動作（第 57～60 行 `break`）。`MELEE_SLASH`／`CROSS_CUT`／`HEAVY_CLEAVE` 都是 `BEAM` + `SLASH_CONNECT`（`beam_styles.ts:25`，寬 10、乾淨邊）＝攻擊者到目標的一條直線。
- 主動技序列在第 66～120 行：陣營起手（紅戰／坦 `FX_COVENANT_BLOOD_SPIKE`、藍戰／坦 `GRID_PULSE`）＋依原型播 `impactFx || hitFx`。序列在 `VisualSystem.ts:63` 延後 `詠唱 − hitAt` 開始，所以序列裡的 PARTICLE 會和扣血時的 `HIT_FX` 同一刻播出；若兩者是同一個特效，就會疊兩次。
- **近戰技能盤點**（射程 ≤ 1，非奧義；`hit`＝`visualHitEffect`，`seq`＝目前的出手序列）：

| 技能 | 類型 | hit | seq |
| :-- | :-- | :-- | :-- |
| tb_b1／tb_b2／tb_b3／tb_b4 | 普攻 SMASH | BLUE_PHYSICAL／LIGHTNING／LIGHTNING／HOLY | **空** |
| tb_b5 | 普攻 CLEAVE | BLUE_PHYSICAL | 直線光束 |
| wb_b1 | 普攻 CROSS_CUT | BLUE_LIGHTNING | 直線光束 ×2 |
| wb_b3 | 普攻 CLEAVE | BLUE_ARCANE | 直線光束 |
| wb_b4 | 普攻 SMASH | BLUE_PHYSICAL | **空** |
| wb_b5 | 普攻 SLASH | BLUE_HOLY | 直線光束 |
| tr_b1／tr_b2 | 普攻 CLEAVE／SLASH | RED_HEAVY／RED_BLOOD | 直線光束 |
| tr_b3／tr_b4 | 普攻 SMASH | RED_HEAVY | **空** |
| tr_b5 | 普攻 PIERCE | RED_BLOOD | 直線光束（刺擊，可保留直線） |
| wr_b1／wr_b3／wr_b5 | 普攻 SLASH／CLEAVE／CROSS_CUT | RED_BLOOD／RED_PHYSICAL／RED_BLOOD | 直線光束 |
| wr_b4 | 普攻 SMASH | RED_HEAVY | **空** |
| tb_a5 | 主動 單體 | `FX_HIT_BLUE_LIGHTNING`（＝普攻包） | 起手＋同一包 |
| wb_a5 | 主動 單體 | `FX_HIT_BLUE_PHYSICAL`（＝普攻包） | 起手＋同一包 |
| tr_a4 | 主動 單體 | `FX_HIT_RED_BLOOD`（＝普攻包） | 起手＋同一包 |
| wr_a1 | 主動 AOE | `FX_HIT_RED_HEAVY`（＝普攻包） | 起手＋同一包 |
| wr_a2／wr_a4 | 主動 單體 | `FX_HIT_RED_BLOOD`（＝普攻包） | 起手＋同一包 |
| sr_a3 | 主動 AOE | `FX_HIT_RED_BLOOD`（＝普攻包） | 起手＋FEL_SPLASH |

  其他近戰主動技（`tb_a1`／`tb_a3`／`wb_a1`／`wb_a3`／`wb_a4`／`sb_a5`／`tr_a2`／`tr_a3`／`tr_a5`／`wr_a5`）已有專屬 `FX_ACTIVE_*`，本輪不動。
- 命中包都在 `data/vfx/registry/basic_parts.ts`，用同檔的輔助函式 `flash`／`groundRing`／`spray`／`debris`／`puff`（第 13～44 行）組合，例如 `FX_HIT_BLUE_PHYSICAL`（第 54 行：閃光＋4 道放射＋地面環＋火花）、`FX_HIT_RED_BLOOD`（第 137 行：血色新月斬＋血滴＋地面環）。可用零件見 `partGallery.ts`：`slashArc`（斬擊弧，有 `arcDeg`／`thickness`）、`rays`、`glow`、`ring`、`shard`、`spark`、`droplet`、`smoke` 等；色階見 `vfxPalette.ts`（藍方 `LION_*`、紅方 `ASH_*`；`ASH_BLOOD`／`ASH_POISON`／`ASH_VOID` 是一般混合的實色）。
- 粒子預算：`constants/vfx.ts` 的 `VFX_BUDGET`（軟上限 240、硬上限 380）。

### 2. 目標與規則（DOM）
- **普攻有揮擊**：上表每一招近戰普攻的出手序列都要有一個「揮擊」動作，在目標位置播放、延遲 0、時長 ≤ 0.2 s：
  - SLASH／CLEAVE／CROSS_CUT：用 `slashArc` 零件做刀弧（CROSS_CUT 兩道交叉、第二道延遲約 0.08 s；CLEAVE 弧度大、較粗），取代直線光束。
  - SMASH：由上往下的重擊（例如短促的縱向弧或下壓放射＋落點小裂紋），不要震動。
  - PIERCE：可保留直線，但要有尖端閃光。
  - 依 ART_SPEC §4：獅心（藍）乾淨、對稱、鋼銀＋金；灰燼（紅）崩裂、帶殘渣、鏽＋血。
- **普攻命中包**：維持 1～2 層、時長 ≤ 0.35 s（ART_SPEC §6），可微調讓它和揮擊接得上，不要變大。
- **主動技有自己的命中**：上表 7 招沿用普攻包的近戰主動技，各做一個專屬命中特效（2～3 層、≤ 0.8 s、比普攻明顯大一級：例如較大的弧＋衝擊環＋元素殘留），改它們的 `visualHitEffect` 指向新特效。序列裡不要再播同一個特效一次（避免和 `HIT_FX` 疊兩次）；起手可保留。
- **不做**：鏡頭震動加強、全畫面效果、單位動作或位置、戰鬥數值、奧義。
- **新增規格測試 `tests/MeleeFxSpec.test.ts`**（寫法參考 `UltSpec.test.ts`，以上表的技能清單為準）：
  - M1：每招近戰普攻的序列至少有 1 個揮擊動作（PARTICLE 或 BEAM），且不含 `SHAKE`、`GRID_PULSE`。
  - M2：普攻的揮擊＋命中包，每個登記特效的發射器最晚結束 ≤ 0.35 s，粒子數上限總和 ≤ 14。
  - M3：近戰主動技的 `visualHitEffect` 不得是任何普攻用到的命中包；發射器 2～6 個、最晚結束 ≤ 0.8 s、粒子數上限總和 ≤ 36。
  - M4：同一招主動技的序列 PARTICLE 不得與它的 `visualHitEffect` 是同一個 id。
  - 先寫測試並記下改前違規清單（用基準檔棘輪記錄），最後必須 0 違規。**這個測試是本輪的硬性驗收：0 違規前不得進到 REPORT。**
- **對照圖**：`tools/vfx/ult-sheet.mjs` 的 `--feel` 目前只給奧義用（取樣時刻相對 `hitAt`）。加一個 `--name=<檔名>` 參數決定輸出檔名（預設仍是 `feel.png`），並讓沒有 `hitAt` 的技能以 0 計算；用 `--feel --ids=<上表全部技能> --times=0.02,0.1,0.25 --name=melee_before` 拍改前、`--name=melee_after` 拍改後，兩張都放 `tools/ui-e2e/out/ult/`，報告附路徑。

### 3. 任務（依序，每個任務一個 commit）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| MF0 | 基準（§0）＋ `ult-sheet` 加 `--name` 與 hitAt 預設 0，拍 `melee_before` | 全綠；圖存在 |
| MF1 | `tests/MeleeFxSpec.test.ts`＋改前違規基準 | 測試通過（以基準記錄現況） |
| MF2 | 藍方近戰普攻揮擊（tb_b1～b5、wb_b1／b3／b4／b5） | lint／test／build；M1、M2 藍方歸零 |
| MF3 | 紅方近戰普攻揮擊（tr_b1～b5、wr_b1／b3／b4／b5） | 同上；M1、M2 全部歸零 |
| MF4 | 7 招近戰主動技專屬命中特效＋改 `visualHitEffect`＋去掉序列重複 | 同上；M3、M4 歸零 |
| MF5 | 最後驗證：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`runtime-smoke`（逐一跑，不可並行）；拍 `melee_after` | 全綠；MeleeFxSpec 0 違規 |
| REPORT | `docs/MELEE_FX_REPORT.md`：MeleeFxSpec 改前／改後違規表、保真 6 場景改前／改後數字、兩張對照圖路徑、每個新特效的構成（零件、時長、粒子數）、未完成項目與 log 路徑、回退指南（每個 commit） | — |

### 4. 守則與停下條件（INV）
- **觀測與重試**：長指令用 `--detach`＋`--wait`；`--wait` 顯示 DONE 就讀結果繼續，絕不等已結束的指令；同一步兩次失敗或逾時 → 報告記「未完成：<名稱>（log 路徑）」，跳下一個任務。
- **保真**：5 張地形場景的分數必須與 MF0 相同（本輪不碰地形與背景）；`battle_frozen` 畫面裡有普攻特效，可能變動：若**超過門檻**，**不得重錄**，停下回報附差異圖（`tools/ui-e2e/out/fidelity/`），由主代理取證重錄；未超過就記數值繼續。任何地形場景變動 → 停下找原因。
- **報告要誠實**：MeleeFxSpec 沒歸零、保真變動、量測失敗，都要寫進「未完成項目」，不可寫「無遺留」。
- 不改 `engine/**`、不新增依賴、不用 `as any`、不加安全網；粒子要在預算內（M2／M3 的上限）。
- 新特效的形狀、顏色要符合 ART_SPEC §4／§5 的陣營語彙；拿不準就做得節制，不要做大。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「近戰特效跑完了」，主代理審查並本機實跑後問你要不要合併。
2. 看 `tools/ui-e2e/out/ult/melee_before.png` 和 `melee_after.png` 對照，再實機看坦克／戰士的普攻和主動技是否有揮擊感、放招和普攻分得出來。
