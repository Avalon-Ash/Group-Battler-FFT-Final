# 外出執行指令 #11：文件與註解整理（只改文件與註解，不改行為）

> 用法：`/goal docs/DOCS_CLEANUP_AGENT_PROMPT.md`（IDE 本機代理，**整份一次跑完**）。
> **前置條件（開工第一步檢查，不符就停下回報）**：
> 1. `main` 已合併 `fix/br-ghosts-idle`（大逃殺修正，會有 `docs/BR_FIX_REPORT.md`）與 `feat/death-vfx`（死亡特效／擊飛，會有 `data/units/appearance/deathMotion.ts`）。兩者缺一 → 停下回報（本輪若先跑會與它們產生文件／註解衝突）。
> 2. 從目前 `main` 開 **`docs/cleanup`** 分支，只在此分支工作。**不得 push、不得合併、不得動 `main`**、不得 `git add package-lock.json`。
>
> **本輪鐵律：不得改變任何執行行為。** 只允許：修改／刪除 Markdown 文件、修正 `.ts/.tsx/.mjs` 內**已過期的註解**、搬移（`git mv`）已完成的文件到 `docs/archive/`。**不得**改任何程式碼邏輯、常數數值、型別、匯入、測試斷言（§ T6 例外另有嚴格條件）。

## 0. 守則

- 必讀：`AGENTS.md`、`docs/HANDOFF.md`。**保留與你改動無關的既有註解與文件內容**；只改「事實已經不符」的部分。
- 檔案編碼：多數原始檔是 CRLF，編輯時保持原行尾；新檔用 LF；不得輸入 `&gt;` `&lt;` 等 HTML 實體；改完 `git diff --stat` 確認沒有整檔行尾變動。
- **驗證「沒有改到行為」的客觀做法（必做）**：
  1. 開工先 `npm run build`，記下 `dist/assets/` 內所有檔名（Vite 檔名含內容雜湊）存成 `docs/_cleanup_dist_before.txt`（暫存檔，最後刪除、不提交）。
  2. 每個任務結束都 `npm run lint`、`npm test`、`npm run build`，並重新比對 `dist/assets/` 檔名清單：**純註解／文件改動時，檔名（雜湊）必須與開工時完全相同**。出現差異＝你改到了程式碼，立刻還原該檔案的程式碼改動。
  3. **T6（刪除死碼）是唯一允許讓雜湊改變的任務**，且須符合該節條件。
- 一任務一 commit（格式 `docs(cleanup): C<n> ...`）。同題失敗 3 次 → 記錄並跳過。

## 1. 任務

### C1 · 盤點過期內容（唯讀，產出清單，不改檔）

用 `git grep` 找出事實已不符的描述，建立 `docs/CLEANUP_INVENTORY.md`（暫存工作清單，C7 完成後刪除或併入報告）。至少涵蓋：

1. **死亡管線的過期註解**（現況：單位死亡由 `UnitDeathPainter` 播放新精靈的 `death` 動畫＋擊飛＋淡出，擊飛位移由 `data/units/appearance/deathMotion.ts` 以 `deathTimer` 推導；`deathTimer` 的**唯一寫入者**是 `agentManager.updateDeathState`；`RagdollFactory` 建的骨架快照現在**只被用來取軀幹初速**，沒有布娃娃物理繪製）。搜尋 `Ragdoll`、`布娃娃`、`RagdollPhysics`、`DeathPainter` 的註解與文件，凡宣稱「painter 做布娃娃物理」「TODO: RAGDOLL」「[ARCH] 死亡演出由 DeathPainter 負責」且與現況不符者列入。涉及檔案例如：`engine/systems/unit/UnitSystem.ts`、`engine/systems/unit/RagdollFactory.ts`、`engine/systems/unit/RagdollPhysics.ts`、`engine/systems/agentManager.ts`、`engine/types/ragdoll.ts`、`constants.ts`（約 371 行附近的 RagdollBone 註解）、`README.md`（約 252 行）。
2. **單位外觀管線的過期描述**：現況為「精靈圖集單位（`SpriteUnitRenderer`）＋保留的 `ImperialTokenFactory`／`CovenantTokenFactory`（只負責單位腳下底座與職業圖示）」，**舊的 Imperial／Covenant 人體繪製器、`UNIT_RENDER_MODE`、`TERRAIN_SKIN.enabled`、`VFX_SPRITES.enabled` 已移除**。搜尋這些名稱，找出文件、註解中仍把它們當作現行／可切換開關的描述（例如 `docs/ART_REPORT.md` 的「回退方式」、`docs/DECOUPLING_HANDOFF.md` §11、`docs/ART_PROGRESS.md`、`docs/ASSET_LEDGER.md`、`AGENTS.md` §1／§6、`README.md`、`tools/assets/README.md`、`tools/assets/blender/README.md`）。
3. **特效管線的過期描述**：現況為「死亡特效＝輕量塵煙＋火花（`UnitShatter.spawn`，參數在 `constants.ts` 的 `DEATH_VFX`），舊的 token 碎片噴射已移除」。搜尋 `UnitShatter`、`SHATTER_SHARDS`、`token 碎片`。
4. **路徑／檔名失效的引用**：已搬進 `docs/archive/` 的檔案仍被以舊路徑引用（`PERF_*`、`UI_*`、`AUDIO_AGENT_PROMPT.md`…）。用腳本檢查所有 `docs/*.md`、`README.md`、`AGENTS.md` 內出現的 `docs/…`、`engine/…`、`data/…`、`tools/…` 路徑是否存在，列出失效者。
5. **不該進 repo 的雜物**：`.aistudio/`（AI Studio 產生的 `implementation_plan.md` 與 metadata）、`server.ts`（AI Studio 加入，**先查是否被 `package.json`／`vite.config.ts`／任何程式引用**；有引用就保留並在清單說明用途）、`art-source/` 與 `public/assets/units` 的重複圖集（**只列入清單，不要刪**，由主代理決定）、暫存檔、孤兒文件。
6. **HANDOFF 與進度文件的事實落差**：`docs/HANDOFF.md` §2（Git 狀態、分支、路線圖）、§4（效能熱點）是否與現況一致；`docs/ART2_PROGRESS.md`（AI Studio 產生）內容是否與實際結果相符（AI Studio 曾宣稱完成但實際有誤，例如誤刪 token 工廠後已復原、當時的驗證沒有看過實際畫面——**只以現有程式碼與測試為準**，不要照抄它的完成宣稱）。

### C2 · 修正過期註解（只改註解）

依 C1 §1、§2、§3 的清單，**逐處把註解改成與現況相符**（簡短、準確，保持原本的語言與格式風格；原本寫「TODO」且已完成的移除；仍有效的 TODO 保留）。**不得改任何非註解的字元**。每改完一批就跑 build 比對雜湊（見 §0）。

### C3 · 文件事實校正

依 C1 §2、§3、§4 的清單，更新文件內容使其符合現況：
- `docs/ART_REPORT.md`：「回退方式」改為「舊程序化單位／地形／粒子管線已移除；回退請用 `git revert` 或 tag `art-ckpt-final`／`pre-art-fix2`」，並補一段「美術修正輪與死亡特效輪的後續變更」摘要（引用 `docs/ART2_PROGRESS.md`、`docs/BR_FIX_REPORT.md`、`deathMotion.ts`，不要重寫細節）。
- `AGENTS.md`：**只改與事實不符的名詞**（例如 §1 的 Unit Appearance SSOT 描述、§6 目錄樹），**不得新增、刪除或放寬任何規則／限制句**；改動行數列入報告供使用者確認。
- 修復所有失效路徑（指向 `docs/archive/…` 的就更新路徑；已不存在且無替代者的引用，改寫成不含路徑的敘述並於報告列出）。
- 各 README／素材文件中的過期描述同理。

### C4 · 歸檔已完成輪次的文件

把**已完成、且僅作歷史參考**的文件 `git mv` 到 `docs/archive/`：`ART_AGENT_PROMPT.md`、`ART_AGENT_PROMPT_2.md`、`BR_FIX_AGENT_PROMPT.md`、`DOCS_CLEANUP_AGENT_PROMPT.md`（本檔，完成後）、`ART_PROGRESS.md`、`ART2_PROGRESS.md`、`ASSET_NEEDS.md`（若內容已被 `docs/HANDOFF.md` 的待辦池取代，先確認再搬；否則保留）。**不得搬**：`HANDOFF.md`、`ART_STYLE_BIBLE.md`、`ASSET_LEDGER.md`、`BAKED_RENDERING_DESIGN.md`、`DECOUPLING_HANDOFF.md`、各 `*_REPORT*.md`（報告類保留在 `docs/` 供查閱）、`CREDITS.md`、`README.md`、`AGENTS.md`。搬完後修正所有指向被搬檔案的引用（C3 的腳本再跑一次，失效路徑必須為 0）。

### C5 · 移除雜物

- 刪除 `.aistudio/`（若該目錄已被追蹤）；在 `.gitignore` 加入 `.aistudio/`（保留既有內容）。
- `server.ts`：若 C1 確認**沒有任何引用**，列入報告建議刪除但**不要自行刪**；若有引用，在檔案頂端以註解說明用途（只加註解）。
- 清除暫存／孤兒檔（`docs/_*`、`tools/ui-e2e/out/` 內被誤提交者等）；`art-source/` 與重複圖集**不動**。

### C6 · 死碼清理（唯一允許改程式碼的任務；嚴格條件）

只處理**零引用**的符號／檔案，且必須逐一以 `git grep -n "<名稱>"` 證明除了定義處與註解外無任何引用（含 `tests/`、`tools/`）。候選（需自行驗證）：`SpriteManager.getUnitLayersFull` 與其專屬型別／輔助函式、`UnitAssetsFull` 中僅供舊碎片特效使用的欄位、其他在 C1 發現的孤兒匯出。規則：
- 每刪一個，跑 `npm run lint`、`npm test`、`npm run build` 全綠；**不得改動任何測試的斷言**（若刪除導致測試失敗，代表仍有引用，立即還原）。
- **仍被 Token 工廠、底座、職業圖示、特殊模型（羊化／冰凍）使用的一律保留。**
- 此任務會使 build 雜湊改變是預期的；改完後以新的 `dist` 檔名清單當作之後任務的基準。
- 這一步有疑慮就跳過並在報告列為「建議由主代理決定」，**寧可不刪**。

### C7 · 更新交接文件與報告

- **`docs/HANDOFF.md` 全面校正**（它是之後換 Claude Pro 時的唯一入口，必須自洽）：§2 Git 狀態與分支（以 `git branch -a`、`git log --oneline -20`、`git tag -l` 為準）、路線圖（已完成：效能 1–4、UI、音訊、美術與美術修正輪、死亡特效／擊飛、大逃殺修正；待辦：以 `docs/BR_FIX_REPORT.md` §4、`docs/PERF_REPORT_4.md` §11、`docs/ASSET_NEEDS.md` 的殘餘事項為準）、§4 效能殘餘熱點、**「已知教訓」小節**（新增：① AI Studio 容器無法看實際畫面、無法跑 Playwright，曾因此交出畫面凍結且誤刪必要檔案的版本，之後凡改動渲染／生命週期須在本機實跑驗證；② React StrictMode 下元件清理不可立即 `destroy()` 重用中的引擎；③ `deathTimer` 必須單一寫入者；④ 刪除「舊管線」前必須 `git grep` 證明零引用）、**工作流程與省點守則**維持原有並檢查是否過期。
- 新增 `docs/CLEANUP_REPORT.md`：各任務 commit、改了哪些檔（分「註解／文件／歸檔／刪除」）、`AGENTS.md` 改動行 diff、`docs/archive/` 新增清單、失效路徑修復數量、C6 刪除清單與證據、**刻意保留但可疑的項目**（`server.ts`、`art-source/` 重複圖集等）請主代理決定。
- 刪除暫存檔 `docs/_cleanup_dist_before.txt`、`docs/CLEANUP_INVENTORY.md`（內容已併入報告）。
- 最終驗證：`npm run lint`、`npm test`、`npm run build`、`npm run perf:fidelity`（必須 0 差異；C6 之外不應有任何變化）。工作樹乾淨，不 push，打本地 tag `docs-cleanup-final`。

## 2. 本輪不得做的事

- 改任何執行行為、常數、型別、測試斷言；重錄 baseline；放寬門檻。
- 新增、刪除、放寬 `AGENTS.md` 的規則句（只可校正名詞事實，並列入報告）。
- 刪除 `art-source/`、素材、`server.ts`（除非 C6 條件全部成立且零引用）。
- 動 `engine/audio/**`、美術素材、UI 樣式。
- push／合併／動 `main`。
- 為了「看起來乾淨」而刪除仍有引用的檔案——沒有 `git grep` 零引用證據就不要刪。

## 3. 回來後使用者要做的事（給人看）

1. 讀 `docs/CLEANUP_REPORT.md`，特別看「`AGENTS.md` 改動行」與「刻意保留但可疑的項目」。
2. 抽看 `docs/HANDOFF.md` 是否足以讓 Claude Pro 直接接手。
3. 交給主代理審查（`git diff main...docs/cleanup`，確認純文件／註解＋C6 的受控刪除）後再合併。
