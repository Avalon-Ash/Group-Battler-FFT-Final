# 0003 座標協議單一規格與渲染工作串行

狀態：採用
日期：2026-10-17

## 背景

2026-10 期間各繪製器各自重算地面高度與偏移，曾導致漂浮地圖只有地塊浮動、單位附著粒子高度錯位與深度排序閃爍；同時平行開啟多條渲染與座標分支拆工亦造成錯位回歸。

## 決定

- 圖層順序、sortBias、座標系、漂浮位移與 SSOT 錨點函式（`VisualMath.getUnitGroundHeight`、`getCoreAnchor`、`getUnitAnchor`）一律以 `engine/renderers/RenderSpec.ts` 為單一契約。
- 所有單位每幀繪製座標由 `engine/renderers/frame/UnitFrame.ts` 統一建構並計算排序鍵，繪製器只讀快照不自行重算。
- 修改任何高度、錨點、偏移、sortBias 或圖層規則，必須在同一個 commit 同步更新 `RenderSpec.ts` 與受影響檔案的方框檔頭。
- 所有渲染與座標修正工作一次只開一條分支，不平行拆工。

## 放棄的做法

- 各繪製器自行查詢邏輯格高度或各自加總高度與漂浮偏移。
- 平行開啟多條渲染或座標分支後再合併。

## 後果

- `tests/CoordinateProtocol.test.ts` 以只減不增的基準檢查靜態重算違規與協議一致性，並由 `tools/hooks/agent-guardrails.mjs` 要求渲染任務提示詞引用 `RenderSpec.ts`。
- 渲染線工項必須排隊串行推進，無法同時多線並行開發。

## 證據

- `docs/DECISIONS.md` §4
- `AGENTS.md` §4
- `engine/renderers/RenderSpec.ts`、`engine/math/VisualMath.ts`、`engine/renderers/frame/UnitFrame.ts`
- `tests/CoordinateProtocol.test.ts`、`tools/hooks/agent-guardrails.mjs`
- `docs/WORKLOG.md` §2 H、§2 I（commit `52bea09`）
