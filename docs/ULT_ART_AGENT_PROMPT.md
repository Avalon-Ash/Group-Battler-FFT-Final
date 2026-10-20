# 執行指令：奧義美術規格化＋對照圖（UA）

> 用法：在 IDE 代理對話輸入 `/goal docs/ULT_ART_AGENT_PROMPT.md`。
> 背景：50 個奧義（藍 25、紅 25）各有一份零件配方（`FX_ULT_*`），結構在 U1 輪已整理好（`VFXSequence.hitAt`、`ULT_SEQUENCE`），但配方本身是逐個手寫的，時序、範圍、節奏沒有統一檢查。平衡輪縮短詠唱後，已知 `rr_u2`、`tr_u1` 的隕石比傷害晚到約 0.2 s。
> 本輪只做兩件事：① 把 `docs/ART_SPEC.md` §6 的奧義規則寫成可檢查的棘輪測試，修到 0 違規；② 產出 50 個奧義的改前／改後對照圖，讓使用者挑出第二輪要細修美術的奧義。**不做主觀美術重設計、不新增零件種類、不改渲染程式。**

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`engine/renderers/RenderSpec.ts`（座標協議；本輪不改任何規則，但要知道貼地／空中零件的錨點）、`docs/ART_SPEC.md` §6～§7、`data/vfx/ult_visuals.ts`、`data/vfx/SkillSequences.ts`、`data/vfx/registry/ult_parts.ts`、`ult_parts_blue.ts`、`ult_parts_red.ts`、`ult_parts_storm.ts`、`tests/UltPartRecipes.test.ts`、`tools/vfx/fx-shot.mjs`（檔頭用法）。改任何檔案前先讀它的方框檔頭。
- 從 `main` 開分支 `feat/ult-art`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:fidelity`（記下 6 個場景的 meanAbsDiff）、`node tools/ui-e2e/runtime-smoke.mjs`。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/VFX_PIPELINE_MAP.md`、`docs/ART_SPEC.md`、`.claude/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`data/skills/**`（詠唱時間等是平衡數值）、`engine/**`、`constants/**`、所有既有測試的基準放寬方向。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，2026-10-20 的 main）
- 奧義表 `data/vfx/ult_visuals.ts`：50 個奧義各有 `archetype`（STORM 12、DOMAIN 11、HEAVEN_FALL 9、INSTANT_IMPACT 9、BEAM_SNIPE 5、SANCTUARY 4）與 `vfxOverride`（指向 `FX_ULT_*` 配方）、`scale`，部分有 `height`／`timing`／`count`。
- 參數 `ULT_SEQUENCE`（同檔）：`HIT_LEAD 0.3`（配方資產的主爆發時刻）、`MAX_FX_SCALE 1.4`、`MAX_PULSE_SCALE 2.5`、`MIN_SHAKE 0.55`、`IMPACT_SCALE 0.6`、`DEFAULT_FALL_HEIGHT 1000`。
- 序列建構 `data/vfx/SkillSequences.ts`（約 140～205 行）：`hitAt` 預設 `HIT_LEAD`；HEAVEN_FALL 為 `√(2·height/GRAVITY) + timing`（`GRAVITY` 是 `constants/combat.ts` 的 3500）；序列 scale＝`min(MAX_FX_SCALE, ultConfig.scale)`；每個奧義命中時另加共用包 `FX_ULT_IMPACT_BLUE/RED`。輸出 `SKILL_SEQUENCES`（220 行）。
- 排程 `engine/presentation/VisualSystem.ts` 約 71 行：CAST_START 時序列延後 `max(0, cast − hitAt)` 開始，所以 **`hitAt > cast` 時，特效命中會比傷害晚 `hitAt − cast` 秒**。目前已知：`rr_u2`（height 2500、timing 0.4 → hitAt≈1.60，cast 1.4）、`tr_u1`（height 1000 → hitAt≈0.76，cast 0.5）。其他 50 個請由測試實算。
- 配方是 `part({...})` 發射器陣列：`particleType`（PART／PART_GROUND 貼地／PART_DEBRIS）、`part.kind`（glow／ring／sigil／shard／smoke／droplet…）、`count`、`delay`、`lifetime`、`size`、`partAnim.scaleFrom/scaleTo`、`vz`、`gravity`。色彩用色階名（`ramp`），不寫色碼。
- 既有測試 `tests/UltPartRecipes.test.ts`：只對 `ULT_PART_VFX`（`ult_parts.ts` 匯出）檢查「≤ 2 s」與「第一個發射器是 sigil、delay 0」。**先確認 `ULT_PART_VFX` 是否涵蓋 blue／red／storm 三個檔的全部配方**，沒涵蓋的就是目前沒被檢查的。
- 截圖：`tools/vfx/fx-shot.mjs` 的 `CAST:<技能 id>` 模式讓一對單位實際詠唱（含序列），`--probe` 印出序列佇列，`--scene=ICE` 換群系，`--t=` 指定取樣時刻。
- 規格 `docs/ART_SPEC.md` §6：奧義 3～5 層、1.0～2.0 s，起手（法陣或紋章）→ 命中（主爆發＋衝擊環）→ 餘韻（殘留與飄散），陣營紋章出現一次；震屏與閃光不得強於現在；治療增益用「上升、聚合」，傷害用「下壓、擴散」。
- 地格：`HEX_SIZE 48`（`constants/geometry.ts`）。技能資料中奧義 `type`：AOE 33 個、SINGLE 17 個，AOE 的範圍是 `aoeRadius`（格數）。

### 2. 目標與規則（DOM）
新增 `tests/UltSpec.test.ts`，對 50 個奧義逐一計算下列檢查（同一份實作用在測試與報告）。違規以 `tests/ult-spec.baseline.json` 記錄**每個奧義、每條規則**，棘輪只准減少：

| 代號 | 規則 | 計算方式 |
| :-- | :-- | :-- |
| C1 時序 | `hitAt ≤ cast + 0.02` | `hitAt` 讀 `SKILL_SEQUENCES[id].hitAt`，`cast` 讀技能資料 |
| C2 命中對齊 | 配方主爆發落在 `hitAt ± 0.08 s` | 主爆發＝配方中半徑最大的 glow 或 ring 發射器；它在序列中的時刻＝該配方在序列裡的開始時間＋發射器 `delay`。開始時間依原型從 `SKILL_SEQUENCES` 的動作讀，不要自己推 |
| C3 三拍 | 起手：有發射器在主爆發前開始；餘韻：有發射器在 `hitAt + 0.5 s` 時仍存活 | 以 `delay`、`lifetime` 上限計算 |
| C4 時長 | 序列總長 1.0～2.0 s | 序列內全部動作與配方發射器的最晚結束時刻 |
| C5 層數 | 配方發射器 3～6 個 | 不含共用命中包 |
| C6 範圍 | AOE：最大貼地發射器的水平半徑落在「`aoeRadius` 圈最外層格心的水平距離」的 0.7～1.3 倍；SINGLE：≤ 1.5 × `HEX_SIZE` | 半徑＝`size × max(scaleFrom, scaleTo) ×` 序列 scale。格心距離用 `HexUtils` 實算，不要手推公式 |
| C7 運動方向 | 治療／增益奧義（技能 `power < 0` 或無傷害）至少一個 `vz > 0` 的發射器，且沒有向外擴張的貼地衝擊環當主爆發；傷害奧義至少一個擴張的貼地環（`scaleTo > scaleFrom`） | — |
| C8 粒子量 | 一次施放的粒子數上限（`count` 上限總和 × STORM 次數＋共用包）≤ 80 | 先量全體分佈寫進報告，若中位數已 > 60 回報再定 |

- **可以改**：`data/vfx/ult_visuals.ts`（`height`、`timing`、`scale`、`count`；不得改 `archetype`、`vfxOverride` 指向、`ULT_SEQUENCE`）、`data/vfx/registry/ult_parts*.ts`（既有零件種類的參數：`delay`、`lifetime`、`size`、`count`、`partAnim`、`vz`、發射器增刪）。
- **不可以改**：`engine/**`、`constants/**`、技能資料、零件產生器、共用命中包 `FX_ULT_IMPACT_*`、震屏強度（不得上調）。
- 色彩只用既有色階；陣營辨識（藍＝皇家藍、紅＝深紅＋暗）不得互換。
- 每個奧義的辨識特徵（紋章圖案、主零件種類）保留；本輪是修規格違規，不是換造型。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| UA0 | 基準：§0 的指令全部記進報告 | 全綠 |
| UA1 | 新增 `tests/UltSpec.test.ts`＋`tests/ult-spec.baseline.json`（記錄現況違規，測試此時通過）。報告列出 50 × C1～C8 違規表 | `npx vitest run tests/UltSpec.test.ts` |
| UA2 | 新增 `tools/vfx/ult-sheet.mjs`：每個奧義在 FOREST 上實際詠唱（施法者對 3 個目標），取樣 `hitAt−0.2`、`hitAt`、`hitAt+0.15`、`hitAt+0.4`、`hitAt+0.8`（序列時刻），一個奧義一列；藍、紅各一張總表。另在 ICE、DESERT 取 `hitAt+0.05` 一格，量白色飽和像素比例（min(R,G,B) ≥ 245）寫進 `ult-sheet.json`。先跑一次存成 `tools/ui-e2e/out/ult/before/` | 兩張總表＋json 存在 |
| UA3 | 修藍方 25 個：C1 → C2 → C6 → C3／C4／C5／C7／C8 的順序，每修一個職業（5 個奧義）一個 commit，同步下調基準 | 每個 commit：`npx vitest run tests/UltSpec.test.ts tests/UltPartRecipes.test.ts tests/ReferenceIntegrity.test.ts` |
| UA4 | 修紅方 25 個（同上；含 `rr_u2`、`tr_u1` 的 C1） | 同上 |
| UA5 | 跑 `ult-sheet.mjs` 存成 `after/`；白色飽和比例任何奧義 > 3% 的，降那個配方加法零件的 `size` 或 `count`（不改群系增益）。最後 `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs` | 全綠；`perf:fidelity` 5 張地形與 UA0 相同 |
| REPORT | `docs/ULT_ART_REPORT.md`：① 改前／改後違規數表（每條規則）；② 每個奧義一行：改了什麼、為什麼（引用規則代號）；③ 沒修到 0 的項目與原因；④ before／after 總表路徑；⑤ 你看圖後覺得「規格合格但仍單調或互相太像」的奧義清單（只列，不改）；⑥ 回退指南（每個 commit） | — |

- 每個任務一個 commit（UA3、UA4 依職業再拆）。

### 4. 守則與停下條件（INV）
- 某條規則要改到 `engine/**`、`constants/**` 或技能資料才能達成 → 不改，該奧義該規則留在基準，報告寫原因，繼續下一個。
- `battle_frozen` 預期會因奧義特效變動而失敗：**不得重錄**，報告寫 UA0 與最後的數值與差異圖路徑。5 張地形場景有任何變動 → 停下回報（本輪不該影響地形）。
- `perf:guard` 的效能比較失敗 → 停下回報，不要靠刪特效硬過。
- 規則本身看起來不合理（例如某原型天生無法滿足 C2）→ 不要為了過測試扭曲配方，記進報告「規則待主代理決定」，該項留在基準。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網、不改共用程式碼來讓測試好過。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「奧義規格跑完了」，主代理會審查 `git diff main...feat/ult-art` 再問你要不要合併。
2. 看 `tools/ui-e2e/out/ult/before/` 與 `after/` 的藍、紅總表，挑出還想重做造型的奧義（第二輪）。
3. 實機看隕石類（`rr_u2` 焦土衝擊、`tr_u1` 處決斷頭台）落地是否和傷害數字同時。
