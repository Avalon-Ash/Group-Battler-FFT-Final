# TACTICAL.OS 美術修正輪（座標對齊、音訊單例、熔岩效能與舊管線切除）

本計畫嚴格依據 `docs/ART_AGENT_PROMPT_2.md` 與審查回饋修訂，旨在解決 2.5D 奇幻 HD 美術導入後的五大問題：修正精靈單位縮放補償與貼地錨點、以參考計數／擁有者 Token 根除多重引擎 BGM 疊音、在不改變任何像素基準的前提下診斷並優化熔岩（MAGMA）效能、切除舊版程序化視覺管線，以及增設輕量卡頓尖峰記錄器。

### User Review & Critical Decisions

> [!IMPORTANT]
> 已完整納入 5 項修訂指示，請確認後點擊「Proceed」啟動執行：

- **修訂 1（T2 擁有者 Token／參考計數單例）**：`AudioEngine` 單例採用**擁有者 Token 集合（Owner Token Set / Reference Counting）**管理生命週期。每次 `AudioSystem` 建構時向共享 `AudioEngine` 註冊唯一 `ownerToken`，銷毀時僅移除該 `ownerToken`；**唯有當最後一個擁有者離開（活躍擁有者數量歸零）時，才真正停止音樂並關閉 `AudioContext`**。單元測試強制覆蓋「**新引擎先建立、舊引擎後 destroy**」的交錯順序，確保舊引擎卸載絕不會切斷新引擎正在播放的 BGM。
- **修訂 2（T3 先量測假設＋嚴守 0 差異保守退路）**：先為 `TerrainBlockCache` 加入命中／未命中／驅逐計數（僅 `?perf` 啟用時累計）與 `drawLiquid` 耗時計測。對 `floatOffset` 快取鍵解耦抱持假設驗證原則：**`MAGMA` 與 `VOID` 的 `perf:fidelity` 基準必須維持 0 差異**；若移除快取鍵中的 `floatOffset` 造成邊界或亞像素差異，立即改採**保守做法**（保留鍵內 `floatOffset`，改為調大 `RENDER_CACHE.MAX_TERRAIN_SPRITES` 快取容量與低成本優化），**絕不重錄地形基準**。
- **修訂 3（T1 `targetHeightCanvasUnits` 為固定數值常數）**：`UNIT_SPRITE.targetHeightCanvasUnits` 在 `constants.ts` 中必須是**固定數值字面量常數**（不得在執行期動態計算）。由單元測試遍歷 `manifest.json` 全部 10 單位 × 全動畫 × 4 方向影格，驗證最大螢幕寬度 `≤ 2 × SHIELD_VISUAL.radius (76)` 且最大螢幕高度 `≤ SHIELD_VISUAL.height (80)`，以此決定最終固定常數值並記錄於報告。
- **修訂 4（嚴禁修改任何 HUD／UI 樣式）**：**不修改任何 HUD 或 UI 元件的視覺樣式、配色或字體**，確保 `style-baseline.json` 零變動；`?perf` 診斷面板僅在既有純文字診斷列多顯示一行「最近一次尖峰與累計尖峰數」。
- **修訂 5（Git 與 `main` 分支工作紀律）**：直接在 `main` 分支工作；開工第一步打並推送安全標籤 `pre-art-fix2`；每個任務於 `npm run lint`、`npm test`、`npm run build` 全綠後獨立 commit（`fix(art2): T<n> ...`）並 `git push origin main`；**嚴禁 `git add package-lock.json`**；嚴禁 force push、rebase、amend 已推送 commit 或改寫歷史。

---

### 1. Overview & Core Concept

- **What It Does**：
  1. **T1 單位大小與貼地修正**：抽離 `SHIELD_VISUAL = { height: 80, radius: 38 }` 常數；於 `SpriteUnitRenderer` 內部除以 `UNIT_SCALE (0.65)` 補償外層畫布縮放，並加上 `footOffsetLocal = (UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET) / UNIT_SCALE` 使腳底精確貼合 `surfaceY`（與地面陰影同高）；`UnitDeathPainter` 同步使用相同錨點與縮放公式。
  2. **T2 BGM 流程與疊音修復**：透過擁有者 Token 參考計數單例與 `playMusic` 請求序號鎖，消除 React StrictMode 雙掛載、HMR 與交錯卸載造成的 BGM 疊加問題，並確保展示模式、一般戰鬥、殘局緊張（存活 ≤ 4）與勝敗結算曲目嚴格互斥。
  3. **T3 熔岩（MAGMA）場景 FPS 優化**：為地形快取補齊 Hit / Miss / Evict 診斷計數與液體繪製計時，在確保 5 大地形保真基準 0 差異的前提下消除快取抖動或繪製瓶頸。
  4. **T4 切除舊程序化視覺管線**：於 `GameCanvas` 建立統一資源就緒載入閘門（附失敗單色六角格＋圓影極簡退路）；全面移除單位、地形、粒子的舊版程序化分支與開關常數；將 `ParticleTextureStore.getTintedTexture` 的快取鍵改為固定尺寸級距（`32 / 64 / 128 / 256`）並加上快取容量上限。
  5. **T5 卡頓記錄器 & T6 報告收尾**：在 `RenderStats` 實作預配置環形緩衝（單幀 > `RENDER_PERF.SPIKE_MS (50ms)` 時記錄各繪圖器耗時、粒子數、存活單位數與活躍音源數），掛載 `window.__PERF_SPIKES__`，並產出 `docs/ART2_PROGRESS.md`、`docs/ART2_REPORT.md` 與更新 `docs/HANDOFF.md`。
- **Target Audience / Persona**：戰術模擬系統設計師與主代理驗收環境。
- **Key Value**：在不觸動任何既有 UI 樣式與遊戲模擬規則的前提下，精準修復角色比例、貼地錨點、音訊疊加與極端場景掉幀問題。

---

### 2. User Experience & Operational Flows

- **Key Operational Flows**：
  1. **資源就緒載入閘門（T4）**：統一等待單位圖集、地形貼圖與粒子貼圖就緒後才繪製戰場；若發生 404 或解碼失敗，僅 `console.warn` 一次並以既有主題色的極簡單色六角格＋腳底圓影維持可玩。
  2. **角色空間對齊（T1）**：活體與死亡狀態共用單一縮放與腳底偏移公式，腳底世界 Y 恆等於 `surfaceY`；所有動畫格（含揮砍與施法武器延伸）之螢幕寬高均受限於護盾稜柱（寬 ≤ 76、高 ≤ 80）內；檢查頭頂血條與狀態圖示偏移常數，必要時僅微調常數以防重疊。
  3. **BGM 狀態流轉（T2）**：展示模式恆播 `SHOWCASE_AMBIENT`；手動開戰播 `BATTLE_NORMAL` → 存活 ≤ 4 人切 `BATTLE_TENSE` → `GAME_OVER` 依勝方播專屬勝利曲或 `DEFEAT_STING` → 結束回 `SHOWCASE_AMBIENT`。任何時刻未排程停止之 BGM source 最多 1 個。
  4. **診斷與尖峰捕捉（T3 & T5）**：僅在開啟 `?perf` 時啟用快取計數與尖峰環形緩衝記錄，關閉時零額外開銷；`?perf` 文字診斷列僅新增一行顯示最近一次尖峰與累計尖峰數，主控台可讀取 `window.__PERF_SPIKES__`。

---

### 3. Key Technical Decisions & Guardrails

- **Decision 1：T1 固定常數與單一錨點公式**
  - *Chosen Approach*：先於測試中計算並驗證 10 個單位 × 全動畫 × 4 方向在 `targetHeightCanvasUnits = 65`（即 `UNIT_VISUAL_HEIGHT * UNIT_SCALE`）下的最大邊界；若有任何影格寬度 `> 76` 或高度 `> 80`，則調降 `constants.ts` 中的固定數值常數 `targetHeightCanvasUnits` 直至全數通過。`footOffsetLocal` 定為 `(UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET) / UNIT_SCALE`。
  - *Guardrail*：`ShieldPainter` 改讀 `SHIELD_VISUAL` 常數後，畫面不得有任何像素變化。

- **Decision 2：T2 擁有者 Token 參考計數與交錯銷毀防護**
  - *Chosen Approach*：`AudioEngine` 提供 `acquireSharedAudioEngine(ownerToken)` 與 `releaseSharedAudioEngine(ownerToken)`（或於 `AudioSystem` 建構／`destroy` 中自動配對呼叫）。當新 `GameEngine` 先建立（註冊 `tokenB`）、舊 `GameEngine` 後呼叫 `destroy()`（釋放 `tokenA`）時，因活躍擁有者尚有 `tokenB`，`AudioEngine` 絕不關閉 `AudioContext` 或中斷 `tokenB` 剛切入的 BGM；唯有當所有擁有者皆釋放時才真正執行底層 `destroy()` 關閉 `AudioContext`。
  - *Guardrail*：所有 `catch {}` 改為僅吞預期之 DOMException（如 `InvalidStateError`），其餘異常以單次 `console.warn` 記錄（非迴圈內）。

- **Decision 3：T3 熔岩快取診斷與保守退路優先**
  - *Chosen Approach*：先在 `TerrainBlockCache` 實作 `hits / misses / evictions` 計數。由於 `bakeBlock` 內部使用 `visualTopY`（含 `floatOffset`）計算邊界與側面漸層起點，直接從快取鍵拔除 `floatOffset` 極可能導致 `MAGMA`／`VOID` 的 `perf:fidelity` 像素基準產生差異；因此若檢測到任何非 0 差異，立即採用**保守做法**：保留快取鍵中的 `floatOffset`，將 `RENDER_CACHE.MAX_TERRAIN_SPRITES` 擴充至足以容納所有高度×變體×浮動步階（避免 LRU 驅逐重烘焙抖動），並最佳化 `drawLiquid` 繪製開銷。
  - *Guardrail*：5 個地形 baseline 必須維持 0 差異，嚴禁重錄地形基準。

- **Decision 4：T4 引用盤點與粒子快取量化**
  - *Chosen Approach*：刪除前先徹底盤點引用，移除 `UNIT_RENDER_MODE`、`TERRAIN_SKIN.enabled`、`VFX_SPRITES.enabled` 及無引用的 `ImperialRenderer`、`CovenantRenderer`、舊 `TokenFactory`／外觀檔案；保留羊化（`SHEEP`）、冰凍（`ICE`）、編輯器障礙物預覽與陣營色彩常數。`ParticleTextureStore.getTintedTexture` 尺寸量化至固定常數陣列 `VFX_SPRITES.SIZE_STEPS`（`[32, 64, 128, 256]`），並設定快取上限（超限時整批清空重建）。

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**：

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        GameCanvas (統一資源載入閘門)                     │
│   等待 SpriteAtlasStore + TerrainTextureStore + ParticleTextureStore    │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │ 渲染調度                         │ 事件匯流排 (EventBus)
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│           2.5D 渲染管線                │ │     AudioSystem (事件橋接)     │
│                                       │ │  建構時 acquire(ownerToken)   │
│  ┌─────────────────────────────────┐  │ │  銷毀時 release(ownerToken)   │
│  │ 單位渲染 (SpriteUnitRenderer)   │  │ └───────────────┬───────────────┘
│  │ • 固定 targetHeightCanvasUnits  │  │                 │ 共享單例與序號鎖
│  │ • 內部除以 UNIT_SCALE 補償       │  │                 ▼
│  │ • 腳底偏移 +footOffsetLocal     │  │ ┌───────────────────────────────┐
│  └─────────────────────────────────┘  │ │   AudioEngine (參考計數單例)   │
│  ┌─────────────────────────────────┐  │ │ • 活躍擁有者 > 0 時維持運行    │
│  │ 地形渲染 (TerrainBlockCache)    │  │ │ • 最後擁有者離開才 close ctx  │
│  │ • Hit / Miss / Evict 診斷計數   │  │ │ • 活躍 BGM source 恆 ≤ 1      │
│  │ • 嚴守 5 地形 baseline 0 差異    │  │ │ • getActiveMusicSourceCount() │
│  └─────────────────────────────────┘  │ └───────────────┬───────────────┘
│  ┌─────────────────────────────────┐  │                 │
│  │ 粒子快取 (ParticleTextureStore) │  │                 │ 音源數讀取
│  │ • 固定級距 [32, 64, 128, 256]   │  │                 ▼
│  │ • 快取容量上限保護              │  │ ┌───────────────────────────────┐
│  └─────────────────────────────────┘  │ │  RenderStats (?perf 尖峰記錄)  │
└───────────────────┬───────────────────┘ │ • 預配置環形緩衝 (SPIKE_MS)   │
                    │ 階段耗時與統計       │ • window.__PERF_SPIKES__      │
                    └────────────────────►│ • ?perf HUD 單行尖峰摘要      │
                                          └───────────────────────────────┘
```

- **Execution Sequence & Git Protocol**：
  1. **開工檢查與安全標籤**：確認位於 `main` 分支、工作樹乾淨（不加入 `package-lock.json`），打上 `pre-art-fix2` 標籤並推送，建立 `docs/ART2_PROGRESS.md`。
  2. **依序執行 T1 → T2 → T3 → T4 → T5 → T6**：
     - 每一任務完成後立即執行 `npm run lint`、`npm test`、`npm run build`（以及環境允許之驗證腳本）。
     - 確認全綠後提交單一 commit（`fix(art2): T<n> ...`），更新 `docs/ART2_PROGRESS.md` 並推送至 `origin main`。
     - 完成 T6 最終報告 `docs/ART2_REPORT.md` 與 `docs/HANDOFF.md` 更新後，打上 `art-fix2-final` 標籤。
