# 多段命中設計稿（MULTI-HIT）

> 2026-10-29 主代理起草。使用者已定：**每一段都走完整的單發傷害流程**，總傷害預設等於現在的單發值（平衡中性），之後再調。本檔列出現況、設計與待決定事項；定案後轉成實作提示詞，做完刪本檔、結論寫進 WORKLOG。

## 1. 現況（explorer 查證，2026-10-29）

- **單發的唯一入口**：`engine/systems/combat/SkillExecutor.ts` 的 `resolveHit`（約 :146）。流程：防護檢查 → `DamageCalculator.calculate`（致盲落空、易傷、斬殺、背水一戰、爆擊、坦克格擋、護盾吸收、吸血、法力）→ 落空／格擋／吸收事件 → `applyDirectDamage` 扣血 → 反傷 → `DAMAGE`／`HEAL` 事件與飄字 → `HIT_FX` → 吸血回復、法力事件、自傷 → `CCManager.applyCC`（含自身 CC）→ 死亡與斬殺。投射物抵達也呼叫它（`ProjectileSystem.ts:93`、`:115`）。
- **看起來多段、實際一次**：
  - STORM 類 11 招（`wb_u4`、`rb_u2`、`rb_u5`、`mb_u4`、`sb_u3`、`sb_u5`、`wr_u2`、`wr_u4`、`rr_u3`、`rr_u5`、`mr_u5`）：詠唱結束時對每個目標呼叫一次 `resolveHit`；8～10 次落點只是 `data/vfx/SkillSequences.ts` 依 `data/vfx/ult_visuals.ts` 的 `count`／`timing` 畫的。
  - 黑洞 `mb_u1`（`data/skills/blue_ult.ts`）：一次 AOE（power 430）＋牽引；`DOMAIN` 原型的持續演出也只是視覺。
  - `DUAL_STRIKE`（已刪）：只有兩道揮砍粒子，傷害一段。
- **繞過單發流程的持續傷害**：DOT／HOT（`engine/systems/status/EffectSystem.ts:30-34`，每幀 `damagePerSec*dt` 直接扣血）、危害區（`engine/systems/HazardSystem.ts:102-121`，每 0.5 秒直接扣血，0.5 寫死在 `engine/systems/combat/HazardManager.ts`）、碰撞傷害（`engine/systems/combat/CCManager.ts:355-378`）。它們都不判爆擊、不觸發反傷／吸血／命中效果，`tools/balance/batch-sim.mjs` 也沒有統計危害區傷害。
- **沒有資料欄位**：`Skill`（`types.ts:49-82`）沒有段數、間隔、持續時間；`ult_visuals` 的 `count`／`timing` 只給視覺用。
- **副作用**：`DamageCalculator.calculate` 會扣護盾、呼叫 `random()`。每段各算一次是對的（每段都是真的命中），但要確保同一段不會被算兩次。

## 2. 設計

### 2.1 資料（SSOT 在技能資料）
- `Skill` 新增可選欄位 `hits?: { count: number; interval: number }`（秒）。沒有這個欄位＝現在的單發。
- STORM 類與黑洞的段數、間隔寫在技能資料裡；`ult_visuals` 的落點數與節奏**改讀技能資料**，不再各自定義。這樣畫面上每次落點就是一次真的命中，兩邊不會再對不起來。
- 每段威力＝原 power ÷ 段數（總量不變）。

### 2.2 引擎
- 新增 `MultiHitScheduler`（`engine/systems/combat/`）：技能結算時，如果有 `hits`，不立刻呼叫 `resolveHit`，而是排 N 個命中，在施放時刻＋i×interval 觸發。每一段呼叫 `resolveHit(source, target, skill, { powerScale: 1/N, hitIndex: i, hitCount: N })`。
- `resolveHit` 加這組參數：傷害乘上 `powerScale`；飄字、`HIT_FX` 每段都有；`hitIndex` 讓特效可以做「最後一段加重」。
- **單一寫入者**：排程器只負責「什麼時候呼叫 `resolveHit`」，所有扣血、護盾、吸血仍只在 `resolveHit`／`DamageCalculator` 裡發生。
- `tools/balance/batch-sim.mjs` 已經包住 `resolveHit`，多段命中會自動被統計。

### 2.3 每段走完整流程時的邊界規則（主代理建議，待使用者確認的標 ★）
| 情況 | 建議 |
| :-- | :-- |
| 爆擊 | 每段各自判定（平均總傷不變，波動變小） |
| 護盾、坦克格擋、致盲落空 | 每段各自判定 |
| 吸血、反傷、法力 | 每段各自觸發，總量與單發相同 |
| 控制（暈眩、沉默、牽引、擊退、放逐…） | **使用者 10-29 定案：每段都套，由 CC 遞減控制平衡**；前提是「CC 生效中再中同類 CC 不疊遞減」（見 §2.5 障礙 1） |
| AOE 範圍內的目標 | **使用者 10-29 定案：每段重新判定範圍**；單體技能鎖定原目標 |
| 施法者在途中死亡 | 已施放的段數照常打完（法術已經放出去了）；被放逐則中止 |
| 目標在途中死亡 | 剩下的段數跳過該目標 |
| 斬殺類效果 | 每段照常判定 |

### 2.4 範圍：直接傷害與週期傷害分開（使用者 10-29 定案）
- 多段命中屬於**直接傷害**，走 `resolveHit`。DOT（燃燒、中毒）是負面狀態的**週期傷害**，是另一條管線，不併入。
- 為了之後實裝完整的防禦公式，傷害要帶「通道」：`DamageCalculator` 的輸入加 `channel: 'DIRECT' | 'PERIODIC'`（之後可再細分物理／魔法）。參考 MMO 的常見做法：直接傷害吃護甲／魔抗與格擋、可爆擊；週期傷害通常只吃減傷百分比、不吃格擋、預設不爆擊（可由技能特性開啟）、吸血與反傷另外設係數。這一輪只把通道欄位與分流點做出來，週期傷害的實際公式不變。
- 危害區（地面效果）歸在週期傷害；這一輪只把 0.5 秒的跳傷間隔搬進資料、讓 batch-sim 統計到危害區傷害。

### 2.5 障礙（逐條討論）
1. **CC 遞減會讓多段控制第 3 段就免疫**：`engine/systems/combat/CCManager.ts` 的 `checkDR` 對每一次硬控（暈眩、沉默、放逐、恐懼、嘲諷、定身）都加一層遞減（時間 ×0.5^層數，≤0.25 就免疫），不管目標是不是還在被控。主代理建議：**同類硬控生效中再中，只把剩餘時間刷新成 max(剩餘, 新時間×目前倍率)，不加層**；控制結束後再中才加層。這也順便修正現在「兩個人同時暈同一個目標就直接進遞減」的問題。
2. **沒有緩速狀態**：黑洞想做「拉取後套 50～80% 緩速，看起來逃不出去」，但目前狀態只有加速（HASTE），移速倍率只來自地面危害區（`MovementSystem` 寫 `moveSpeedMult`）。主代理建議：新增 `SLOW` 狀態（數值＝減速比例），不算硬控、不吃遞減；多次套用取較長時間與較大減速；移動時和危害區倍率取較慢的那個；狀態圖示與單位染色走現有狀態視覺管線。黑洞每段：牽引＋刷新緩速，所以在黑洞裡會一直很慢。

## 3. 驗收
- 單元測試：排程時間點、`powerScale` 總和＝1、控制只套一次、目標死亡跳過、施法者被放逐中止。
- `npm run balance:sim` 固定 seed 200 場，改前改後比較勝率、平均時間、各技能總傷害；STORM 類每招的**平均總傷害**和改前相差應在 ±5% 內（爆擊與護盾的分段效應造成的小差異）。
- 實機看：黑洞與風暴每次落點都有飄字、命中特效和落點同步。

## 4. 實作分工（定案後）
- 不碰渲染的引擎部分（資料欄位、排程器、`resolveHit` 參數、測試、batch-sim）一條線。
- `ult_visuals`／`SkillSequences` 改讀技能資料的段數與節奏屬於渲染，另一條線，排在前一條之後。
