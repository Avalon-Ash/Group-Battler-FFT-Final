# 程序化材質升級（Canvas 2D 版）

把 `achrefelouafi/LinearAbiltyCastingThreeJS`（MIT）的 GLSL 特效生成手法，
拆解後翻譯成本專案的 Canvas 2D 管線。**不引入 Three.js、不改 renderer、不疊 WebGL 層。**

## 新增檔案

| 檔案 | 作用 |
|---|---|
| `data/vfx/materialConfig.ts` | 材質 SSOT。所有噪聲/緞帶/光管/分級參數集中一處，painter 每次繪製即時讀取，因此暫停狀態下改參數下一帧生效。 |
| `engine/graphics/materials/NoiseLib.ts` | value noise + fbm（確定性 seed），烘焙成離屏 alpha 遮罩並 cache。等價 GLSL 的 SDF + noise 裁切。 |
| `engine/graphics/materials/MaterialPainter.ts` | 六種手法的 Canvas 2D 實作：冰殼、灼痕、Ribbon 閃電、三層同心光管、殘影拖尾、色調分級。 |
| `tools/material-preview.html` / `tools/materialPreview.ts` | 新舊材質並排驗證頁（`npx vite` 後開 `/tools/material-preview.html`）。 |
| `vite.preview.config.mjs` | 把驗證頁單獨 build 成靜態站的設定，方便丟給非工程同事看。 |

## 手法對照

| 原始 GLSL 手法 | 本專案實作 |
|---|---|
| SDF + 噪聲裁切（冰痕、灼痕） | `NoiseLib.getNoiseMask` 烘焙 fbm 遮罩 → `destination-in` 裁切（僅在離屏 canvas 執行） |
| Ribbon strip 參數化路徑 | `MaterialPainter.drawRibbon`：中點位移遞迴 + `lighter` 多層輝光 + 機率分岔 |
| 三層同心圓管光柱 | `MaterialPainter.drawLayeredBeam`：三層 linearGradient 疊加 + `setLineDash` 滾動螺旋緞帶 |
| Icosphere 裂面 | 沿用既有 `HEX_SHARD` 碎片 + 噪聲遮罩邊緣 |
| 後處理色調分級 | `PostProcessor.applyToneGrade`（接在世界層後、HUD 前，UI 不受影響） |
| 速度扭曲層 | `MaterialPainter.drawMotionTrail`：遞減 alpha 殘影近似動態模糊 |

## 接入點

- `GroundPainter.drawIceField` / `drawFireField` → 改用烘焙貼圖（保留 legacy 分支）
- `ProceduralPainter.drawBeam` → 三層光管；`visualStyle === 'LIGHTNING'` 走 Ribbon
- `VFXFactory` 的 `CRACKS` / `SMOKE` → 套噪聲遮罩打散邊緣
- `RenderPipeline` → 世界層後插入色調分級 pass

## A/B 與回退

`MATERIAL_CONFIG.enabled = false` 即全數回退舊繪法，所有改動點都保留 legacy 路徑，
方便企劃直接在 console 切換比對手感。

## 效能注意

- 遮罩與貼圖皆 cache（key 含參數），改參數後需呼叫 `resetNoiseCache()` / `resetMaterialCache()` 重算。
- 噪聲為 seed 驅動的確定性結果，不會每帧重算、不會閃爍。
- 色調分級是每帧一次全畫面 copy，若在低階裝置掉帧，關掉 `grade.enabled` 即可。

## Pass 2 — 全場材質覆蓋（地形 / 障礙物）

第一批只處理「技能特效」，第二批把同一套程序化材質手法套到面積最大的兩個靜態表面。

| 表面 | 手法 | 檔案 |
|---|---|---|
| 地形頂面 | 烘焙 N 張 hex 形狀灰階 fbm 顆粒貼圖，每帧一次 `clip` + `drawImage`（`overlay` 混合）。`variantFor(q,r)` 以格座標 hash 選張，確定性且相鄰格不重複 | `NoiseLib.getGrainTile` / `MaterialPainter.paintTerrainGrain` / `TerrainRenderer.drawBlock` |
| 地形頂面邊緣 | 同張貼圖內建 edge AO（外圈線性壓暗），讓每格讀起來是獨立立體方塊 | `SurfaceGrainConfig.edgeAO` / `edgeBand` |
| 地形側面 | 同張顆粒貼圖縱向拉伸 1.6×，顆粒呈垂直流向近似岩層堆疊 | `MaterialPainter.paintSideGrain` |
| 障礙物 sprite | 烘焙期一次性風化：顆粒先用 `destination-in` 裁成 sprite 的 alpha 形狀，再以 `overlay` 疊回 | `MaterialPainter.weatherSprite` / `EnvironmentFactory` |

### 為什麼不用 source-atop

第一版 `weatherSprite` 用 `source-atop` 直接疊中灰顆粒，結果把中灰「混」進暗部——黑曜石柱變成灰柱、樹葉褪色。`overlay` 才是保留色相、只調明暗的正確混合模式，但它不吃 destination alpha，所以必須先在離屏把顆粒裁成 sprite 形狀，再疊回去。兩段式是必要的，不是多餘步驟。

### 成本

- 地形顆粒：烘焙 `variants` 張 128×128 貼圖（預設 4 張，約 256 KB），執行期每格每帧一次 blit。
- 側面顆粒：每格 2~3 面各一次 blit，可用 `terrain.sideGrain = 0` 單獨關掉。
- 障礙物風化：純烘焙期成本，sprite 由 SpriteManager cache，執行期為零。

### 可調參數

`MATERIAL_CONFIG.terrain.grain.strength` 控制顆粒強度，`contrast` 控制亮暗擺幅，`tintSpread` 控制格間色差，`environment.grain.strength` 控制障礙物風化深度。改完呼叫 `resetNoiseCache()` + `resetMaterialCache()`，或直接靠 Vite HMR 重載。
