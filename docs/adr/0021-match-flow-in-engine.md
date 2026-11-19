# 0021 對局流程置於引擎端且階段由狀態推導

狀態：採用
日期：2026-11-18

## 背景

展示模式的一局接一局流程（結算停留、退場、換圖、進場、等圖集、生成）過去以巢狀 `setTimeout` 寫在 `hooks/useGameApp.ts`（439 行），且 React 內留存 `session.isPlaying` 鏡像狀態與 `unitCount` 輪詢，違反 UI 純投影原則，無畫面測試不到且回放與玩家操控接不上。

## 決定

- 對局流程移入引擎端 `engine/systems/match/MatchFlowSystem.ts`（搭配純函式 `engine/systems/match/Deployment.ts`），由遊戲迴圈每幀以真實時間推進，對引擎狀態的修改僅透過發出 `UI_COMMAND`。
- 對局階段（`RESULT_HOLD`／`PLAYING`／`LOBBY`）於每次讀取時從引擎狀態即時推導；流程系統只保存計時型過渡階段，且不監聽 `engine.bus`。
- 等圖集就緒改由組裝層注入回呼 `isRosterReady`（避免流程系統匯入表現層）；UI 改經 `engine/systems/ui/views/session.ts` 的 `selectSessionView`／`selectBoardView` 讀取狀態，移除 React 鏡像欄位。

## 放棄的做法

- 維持 `hooks/useGameApp.ts` 的巢狀 `setTimeout` 鏈與 React 鏡像狀態。
- 讓 `MatchFlowSystem` 訂閱 `engine.bus` 追蹤勝負與重開（回放快轉期間匯流排靜音會導致漏接事件）。

## 後果

- 狀態只有單一來源，回放、跳轉與手動重開無須額外通知流程系統；無畫面單元測試可連跑多局驗證（`tests/MatchFlow.test.ts`、`tests/contracts/R.contract.test.ts`），且維持 `tests/LayerBoundary.test.ts` 與 `tests/SimBusListeners.test.ts` 通過。
- 組裝層須負責每幀呼叫流程 `update` 並提供圖集就緒回呼；轉場階段改由 renderer 直接從引擎讀取。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §1 第 5 點
- `docs/plans/optimization-2026-11.md` §1 第 4 點、§4 R2
- `engine/systems/match/MatchFlowSystem.ts`、`engine/systems/match/Deployment.ts`、`engine/systems/ui/views/session.ts`、`hooks/useGameApp.ts`
- `tests/contracts/R.contract.test.ts`、`tests/MatchFlow.test.ts`、`tests/LayerBoundary.test.ts`、`tests/SimBusListeners.test.ts`
- `docs/WORKLOG.md` §2 CA
