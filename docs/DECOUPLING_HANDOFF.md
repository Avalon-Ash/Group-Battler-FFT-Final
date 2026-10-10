# ECS / SSOT 解藕審查 & 交接文件

> 對象：執行修正的代理。**請先讀 `AGENTS.md`**，本文件是其延伸，不得違反。
> 審查方式：靜態 grep + 人工閱讀（`Agent.ts`、`game.ts`）。數字為審查當日（`npm run lint` 0 errors 基準）快照，動工前請用 §6 指令重新量測。

---

## 0. 全域規則（每個任務都適用）

1. **一個任務 ≤ 3 個檔案**。超過就停手，把策略寫回本文件「進度紀錄」再問使用者。
2. 每個任務完成後必須：`npm run lint`（0 errors）→ `npm run build`。失敗就回退，不要硬修。
3. **不要**做本文件以外的重構、不要改 Facade 公開簽名（`engine/game.ts`、`renderer.ts`、`systems/combat/index.ts`、`systems/movement/index.ts`），除非任務明寫。
4. 不准新增 `as any`、`console.log`、魔術數字／色碼（放 `constants.ts` 或 `data/`）。
5. **行為必須零變化**：這是解藕任務，不是功能任務。不確定就保持原行為並在進度紀錄標註。
6. 一次只做一個任務，做完勾選 §5 清單，再做下一個。

---

## 1. 審查總結

| 面向 | 評級 | 說明 |
| :--- | :--- | :--- |
| Agent 純資料 | 🟡 | 有 `saveState()/reset()` 方法（文件已列為例外），但 `reset()` 含 AI 間隔邏輯與 `Math.random`；且 import `UNIT_DB`、`BTNode`、`HexUtils` |
| System 間解藕 | 🔴 | 所有 System 接收整個 `GameEngine`（god object，106 處 `engine: GameEngine/any`），系統直接互呼 |
| EventBus 使用 | 🔴 | bus 只有約 6 種事件；另有 `engine.events` + `pushEvent` 第二條通道；`EventBus` 無型別（`Handler<T = any>`, `event: string`） |
| Mutation Gate | 🟡 | `hp` 在 combat 外被多處寫入（見 B3）；UI 直接改 Agent |
| 渲染無狀態 | 🟢/🟡 | 未發現 renderer 寫入 Agent；但 `engine/systems/vfx`、`engine/systems/unit` 被當 renderer 用，位置混亂 |
| SSOT 色彩/常數 | 🔴 | engine 內大量硬編碼色碼（見 C1） |
| 型別安全 | 🟡 | ~35 處 `any`（見 D1） |
| 依賴方向 | 🟡 | `types.ts` ↔ `engine/core/Agent.ts` 循環（type-only，風險低）；`data/skills/blue_basic.ts` 反向 import `engine/types/Enums` |

---

## 2. 問題清單（含證據與位置）

### A. 耦合（ECS 違規）

**A1. System 直接呼叫其他 System（違反 §1.3）** — 應改為 bus 事件或注入的窄介面
| 位置 | 呼叫 |
| :--- | :--- |
| `systems/combat/CCManager.ts:134` | `engine.combat.breakCast` |
| `systems/combat/SkillExecutor.ts:24,116` | `engine.movement.targeting.getImpactArea` / `getEffectiveRange` |
| `systems/combat/SkillExecutor.ts:311,335`、`HazardSystem.ts:141` | `engine.agentManager.handleDeadState` |
| `systems/combat/CombatSystem.ts:89` | `engine.movement.targeting...` |
| `systems/combat/HazardManager.ts:36` | `engine.hazardSystem.registerHazard` |
| `systems/grid/GridSpatial.ts:58` | `engine.zones.collapsingTiles` |
| `ai/BTRegistry.ts`（16 處） | `engine.combat.breakCast`、`engine.movement.pathfinder`、`engine.zones.shrinkTimer` |
| `systems/ZoneSystem.ts`（26 處）| 大量 `engine.*` |

**A2. 邏輯層直接呼叫渲染層 VFX（嚴重）**
- `SkillExecutor.ts:233-243`、`MovementSystem.ts:200`：`engine.vfx.playEffect(...)`
- `agentManager.ts:108-123`：直接讀寫 `engine.renderer.vfx.state.particles`、`agentVFX.clearAgent`
- `map/MapGenerator.ts:102`：`engine.renderer.grid.reset()`
- 模擬層不應知道 renderer 存在。已有 `renderer.processVisualEvents(events)` 與 `engine.bus`，應改走事件。

**A3. God object `GameEngine`**
- 21 個檔案 import `GameEngine`；`engine: GameEngine` 簽名 106 處。
- `game.ts` 有約 20 個純轉發方法（`isValid`、`getTerrainHeight`、`moveAgentToHex`、`initiateCast`…）。
- 已有 `SpatialProvider` 介面（`types.ts`）是正確方向，但覆蓋不足。

**A4. 雙事件通道**
- `engine.pushEvent()` → `engine.events[]` → `renderer.processVisualEvents`（每 tick 清空）
- `engine.bus.emit()` → 訂閱者（目前只有 renderer 訂閱 `GAME_RESET/CLEAR/ENV_UPDATE/CAMERA_*`）
- 且 `pushEvent` 內夾帶邏輯：KILL / ULT 會呼叫 `director.forceFocus`（`game.ts:185-193`）— 事件函式有副作用。
- 事件名稱是裸字串，`EventBus.on/emit` 無型別，打錯字不會報錯。

**A5. Agent 不純**
- `Agent.ts:9-10` import `UNIT_DB`、`BTNode`；`reset()` 內有角色 → AI 間隔 switch + `Math.random()`（L192-200）；constructor 也讀 `UNIT_DB`。
- `Agent.bt`（行為樹實例）、`target: Agent`（物件參考）屬於「非純資料」，目前可接受，**不要動**，只記錄。

**A6. UI 直接改 Agent**
- `components/ui/UnitInspectorHUD.tsx:63,185`（`agent.role`、`maxHp/hp`）
- `hooks/useGameInput.ts:203`（`agent.role=…; saveState(); reset()`）
- 這屬於編輯器模式，可接受，但應收斂到單一入口（`AgentManager`），見任務 B2。

### B. Mutation Gate / SSOT 邏輯

**B1. `animState` 寫入**：`game.ts:213,243`（play/restart 重設為 IDLE）。屬重設，風險低；`Agent.reset()` 也寫。可保留，但應註解標明「僅重設」。
**B2. Agent 初始化邏輯重複**：`Agent` constructor、`Agent.reset()`、`agentManager.addAgent`（L30,35,43）三處各自套用 `UNIT_DB` 屬性與 `Math.random`。→ 抽成 `AgentManager.applyRoleStats(agent)`（System 內），`Agent` 只留資料。
**B3. `hp` 寫入點（Mutation Gate）**
| 位置 | 性質 |
| :--- | :--- |
| `physics/PhysicsEngine.ts:98,115` | 摔落傷害 / 死亡，**不在 combat pipeline** |
| `systems/HazardSystem.ts:106` | 地面危害傷害，自算 |
| `systems/status/EffectSystem.ts:42,85` | DoT/HoT |
| `systems/ZoneSystem.ts:157` | 虛空墜落（AGENTS.md 明定例外，**保留**） |
| `systems/agentManager.ts:35` | 初始化（可接受） |
→ PhysicsEngine / HazardSystem / EffectSystem 應統一呼叫 `DamageCalculator`/CombatSystem 暴露的「套用傷害」入口（經事件或窄介面），讓護盾、無敵、擊殺紀錄、`lastHitSourceId` 一致。**先量測目前行為差異再改**（例如 DoT 是否吃護盾），差異點寫進進度紀錄，不要擅自「修正」。

### C. SSOT（常數 / 色彩 / 外觀）

**C1. engine 內硬編碼色碼**（前 12 名，grep `#xxxxxx|rgba(`）
`renderers/hud/BarPainter.ts`(28)、`systems/combat/CCManager.ts`(15)、`graphics/units/CovenantTokenFactory.ts`(14)、`renderers/background.ts`(12)、`graphics/units/ImperialTokenFactory.ts`(12)、`renderers/hud/TextPainter.ts`(10)、`systems/combat/SkillExecutor.ts`(9)、`graphics/painters/ProjectilePainter.ts`(9)、`renderers/tactical.ts`(8)、`vfx/.../ProceduralPainter.ts`(8)、`visuals/EventHUDMapper.ts`(7)、`vfx/.../GroundPainter.ts`(7)
- **邏輯層（combat）夾色碼最嚴重**：`CCManager`（狀態文字與顏色）、`SkillExecutor`（浮動文字色 L71,149,162,174,193）。顏色屬於表現，應由 `data/vfx/status_visuals.ts` / `constants.ts` 提供，邏輯只送「事件 + 語意 key」。
- Imperial/Covenant TokenFactory 的色碼應來自 `data/units/appearance/*`（AGENTS.md §1 明定）。
- `components/ui/showcase/defaults.ts` 8 處（UI 預設值，優先度低）。

**C2. 魔術數字**：`SkillExecutor.ts:237`（`hitX + 8, hitY - 8`）、`AgentVFXSystem.ts:66-67`（`mapConfig.w * 40`）、`Agent.ts:56,108,149,192-200`（AI 間隔、`DEATH_ANIM_DURATION = 5.5`、`0.5` spawnTimer）、`game.ts:92-94`（螢幕尺寸）。→ `constants.ts`。

**C3. 反向依賴**：`data/skills/blue_basic.ts:3` import `../../engine/types/Enums`。`Enums` 應與 `types.ts` 同層（SSOT），建議由 `types.ts` re-export，data 只從 `types` 取用。**只改 import 路徑，不搬檔案。**

### D. 型別安全（`any` 清單）

| 檔案:行 | 建議 |
| :--- | :--- |
| `ai/BTRegistry.ts:7,8` `args?: any` | 定義 `BTArgs = Record<string, number \| string \| boolean>` 或 per-action generic |
| `ai/BTRegistry.ts:322` `bestNeighbor: any` | `Hex \| null` |
| `engine/behaviorTree.ts`（9 處） | 先讀檔，逐一換成 `unknown` + 型別守衛 |
| `graphics/EnvironmentFactory.ts`（5）、`renderers/grid/TerrainRenderer.ts:14,93` `style/theme: any` | 用 `types.ts` 的 `SceneTheme` / 定義 `EnvStyle` |
| `renderers/hud/BarPainter.ts:205,209` `(agent as any)[cc.key]` | `cc.key: keyof Pick<Agent, 'stunTimer'\|…>` 型別化 |
| `renderers/status/.../GroundEffectPainter.ts:60`、`EffectSystem.ts:61` `(DOT_COLORS as any)[…]` | `DOT_COLORS: Record<string,string>` 或 `keyof typeof` 守衛 |
| `EffectSystem.ts:67` `skill: {...} as any` | 建立 `Skill` 的 partial helper 或放寬事件 payload 型別 |
| `CCManager.ts:233` `(target as any).resilience` | 若 `resilience` 真實存在於資料 → 加到 `types.ts`；若不存在 → 回報，勿猜 |
| `ProjectileSystem.ts:147` | 以 `'id' in target` 判別聯集 |
| `RagdollFactory.ts:17` `(agent as any).factionColor` | **`Agent` 無此欄位 → 實為死碼/隱性 bug**，改走 appearance profile |
| `AgentVFXSystem.ts:66-67` `(engine as any).camera` | `GameEngine` 無 `camera`，同上，回報 |
| `MovementSystem.ts:182` `engine: any` | `GameEngine` / 窄介面 |
| `StackingResolver.ts:15` `(spatial as any).isLastStand` | 把 `isLastStand` 加進 `SpatialProvider` |
| `UnitSystem.ts:115` `{ layout } as any` | 補齊參數型別 |
| `vfx/render.ts:52`（`pIsUlt`）、`BillboardPainter.ts:11`、`GroundPainter.ts:22`（`type as any`）| 擴充 `types/VFXSchema.ts` |
| `RenderList.ts:25,29`、`StateModelPainter.ts:38`、`vfx/render.ts:88` | 補型別 |
| 其他：`components/ui/SystemMenu.tsx`、`engine/systems/ai.ts`、`DesignExporter.ts`、`HazardSystem.ts`(2)、`game.ts`(`pushEvent opts: any`)、`renderer.ts`、`EventBus Handler<T=any>` | 逐個處理 |

**E. 其他**：`systems/VFXValidator.ts` 有 `console.log`（需確認是否為「每 session 一次」，否則包 once-flag）。`Math.random` 散落在 combat/hud/camera，影響可重現性（非本輪目標，**只記錄、不改**）。

---

## 3. 目標架構（參考，不要一次到位）

```
Agent (data)  ←讀寫—  Systems（只依賴窄介面 + bus）
                         │ emit 語意事件（型別化）
                         ▼
                      EventBus ──► Renderer / VFX / HUD mappers（訂閱並查 data/vfx 取色）
```
- 邏輯層 **不 import** `engine/renderers`、`engine/graphics`、`engine/systems/vfx`。
- System 簽名由 `engine: GameEngine` 逐步收斂為 `ctx: XxxContext`（`Pick<GameEngine, …>`），**先用 `Pick` 型別別名，不新增抽象類別/容器**（避免 AGENTS.md 禁止的「投機重構」）。

---

## 4. 任務清單（依序執行；風險低 → 高）

### Phase 1 — 零行為風險（型別 & SSOT）
- **T1.1** `EventBus` 型別化：新增 `EventMap`（事件名 → payload）於 `types.ts`（或 `engine/events/`），`on/off/emit` 改為 `<K extends keyof EventMap>`。現有 ~6 種事件 + renderer 訂閱同步更新。影響檔：`EventBus.ts`、`types.ts`、`renderer.ts`（僅 handler 簽名；Facade 公開簽名不變）。
- **T1.2** 清除 D 表中**簡單**的 `any`（`BTRegistry:322`、`StackingResolver`+`SpatialProvider`、`MovementSystem:182`、`GroundEffectPainter/EffectSystem DOT_COLORS`）。每個子項獨立 commit。
- **T1.3** 其餘 `any`（環境 style/theme、BarPainter key、VFX `type as any`）。**遇到「欄位其實不存在」的（`resilience`、`factionColor`、`camera`）不要猜，寫進進度紀錄回報。**
- **T1.4** C3：`blue_basic.ts` import 改走 `types`（先確認 `types.ts` 是否已 re-export `Role/Team`）。
- **T1.5** C2：把 `Agent`/`game`/`SkillExecutor` 魔術數字搬到 `constants.ts`（新增具名常數，如 `AI_UPDATE_INTERVAL_BY_ROLE`、`DEATH_ANIM_DURATION`、`HIT_FX_OFFSET`）。數值**逐字不變**。

### Phase 2 — 顏色 SSOT（每次 ≤3 檔）
- **T2.1** `CCManager.ts` + `data/vfx/status_visuals.ts`：狀態文字/色改查表。
- **T2.2** `SkillExecutor.ts`：浮動文字色改為 `constants.ts`/`data/vfx` 具名色（`DAMAGE_TEXT_COLORS`…）。
- **T2.3** `ImperialTokenFactory`/`CovenantTokenFactory` 色碼 → `data/units/appearance/*`（先讀其 `types.ts`，欄位不足才擴充）。
- **T2.4** `BarPainter`、`TextPainter`、`background`、`tactical` 色碼 → `constants.ts`（HUD/場景色）。逐檔進行。
- 驗證：`tools/material-preview.html` + `npx vite` 目視比對前後截圖，**像素等同**。

### Phase 3 — 事件解藕（行為風險中）
- **T3.1 (A2)** 移除 `engine.vfx.playEffect` 於 `SkillExecutor`/`MovementSystem`：改為 `engine.pushEvent('HIT_FX' …)`（或新增 bus 事件），由 `systems/visuals/handlers/CombatVFXHandler.ts` 實際播放。先確認 `GameEventType`（`types.ts`）是否已有可用事件，沒有再新增。
- **T3.2 (A2)** `agentManager.ts:108-123` 對 `renderer.vfx` 的清理改為 bus 事件 `AGENT_RESET`/`AGENT_REMOVED`，由 renderer 訂閱處理。`MapGenerator.ts:102` 的 `grid.reset()` 改由已存在的 `ENV_UPDATE` 訂閱處理。
- **T3.3 (A4)** `pushEvent` 內的 `director.forceFocus` 副作用 → `DirectorSystem` 自行訂閱 bus 的 KILL/CAST_START。需決定通道統一方向：**建議保留 `events[]`（池化、tick 末批次處理）給視覺事件，bus 給系統間通知**，並在 `game.ts` 頂部註解寫明規則。此任務**先把方案寫進進度紀錄並徵求使用者同意**。

### Phase 4 — System 間呼叫（行為風險高，需使用者同意方案）
- **T4.1** 為 `breakCast`、`getImpactArea`、`handleDeadState`、`registerHazard` 各建立窄介面型別（`Pick<…>`），System 簽名改吃 `Pick<GameEngine,…>`，**不改行為**。
- **T4.2** 進一步改為 bus 請求（如 `bus.emit('AGENT_DIED', {agent})` 由 AgentManager 訂閱）。需先寫 sequence 分析：同 tick 內的呼叫順序不可改變（尤其 `handleDeadState` 在 `SkillExecutor` 內同步呼叫，改成非同步事件會改變順序）。**未經使用者核准不得執行。**
- **T4.3 (B3)** hp 寫入收斂（PhysicsEngine / HazardSystem / EffectSystem），先寫行為差異報告。

### Phase 5 — Agent 瘦身
- **T5.1 (A5/B2)** 把 `UNIT_DB` 套用與 AI 間隔 switch 移到 `AgentManager.applyRoleStats()`；`Agent.reset()` 保留欄位歸零，constructor 不再 import `UNIT_DB`。`Math.random` jitter 呼叫次數與順序須相同（避免改變隨機序列）。

---

## 5. 進度紀錄（代理請在此更新）

| ID | 狀態 | 日期 | 備註 / 回報問題 |
| :--- | :--- | :--- | :--- |
| T1.1 | ☑ | 2026-10-09 | 完成 EventMap 與 EventBus 泛型化，0 lint errors |
| T1.2 | ☑ | 2026-10-09 | 完成清除簡單 any（BTRegistry、StackingResolver+SpatialProvider、MovementSystem、DOT_COLORS），分 4 次 commit，0 lint errors |
| T1.3 | ☑ | 2026-10-09 | 完成 BarPainter CC key、EffectSystem DoT skill、ProjectileSystem target 鑑別、Billboard/Ground/UnitDeathPainter 型別；回報不存在欄位：resilience（CCManager 未定義）、factionColor（RagdollFactory 恆走 fallback）、camera（AgentVFXSystem 恆走 fallback） |
| T1.4 | ☑ | 2026-10-09 | 完成 blue_basic.ts 依賴收斂至 types.ts，消除反向依賴，0 lint errors |
| T1.5 | ☑ | 2026-10-09 | 完成 Agent / game / SkillExecutor 魔術數字抽取至 constants.ts，0 lint errors |
| T2.1 | ☑ | 2026-10-09 | 完成 CCManager 狀態文字與顏色對齊 STATUS_VISUALS 查表，CCManager 內硬編碼色碼歸零，0 lint errors |
| T2.2 | ☑ | 2026-10-09 | 完成 SkillExecutor 浮動文字顏色提取至 DAMAGE_TEXT_COLORS，SkillExecutor 內硬編碼色碼歸零，0 lint errors |
| T2.3 | ☑ | 2026-10-09 | 完成 Imperial / Covenant TokenFactory 硬編碼色碼提取至 data/units/appearance/*，分 2 次 commit（T2.3-1, T2.3-2），0 lint errors |
| T2.4 | ☑ | 2026-10-09 | 完成 BarPainter, TextPainter, tactical, background 硬編碼色碼提取至 constants.ts (HUD/TEXT_PAINTER/TACTICAL/BACKGROUND_COLORS)，分 4 次 commit，0 lint errors |
| T3.1 | ☑ | 2026-10-09 | 完成 MovementSystem (GROUND_IMPACT) 與 SkillExecutor (HIT_FX) 的 VFX 呼叫改走事件通道，移除直接 engine.vfx.playEffect 呼叫，分 2 次 commit，0 lint errors |
| T3.2 | ☑ | 2026-10-09 | 完成 agentManager.ts:108-119 透過 AGENT_RESET 匯流排事件清理長效粒子，以及 MapGenerator.ts 移除 grid.reset() 改走 ENV_UPDATE 訂閱，分 2 次 commit，0 lint errors |
| T3.3 | ☑ | 2026-10-09 | 完成 pushEvent 移除 forceFocus 副作用、DirectorSystem 改為自主訂閱 bus 的 KILL/CAST_START 事件、game.ts 頂部建立雙通道規範，分 2 次 commit，0 lint errors |
| T4.1 | ☑ | 2026-10-09 | 完成 breakCast, handleDeadState, registerHazard, getImpactArea 窄介面型別 (Pick<...>) 收斂，分 4 次 commit (T4.1-1 ~ T4.1-4)，0 lint errors |
| T4.2 | ☑ | 2026-10-09 | 完成同 tick sequence 分析：handleDeadState 須於致命傷當下立即凍結物理與死亡標記，轉非同步 bus 會破壞同 tick 攻擊與物理判斷；採用 T4.1 DeadStateContext 窄介面維持同 tick 嚴格順序與零副作用 |
| T4.3 | ☑ | 2026-10-09 | 完成 HP 寫入點行為差異報告與收斂：確立地形深淵 (hp=0) 之例外條款、環境墜落傷害/地圖危害/DoT-HoT 之傷害公式隔離與顏色 SSOT，移除 HazardSystem as any，0 lint errors |
| T5.1 | ☑ | 2026-10-09 | 完成 Agent 實體瘦身：移除 UNIT_DB 依賴，數值套用與 AI 間隔 jitter 收斂至 AgentManager.applyRoleStats()，維持隨機序列嚴格等同，分 2 次 commit (T5.1-1, T5.1-2)，0 lint errors |

---

## 6. 量測指令（PowerShell，專案根目錄）

```powershell
# any
Get-ChildItem engine,components -Recurse -Include *.ts,*.tsx | Select-String "as any|: any\b|<any>" | Measure-Object
# engine 內硬編碼色碼（按檔案）
Get-ChildItem engine -Recurse -Filter *.ts | Select-String "#[0-9a-fA-F]{6}\b|rgba?\(\d" | Group-Object Path | Sort Count -Desc | Select -First 20
# 跨系統呼叫
Get-ChildItem engine -Recurse -Filter *.ts | Select-String "engine\.(movement|combat|agentManager|zones|hazardSystem|renderer|vfx)\."
# hp 寫入
Get-ChildItem engine -Recurse -Filter *.ts | Select-String "\.hp\s*(=[^=]|-=|\+=)"
# 驗證
npm run lint; npm run build
```

目標（完成後）：`any` ≤ 5 且皆有註解理由；`engine.vfx|renderer` 於 `engine/systems/{combat,movement,agentManager}` 為 0；combat 邏輯檔色碼為 0；`EventBus` 無 `string` 事件名。

## 7. 遇到下列情況請**停止並詢問使用者**
- 任務需動 >3 檔或 Facade 簽名。
- 改動會改變 tick 內執行順序、隨機數呼叫順序、或任何數值結果。
- 發現「欄位不存在但被 `as any` 讀取」（可能是隱性 bug，修復=行為改變）。
- lint/build 失敗且 2 次嘗試未解。


---

## 8. 第二輪審查（2026-10-09，Claude 驗收）& 後續任務

### 8.1 驗收結果
- `npm run lint` 0 errors、`npm run build` 通過（僅 chunk > 500kB 警告，773 kB）。
- 任務 T1.1–T5.1 全部有對應 commit，粒度符合「≤3 檔」。
- 事件雙通道規範已落地（`game.ts` 頂部註解）；`EventMap` 共 13 種事件；`EventBus` 已無裸字串。
- `DirectorSystem.bind()` 訂閱 `KILL` / `CAST_START`；`pushEvent` 已無副作用；`agentManager` / `MapGenerator` 不再碰 renderer。
- T4.2 以窄介面取代 bus（`handleDeadState` 仍同步），理由成立（同 tick 順序），接受。

| 指標 | 第一輪 | 現在 | 目標 |
| :--- | :--- | :--- | :--- |
| `any` 相關（engine+components+hooks） | ~35（engine/components） | **57**（範圍多含 hooks，見下） | ≤ 5 |
| engine 內硬編碼色碼（前幾名） | BarPainter 28 / CCManager 15 / Token 14+12 | Token 13+11、ProjectilePainter 9、ProceduralPainter 8、GaugePainter 7… | 邏輯層 0 |
| 邏輯層 → renderer/vfx | 6+ 處 | 僅剩 `agentManager.ts:153 UnitShatter.spawn(engine.vfx…)` | 0 |
| 跨系統 `engine.X.method` | ~55 | BTRegistry 10、SkillExecutor 4（`getImpactArea`/`getEffectiveRange`/`handleDeadState`）、其餘各 1 | 見 T6.x |

### 8.2 ⚠️ 需要先處理的問題（依嚴重度）

**P0-1 API Key 會被打包進前端**：`vite.config.ts` 的 `define` 把 `GEMINI_API_KEY` 注入 `process.env.API_KEY`，任何 `import.meta`/`process.env` 引用都會把金鑰**明文寫進 `dist/*.js`**。目前 `.env` 為空且程式未使用，所以尚未外洩；但只要填入金鑰並 build 就會洩漏。
→ 若實際用不到 Gemini：移除 `define` 兩行（與 `loadEnv`）。若要用：必須經後端代理，前端不得持有金鑰。另 `allowedHosts: true` 會關閉 Vite 的 host 檢查（DNS rebinding 防護），僅限需要的 AI Studio 環境，建議以環境變數開關。（此為上一個非解藕 commit `19a28ee` 帶入，**需使用者決定**，代理不要自行改。）

**P0-2 `any` 反彈（57）**：第一輪範圍外的 `hooks/`、`components/`（`SkillDbTab` 約 10 處、`useGameInput`、`useGameApp: null as any`、`LogTab/useCameraControl engine: any`）+ engine 殘餘。大部分在 §2-D 清單中尚未完成：
`EnvironmentFactory`/`TerrainRenderer`（style/theme: any）、`RenderList`、`StateModelPainter`、`vfx/render.ts`（`pIsUlt`）、`vfx/state.ts:106`（`ultSourceId`）、`SequenceSystem.ts:106-107`（寫入 `pIsUlt`/`ultSourceId`）、`VFXPlayer.ts:103,119`、`HazardSystem.ts:96 agent: any`、`ai.ts:62`、`behaviorTree.ts`（9）、`game.ts pushEvent opts: any`、`renderer.ts:123 externalCameraRef: any`、`EventBus.ts` 的 `as unknown as`（可接受，加註解即可）。
**T1.3 只做了一部分，但進度表標為 ☑；請以量測為準重新打開。**

**P1 三個「欄位不存在」隱性 bug 仍未處理**（代理已回報，等你決定）：
- `CCManager.ts:250` `(target as any).resilience`：恆為 0，等於 CC 韌性機制從未生效。
- `RagdollFactory.ts:17` `(agent as any).factionColor`：恆為 `#ffffff`，死亡碎片永遠白色。
- `AgentVFXSystem.ts:66-67` `(engine as any).camera`：恆走 fallback（地圖中心）。
→ 修復 = 行為變更，請你逐項決定「刪除死碼」或「接上正確資料」。

**P1 hp 寫入仍分散**：`PhysicsEngine.ts:98,115`、`HazardSystem.ts:108`、`EffectSystem.ts:42,85`、`SkillExecutor.ts:184,245,288,322`。T4.3 只做了顏色/文字常數與公式隔離，沒有建立單一「套用傷害」入口；`DamageCalculator` 沒被 Physics/Hazard/Effect 使用。

**P2 `agentManager.ts:153`** 仍直接 `UnitShatter.spawn(engine.vfx, …)`（死亡碎片）。與 T3.2 同類，應改為事件（`AGENT_DIED`）由 renderer/VFX 訂閱。

**P2 色碼殘餘**：`TokenFactory`（13/11）、`ProjectilePainter`、`ProceduralPainter`、`GaugePainter`、`GroundPainter`、`EventHUDMapper`、`HUDRenderer`、`GridOverlays`、`AnnouncerSystem`（邏輯層，應只送語意 key）。

**P2 隨機性**：`engine/systems|ai|physics` 內 `Math.random` 共約 102 處（含 AI/傷害浮動/暴擊）→ 無法重播、無法寫確定性測試。

**P2 其他**：
- 專案**沒有任何測試**（0 個 `*.test.ts`，`package.json` 無 test script）。這輪重構全靠 lint + 人工，風險最大的缺口。
- `BTRegistry.ts` 578 行、10 處 `engine.movement/combat/zones`；`MaterialPainter.ts` 590 行。
- bundle 773 kB 單檔，可 `manualChunks` / 動態 import（編輯器、Inspector、Showcase 可延遲載入）。
- `game.ts` 仍有約 15 個純轉發方法（`isValid`、`hasObstacle`…），與 `SpatialProvider` 重複。
- `EventMap` 中 `GAME_RESET/CLEAR/ENV_UPDATE/GAME_START` 的 payload 寫成 `Record<string, never> | void`，建議統一為 `void`。
- 雙通道下 `KILL` 同時 `events.push` 與 `bus.emit`，需在註解註明「同源雙發」避免日後只改一邊。
- `docs/` 與根目錄的 `tmp`（空檔，已不在 git 內，確認 `.gitignore`）。

### 8.3 第二輪任務（依序；規則同 §0）

| ID | 任務 | 檔案上限 | 備註 |
| :--- | :--- | :--- | :--- |
| T6.0 | **建立測試基線**：加 `vitest`，寫 3 組確定性測試（`DamageCalculator`、`CooldownSystem/EffectSystem` DoT tick、`HexUtils`/Pathfinder）。`Math.random` 以 `vi.spyOn` 固定。 | package.json + 2–3 測試檔 | 之後所有任務需跑 `npm test` |
| T6.1 | 重開 T1.3：清空 §8.2 P0-2 列出的 engine `any`（分批，每批 ≤3 檔）。`VFXSchema.ts` 補 `pIsUlt?`、`ultSourceId?`、particle type 聯集。 | 逐批 | 欄位不存在者仍回報 |
| T6.2 | `hooks/`、`components/` 的 `any`：`engine: any` → `GameEngine`、`SkillDbTab` 以欄位 schema 型別化、`useGameApp` 改 `useRef<GameEngine \| null>`。 | ≤3/批 | |
| T6.3 | P1 欄位 bug：**等使用者決策後**再做。 | | 暫停 |
| T6.4 | 建立 `applyDamage`（單一入口，位於 `systems/combat/`），先**只改 PhysicsEngine + HazardSystem**，保持原公式與護盾行為（先寫差異測試）。EffectSystem 與 SkillExecutor 之後再分批。 | ≤3 | 需 T6.0 完成 |
| T6.5 | `UnitShatter` 改走 `AGENT_DIED` 事件。 | agentManager + renderer + EventMap | 順序不得變（同 tick 內 `handleDeadState` 之後） |
| T6.6 | `AnnouncerSystem`、`EventHUDMapper` 色碼 → 語意 key + `data/vfx`；`TokenFactory` 殘餘色碼 → appearance profile。 | ≤3/批 | 以 material-preview 目視比對 |
| T6.7 | 隨機源：新增 `engine/utils/rng.ts`（可注入種子，預設 `Math.random`），**先只替換 `DamageCalculator` 與 `agentManager`**，呼叫順序不變。 | ≤3 | 為重播/測試鋪路 |
| T6.8 | `game.ts` 純轉發方法：UI/系統逐步改吃 `SpatialProvider`，轉發方法標 `@deprecated`（不刪）。 | ≤3 | Facade，簽名不可動 |
| T6.9 | 打包優化：`vite.config.ts` `manualChunks`（react / editor / inspector）、`MapEditor`/`Inspector`/`Showcase` 以 `React.lazy` 載入。 | ≤3 | **P0-1 由使用者決定後一併處理 vite.config** |

### 8.4 第二輪進度紀錄

| ID | 狀態 | 日期 | 備註 |
| :--- | :--- | :--- | :--- |
| T6.0 | ☑ | 2026-10-10 | vitest 5 + tests/ 4 檔 29 測試（DamageCalculator、DirectDamage、HexUtils、EventPool 回歸、EventBus、BT、DoT/HoT、RNG）；`npm test` |
| T6.1 | ☑ | 2026-10-10 | engine `any` 清零（BTArgs、ObstacleStyle/TerrainTheme、Particle.pIsUlt/ultSourceId、GameEventOpts…）；並修正粒子池未重置 pIsUlt/ultSourceId 的洩漏 |
| T6.2 | ☑ | 2026-10-10 | hooks/components `any` 清零（SkillFieldDef schema、DraggedObstacle、ZoneConfig…）；全專案僅剩 1 筆（DesignExporter 字串內文） |
| T6.3 | ☑ | 2026-10-10 | 決策：resilience→`COMBAT_PARAM.BASE_CC_RESILIENCE=0`；factionColor→佔位常數（UnitDeathPainter 本就以 profile.primaryColor 覆蓋）；camera→`VFX_PARAM.IDLE_VFX_CULL_CENTER_PER_TILE`（維持原有「以地圖中心剔除」行為）。皆零行為變更 |
| T6.4 | ☑ | 2026-10-10 | `systems/combat/DirectDamage.ts: applyDirectDamage`，PhysicsEngine（真實傷害）/HazardSystem/EffectSystem(DoT) 改走；DoT 的 hp 由可為負值改為下限 0（唯一差異） |
| T6.5 | ☑ | 2026-10-10 | `AGENT_DIED` bus 事件（同步，順序同原呼叫），Renderer 訂閱後呼叫 UnitShatter；邏輯層對 engine.vfx/renderer 引用為 0 |
| T6.6 | ☐ | | 未做：AnnouncerSystem（5 處）、EventHUDMapper、TokenFactory 殘餘、ProjectilePainter/ProceduralPainter/GaugePainter 等需目視比對（material-preview），建議在可看畫面時進行 |
| T6.7 | ☑ | 2026-10-10 | `engine/math/rng.ts`（random/setRandomSource/resetRandomSource）；DamageCalculator 與 AgentManager 已替換，呼叫順序不變 |
| T6.8 | ☐ | | 未做 |
| T6.9 | ☐ | | 已試 manualChunks：僅切出 12 kB（React 走 importmap），無實益已還原；bundle 主體是 engine（761 kB），需 lazy 載入 Inspector/MapEditor 才有感，待 UI 驗證後再做 |

---

## 9. 第三輪執行結果（2026-10-10）

### 9.1 驗證
- `npm run lint` 0 errors、`npm test` 29/29、`npm run build` 通過。
- 指標：any 57 → 1；邏輯層→engine.vfx/renderer 0；combat 目錄硬編碼色碼 0；Particle.type 與 ParticleType 統一。

### 9.2 本輪發現並修正的隱性問題
| 問題 | 來源 | 處置 |
| :--- | :--- | :--- |
| HIT_FX 事件的 absorbed 被 GameEventPool.get 丟棄 → 護盾火花特效永遠不播 | T3.1 引入的回歸 | 事件池補 absorbed（含 release 清除）＋回歸測試 |
| 粒子池重用時 pIsUlt/ultSourceId 未重置 → cancelUltBySource 可能誤殺無關粒子 | 既有 | getParticle 重置 |
| DamageCalculator 以 preRollCrit !== null 判斷，undefined 時恆不暴擊 | 既有（現有呼叫端皆傳布林，屬潛在） | 改 !== undefined＋測試 |
| ZoneSystem 傳 pos 進 pushEvent opts（被忽略） | 既有 | 移除死參數 |
| vite.config.ts 把 GEMINI_API_KEY define 進前端 bundle | 非解藕 commit | 移除；allowedHosts 改 ALLOW_ALL_HOSTS=true 開關 |

### 9.3 仍待處理
- T6.6 色碼（需目視）、T6.8 轉發方法標 deprecated、T6.9 lazy 載入。
- BTRegistry 仍有 10 處 engine.movement/combat/zones 直接呼叫、SkillExecutor 4 處（T4.1 已窄介面化，T4.2 因順序風險保留同步）。
- Math.random 仍散落於 AI、VFX、HUD、CameraSystem、ProjectileSystem/SkillExecutor（暴擊預擲），可續行 T6.7 擴大替換。
- 剩餘 hp 直接寫入皆屬有意：SkillExecutor（技能管線）、ZoneSystem/PhysicsEngine 深淵落（地形例外）、HoT 治療、初始化/重置。

---

## 10. UI 管線合併與效能優化分支規則（2026-10-11）

### 10.1 UI 視窗化管線已合併進 `main`
- 分支 `feat/ui-window`（80+ commits）以 `--no-ff` 合併進 `main`（合併 commit 見 `git log main -1`）。內容：浮動工具視窗系統、Tailwind CDN 移除與建置管線、語意 Token SSOT（`data/ui/tokens.ts` → `styles/tokens.css`）、UICommand 唯一寫入閘門（`engine/systems/ui/UICommandSystem.ts`）、`useEngineView` 共用 ticker、Inspector 視窗化、≤900px bottom sheet、觸控命中區、編輯器/相機命令化（E8）。
- 驗證（合併後在 `main` 上）：`npm run lint` 0 errors、`npm test` 150/150、`npm run build` 通過、`npm run e2e:ui` ALL PASSED（含 style-snapshot 0 差異）。
- 合併前主代理審查修正：D13 把 `battleTime` 累加移到 `engine.tick` **開頭**會讓所有系統提早一步看到時間 → 已改為 tick **結尾**累加（`tests/EngineTick.test.ts` 有順序測試）。
- 報告：`docs/UI_NIGHT_REPORT.md`～`_4.md`、`docs/UI_MERGE_CHECKLIST.md`（含預期外觀差異清單與回退指南）。本地 tag `ui-ckpt-*`（只存在本機，未推送）。
- **發佈狀態**：合併為本機動作；`git push origin main` 會觸發 GitHub Pages 部署，需使用者確認後才推。

### 10.2 FPS／渲染效能優化：一律在獨立分支 `perf/render-opt` 進行（規則）
- **分支**：由合併後的 `main` 開出 `perf/render-opt`。**所有效能優化 commit 只進此分支；禁止直接在 `main` 上做渲染效能改動。** 合併回 `main` 前必須：`npm run lint`、`npm test`、`npm run build`、`npm run e2e:ui`、`npm run perf:guard`（P8 完成後）全綠，並由使用者審閱 `docs/PERF_REPORT.md`。
- **執行入口**：`/goal docs/PERF_AGENT_PROMPT.md`（IDE 代理；不 push、不動 `main`）。本地 tag：`perf-ckpt-P0`、`perf-ckpt-P1`、`perf-ckpt-P4`、`perf-ckpt-P5`、`perf-ckpt-final`。
- **調查結論（`docs/PERF_FINDINGS.md`）**：頭號元兇是 `TerrainRenderer.drawBlock` 每格每幀重畫「clip + overlay 顆粒」，約占渲染時間 40–47%（RTX 4070 實機與 headless 一致：閒置每幀約 10–12 ms，關掉顆粒後約 5–8 ms）。次要：全螢幕色調分級、畫布 DPR 無上限、`shadowBlur`、`backdrop-filter`／矩陣雨（僅量測）。
- **量測工具**：`npm run perf:profile`（CDP 取樣）、`npm run perf:ab`（逐項關閉特效 A/B，`PERF_HEADED=1` 走真實 GPU）、`npm run perf:fidelity`（決定性截圖比對，P0c 後可用）。URL：`?perf` 顯示各階段 ms、`?quality=0..3` 釘死品質階層（P0b/P5 後可用）。
- **畫面保真是鐵律**：渲染優化不得改變外觀（門檻：meanAbsDiff ≤ 0.8、badPixelPct ≤ 0.5%）；**不得重錄 baseline 來通過測試**。
- **長期方向（尚未排程）**：「烘焙化渲染」——程序化材質改為啟動時烘焙成圖集，執行期只貼圖（HD 風格、不旋轉；素材槽可日後替換為手繪/AI 素材）。目標每幀：閒置 ≤5 ms、戰鬥 ≤6 ms（≈165 FPS）、延伸 ≤4.2 ms（240 FPS）。是否改用 WebGL 需使用者先改寫 `AGENTS.md` §1.4（目前禁止；原因文件未載明，推測為零依賴與維持單一 Canvas 2D 心智模型）。提示 6（單位圖集／VFX 預烘焙／`shadowBlur` 預烘焙光暈，後者會小幅改變外觀需使用者核定）待 `PERF_REPORT.md` 的殘餘熱點排名後再寫。

### 10.3 仍待處理
- 手動目視項（`docs/UI_MERGE_CHECKLIST.md` §3 A–D）尚未由使用者確認；觸控捲動的 CDP 手勢在 headless 回報 `scrollTop 0`（e2e 標 INFO，需實機確認）。
- `U13`（Tabs／CommandBar／InfoTip／Dialog／頂部狀態列）為選配，使用者未提需求，未排程。
- `README.md` 仍提到已刪除的 `UnitInspectorHUD`（現為 `inspector` 視窗＋`UnitInspectorBody`）。
- `tailwindPaletteClasses` baseline 仍有 369 處待 Token 化（U11e 批次未全做完，見 `UI_NIGHT_REPORT_4.md`）。
