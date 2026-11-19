# 0020 畫面插值僅在 UnitFrameStore.build 執行

狀態：採用
日期：2026-11-17

## 背景

L3 固定步長為 60 Hz 後，主螢幕（120／239 Hz）或手機掉幀至 40 FPS 時，每幀會推進 0、1 或 2 個 tick；實測約 165 Hz 下移動單位位移為 0 的幀佔 61～65%、40 FPS 下位移變異係數達 0.26～0.42（超過結案門檻 5% 與 0.15）。

## 決定

- 先量測確認有抖動後才實作，且插值邏輯僅置於 `engine/renderers/frame/UnitFrame.ts` 的 `UnitFrameStore.build`。
- `hooks/useGameLoop.ts` 傳入 `alpha = 累加餘量 / 步長`（沒給或暫停時預設 1，等同畫最新模擬狀態）；`UnitFrameStore` 在計算深度排序鍵、腳下格與殘影之前，依公式 `(gap − 1 + alpha) / gap` 對單位腳點與腳下高度插值。
- 剛生成、tick 倒退、拖曳預覽或單 tick 位移超過一格的瞬移不插值；網址參數 `?interp=0` 保留作 A/B 診斷開關；`engine/renderers/RenderSpec.ts` 與 `UnitFrame.ts` 檔頭同步更新。

## 放棄的做法

- 在各個 painter 或 renderer 內部分散實作位置插值。
- 未先量測即進行插值實作。
- 跨越多個 tick 時直接使用字面 `alpha`（40 FPS 實測變異係數 0.40～0.60 反高於不插值，R1 契約已據此修正）。

## 後果

- 各繪製端與血條讀取 `UnitFrame` 即同步且不破壞深度排序鍵；實測位移為 0 的幀降至 0～0.8%、40 FPS 變異係數降至 0.001～0.006；`alpha` 預設 1 使保真基準與工具維持 0 差異。
- 畫面顯示最多落後模擬 1 個 tick（16.7 ms）；目前 `physics.z`、投射物與附著粒子未插值。

## 證據

- `docs/DECISIONS.md`「UI」
- `docs/plans/optimization-2026-11.md` §1 第 3 點、§4 R1
- `engine/renderers/frame/UnitFrame.ts`、`engine/renderers/RenderSpec.ts`、`hooks/useGameLoop.ts`
- `tests/contracts/R.contract.test.ts`、`tests/CoordinateProtocol.test.ts`
- `docs/WORKLOG.md` §2 BY（commit `0efe8f57`）
