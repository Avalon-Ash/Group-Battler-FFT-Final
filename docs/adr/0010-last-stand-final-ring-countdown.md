# 0010 背水一戰改於最後一圈倒數開始時觸發

狀態：採用
日期：2026-11-03
取代：0009

## 背景

依 `0009` 提早停止縮圖並把全員拉到中心後，使用者於 2026-11-03 實機認為缺少搶格互動；期間先改為「地塊剩 1 格才開始」測試，但 1 格只能站 1 人，其餘單位隨最後一圈塌陷掉落，背水一戰平均與最長皆只有 0.5 秒。

## 決定

- 背水一戰改於最後一圈開始倒數時觸發（`engine/systems/ZoneSystem.ts` `checkLastStand` 判定警告格數＝地塊數 − 1；傷害三倍、禁治療與橫幅自倒數開始即生效），倒數結束後照常塌陷，地圖維持縮到剩 1 格。
- 倒數期間 AI 沿用既有逃生與搶位邏輯、每格仍只站一人（沒有空安全格時走既有的 `TRAPPED` 模式，不新增 AI 模式），靠擊殺或推開對方搶位。
- 最後一格落定（`isFinalTileOnly`）後，AI 與 `engine/systems/movement/StackingResolver.ts` 才進入 `FINALE` 並允許同格重疊。

## 放棄的做法

- 沿用 `0009`（`docs/adr/0009-last-stand-early-trigger.md`）在地塊數 ≤ 存活人數或 ≤ 7 格時提前停止縮圖並拉至中心。
- 僅在最後一格落定時觸發背水一戰（實測只有 0.5 秒）。
- 為最後倒數階段另外新增專用的 AI 模式。

## 後果

- 最後 10 秒倒數形成實際的背水一戰階段（200 場量測：大逃殺平均 3.7 秒、p90 8.2 秒；全坦克平均 5.1 秒、最長 10.5 秒）。
- 預期代價是墜落死亡佔比與平均場次時長高於提早收圖方案。

## 證據

- `docs/DECISIONS.md`「AI 與大逃殺」
- `engine/systems/ZoneSystem.ts`、`engine/systems/movement/StackingResolver.ts`
- `tests/ZoneShrink.test.ts`
- `docs/WORKLOG.md` §2 BG
- `docs/adr/0009-last-stand-early-trigger.md`
