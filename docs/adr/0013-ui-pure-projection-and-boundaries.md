# 0013 UI 純投影、單一資料流與依賴邊界

狀態：採用
日期：2026-11-04

## 背景

規劃後續加入玩家單位操控與行為編輯器時，舊版 UI 存在業務條件寫在元件內、React 層保留引擎鏡像狀態（如 `session.timeScale`、`unitCount` 輪詢）等問題，導致無法與指令佇列、回放及引擎對局流程對齊。

## 決定

- UI 為純投影層：元件只透過 `hooks/useEnginePort.tsx`（`useView`、`useViewOf`、`useCommands`）讀取 `engine/systems/ui/views/` selector 產出的 view model，並只透過 `UICommand`（`engine/systems/ui/UICommandSystem.ts`）寫入引擎。
- 顯示條件（如陣亡、隊伍色、狀態分類）放在 selector 或資料表（視窗與面板定義放 `data/ui/windows.ts` 等表），元件只繪製結果。
- 視窗版面與選取單位（`hooks/useSelection.ts`）留在 UI 層 store（引擎不知道它們）；時間倍率唯一來源為引擎 `targetTimeScale`。
- 依賴邊界：僅 `components/GameCanvas.tsx` 可碰 renderer；技能圖示與特效縮圖經 `hooks/adapters`；`data/ui` 不得 import `components`。

## 放棄的做法

- 把 UI 做成引擎實體，或把模擬引擎改寫為標準 ECS。
- 在 React 元件內保存業務判斷或引擎狀態的鏡像。

## 後果

- `tests/UIBoundary.test.ts` 與 `tests/UIAudit.test.ts` 把關邊界與樣式規則（UI 改版合併時 43 檔 0 違規），並使後續 R2 對局流程移出 React 與 G3 玩家操控能直接共用指令與 selector 通道。
- 新增顯示條件或資料時，必須先在 selector 或 `data/ui` 資料表定義再於元件取用。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §3a
- `hooks/useEnginePort.tsx`、`hooks/useSelection.ts`、`components/GameCanvas.tsx`
- `data/ui/windows.ts`、`engine/systems/ui/UICommandSystem.ts`
- `tests/UIBoundary.test.ts`、`tests/UIAudit.test.ts`
- `docs/WORKLOG.md` §2 BP
