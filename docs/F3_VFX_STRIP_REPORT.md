# F3 技能特效連續格長條圖

## 技能入口與資料

- **靜態**：`DEFAULT_SKILL_DB` 是藍、紅兩隊的技能正本。預設 FOREST、BLUE，依 `Role` 列舉並用 `roleSkills` 篩隊伍。每職業取資料表中第一個 `ULT` 和第一個 `ACTIVE`，缺項用其他非普攻補位。明列 `--skill` 時採各招原有隊伍，`--team` 可指定施法者隊伍。來源 `skillDatabase.ts:4`、`engine/core/SkillQueries.ts:135`、`tools/ui-e2e/vfx-strip.mjs:14`。
- **靜態**：沿用壓力情境的 `GameEngine.initiateCast(caster, slot)`。以 `SET_AGENT_SKILL` 設槽，在首個擷取 tick 的戰鬥更新內指定目標與落點。此時事件佇列已清空，詠唱事件由引擎在同一 tick 派發。投射物、延遲落地和多段命中由原系統更新。來源 `tools/ui-e2e/lib/vfx-storm.mjs:59`、`engine/game.ts:347`、`engine/game.ts:384`、`engine/game.ts:466`、`engine/systems/combat/CombatSystem.ts:96`、`tools/ui-e2e/vfx-strip.mjs:182`。另核對過 `tools/vfx/ult-sheet.mjs:228` 的引擎入口。
- **靜態**：兩支探針共用保真時鐘、頁面啟動和地圖重建。擷取逐格腳本把瀏覽器 RAF 保持在待執行狀態，走原生 `stepSimulation`，每 3 個 60 Hz tick 取樣一次，並逐格斷言 tick 數。擷取場景只放一位施法者及一位指定目標，以引擎的遮擋判定選站位。雙方 AI、導播、縮圈、勝負即時裁定與單位閒置粒子在本次擷取停用，讓友軍也可當目標。來源 `engine/core/Replay.ts:110`、`tools/ui-e2e/lib/frozen-battle.mjs:18`、`tools/ui-e2e/vfx-strip.mjs:64`、`tools/ui-e2e/vfx-strip.mjs:118`。
- **靜態**：格 0 是施法前，格 1 是起手取樣。從 `resolveHit` 讀取指定目標的首次命中，依技能路徑也可記錄自身生效或落點事件。最後一格是首次觀察到效果佇列、非天氣粒子、危害、狀態及浮字皆清空的取樣，最多 60 格。裁切矩形取所有格的兩個位置聯集，向四邊各加兩格尺寸後與原畫布相交。上下兩列均直接複製原像素，`strips.json` 記錄每格的畫布像素座標、裁切矩形和關鍵格索引。來源 `tools/ui-e2e/vfx-strip.mjs:136`、`tools/ui-e2e/vfx-strip.mjs:156`、`tools/ui-e2e/vfx-strip.mjs:191`、`tools/ui-e2e/vfx-strip.mjs:220`。

## 預設抽樣（FOREST／BLUE）

**實跑**：`npm run perf:vfx-strip` 退出碼 0。輸出位於 `tools/ui-e2e/out/vfx-strip/`，含 10 張 `<技能id>_FOREST.png` 與 `strips.json`。PNG 表頭讀出的尺寸符合兩列配置，10 招的裁切像素最大差均大於 0。來源 `tools/ui-e2e/vfx-strip.mjs:228`、`tools/ui-e2e/vfx-strip.mjs:306`。

| 職業 | 技能 | 格數 | 命中格（從 0 起） | 最大變動像素數 | 第 60 格仍有作用中效果 |
| --- | --- | ---: | ---: | ---: | --- |
| TANK | `tb_u1` | 60 | 31 | 51478 | 是 |
| TANK | `tb_a1` | 60 | 7（自身） | 27264 | 是 |
| WARRIOR | `wb_u1` | 60 | 46 | 122112 | 是 |
| WARRIOR | `wb_a1` | 27 | 7 | 35526 | 否 |
| RANGER | `rb_u1` | 60 | 47 | 96311 | 是 |
| RANGER | `rb_a1` | 48 | 17 | 88582 | 否 |
| MAGE | `mb_u1` | 60 | 31 | 81639 | 是 |
| MAGE | `mb_a1` | 46 | 25 | 45214 | 否 |
| SUPPORT | `sb_u1` | 60 | 31 | 87678 | 是 |
| SUPPORT | `sb_a1` | 37 | 16 | 42795 | 否 |

**實跑**：開啟 `wb_u1_FOREST.png`（29040 × 979）與 `wb_a1_FOREST.png`（7533 × 913），檢視上排抽出 5 格及下排 3 張關鍵格的中心區。前者在格 1 有詠唱圈和地面標示，格 46 有落雷與浮字，格 59 仍有浮字和狀態圖示。後者在格 1 可見施法圈，格 7 有命中光和浮字，格 26 浮字已消失。兩張圖均有樹冠遮住部分單位或特效。來源 `tools/ui-e2e/vfx-strip.mjs:228`。

## 決定性

- **實跑**：`npm run perf:vfx-strip -- --check-determinism` 退出碼 0。FOREST／BLUE 10 招各以獨立瀏覽器 context 擷取兩次，10 對 PNG 的位元組完全相同。驗收使用 `Buffer.equals`，無像素容差。啟動沿用 `--force_high_performance_gpu`，額外固定 Canvas 2D 軟體光柵化。來源 `tools/ui-e2e/lib/perf-common.mjs:16`、`tools/ui-e2e/vfx-strip.mjs:261`、`tools/ui-e2e/vfx-strip.mjs:297`、`tools/ui-e2e/vfx-strip.mjs:316`。日誌 `tools/ui-e2e/out/agent-logs/f3-determinism-final.log`。
- **實跑**：`node tools/ui-e2e/vfx-strip.mjs --skill sr_a1 --skill rr_b1 --biome ICE --team RED --check-determinism` 退出碼 0。兩對 PNG 的位元組相同，輸出在同一目錄。

| 技能 | PNG | 格數 | 命中格（從 0 起） | 最大變動像素數 |
| --- | --- | ---: | ---: | ---: |
| `sr_a1` | `sr_a1_ICE.png` | 36 | 15 | 56895 |
| `rr_b1` | `rr_b1_ICE.png` | 51 | 20 | 57902 |

`strips.json` 保留 FOREST／BLUE 的 10 招結果。ICE／RED 的 2 招索引另存為 `strips-ice-red.json`。

## 專案驗證

以下均為**實跑**。完整日誌在 `tools/ui-e2e/out/agent-logs/`。

| 指令 | 退出碼 | 觀察 |
| --- | ---: | --- |
| `npm run lint` | 0 | TypeScript 檢查通過 |
| `npx vitest run --exclude **/AgentRunner.test.ts` | 0 | 183 檔、1697 測試通過 |
| `npm run knip` | 0 | 無回報項目 |
| `npm run build` | 0 | 入口 257.0／257.5 kB，初始載入 380.1／383.2 kB；Vite 回報有壓縮前超過 500 kB 的 chunk |
| `npm run perf:layers`（抽取前、後各一次） | 1、1 | 終端機表格 100 行逐字相同。各有 12 次擷取、2 筆遮罩覆蓋失敗及 12 筆順序提示 |

亮度探針共用模組接點在 `tools/ui-e2e/layer-luma-probe.mjs:374`、`tools/ui-e2e/layer-luma-probe.mjs:404`。比對日誌為 `f3-layers-before.log`、`f3-layers-after.log`。

## 阻礙與未完成範圍

- **實跑**：亮度探針前後的 `layers.json` 有 6 個未四捨五入的平均值不同，全在 ICE／mobile，最大絕對差 0.000004799。終端機表格的數字相同。覆蓋失敗在 FOREST／desktop 與 FOREST／mobile，兩次均缺少 `RED-0007`。未重錄基準。
- **實跑**：第一輪使用瀏覽器預設 Canvas 2D 路徑時，`tb_u1`、`rb_a1` 位元組比對失敗（退出碼 1）。固定軟體光柵化後的第二輪為 10／10。調整站位時曾有重複的區域變數名稱，第一次重跑於語法檢查退出碼 1，改名後重跑退出碼 0。
- **實跑**：Windows 拒絕 WMI 啟動背景命令（`0x80041003`），`tools/agent/run.mjs` 改用自身的 spawn 路徑完成。環境無 `python` 指令，行尾保留改用 Node。靜態查找中猜測的引擎路徑改由 `rg --files` 定位。
- **實跑**：FOREST／BLUE 有 6 招達格數上限，格 59 是最後取樣，完整尾段未擷取。**未驗證**：預設 10 招與 ICE／RED 的 2 招以外，其餘技能與群系組合未實跑。
