# E8 子計畫：編輯器輸入 / 相機 / 生命週期的引擎直接存取 → `UICommand` + `EditorQuery`

> 計畫 §4 規定 E8 動工前要先寫子計畫並取得核准。**本文件的預設決策（D11–D14）由主代理依「風險最小、可回退」原則擬定，使用者已授權在無其他問題時整串執行**；若使用者回來想否決任一項，只需回退對應 commit（每步獨立、有本地 tag）。
> 防線：T1e 已建立「點 canvas 選單位」的 e2e 手法；本子計畫第 E8-0 步會先補齊**編輯器行為的 e2e**，**先寫測試、確認在現有程式上全綠，再動手遷移**。

## 現況盤點（2026-10-10 實測）

E9 棘輪目前 `directEngineMutation=8`、`directAgentMutation=1`、`directRendererAccess=5`，但這些正規式**漏看了方法呼叫與非 `agent.` 命名的寫入**。實際直接存取如下：

| 位置 | 直接存取 | 性質 |
| :-- | :-- | :-- |
| `useGameInput.ts` `executePaintAction` | `engine.map.removeObstacle/setObstacle`、`engine.removeAgent`、`engine.addAgent`、`agent.role=…; saveState(); engine.resetAgent` | 低頻寫入（點擊/塗刷） |
| `useGameInput.ts` pointerup | `engine.updateAgentPosition`、`a.px/py=…`、`a.dragOverQ/R=null`、`engine.map.setObstacle/removeObstacle` | 低頻寫入（放開時提交） |
| `useGameInput.ts` pointermove | `a.px/py/dragOverQ/dragOverR = …`（拖曳預覽，**每幀**）、`renderer.camera.applyPanOffset`（每幀） | **高頻** |
| `useGameInput.ts` 查詢 | `engine.getAgentAt/isValid/hasObstacle/isBlocked/getTerrainHeight/map.obstacles.get/renderer.grid.spatialCache/getHexAtScreenPoint` | 唯讀 |
| `useGameApp.ts` | `engine.addAgent`（開場配置）、`engine.stop/clear/play`、`engine.mapConfig.w/h/layout=…`、`randomizeEnvironment` | 生命週期 |
| `useGameCamera.ts` | `engine.screenW/H/screenAspect=…`、`renderer.camera.snapTo` | 低頻 |
| `useCameraControl.ts` | `renderer.camera.applyZoom`（滾輪/捏合） | 中頻 |
| `useGameLoop.ts` | `engine.screenAspect=…`、`engine.tick(sdt)`、`engine.battleTime += sdt` | 驅動迴圈 |
| `GameCanvas.tsx` | `engine.renderer = rendererRef.current` | 綁定（保留，視為組合根） |

## 決策（預設值）

- **D11 拖曳預覽的每幀寫入保留為「文件化例外」**：`a.px/py/dragOverQ/dragOverR`（單位與障礙物）是**視覺預覽**，放開時由 `MOVE_AGENT`（或復位）提交/還原；不改 renderer（避免大爆炸半徑）。在 `AGENTS.md` §1.5 補一句「拖曳預覽的暫態座標為刻意例外，狀態變更仍須經命令提交」，並在 E9 以具名白名單呈現（不是放寬正規式）。
- **D12 鏡頭操作走命令**：`CAMERA_ZOOM`、`CAMERA_PAN`、`CAMERA_SNAP`、`SET_VIEWPORT` 由 `renderer.ts` 訂閱 `UI_COMMAND` 處理（延伸 E2 的 `SET_CAMERA_TUNING` 模式）。**效能守門**：`CAMERA_PAN` 是每幀事件，事件走 `GameEventPool`；E8-e 的 e2e 用 `requestAnimationFrame` 計數量測拖曳期間 FPS，若相對改前下降 >10%，**把 `CAMERA_PAN` 還原為直接呼叫並列為第二個文件化例外**（`CAMERA_ZOOM/SNAP/VIEWPORT` 仍走命令）。
- **D13 遊戲驅動迴圈（`engine.tick` / `battleTime`）**：先 `grep` 確認所有 `tick(` 與 `battleTime` 寫入點；僅當「把 `battleTime += sdt` 移進 `engine.tick` 內」不改變任何現有測試/行為時才做（`engine/game.ts` 屬 Facade，這是**有意的公開語意修改**，需在 commit 訊息與報告說明）。若 `tick` 有其他呼叫者（測試、Showcase）會造成重複累加 → **不做，記為文件化例外**。`engine.screenAspect` 改走 `SET_VIEWPORT`。
- **D14 `GameCanvas` 的 `engine.renderer = rendererRef.current`** 視為組合根綁定，保留並加白名單。

## 新增命令與查詢

`UICommand` 追加（型別在 `types.ts`，驗證/寫入在 `UICommandSystem`，**越界/無效一律忽略不丟例外**，與 E2 同規則）：

| 命令 | 欄位 | 取代 |
| :-- | :-- | :-- |
| `PLACE_AGENT` | `team, q, r, hp, role?` | `addAgent`（含 DRAFT 的 `role=…; saveState; resetAgent`） |
| `REMOVE_AGENT_AT` | `q, r` | `removeAgent` |
| `SET_OBSTACLE` / `REMOVE_OBSTACLE` | `q, r, obstacleType?` | `map.setObstacle/removeObstacle` |
| `MOVE_AGENT` | `agentId, q, r` | `updateAgentPosition`（內含 `isValid/isBlocked` 驗證，並把 `px/py` 對齊格心） |
| `START_GAME` / `STOP_GAME` / `CLEAR_BOARD` | `CLEAR_BOARD: keepScene, skipRebuild` | `play/stop/clear`（`PAUSE/RESUME` 已存在） |
| `RANDOMIZE_MAP` | `w, h, layout` | `mapConfig.w/h/layout=…` + `randomizeEnvironment()`（範圍進 `UI_SETTINGS`） |
| `SPAWN_TEAMS` | `team, hexes[]` 或沿用 `PLACE_AGENT` 批次 | `internalSpawnTeams` 的 `addAgent` 迴圈 |
| `CAMERA_ZOOM` / `CAMERA_PAN` / `CAMERA_SNAP` / `SET_VIEWPORT` | 見 D12 | `applyZoom/applyPanOffset/snapTo`、`screenW/H/Aspect=` |

`EditorQuery`（純函式，放 `engine/systems/ui/selectors.ts` 或新檔 `editorQueries.ts`，唯讀，無副作用）：`queryAgentAt`、`queryIsValidHex`、`queryHasObstacle`、`queryObstacleTypeAt`、`queryIsBlocked`、`queryTerrainHeight`、`queryMapKeys`、`queryHexAtScreenPoint`（封裝 `renderer.grid.spatialCache` 與 `getHexAtScreenPoint`）。`useGameInput`/`useGameApp`/`useGameCamera` 只能 import 這些與 `useEngineCommands`。

`RESET_GAME`（F3）：一併補上訂閱者或移除未用命令（擇一，報告說明）。

## 分段（每段 ≤3 檔、各自 commit + 本地 tag `ui-ckpt-E8x`、各自驗證）

| 段 | 內容 | 檔案 | 驗證 |
| :-- | :-- | :-- | :-- |
| **E8-0** | **先寫 e2e（現況必須全綠）**：`editor` 套件，用 `__TACTICAL_ENGINE__` + 以 `renderer.getHexAtScreenPoint` 暴力掃描建立「hex→螢幕座標」輔助函式：①ADD_BLUE/ADD_RED 點擊新增（agent 數 +1、位置正確）②DELETE 刪單位與障礙 ③OBSTACLE 放障礙 ④SELECT 拖曳單位到合法格（q,r 更新）與非法格（還原）⑤拖曳障礙物到合法/非法格 ⑥DRAFT 模式新增指定職業 ⑦滾輪縮放改變 `camera.zoom` ⑧空白處拖曳平移改變相機（記錄改前 FPS 基準供 D12 用）⑨「重新開始/清空/隨機地圖」類按鈕（讀 `MapEditorToolbar`/`PlaybackHUD` 實際按鈕）⑩開始/暫停。**同時擴充 E9**：新增指標 `directEngineMethodCalls`（`engine\.(addAgent\|removeAgent\|resetAgent\|updateAgentPosition\|stop\|play\|clear\|randomizeEnvironment)\(` 與 `engine\.map\.(setObstacle\|removeObstacle)\(`）與 `directPoseWrites`（`\.(px\|py\|dragOverQ\|dragOverR)\s*=[^=]`），baseline 設為**當下實測值**（只准減）。 | `tools/ui-e2e/windows.e2e.mjs`、`tests/UIBoundary.test.ts`、baseline | 連跑兩次穩定；任一動作找不到穩定入口 → 該項標「未驗證」並**停下回報**（不得在沒有防線下遷移該動作） |
| **E8-a** | 型別 + `UICommandSystem` 處理器 + 單元測試：`PLACE_AGENT/REMOVE_AGENT_AT/SET_OBSTACLE/REMOVE_OBSTACLE/MOVE_AGENT/START_GAME/STOP_GAME/CLEAR_BOARD/RANDOMIZE_MAP`（越界、重複格、已有單位/障礙、未知 agent、非 finite）；`UI_SETTINGS` 補地圖尺寸範圍。 | `types.ts`、`UICommandSystem.ts`、`constants.ts`（測試不計） | lint/test/build |
| **E8-b** | `EditorQuery`（純函式）+ 單元測試（參考穩定性不需要；測回傳值正確、無副作用）。 | 新增 `editorQueries.ts`、`tests/EditorQueries.test.ts` | lint/test/build |
| **E8-c** | `useGameInput` 的**低頻寫入與全部查詢**改走命令/查詢：`executePaintAction`、pointerup 的 `MOVE_AGENT`/障礙提交、`pointerdown` 查詢；**D11 的每幀預覽寫入保留並加註解標明例外**。 | `useGameInput.ts`（+ `useEngineCommands.ts` 如需新增捷徑） | lint/test/build/**e2e（E8-0 的 ①–⑥ 全過）** |
| **E8-d** | `useGameApp` 生命週期：`SPAWN`/`CLEAR_BOARD`/`RANDOMIZE_MAP`/`START/STOP` 改命令；移除 `engine.mapConfig.*=`。 | `useGameApp.ts` | lint/test/build/e2e（⑨⑩ 與 Showcase 套件） |
| **E8-e** | 鏡頭：`CAMERA_ZOOM/PAN/SNAP`、`SET_VIEWPORT` 命令 + `renderer.ts` 訂閱（唯一允許動的引擎檔改動：新增訂閱分支）；`useCameraControl`、`useGameCamera`、`useGameInput` 的 pan、`useGameLoop` 的 `screenAspect` 改命令。依 D12 做 FPS 守門。 | `renderer.ts`、`useCameraControl.ts`、`useGameCamera.ts`（`useGameInput.ts`/`useGameLoop.ts` 的單行改動拆成 E8-e2） | lint/test/build/e2e（⑦⑧ + FPS 守門） |
| **E8-f** | D13：依 grep 結果決定是否把 `battleTime` 累加移進 `engine.tick`；`useGameLoop` 只剩 rAF 與 `tick`。補單元測試（累加一次、`!isRunning` 不累加）。若判定不做，在 `useGameLoop.ts` 加註解並加入白名單。 | `engine/game.ts`（僅在判定可做時）、`useGameLoop.ts` | lint/test/build/e2e（Showcase 一場完整對戰能結束並進入下一場） |
| **E8-g** | 收尾：`RESET_GAME` 處置（F3）；E9 baseline 下調到最終值，白名單（D11/D14/可能的 D12/D13 例外）以**具名檔案+行為說明**列在 `tests/UIBoundary.test.ts` 內；`AGENTS.md` §1.5 補 D11 例外句；更新計畫文件與報告。 | `AGENTS.md`、`UIBoundary.test.ts`、baseline、docs | lint/test/build/e2e |

## 風險與防護

- **編輯器是使用者最常用的路徑**：E8-0 先有防線；每段完成打本地 tag（`ui-ckpt-E8c` 等），出問題 `git revert` 單段。
- **放開時的狀態一致性**：`MOVE_AGENT` 必須處理「拖曳預覽把 `px/py` 改到別處」後的復位（成功→對齊新格；失敗→回原格並清 `dragOverQ/R`），單元測試覆蓋。
- **事件池**：新增命令欄位要同步 `GameEventPool` 重設（上次漏過 `absorbed`）。
- **命令順序**：同一幀多個命令（例如先 `REMOVE_AGENT_AT` 再 `PLACE_AGENT`）依 `bus.emit` 順序同步處理，不得改成延遲佇列。
- **範圍紀律**：不重構 renderer/grid；遇到需要動 `engine/**`（除已列的 `renderer.ts` 訂閱與 D13 的 `game.ts`）一律停下回報。
