# 0008 AI 採用狀態拓樸加每狀態一棵小樹

狀態：採用
日期：2026-11-02

## 背景

舊版 AI 全單位共用單一大行為樹，每 60～100 ms 從根節點重跑且沒有狀態記憶；優先序、防抖、`aiState` 隱形轉換、以及會偷改 `target`／`targetHex` 的條件節點混在樹裡，造成發呆、繞圈與逃跑時機互相牽動（`docs/AI_ROYALE_DESIGN.md` §8）。

## 決定

- AI 架構改為「狀態拓樸圖（`data/ai_profiles.ts` 的 `AI_MODE_GRAPH`）＋每個模式一棵小樹」，涵蓋 DEAD、CONTROLLED、ACQUIRE、ENGAGE、FIGHT、RETREAT、TRAPPED、UNSTICK、FINALE 等模式。
- `engine/ai/ModeMachine.ts` 是模式的唯一寫入者，依邊資料決定切換；各模式小樹只負責該模式當下的行為且條件節點不得有副作用。
- 對外部呼叫端維持 `a.bt.tick(a)` 介面不變；G4 進一步加上鍵字面量型別檢查與 `engine/ai/ModeGraphValidation.ts`（建樹前驗證拓樸結構完整性，不合格直接拋錯）。

## 放棄的做法

- 繼續在單一大行為樹上堆疊條件分支、計時防抖與散落各處的 `aiState` 寫入。

## 後果

- 200 場量測顯示全坦克 ≥3 秒發呆由 0.39 降至 0.01 次／場，大逃殺五職業勝率落於 15.6%～23.1%；檢視器可直接顯示目前模式、對應小樹與最近轉換紀錄，並使 G3 得以替換玩家模式圖。
- 新增或編輯模式圖須符合 `validateModeGraph` 驗證與 `BTRegistry` 鍵型別約束。

## 證據

- `docs/DECISIONS.md`「AI 與大逃殺」
- `docs/AI_ROYALE_DESIGN.md` §8、§9、§11
- `data/ai_profiles.ts`、`engine/ai/ModeMachine.ts`、`engine/ai/ModeGraphValidation.ts`、`engine/ai/BTRegistry.ts`
- `tests/ModeGraphKeys.test.ts`
- `docs/WORKLOG.md` §2 BD、§2 CE
