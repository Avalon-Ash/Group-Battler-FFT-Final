# 主代理交接手冊（工具無關：Claude Code／Antigravity 皆可讀）

> 更新：2026-10-19 深夜（VFX V1～V7＋奧義 U1＋障礙物 O＋地形 T2～T5，見 §3 K～M；下一步照 `docs/VISUAL_ROADMAP.md` §0：障礙物 O、地形 T2～T5）。新對話的主代理 **先讀本檔再開工**，不要重新探索專案；`AGENTS.md` 是審查 diff 時的檢查清單。
> 歷史細節（已完成輪次的提示詞／報告／基準）在 [`docs/archive/`](archive/) 與各 `docs/*REPORT*.md`，**平常不用讀**。

## 0. 省點數守則（使用者額度有限，最重要）
- 使用者之前在 Antigravity 花了很多點數（含一次在 AI Studio 燒掉 400 元卻交出壞掉的畫面）。**Claude Code 的主代理請把工作壓到最小**。
- **分工**：長時間、機械性、無人值守的實作交給低階代理（IDE 端 Gemini：`/goal docs/<PROMPT>.md`；額度多）；主代理只做 ① 設計／寫提示詞 ② 審查 diff ③ 小修 ④ 本機驗證 ⑤ 合併。
- **審查要便宜**：先 `git diff main...<branch> --stat`，只讀**程式碼**變更（`engine/`、`components/`、`data/`、`constants.ts`）；**不要整份讀 `docs/*REPORT*`**（代理報告常誇大，只看數字表與回退指南）；用 `grep`／`Select-String` 抓關鍵字；每次只讀一小段。
- **不要重複量測**；少截圖；回覆精簡；一次對話做完一輪就收。
- Claude Code 內用 `/compact` 壓縮上下文；本檔＋`AGENTS.md` 足以在新對話重建全部上下文。

## 1. 專案與紀律
- **專案**：TACTICAL.OS（Vite + React 19 + TS + HTML5 Canvas 2.5D 等距六角戰棋）。遠端 `https://github.com/Avalon-Ash/Group-Battler-FFT-Final.git`（目前只有 `main`）。
- **治理規則全在 `AGENTS.md`**：`Agent` 純資料（不加方法）、SSOT 在 `types.ts`／`constants.ts`／`data/**`、禁 `as any`、禁魔術數字／硬編碼顏色、tick／渲染迴圈禁 `console.log`、單次改動 ≤3 檔（超過先說明策略）、改完 `npm run lint`／`npm test`／`npm run build`，渲染變更再加 `npm run perf:guard`、禁 Three/Pixi/WebGL、素材 URL 用 `import.meta.env.BASE_URL`、子系統只透過 `engine.bus`、UI 只經 `UICommand` 寫入引擎。
- **鐵律**：**未經使用者明確指示不得合併進 `main`、不得 push**（合併與 push 要分開問）。低階代理在某個工作樹跑的時候，不碰那個工作樹、不跑 e2e／perf／Blender 等重工作。
- **使用者**：繁體中文；要簡潔、GitHub markdown；能自己做的（量測、安裝）就自己做；不確定就問。
- **使用者機器**：Windows、RTX 4070、Ryzen 7800X3D、主螢幕 2560×1440 @ 239 Hz（量測用）、副螢幕 59 Hz（AMD 內顯，會污染量測要避開）、Python 3.10、Node 24、`msedge` 供 Playwright。
- **PowerShell 陷阱**：終端機中文亂碼但檔案是 UTF-8；新檔寫 LF，多數原始檔是 CRLF（編輯保持原行尾）；巢狀引號易 ParserError，複雜字串改寫檔；字串內 `\r\n` 不會展開（用反引號）；**絕不輸出 `&gt;`／`&lt;` 之類 HTML 實體**；`git push` 的進度輸出會被當 stderr（退出碼 1 不代表失敗，看 `main -> main` 那行）。

## 2. Git 狀態（2026-10-16）
- **單一主線**：`C:\Git\Group-Battler-FFT-Final`，分支 `main`。主代理與 IDE 代理都在這個資料夾工作。若 `git worktree list` 還看得到 `Group-Battler-main`／`-death-vfx`／`-chore`，代表搬遷步驟尚未做完。
- `main` 已含：大逃殺修正、死亡特效／擊飛、AI Studio 清理、文件整理、合約改版（`CLAUDE.md`／`AGENTS.md`／`.claude/agents/`）、README 更新。push 狀態以 `git status -sb` 為準。
- **美術／特效改造已合併（2026-10-16）**：進度、決策在 `docs/ART_VFX_PLAN.md`，規格在 `docs/ART_SPEC.md`（§0 世界觀、§13 詠唱／中斷）。全部 50 個奧義已改六角零件版；光束本體仍是程式繪製（待新增 beam 零件）。HD 為主線，SD 原型已移除（tag `pixel-proto-ckpt`）。目前沒有進行中的分支。
- **開新一輪的流程**：主代理寫 `docs/<NAME>_AGENT_PROMPT.md` → 從 `main` 開分支（例如 `feat/<topic>`），在原生資料夾切過去 → 使用者在 IDE 執行 `/goal docs/<NAME>_AGENT_PROMPT.md` → 跑完告訴主代理 → 主代理審查、修正、本機實跑 → 使用者同意才合併，push 另外問。代理跑的期間主代理對該資料夾只讀不寫。
- **真的需要並行時才開工作樹**（命名 `C:\Git\Group-Battler-<topic>`，`node_modules` 可用 junction 指回原生資料夾）。移除時**先刪 junction**（`cmd /c rmdir <path>\node_modules`）再 `git worktree remove`，否則可能連帶刪掉原生資料夾的 `node_modules`。
- 本地 tag（`perf*-ckpt-*`、`ui-ckpt-*`、`audio-ckpt-*`、`art-ckpt-*`、`br-fix-final`、`docs-cleanup-final`）未推，可忽略。

## 3. 最近完成的工作（2026-10-15～16）

### A. 大逃殺（縮圈）兩大 bug
- **殘影根因**：`ZoneSystem` 縮圈殺人繞過 `handleDeadState`；`PhysicsEngine` 凍結死者物理；`deathTimer` 兩個寫入者。現在所有死亡都走唯一入口 `agentManager.handleDeadState`，失去地面的屍體會往下掉，`PhysicsEngine` 只設 `outOfBounds`，`fullyDead` 由 `updateDeathState` 回收。
- **發呆根因**：`ai_profiles.ts` 的 `Combat` 是 SEQUENCE，技能全部冷卻時整串失敗、追擊與 Idle 都不跑。改為 `Combat Actions` SELECTOR；被困時改為衝向目標。
- **審查時我拿掉的**：代理加的「發呆看門狗」（B0 的 IDLE 實測 0 次，屬掩蓋症狀，且改到 facade `game.ts`）。
- **重現工具**：`node tools/ui-e2e/br-soak.mjs --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`（修正後 20/20 乾淨）。細節見 `docs/BR_FIX_REPORT.md`（開頭有審查修正說明）。

### B. 死亡特效／擊飛
- `deathTimer` 單一寫入者後，死亡動畫與屍體殘留（`DEATH_ANIM_DURATION`=5.5 秒）才真的會跑。擊飛：`data/units/appearance/deathMotion.ts`（純函式，依 `deathTimer` 與 ragdoll 軀幹初速推導），參數 `constants.ts` 的 `DEATH_KNOCKBACK`；`UnitSystem` 把滑行位移併入繪製位置與深度排序鍵。死亡粒子：塵煙＋火花（`DEATH_VFX`）。
- **待使用者實機確認**：擊飛距離／彈跳手感、是否閃爍、5.5 秒殘留是否太久。

### C. 文件整理
- 報告 `docs/CLEANUP_REPORT.md`。過期註解與文件已校正、已完成的提示詞歸檔、刪除零引用死碼（`RagdollPhysics`、`SpriteManager.getUnitLayersFull`）。C2～C4 的 build 雜湊與 `main` 相同（證明沒改行為）。`docs/ASSET_NEEDS.md` 仍有未完成需求，保留。

### D. 地形 R1：光照與高度接合（2026-10-16 合併）
- R0 證據：高度感是 A1 換貼圖時丟失（側面明暗只疊 35%），與烘焙快取無關。
- 修法：`bakeBlock` 先以光照漸層全強度填底，再以 `TERRAIN_SKIN.topDetail`／`sideDetail`（overlay 0.5）疊貼圖；`GridCache` 在 `mapVersion` 變動時算 6-bit 鄰格高度遮罩（key bit 25-30），烘焙崖邊亮邊、接觸陰影、平接邊淡化（`TERRAIN_SKIN.edge`）。每幀成本不變。
- 量測工具 `tools/ui-e2e/terrain-contrast.mjs`（`--grid` 產生新舊對照）；報告 `docs/TERRAIN_R1_REPORT.md`（含調整手冊）；保真基準已重錄。
- 已知（後續已修）：島嶼左下底部切平線（10/17 修）；VOID／FOREST 頂面偏暗（T0 曝光修，§3 J）（換地圖不清其他地形已修：`evictOtherThemes`；縮放級距另加遲滯 `RENDER_CACHE.SCALE_HYSTERESIS`）。

### E. 熔岩／虛空卡頓與生命週期（2026-10-16 合併）
- 根因：漂浮地圖把浮動位移算進地形 sprite 快取鍵，每個縮放級距 1500+ 種組合，導演鏡頭縮放跨 1.5 級距時超過 `MAX_TERRAIN_SPRITES` 而不斷擠出重烘焙（實戰 p99 VOID 204 ms、MAGMA 125 ms）。修法：浮動改為繪製時整塊平移（`TerrainRenderer.drawBlock`）。縮放掃描 p99：VOID 86.8→13.0 ms、MAGMA 103.1→17.1 ms（FOREST 對照 17.1 ms），0 擠出。
- 「越跑越卡」：11 分鐘、33 場對戰沒有找到洩漏（heap、DOM、監聽數持平）。工具：`tools/ui-e2e/terrain-float-probe.mjs`、`perf-lifecycle-soak.mjs`；報告 `docs/PERF_LIFECYCLE_FINDINGS.md`。
- 量測工具已強制高效能 GPU（`tools/ui-e2e/lib/perf-common.mjs`），不必改 Windows 設定。

### F. 2026-10-16 晚間批次（已合併）
- 地形快取：縮放級距只做升級遲滯（`RENDER_CACHE.SCALE_HYSTERESIS`）、換地圖丟其他主題（`evictOtherThemes`）。
- 死碼清理（`tsc --noUnusedLocals` 非測試 0 筆）；`CAST_BREAK` 原播放未登記的 `FX_CAST_SHATTER`（從未顯示），已改 `FX_CAST_BREAK`，新增 `tests/VFXRegistryKeys.test.ts` 防止特效鍵對不上。
- 技能改名 31 個（`docs/SKILL_NAMES.md`）；手機 UI 修正（`docs/MOBILE_UI_AUDIT.md`，桌面樣式 0 差異）；狀態所有權設計 `docs/STATE_OWNERSHIP_DESIGN.md`（P0～P12 遷移計畫，`visualStatus` 疑似 4 個寫入者待 P1a 測試證實）。
- 美術：零件六角化、§13 詠唱中斷碎裂（`tools/vfx/cast-break-shot.mjs`）、地面法陣不蓋腳（`RenderList.sort` 把站在法陣內的單位排到法陣後）、50 個奧義零件化。
- 狀態所有權 P0～P2：`engine/core/AgentOwnership.ts` 所有權表＋`tests/AgentOwnership.test.ts` 棘輪；`visualStatus` 改由 `AnimationSystem` 從 `ccVisual` 推導（修好 FROZEN／POLYMORPH／INVINCIBLE 從未顯示）；`hitFlashTimer`／`visualOffset` 經 `triggerHitFlash`／`triggerHitShake`。下一步 P3 起見設計文件。
- 效能五：去 SHOUT `shadowBlur`、快取漸層與光暈文字（`RENDER_HOTSPOT_CACHE`、`SHOUT_GLOW`），`docs/PERF_REPORT_5.md`；`perf:frames` 前後差異在 239 Hz 量化雜訊內，未證實加速。
- 注意：`.claude/worktrees/` 下的子工作階段工作樹會被 vitest 掃到；只跑本 repo 測試用 `npx vitest run --dir tests`。

### G. 待使用者決定
- 已決定（2026-10-16）：刪除 Dockerfile／`server.js`／`.dockerignore`／`start` 指令與 README 的 Cloud Run 段落（全部搞定後再重新部署）；刪除與 `public/assets/units/` 完全相同的 `art-source/sprites/`，保留 `art-source/terrain_grid.jpg`（地形處理工具的來源圖）。

### H. 2026-10-17 批次（已合併）
- 單位：棋座核心晶體（`UnitCorePainter`），施法／投射物／光束起點改 `VisualMath.getCoreAnchor`（`docs/PEDESTAL_CORE.md`）；編輯模式拖曳只移動棋座＋核心。死亡保留陣亡方向、屍體擊飛到已塌陷格會墜落、單位不再陷進較高的柱子（`getUnitGroundHeight` 取精靈所在較高格）。
- 大逃殺：行為樹明確優先序，不再有空轉 SUCCESS（`tests/AIIdlePriority.test.ts`）。
- 子代理成本：`.claude/settings.json` 設 `CLAUDE_CODE_SUBAGENT_MODEL`，PreToolUse hook `tools/hooks/agent-guardrails.mjs` 擋沒指定模型／指定 Opus 的 `start_session`，以及在 `.claude/worktrees/` 內的 npm 安裝。
- **座標協議（`fix/coordinate-protocol`）**：`RenderSpec.ts` 改寫為現行協議 v2.0（層序、sortBias、座標系、SSOT 錨點、漂浮位移）；合約加上「改規則就在同一個 commit 更新 RenderSpec 與檔頭」；`tests/CoordinateProtocol.test.ts`（基準只減不增）擋住偏離。修掉的錯位：VOID／MAGMA 漂浮只有地塊在浮（現在單位、屍體、狀態、HUD、法陣一起浮，`VisualMath.floatBobAt`）、單位附著粒子與 SHOUT 用邏輯格高度、致命一擊特效畫在高台底下。稽核表 `docs/COORDINATE_AUDIT.md`；驗證工具 `tools/ui-e2e/float-align-probe.mjs`。

### I. 2026-10-17～18 座標／繪製順序整輪（已合併並 push，52bea09）
- **C EventPos**：事件 `pos.z` 一律是世界高度（`EventPos` 輔助＋inlinePos 棘輪）。**A UnitFrame**：每幀一份單位繪製座標快照（`UnitFrameStore`），所有渲染讀它。
- **D `npm run verify:coords`**：執行期守門（float／sink／flicker／order），報告 `docs/COORD_GUARD_FINDINGS.md`。**E 貼地鋪設＋腳下格遲滯**（`GroundDrape.ts`、`UNIT_FRAME.HEX_HYSTERESIS_PX`）：閃爍振盪 3,340 → 約 600，sink 0。
- **br-soak 時鐘**：單調合成時鐘，battleTime < 5 秒的種子判失敗。**ForcedMove**：擊退／突進遵守地形高度，撞牆造成傷害。
- **景深 oracle**（`tools/ui-e2e/lib/depth-oracle.mjs`，`docs/DEPTH_ORDER_FINDINGS.md`）＋修正：障礙／危害不再加 `h*0.7`、overlay sortBias 0；穩定排錯 449 → 約 61。
- **F 核心投影**：發射點＝受擊點＝投影中心（`getCoreAnchor`），血條錨在投影頭頂。**突進殘影**：用真實精靈投影、`PhysicsSystem` 唯一寫 `trailHistory`、突進技能統一 `DASH_ASSAULT`。
- **殘差（H3／H4／AURA）**：空中特效排序鍵＝足跡 Y＋固定 `VFX_RENDER.AIR_SORT_BIAS`（刪 `z*20`／`+60`）；單位排序腳點死區 `UNIT_FRAME.SORT_DEADBAND_PX`=2（根因是受擊彈簧的 1～2 px 擺盪）；AURA 依 oracle 證據拿掉 `h*0.7`（`TERRAIN_SORT_SCALE` 已刪）。verify:coords 振盪 578 → 141（靜止 52 → 2），oracle（含 AURA）穩定排錯 361 → 74，保真 0 重錄。剩 UNIT×VFX 93（雙方真的在動，保留）。詳見 `docs/COORD_GUARD_FINDINGS.md` §8
- **新規則**：渲染／座標工作一次只開一條；重錄保真基準要附新舊差異圖並在獨立 commit 寫明；hook 要求渲染任務說明引用 `RenderSpec.ts`。
- 注意：排程／無人值守的執行不能 `start_session`，改用 `Agent`（Sonnet、`isolation: worktree`）。
- **狀態所有權 P4a～P6**（同批合併）：vitals API（`applyHeal`／`applyLethal`／`absorbWithShield`）、`movement/MotionCommands.ts`（`stopMovement`／`teleportTo`）、危害減速改純函式 `getHazardSpeedMult`（離開危害立即恢復，battle_frozen 因此重錄）、`physics.*` 累加器守門。**P7a 前提不成立**：嘲諷鎖定只在 `TargetingSystem.updateTarget`，拿掉 `CCManager` 的 `target.target = source` 會讓嘲諷失效，需改 `BTRegistry.HasTarget`（`tauntTimer > 0` 時重選目標）才能做；P7b、P8 未做。紀錄在 `docs/STATE_OWNERSHIP_DESIGN.md` §6。最終 verify:coords 振盪 65、br-soak 10/10。

### J. 2026-10-18 VFX 零件化收尾＋地形 T0～T1（已合併）
- **路線圖** `docs/VISUAL_ROADMAP.md`：§0 總順序（VFX V1～V7、障礙物 O0～O4、地形 T0～T5 都是渲染工作，串行）、§D 待決定。管線地圖與每輪紀錄在 `docs/VFX_PIPELINE_MAP.md`。
- **VFX**：150／150 技能只用零件（光束 6 樣式、HEAVEN_FALL、MANA_BURN、死亡碎裂、護盾火花、詠唱中斷、出場／待機等共用資產）。`PARTICLE_TRAITS`（constants.ts）是粒子後端的唯一來源，`tests/VFXBackend.test.ts` 棘輪只剩 ATMOSPHERE（天氣，T4）、BEAM、GENERIC_DEBUG。ProceduralPainter／GroundPainter 已刪，PROC／GROUND 型別只畫洋紅除錯點。探針 `tools/vfx/vfx-coverage.mjs`＋`vfx-coverage-report.mjs`；單張對照 `tools/vfx/fx-shot.mjs`。
- **保真 harness**：展示戰鬥在種子前就借用 `Math.random`，特效抽數一變鏡頭就偏；`render-fidelity.mjs` 載入後立即 `__resetSeed(1337)`。
- **CC 外觀**（子代理合併）：變羊是烘焙的羊、冰凍是六角冰塊（`PolymorphPainter`／`FrozenPainter`、`data/units/appearance/ccBody.ts`）。
- **障礙物素材**：已下載 CC0 的 KayKit Forest Nature／Dungeon Remastered／Medieval Hexagon 與 Kenney Nature Kit 到 `_asset_stagingssets3d\`（`docs/ASSET_LEDGER.md` §6），O1 Blender 管線尚未開始。
- **地形 T0**：`TERRAIN_SKIN.exposure`（每群系增益，烘焙最後乘上）＋`lumaBudget` 45～90；`terrain-contrast.mjs` 驗收預算。保真 5 地形＋battle_frozen 因此重錄（差異圖只落在地塊）。**T1**：三項已知缺陷都已不成立或已修，`tools/ui-e2e/biome-frames.mjs` 量各地圖真實幀間隔。
- 未決（使用者）：`.claude/worktrees/` 剩 11 個資料夾無法自動刪（權限），需手動刪；未合併分支 `20260328`、`experiment/unit-rig-skin-poc`；網格線樣式改動（路線圖 D2）。

### K. 2026-10-19 VFX V4～V7＋座標殘差（已 push，f72eb86）
- **V4 投射物**：`missile` 零件、單一表 `data/vfx/projectile_visuals.ts`、`ProjectilePartPainter`；修 `dipAmount` 從未傳入。**V5a**：舊粒子型別／貼花／舊貼圖死碼刪除。
- **V5b**：詠唱環／聖域／光點／能量柱、護盾（新 `prism` 零件）、危害（共用零件層 `data/vfx/parts/partLayer.ts`＋`vfxparts/PartLayerPainter.ts`，重力漩渦只畫中心格）、AOE 預警全部零件化；`VolumePainter`、`UnitFlightPainter`、`UnitAmbientPainter`（頭上藍框紅點）刪除。HUD：血條預烘焙 sprite、渲染路徑 0 個每幀 `shadowBlur`、量表顏色改讀 `STATUS_VISUALS`。格線疊層／縮圈／死亡繪製器的數字進常數。
- **回歸修正**：V5a 刪貼圖後危害與單位陰影畫成洋紅除錯方塊；`VFXFactory.getTexture` 改收封閉型別 `VFXTextureType`，不支援的名稱編譯不過。
- **座標**：屍體滑停在格界時腳下格滯後卡在舊格、被自己那格地塊蓋腳 → 靜止 `HEX_RELEASE_FRAMES` 幀後放開（每次靜止一次）。景深預言穩定錯序 pair-frames 1,727 → 668，閃爍振盪 53 → 57（`docs/COORD_GUARD_FINDINGS.md` §9）。
- **V6**：`fx-shot --scene=` 量亮底發白 → 加法零件群系增益 `VFX_BIOME_GAIN`、火焰本體一般混合；隕石落點影子；光束兩端光點。**V7**：`vfx-storm` 改真實入口、零件快取擠出統計、柔邊零件 1 倍烘焙；battle_frozen 一次性重錄（`359bc66`，附證據）。
- **待使用者**：在 239 Hz 主螢幕跑 `npm run perf:frames`（本機 harness 這次只有 56 Hz）；實機看冰／沙地圖特效亮度、護盾稜柱、危害新外觀；push 未做。
- 細節：`docs/VFX_PIPELINE_MAP.md` §4.11～§4.15；README 的「視覺管線」段落已更新。
### L. 2026-10-19 晚 實機回饋＋奧義 U1（main，未 push）
- `perf:frames` 238 Hz：平穩 p99 16.7 ms、壓力 24.8 ms、展示 12.6 ms；零件快取 96 MB。冰／沙增益各提亮 10%，重力漩渦加強。
- **U1**：奧義序列對齊傷害幀（`VFXSequence.hitAt`＋`startDelay`）、打斷即取消、`scale` 真正套用（`Particle.fxScale`）、共用命中包 `FX_ULT_IMPACT_*`、參數 `ULT_SEQUENCE`。50 個奧義結構都修了；個別奧義美術細調可續做。細節 `docs/VFX_PIPELINE_MAP.md` §4.16。
- 保真 harness 固定地圖＋暖機；VOID／battle_frozen 重錄（`681e07e`，附證據）。
- 清理：`.claude/worktrees/` 已清、本地分支 `20260328`／`experiment/unit-rig-skin-poc` 已刪（遠端仍在）。
- 下一步：照 `docs/VISUAL_ROADMAP.md` §0 跑 O1～O4、T2～T5（熔岩液面、草地擺動等網格上特效仍是程式繪製，屬 T2～T3）。
### M. 2026-10-19 深夜 障礙物 O1～O4＋地形 T2～T5（main，未 push）
- 障礙物預渲染（Blender 腳本在 `tools/assets/blender/`，素材在 `_asset_staging/assets3d/`）、熔岩液面重繪（影格表 `LoopSheet`）、草叢與地表裝飾、落差描邊降對比、天氣零件化（ATMOSPHERE 與看板路徑刪除）。細節 `docs/VFX_PIPELINE_MAP.md` §4.17。
- 保真重錄兩次（`ad64afd`、`f312187`，證據在 `tools/ui-e2e/out/fidelity_o2_evidence.png`、`fidelity_t2_evidence.png`）。
- 未做（可選）：O3 樹木風擺／冰晶閃光、T2 變體 4→8 與崖邊草垂／積雪簷、T3 低處霧氣／光柱／熱浪。
- **待使用者**：實機看新障礙物、熔岩、草叢與天氣；push 未做。

## 4. 已完成輪次與審查結論（精簡）
- **效能四（2026-10-12 合併）**：`?perf` HUD、`perf:frames`／`perf:attribution`、去 `shadowBlur`、`VFX_BUDGET`。我調過品質治理器門檻（`RENDER_QUALITY.DOWN_MS` 14／`UP_MS` 9）。當時列的殘留熱點（`TextPainter`、`ProjectileDrawer`、`ProceduralPainter` 等）已在 2026-10-19 全部清除或零件化（§3 K）。
- **美術（合併）**：KayKit 預渲染精靈 10 張（`public/assets/units`，manifest 在同目錄）＋地形貼圖 10 張＋粒子貼圖 5 張；體型軸 `Team×Role×BodyType`（MALE 有素材）。
- **AI Studio 的「美術修正輪」（`8c014d1`）— 我審查後修補的重點**：
  1. **畫面凍結**：`useGameApp` 在 React StrictMode 清理時立刻 `engine.destroy()` 並重用 → 引擎永遠停止。已改為**延後一個 tick 銷毀、重新掛載則取消**。
  2. **誤刪必要檔案**：它把 `ImperialTokenFactory`／`CovenantTokenFactory`（仍負責單位腳下底座與職業圖示）當舊管線刪掉，底座變成實心圓。已從 `b4b0b20` 復原（連同 `MaterialPainter`、`imperial.ts`／`covenant.ts`／`types.ts`／`index.ts`、`materialConfig.ts`、`UnitFactory.ts`）。
  3. **地形烘焙卡頓**（熔岩地圖個位數 FPS 的主因）：快取鍵含浮動相位×縮放級距，容量滿時**整個清空**造成重烘焙風暴。已加「每時間窗烘焙預算＋借用相鄰縮放級距 sprite」與「只丟舊縮放級距」（`RENDER_CACHE.BAKE_BUDGET_MS`／`BAKE_WINDOW_MS`、`TerrainBlockCache.ts`）。**使用者仍需在熔岩圖實測**；若仍卡，開 `?perf` 重現後在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`（尖峰記錄器已內建，含各階段耗時與 `terrainCache` hits／misses／evictions）。
  4. **BGM 疊音**：AI Studio 的共享引擎＋擁有者計數＋請求序號修法**使用者已確認修好**。
  5. 其他：角色大小 `UNIT_SPRITE.targetHeightCanvasUnits=59`（護盾稜柱為上限，測試遍歷全部影格）；護盾高度現在**自動貼合角色頭頂**（`SHIELD_VISUAL.headMargin`、`computeShieldGeometry`，飛行單位跟隨 body center）；`battle_frozen` 基準因單位變大已重錄一次（5 個地形基準仍 0 差異）。
- **審查教訓（已知教訓，務必記住）**：
  1. **AI Studio 容器看不到實際畫面、跑不了 Playwright**——它宣稱「全綠」不代表畫面正常。凡改渲染／生命週期，**必須本機實跑驗證**（最小：`createServer`＋`playwright-core`＋`msedge` 開頁、讀 `window.__TACTICAL_ENGINE__`、必要時截一張圖）。
  2. React StrictMode 下，元件清理**不可立即 `destroy()` 仍會被重用的物件**。
  3. 一個狀態欄位**只能有一個寫入者**（`deathTimer` 的教訓）。
  4. 刪除「舊管線」前先 `git grep` 證明零引用；新管線常仍依賴舊檔案的一部分。
  5. 排序（depth sort）鍵必須包含繪製時才套用的位移。
  6. 代理在缺乏證據時會加「安全網」掩蓋症狀（大逃殺的發呆看門狗）。B0 證據為 0 的修正一律拿掉，只保留對應到根因的改動。
  7. 代理會改到舊版的交接文件而造成衝突；任務合約要列出「受保護檔案」，`HANDOFF.md`／合約檔由主代理親自維護。

## 5. 專案現況重點
- **音訊**：`engine/audio/AudioEngine.ts`（共享單例＋擁有者計數＋BGM 請求序號；`?mute` 不建立 AudioContext）、`engine/systems/audio/AudioSystem.ts`（事件→Cue、BGM 切換）、`data/audio/{cues,music}.ts`、素材 `public/assets/audio/`（CC0／CC-BY，見 `docs/ASSET_LEDGER.md`、`CREDITS.md`）。展示模式只播 `SHOWCASE_AMBIENT`；手動：開戰 `BATTLE_NORMAL`→存活≤4 `BATTLE_TENSE`→勝敗曲（紅藍分開）→回氛圍。預覽頁 `tools/audio/preview.html`。
- **特效**：登記管線 `data/vfx/VFXRegistry.ts`＋`engine/systems/vfx`；直接繪製管線在 `engine/renderers/*`；品質階層 `engine/renderers/RenderQuality.ts`＋`constants.ts` 的 `RENDER_QUALITY`／`VFX_BUDGET`／`DEATH_VFX`。
- **單位**：精靈 `engine/renderers/units/factions/SpriteUnitRenderer.ts`（圖集 `SpriteAtlasStore`；座標：在 `ctx.scale(UNIT_SCALE)` 之後繪製，需 `/UNIT_SCALE` 補償，腳底錨點 `UNIT_SPRITE.footOffsetLocal`）；地面底座／職業圖示仍由 Token 工廠產生。
- **UI**：視窗系統 `components/ui/window/*`、展示頁 `components/ui/showcase/ShowcaseOverlay.tsx`（標題卡除按鈕外穿透）。樣式基準 `tools/ui-e2e/style-baseline.json`（改 UI 樣式需 `E2E_UPDATE_STYLE=1 npm run e2e:ui` 並確認只有預期元素變動）。
- **量測工具**：`perf:fidelity`（保真，battle_frozen＋5 地形）、`perf:guard`、`perf:frames`（2560×1440，**用主螢幕**）、`perf:attribution`、`?perf` HUD（rAF 真實幀間隔＋尖峰記錄）。保真鐵律：基準不得任意重錄、門檻不得放寬。**測試用 hook `__resetSeed`／`__stepFrames` 不在 app 內**，由 `tools/` 腳本以 `addInitScript` 注入（見 `tools/assets/create-battle-comparison.mjs`、`tools/ui-e2e/render-fidelity.mjs`）。
- **dev server**：`npm run dev`（port 3000，`0.0.0.0`）。

## 6. 暫存區 `C:\Git\_asset_staging\`（repo 之外）
- `docs\`：舊手冊備份（**以 repo 為準**）；`art\terrain_grid.jpg`、`art\ref_*`（使用者風格參考，**不得進 repo**）；`sprites\`（10 張精靈＋manifest）；`assets3d\kaykit_adventurers\`；`tools\blender\...\blender.exe`（可攜）與 `tools\blender_scripts\`（`render_unit.py`、`pack_sprites.py`）；`audio_tmp\`。
- 美術風格：相機正交仰角 30°（=`ISO_SCALE_Y 0.5`）、四向原生渲染；BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱。

## 7. 決策與待辦池
- 題材奇幻（FFT-like）、保持六角格、固定等距視角；AI 逐張生圖做單位已放棄，改 KayKit 預渲染；AI 圖只用於地形材質與日後圖示。授權：CC0 優先、CC-BY 可（致謝）、拒絕 NC／ND／GPL／不明；維護 `docs/ASSET_LEDGER.md`、`CREDITS.md`。
- **待辦池（無順序，使用者要時再開）**：
  1. 效能：殘留熱點已清（§3 K）；在 239 Hz 主螢幕以 `perf:frames`（含真實特效壓力情境）確認 p99。
  2. 地形烘焙實作（設計 `docs/BAKED_RENDERING_DESIGN.md`、原型 `tools/baked-terrain-proto.html`）；先看熔岩圖在烘焙預算修正後是否已夠順。
  3. 每個地圖主題一首 BGM；紅方勝利曲換成真正的暗黑曲。
  4. FEMALE 與其他體型、專用神職模型、加強陣營辨識度（見 `docs/ASSET_NEEDS.md`）。
  5. 手機版 UI 全面巡檢。
  6. **地形 R2（下一輪）**：正式化地表氛圍效果。R0 量測（只有地形）：地表細節 `drawTerrainDetail` 佔每幀 0.4～1.3 ms（FOREST／DESERT 約佔地形成本一半）、熔岩液面 0.2～0.5 ms、天氣粒子 `VFXAmbience` 量不到差異；ICE 的 p99 19 ms 已不存在（極光改低解析度離屏後，2026-10-18 實測 p99 3.2 ms）。方向：靜態細節烘進地形 sprite，動態效果改預渲染循環影格，參數集中到 `data/vfx/`。
  7. 縮圈墜落的單位是否需要專屬「墜落」動畫（目前是垂直掉入虛空後立即回收）。
  8. **架構：狀態所有權**。`Agent` 有約 89 個欄位，模擬與視覺狀態混在一起，「唯一寫入者」目前只靠紀律維持。下一步可替欄位分組並標註唯一寫入者；系統與渲染層之間仍有雙向 import（`engine/systems/` 內含渲染系統）。先設計再動手。

## 8. 使用者要做的事（提醒他）
- 實機看擊飛手感、熔岩圖流暢度、護盾貼合（含飛行單位）、大逃殺縮圈是否乾淨。
- 每次合併／push 前的決定由使用者下。

## 9. 在 Claude Code 使用的注意
- Claude Code 會自動讀根目錄 `CLAUDE.md`（主代理專用的精簡版，會載入本檔；`AGENTS.md` 為審查時才讀的檢查清單）。子代理定義在 `.claude/agents/`（explorer／worker／reviewer，模型與強度寫在 frontmatter）。內建子代理不會讀 `CLAUDE.md`。
- 使用者把這些指令檔統稱「合約」：主代理合約 `CLAUDE.md`、實作代理合約 `AGENTS.md` 與 `docs/*_AGENT_PROMPT.md`、子代理合約 `.claude/agents/*.md`。
- 推理強度上限 high；工作階段不能自己切換強度，需要時停下請使用者在 App 切。
- 本機指令用 PowerShell 或 Git Bash；長時間指令以背景方式執行並等待完成，**不要輪詢**。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
