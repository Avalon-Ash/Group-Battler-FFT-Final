<div align="center">

# TACTICAL.OS — Group Battler FFT

**一套以企劃為主導的自驅動戰術模擬引擎**  
Vite 6 + React 19 + TypeScript｜GitHub Pages 全球即時部署

[![Play Online](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2ea44f?logo=github&logoColor=white)](https://avalon-ash.github.io/Group-Battler-FFT-Final/)

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

### 單位調整（`UnitInspectorBody` + `UnitStatusTab`）

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

整個引擎以 `GameEngine` 為核心，採 **單一真相來源（SSOT）** 原則設計，系統之間透過 `EventBus` 溝通，避免直接耦合。UI 只能透過 `UICommandSystem` 寫入引擎。

```
├── engine/
│   ├── game.ts              ← [Facade] 主引擎：系統整合與 tick 迴圈
│   ├── renderer.ts          ← [Facade] 渲染器根節點（持有 RenderPipeline、VFX、HUD）
│   ├── behaviorTree.ts      ← 行為樹框架（Selector / Sequence / Leaf）
│   ├── core/
│   │   └── Agent.ts         ← 單位實體（純資料：狀態、技能、AI 樹掛載點）
│   ├── ai/
│   │   ├── BTRegistry.ts        ← 行為樹的條件與動作節點實作
│   │   ├── TargetingSystem.ts   ← 目標選擇與合法性判定
│   │   └── Pathfinder.ts        ← A* 路徑搜尋
│   ├── systems/
│   │   ├── grid.ts / map.ts     ← [Facade] 網格查詢、地圖資料（實作在 grid/、map/）
│   │   ├── combat/              ← 戰鬥：技能執行、傷害公式、彈道、施法、控場（combat.ts 為轉發 barrel）
│   │   ├── movement/            ← Hex 移動、逐幀位移、同格碰撞排解
│   │   ├── status/              ← 冷卻、持續效果、控場計時
│   │   ├── unit/                ← 單位渲染提交、Ragdoll 快照
│   │   ├── vfx/                 ← 特效系統、粒子物理、環境特效
│   │   ├── audio/AudioSystem.ts ← 遊戲事件 → 音效 Cue、BGM 切換
│   │   ├── ui/UICommandSystem.ts← UI 寫入引擎的唯一閘門（UI_COMMAND 事件）
│   │   ├── agentManager.ts      ← 單位生命週期：生成、唯一死亡入口、死亡計時、回收
│   │   ├── ZoneSystem.ts        ← 大逃殺縮圈：Flood-fill 深度、地形崩落、墜落出局
│   │   ├── PhysicsSystem.ts     ← 物理積分：衝量、重力、自由落體
│   │   ├── AnimationSystem.ts   ← 動畫狀態推導（tick 最末層）
│   │   ├── DirectorSystem.ts / CameraSystem.ts ← 導播決策 / 鏡頭執行
│   │   ├── HazardSystem.ts      ← 地面危機區域（毒、火、冰、重力）
│   │   ├── VictorySystem.ts     ← 勝負判定（含平局收尾）
│   │   ├── BattleLogger.ts / AnnouncerSystem.ts ← 戰鬥紀錄 / 戰況播報
│   │   └── DesignExporter.ts    ← 戰鬥數據結構化輸出（企劃驗證用）
│   ├── renderers/
│   │   ├── RenderSpec.ts        ← 渲染物件資料結構（視覺 SSOT）
│   │   ├── RenderPipeline.ts    ← 渲染主管線：Z 排序、分層提交
│   │   ├── RenderQuality.ts     ← 品質階層與自動降階
│   │   ├── units/               ← 精靈單位（SpriteUnitRenderer、SpriteAtlasStore）與繪製器（含 UnitDeathPainter）
│   │   ├── grid/                ← 地形、格子、Hazard 繪製（含地形烘焙快取）
│   │   ├── status/              ← 狀態視覺（護盾、頭頂圖示、地板光暈、模型替換）
│   │   └── hud/                 ← HUD 子元件
│   ├── graphics/            ← 程序化材質（materials/NoiseLib、MaterialPainter）、Token／環境 Sprite 工廠
│   ├── audio/AudioEngine.ts ← Web Audio 共享引擎（擁有者計數、BGM 請求序號）
│   ├── events/              ← EventBus、GameEventPool（物件池，避免 GC 壓力）
│   ├── math/                ← VisualMath（ISO 座標 SSOT）、PointerProjector（指標逆投影）、rng（可注入確定性隨機源）
│   └── physics/             ← 單位物理、碰撞
├── components/              ← React UI：GameCanvas、HUD、戰場編輯器、Inspector 分頁、視窗系統、展示頁
├── hooks/                   ← 引擎與 React 的接合層（useGameApp、useGameLoop、相機與輸入）
├── data/
│   ├── units/appearance/    ← 單位外觀 SSOT：精靈圖集對應、體型、影格選擇、死亡擊飛（deathMotion）
│   ├── skills/              ← 各陣營技能資料
│   ├── ai_profiles.ts       ← 行為樹定義（資料驅動）
│   ├── audio/               ← 音效 Cue 與 BGM 定義
│   ├── vfx/                 ← 特效登記、程序化材質參數（materialConfig）、狀態視覺定義
│   └── scenes.ts            ← 場景主題（森林、冰原、熔岩…）
├── public/assets/           ← 精靈單位、地形貼圖、粒子貼圖、音訊（授權見 CREDITS.md、docs/ASSET_LEDGER.md）
├── tests/                   ← Vitest 確定性單元測試
├── tools/                   ← 材質預覽、UI e2e、效能量測與渲染保真腳本、音訊預覽
├── types.ts                 ← 全域型別契約（VFX schema 另見 types/VFXSchema.ts）
├── constants.ts             ← 全域參數 SSOT（物理、戰鬥、顏色、版面、特效預算）
└── .github/workflows/       ← GitHub Pages 自動部署
```

---

## 核心設計原則

### 1. SSOT（Single Source of Truth）
單位狀態集中在 `Agent`，渲染層與 UI 層**只讀取，不寫入**（UI 的修改經 `UICommandSystem` 提交）。
動畫狀態在 `tick()` 最後由 `AnimationSystem` 統一推導，確保視覺與邏輯一致。
參數與顏色在 `constants.ts`，單位外觀在 `data/units/appearance/`，渲染器只消費資料、不定義資料。

### 2. 單一寫入者
每個狀態欄位只由一個系統寫入。例如死亡計時 `deathTimer` 與回收旗標 `fullyDead` 只由 `agentManager.updateDeathState` 寫入；曾經有兩個系統同時寫它，結果計時永遠歸零、死亡動畫從不播放。

### 3. Mutation Gate
核心屬性變更（HP、位置、狀態）透過系統入口執行。
地形造成的死亡（縮圈崩落、墜入深淵）不走傷害管線（屬於「地形判定」），但仍經過唯一的死亡入口 `agentManager.handleDeadState`，確保事件、地圖佔位、死亡演出都完整收尾。

### 4. Data Contract
`types.ts` 是整個系統的資料契約。TypeScript 靜態型別確保擴充時，介面斷層在編譯期就被捕捉。

### 5. Director-Camera 分離
`DirectorSystem` 負責**決策**（聚焦誰、持續多久），`CameraSystem` 負責**執行**（平滑插值、跟隨），兩者可各自調整。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript 5.8 |
| 建置 | Vite 6 |
| 測試 | Vitest 單元測試、Playwright（`playwright-core` + Edge）UI e2e 與渲染保真比對 |
| 渲染 | HTML5 Canvas（自製 2.5D Isometric 渲染器，零外部圖形依賴；不使用 WebGL／Three／Pixi） |
| 美術 | KayKit 3D 模型預渲染的精靈圖集、貼圖地形、粒子貼圖（CC0／CC-BY，見 `CREDITS.md`） |
| 音訊 | Web Audio（共享 AudioContext，事件驅動音效與 BGM） |
| AI 協作開發 | 企劃主導：設計決策 → AI 實作 → 模擬器驗證（見下方「開發協作」） |
| 部署 | GitHub Pages（CI/CD 自動化） |

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

```bash
npm install          # 安裝依賴
npm run dev          # 開發伺服器 http://localhost:3000
npm run lint         # TypeScript 靜態檢查（0 errors）
npm test             # 單元測試
npm run build        # 生產環境打包（dist/）
npm run e2e:ui       # UI e2e（無頭 Edge）
npm run perf:guard   # 渲染保真與效能回歸檢查（改渲染時必跑）
```

網址參數：`?perf` 顯示效能 HUD（含尖峰記錄），`?mute` 關閉音訊。

> **注意**：本專案為 100% 純前端客戶端應用，**不需**在本地設定任何 API Key 或後端服務。

---

## 開發協作（代理合約）

這個專案以 AI 代理協作開發，規則寫成「合約」檔案，**修改程式前請先讀對應的合約**：

| 檔案 | 給誰 | 內容 |
|------|------|------|
| `AGENTS.md` | 實作代理（IDE 的 Gemini 等） | 嚴格的架構不變式、禁止事項、Git 與測試紀律、驗證流程 |
| `CLAUDE.md` | 主代理（Claude Code） | 角色分工、少數鐵律、子代理與模型分級 |
| `.claude/agents/*.md` | Claude Code 子代理 | 搜尋／執行／審查三種子代理，各自鎖定模型與權限 |
| `docs/HANDOFF.md` | 主代理 | 目前的分支、進行中的工作、審查教訓、待辦池 |
| `docs/*_AGENT_PROMPT.md` | 實作代理 | 單輪任務合約（完成後歸檔至 `docs/archive/`） |

分工：主代理負責設計、審查與合併；長時間的機械性實作交給實作代理，在獨立分支完成後由主代理審查 diff 並本機實跑驗證，經使用者同意才合併進 `main`。

---

## 關於這個專案的開發方式

這個專案由**遊戲企劃主導，以 AI 協作方式建構**。設計流程是：先定義資料結構與系統邊界，再由 AI 代理實作各子系統（早期以 Gemini／AI Studio，現在由 Claude Code 主導設計與審查、Gemini 負責實作），最後在模擬器中直接驗證戰鬥手感是否符合設計意圖。

這不是「工程師做了一個遊戲」，而是「企劃用可執行的系統來驗證設計決策」。

---

<div align="center">
<sub>Designed & Directed by Avalon-Ash</sub>
</div>
