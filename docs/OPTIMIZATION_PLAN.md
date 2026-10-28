# 優化計畫 OPT-01（2026-10-28）

> 主代理清查結果與分輪計畫。做完一輪就把該輪移到 `WORKLOG.md`，全部做完刪本檔。

## 0. 結論

程式碼本身比預期乾淨：knip（含 `--production`）只抓到 2 個多餘匯出，`engine.bus` 的事件都有發送端和訂閱端，`as any`／`console.log` 各剩 1 處。真正的問題在五個地方：

1. **魔法數字**集中在程序繪製、合成器、AI／戰鬥規則（約 1,230 個數字、135 個顏色字面值，分布在 116 檔）。
2. **重複實作**：亂數與雜湊函式至少有 8 份，`engine/math/rng.ts` 已經存在，卻沒有統一使用。
3. **無入口的功能**：規格下載（`DesignExporter`）、`VISUAL_SLASH`、`DUAL_STRIKE`。
4. **建置與部署無法重現**：沒有把 lockfile 納入版控，部署前也不跑測試。
5. **工具與文件膨脹**：約 50 支一次性探針沒有任何入口；清冊 CSV 有 520 列未讀，逐檔審計已經停滯。
6. **ZoneSystem 兩個行為 bug**：預警格上的單位每幀強制跑 AI 並洗版戰鬥紀錄（Z1）；`minRadius` 不是 1 時背水一戰會壞掉（Z2）。

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
| `engine/presentation/DesignExporter.ts`（319 行，架構白皮書）＋ `RenderSpec.downloadSpec` | 2025-12-24 重構 UI 時拿掉了 `MapEditorToolbar` 的按鈕，此後沒有入口（`useGameApp.ts:319` 回傳了，但沒有人接）。內文寫死在 TS 字串裡，已經過時：自稱 PRODUCTION_READY、宣稱不再使用 as any（實際還有 1 處）、第 9、10 節編號重複 | 使用者會用 → **保留並改寫**，見 O7 |
| `VISUAL_SLASH` 事件類型 | 2025-12～2026-01-08 由近戰命中發送；`d5e7237`（AnimationSystem SSOT）改用 `SKILL_SEQUENCES` 的 `MELEE_SLASH` 原型＋`HIT_FX` 之後，發送端就刪掉了。現在只剩 `EventVFXMapper.ts:70` 和 `CinematicVFXHandler.ts:31` 的備援分支 | 已被取代，刪除 |
| `DUAL_STRIKE` 打擊類型 | 2026-01-05 為 `wb_b1`、`wr_b5` 加入，原意是「兩段攻擊」，但**只做了視覺**（兩道揮砍粒子，間隔 0.08 秒），傷害一直是一段。2026-01-08 改名為 `CROSS_CUT`，舊名留作別名，`SkillSequences.ts:44` 和 `CROSS_CUT` 走同一個 case。專案裡沒有任何多段命中機制 | 刪除別名。真正的多段命中屬於戰鬥機制，併入 BAL02 §5.2 的 STORM 分段結算一起設計 |
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

### E. ZoneSystem（縮圈＋背水一戰，355 行）

| ID | 問題 | 影響 | 建議 |
| :-- | :-- | :-- | :-- |
| **Z1（bug）** | `ZoneSystem.ts:53` 先清空 `warningTiles`，`:64` 才拿它做「舊警告」快照，所以快照永遠是空的，`newlyWarned` 每一幀都成立 | 站在預警格的單位**每幀**被 `forceAiUpdate`：行為樹從約 12.5 Hz（`DEFAULT_AI_UPDATE_INTERVAL 0.08`）變成每幀都跑，`game.ts:367` 每幀記一筆「危險決策」，把戰鬥紀錄洗掉（紀錄有上限）。從 2026-04-27 `6f2fb06` 起就是這樣 | 刪掉 `:53`；預警集合只在層級或最終目標改變時重建。會改變 AI 決策頻率，要用 `balance:sim` 比對 |
| **Z2（bug）** | `minRadius` 同時被當成「層數」（和 `safeRadius` 比）與「格數」（和 `mapKeys.size` 比）。背水一戰只在剩 1 格時觸發，設定介面卻允許 0～10 | 設成 ≥2：停在 N 格，**背水一戰永遠不會觸發**；設成 0：最後一格也會塌，全員墜落 | 拆成兩個語意明確的參數，或限制範圍並讓背水一戰改看 `<= minRadius` |
| Z3 | 最終階段在剩下的格子裡隨機挑一格塌陷 | 可能把剩下的島切成互不相連的幾塊，單位走不到對方，形成僵局 | 只從剩餘區域的外圈挑（重算深度），並改用戰鬥 `rng` |
| Z4 | 最終階段的 LCG（`seed*9301+49297`）寫了兩份（`:82`、`:130`），沒有用戰鬥 `rng` | 重複實作；同一張地圖每次都挑同一格 | 併入 B，用 `rng.split` |
| Z5 | AOE 詠唱預警區（`activeZones`）也在這裡產生，而且 `isEnemy = team === RED // 假設玩家是藍方` | 職責混雜。展示模式是 AI 對 AI，紅方預警整片填滿、藍方漸進填，兩邊不對稱 | 移到展示層的選擇器，用陣營取代 `isEnemy` |
| Z6 | 塌陷格的掉落動畫寫死重力 `3500`（註解寫 `PHYSICS.GRAVITY`，卻沒有引用）、消失門檻 `-2000`；另有 `999`、`0.001`、`31`、每 5 秒記錄一次等數字 | 魔法數字 | 改用 `constants/combat.ts` 的 `GRAVITY`，其餘移到 `ZONE` 常數 |
| Z7 | 每幀掃全部格子＋複製 Set；格子座標用字串 `split(',')` 解析 | 小型效能浪費 | 隨 Z1 一起改 |

Z1、Z2 是行為 bug，修了會影響戰鬥結果，歸到 O4 的「改值」子輪（不和純搬移混在一起）。

### F. O0 補完清查結果（2026-10-28，explorer 子代理；Codex Luna 因環境沒有 `rg`、輸出亂碼而沒有產出）

- **可達性**：`PAUSE_GAME`／`RESUME_GAME` 只有 `useEngineCommands` 的輔助函式在發，而這兩個函式沒有人呼叫；`useEngineCommands` 回傳的 `resetGame`、`setTimeScale`、`setDirectorEnabled`、`setCameraTuning`、`setZoneConfig` 沒有呼叫端（元件直接用 `send`）；`WindowId` 的 `'skillDb'`、`'vfxMap'`（和 `'vfxmap'` 重複）沒有登記也沒有入口 → 併入 O1。其餘指令、設定欄位、視窗、`useGameApp` 動作都有生產端與讀取端。
- **素材路徑**：沒有斷鏈。`public/assets/factions/blue`、`red` 是預留給正式版陣營素材的空槽位（manifest 為空），屬於設計用途，保留。
- **data 函式的魔法數字**：`SkillSequences.ts` 奧義原型的脈衝、震動、STORM 次數與間隔（約 15 個）；`selectSpriteFrame.ts` 的朝向遲滯、受擊閃白、各動作 FPS 的預設值（約 12 個）→ 併入 O4a／O5。`bodyTypes.ts:67-73` 又是一份 FNV 雜湊 → 併入 B（O5）。
- **文件一致性**：改在 O7 改寫白皮書時由主代理對照。

## 2. 分輪計畫

依 CLAUDE.md 鐵律：**渲染線同一時間只開一條**，非渲染線可以並行。

| 輪 | 內容 | 渲染？ | 執行者 | 驗收 |
| :-- | :-- | :-- | :-- | :-- |
| **O0 補完清查** | 補第 1 節沒涵蓋的部分：功能可達性（設定欄位、視窗、指令有沒有被讀到或觸發）、`data/` 函式裡的魔法數字、動態路徑素材是否真的有載入、`AGENTS.md`／`README`／白皮書的內容與程式碼是否一致 | 否（只讀） | Codex Luna／medium | 產出 findings 表，主代理抽查後併入本檔 |
| **O1 死碼** | C 表全部（白皮書除外）；修 knip.json 讓它解析得到 tools 的路徑；處理 `sharp`；O0 找到的死碼 | 輕微（只刪 VFX 分支） | Codex Luna／medium | lint／test／build、`npm run knip` 乾淨、`runtime-smoke` |
| **O2 建置／部署** | 保留 GitHub Pages：把 `package-lock.json` 納入版控；deploy 改用 `npm ci`、Node 24，build 前先跑 lint＋test；只做小版本升級 | 否 | `worker` | CI 綠燈一次（push 要另外取得同意） |
| **O3 工具／文件** | 直接刪除沒有引用的一次性腳本，刪除清單和最後的 commit 記進 WORKLOG 以便還原；已結案的報告摘要併入 WORKLOG 後刪除（HANDOFF 還在引用的保留）；清冊 CSV 凍結 | 否 | Codex Luna／medium | 加測試：所有 npm scripts、skill、測試引用的路徑都存在 |
| **O4a 規則數值搬移** | A 表的戰鬥、AI、地圖、鏡頭數值搬進 `constants/`，**只搬不改值**；新增 `MagicNumberBudget` 測試 | 否 | Codex Sol／medium（工作樹） | `balance:sim` 固定 seed 結果逐位相同 |
| **O4b ZoneSystem 修正** | Z1～Z7 | 否（Z5 動到預警顯示，要截圖） | Codex Sol／medium（工作樹） | 新增 Z1、Z2 測試；`balance:sim` 前後比對並回報差異；`br-soak` |
| **O5 渲染參數＋雜湊統一** | `hash.ts` 統一；`PartBakers`、Factory、`Synth` 的參數表外移；拆分 `PartBakers` | **是（唯一的渲染線）** | Codex Sol／medium（工作樹） | `perf:fidelity` 0 差異、不重錄基準、`perf:guard`、`render-verify` |
| **O6 UI 顏色** | UI 顏色改用樣式代碼 | 否（UI 樣式） | Gemini 或 Codex Luna | `e2e:ui` 樣式基準 0 差異 |
| **O7 白皮書** | 文字從 TS 字串移到 `docs/ARCHITECTURE_WHITEPAPER.md`，用 Vite `?raw` 載入，下載時代入 `constants` 的即時數值；在設定視窗加回下載按鈕；O1～O5 完成後依新架構改寫內容；合約規定每輪動到架構時同步更新 | 否 | 主代理改寫內容，接線交給 `worker` | 下載的檔案內容與程式碼一致（O0 的比對清單） |
| 暫緩 | 大版本升級（vite 8、TS 7、tailwind 4，各自一輪）；小寫檔名統一（碰到再改）；多段命中機制（併入 BAL） | — | — | — |

順序：O0 先跑；O1、O2、O3 可以並行；O4a、O4b 接在 O1 之後（O1 會改到 `game.ts`）；O5 等目前沒有其他渲染工作時再開；O6 隨時可做；O7 最後做。

## 3. 合約修訂（O1 開工前，主代理親自改）

清理只能做一次；要防止再長回來，規則要放在三個地方：`AGENTS.md` 只寫一行規則；審查和開輪的流程寫進 skill（`review-round` 的衛生檢查、`agent-prompt` 的開工指令），由主代理自己跑；測試負責硬性擋下（隨各輪加入）。代理讀了合約也可能忘記，所以不能只靠合約文字。2026-10-28 已完成 AGENTS §3／§6、`review-round`、`agent-prompt` 的修改；以下測試隨各輪加入：

1. **共用工具只有一份**：亂數用 `engine/math/rng.ts`，雜湊用 `engine/math/hash.ts`，禁止自己寫 PRNG、雜湊、LCG。測試掃描 mulberry32、`9301` 這類特徵常數。
2. **一次性腳本不進版控**：探針、截圖腳本寫在 `tools/ui-e2e/out/`（已被 gitignore）。要 commit 的話，必須被 npm script、skill 或測試引用，否則該輪結束前刪除。測試檢查 `tools/` 裡每個檔案都有被引用（例外要列在允許清單）。
3. **報告隨輪結案**：一輪合併時，報告的結論併入 WORKLOG 後刪除；HANDOFF 還在引用的才保留。由 `review-round` skill 執行。
4. **死碼歸零**：`npm run knip` 必須乾淨，列入驗收指令與 CI。
5. **魔法數字只減不增**：`MagicNumberBudget` 測試。
6. **白皮書同步**：動到架構（Facade、系統邊界、SSOT 位置）的輪次，要在同一個 commit 更新白皮書。

## 4. 進度

| 輪 | 狀態 |
| :-- | :-- |
| O0 | 完成（第 1 節 F） |
| O1 | 合併 2026-10-29（`85d5708`）；`PAUSE_GAME`／`RESUME_GAME` 因有測試保留 |
| O2 | 合併（`edf2d71`）；CI 待 push 後驗證；小版本升級未做 |
| O3 | O3a 工具腳本合併（`55c76cd`）；O3b 已結案報告整理、清冊 CSV 凍結未做 |
| O4a | 未開始 |
| O4b | 合併（`1a2ba4d`）；Z5 移到 O5 |
| O5～O7 | 未開始 |

## 5. 已定案（使用者授權主代理決定，2026-10-28）

- 白皮書：保留並改寫（O7）。
- GitHub Pages：保留，加上測試閘門（O2）。
- 一次性腳本：直接刪除，WORKLOG 記錄還原方式（O3）。
- `VISUAL_SLASH`、`DUAL_STRIKE`：刪除；多段命中留給 BAL。
