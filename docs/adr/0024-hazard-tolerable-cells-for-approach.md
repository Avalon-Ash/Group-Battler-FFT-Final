# 0024 接近敵人時扛得住的危害格可以走

狀態：採用
日期：2026-11-20

## 背景

ADR 0023 把「站在敵方危害上要不要走」收進 `engine/ai/HazardRisk.ts`，但尋路、移動中的路徑檢查、接近格與重新站位、選目標仍把所有敵方危害格當成要避開：尋路每格加 `ENEMY_HAZARD_COST` 15 分，`MovementSystem` 只要路上有危害格就整條路徑作廢重算，接近格與重新站位直接跳過危害格。單位因此留在危害裡不逃，卻不肯穿過危害去追人。

## 決定

- `HazardRisk.hazardTolerable(a, hazards)`：沒有敵方危害、不扣血、或留到結束不致命且血量不低 → 扛得住。去留判斷（0023）也改以它為底，兩者一致。
- 尋路：扛得住的危害格只加 `PATH_RULES.TOLERABLE_HAZARD_COST`（2 分），扛不住的照舊 15 分；逃生尋路不變。
- `MovementSystem` 的路徑檢查、`bestAdvanceCell`、重新站位只排除扛不住的危害格；`TargetingSystem` 的「危險中」改成快塌陷或扛不住的危害。
- 機動技落點（`engine/systems/combat/LandingPlanner.ts`）照舊避開所有敵方危害：落點是主動選的，沒有理由跳進危害。

## 放棄的做法

- 危害格完全不加成本：扛得住也會白吃傷害，繞 2 格內能避開就避開。

## 後果

- 「這格的敵方危害能不能接受」只在 `HazardRisk` 判斷；機動技落點與逃生尋路是刻意保留的例外。
- 平衡數字在雜訊內沒變（WORKLOG §2 CS），危害技能剩下的強度來自傷害本身，之後用數值調。

## 證據

- WORKLOG §2 CS
- `tests/HazardRisk.test.ts`
- `engine/ai/Pathfinder.ts`
