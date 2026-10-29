---
name: review-round
description: 審查 Gemini（或子工作階段）跑完的分支 diff、決定每個改動的去留，以及合併後的收尾（WORKLOG、HANDOFF、刪提示詞、合約效果紀錄）。使用者說某一輪「跑完了」、要求審查分支、或一輪合併後收尾時使用。
---

# 審查一輪、收尾一輪

## 1. 便宜地審查
1. `git diff main...<branch> --stat`；只讀程式碼變更（`engine/`、`components/`、`data/`、`constants/`、`tests/`；動到 `tools/hooks/`、`.claude/`、`.codex/`、設定檔時這些也要讀）。報告只看數字表與回退指南，不整份讀。
2. 對照 `AGENTS.md`（檢查清單）；動到位置／排序時對照 `engine/renderers/RenderSpec.ts`。需要第二意見才開 `reviewer` 子代理。
3. 每個改動寫一行決定（取自 Harness² 合成者規則；沒有證據的決定，下一個讀者無法稽核）：
   ```
   kept|revised|dropped -> <哪個改動> -> <依據：哪段程式、哪個量測、出現幾次>
   ```
   - 量測或隨機現象要重複出現才算真的；只出現一次就針對它改，是過度擬合。能直接構造反例的確定性缺陷（例如 hook 誤放行、型別錯誤），一次證據就成立，不必浪費額度重演。
   - 只有「看起來是好習慣」不算證據；B0 證據為 0 的修正一律 dropped（§4 第 6 條）。
   - 下行風險和上行收益一樣重：會讓畫面凍結或沒有產出的改動，除非證據壓倒性，否則 dropped。
   - 「全部不收、維持 main」也是正當結論。
4. 衛生檢查（代理常漏，主代理自己跑，不靠代理自報）：
   - `npm run knip`：和 `main` 比不得多出新項目。
   - `git diff main...<branch> --stat -- tools/`：新增的腳本必須被 npm script、測試、skill 或其他工具引用，否則要求刪除或移到 `tools/ui-e2e/out/`。
   - `git diff main...<branch> | grep -E "^\+.*(0x6D2B79F5|9301|Math\.imul)"`：有新寫的 PRNG／雜湊就退回，改用 `engine/math/rng.ts`。
   - 新增的數字與顏色在 `constants/`、`data/` 以外 → 要求改成具名常數。
5. 渲染／生命週期改動 → `render-verify` skill。基準檔有變 → `rebaseline-fidelity` skill。
6. 修完問使用者能不能合併；push 另外問（hook 只攔破壞性 push，一般 push／merge 靠這條規則）。

## 2. 收尾（合併後）
- 刪掉該輪提示詞與報告：報告的結論（數字表、回退方式）寫進 WORKLOG 那一節後刪除；只有 HANDOFF 還在引用的才保留（DECISIONS §4；`tests/DocDrift.test.ts` 擋斷鏈）。
- 該輪留下、沒有長期用途的探針腳本一併刪除。
- 這輪動到架構（Facade、系統邊界、SSOT 位置、事件流）→ 同步更新 `docs/ARCHITECTURE_WHITEPAPER.md`（`tests/WhitepaperDrift.test.ts` 檢查佔位符）。
- 程式碼、保真重錄（獨立 commit＋證據）、文件分開 commit。
- `docs/WORKLOG.md` 加一節：日期＋一句話結論＋commit／報告位置。
- `docs/HANDOFF.md` 刪掉做完的 TBD，加上新的「待使用者實機確認」。**逐行重讀 §1「目前狀態」**，把不再成立的句子改掉或刪掉；§1 不寫 commit SHA、分支清單這類每次合併都會過時的快照（以 `git log` 為準）。2026-10-29 發現 §1 停在 10-26 三天沒更新，原因是這條只要求更新 TBD、沒要求檢查 §1。

## 3. 合約效果紀錄（這輪有改到合約時才寫）
合約＝`CLAUDE.md`、`AGENTS.md`、`.claude/**`、`tools/hooks/**`、提示詞範本。在 WORKLOG 那一節加一張小表（取自 Harness² 反思者規則）：

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| <哪個檔、改了什麼> | <代理的哪一步因此不同> | helped／hurt／no effect／confounded |

- 一次改了好幾處、又沒有能單獨歸因的證據 → 寫 `confounded`，不要硬歸因。
- 只有在判定不是 `confounded` 時，才把教訓升級成 `docs/METHODOLOGY.md` §4 的一條，格式：「什麼情境 → 對合約做什麼 → 依據」。太空泛（「要仔細」）或太具體（只對這一輪成立）都不收。
