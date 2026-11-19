# 0017 基準性架構改動採契約先行

狀態：採用
日期：2026-11-17

## 背景

`docs/plans/optimization-2026-11.md` 規劃九個跨系統基準性架構包（S2、S3、G2、G3、G4、R1、R2、R3、U1），須多人／多工作階段分線實作，若介面型別與驗收標準未於開工前鎖定，容易在實作過程中偏離原設計或更動測試基準。

## 決定

- 基準性架構改動由開案者先寫好型別、拋出 `ContractPending`（`engine/core/ContractPending.ts`）的空殼函式與紅色驗收測試（`tests/contracts/*.contract.test.ts`）。
- 進度由 `tests/contracts/status.ts` 控管：標為 `pending` 時驗收停在空殼算待辦；實作開工第一步改為 `done` 使驗收轉紅，完成後程式執行路徑上不得留有任何 `ContractPending`。
- 契約驗收檔、輔助檔與狀態比對檔列為受保護檔案，雜湊登錄於 `tests/contracts/MANIFEST.json` 並由 `tests/contracts/Manifest.test.ts` 把關，實作者只補實作、不改契約或驗收。

## 放棄的做法

原紀錄沒有寫。

## 後果

- 九包核心架構的介面簽章與驗收標準在動工前即凍結，使分線派工可獨立驗證並阻止實作者放寬驗收。
- 空殼之後的驗收段落事前尚未實際執行過，偶發驗收本身假設疏漏須回報由開案者修正並更新 `MANIFEST.json`（如 R1、U1、G3 實作時所遇）。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §5a
- `docs/plans/optimization-2026-11.md`「契約」節
- `engine/core/ContractPending.ts`、`tests/contracts/status.ts`、`tests/contracts/MANIFEST.json`、`tests/contracts/Manifest.test.ts`
- `docs/WORKLOG.md` §2 BY、§2 CB、§2 CC
