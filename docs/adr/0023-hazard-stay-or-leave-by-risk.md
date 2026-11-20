# 0023 站在敵方危害區上依風險決定去留

狀態：採用
日期：2026-11-20

## 背景

G1 第二輪拆解（WORKLOG §2 CP）顯示帶危害區的技能，勝率影響遠大於它的傷害：`mr_u4` 拿掉毒區勝率差 +7.8% → −2.0%。原本 AI 只要腳下有敵方危害就立刻撤退（`WantsRetreat`、`IsInUrgentDanger`、`IsInWarningZone` 各自判斷），和縮圈警告格同等對待。全場型危害幾乎沒有安全格，整隊在持續時間內一直找路，效果接近全隊被控。使用者 11-20 指出躲避和被強控差不多，提議看血量決定要不要離開。

## 決定

- 站在敵方危害區上的去留只在 `engine/ai/HazardRisk.ts` 判斷，參數在 `constants/ai.ts` 的 `HAZARD_RISK`。BT 條件對敵方危害一律呼叫它，不各自判斷。
- 留到結束的傷害＝每跳傷害 ÷ 跳傷間隔 × 剩餘秒數（不扣護盾）。達到目前血量 × `LETHAL_HP_FRAC`、或血量比例低於 `LOW_HP_FRAC`（危害會扣血時）→ 離開；走到最近安全格的步數 ≤ `NEAR_EXIT_STEPS` → 順手離開；其他情況留下繼續打。
- 縮圈警告格不歸這個規則：塌陷會直接出局，照舊一定逃。

## 放棄的做法

- 只看血量（使用者的原提議）：出口就在旁邊時留在危害邊緣沒有理由，所以加了出口步數。
- 改成可設定的 AI 個性（膽小、莽撞）：等行為編輯器（G5）再談。

## 後果

- 危害去留的參數集中一處，之後的 AI 調整改常數或這個模組。
- 「這格有沒有敵方危害」的其他判斷仍散在尋路、選目標、落點（`engine/ai/Pathfinder.ts`、`engine/ai/TargetingSystem.ts`、`engine/systems/combat/LandingPlanner.ts`），本決策沒有收斂它們；尋路對危害格本來就是加成本、不是禁止。
- 行為指紋改變，平衡數字要重量。

## 證據

- WORKLOG §2 CP、§2 CR
- `tests/HazardRisk.test.ts`
- `engine/ai/BTRegistry.ts`
