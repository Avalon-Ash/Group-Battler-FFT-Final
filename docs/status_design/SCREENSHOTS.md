# 狀態設計截圖與證據清單

2026-11-05，base `f61fa017`。所有遊戲取證使用本機 Edge headless；沒有按 START SIMULATION。33 張現況證據＋1 張設計示意；下列路徑相對本文件。完整尺寸、SHA-256、非黑畫面抽樣檢查及帶狀態位移證據在 [image-manifest.json](evidence/image-manifest.json)。

## 設計示意（1 張）

- [status-mockup.png](status-mockup.png)：1480×1302，圖示語言、戰場訊號位置、桌機 inspector、手機 sheet。**提案，非遊戲實作畫面**；數字是範例。
- [status-mockup.html](status-mockup.html)：可直接開啟；內含 22 種共享 glyph 的幾何 path。字形／畫面為原生 HTML/SVG，沒有用生成式點陣美術。

## 自然展示模式：桌機（D）

1440×900，CSS 尺寸；截圖前後狀態、座標與縮放見 [desktop-motion.json](evidence/desktop-motion.json)。相隔時間由真實渲染／截圖耗時決定，不是固定影片幀距。

| 編號 | 圖片 | 閱讀重點 |
|---|---|---|
| D00 | [desktop-motion-00.png](evidence/desktop-motion-00.png) | 開始有效取樣，已有持續效果與移動 |
| D01 | [desktop-motion-01.png](evidence/desktop-motion-01.png) | ROOT、SHIELD、POISON、REFLECT 組合 |
| D02 | [desktop-motion-02.png](evidence/desktop-motion-02.png) | 多控制與 DoT 混合 |
| D03 | [desktop-motion-03.png](evidence/desktop-motion-03.png) | 圖示列、浮字、場景光環相互遮疊 |
| D04 | [desktop-motion-04.png](evidence/desktop-motion-04.png) | BURN＋REGEN、POLYMORPH 已出現 |
| D05 | [desktop-motion-05.png](evidence/desktop-motion-05.png) | 羊與其他單位狀態持續；注意前後 snapshot 的狀態可能不同 |

## 自然展示模式：手機 CSS 原尺寸（M）

393×852、裝置 DPR 3；[mobile-motion.json](evidence/mobile-motion.json)。zoom 約 0.678；這組可用來看實際 CSS 可讀性，非 iPhone Safari 實機。

| 編號 | 圖片 | 閱讀重點 |
|---|---|---|
| M00 | [mobile-motion-00.png](evidence/mobile-motion-00.png) | 燃燒／易傷／中毒／緩速等有效槽 |
| M01 | [mobile-motion-01.png](evidence/mobile-motion-01.png) | 加速與減益並存；外框可見，細字形／場景線小 |
| M02 | [mobile-motion-02.png](evidence/mobile-motion-02.png) | 移動與技能交疊 |
| M03 | [mobile-motion-03.png](evidence/mobile-motion-03.png) | 護盾＋易傷＋加速＋緩速組合 |
| M04 | [mobile-motion-04.png](evidence/mobile-motion-04.png) | 多個單位名牌密集 |
| M05 | [mobile-motion-05.png](evidence/mobile-motion-05.png) | 與 M01 比看移動後身側訊號、毒與其他浮字 |

## 真 rAF 連續幀（DC／MC）

均直接讀 `canvas.block` 的遊戲畫布，沒有開場 DOM 標題。每個 rAF 回呼保存一次，共 8 幀；PNG 編碼會影響實際幀距，**不可用來量 FPS**。狀態與座標詳見 [detail-run.json](evidence/detail-run.json)。

| 幀 | 桌機 1440×900 | 手機畫布 786×1704（393×852 CSS、render DPR 2） |
|---|---|---|
| 0 | [desktop-consecutive-0.png](evidence/desktop-consecutive-0.png) | [mobile-consecutive-0.png](evidence/mobile-consecutive-0.png) |
| 1 | [desktop-consecutive-1.png](evidence/desktop-consecutive-1.png) | [mobile-consecutive-1.png](evidence/mobile-consecutive-1.png) |
| 2 | [desktop-consecutive-2.png](evidence/desktop-consecutive-2.png) | [mobile-consecutive-2.png](evidence/mobile-consecutive-2.png) |
| 3 | [desktop-consecutive-3.png](evidence/desktop-consecutive-3.png) | [mobile-consecutive-3.png](evidence/mobile-consecutive-3.png) |
| 4 | [desktop-consecutive-4.png](evidence/desktop-consecutive-4.png) | [mobile-consecutive-4.png](evidence/mobile-consecutive-4.png) |
| 5 | [desktop-consecutive-5.png](evidence/desktop-consecutive-5.png) | [mobile-consecutive-5.png](evidence/mobile-consecutive-5.png) |
| 6 | [desktop-consecutive-6.png](evidence/desktop-consecutive-6.png) | [mobile-consecutive-6.png](evidence/mobile-consecutive-6.png) |
| 7 | [desktop-consecutive-7.png](evidence/desktop-consecutive-7.png) | [mobile-consecutive-7.png](evidence/mobile-consecutive-7.png) |

已查的明確帶狀態移動：DC 的 RED-0008（SLOW）在首末幀移動約 19.53 世界單位；MC 的 BLU-0001（POISON）移動約 27.44、RED-0008（SLOW）約 16.46。這證明畫面及單位有動，不代表已驗收新方案的移動／遮擋。

## 現行 renderer 固定輸入（G）

- [current-status-gallery-tier0.png](evidence/current-status-gallery-tier0.png)：最高畫質；20 格，每格大縮放1.4／手機參考縮放0.678。
- [current-status-gallery-tier3.png](evidence/current-status-gallery-tier3.png)：最低畫質，同樣輸入。
- [current-gallery.json](evidence/current-gallery.json)：每格 active key、priority、狀態場景貼圖次數。角色本體、血條、圖示列不含在成本內。

格序：STUN、FROZEN、POLYMORPH、BANISH、STASIS／SILENCE、ROOT、FEAR、TAUNT、BLIND／SLOW、VULNERABLE、BURN、POISON、REGEN／HASTE、REFLECT、LIFESTEAL、INVINCIBLE、SHIELD。

這兩張是實際 renderer 的隔離輸入，不是概念圖；不證明每種效果都在本輪自然戰鬥出現。BLEED 目前不存在獨立外觀，沒有偽造現況 BLEED 圖格。

## 現行 UI 固定輸入（U）

- [desktop-inspector-fixture.png](evidence/desktop-inspector-fixture.png)：實際 UnitInspectorBody／ToolWindow，fixture 有 STUN、SILENCE、DOT、HOT、HASTE、shield=260，只出兩個控制標籤。
- [mobile-inspector-fixture.png](evidence/mobile-inspector-fixture.png)：相同輸入，393×852 底部面板。
- [desktop-banished-inspector-fixture.png](evidence/desktop-banished-inspector-fixture.png)：fixture hp=800、banished=true，面板顯示「單位已陣亡」。

用探針另外掛載現成元件以看內容；背景仍是展示戰場，**不是聲稱 inspector 在正常展示模式可開**。樣本元件的資料來源是隔離 fixture，不是背景單位。

## 重跑與資料

探針只在 `tools/ui-e2e/out/`；用 `tools/agent/run.mjs` 執行，詳細指令見主設計 §2。可重跑，但自然樣本沒有固定種子，不能期待同一場。

- [natural-run.json](evidence/natural-run.json)：自然取樣及 pageerror。
- [detail-run.json](evidence/detail-run.json)：逐幀、UI fixture view model、短時間 DPR3 畫布記憶體樣本。
- [skill-inventory.json](evidence/skill-inventory.json)：本次引擎 skillDB 的 170 招 action 清單；含 CHANCE／RANDOM_OF／hazard onEnter 的巢狀動作。
- [image-manifest.json](evidence/image-manifest.json)：33 張現況 PNG 尺寸／hash／非空畫面檢查，沒有把黑 canvas 留作有效證據。

未驗證：iPhone 14 Pro Safari、40 人壓力、新設計程式／互動、長時間記憶體峰值、所有自然技能的抵抗／淨化來源鏈。
