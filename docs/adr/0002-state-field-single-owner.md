# 0002 狀態欄位唯一寫入者

狀態：採用
日期：2026-10-16

## 背景

`engine/core/Agent.ts` 持有 89 個狀態欄位，2026-10 盤點顯示多個欄位被多個系統同時直接改寫：
`deathTimer` 曾因兩個寫入者互相抵銷而使死亡動畫未播放；`visualStatus` 跨 4 個模組互相覆寫，使冰凍、變形與無敵視覺從未顯示；`CCManager` 亦曾直接改寫 AI 目標欄位。

## 決定

- `Agent` 維持扁平純資料容器，不新增方法。
- 在 `engine/core/AgentOwnership.ts` 以 `Record<AgentField, Ownership>` 定義每個欄位的寫入所有權（`single`、`domain`、`accumulator`、`flag` 四類與 `lifecycle` 例外）。
- 跨域修改必須透過擁有者匯出的寫入 API 或在擁有者更新階段推導；嘲諷鎖定只由 `engine/ai/TargetingSystem.ts` 執行（P7a）。
- 由 `tests/AgentOwnership.test.ts` 與只減不增的 `tests/agent-ownership.baseline.json`（已收斂為 `[]`）強制守門。

## 放棄的做法

- `docs/STATE_OWNERSHIP_DESIGN.md` §3.2 評估並否決方案 A（將 `Agent` 全面改寫為子物件分組，須改動 600+ 處參照且無法自動消除多寫入者）與方案 B（獨立元件儲存 ECS-lite，等同重寫引擎資料層與渲染 join）。

## 後果

- 在 `Agent` 新增欄位未登錄所有權表時無法通過 `tsc` 編譯檢查，越權寫入在單元測試階段即失敗，且執行期零額外成本。
- 靜態掃描僅偵測 `.field` 寫入形式，別名寫入須於程式碼審查時人工核對；違規基準只准減少不准回漲。

## 證據

- `docs/DECISIONS.md` §4
- `docs/STATE_OWNERSHIP_DESIGN.md` §3、§5～§8
- `engine/core/Agent.ts`、`engine/core/AgentOwnership.ts`、`engine/ai/TargetingSystem.ts`
- `tests/AgentOwnership.test.ts`、`tests/agent-ownership.baseline.json`、`tests/TauntRetarget.test.ts`
- `docs/WORKLOG.md` §2 F、§2 I、§2 N（commit `70035ab`、`c2c0bfc`）
