# ECS-lite 評估（2026-10-19）

> 使用者目標：架構透明簡潔、好新增擴充、好查問題；不為做而做。本文件判斷哪些值得跑、哪些不值得。

## 1. 現況
- `Agent`（`engine/core/Agent.ts`）是純資料，95 個欄位，沒有方法以外的邏輯。
- 「唯一寫入者」已有所有權表 `engine/core/AgentOwnership.ts`＋棘輪測試；系統之間只走 `engine.bus`；UI 只經 `UICommand` 寫入（P0～P10 已完成）。
- 系統↔渲染雙向 import：`engine/systems` 有 14 個檔 import 渲染層，`engine/renderers` 有 9 個檔 import 系統層（渲染系統放在 `engine/systems/` 底下）。
- 欄位可以自然分成 11 組：身分、位置／物理、生命值、屬性、技能欄、施法、移動、AI、控制／狀態效果、死亡、外觀。

## 2. 逐項判斷

| 項目 | 價值 | 成本 | 判斷 |
| :-- | :-- | :-- | :-- |
| **S1 狀態效果資料化**：把 13 種控制／持續效果的 `xxxTimer`／`xxxMax` 平行欄位（約 26 個）改成一張效果表 `agent.effects`（種類、剩餘、總長、來源），效果定義放 `data/` | 高。新增一種控制目前要動 Agent、`reset()`、CCManager、AnimationSystem 推導、UI 顯示、所有權表 6 處；改完是加一筆資料。`reset()` 漏清、計時器各自遞減不一致這類 bug 會整類消失 | 中大：`stunTimer` 出現在 14 個檔、`silenceTimer` 12 個，合計約 30 個檔 | **值得，優先** |
| **S2 渲染層搬家（原 P11）**：渲染相關系統搬到 `engine/presentation/`，只拿唯讀的 `Readonly<Agent>`；模擬端不 import 渲染 | 中高。查問題時「誰會改模擬狀態」一眼可見；型別擋住渲染端偷寫 | 中：機械性搬檔＋改 import，但碰渲染，必須單獨一條 | **值得，在 S1 之後** |
| **S3 外觀欄位分組（原 P12）**：`animState`、`hitFlashTimer`、`visualStatus`、`trailHistory`… 收進 `agent.view` | 中。和 S2 一起做才有意義（view 只有表現層寫） | 小中 | **併入 S2** |
| 其他欄位也拆成子物件（`agent.vitals.hp`、`agent.transform.q`…） | 低。所有權表已經管住寫入者；只是把幾百處 `agent.hp` 改名 | 大（`hp`／`maxHp` 就 48 個檔） | **不做**（為做而做） |
| 完整 ECS（實體 id＋元件陣列、系統查詢） | 低。單位只有 20～40 個，效能沒差；全部渲染與 AI 都要重寫 | 極大 | **不做** |
| **S4 常數正規化**：`constants.ts` 依領域拆檔、衍生值用算的 | 中。好找參數；但不影響行為 | 中，純搬移 | **可做，排最後**，可交給低階代理 |

## 3. 建議順序
1. S1 狀態效果資料化（不碰渲染，可以和渲染工作並行；先寫設計，再交 Gemini 跑，主代理審查）。
2. S2＋S3 渲染層搬家＋外觀分組（渲染工作，單獨一條）。
3. S4 常數拆檔（有空再做）。

## 4. 驗收方式
- S1：所有權表的 CC 欄位收斂成 `effects` 一列；新增一個測試用的假效果只需要加資料；`br-soak` 10/10、保真 0 差異。
- S2：`engine/systems`→渲染層 import 數 14 → 0，加棘輪測試；保真 0 差異。
