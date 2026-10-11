# 「烘焙渲染」架構設計藍圖 (BAKED_RENDERING_DESIGN.md)

> **版本**: 1.0 (2026-10-11)  
> **系統識別碼**: `tactical-battler:-kernel-v9.7`  
> **關聯架構合約**: `AGENTS.md` §1 (SSOT & 零重型圖形依賴)、`types.ts`、`constants.ts`、`data/units/appearance/`  
> **核心目標**: 從「執行期程序化向量繪製」漸進演進至「開機/離線烘焙圖集 + 執行期純 Blit」架構，以達成閒置 ≤5 ms、戰鬥 ≤6 ms（≈165 FPS）、極限 4.2 ms（240 FPS）之高畫質 FFT / Tactics Ogre 質感。

---

## 1. 現行渲染資產烘焙現況分析與 Q1 診斷佐證

### 1.1 現行資產管線清查

| 資產類別 | 涉及模組 | 目前快取／烘焙狀態 | 執行期開銷模式 |
| :--- | :--- | :--- | :--- |
| **單位底座與圖示 (Token Base & Icon)** | `ImperialTokenFactory`, `CovenantTokenFactory`, `UnitFactory` | **已烘焙**：開機時依陣營 × 職業 (10 種組合) 生成 128×128 與 64×64 離屏 Canvas 精靈。 | `drawImage` 貼圖 (43 次/幀)。 |
| **單位主體／肢體／裝甲 (Unit Body & Limbs)** | `ImperialRenderer`, `CovenantRenderer` | **即時向量繪製**：每幀針對每個活體單位即時計算呼吸、擺動、關節矩陣、高光漸層、接縫線。 | 向量路徑 `stroke` (59 次/幀)、`fill` (152 次/幀)、即時漸層 (23 次/幀)。 |
| **單位核心與常駐環境光 (Unit Core & Ambient)** | `UnitCorePainter`, `UnitAmbientPainter` | **Q4 混合烘焙**：預設走即時 `shadowBlur` (12 次/幀)；啟用 `GLOW_SPRITES` 時走 `GlowSpriteCache` 離屏烘焙。 | 即時 `shadowBlur` (原佔單位 37 次/幀之大宗) 或快取貼圖 blit。 |
| **地形六角塊 (Terrain Blocks)** | `TerrainBlockCache`, `TerrainRenderer` | **已烘焙**：依主題、高度、尺寸量化預先烘焙等角六角稜柱 Sprite（最大 512 個）。 | `drawImage` 貼圖 (269 次/幀)，但包含 345 次 `save/restore` 狀態切換。 |
| **動態地形液面 (Magma/Water Surface)** | `TerrainSurfacePainter` | **即時計算**：依時間 t 計算 Simplex 噪聲並即時填充多邊形。 | 即時噪聲計算與多邊形填充。 |
| **地面危害與裂紋 (Hazard & Scars)** | `HazardPainter`, `GroundPainter` | **部分烘焙**：灼痕與黑洞以離屏貼圖快取，網格動態掃描即時運算。 | `drawImage` (57 次/幀) 與 19 次 `globalCompositeOperation` 切換。 |
| **VFX 粒子與投射物 (Particles & Projectiles)** | `BillboardPainter`, `ProceduralPainter`, `VFXFactory` | **部分快取**：草地、部分火花預繪，但光束、幾何符文環每幀即時生成。 | 110 次 `drawImage`、116 次 `globalCompositeOperation` (`lighter`)、241 次 `save/restore`。 |
| **HUD 血條／護盾／數值 (Bar & Text HUD)** | `BarPainter`, `TextPainter`, `GaugePainter` | **Q4 混合烘焙**：血條主體即時漸層；光暈可選 `GlowSpriteCache`；數字即時文字繪製。 | 24 次 `shadowBlur`、19 次即時漸層、58 次 `save/restore`。 |

### 1.2 Q1 診斷數據佐證（Manual Battle 實戰）

依據 Q1 於 6 單位實戰下的 CDP Native 操作採樣：
1. **即時向量操作佔用極高頻次**：
   - 每幀執行 **968 次 `save/restore`**（其中地形佔 345 次、VFX 佔 241 次、單位佔 170 次）。
   - 每幀執行 **322 次 `fill`** 與 **160 次 `stroke`**。
   - 每幀執行 **224 次 `globalCompositeOperation` 狀態切換**。
2. **Native 成本主導**：
   - 瀏覽器原生合成與操作耗時佔整幀 **92.2%**，JS 程式碼自身耗時僅佔 **<8%**。
   - 這證明單純重構 JS 演算法無法觸及 6 ms 門檻；必須將「即時指令呼叫」轉移為「預烘焙圖集批次貼圖」。

---

## 2. 「靜態地形層快取」可行性與分層架構評估

### 2.1 現況痛點：交錯深度排序 (Interleaved Depth Sort)

在現行架構中，`RenderPipeline.drawWorld()` 採單一 `RenderList` 統一深度排序：
$$\text{depthKey} = (q + r) \times 1000 + z_{\text{order}}$$
六角塊、單位（底座、身體、陰影）、地面危害、障礙物、投射物在同一個串列中依幾何深度穿插排序並派發。
- **優點**：完美解決 2.5D 等角投影下的前後遮擋關係（單位站在地塊上，同時被前方更高或更前排的地塊遮擋）。
- **缺點**：無法將所有地形直接合併成單一靜態 Background Canvas，每幀必須個別繪製 ~269 個地塊精靈與 345 次矩陣切換。

### 2.2 三種分層方案架構對照

```
【方案 A：維持現狀（細粒度 Sprite 快取）】
[RenderList] -> [Block(0)] -> [Unit(0)] -> [Block(1)] -> [Obstacle] -> [Block(2)] (單一 Context 交錯)

【方案 B：高度分帶雙層烘焙 (Height-Banded Bi-Layer)】
[Bottom Layer Canvas (z <= 0 地面層)] (整張 Blit)
       ↓
[Dynamic Mid Layer] (單位、高於地面的立柱、危害、粒子交錯)
       ↓
[Top Layer Canvas (z > 2 懸崖遮擋層)] (整張 Blit)

【方案 C：靜態地形全烘焙 + 單位動態遮罩切分 (Full Static Terrain + Occlusion Slices)】
[Static Terrain Canvas] (整張地圖 1 次 Blit，含完整等角立方體與地表)
       ↓
[Dynamic Entity Pass] (僅繪製單位與動態物件，依前景地塊的剪影 Alpha 進行擦除/遮罩)
```

### 2.3 方案詳盡對照表

| 維度 | 方案 A：維持現狀 | 方案 B：高度分帶雙層烘焙 (推薦) | 方案 C：靜態全烘焙 + 遮罩切分 |
| :--- | :--- | :--- | :--- |
| **運作原理** | 每個六角塊各自從 `TerrainBlockCache` 取用 Sprite，於深度排序中逐一 `drawImage`。 | 將高度 $H=0$（基準水平面）的地表塊與底座烘焙至底層 Canvas；僅 $H>0$ 的高台與動態物件進入深度排序。 | 整張地圖（含立體高度）完整烘焙為單張大圖；單位繪製時利用前景深度緩衝進行遮罩裁剪。 |
| **每幀地塊貼圖次數** | 269 次 `drawImage` | **1 次底層 Blit** + ~30 次高台 `drawImage` | **1 次整圖 Blit** |
| **每幀狀態切換節省** | 基準 (0 次節省) | **節省 ~250 次 `save/restore`** | 節省 ~340 次 `save/restore` |
| **失效重繪條件 (Invalidation)** | 無（依地塊個別快取） | 地塊掉落（Shrink）、地圖編輯器筆刷、相機縮放改變（DPR / Zoom）。 | 任何地塊掉落、單位前後遮擋改變、液面動態波動、相機平移縮放。 |
| **MAGMA / 動態液面相容性** | 完美（逐塊繪製動態表面） | 動態液面單獨維持於中層，不烘焙進底層。 | 衝突：動態液面會導致整張底圖必須每幀全量重繪，失去快取意義。 |
| **記憶體開銷** | 極低 (~2MB Sprite 池) | 中等 (約 1~2 張 2048×2048 離屏 Canvas，~16MB) | 偏高 (大尺寸全圖雙緩衝，~32MB) |
| **實作複雜度與風險** | 低 (現行已穩定) | **中度 (可控)**：不破壞 2.5D 深度遮擋，收益顯著。 | 極高：2D Canvas 缺乏硬體 Z-Buffer，軟體遮罩開銷反噬貼圖節省。 |
| **建議結論** | 作為 Baseline 保底 | **建議採行**（第二階段重頭戲） | 不建議採行 |

---

## 3. 圖集 (Atlas) 資料規格草案與素材抽換設計

為符合 `AGENTS.md` §1「單一真相來源 (SSOT)」原則，渲染器**嚴禁硬編碼視覺或色彩**。日後手繪或 AI 生成之 HD FFT/Tactics Ogre 風格素材必須能藉由設定檔透明抽換。

### 3.1 圖集槽位 Key 命名規範 (Atlas Slot Key Contract)

資源 Slot Key 採階層式字串契約：
```
atlas://<domain>/<faction>/<category>/<id>[@state][_frame]
```
範例：
- `atlas://units/imperial/warrior/idle_0` (帝國戰士閒置第一幀)
- `atlas://units/imperial/warrior/attack_se_3` (帝國戰士東南向攻擊第四幀)
- `atlas://units/covenant/mage/cast_loop_1` (盟約法師詠唱循環)
- `atlas://terrain/themes/forest/hex_top_h0` (森林主題高度 0 頂面)
- `atlas://vfx/spells/holy_circle_outer` (神聖法陣外環)

### 3.2 圖集 Manifest 資料型別定義 (`types/AtlasSchema.ts`)

```typescript
export interface AtlasFrameDef {
    /** 圖集圖片內部矩形區域 */
    frame: { x: number; y: number; w: number; h: number };
    /** 旋轉與裁剪資訊 */
    rotated: boolean;
    trimmed: boolean;
    /** 原始未裁剪尺寸 */
    sourceSize: { w: number; h: number };
    /** 等角幾何對齊錨點 (0.0 ~ 1.0, 基準中心通常為 {x: 0.5, y: 0.85}) */
    anchor: { x: number; y: number };
    /** 等角高度位移修正 (ISO World Z-Offset) */
    isoElevationOffset?: number;
}

export interface AtlasManifest {
    meta: {
        version: "1.0";
        image: string;              // 圖集貼圖路徑或 Base64 DataURL
        size: { w: number; h: number }; // 貼圖總尺寸 (如 2048x2048)
        format: "RGBA8888";
        scale: number;              // 基準解析度 (1.0 = HD, 2.0 = Ultra-HD)
    };
    frames: Record<string, AtlasFrameDef>;
}
```

### 3.3 抽換架構：素材槽與外觀設定檔對接 (`data/units/appearance/`)

在現有 `UNIT_APPEARANCE` 基礎上擴充 `spriteBinding`，完全解耦渲染管線與素材來源：

```typescript
// data/units/appearance/types.ts 擴充概念：
export interface UnitVisualBinding {
    renderMode: 'PROCEDURAL_BAKED' | 'SPRITE_ATLAS';
    atlasKeyPrefix?: string; // 例如 "atlas://units/imperial/warrior/"
    fallbackColors: {
        primary: string;
        accent: string;
    };
}
```

- **程序化模式 (現狀)**：若未載入外部圖集，系統在啟動時自動使用 `MaterialPainter` / `NoiseLib` 將現有程式碼烘焙至記憶體內動態 Atlas。
- **HD 素材模式 (未來)**：載入外部 Sprite Sheet 時，管線直接切換至靜態 Atlas，渲染迴圈邏輯維持完全不變（皆呼叫 `AtlasManager.draw(ctx, slotKey, px, py)`）。

---

## 4. 風險評估與分階段演進路線圖 (Roadmap)

### 4.1 分階段實施步驟

```
Phase 1 (本輪完成)  ───► Phase 2 (靜態烘焙擴充) ───► Phase 3 (圖集整合)   ───► Phase 4 (高清素材抽換)
- 矩陣雨分階減載        - 高度分帶底層烘焙          - AtlasManager 統一管理    - 外部 HD 手繪/AI 圖集
- GlowSpriteCache       - HUD 靜態槽位預烘焙        - 粒子合批 (Batch Draw)    - 支援 4 方向/8 方向動畫
- Native 操作基線監控   - 單位肢體圖形離屏烘焙      - 狀態列圖示圖集化         - 完全消除即時向量運算
```

### 4.2 WebGL 例外評估之客觀判準（何時才值得打破 `AGENTS.md` §1.4）

專案合約嚴格禁止引入 Three.js、Pixi.js、WebGL。然而，若系統追求極限 4.2 ms (240 FPS)，是否引入 WebGL 必須有以下**量化與客觀觸發條件**，缺一不可：

1. **條件一：已完成 Phase 1~3 所有 2D Canvas 烘焙優化**。
   - 所有即時向量運算（`fill`, `stroke`, `shadowBlur`）已替換為 `drawImage`。
   - 幀內 Canvas 指令數量已壓制在 300 次以內。
2. **條件二：在目標真機（Hardware Accelerated Browser） headed 實測下，戰鬥幀時間仍穩定大於 6.0 ms**。
3. **條件三：效能瓶頸確定受限於瀏覽器 2D Context 的 CPU-to-GPU Draw Call 負擔（排隊與排版 overhead）**，且 Profile 顯示 GPU 使用率極低但 CPU 主執行緒在等待 Context 提交。
4. **滿足上述所有條件後之合約例外提案**：
   - 僅允許以輕量自研 WebGL 2D Sprite Batcher（≤500 行程式碼，零第三方依賴）取代主 2D Context 進行圖集貼圖 Blit。
   - 嚴禁引入 Three.js / Pixi.js 等重型肥大引擎。

---

## 5. 總結

本藍圖確立了「以離屏烘焙圖集化徹底消除 Native Canvas 呼叫開銷」的技術航向：
- 短期內（Q4b/Q4c）藉由 `GlowSpriteCache` 解決了 90% 以上最昂貴的 `shadowBlur` 負擔。
- 中期（Phase 2）藉由高度分帶雙層烘焙進一步消除地形 250+ 次 `drawImage` 與狀態切換。
- 長期（Phase 3~4）藉由統一圖集契約，讓專案能無縫迎向 HD FFT / Tactics Ogre 畫質與極限流暢體驗。
