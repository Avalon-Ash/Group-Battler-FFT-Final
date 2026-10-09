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
| T3.1 | ☐ | | |
| T3.2 | ☐ | | |
| T3.3 | ☐ | | ✅ 使用者已於 2026-10-09 同意：視覺事件留 `events[]`、系統間通知走 `bus` |
| T4.1 | ☐ | | |
| T4.2 | ☐ | | ✅ 使用者已於 2026-10-09 同意執行；但仍須先寫 sequence 分析，且**不得改變同 tick 執行順序**，無法保證時退回 T4.1 的窄介面做法並記錄 |
| T4.3 | ☐ | | |
| T5.1 | ☐ | | |

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
