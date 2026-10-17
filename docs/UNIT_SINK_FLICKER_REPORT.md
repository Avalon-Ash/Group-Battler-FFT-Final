# 單位「沉入地面」與「整片網格狂閃」根因報告（2026-10-17）

分支 `claude/unit-sink-flicker-426840`。量測工具：`tools/ui-e2e/sink-flicker-probe.mjs`（逐幀逐單位量測）、`tools/ui-e2e/sink-demo.mjs`（構造情境前後截圖）。證據在 `tools/ui-e2e/out/sink-flicker/`（不進版控）。

## 量測方式
ICE／VOID／MAGMA 各 2 場大逃殺（縮圈間隔 3 秒，共 4568 幀、42691 單位幀），固定品質階層 0。每幀攔截 `RenderList.sort` 後的順序，記錄：單位邏輯格與視覺格高度、`physics.z`、腳點被哪些「排在單位之後」的地塊蓋住、排序鍵是否 NaN／逆序、地形快取統計、品質階層、鏡頭震動、整畫面 A-B-A 像素閃爍。

## 根因

### 1. 整片網格狂閃：死亡塵煙的 `PUFF_DRAG = 1.5` 讓排序鍵變 NaN
- `VFXPhysics` 以 `pow(1 - drag, dt*60)` 衰減，`drag` 的契約是 [0,1)（資料裡其他值都是 0.02～0.08）。`DEATH_VFX.PUFF_DRAG = 1.5` 使底數為負、指數非整數 → NaN → 粒子座標 NaN → `RenderOp.sortKey` NaN。
- NaN 讓 `Array.sort` 的比較器不一致，整張 RenderList（地塊、單位）順序被打亂。每次死亡持續約 1.4 秒（塵煙壽命）。
- 證據（修前）：1636／4568 幀含 NaN 排序鍵，其中 1572 幀出現逆序；ICE 一場 333／906 幀逆序，地塊本身順序錯亂 74 幀（VOID 24／598）。修後 0。以 `--legacy-drag` 在修好的程式上重現同樣數字，因果成立。
- 修法：`PUFF_DRAG` 改 0.025（≈ 每秒 e^-1.5），`types/VFXSchema.ts` 註明範圍，新增 `tests/VFXDragRange.test.ts` 掃整個登記表（棘輪）。
- 未改（設計）：鏡頭震動（`CameraSystem.applyTransform` 每幀隨機方向，上限 ±30×zoom×trauma²）。修後剩餘的 A-B-A 像素閃爍有 141／166 幀發生在震動期間。若使用者仍覺得「狂閃」，下一步是把震動改成平滑雜訊，屬設計調整，未證實為錯誤。

### 2. 單位沉入柱子（走路）：腳下高度跟著邏輯格，視覺卻先跨格
- `MotionEngine` 在 `moveProgress ≥ 1`（抵達）才換 `q/r`，但畫面位置在 0.5 就越過格界。上坡時 t∈(0.5,1) 單位已在較高格上方，腳卻畫在低格高度（陷入柱子）；抵達那一幀 `map.updateAgentPosition` 再補 `physics.z += 高差`，造成單幀 −24 的凹陷（`SAME_HEX_Z_NEG`）或下坡的彈跳。
- 同時存在兩套高度定義：身體用邏輯格、`HUDRenderer` 用線性插值。
- 證據（修前）：腳低於所在格頂面的幀 964 筆（走路上坡 920、z 負值 38、墜落 6）；MAGMA 單場 503 筆，最深 96。
- 修法（單一出處）：`VisualMath.getUnitGroundHeight`——上坡在越界前（0.25～0.5）升到目標高度，下坡在越界後（0.5～0.75）才降，參數在 `constants.ts` 的 `UNIT_STEP_BLEND`。身體（`UnitVisualProcessor`）、血條（`HUDRenderer`）、狀態圖示（`StatusOrchestrator`）、投射物錨點（`VisualMath.getUnitAnchor`）、遮擋判斷與 `map.updateAgentPosition` 的 z 補償都改用它；走路抵達時差值為 0，瞬移／衝刺／擊退仍由 `physics.z` 吸收高差。
- 修後：9 筆，其中 6 筆是縮圈墜落中的單位（本來就在掉）、3 筆是受擊位移短暫跨進較高鄰格（`physics.x/y` 彈簧，未處理）。

### 3. 單位下半身被前方地塊蓋住：深度鍵沒包含「腳下所在格」
- 地塊以格心 Y 排序；單位走過格界後腳 Y 仍小於前方鄰格的格心 Y，單位排在該格地塊之前，被「之後才畫」的地塊蓋住下半身（連底座都被切）。
- 修法：`UnitSystem` 把單位排序鍵抬到腳下所在格的格心線（`sortBias`，只抬不降，含擊飛等繪製位移）。
- 證據：「腳點所在格的地塊排在單位之後」的幀，修後 0；構造情境截圖 `demo_before_*`／`demo_after_*`（上坡與正面走入前方格，修前單位被吃掉或底座被切，修後完整）。

### 4. 輪廓補畫漏判：以 `q+r` 當「在前方」
- `GridSpatial.getOccludedAgents` 用 `(n.q+n.r) > (q+r)` 判斷鄰格在前方，等距投影下方向 (−1,+1) 的鄰格 `q+r` 相同卻在畫面正前方，高柱擋住單位卻不畫輪廓。改用螢幕 Y（`HexUtils.toPx`），門檻搬到 `UNIT_OCCLUSION.MIN_STEP`。
- 被擋住且沒補輪廓的單位幀：1231 → 137。剩下多是 3 格外的高柱（輪廓只看相鄰格，未擴大）。

## 沒證實為原因的懷疑
- 縮圈塌陷造成高度突變：`engine.getTerrainHeight` 已回傳下墜中的動態高度，0 筆。
- 地形快取抖動：0 次擠出／清除／回退；品質階層：固定階層下 0 次切換（合成 60 Hz 時間下 governor 因 `DOWN_MS=14` 會一路降階，那是量測環境的 60 Hz 假象，未處理）。
- 縮圈警告閃爍（`sin(t*12)`）為設計，面積大但頻率固定。

## 驗證
| 項目 | 結果 |
| :-- | :-- |
| 探針（修後） | NaN 排序鍵 0、逆序 0、地塊逆序 0；沉入 964 → 9；無輪廓遮擋 1231 → 137 |
| `npm run lint` / `npx vitest run --dir tests` / `npm run build` | 通過（424 個測試，含新增 `UnitGroundHeight`、`VFXDragRange`） |
| `perf:guard` | 5 個地形保真與效能守門通過；`battle_frozen` 修後失敗（走路不再有 z 彈跳，凍結戰鬥分歧、導播鏡頭框法不同），人工看圖無劣化，**另開 commit 重錄**，地形基準未動 |
| `br-soak --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle` | 20/20 乾淨 |

## 改動範圍
超過 3 檔（高度單一出處有多個使用者）：`constants.ts`、`VisualMath.ts`、`UnitVisualProcessor.ts`、`HUDRenderer.ts`、`StatusOrchestrator.ts`、`map.ts`（只改內部 z 補償，公開簽章不變）、`GridSpatial.ts`、`UnitSystem.ts`，另有兩個測試與兩支工具。未碰 `game.ts`／`renderer.ts`、`TerrainRenderer`、`PartPainter`／`VFXPlayer`。

## 已知未處理
- 受擊位移（`physics.x/y`）把單位推進較高鄰格時，腳仍畫在邏輯格高度（量測 3 幀）。
- `PhysicsSystem`／`AgentVFXSystem`／`UnitFlightPainter` 的軌跡與生成特效仍用邏輯格高度，走路途中與身體差最多一階。
- 輪廓補畫只看相鄰格。

---

# 追加：縮圈塌陷後單位下沉（分支 `fix/unit-sink-collapse`）

回報：A1 > A2 > A3 三格，A1 塌陷後，站在 A2 的單位與 A3 的單位互毆時會沉到 A2 地面以下（「單位高度不是即時的」）。

## 量測（探針新增 `--force-collapse=idle|path|fight`、`PATH_TO_REMOVED`、`STALE_MOVE`）
- 強制情境：在單位周圍造出 A1 > A2 > A3，30 幀後比照 `ZoneSystem` 移除 A1，`fight` 模式再把敵人放到 A3 讓兩邊開打。
- **假設成立（路徑指向已消失的格子）**：`fight` 模式下單位邊走邊施法（actionState = CASTING），`path[0]` 是已塌陷的 A1，`isMoving` 仍為 true、`moveProgress` 持續前進（0.61 → 0.72 …）。`MotionEngine` 不檢查下一格是否還存在；AI 只有在 `moveAgentToHex` 被呼叫時才會驗證路徑，施法中不會重算。這段期間 `getUnitGroundHeight` 往正在墜落的 A1 高度混合，腳下高度被拉走。自然對戰 18 場沒有出現這個狀態（AI 通常來得及重算），所以它是少見但可重現的路徑。
- **另一個更常見的原因（打鬥時）**：單位被命中後的 `physics.x/y` 位移，或瞬移／擊退後 `px/py` 還在漂向新格，精靈實際在較高的鄰格上方，腳下高度卻只看邏輯格 → 陷進較高的柱子。`fight` 模式修前 6 場縮圈後有受擊單位連續 5 幀以上下沉 24（ICE 一場 5 幀），自然對戰 15 場修前共 20 幀（含 MAGMA 一場連續 10 幀）。

## 根因與修法
1. `MotionEngine`（`path`／`isMoving`／`moveProgress` 的推進者）在下一格已不存在時取消移動（每個 tick 檢查，換格後也檢查）。不在高度混合裡遮掩：路徑不再指向消失的格子，混合函式也不需要知道格子有效性。
2. `VisualMath.getUnitGroundHeight` 新增可選的 `mapConfig`：腳下高度不得低於精靈實際所在格（`px + physics.x`）的頂面（只取較高者，不會憑空掉到較低鄰格）。身體、血條、狀態圖示、投射物錨點、輪廓遮擋判斷、`map.updateAgentPosition` 的補償都傳入。`StatusOrchestrator.draw` 多一個可選參數（`RenderPipeline` 傳入）。

## 驗證
| 項目 | 結果 |
| :-- | :-- |
| 探針，自然對戰 15 場（ICE／VOID／MAGMA × 5） | 沉入幀 20 → 1（剩下 1 筆：無敵單位所在格塌陷後高度突降，單幀，未處理） |
| 探針 `--force-collapse=fight`（修後） | 縮圈後的受擊／路徑類沉入消失；殘留 1 幀 `PATH_TO_REMOVED` 是探針在 tick 之外強制塌陷造成的取樣假象，下個 tick 即被取消 |
| 新增測試 | `UnitGroundHeight.test.ts`：被推進較高鄰格時不低於其頂面、不掉到較低鄰格；`MotionEngine` 下一格消失即取消移動（含換格後） |
| `npm run lint` / `npx vitest run --dir tests`（452）/ `npm run build` | 通過 |
| `perf:guard` | 通過，保真基準無需重錄（`battle_frozen` meanAbsDiff 0.113） |
| `br-soak --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle` | 20/20 乾淨 |

## 已知未處理
- 瞬移／擊退到較低格後，精靈漂進該格的瞬間腳下高度會一次降到新格高度（原本是 `physics.z` 快速落下）。
- 無敵單位所在格塌陷（`hp` 未歸零）時高度單幀突降。
