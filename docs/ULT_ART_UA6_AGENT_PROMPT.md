# 執行指令：奧義規格化審查修正（UA6）

> 用法：在 IDE 代理對話輸入 `/goal docs/ULT_ART_UA6_AGENT_PROMPT.md`。
> 背景：UA0～UA5 已完成（分支 `feat/ult-art`，違規 132 → 3）。主代理審查發現 C6 範圍規則本身設計錯誤：全場型奧義（`aoeRadius` 8～10）的貼地零件被放大到半徑 550～720 px，一個貼地零件蓋滿整張地圖（`sr_u4` 命中後整格畫面變粉紅、`rr_u2`／`mr_u1` 餘韻火焰鋪滿）；STORM 的每一擊都落在同一個目標點（`SequenceSystem` 的 PARTICLE 不做散布），每一擊卻也照整個範圍放大。本輪修規則、把超大的配方縮回來，並清掉測試的四個問題。**其他規則（C1～C5、C7、C8）與已完成的修正不要動。**

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理，接續分支 `feat/ult-art`（不要開新分支）。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部，**特別是 §7 的「Long commands」**）、`engine/renderers/RenderSpec.ts`、`tests/UltSpec.test.ts`、`tests/ult-spec.baseline.json`、`docs/ULT_ART_REPORT.md` 的違規表。
- `git status` 必須乾淨、分支是 `feat/ult-art`。
- **長指令一律用 `node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令>` 前景執行**；結束看 `tools/ui-e2e/out/agent-logs/<名稱>.log` 最後一行 `EXIT=`，等不到就 `node tools/agent/run.mjs --check <名稱>`；同一步失敗或逾時兩次就記進報告、跳下一個任務。
- **受保護檔案（不得修改）**：與 `docs/ULT_ART_AGENT_PROMPT.md` §0 相同（含 `engine/**`、`constants/**`、`data/skills/**`、保真基準）。**保真基準一律不得重錄**。不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM）
- 目前大型奧義的最大貼地半徑（`evaluateUlt` 的 `maxGroundRadius`，px）：`aoeRadius` 10 的 `mb_u3` 609、`mr_u4` 672、`rb_u2` 614、`sb_u3` 720、`sr_u4` 672、`tb_u2` 681、`tb_u5` 681；`aoeRadius` 8 的 `rr_u3` 563、`sr_u2` 546、`tr_u4` 573；`aoeRadius` 6 的 `sb_u2` 484；`aoeRadius` 5 的 `mb_u4`／`sb_u5` 403；`aoeRadius` 4 的 8 個在 308～412。
- STORM 原型的每一擊：`data/vfx/SkillSequences.ts` 對同一個 `target` 排 `count` 個 PARTICLE 動作；`engine/presentation/visuals/SequenceSystem.ts` 約 92 行 `vfx.playEffect(effectId, target.x, target.y, …)`，**沒有落點散布**。散布只能靠配方發射器自己的 `shape`／`shapeRadius`。
- 共用命中包定義在 `data/vfx/registry/ult_parts.ts` 44～45 行（`ultImpact(...)`），粒子數可由 `VFX_REGISTRY['FX_ULT_IMPACT_BLUE'].emitters` 算出。
- `tests/UltSpec.test.ts` 的四個問題：① 85 行 `(em.part as any).radius`（`AGENTS.md` 禁 `as any`）；② 基準檔不存在時測試會自己寫一份（測試不得寫檔）；③ 共用命中包粒子數寫死 `32`；④ `ALL_ULT_IDS` 手打 50 個 id。

### 2. 目標與規則（DOM）
**C6 改成：**
- 非 STORM 的 AOE：目標距離＝`min(aoeRadius, 3)` 圈最外層格心的水平距離（沿用現有 `HexUtils.toPx` 算法，只把半徑換成 `min(aoeRadius, 3)`），最大貼地半徑落在 0.7～1.3 倍。常數 `C6_MAX_RING = 3` 寫在測試檔頂端並註解理由：全場型奧義的範圍感由格子脈衝與傷害數字傳達，單一貼地零件不得超過約 3 格（否則蓋滿畫面、加重貼地鋪設的每格裁切成本）。
- STORM：每一擊配方的最大貼地半徑 ≤ `1.5 × HEX_SIZE`；散布（任一發射器 `shapeRadius`）≤ 3 圈的目標距離。
- SINGLE：維持 ≤ `1.5 × HEX_SIZE`。

**測試清理：** ① 用型別守衛取代 `as any`（例如 `'radius' in em.part`）；② 基準檔不存在就讓測試失敗並提示怎麼產生，不要寫檔；③ 共用命中包粒子數從 `VFX_REGISTRY` 依陣營實算；④ `ALL_ULT_IDS` 改由 `Object.keys(ULT_VISUALS)` 取得並排序，另加一條斷言「共 50 個」。

**可以改**：`tests/UltSpec.test.ts`、`tests/ult-spec.baseline.json`、`data/vfx/registry/ult_parts*.ts`（只縮 `size`、`partAnim.scaleFrom/scaleTo`、`shapeRadius`；不加發射器、不換零件種類、不改色階）、`data/vfx/ult_visuals.ts` 的 `scale`（只准調小）、`docs/ULT_ART_REPORT.md`。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| UA6a | 改 C6 規則與測試清理；依新規則重算基準（此時 C6 會重新出現違規，照實記錄）。報告附「改規則前後 C6 違規清單」 | `node tools/agent/run.mjs ua6-spec 300 -- npx vitest run tests/UltSpec.test.ts tests/UltPartRecipes.test.ts tests/ReferenceIntegrity.test.ts` |
| UA6b | 把 C6 違規縮回到規則內，藍方一個 commit、紅方一個 commit，同步下調基準。縮小後其他規則（C2 主爆發、C7 擴張環）不得變成違規 | 同上，每個 commit 都跑 |
| UA6c | 重產 `after` 總表：`node tools/agent/run.mjs ult-sheet 900 -- node tools/vfx/ult-sheet.mjs --out=tools/ui-e2e/out/ult/after`；最後 `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs`（長的用 run.mjs） | 全綠；5 張地形與 battle_frozen 數值與 UA5 相同 |
| REPORT | 更新 `docs/ULT_ART_REPORT.md`：新增「UA6」一節（規則變更、每個縮小的奧義改前／改後最大貼地半徑、白色飽和比例最大值） | — |

### 4. 守則與停下條件（INV）
- 縮小後 C2／C7 一定會壞（例如主爆發換成別的發射器）→ 該奧義 C6 留在基準，報告寫原因，不要為了過測試加發射器或換零件。
- 5 張地形或 battle_frozen 有任何變動 → 停下回報。
- 不新增依賴、不用 `as any`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「UA6 跑完了」，主代理審查後問你要不要合併 `feat/ult-art`。
2. 看 `tools/ui-e2e/out/ult/after/` 的總表（主代理會再做前後對照圖），挑第二輪要重做造型的奧義。
