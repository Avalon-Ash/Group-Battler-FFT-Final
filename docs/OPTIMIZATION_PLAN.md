# 優化計畫 OPT-01（2026-10-28）

> 主代理清查結果與分輪計畫。做完一輪就把該輪移到 `WORKLOG.md`，全部做完刪本檔。

## 0. 結論

程式碼本身比預期乾淨：knip（含 `--production`）只抓到 2 個多餘匯出，`engine.bus` 的事件都有發送端和訂閱端，`as any`／`console.log` 各剩 1 處。真正的問題在五個地方：

1. **魔法數字**集中在程序繪製、合成器、AI／戰鬥規則（約 1,230 個數字、135 個顏色字面值，分布在 116 檔）。
2. **重複實作**：亂數與雜湊函式至少有 8 份，`engine/math/rng.ts` 已經存在，卻沒有統一使用。
3. **無入口的功能**：規格下載（`DesignExporter`）、`VISUAL_SLASH`、`DUAL_STRIKE`。
4. **建置與部署無法重現**：沒有把 lockfile 納入版控，部署前也不跑測試。
5. **工具與文件膨脹**：約 50 支一次性探針沒有任何入口；清冊 CSV 有 520 列未讀，逐檔審計已經停滯。

## 1. 發現

### A. 魔法數字

掃描範圍是 `engine/`、`components/`、`hooks/`；不算 `data/`、`constants/`（這兩個本來就是 SSOT）。排除 0、±1、2、0.5、10、100 等常見值，也排除指派給全大寫常數、enum、型別或索引的字面值。掃描腳本放在 scratchpad，O4 會正式收進 repo。

| 類別 | 熱點（數字個數） | 性質 | 處理 |
| :-- | :-- | :-- | :-- |
| **戰鬥／AI／地圖規則** | `BTRegistry` 26、`TargetingSystem` 15、`MapGenerator` 20、`PhysicsEngine` 18、`Pathfinder` 12、`ZoneSystem` 14、`DamageCalculator` 8（含 1.35 這類倍率） | 會影響平衡，BAL 輪調不到 | **最優先**：搬到 `constants/combat`、`ai`、`map`，只搬不改值 |
| 鏡頭／導播 | `DirectorSystem` 32、`hooks/useGameApp` 12 | 手感參數 | 搬到 `constants/camera` |
| 程序繪製 | `PartBakers` 181（1,828 行）、`UIFactory` 90、`EnvironmentFactory` 57、`CoreFactory` 49、`VFXFactory` 27、`tactical.ts` 28、`hud.ts` 22、`UnitShatter` 20、`RagdollFactory` 30（每 100 行 107 個） | 形狀、尺寸、透明度 | 參數表移到 `data/vfx/**`，保真必須 0 差異 |
| 音色 | `Synth` 126 | 合成器 patch | 搬到 `data/audio/patches.ts` |
| 雜湊種子 | `TerrainRenderer`、`ObstacleSpriteStore`、`NoiseLib`、`background`、`PartSpec`、`TerrainLoopAtlas` | 重複實作（見 B） | 統一後就會消失 |
| UI 顏色 | `UnitInspectorBody` 49、`AudioSettingsWindow` 14、`UltWorldRenderer` 9、`MapEditorToolbar` 6、`AnnouncerSystem` 5 | 硬編碼顏色 | 改用 `gen:tokens` 產生的樣式代碼或 `constants/` |

防回退：加 `tests/MagicNumberBudget.test.ts`，記錄每個檔案的數字個數基準，只能減少、不能增加（做法比照 `CoordinateProtocol.test.ts`）。

### B. 重複實作（亂數與雜湊）

- `engine/math/rng.ts` 已經有 mulberry32，但 `engine/renderers/grid/TerrainLoopAtlas.ts:81` 又自己寫了一份。
- 整數雜湊各寫一份的地方：`NoiseLib.ts:16`、`TerrainRenderer.ts:83`、`ObstacleSpriteStore.ts:77`、`background.ts:19`、`PartSpec.ts:360`、`Synth.ts:17`、`useMatrixRain.ts:64`。
- `ZoneSystem.ts:82`、`ZoneSystem.ts:130` 用了自寫的 LCG（`seed*9301+49297`）。這是**遊戲規則**，換成 `rng` 會改變戰鬥結果，要另外決定。

處理：新增 `engine/math/hash.ts`（`hash2i`、`hash3i`），各處改成呼叫它，但**輸出必須逐位元相同**，保真基準 0 差異。

### C. 失效或沒有入口的功能

| 項目 | 證據 | 建議 |
| :-- | :-- | :-- |
| `engine/presentation/DesignExporter.ts`（319 行）＋ `RenderSpec.downloadSpec` | `useGameApp.ts:319` 回傳了 `downloadSpec`，但 `components/` 沒有任何地方呼叫。內文是手寫的架構描述，已經會過時（例如宣稱「不再使用 as any」，實際上還有 1 處） | 刪除，或接回 UI（**待決定**） |
| `VISUAL_SLASH` 事件類型 | 沒有發送端，只有 `EventVFXMapper.ts:70` 和 `CinematicVFXHandler.ts:31` 有對應分支 | 刪除類型和分支 |
| `DUAL_STRIKE` 打擊類型 | `basic_visuals.ts:17` 標成 Legacy，沒有技能在用，只剩 `SkillSequences.ts:44` 一個 case | 刪除 |
| `ultFallTime` 匯出、`ConstructShape` 型別匯出 | knip：只在自己的檔內使用 | 改成不匯出 |
| `VFXValidator.ts:45` 啟動時 `console.log` | 違反合約 | 只在失敗時用 `warn` |
| `game.ts:136` `(globalThis as any).location` | 違反合約 | 改成型別守衛 |
| `CameraSystem` 的 `TODO: CINEMACHINE`、`MapGenerator.ts:32` 的 legacy W/H 註解 | 過時註解 | 刪除，或寫進 HANDOFF 暫緩 |

**沒涵蓋到的部分**：knip 抓不到「程式碼有被引用，但使用者碰不到的功能」，例如設定表單欄位沒有被讀取、視窗沒有入口。O3 用 Codex Luna 補一輪功能可達性清查。

### D. 年久失修

1. **建置無法重現**：repo 裡沒有 `package-lock.json`。`.github/workflows/deploy.yml`（最後修改 10-10）每次 push `main` 都會用 `npm install --legacy-peer-deps`＋Node 22 建置並部署到 GitHub Pages，**中間不跑 lint／test**。HANDOFF 又寫「部署方式待重新評估」，兩邊說法不一致。
2. **依賴版本**：小版本落後（vite 6.4.3→6.4.5、react 19.3.1、knip 6.43 等）。大版本有 vite 8、TS 7、tailwind 4、plugin-react 6；`@types/node` 是 22，本機 Node 是 24。
3. **`tools/` 膨脹**：122 個檔案，其中約 50 支一次性腳本（`*-shot`、`*-probe`、`cleanup-*-check`、`perf-r1/r4/r5/r6-*`、`sink-demo` 等）只有清冊 CSV 引用，npm scripts、skill、文件都沒有指向它們。knip 對 tools 有 59 個 import 解析不到（工具用根目錄絕對路徑，經 vite-node 載入），所以 knip 等於看不到 tools。`fx-shot.mjs` 還用了沒列在依賴裡的 `sharp`。
4. **文件**：已結案的報告與 findings 約 190 KB（`R5_MOBILE_EMU_REPORT`、`COORD_GUARD_FINDINGS`、`DEPTH_ORDER_FINDINGS`、`PERF_LIFECYCLE_FINDINGS`、`BGM_CANDIDATES`、`ASSET_NEEDS` 等）。其中 HANDOFF 還在引用的要保留（`BAL02_REPORT` §5.2、`R7_DRIFT_CORPSE_REPORT`、`ULT_VISUAL_CLAUDE_REPORT` §6）。`WORKLOG` 引用了已不存在的 `tools/audit/cleanup-a0-inventory.mjs`。
5. **審計清冊**：335 KB 的 CSV，520 列未讀。逐檔人工標記成本高，也沒有防回退效果。
6. **命名與結構**：小寫舊檔（`renderers/tactical.ts`、`presentation/hud.ts`、`systems/map.ts`、`ai.ts`、`agentManager.ts`）和 PascalCase 混用；根目錄有 `skillDatabase.ts`、`types.ts`（662 行）；`package.json` 的 name 是 `tactical-battler:-kernel-v9.7`。

## 2. 分輪計畫

依 CLAUDE.md 鐵律：**渲染線同一時間只開一條**，非渲染線可以並行。

| 輪 | 內容 | 渲染？ | 執行者 | 驗收 |
| :-- | :-- | :-- | :-- | :-- |
| **O1 死碼** | C 表全部（DesignExporter 依決定處理）；修 knip.json 讓它解析得到 tools 的路徑（`paths` 或忽略 unresolved）；處理 `sharp` | 輕微（只刪 VFX 分支） | Codex Luna／medium 或 `worker` | lint／test／build、`npm run knip` 乾淨、`runtime-smoke` |
| **O2 建置／部署** | 把 `package-lock.json` 納入版控；deploy 改用 `npm ci`、Node 24，build 前先跑 lint＋test；只做小版本升級 | 否 | `worker` | CI 綠燈一次（push 要另外取得同意） |
| **O3 工具／文件** | 一次性腳本移到 `tools/_archive/`（或刪除）；已結案的報告移到 `docs/archive/`；清冊 CSV 凍結，改由自動化閘門取代；Codex Luna 補功能可達性清查 | 否 | Codex Luna／medium | 所有 npm scripts 與 skill 引用的路徑都還在（加測試檢查） |
| **O4 規則數值** | A 表的戰鬥、AI、地圖、鏡頭數值搬進 `constants/`，**只搬不改值**；新增 `MagicNumberBudget` 測試與掃描腳本；`ZoneSystem` 的 LCG 先不動 | 否 | Codex Sol／medium（工作樹） | `balance:sim` 固定 seed 結果逐位相同、`constants-snapshot` 更新有理由 |
| **O5 渲染參數＋雜湊統一** | `hash.ts` 統一；`PartBakers`、Factory、`Synth` 的參數表外移；拆分 `PartBakers` | **是（唯一的渲染線）** | Codex Sol／medium（工作樹） | `perf:fidelity` 0 差異、不重錄基準、`perf:guard`、`render-verify` |
| **O6 UI 顏色** | UI 顏色改用樣式代碼 | 否（UI 樣式） | Gemini 或 Codex Luna | `e2e:ui` 樣式基準 0 差異 |
| 暫緩 | 大版本升級（vite 8、TS 7、tailwind 4，各自一輪）；小寫檔名統一（碰到再改）；`ZoneSystem` 改用 `rng`（會改變戰鬥結果，併入下次 BAL） | — | — | — |

建議順序：O1 → O2 → O3 可以並行；O4 接在 O1 之後（O1 會改到 `game.ts`）；O5 等目前沒有其他渲染工作時再開；O6 隨時可做。

## 3. 待使用者決定

1. **規格下載（`DesignExporter`）**：直接刪除，還是在 UI 加按鈕接回？
2. **GitHub Pages 自動部署**：保留並加上測試閘門，還是先停用，等部署方式定案？
3. **一次性工具腳本**：移到 `tools/_archive/`，還是直接刪除（git 有歷史）？
