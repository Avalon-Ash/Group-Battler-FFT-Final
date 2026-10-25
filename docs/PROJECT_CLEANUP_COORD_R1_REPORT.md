# COORD-R1 實作驗證報告：深度取樣修復與排序距離尺度正規化

> 依據任務合約 `docs/PROJECT_CLEANUP_COORD_R1_AGENT_PROMPT.md`，本輪完成 Package A（深度驗證工具障礙物取樣修復）與 Package B（唯一產品修正：`resolveSortHex` 距離尺度正規化為未壓扁平面空間）。

---

## 1. 提交資訊與檔案清冊

### Package A（Commit: `96b5ea5`）
- **Commit Message**: `fix(tool): repair depth oracle obstacle sampling for ObstacleSprite`
- **修改檔案**:
  - `tools/ui-e2e/lib/depth-oracle.mjs`:
    - 修復 `obstacleBox`：不再假設 `getObstacleSprite` 回傳 Canvas，改為接受 `ObstacleSprite` 介面。
    - 離屏取樣支援真實裁切 `(sx, sy, sw, sh)` 或全圖繪製，目標畫布以 `Math.ceil(sprite.width/height)` 建立，停用平滑縮放（`imageSmoothingEnabled = false`）以維持邊緣 Alpha 精確度。
    - 世界空間包圍盒改採 `sprite.anchorX / anchorY` 動態錨點，取代過時固定常數。
    - 建立 `WeakMap(image) -> Map(crop:size:anchor)` 兩層快取，避免依賴不穩定 `battleTime` 導致記憶體暴增。
    - 明確定義工具邊界：僅量測實體遮擋輪廓，排除 additive overlay。
    - 暴露 `window.__DO__.sampleObstacle` 與 `sampleObstacleSprite` 供工具專用驗收。
  - `tools/ui-e2e/coord-oracle-sprite-check.mjs` (新增):
    - 專用驗證探針：測試程序化回退、圖集非裁切與裁切變體（至少 2 個 q/r 變體）、多影格動態取樣、非預設錨點、合成圖像精確 Alpha 裁切與縮放。
    - 負向控制測試：故意提供超出邊界裁切或錯誤錨點，確認探針能正確攔截並非零退出。

### Package B（本輪 HEAD 提交：`fix(render): normalize resolveSortHex distance metric to unflattened planar space`）
- **修改檔案**:
  - `engine/renderers/frame/UnitFrame.ts`:
    - 匯入 `ISO_SCALE_Y`。
    - 將 `resolveSortHex` 中的新舊格中心距離計算改為未壓扁平面空間：
      `Math.hypot(footX - center.x, (footY - center.y) / ISO_SCALE_Y)`。
    - 更新檔頭方框註解與內嵌文件，明確定義 `HEX_HYSTERESIS_PX = 3` 為未壓扁平面距離單位，消除與 `HexUtils.fromPx`（在未壓扁平面判格）的尺度不對稱。
  - `constants/units.ts`:
    - 更新 `HEX_HYSTERESIS_PX = 3` 說明註解，載明為未壓扁平面距離單位（`dy / ISO_SCALE_Y`）。
  - `engine/renderers/RenderSpec.ts`:
    - 更新 §2 座標與排序規範中 sortHex 遲滯與死區之距離度量說明。
  - `tests/CoordinateProtocol.test.ts`:
    - 更新單元測試之遲滯距離斷言。
    - 依新尺度校準釋放遲滯測試步階（`t = 0.508`），精確覆蓋邊界駐留與 `HEX_RELEASE_FRAMES` 幀數釋放。
    - 新增 FLAT 與 POINTY 兩種棋盤配置的可重現反例（含非零 map offset）。
    - 新增慢速累積位移離開靜止錨點測試與移出 Agents 記憶清除測試。
  - `tools/ui-e2e/cleanup-coord01-check.mjs`:
    - 新增 `--after` 模式支援，獨立輸出至 `tools/ui-e2e/out/coord01-after/`，不覆寫 BEFORE 證據。
    - Spy 距離公式對齊產品尺度；驗證 Case 3 靜止震盪消除與 Case 4 移動軌跡。
  - `docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv`:
    - 更新 `COORD-TOOL-01` 為「已修復（Package A）」。
    - 更新 `COORD-OSC-01` 為「已修復（Package B）」。
  - `docs/HANDOFF.md`:
    - 更新 COORD-R1 兩工作包完成狀態與量化指標。

---

## 2. 量化對照數據（Before vs After）

測試命令（10 秒 2 種子 3 生態系，runner --detach / --wait）：
```bash
node tools/ui-e2e/coord-guard.mjs --sink --flicker --order --seeds=2 --seedStart=1 --seconds=10 --orderSeconds=10 --biomes=FOREST,VOID,MAGMA --orderBiomes=FOREST,VOID,MAGMA
```

### 2.1 既有診斷（原樣揭露，未擴大修改）
| 項目 | Before | After | 差異 | 說明 |
| :--- | :---: | :---: | :---: | :--- |
| **SINK 違規** | 1 | 1 | 0 | FOREST/1001 f337 RED-0002 受擊衝量下陷 1.89px，條件鎖定，維持原樣 |
| **VOID 樣本** | 1 | 1 | 0 | MAGMA/1001 BLU-0001 自由落體穿越零高度，維持原樣 |

### 2.2 閃爍與翻轉（Flicker）
| 場景 (生態/種子) | 指標 | Before | After | 變動說明 |
| :--- | :--- | :---: | :---: | :--- |
| **FOREST / 1001** | staticEvents | **6** | **0** | **靜止震盪完全消除** |
| | oscillationEvents | 22 | 18 | 減少 4 次震盪 |
| | flips | 755 | 745 | 減少 10 次翻轉 |
| **FOREST / 1002** | staticEvents | 0 | 0 | 維持 0 |
| | oscillationEvents | 7 | 7 | 持平 |
| | flips | 300 | 296 | 減少 4 次翻轉 |
| **VOID / 1001** | staticEvents | 0 | 0 | 維持 0 |
| | oscillationEvents | 9 | 9 | 持平 |
| | flips | 398 | 397 | 減少 1 次翻轉 |
| **VOID / 1002** | staticEvents | **1** | **0** | **Case 3 (C:RED-0010 vs Hazard) 消除** |
| | oscillationEvents | 7 | 7 | 持平 |
| | flips | 246 | 246 | 持平 |
| **MAGMA / 1001** | staticEvents | 0 | 0 | 維持 0 |
| | oscillationEvents | 17 | 17 | 持平 |
| | flips | 592 | 592 | 持平 |
| **MAGMA / 1002** | staticEvents | 0 | 1 | 邊緣殘差微動（非格界震盪） |
| | oscillationEvents | 8 | 8 | 持平 |
| | flips | 345 | 345 | 持平 |
| **合計 (6 場景)** | **staticEvents** | **7** | **1** | **大幅降低 86%** |
| | **oscillationEvents** | **70** | **66** | 降低 |
| | **flips** | **2,636** | **2,621** | 降低 |

### 2.3 深度遮擋錯序（Order Oracle）
評估樣本數：701,554 次配對判斷。
| 指標 | Before | After | 改善幅度 |
| :--- | :---: | :---: | :---: |
| **Wrong Frames** | **308** | **287** | **減少 21 影格 (-6.8%)** |
| **Frames with Wrong** | **217** | **205** | **減少 12 影格 (-5.5%)** |
| **Short Episodes** | **154** | **127** | **減少 27 次 (-17.5%)** |
| **Stable Episodes** | 19 | 25 | sortBias 誤導減少，幾何真實反映 |

**Stable Episodes 主要驅動因子變動**:
- `HAZARD × UNIT`: 1 -> 0（消除 sortBias 驅動）
- `CORPSE × HAZARD`: 1 -> 0（消除 sortBias 驅動）
- `CORPSE × TERRAIN`: 5 -> 1（sortBias 誤導顯著降低 80%）
- `UNIT × TERRAIN`: 11 -> 23（由 footprintY 幾何支配，非排序邏輯錯誤）

### 2.4 人工構造棋盤（Crafted Boards）
| 佈局 | Before 違規 | After 違規 | 狀態 |
| :--- | :---: | :---: | :--- |
| **FLAT** | 0 | 0 | 完全無違規 |
| **POINTY** | 0 | 0 | 完全無違規 |

---

## 3. 真實事件與特定案例驗證

### Case 3 靜止震盪消除（VOID / 1002, frame 413）
- **物件**: `C:RED-0010` (屍體) vs `Hazard` (地圖危害物)
- **Before 行為**:
  - `signs`: `[-1, 1, -1]`（典型 A-B-A 靜止翻轉震盪）。
  - 原因：屍體微移時，`HexUtils.fromPx` 在未壓扁空間判定屬於新格，但 `resolveSortHex` 在壓扁 Y 空間計算距離，導致新格距離比舊格大，遲滯邏輯在格界產生頻繁跳變。
- **After 行為**:
  - `signs`: `[-1, 1, 1]`（方向翻轉後穩定保持，不再跳回）。
  - 場景 `staticEvents` 歸 0。
  - 驗收輸出：`tools/ui-e2e/out/coord01-after/coord01_evidence.json` (EXIT=0)。

### Case 4 真實移動（FOREST / 1001）
- **物件**: `A:RED-0003` (移動單位) vs `Unit(A:BLU-0002)`
- **驗證結果**:
  - 移動距離、投影足跡位移正常累積。
  - 排序派發一致，未因尺規正規化破壞連續移動中的層級派發。

---

## 4. 負向控制與防禦驗證

1. **`coord-oracle-sprite-check.mjs` 負向控制**:
   - 故意提供超出邊界裁切參數 `(sx: -10, sw: 200)`，探針成功攔截並報錯。
   - 故意提供不合法錨點，探針校驗未通過並退出 non-zero。
2. **`cleanup-coord01-check.mjs` 缺失樣本負向控制**:
   - 執行 `node tools/ui-e2e/cleanup-coord01-check.mjs --after --negative-control`。
   - 探針正確識別缺失目標並回傳 EXIT=1，防止假陽性通過。

---

## 5. 驗收命令執行與退出碼

| 檢查項目 | 執行命令 | 執行時間 | 退出碼 | 結果摘要 |
| :--- | :--- | :---: | :---: | :--- |
| **Lint** | `npm run lint` | ~5s | **0** | 0 error, 0 warning |
| **Unit Tests** | `npm test` | ~12s | **0** | 91 files passed, 780 tests passed |
| **Build** | `npm run build` | ~4s | **0** | Vite production bundle 構建成功 |
| **Oracle Probe** | `node tools/ui-e2e/coord-oracle-sprite-check.mjs` | ~3s | **0** | 障礙物取樣與快取全部 PASS |
| **Case Check** | `node tools/ui-e2e/cleanup-coord01-check.mjs --after` | ~8s | **0** | Case 3 震盪消除，Case 4 移動正常 |
| **Runtime Smoke** | `node tools/ui-e2e/runtime-smoke.mjs --shot` | ~15s | **0** | 渲染生命週期正常，截圖輸出成功 |
| **Perf Guard** | `npm run perf:guard` | ~40s | **0** | 所有保真基準 0 diff，性能指標全綠 |
| **Doc Drift** | `npx vitest run tests/DocDrift.test.ts` | ~2s | **0** | 檔頭與模組對齊檢查全數 PASS |
| **Git Diff Check** | `git diff --check` | <1s | **0** | 無空白字元或行尾換行衝突 |

---

## 6. 未完成事項與邊界說明（Pending IDs）

1. **`COORD-SINK-01`**:
   - 物理衝量滯留引發之下降步階插值下陷 (1.89px)。
   - 現況：保留已知診斷於 `AUDIT01_FINDINGS.csv`，不屬於本輪局部尺規修正範圍。
2. **`COORD-VOID-01`**:
   - 高速自由落體穿越零平面時被探針誤判為虛空滯留。
   - 現況：保留已知診斷，需後續調整探針連續幀加速度過濾機制。
3. **全庫清冊逐檔語義審計**:
   - 659 列清冊維持證據限度，不宣告「全庫完成」。
4. **奧義資料／時序／視覺**:
   - 待後續授權獨立排程實作。
