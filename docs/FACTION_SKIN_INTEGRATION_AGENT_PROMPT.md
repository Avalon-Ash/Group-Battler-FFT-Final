# 執行指令：獅心／灰燼 20 套 skin 正式整合與記憶體（SKIN-INT）

> 給 GPT（Codex App）。背景：`codex/lionheart-warrior-skins` 的完整動畫試烘焙（`f9acdc7`，交接 `6b1e02c`）主代理 2026-10-26 審查通過：沒有動到執行期程式；固定 `referenceHeightPx = 158.3` 與 main 的 `UNIT_SPRITE.referenceHeightPx` 相同，manifest 也可覆寫；逐格 ox／oy 錨點讀法相同；key 格式一致。
> 審查發現、本輪要一起修的問題：
> 1. 分支在 `docs/art/**` 加了約 35 MB 的審圖二進位檔（gif、動畫 png、試作 webp）。**這些不進 main**（repo 打包已 186 MB，進了歷史就刪不掉）。
> 2. `data/units/appearance/{lionheartWarriorSkin,lionheartRolesSkin,ashenRolesSkin}.json`（約 2,900 行）只有 Blender 腳本在讀，卻放在執行期 SSOT 的 `data/**` 底下。
> 3. `tools/assets/blender/__pycache__/` 沒被 `.gitignore` 擋掉。
> 4. **記憶體**：main 的 `SpriteAtlasStore.preloadCoreUnits()` 對 manifest 全部 key 同時 `loadAtlas`。20 套原圖（2048×1128～2333）同時解碼，暫存峰值約 236 MB；常駐從約 58 MB（10 套 × 0.5 倍彩色＋剪影）變成約 118 MB。iPhone 14 Pro 長跑曾因畫布記憶體過高被系統回收分頁（2026-10-26 修了兩輪，模擬 iPhone 版面存活畫布約 0.4 GB）。

---

## 指令本文

你是本專案的執行代理。先讀 `AGENTS.md`（全部），它是合約。

### 0. 開工前（INV）
- **工作位置**：你現在的工作樹 `C:\Users\xino_\.codex\worktrees\lionheart-warrior-skins\Group-Battler-FFT-Final`。**不要合併 `codex/lionheart-warrior-skins`**（會把 35 MB 審圖檔帶進來）。改成從最新 `main` 開新分支：`git switch -c feat/faction-skins main`，需要的檔案用 `git checkout codex/lionheart-warrior-skins -- <路徑>` 逐一取過來。被忽略的 raw／packed 產物（`tools/ui-e2e/out/faction-animation-v01/`）切分支後仍在，照用。
- **開工順序閘門（會失敗的檢查）**：
  - S0（離線素材）現在就可以做。
  - **S1 以後（動到執行期程式、圖集載入、正式圖集）開始前**，跑 `git log main --oneline -40`，必須看得到含 `dash-afterimage` 的合併提交（主代理正在做的渲染修正 R2；渲染工作同一時間只開一條）。看不到就停在 S0，回報「等 R2 合併」後結束。看得到時先 `git rebase main`（S0 只有離線檔，不會衝突）。
- 先讀：`engine/renderers/RenderSpec.ts`（檔頭、§1、§10）、`engine/renderers/units/SpriteAtlasStore.ts`（全部）、`engine/renderers/units/factions/SpriteUnitRenderer.ts`（檔頭、`resolveFrame`、`headTopPx` 一帶）、`engine/renderers/units/painters/UnitAfterimagePainter.ts`、`constants/units.ts` 的 `UNIT_SPRITE`、`data/units/appearance/bodyTypes.ts`、`data/units/factionSkin.ts`、`engine/systems/agentManager.ts:60-75`、`tests/SpriteAtlas.test.ts`、`tools/ui-e2e/perf-lifecycle-soak.mjs` 的用法段。其他檔案只用 grep 定位、讀片段。
- 先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；指令還在跑時不得結束回合。只有 `STATE=DONE EXIT=0` 算通過；`TIMEOUT` 重跑一次，同一步失敗兩次就記進報告並停下。逾時參考：`npm test` 300 秒、build 300 秒、`perf:guard` 900 秒、`perf-lifecycle-soak` 900 秒、batch-sim 120 秒。**Blender 與任何 `perf:*`／soak 不得同時跑。**
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`tests/*.baseline.json`、`engine/systems/**`、`engine/renderers/frame/**`、`data/skills/**`、`constants/combat.ts`、`constants/vfx.ts`。**保真基準不得重錄、門檻不得放寬**（換圖後 `battle_frozen` 一定會變，見 S4）。
- 不准 `push`、不准動 `main`、不准合併。每個任務一個 commit，訊息結尾加 `Co-Authored-By: Codex <noreply@openai.com>`。
- 本輪改動檔案多於 `AGENTS.md` 的 3 檔上限：策略是**每個任務各自 ≤ 5 個程式檔**（素材、manifest、測試、報告不計），超過先停下說明。

### 1. 已查證的事實（DOM，main 64cf338 之後）
- **只畫 0.5 倍層級**：`UNIT_SPRITE.mipLevels = [0.5]`（`constants/units.ts`）。`selectMipLevel` 的 screenScale 約 0.37，永遠選 0.5。`bakeAtlas(sourceImg, tint)` 把原圖用 `drawImage(src, 0, 0, round(w*0.5), round(h*0.5))`（`imageSmoothingQuality='high'`）縮成彩色層，再從彩色層 `source-in` 填白做白閃剪影；原圖之後丟掉。`getAtlas(key, mip)`／`getSilhouette(key, mip)` 回傳該層畫布。`SpriteUnitRenderer` 以「全尺寸座標 × mipLevel」從層級畫布取格，`UnitAfterimagePainter` 也用 `getAtlas`。
- **載入**：`loadManifest` → `preloadCoreUnits()` 對 `Object.keys(manifest.units)` 全部 `Promise.all(loadAtlas)`，完成後設 `window.__UNIT_ASSETS_READY__`。圖片路徑 `resolveAssetUrl(\`assets/units/${unitDef.file}\`)`（BASE_URL 相容）。目前正式圖集是 `public/assets/units/` 的 10 張男性 webp（共約 4.4 MB）＋ `manifest.json`（`cellPx 256`、沒有 `referenceHeightPx` 欄位，執行期退回常數 158.3）。
- **試作圖集**：分支 `docs/art/faction-animation-v01/atlases/*.webp` 20 張共 9.67 MB、`manifest.json`（`cellPx 448`、`paddingPx 96`、`anchor (224, 280.32)`、`referenceHeightPx 158.3`，`file` 是 `atlases/<name>.webp`）。
- **陣營染色**：`data/units/factionSkin.ts:281` 的 `sprite.tint` 已是 `null`，新圖烘入的陣營色不會被二次染色。
- **女性**：`bodyTypes.ts` 的 `FEMALE.enabled = false`、`BODY_TYPE_SPAWN.weights.FEMALE = 0`、`fallback 'MALE'`。`pickBodyType(agentId, matchSalt)` 用雜湊，**不消耗模擬 RNG**（`agentManager.ts:68`），所以啟用女性不該改變戰鬥結果。
- **頭頂高度**：`SpriteUnitRenderer.ts:102` 用 `unitDef.idleHeightPx` 算頭頂（頭頂標記用）。新髮型可能讓 `idleHeightPx` 變高；投影中心／發射點／受擊點不讀圖集（RenderSpec §1 表，`projection.ts` 由常數推導）。

### 2. 目標與規則（DOM）
- **固定契約**（照交接文件 §4）：共用 `referenceHeightPx = 158.3`、`targetHeightCanvasUnits = 59`，不得用各套 `idleHeightPx` 或分套 packer 自算的值重新縮放；兩個體型 `heightScale = 1`、`anchorYOffset = 0` 不變；保留每格 w／h／ox／oy；不要把 448 的 raw 裁回 256。key 維持 `BLUE|RED:ROLE:MALE|FEMALE`。不引入 WebGL。
- **記憶體做法**（建議，證據不支持就停下回報）：
  1. **圖集離線先縮成 0.5 倍再出貨**：正式 webp 的像素＝試作 atlas 整張縮 0.5（寬高用 `Math.round(w*0.5)`，與執行期現在的縮法一致，高品質縮放）。manifest 加頂層欄位 `atlasScale: 0.5`，**格座標（x／y／w／h／ox／oy、atlas.w／h）維持全尺寸座標不變**。`bakeAtlas` 依 `atlasScale` 換算：層級 L 的目標寬高＝round(圖寬 × L / atlasScale)；L 等於 atlasScale 時不再重採樣。這樣 `SpriteUnitRenderer`、殘影、剪影的取格程式都不用改。`atlasScale` 缺省視為 1（舊格式相容），加單元測試。
  2. **按需載入＋釋放**：`preloadCoreUnits` 改成只載入「目前場上會用到的 key」（由 AgentManager 生成時或渲染端第一次要畫該 key 時觸發，不在 renderer 寫死性別），並行數上限 2；圖集還沒好時沿用現有的未載入退回行為。換戰鬥／展示換隊時，釋放目前名單不用的 key（畫布寬高設 0、從 Map 刪除，殘影的染色快取也要跟著清掉該 key）。`__UNIT_ASSETS_READY__` 的語意改成「目前名單的圖集都載入了」。
  3. 不得恢復 1.0／0.25 層級。
- **女性啟用**：`FEMALE.enabled = true`、`weights` 男女各 50（若使用者另有指示以使用者為準）；手動指定體型、fallback、外觀映射照現有資料流，不在 renderer 寫死。
- **驗收（數字寫進報告）**：
  1. **記憶體**：`node tools/ui-e2e/perf-lifecycle-soak.mjs --device=iphone`（改前在 main 跑一次、改後跑一次，同參數）：存活畫布數、渲染程序記憶體（`rendMB`）的穩態與峰值。改後穩態**不得高於改前 + 30 MB**，冷啟動峰值不得高於改前。
  2. **確定性**：`node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=tools/ui-e2e/out/skin_sim.json` 改前／改後勝負結果**完全相同**（體型不影響模擬）；不同就停下回報。
  3. **座標**：`npm run verify:coords` 不得新增違規；`tests/CoordinateProtocol.test.ts` 通過；頭頂標記高度（`headTopPx`）男女各職業的改前／改後數值列表，變化 > 6 px 的列出來給主代理判斷，不要用局部偏移去掩蓋。
  4. **實跑**：`node tools/ui-e2e/runtime-smoke.mjs --shot`（0 頁面錯誤、battleTime 前進）；開一場戰鬥截 1 張男女混合的圖、展示模式截 1 張；看到穿插、裁切、錨點浮空或陷地就記下陣營／職業／性別／動作／方向／格號。
  5. `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`：5 張地形保真必須通過；`battle_frozen` 預期會失敗（單位換新圖），**不得重錄**，產生舊／新／差異三張圖放 `tools/ui-e2e/out/skin_battle_frozen_{old,new,diff}.png`，報告寫 meanAbsDiff，主代理依取證流程重錄。perf 護欄必須通過。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| S0 | 開 `feat/faction-skins`；從 skin 分支取 `tools/assets/blender/**`、`art-source/**`；三個 skin 設定 JSON 移到 `art-source/faction-skins/` 並同步 Blender 腳本的讀取路徑；`.gitignore` 加 `__pycache__/`；試作的文字報告（`REPORT.md`、`validation.json`、`visual-review.json`、`gallery-validation.json`）放 `docs/art/faction-animation-v01/`，**不帶任何 gif／png／webp**。離線產生 20 張 0.5 倍正式圖集（放 `tools/ui-e2e/out/` 暫存，S2 才進 `public/`）。 | `git diff main --stat` 沒有 docs/art 二進位檔；Python 腳本 `--help` 或乾跑可執行；lint／test／build |
| S1 | （閘門通過後）`SpriteAtlasStore` 支援 `atlasScale`＋單元測試（atlasScale 0.5 的層級畫布尺寸、取格座標與 1.0 舊格式一致）。 | lint／test／build |
| S2 | 正式圖集與 manifest：20 張進 `public/assets/units/`（檔名 `<team>_<role>_<body>.webp`，舊 10 張同名覆蓋），manifest 用 448／padding 格式＋`referenceHeightPx 158.3`＋`atlasScale 0.5`，`file` 只寫檔名。 | runtime-smoke；驗收 3 |
| S3 | 按需載入＋釋放、`__UNIT_ASSETS_READY__` 語意、女性啟用。 | 驗收 1、2、4 |
| S4 | 全套驗證。 | 驗收 5 |
| REPORT | `docs/FACTION_SKIN_INTEGRATION_REPORT.md`：改前／改後記憶體表、確定性結果、頭頂高度表、截圖與差異圖路徑、沒達標的項目、每個任務的 commit（回退指南）。 | — |

### 4. 守則與停下條件（INV）
- 閘門沒過、記憶體驗收不過、確定性不同、5 張地形保真失敗：停下回報，不要加別的快取或安全網。
- 要改受保護檔案、或要改座標協議（RenderSpec）才能接上：停下說明。
- 發現外觀缺陷：只記錄位置（陣營／職業／性別／動作／方向／格號），不重烘，交給使用者決定。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、素材 URL 用 `resolveAssetUrl`。

### 5. 回報格式
最後的回覆只要：完成／未完成的任務 ID 與 commit；每個檢查的「指令＋退出碼＋log 路徑」；記憶體改前／改後表；截圖與差異圖路徑；報告路徑。不要貼整段 log 或全文。

---

## 回來後使用者要做的事（給人看）
1. 把 GPT 的最後回覆貼給主代理；主代理審查 `git diff main...feat/faction-skins`、依取證流程重錄 `battle_frozen`，再問要不要合併。
2. 實機看：男女混合的戰鬥、展示模式長跑（iPhone 有沒有再自動重載）。
