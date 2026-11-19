# ADR 拆出與索引改造報告

- 工作區：`C:\Git\_wt_adr`
- 分支：`docs/adr`
- 起始 `HEAD`：`895e1d4a7421997100b250ff9c2334c99374e8d9`
- 產出檔案：`docs/adr/README.md`、`docs/adr/0001-*.md` ～ `docs/adr/0022-*.md`、改寫後 `docs/DECISIONS.md`、本報告 `docs/ADR_REPORT.md`

---

## 1. ADR 清單與拆分理由（共 22 份）

| 編號 | 檔案 | 標題 | 狀態 | 來源（`docs/DECISIONS.md`） |
| :--- | :--- | :--- | :--- | :--- |
| 0001 | [0001](adr/0001-canvas2d-and-prebaked-vfx.md) | 純 Canvas 2D 渲染與預烘焙特效零件 | 採用 | §1 第 4 條＋§3 第 1 條 |
| 0002 | [0002](adr/0002-state-field-single-owner.md) | 狀態欄位唯一寫入者 | 採用 | §4 第 2 條 |
| 0003 | [0003](adr/0003-coordinate-protocol-and-serial-render.md) | 座標協議單一規格與渲染工作串行 | 採用 | §4 第 1 條 |
| 0004 | [0004](adr/0004-doc-anti-drift.md) | 文件防過時：刪除不歸檔與測試把關 | 採用 | §4 第 5 條 |
| 0005 | [0005](adr/0005-contract-layering.md) | 代理合約分層（常駐、Skill、Hook、測試） | 採用 | §4 第 6 條 |
| 0006 | [0006](adr/0006-automated-hygiene-gates.md) | 專案衛生改由自動化閘門把關 | 採用 | §5 第 10 條 |
| 0007 | [0007](adr/0007-visual-verification-same-env-ab.md) | 畫面驗證：同環境 A/B 與保真基準不得任意重錄 | 採用 | §4 第 4 條＋§5 第 11 條 |
| 0008 | [0008](adr/0008-ai-mode-topology-small-trees.md) | AI 採用狀態拓樸加每狀態一棵小樹 | 採用 | AI 與大逃殺 第 1 條 |
| 0009 | [0009](adr/0009-last-stand-early-trigger.md) | 背水一戰依剩餘地塊與存活人數提早觸發 | 已取代（由 0010） | AI 與大逃殺 第 4 條（前版歷史） |
| 0010 | [0010](adr/0010-last-stand-final-ring-countdown.md) | 背水一戰改於最後一圈倒數開始時觸發 | 採用（取代 0009） | AI 與大逃殺 第 4 條（現行版） |
| 0011 | [0011](adr/0011-ground-drape-baked-hex-mask.md) | 貼地鋪設採合成圖加預烘六角遮罩、不用路徑裁切 | 採用 | AI 與大逃殺 第 3 條 |
| 0012 | [0012](adr/0012-skill-action-pipeline-flat-agent.md) | 技能為動作清單加狀態機、Agent 不拆元件 | 採用 | AI 與大逃殺 第 5 條 |
| 0013 | [0013](adr/0013-ui-pure-projection-and-boundaries.md) | UI 純投影、單一資料流與依賴邊界 | 採用 | UI 第 1、2、7、8 條 |
| 0014 | [0014](adr/0014-ui-off-the-shelf-primitives.md) | UI 採用現成基礎元件庫 | 採用 | UI 第 23 條 |
| 0015 | [0015](adr/0015-game-commands-at-tick-start.md) | 戰鬥中遊戲指令於下一個 tick 開頭套用並記錄 | 採用 | UI 第 12 條 |
| 0016 | [0016](adr/0016-fixed-timestep-and-timescale.md) | 固定步長模擬與倍率控制 | 採用 | UI 第 13 條 |
| 0017 | [0017](adr/0017-contract-first-architecture.md) | 基準性架構改動採契約先行 | 採用 | UI 第 22 條 |
| 0018 | [0018](adr/0018-replay-snapshot-seed-commands.md) | 回放以開戰快照、種子與戰中指令為單位 | 採用 | UI 第 14 條 |
| 0019 | [0019](adr/0019-undo-by-rerun.md) | Undo 採從開戰快照重跑、不存中途快照 | 採用 | UI 第 15 條 |
| 0020 | [0020](adr/0020-frame-interpolation-in-unit-frame-store.md) | 畫面插值僅在 UnitFrameStore.build 執行 | 採用 | UI 第 16 條 |
| 0021 | [0021](adr/0021-match-flow-in-engine.md) | 對局流程置於引擎端且階段由狀態推導 | 採用 | UI 第 18 條 |
| 0022 | [0022](adr/0022-player-control-mode-graph-and-orders.md) | 玩家操控以模式圖切換與固定指令落點實作 | 採用 | UI 第 17、19、21 條 |

### 合併、拆分與日期補查說明

- **合併 `0001`**：§1「禁 Three／Pixi／WebGL」與§3「特效一律預烘焙零件、0 個每幀 `shadowBlur`」共同約束 2D 渲染後端邊界與離線烘焙管線，合併為單一 ADR；日期 `2026-10-16` 補查自 `docs/WORKLOG.md` §1 與 §2 F。
- **合併 `0007`**：§4「保真基準不得任意重錄、門檻不得放寬」與§5「『畫面沒變』一律用同環境 A/B」共同構成畫面正確性驗證準則，合併為一份 ADR，日期取 `2026-10-29`。
- **拆出取代鏈 `0009` → `0010`**：原文於 AI 與大逃殺第 4 條明寫「11-01～11-02 曾改成地塊 ≤ 活人，或活人 ≤3 且地塊 ≤7 就開始，使用者實機後改回最後一圈開始倒數」，依規定拆為兩份並以 `狀態：已取代（由 0010）` 與 `取代：0009` 雙向連結。
- **合併 `0013`**：UI 節第 1、2 條（純投影、條件外移至 selector／資料表）與第 7、8 條（UI 狀態歸屬與匯入依賴邊界）屬於同一組 UI 架構邊界，合併為 `0013`。
- **合併 `0022`**：UI 節的「玩家操控＝換模式圖」、「玩家指令三個落點」與「點擊規則集中於 `engine/systems/ui/tapIntent.ts`」皆為契約 G3 玩家操控架構的不同面向，合併為 `0022`。
- **日期補查**：`0001`（`2026-10-16`）來自 `docs/WORKLOG.md` §1、§2 F；`0002`（`2026-10-16`）來自 `docs/STATE_OWNERSHIP_DESIGN.md` §5；`0003`（`2026-10-17`）來自 `docs/WORKLOG.md` §2 H；`0014`（`2026-11-04`）來自 `docs/WORKLOG.md` §2 BP。

---

## 2. 保留在 `docs/DECISIONS.md` 未拆成 ADR 的條目與理由

| 章節 | 保留條目 | 不拆成 ADR 的理由 |
| :--- | :--- | :--- |
| §1 題材與畫面 | 題材奇幻與等距六角格視角、陣營色與辨識度弱點、HD 為主線與移除 SD 原型 | 屬於產品視覺題材、美術方向與專案階段範圍，非限制模組邊界或資料流的架構約束。 |
| §2 素材策略與授權 | 單位 KayKit 預渲染、障礙物 CC0 3D 套件、授權規定與審計、風格參考圖不進 repo | 屬於美術外包／資產管線選型與法務授權政策，不直接規範引擎或 UI 程式寫法。 |
| §3 視覺細節 | 六角／圓形法陣與線條畫法、`SoftTile` 疊層、不做地形變體 4→8、障礙物動態選型、裝置像素對齊與 `imageSmoothingQuality` low | 屬於單一渲染元件的美術表現規格與局部效能參數取捨，不形成跨模組架構合約。 |
| §4 架構 | 大逃殺「發呆看門狗」不採用 | 屬於單一 bug 修正時的反模式紀錄；禁改 facade 與 AI 狀態拓樸已分別受 `AGENTS.md` 與 `0008` 約束。 |
| §4 架構 | 奧義要有感（共用光爆、移除名稱橫幅與暗場聚光、不做鏡頭推近與模擬頓格） | 屬於特定演出的視覺取捨與使用者體驗決定；表現層不得寫模擬時間已屬全域邊界（`AGENTS.md` §2b）。 |
| §5 專案範圍 | 部署與 Dockerfile 刪除、`art-source` sprites 刪除、網格線／遠端分支／墜落動畫、占位曲與風格取捨、天降類奧義詠唱結束必中、粒子預算 630／1000、雷射只留奧義、COORD-SINK-01 不修、額度與派工分配、縮圈 `minRadius` 定義與預警同法、多段命中與 WoW CC 遞減、狀態視覺配色／圖示列與模型表現規則、R3 屍體滑行排序不修 | 分屬部署範圍、倉庫清理、玩法與數值規則定案、預算數字、不修問題的實務判斷與人力額度分配（渲染串行工作規則已收錄於 `0003`）。 |
| AI 與大逃殺 | 近戰在跳躍力內可打高低差及實機確認、機動技落點規則與 `LandingPlanner`、機動技不帶硬控、導播排分清單與一對取景三景別、大逃殺混抽與血量減半、現有素材即正式版、iPhone 側邊靜音開關照系統行為 | 屬於單一遊戲系統的玩法設計規則、演算法參數或平台原生行為取捨；模式拓樸、貼地遮罩、背水一戰演進與技能管線已拆為 `0008`～`0012`。 |
| UI | UI 魔法數字歸零與 token、材質分級與 `.mat-blur`、層級 `UI_Z`、行為樹獨立視窗、英文大寫等寬標題與字型、操作列純圖示單列、開場標題、玩家操控單位為導播主角與場上金色光圈箭頭 | 屬於 UI 視覺規範、樣式 token、排版層級與個別互動規格，不改變跨系統資料流或引擎狀態邊界。 |

---

## 3. 查不到而填寫「原紀錄沒有寫。」的欄位清單

經對照 `docs/DECISIONS.md`、`docs/plans/optimization-2026-11.md`、`docs/WORKLOG.md`、`docs/STATE_OWNERSHIP_DESIGN.md`、`docs/SKILL_PIPELINE_DESIGN.md` 與 `docs/AI_ROYALE_DESIGN.md`，以下三份 ADR 的 `## 放棄的做法` 無法從既有文件查得明確評估後捨棄的方案，已依規定填寫「原紀錄沒有寫。」：

1. `docs/adr/0015-game-commands-at-tick-start.md` — `## 放棄的做法`
2. `docs/adr/0016-fixed-timestep-and-timescale.md` — `## 放棄的做法`
3. `docs/adr/0017-contract-first-architecture.md` — `## 放棄的做法`

---

## 4. 驗收項目與驗證級別

| 驗收項目 | 驗證級別 | 結果 |
| :--- | :--- | :--- |
| `docs/adr/README.md` 存在且含定義、時機、編號、推翻規則與範本 | 靜態 | 已建立（逐項核對內容與 `tests/AdrIndex.test.ts`） |
| `docs/adr/0001-*.md` ～ `0022-*.md` 共 22 份，編號連續無缺漏重複 | 實跑 | `tests/AdrIndex.test.ts` 通過（6／6） |
| 每份 ADR 含標題、三種合法狀態之一、必備五節、`0009`⇄`0010` 取代鏈雙向一致 | 實跑 | `tests/AdrIndex.test.ts` 通過 |
| `docs/DECISIONS.md` 保留 7 個既有章節標題與「機動技落點」，且與 `docs/adr/` 連結雙向一致 | 實跑 | `tests/AdrIndex.test.ts` 通過 |
| 所有新文件與更新後索引內的路徑、相對連結皆存在，無已移除狀態欄位名 | 實跑 | `tests/DocDrift.test.ts` 通過（3／3） |
| TypeScript 型別檢查無誤 | 實跑 | `npm run lint` 通過（0 錯誤） |
| 全測試套件通過 | 實跑 | `npm test` 通過（167 檔 1586 則全過） |
| 每份 ADR 行數介於 20～50 行 | 靜態 | 逐檔以 `read_file` 確認全數落於 28～35 行之間 |
| 僅新增／修改 `docs/adr/**`、`docs/DECISIONS.md`、`docs/ADR_REPORT.md`，未更動受保護檔案 | 實跑 | `git status` 與 `git diff --stat` 確認 |
| 只寫事實與理由、無效果形容詞，且未複製全文至 `docs/DECISIONS.md` | 靜態 | 逐檔審核內容與索引摘要確認 |

---

## 5. 指令執行紀錄

| 階段 | 指令 | 退出碼 | 備註 |
| :--- | :--- | --: | :--- |
| 開工前 | `git status` | 0 | 分支 `docs/adr`，工作樹乾淨 |
| 開工前 | `git rev-parse HEAD` | 0 | `895e1d4a7421997100b250ff9c2334c99374e8d9` |
| 開工前 | `npx vitest run tests/AdrIndex.test.ts` | 1 | 6 則中 1 則失敗：`has a README and at least 10 ADRs`（`docs/adr/README.md` 尚未建立，檔案數 0） |
| 開工前 | `npx vitest run tests/DocDrift.test.ts` | 0 | 3 則全過（基線） |
| 實作後 | `npx vitest run tests/AdrIndex.test.ts` | 0 | 6 則全過 |
| 實作後 | `npx vitest run tests/DocDrift.test.ts` | 0 | 3 則全過 |
| 實作後 | `npm run lint` | 0 | `tsc --noEmit` 通過 |
| 實作後 | `npm test` | 0 | 167 檔 1586 則全過 |
| 實作後 | `git status` | 0 | 僅見 `modified: docs/DECISIONS.md` 與 untracked `docs/adr/`、`docs/ADR_REPORT.md` |
| 實作後 | `git diff --stat` | 0 | `docs/DECISIONS.md \| 55 +++++++++++++++++++++++++++----------------------------` |

---

## 6. 回退方式

1. 尚未 commit 的工作樹狀態：執行 `git checkout -- docs/DECISIONS.md` 並刪除 `docs/adr/` 目錄與 `docs/ADR_REPORT.md`，即可完整還原至 `895e1d4a7421997100b250ff9c2334c99374e8d9`。
2. 若後續已合併成單一 commit：對該 commit 執行 `git revert <commit>` 即可一併還原索引檔與刪除新增的 ADR 及報告檔。
