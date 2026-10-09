<div align="center">

# TACTICAL.OS — Group Battler FFT

**一套以企劃為主導的自驅動戰術模擬引擎**  
Vite 6 + React 19 + TypeScript｜GitHub Pages 全球即時部署

[![Play Online](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2ea44f?logo=github&logoColor=white)](https://avalon-ash.github.io/Group-Battler-FFT-Final/)
[![Deploy](https://img.shields.io/badge/Live%20Demo-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://ai.studio/apps/ef9e48ce-2e94-41d8-98f5-f64bc8502565)

![TACTICAL.OS Gameplay](https://github.com/user-attachments/assets/a38770c9-05c8-4c21-ac86-c1da71650f45)

</div>

---

## 這是什麼

TACTICAL.OS 是一套可在瀏覽器中執行的 **5v5 Hex 戰術設計驗證平台**。核心目標不是「做出一款遊戲」，而是讓企劃在不依賴工程資源的情況下，自行建構戰場、調整參數、即時觀察 AI 決策行為，並透過戰鬥 LOG 驗證設計是否符合預期。

這個工具誕生的原因：**企劃需要一個不依賴工程資源就能驗證戰鬥手感的環境。**

---

## 這套工具能驗證什麼

### 展示模式（開機自動啟動）

開機即進入展示模式，引擎將自動生成地形、隨機配置圖場，並由兩隊 AI 開始戰鬥。`DirectorSystem` 會自動偵測高優先事件（死亡、大招施放、連殺）並將鏡頭聚焦至該單位，全程以「觀眾視角」自動播出。

### 戰場編輯器（`MapEditorToolbar`）

點選進入遊玩模式後，可切換至戰場編輯狀態，操作包含：

- 在區格上放置 / 刪除藍、紅兩隊單位
- 放置不同類型的障礙物
- 自定義地圖大小與 Hex 排列方式
- 隊容確認後點擊一鍵啟動 / 重置戰鬥

### 單位調整（`UnitInspectorHUD` + `UnitStatusTab`）

在編輯模式下點選任意單位，可即時調整：

- HP / MP / 移動速度等基礎數值
- 職業類型（TANK / WARRIOR / RANGER / MAGE / SUPPORT）
- 攜帶技能組（BASIC / ACTIVE / ULT）
- 技能屬性：元素、範圍、冷卻、控場類型與持續時間

### 技能資料庫（`SkillDbTab`）

全域技能資料庫可即時編輯。支援 14 種控場類型、9 種元素屬性、多種彈道軌跡與範圍技能參數。對技能的任何調整將在下一場戰鬥中直接生效，不需重新建置場景。

### 時間流速控制（`PlaybackHUD`）

戰鬥進行中可即時調整時間流速（支援慢動作至 4× 加速）。慢動作後可仔細觀察單位在關鍵幀的決策行為，找出設計盲點。

### 大逃殺縮圈（`ZoneSystem`）

可在 `SystemMenu` 開啟縮圈模式（預設開啟）並設定每輪倒數秒數。  
系統以 Flood-fill 從地圖邊界往內計算每格深度，倒數結束後最外層網格依序崩落。  
站在崩落格上的單位隨地板墜入虛空出局，並觸發完整的死亡特效管線。  
最終圈進入隨機格子模式，逐格縮減至設定的最小安全格數。

### AI 行為樹透明化（`BehaviorTreeTab`）

戰鬥進行中點選任意單位，可即時查看該單位當前的行為樹執行狀態：

- 各節點執行狀態（SUCCESS / FAILURE / RUNNING）即時標示
- 可直接觀察 AI 正在執行哪層決策邏輯
- 確認單位行為是否符合企劃意圖，而非「感覺上好像對了」

### 戰鬥 LOG 查核（`LogTab`）

完整戰鬥紀錄可依時間軸、事件類型、單位篩選。每個事件包含時間戳記、位置、行動類型與目標資訊，可用於驗證「單位在特定時間點對誰發動了什麼技能」此類設計問題。

### 導播監控（`DirectorMonitorHUD`）

即時顯示 `DirectorSystem` 當前的聚焦目標、鏡頭狀態與優先順序事件佇列，方便觀察導播邏輯是否按預期運作。

### VFX 地圖（`VFXMapTab`）

即時顯示所有視覺特效的區格分佈與生命週期狀態，可用於檢查 VFX 生成與區域覆蓋是否符合設計意圖。

---

## 系統架構

整個引擎以 `GameEngine` 為核心，採 **單一真相來源（SSOT）** 原則設計，所有系統透過 `EventBus` 溝通，避免直接耦合。

```
GameEngine
├── engine/
│   ├── game.ts              ← 主引擎，系統整合與 tick 迴圈
│   ├── behaviorTree.ts      ← 行為樹框架（Selector / Sequence / Leaf）
│   ├── renderer.ts          ← 渲染器介面
│   ├── core/
│   │   └── Agent.ts         ← 單位實體（狀態、技能、AI 樹掛載點）
│   ├── systems/
│   │   ├── DirectorSystem   ← 攝影機導播：自動聚焦高優先事件
│   │   ├── CameraSystem     ← 鏡頭平滑跟隨與視角控制
│   │   ├── ZoneSystem       ← 大逃殺縮圈：Flood-fill 深度計算、地形崩落、單位出局管線
│   │   ├── HazardSystem     ← 地面危機區域（毒、火、冰、重力）
│   │   ├── CombatSystem     ← 戰鬥核心：傷害、施法、彈道
│   │   │   └── combat/
│   │   │       ├── SkillExecutor    ← 技能執行主管線
│   │   │       ├── DamageCalculator ← 傷害公式計算（支援確定性 RNG 注入）
│   │   │       ├── DirectDamage     ← 環境/墜落/DoT 統一傷害入口（護盾吸收與下限收斂）
│   │   │       ├── ProjectileSystem ← 彈道物理與命中
│   │   │       ├── CastingEngine    ← 施法前搖與中斷管理
│   │   │       ├── CCManager        ← 控場效果施加與解除
│   │   │       └── HazardManager    ← 地面危機區域生成入口
│   │   ├── MovementSystem   ← Hex 移動、A* 路徑、碰撞排解
│   │   │   └── movement/
│   │   │       ├── MotionEngine     ← 逐幀位移積分與插值
│   │   │       └── StackingResolver ← 同格碰撞排解
│   │   ├── AISystem         ← 行為樹 AI 決策
│   │   ├── AgentManager     ← 單位生命週期：生成、死亡收尾、GC
│   │   ├── MapSystem        ← 地圖管理：網格狀態、warningTiles、地形高度
│   │   ├── PhysicsSystem    ← 物理積分：impulse、重力、自由落體、trail 歷史
│   │   ├── AnimationSystem  ← 動畫狀態推導（SSOT 最末層）
│   │   ├── VisualSystem     ← 監聽事件佇列，驅動 VFX 與視覺回饋管線
│   │   ├── TimeSystem       ← 時間縮放管理
│   │   ├── BattleLogger     ← 完整戰鬥紀錄
│   │   ├── AnnouncerSystem  ← 戰況播報
│   │   ├── VictorySystem    ← 勝負判定（含平局收尾）
│   │   ├── DesignExporter   ← 戰鬥數據結構化輸出（企劃驗證用）
│   │   └── status/
│   │       ├── CooldownSystem
│   │       ├── EffectSystem
│   │       └── ControlSystem
│   ├── renderers/               ← 渲染管線（renderer.ts Facade 的實作層）
│   │   ├── RenderSpec.ts        ← 所有渲染物件的資料結構定義（視覺 SSOT）
│   │   ├── RenderPipeline.ts    ← 渲染主管線：Z 排序、分層提交
│   │   ├── RenderList.ts        ← RenderOp 佇列管理
│   │   ├── RenderDispatcher.ts  ← 依 RenderOpType 分發至對應 Renderer
│   │   ├── HUDRenderer.ts       ← HUD 元素繪製
│   │   ├── PostProcessor.ts     ← 後處理通道（silhouette 等）
│   │   ├── ProjectileDrawer.ts  ← 彈道視覺繪製
│   │   ├── background.ts        ← 背景層繪製
│   │   ├── tactical.ts          ← 戰術層覆蓋繪製
│   │   ├── grid/                ← 地形、格子、Hazard 繪製
│   │   ├── units/               ← 單位視覺管線（Faction Renderers + Painters）
│   │   ├── hud/                 ← HUD 子元件
│   │   └── status/              ← 狀態效果視覺管線
│   │       ├── StatusOrchestrator.ts    ← 狀態視覺主協調器（路由 + 放逐守門）
│   │       └── painters/
│   │           ├── GroundEffectPainter.ts  ← 地板 CC 光暈（DoT 動態色、POLYMORPH/FROZEN 地板）
│   │           ├── OverheadPainter.ts      ← 頭頂圖標（STUN/SILENCE/INVINCIBLE/STASIS 等）
│   │           ├── ShieldPainter.ts        ← 護盾視覺
│   │           └── StateModelPainter.ts    ← 模型替換（SHEEP/ICE_BLOCK/BANISH 透明）
│   ├── events/
│   │   ├── EventBus.ts      ← 系統間解耦通訊
│   │   └── GameEventPool.ts ← 物件池，避免 GC 壓力
│   ├── math/
│   │   ├── VisualMath.ts        ← ISO 視覺座標轉換 SSOT（getIsoVisualY）
│   │   ├── PointerProjector.ts  ← 所有指標座標逆投影的唯一入口（含 DPR 校正）
│   │   └── rng.ts               ← 可注入確定性隨機源（支援單元測試與重播）
│   ├── physics/             ← 彈體物理、碰撞
│   ├── sprites.ts           ← SpriteManager：障礙物 Sprite 快取與查詢
│   ├── graphics/
│   │   └── EnvironmentFactory.ts ← 障礙物 Sprite 生成（尺寸參數由 ENV_SPRITE 管控）
├── tests/                   ← Vitest 確定性單元測試套件（29 項測試）
│   ├── DamageCalculator.test.ts ← 傷害公式、暴擊、格擋、易傷、護盾吸收、斬殺
│   ├── DirectDamage.test.ts     ← 環境/墜落/DoT 單一入口防禦性檢定
│   ├── Core.test.ts             ← HexUtils、EventPool、EventBus、行為樹、DoT/HoT
│   └── Rng.test.ts              ← 隨機源注入與 AI Jitter 確定性消耗
├── components/
│   ├── ui/
│   │   ├── MapEditorToolbar     ← 戰場編輯工具列
│   │   ├── PlaybackHUD          ← 時間流速、播放控制
│   │   ├── UnitInspectorHUD     ← 單位即時檢視與調整
│   │   ├── DirectorMonitorHUD   ← 導播系統監控面板
│   │   └── SystemMenu           ← 全局設定與場景切換
│   ├── inspector/
│   │   ├── tabs/
│   │   │   ├── BehaviorTreeTab  ← AI 行為樹即時狀態視覺化
│   │   │   ├── LogTab           ← 戰鬥紀錄查詢與篩選
│   │   │   ├── SkillDbTab       ← 全域技能資料庫編輯
│   │   │   ├── UnitStatusTab    ← 單位完整狀態讀取
│   │   │   └── VFXMapTab        ← VFX 區格分佈與生命週期監控
│   │   └── GameCanvas.tsx   ← 主渲染畫布
├── data/
│   ├── scenes.ts            ← 場景主題資料（森林、冰原、熔岩…）
│   ├── units/
│   │   └── appearance/      ← 單位外觀 SSOT（ECS Component 等價層）
│   │       ├── types.ts     ← RoleAppearance、FactionAppearanceProfile 介面定義
│   │       ├── imperial.ts  ← Imperial 陣營外觀 Profile
│   │       ├── covenant.ts  ← Covenant 陣營外觀 Profile
│   │       └── index.ts     ← UNIT_APPEARANCE SSOT export
│   └── vfx/
│       └── status_visuals.ts    ← 狀態效果視覺定義 SSOT（CC、DoT、Buff、地板光暈）
├── .github/workflows/       ← GitHub Actions 自動部署工作流 (deploy.yml)
├── server.js                ← 零依賴極簡生產環境伺服器 (Cloud Run / 容器支援)
├── Dockerfile               ← 多階段容器構建設定
├── types.ts                 ← 全域型別定義（SSOT 資料結構）
├── types/
│   └── VFXSchema.ts         ← VFX 粒子與貼花的資料 schema（types.ts 的 VFX 擴充）
└── constants.ts             ← 遊戲常數
```

---

## AI 協作規範

> 本節為代理人操作契約。每次開始任何修改前，代理人必須先閱讀本節全文。

### 無條件優先讀取（無例外）

| 檔案 | 職責 |
|------|------|
| `types.ts` | 所有引擎核心型別（Agent, Skill, Hex, GameEvent）的主契約。VFX 粒子／貼花 schema 另見 `types/VFXSchema.ts`，搜尋型別前必須確認兩者 |
| `constants.ts` | 所有數值調參的唯一來源（PHYSICS, VFX_RENDER, VFX_PARAM, COMBAT_PARAM, PALETTE, TERRAIN_THEMES, ENV_SPRITE）。禁止 hardcode 魔法數字，禁止在未明確指示的情況下修改現有數值 |

### 依工作區域讀取

| 工作區域 | 必讀檔案 |
|----------|----------|
| Renderer / VFX / 視覺分層 / Z-sorting | `engine/renderers/RenderSpec.ts`、`VFX_PARAM`（`constants.ts`）管控 `MAX_PARTICLES` / `MAX_POOL_SIZE` / `HAZARD_FIELD_MAX_PER_CELL` / `IDLE_VFX_CULL_DIST_SQ` 四個預算常數 |
| 單位外觀 / 陣營顏色 / 身體尺寸 / 武器類型 | `data/units/appearance/types.ts`、`data/units/appearance/imperial.ts`、`data/units/appearance/covenant.ts`、`data/units/appearance/index.ts` |
| AI 行為樹 / 生存 / 閃避 / 危害邏輯 | `engine/systems/DesignExporter.ts`（第 8、11、12 節） |
| 技能欄位 / Inspector UI / Visual ID 選項 | `components/inspector/InspectorConstants.ts` |

**單位外觀修改規則：**
- 調整顏色、尺寸、武器類型 → 只改 profile 檔（imperial.ts / covenant.ts）
- 調整繪製方式、動畫 → 改 Faction Renderer 或 Painter
- 禁止在任何 Renderer 或 Painter 中 hardcode hex 顏色 or 身體尺寸

### Facade 架構（關鍵）

下列 flat 檔案是 **Facade**，公開 API 層。實作在對應子目錄。  
**永遠編輯子目錄，不動 Facade**（除非更改公開介面或生命週期編排）。

| Facade | 實作子目錄 |
|--------|-----------|
| `engine/renderer.ts` | `renderers/` + `systems/*`（RenderPipeline, StatusOrchestrator, GridSystem, VFXSystem, UnitRenderSystem, HUDSystem, SequenceSystem） |
| `combat.ts` | `combat/`（SkillExecutor, CastingEngine, ProjectileSystem） |
| `movement.ts` | `movement/`（MotionEngine, StackingResolver） |
| `vfx.ts` | `vfx/`（VFXPlayer, VFXPhysics, VFXAmbience, AgentVFXSystem） |
| `grid.ts` | `grid/` |
| `map.ts` | `map/` |
| `unit.ts` | `unit/` |

每個 Facade 頂部有 `[FACADE]` 註解，列出完整子目錄映射，修改前必須讀取。

### ECS-in-Spirit 架構原則

- **Agent 是純資料容器（Entity）**，禁止在 Agent 上新增邏輯方法
- **所有遊戲邏輯在 System 類別**，透過讀寫 Agent 欄位運作
- **跨系統溝通透過 `engine.bus`（EventBus）**，禁止 System 直接呼叫另一個 System 的方法
- **Agent 子物件（physics 等）視為邏輯 Component**，相關欄位保持聚合，禁止散落
- **`UNIT_APPEARANCE` 是所有陣營視覺的 SSOT**，Faction Renderer 消費資料，不定義資料
- **`UnitDeathPainter` 位於 `engine/renderers/units/painters/`**，不得移回 `engine/systems/`

### 通用規範

- **先理解再修改**。不確定某段邏輯的原因，先追蹤程式碼或詢問，禁止猜測後 patch
- **精準修改優先**。若一個修正需要動超過 3 個檔案，先說明計畫再動手
- **禁止引入新抽象**，除非明確要求
- **引擎核心檔案禁止使用 `as any`**
- **禁止新增 `console.log`**，除非明確要求
- **VFX 驗證 log 每 session 最多觸發一次**（首次成功 bind 時），禁止放在 update 迴圈或 render 路徑中

---

## 核心設計原則

### 1. SSOT（Single Source of Truth）
所有單位狀態集中在 `Agent` 實體，渲染層與 UI 層**只讀取，不寫入**。  
動畫狀態在 `tick()` 最後才由 `AnimationSystem` 統一推導，確保視覺永遠與邏輯一致。
單位外觀的顏色、尺寸、武器類型集中於 `UNIT_APPEARANCE`（`data/units/appearance/index.ts`），視覺 SSOT 延伸至渲染層。

### 2. Mutation Gate
大多數核心屬性變更（HP、位置、狀態）透過系統入口函式執行，降低非預期副作用。  
特例：地圖系統驅動的死亡（縮圈崩落、深淵墜落）會直接寫入 `hp = 0` 與 `banished`，  
因為這類死亡屬於「地形判定」而非「戰鬥傷害」，繞過傷害管線是刻意設計。

### 3. Data Contract
`types.ts` 是整個系統的資料契約。TypeScript 靜態型別確保 AI 協作擴充時，介面斷層在編譯期就被捕捉。

### 4. Director-Camera 分離
`DirectorSystem` 負責**決策**（聚焦誰、持續多久）  
`CameraSystem` 負責**執行**（平滑插值、跟隨邏輯）  
兩者職責明確分離，各自可獨立調整。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript 5.8 |
| 建置 | Vite 6 |
| 測試 | Vitest（29 項確定性單元測試全數通過） |
| 渲染 | HTML5 Canvas（自製 2.5D Isometric 渲染器，零外部圖形依賴） |
| AI 協作開發 | AI 驅動的企劃主導式開發（設計決策 → AI 協作實作 → 模擬器驗證） |
| 部署 | GitHub Pages (CI/CD 自動化) / Google Cloud Run / Docker |

---

## 職業與技能系統

支援 5 種職業，每個職業有獨立的 BASIC / ACTIVE / ULT 技能組：

| 職業 | 定位 | 特色機制 |
|------|------|----------|
| TANK | 前排承傷 | 嘲諷、護盾 |
| WARRIOR | 近戰輸出 | 突進、擊退 |
| RANGER | 遠程輸出 | 彈道射擊、致盲 |
| MAGE | 爆發法傷 | AOE、地面危機 |
| SUPPORT | 輔助治療 | 治療、結界、沉默 |

技能支援 14 種控場類型、9 種元素屬性、7 種彈道視覺形式。

---

## 本地執行與測試

### 安裝依賴
```bash
npm install
```

### 啟動本地開發伺服器
```bash
npm run dev
```

### 執行單元測試
```bash
npm test
```

### 嚴格型別檢查與生產打包
```bash
npm run lint    # TypeScript 靜態檢查（0 errors）
npm run build   # 產出生產環境最佳化包
npm run start   # 以本機生產伺服器 (server.js) 啟動測試
```

> **注意**：本專案為 100% 純前端客戶端應用，**不需**在本地設定任何 API Key 或後端服務。

---

## 關於這個專案的開發方式

這個專案由**遊戲企劃主導，以 AI 協作方式建構**。設計流程是：先定義資料結構與系統邊界，再以 Gemini 協助實作各子系統，最後在模擬器中直接驗證戰鬥手感是否符合設計意圖。

這不是「工程師做了一個遊戲」，而是「企劃用可執行的系統來驗證設計決策」。

---

<div align="center">
<sub>Designed & Directed by Avalon-Ash ｜ Built with Gemini AI Studio</sub>
</div>
