# RNG 拆分報告：模擬隨機 vs 表現隨機

> 分支 `claude/jovial-poitras-233936`。問題：加了命中粒子後，確定性場景 battle_frozen 的傷害數字改變——
> VFX 與戰鬥共用同一條 `Math.random` 序列，任何視覺改動都會改變戰鬥結果（也毀掉重播與 soak 種子）。

## 1. 盤點（引擎／hooks／components／data，排除註解）

| 類別 | 處數 | 去向 |
| :-- | --: | :-- |
| 模擬：傷害／暴擊（`DamageCalculator`、`SkillExecutor`、`ProjectileSystem`）、出生／AI 抖動（`agentManager`） | 7 | 改走 `random()`（前 4 處原本就是；`SkillExecutor`／`ProjectileSystem` 的預擲暴擊是漏網） |
| 模擬：物理衝量（`PhysicsEngine` 3）、位移收尾（`MotionEngine` 2）、堆疊解析（`StackingResolver` 1）、恐懼逃跑（`ControlSystem` 1） | 7 | 改走 `random()` |
| 模擬：地圖生成（`MapGenerator` 8） | 8 | 改走 `random()` |
| 模擬：佈陣／地圖尺寸（`hooks/useGameApp.ts` 5） | 5 | 改走 `random()` |
| 表現：`UnitShatter`、`VFXPlayer`、`VFXAmbience`、`GroundPainter`、`ParticlePainter`、`hud`、`EventHUDMapper`、`TextPainter`、`AnimationSystem`（受擊抖動）、`CameraSystem`（震動）、`AgentVFXSystem`、`background`、`useMatrixRain`、`SkillSequences`、`behaviorTree`（僅節點 id） | 約 56 | 維持 `Math.random`（表現流） |

排除註解後 `Math.random()` 從 78 處降到 56 處，移走 24 處（其中 2 處是新增納入的預擲暴擊）。
原本就有 `engine/math/rng.ts`（`random()`／`setRandomSource`），但預設直接轉呼叫 `Math.random`，所以
並沒有真的分流，而且只有 `DamageCalculator`／`agentManager` 在用。

## 2. 設計

- **模擬流**：`engine/math/rng.ts` 內的 mulberry32（單一 uint32 狀態，每次呼叫零配置）。
  `seedSimulation(seed)` 重設；`GameEngine.seedSimulation(seed)` 是對外入口（工具透過 `window.__TACTICAL_ENGINE__` 呼叫，
  app 內沒有測試 hook）。擁有者：engine/math/rng.ts 的單一模組狀態，只有 `seedSimulation` 寫入。
- **表現流**：直接用 `Math.random`，不另包一層（避免 20 個檔案的無謂搬動）。界線由測試鎖定（見 §3）。
- **未種子化時**：`random()` 暫時轉呼叫 `Math.random`，行為與拆分前完全一致。
  **刻意不在 `play()` 自動種子化**：我試過（取一次 `Math.random` 當種子），結果是 5 張地形基準全部跑掉
  （MeanAbsDiff 9–19）——引擎建構與 UI 開場時的地圖尺寸抽籤原本交錯在共用序列裡，
  一旦自動種子化，之後的抽籤值就不同。要在正式遊玩中每場自動種子化，需要連同基準一起處理，另開一輪。
- 公開 Facade 只新增 `GameEngine.seedSimulation()`，其餘不動。

## 3. 測試（`tests/RngSplit.test.ts`）

1. 靜態掃描：模擬層檔案（`engine/ai`、`core`、`physics`、`game.ts`、`agentManager`、`combat`、`movement`、`status`、`map`、`ZoneSystem`、`PhysicsSystem`、`hooks/useGameApp.ts`）不得出現 `Math.random`（防回歸）。
2. 同種子同序列，且與 `Math.random` 無關。
3. 8 單位、900 tick 的種子化戰鬥跑兩次：基準把 `Math.random` 固定為 0.5；對照用真實 `Math.random`，並且每 tick 抽 40 次、對每個單位 `playEffect` 三種特效。
   hp、座標、`battleTime` 必須完全相同。已確認有效：暫時把 `SkillExecutor`／`ProjectileSystem` 的暴擊改回 `Math.random`，此測試即失敗。
   （零件貼圖烘焙需要 DOM，測試以 `vi.mock` 關閉烘焙；粒子照常抽籤。）

另外 `DamageCalculator.test.ts` 的暴擊後備測試由 `vi.spyOn(Math,'random')` 改為 `setRandomSource`。

## 4. 工具

10 個腳本的 `window.__resetSeed` 現在同時呼叫 `__TACTICAL_ENGINE__.seedSimulation(s)`：
`render-fidelity`、`br-soak`、`terrain-base-shot`、`terrain-contrast`、`faction-shot`、`glow-compare`、`sink-demo`、
`sink-flicker-probe`、`tools/vfx/record-skill`、`tools/assets/create-battle-comparison`。
`hex-align-shot`、`cast-break-shot` 沒有 reset，只在載入前固定 `Math.random`，仍可重現（未種子化 → 模擬流轉呼叫它）。
種子相同、演算法相同（mulberry32），所以模擬序列與舊行為一致。

## 5. 檢查結果

| 項目 | 結果 |
| :-- | :-- |
| `npm run lint` | 通過 |
| `npx vitest run --dir tests` | 49 檔 450 測試通過（新增 3） |
| `npm run build` | 通過 |
| `perf:fidelity`（地形 5 張＋battle_frozen） | 全數通過；地形 MeanAbsDiff 0.000–0.010、battle_frozen 0.233（門檻 0.8），**不需重錄基準** |
| `perf-ab --assert` | 通過 |
| `br-soak --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle` | 20/20 乾淨（0 殘影、0 發呆） |

地形有 0.01% 的像素差：拆分後 `__resetSeed` 之後，表現流從序列起點開始（以前接在地圖抽籤之後），環境粒子位置略有不同；遠低於門檻，屬預期。

## 6. 後續（未做）

- 正式遊玩時每場開戰自動種子化（含重播種子紀錄）：會改變開場地圖尺寸抽籤，需連同基準另開一輪。
- 表現層的 `Math.random` 在工具中仍由 `Math.random` 固定種子決定；若想讓視覺也獨立可重現，可再包一層 `visualRandom()`。
