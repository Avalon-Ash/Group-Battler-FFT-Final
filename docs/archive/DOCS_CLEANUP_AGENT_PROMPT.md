# 任務合約：文件與註解整理（只改文件與註解，不改行為）

> 用法：在 IDE 開啟 `C:\Git\Group-Battler-FFT-Final`，執行 `/goal docs/DOCS_CLEANUP_AGENT_PROMPT.md`，整份一次跑完。
> 你同時受 `AGENTS.md`（實作代理合約）約束；本檔與 `AGENTS.md` 衝突時，**停下回報，不要自己選**。
> 你的成果會由主代理逐行審查。主代理最在意兩件事：**① 沒有改到任何執行行為 ② 沒有動到受保護檔案**。做不到的就跳過並寫進報告，不要硬做。

---

## 0. 開工檢查（C0，不符合任何一項就停下回報）

1. `git branch --show-current` 必須是 `docs/cleanup`。不是就停。
2. 這個分支必須已包含：`data/units/appearance/deathMotion.ts`、`docs/BR_FIX_REPORT.md`、`.claude/agents/reviewer.md`。缺任何一個就停。
3. `git status --short` 必須是空的。不是就停。
4. 執行 `npm run build`，然後把 `dist/assets/` 內的所有檔名排序後寫入 `tools/ui-e2e/out/_dist_before.txt`（這個資料夾被 gitignore，不會被提交）。
   - 範例（PowerShell）：`Get-ChildItem dist/assets -Name | Sort-Object | Out-File -Encoding utf8 tools/ui-e2e/out/_dist_before.txt`

---

## 1. 鐵律

### 1.1 不得改變執行行為
- 只允許：修改／刪除 Markdown 文件、修正 `.ts`／`.tsx`／`.mjs` 內**已過期的註解**、用 `git mv` 把已完成的文件搬到 `docs/archive/`、C5 的受控死碼刪除。
- **註解的定義**：`//` 或 `/* */` 裡的文字。下列**不是註解，一律不得改**：
  - 字串內容，包括 `DesignExporter.ts` 裡的 `s += "..."`、`engine.log(...)` 的訊息文字、UI 文字。這些會進到執行結果裡。
  - 程式碼、常數數值、型別、`import`、測試斷言。

### 1.2 用 build 雜湊證明沒改到行為（每個任務結束都要做）
1. 執行 `npm run lint`、`npm test`、`npm run build`，三個都必須通過。
2. 把新的 `dist/assets/` 檔名清單跟 `tools/ui-e2e/out/_dist_before.txt` 比對。
3. **除了 C5，檔名必須完全相同**（Vite 檔名內含內容雜湊；純註解改動不會改變雜湊）。
4. 只要不同，代表你改到程式碼了：用 `git diff` 找出非註解的改動並還原，再重新比對。

### 1.3 受保護檔案（一個字都不准改，也不准搬或刪）
- 合約：`AGENTS.md`、`CLAUDE.md`、`.claude/**`
- 交接：`docs/HANDOFF.md`、`docs/CLAUDE_CODE_START.md`
- 部署（使用者決定保留）：`Dockerfile`、`server.js`、`.dockerignore`、`.github/**`，以及 `README.md` 裡講 Docker／Cloud Run 部署的段落
- 依賴：`package.json`、`package-lock.json`（也不得 `git add package-lock.json`）
- 測試基準：`tools/ui-e2e/*baseline*`、任何 `perf:fidelity` 基準檔
- 素材：`art-source/**`、`public/assets/**`
- 程式碼：`engine/audio/**`、UI 樣式（`*.css`、`styles/**`）

發現受保護檔案裡有過期內容時，**不要改**，寫進報告的「給主代理」一節。

### 1.4 其他
- Git：只 commit 到 `docs/cleanup`。不得 push、merge、rebase、切換到 `main`、改動 `main`。
- 一個任務一個 commit，訊息格式 `docs(cleanup): C<n> <摘要>`。
- 行尾：多數原始檔是 CRLF，編輯時保持原行尾。新檔用 LF。改完用 `git diff --stat` 確認沒有出現整檔行尾變動（某檔改一行卻顯示整檔改動，就是行尾壞了，要還原重做）。
- 不得輸出 `&gt;`、`&lt;` 之類的 HTML 實體。
- 同一個問題失敗 3 次 → 寫進報告並跳過。

---

## 2. 現況事實（判斷「過期」的唯一依據）

以下是目前程式碼的真實狀態。文件或註解跟這裡衝突，就是過期。**不要相信舊文件或舊報告的「已完成」宣稱，只以程式碼和測試為準。**

1. **死亡流程**
   - 所有死亡（含縮圈墜落、摔死）都經過唯一入口 `agentManager.handleDeadState`。
   - `deathTimer` 和 `fullyDead` 的**唯一寫入者**是 `agentManager.updateDeathState`。`AnimationSystem` 只負責衍生動畫狀態，不碰計時。
   - 掉進虛空的屍體由 `PhysicsEngine` 設 `outOfBounds`，在同一個 tick 由 `updateDeathState` 回收。
   - 畫面上，`UnitDeathPainter` 播放精靈的 `death` 動畫，接著擊飛、停格、淡出。擊飛位移由 `data/units/appearance/deathMotion.ts` 依 `deathTimer` 推導，參數在 `constants.ts` 的 `DEATH_KNOCKBACK`。
   - `RagdollFactory` 建立的骨架快照**只用來取軀幹的初速**。`RagdollPhysics` **沒有任何呼叫者**，沒有布娃娃物理在跑。
2. **單位外觀**
   - 單位用精靈圖集繪製（`SpriteUnitRenderer`）。
   - `ImperialTokenFactory`／`CovenantTokenFactory` 仍在使用，只負責單位腳下的底座和職業圖示。
   - 舊的 Imperial／Covenant 人體繪製器、`UNIT_RENDER_MODE`、`TERRAIN_SKIN.enabled`、`VFX_SPRITES.enabled` 都已移除。
3. **死亡特效**：`UnitShatter.spawn` 產生輕量的塵煙加火花（參數 `constants.ts` 的 `DEATH_VFX`），外加陣營專屬的靈魂飛升／血噴。舊的 token 碎片噴射和 `SHATTER_SHARDS_*` 已移除。
4. **大逃殺 AI**：`ai_profiles.ts` 的 `Combat` 底下有一層 `Combat Actions` SELECTOR（技能 → 追擊 → Idle）。**沒有發呆看門狗**，`AI_IDLE_WATCHDOG_SEC` 不存在。
5. **AI Studio 專用檔已移除**：`.aistudio/`、`server.ts`、`metadata.json`、`.env.example`、`ALLOW_ALL_HOSTS`。`vite.config.ts` 不再讀環境變數。`GEMINI_API_KEY` 的打包風險已經不存在。
6. **Facade**：`engine/renderer.ts`、`engine/game.ts`、`engine/systems/grid.ts`、`engine/systems/map.ts`。`engine/systems/combat.ts`、`movement.ts`、`unit.ts`、`vfx.ts` 是只做轉發的 barrel。dev server 的 port 是 3000。

---

## 3. 任務

### C1 · 盤點（唯讀，不改任何檔案）
建立 `docs/CLEANUP_REPORT.md`，先寫「盤點」一節。用 `git grep` 找出跟 §2 衝突的內容，每項標出 `檔案:行號`、目前的寫法、應有的事實。至少涵蓋：

1. **死亡流程的過期註解**：搜尋 `Ragdoll`、`布娃娃`、`RagdollPhysics`、`TODO: RAGDOLL`、`DeathPainter`、`deathTimer`、`fullyDead`。重點檔案：`engine/systems/unit/RagdollFactory.ts`、`engine/systems/unit/RagdollPhysics.ts`、`engine/systems/agentManager.ts`（檔頭方框註解）、`engine/types/ragdoll.ts`、`engine/systems/unit/UnitSystem.ts`、`constants.ts`（`RAGDOLL_BONE_PLACEHOLDER_COLOR` 附近）。
2. **單位外觀的過期描述**：搜尋 `UNIT_RENDER_MODE`、`TERRAIN_SKIN`、`VFX_SPRITES`、`ImperialUnitRenderer`、`CovenantUnitRenderer`、`程序化單位`。重點檔案：`docs/ART_REPORT.md`（回退方式）、`docs/DECOUPLING_HANDOFF.md`、`docs/ART_PROGRESS.md`、`docs/ASSET_LEDGER.md`、`README.md`、`tools/assets/README.md`、`tools/assets/blender/README.md`。
3. **特效的過期描述**：搜尋 `UnitShatter`、`SHATTER_SHARDS`、`token 碎片`、`碎片噴射`。
4. **AI Studio／金鑰的過期描述**：搜尋 `server.ts`、`ALLOW_ALL_HOSTS`、`GEMINI_API_KEY`、`metadata.json`、`.aistudio`。注意：若在 `docs/DECOUPLING_HANDOFF.md` 之類被描述成「待修風險」，就屬於過期。
5. **失效路徑**：寫一個暫存腳本放在 `tools/ui-e2e/out/`（不提交），掃描所有 `docs/*.md`、`README.md`、`tools/**/*.md`、`CREDITS.md`，找出內文提到的 `docs/…`、`engine/…`、`data/…`、`tools/…`、`components/…` 路徑中，實際不存在的那些。列出清單和總數。
6. **自稱完成但與事實不符**：`docs/ART2_PROGRESS.md`（AI Studio 產生，它曾誤刪 token 工廠、宣稱全綠但畫面凍結）只列出與程式碼不符的宣稱，**不要照抄它的完成宣稱**。
7. **受保護檔案的過期處**：只列出來，不改（交給主代理）。

commit：`docs(cleanup): C1 inventory`

### C2 · 修正過期註解（只改註解）
依 C1 第 1～4 項，把**非受保護檔案**裡的過期註解改成符合 §2 的描述。
- 簡短、準確，維持原本的語言和格式（例如方框註解的寬度和對齊）。
- 已經完成的 `TODO` 刪掉；仍然有效的 `TODO` 保留。
- 每改完一個檔案就跑一次 build 比對雜湊（§1.2）。

commit：`docs(cleanup): C2 fix stale comments`

### C3 · 修正文件事實
依 C1 第 2～6 項，更新**非受保護**的文件：
- `docs/ART_REPORT.md` 的「回退方式」改成：「舊的程序化單位／地形／粒子管線已移除；要回退請用 `git revert`，或使用 tag `art-ckpt-final`。」另外補一小段「後續變更」，只用一兩句話引用 `docs/ART2_PROGRESS.md`、`docs/BR_FIX_REPORT.md`、`data/units/appearance/deathMotion.ts`，不要重寫細節。
- `docs/DECOUPLING_HANDOFF.md`：已經解決的風險項目，在原處標注「（已解決：<一句話說明>）」，不要整段刪除。
- 失效路徑：檔案移到 `docs/archive/` 的就改成新路徑；已經不存在、也沒有替代檔案的，改寫成不含路徑的敘述，並寫進報告。
- 其他 README 和素材文件的過期描述照同樣原則處理。

commit：`docs(cleanup): C3 fix stale docs`

### C4 · 歸檔已完成的文件
用 `git mv` 把下列檔案搬到 `docs/archive/`：
- `docs/ART_AGENT_PROMPT.md`、`docs/ART_AGENT_PROMPT_2.md`、`docs/BR_FIX_AGENT_PROMPT.md`、`docs/ART_PROGRESS.md`、`docs/ART2_PROGRESS.md`
- `docs/ASSET_NEEDS.md`：先讀內容；若裡面還有未完成的需求就**不要搬**，在報告寫明原因。

**不得搬**：§1.3 的受保護檔案、`docs/ART_STYLE_BIBLE.md`、`docs/ASSET_LEDGER.md`、`docs/BAKED_RENDERING_DESIGN.md`、`docs/DECOUPLING_HANDOFF.md`、`docs/VFX_INVENTORY.md`、所有 `*REPORT*.md`、`CREDITS.md`、`README.md`，以及本檔（本檔最後由主代理歸檔）。

搬完重跑 C1 第 5 項的腳本，**失效路徑必須是 0**（受保護檔案裡的失效路徑除外，那些列進報告）。

commit：`docs(cleanup): C4 archive finished docs`

### C5 · 刪除死碼（唯一允許改程式碼的任務，條件嚴格）
只處理**零引用**的符號或檔案。每一個都要用 `git grep -n "<名稱>"` 證明：除了定義處、barrel 的 `export *` 那一行、註解之外，沒有任何引用（範圍包含 `tests/`、`tools/`、`components/`、`hooks/`）。

候選（要自己驗證，不成立就不刪）：
1. `engine/systems/unit/RagdollPhysics.ts`：整個檔案，以及 `engine/systems/unit.ts` 裡對應的那一行 `export *`。
2. `SpriteManager.getUnitLayersFull`，以及只有它在用的型別或輔助函式。

規則：
- 每刪一個，就跑 `npm run lint`、`npm test`、`npm run build`，必須全部通過。測試失敗代表其實還有引用，**立刻還原**。不得修改任何測試。
- 仍被 Token 工廠、底座、職業圖示、特殊模型（羊化、冰凍）使用的程式碼一律保留。
- 這個任務會讓雜湊改變，這是預期的。做完後把新的 `dist/assets` 檔名清單寫回 `tools/ui-e2e/out/_dist_before.txt`，作為後續的比對基準。
- 有任何疑慮就跳過，寫進報告「建議主代理決定」。**寧可不刪。**

commit：`docs(cleanup): C5 remove zero-reference dead code`

### C6 · 報告與最終驗證
把 `docs/CLEANUP_REPORT.md` 寫完整，包含：
1. 每個任務的 commit hash 和一句話摘要。
2. 改了哪些檔案，分成「註解／文件／歸檔／刪除」四類。
3. 失效路徑：修復前的數量和修復後的數量。
4. C5：每個刪除項目附上 `git grep` 證據；跳過的項目附上原因。
5. **給主代理**：受保護檔案裡的過期處（含 `docs/HANDOFF.md`）、刻意保留但可疑的項目、你不確定的判斷。
6. build 雜湊比對結果：C2～C4 每次都相同（是／否）。

最終驗證，全部要通過：`npm run lint`、`npm test`、`npm run build`、`npm run perf:fidelity`（必須 0 差異）。
工作樹必須乾淨。打本地 tag `docs-cleanup-final`。不 push。

commit：`docs(cleanup): C6 report`

---

## 4. 本輪不得做的事（總結）
- 改任何執行行為、字串、常數、型別、測試；重錄基準；放寬門檻。
- 動 §1.3 的受保護檔案。
- 沒有 `git grep` 零引用證據就刪除檔案。
- 為了「看起來整齊」而重排、重寫仍然正確的文件或註解。
- push、merge、動 `main`。

## 5. 跑完後（給使用者看）
告訴主代理「文件整理跑完了」即可。主代理會審查 `git diff main...docs/cleanup`、比對雜湊、更新 `HANDOFF.md`，再問你要不要合併。
