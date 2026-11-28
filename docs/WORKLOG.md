# 工作紀錄（已完成的輪次）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。只記「做了什麼、證據在哪」，平常不用讀；要查某個系統的來龍去脈時再搜尋。
> 新完成的輪次往最後加一節（日期＋一句話結論＋commit／報告位置），HANDOFF 裡對應的 TBD 同時刪掉。
> 文中提到的提示詞與報告檔大多已刪除（DECISIONS §4），內容在 git 歷史：`git log --all -- docs/<檔名>`。

## 1. Git 歷程備忘
- **單一主線**：`C:\Git\Group-Battler-FFT-Final`，分支 `main`。主代理與 IDE 代理都在這個資料夾工作。若 `git worktree list` 還看得到 `Group-Battler-main`／`-death-vfx`／`-chore`，代表搬遷步驟尚未做完。
- `main` 已含：大逃殺修正、死亡特效／擊飛、AI Studio 清理、文件整理、合約改版（`CLAUDE.md`／`AGENTS.md`／`.claude/agents/`）、README 更新。push 狀態以 `git status -sb` 為準。
- **美術／特效改造已合併（2026-10-16）**：進度、決策在 `docs/archive/ART_VFX_PLAN.md`，規格在 `docs/ART_SPEC.md`（§0 世界觀、§13 詠唱／中斷）。全部 50 個奧義已改六角零件版；光束本體仍是程式繪製（待新增 beam 零件）。HD 為主線，SD 原型已移除（tag `pixel-proto-ckpt`）。目前沒有進行中的分支。

## 2. 2026-10-15～19 各輪

### A. 大逃殺（縮圈）兩大 bug
- **殘影根因**：`ZoneSystem` 縮圈殺人繞過 `handleDeadState`；`PhysicsEngine` 凍結死者物理；`deathTimer` 兩個寫入者。現在所有死亡都走唯一入口 `agentManager.handleDeadState`，失去地面的屍體會往下掉，`PhysicsEngine` 只設 `outOfBounds`，`fullyDead` 由 `updateDeathState` 回收。
- **發呆根因**：`ai_profiles.ts` 的 `Combat` 是 SEQUENCE，技能全部冷卻時整串失敗、追擊與 Idle 都不跑。改為 `Combat Actions` SELECTOR；被困時改為衝向目標。
- **審查時我拿掉的**：代理加的「發呆看門狗」（B0 的 IDLE 實測 0 次，屬掩蓋症狀，且改到 facade `game.ts`）。
- **重現工具**：`node tools/ui-e2e/br-soak.mjs --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`（修正後 20/20 乾淨）。細節見 `docs/BR_FIX_REPORT.md`（開頭有審查修正說明）。

### B. 死亡特效／擊飛
- `deathTimer` 單一寫入者後，死亡動畫與屍體殘留（`DEATH_ANIM_DURATION`=5.5 秒）才真的會跑。擊飛：`data/units/appearance/deathMotion.ts`（純函式，依 `deathTimer` 與 ragdoll 軀幹初速推導），參數 `constants.ts` 的 `DEATH_KNOCKBACK`；`UnitSystem` 把滑行位移併入繪製位置與深度排序鍵。死亡粒子：塵煙＋火花（`DEATH_VFX`）。

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
- **障礙物素材**：已下載 CC0 的 KayKit Forest Nature／Dungeon Remastered／Medieval Hexagon 與 Kenney Nature Kit 到 `_asset_staging\assets3d\`（`docs/ASSET_LEDGER.md` §6），O1 Blender 管線尚未開始。
- **地形 T0**：`TERRAIN_SKIN.exposure`（每群系增益，烘焙最後乘上）＋`lumaBudget` 45～90；`terrain-contrast.mjs` 驗收預算。保真 5 地形＋battle_frozen 因此重錄（差異圖只落在地塊）。**T1**：三項已知缺陷都已不成立或已修，`tools/ui-e2e/biome-frames.mjs` 量各地圖真實幀間隔。
- 未決（使用者）：`.claude/worktrees/` 剩 11 個資料夾無法自動刪（權限），需手動刪；未合併分支 `20260328`、`experiment/unit-rig-skin-poc`；網格線樣式改動（路線圖 D2）。

### K. 2026-10-19 VFX V4～V7＋座標殘差（已 push，f72eb86）
- **V4 投射物**：`missile` 零件、單一表 `data/vfx/projectile_visuals.ts`、`ProjectilePartPainter`；修 `dipAmount` 從未傳入。**V5a**：舊粒子型別／貼花／舊貼圖死碼刪除。
- **V5b**：詠唱環／聖域／光點／能量柱、護盾（新 `prism` 零件）、危害（共用零件層 `data/vfx/parts/partLayer.ts`＋`vfxparts/PartLayerPainter.ts`，重力漩渦只畫中心格）、AOE 預警全部零件化；`VolumePainter`、`UnitFlightPainter`、`UnitAmbientPainter`（頭上藍框紅點）刪除。HUD：血條預烘焙 sprite、渲染路徑 0 個每幀 `shadowBlur`、量表顏色改讀 `STATUS_VISUALS`。格線疊層／縮圈／死亡繪製器的數字進常數。
- **回歸修正**：V5a 刪貼圖後危害與單位陰影畫成洋紅除錯方塊；`VFXFactory.getTexture` 改收封閉型別 `VFXTextureType`，不支援的名稱編譯不過。
- **座標**：屍體滑停在格界時腳下格滯後卡在舊格、被自己那格地塊蓋腳 → 靜止 `HEX_RELEASE_FRAMES` 幀後放開（每次靜止一次）。景深預言穩定錯序 pair-frames 1,727 → 668，閃爍振盪 53 → 57（`docs/COORD_GUARD_FINDINGS.md` §9）。
- **V6**：`fx-shot --scene=` 量亮底發白 → 加法零件群系增益 `VFX_BIOME_GAIN`、火焰本體一般混合；隕石落點影子；光束兩端光點。**V7**：`vfx-storm` 改真實入口、零件快取擠出統計、柔邊零件 1 倍烘焙；battle_frozen 一次性重錄（`359bc66`，附證據）。
- 細節：`docs/VFX_PIPELINE_MAP.md` §4.11～§4.15；README 的「視覺管線」段落已更新。
### L. 2026-10-19 晚 實機回饋＋奧義 U1（已 push）
- `perf:frames` 238 Hz：平穩 p99 16.7 ms、壓力 24.8 ms、展示 12.6 ms；零件快取 96 MB。冰／沙增益各提亮 10%，重力漩渦加強。
- **U1**：奧義序列對齊傷害幀（`VFXSequence.hitAt`＋`startDelay`）、打斷即取消、`scale` 真正套用（`Particle.fxScale`）、共用命中包 `FX_ULT_IMPACT_*`、參數 `ULT_SEQUENCE`。50 個奧義結構都修了；個別奧義美術細調可續做。細節 `docs/VFX_PIPELINE_MAP.md` §4.16。
- 保真 harness 固定地圖＋暖機；VOID／battle_frozen 重錄（`681e07e`，附證據）。
- 清理：`.claude/worktrees/` 已清、本地分支 `20260328`／`experiment/unit-rig-skin-poc` 已刪（遠端仍在）。
- 下一步：照 `docs/VISUAL_ROADMAP.md` §0 跑 O1～O4、T2～T5（熔岩液面、草地擺動等網格上特效仍是程式繪製，屬 T2～T3）。
### M. 2026-10-19 深夜 障礙物 O1～O4＋地形 T2～T5（已 push）
- 障礙物預渲染（Blender 腳本在 `tools/assets/blender/`，素材在 `_asset_staging/assets3d/`）、熔岩液面重繪（影格表 `LoopSheet`）、草叢與地表裝飾、落差描邊降對比、天氣零件化（ATMOSPHERE 與看板路徑刪除）。細節 `docs/VFX_PIPELINE_MAP.md` §4.17。
- 保真重錄兩次（`ad64afd`、`f312187`，證據在 `tools/ui-e2e/out/fidelity_o2_evidence.png`、`fidelity_t2_evidence.png`）。
- 後續（同晚）：O3 障礙物動態（樹風擺、冰晶星芒、黑曜柱發光；後兩者用疊層，影格表版會多 3～5 ms p99）、崖邊垂草／積雪簷／熔岩發光邊、森林霧氣＋光柱、虛空紫霧、熔岩熱浪（`docs/VFX_PIPELINE_MAP.md` §4.18，保真 `516b22e`）。地形變體 4→8 刻意不做（地塊快取翻倍，裝飾已提供變化）。

### N. 2026-10-19 深夜 狀態所有權 P7b～P10（已 push c2c0bfc）
- P7a（嘲諷鎖定只在 TargetingSystem）其實 10/18 已合併；這次補完 P7b（施法中的 `aiState` 改推導，`engine/core/AgentDerived.ts`）、P9（技能槽改走 `SET_AGENT_SKILL`、`reset()` 補齊、刪 `activeCCVFX`）、P10（開戰準備與 `escapeCooldown` 移出 facade）。細節 `docs/STATE_OWNERSHIP_DESIGN.md` §8。剩 P11／P12（可選，機械性搬移）。

### O. 2026-10-19 詠唱法陣＋鋸齒（289b3a8 已 push；紋章補漏 b8405ea、太陽八芒星 072ff2c）
- 詠唱光環改 `magicCircle` 零件（模糊光暈＋細芯、慢轉、screen），AOE 範圍格／區域波紋／縮圈預警改 `SoftTile` 柔光格，`ring` 光暈模糊；主畫布 `imageSmoothingQuality` high＋裝置像素對齊（RenderSpec §3）。保真 4 張重錄附證據。補漏：技能紋章 `sigil` 與詠唱中斷改同一套柔光畫法（`ring` 加 `soft` 選項）；太陽紋章改八芒星（舊版刻度＋放射線像一堆柱子），工具 `tools/vfx/sigil-dump.mjs`。細節 `docs/VFX_PIPELINE_MAP.md` §4.19。

### P. 2026-10-19 夜 實機回饋第二輪（已 push）
- 遠端只留 `main`：`20260328`、`experiment/unit-rig-skin-poc` 各留本地 tag `archive/*`，`feat/procedural-material-upgrade` 已合併。
- 觀賞模式設定 TAB 閃爍、按不到：`TabButton` 宣告在 render 內，每次重繪重建（每秒 10 次）；移到模組層（`57ab9b7`）。新工具 `tools/ui-e2e/ui-remount-audit.mjs`。
- 障礙物：黑曜柱改粗柱斷頂＋下半部 Voronoi 岩漿裂縫＋底部熔岩帶；虛空圖 WALL 改符文基座＋懸浮暗紫晶碑（`1472aad`），發光取色依類型 `OBSTACLE_SPRITE.GLOW_KEYS`。保真 VOID／MAGMA 重錄（`3f25d11`，證據 `tools/ui-e2e/out/fidelity_obs2_evidence.png`）。
- 縮圈墜落動畫：純繪製（`data/units/appearance/fallMotion.ts`，`UNIT_BODY_MOTION.fall*`），翻滾縮小淡出，墜落中不畫血條與狀態（`25e4485`）。
- ECS-lite 評估：`docs/ECS_LITE_ASSESSMENT.md`（建議 S1 狀態效果資料化優先）。
- 越跑越糊：畫質治理器以 vsync 鎖住的幀間隔判斷降級，60 Hz 一律降到最低階且升階冷卻只增不減。改成刷新週期下限、解析度階層另設 `DOWN_RES_MS`、冷卻加倍會消退（`d733eda`）。粒子沒有累積。工具 `tools/ui-e2e/idle-quality-soak.mjs`。
- UI 巡檢第二輪：工具列子選單分段鈕、檢查器分頁在觸控裝置補到 44×44（D11），手機直向工具列讓開系統選單鈕（`UI_PIN.TOOLBAR_MARGIN_COMPACT`）；三種手機尺寸 0 問題（`031b9a3`）。使用者實機（iPhone 14 Plus）確認墜落動畫 OK。
- 已備：S1 提示詞 `docs/archive/STATUS_EFFECTS_AGENT_PROMPT.md`、BGM 候選 `docs/BGM_CANDIDATES.md`。
- 每張地圖戰鬥曲通道：`GAME_START` 帶 `sceneId`，`AudioSystem` 依 `SCENE_BATTLE_TRACK` 選曲（五圖各自的 TrackId，暫用 `battle_normal.ogg` 占位）；實機確認三場分別播對應曲目。

### Q. 2026-10-19 深夜 UI 批次＋ECS-lite S1 狀態效果資料化
- UI 批次（`200849c`、`0c1ff4d`，已 push）：展示模式左上舊齒輪移除（設定只從系統選單開）；結算畫面可開戰鬥紀錄（`WindowDef.visibleOnGameOver`、模式 `gameover`）；特效展示庫改讀現行資料（`data/vfx/parts/partGallery.ts` 實際烘焙縮圖＋登記表分組，刪 `vfx_library.ts`）；技能資料庫編輯改走 `UPDATE_SKILL`（可改欄位 `data/ui/skillEditor.ts`，選單只列 `VFX_REGISTRY`／`PROJECTILE_VISUALS` 的鍵）；展示標題卡 `UI_Z.SHOWCASE` 35 降到視窗層下、文字改英文（`START SIMULATION`，工具腳本同步）。
- S1（Gemini 執行，`7dea6ee`～`9971b68`，主代理審查後合併）：21 個平行狀態欄位收成 `agent.effects`（13 槽，`types.ts` `EffectKind`／`EffectSlot`、`engine/core/Effects.ts`、規則表 `data/status/effect_defs.ts` 的極性／硬控／施加清洗），`ControlSystem` 遞減改統一迴圈，`AgentOwnership` 加 `effects`；`tests/EffectFieldsRatchet.test.ts` 鎖舊欄位 0 次。審查：極性與硬控清單與舊陣列逐項一致（STASIS 不是 ccType，改列 DEBUFF 無影響）、到期副作用相對順序不變。驗證：614 測試、保真 6/6 通過、實戰 40 秒各槽位寫入／遞減正常、0 頁面錯誤。報告 `docs/STATUS_EFFECTS_REPORT.md`。
- 效能退步修正（`c08bcd3`）：使用者 239 Hz 主螢幕 `perf:frames` 一般戰鬥 p99 75 ms、特效壓力 142 ms。CPU 取樣顯示主執行緒一半閒置、耗時在原生 `drawImage`／`restore`；A/B（固定種子展示戰鬥 2560×1440）證實是 §O 加的每幀 `imageSmoothingQuality` high（medium 一樣慢，來源是離屏畫布，每次 drawImage 重算濾波）。每幀繪製改回 low、一次性烘焙維持 high；保真 6/6 未重錄。修正後中位數／p99：一般 4.3／16.7、壓力 8.2／16.7、展示 4.2／16.7 ms，平均約 145 FPS。
- ECS-lite S2＋S3 表現層分離（Gemini 執行 `da0dea5`～`d24d4cb`，主代理審查後合併）：特效、事件視覺、單位提交、HUD、動畫推導、鏡頭／導播、DesignExporter 搬到 `engine/presentation/`，`GridCache` 搬 `engine/renderers/grid/`，`GridSystem` 只留查詢（點格快取由 renderer 注入 `HexSpatialLookup`）；`triggerHitFlash`／`triggerHitShake` 移到 `engine/core/ViewCommands.ts`；`visualStatus`／`hitFlashTimer`／`visualOffset` 收進 `agent.view`（`animState`、`trailHistory` 有模擬端寫入者，留原處）。`tests/LayerBoundary.test.ts`：模擬端 → 表現端 import 36 → 0（只准 0）。驗證：619 測試、保真與 main 數值完全相同、e2e:ui 全過。報告 `docs/PRESENTATION_LAYER_REPORT.md`。
- e2e 樣式快照修正（`63c4808`）：UI 批次移除左上齒輪後快照仍找它（那批 push 前沒跑 e2e:ui）；改從系統選單開，基準只刪該鍵。
- 展示模式戰鬥結束／換圖卡頓（`f5e33f0`）：長幀對齊 CPU 取樣，全部是地形 `bakeBlock`（2560×1440 每塊 4～9 ms）。烘焙預算原本按「16 ms 時間窗」重置，一幀內烘到一半就過期重置，從來擋不住長幀；改為每幀（`TerrainRenderer.beginFrame`）。縮圈塌陷改了鄰格邊緣遮罩→新鍵無級距可借 → 超預算時借同一格上一次的 sprite。換圖 IN／OUT 期間無可借用者延後一幀（`TRANSITION_BAKE_BUDGET_MS` 12）。展示探針 3 次：無 > 40 ms 的地形長幀（原 300／660 ms）；保真數值不變。探針在 `tools/ui-e2e/out/_scratch_terrain_stats.mjs`、`_scratch_longframe.mjs`。
- ECS-lite S4 常數拆檔（Gemini 執行 `b591451`～`649cd8b`，主代理審查後合併）：`constants.ts` 1,447 行拆成 `constants/` 10 個領域檔，`constants.ts` 只剩轉發，185 個 import 端不變；`tests/ConstantsBarrel.test.ts`＋`tests/constants-snapshot.json` 鎖住 86 個匯出名稱與值。審查：舊檔每一行都在新檔（多重集合比對），只漏一段 `UNIT_SHADOW` 說明註解（已補回 `4a8b137`）；保真與 br-soak 與改前相同。`AGENTS.md`／`CLAUDE.md`／`METHODOLOGY.md` 改指向 `constants/*.ts`。報告 `docs/CONSTANTS_SPLIT_REPORT.md`。
- BGM：五張地圖專屬戰鬥曲＋紅方勝利曲換成 Orcs Victorious（舊的變調版 `victory_red.ogg` 刪除）。CC0 四首、CC-BY 兩首（熔岩 Wolfgang_ 4.0、沙漠 Hitctrl 3.0，已致謝）。OpenGameArt 網站故障，頁面資訊取 Wayback 快照、檔案直接下載靜態路徑。響度 −11 LUFS、Vorbis q2，BGM 總量 14.05 MB（上限 15 MB）。
- 技能正確性修正＋三種新效果（Gemini 執行 `68f9e87`～`5b959a6`，主代理審查後合併）：`Skill.ccSelf`／`ccSelf2`（每次施放只對施法者套用一次，取代「增益打到敵人就轉給自己」）；新效果 `HASTE`（移速與冷卻遞減 ×(1+v%)）、`REFLECT`（受敵方技能直接傷害後反彈真實傷害，不連鎖、不含 DOT）、`LIFESTEAL`（與技能 VAMP 相加），上限 `EFFECT_LIMITS`；資料照表修正（稜鏡反射、尖刺防禦、疾風祝禱、嗜血狂熱、惡魔降臨、猩紅血月、神聖干涉改真無敵、3 個描述），42 個技能補 `element`（新增 3 火、4 虛空會生成危害區）。`tests/SkillDataIntegrity.test.ts` 違規 56 → 0。審查：保真 6/6 與 main 數值相同（`battle_frozen` 未變，不需重錄）；實戰 3 輪各 40 秒三種新效果都有觸發、0 頁面錯誤。報告 `docs/SKILL_FIX_REPORT.md`。使用者實機聽過新 BGM，全部 OK。
- 文件與檔頭清理（使用者 10/20 要求）：已完成的 Gemini 提示詞 5 份與被取代的稽核／設計文件 7 份移到 `docs/archive/`，連結同步更新；`STATE_OWNERSHIP_DESIGN`、`ECS_LITE_ASSESSMENT`、`VFX_PIPELINE_MAP` 開頭加「現況」；`AGENTS.md` 補模擬／表現層邊界、`agent.effects`、`agent.view` 規則與目錄樹，README 目錄樹改成 S2 後的樣子；程式註解的 `constants.ts 的 X` 改指 `constants/<領域>.ts`（19 行），舊欄位名與已刪類別的註解修正。稽核腳本：路徑存在性＋舊識別字＋檔頭類別名。
- 檔頭瘦身（主代理親自做，`b63f1da`）：71 個方框檔頭刪掉「上游／下游」、呼叫端清單、實作位置清單與過時的 tick 順序，只留職責＋不變式（−162 行，只改註解）；測試檔頭不再指向提示詞文件。
- 技能平衡輪（Gemini 執行 `99d0531`～`ccaf42b`，主代理審查後合併）：150 個技能改了 90 個，全部只動數值欄位（以模組載入逐欄比對 main，非數值變動 0）；紅方普攻／主動／奧義的威力、射程、詠唱整體上調，藍法與部分藍奧義下修。主代理重跑標準量測（各 1000 場 seed 1）：藍方勝率一般 48.4%、交換 51.7%、合併 50.0%，p50 17.3 s，高頻技能勝率差超標 0 筆，同職業紅藍輸出差最大 −22.9%（法師）。`battle_frozen` 因戰鬥軌跡不同重錄（`2829472`，差異集中在單位／浮字／特效，5 張地形照舊）。工具：`npm run balance:sim`／`balance:report`（`tools/balance/`），持續傷害記錄 `effects.DOT.sourceId` 供歸屬統計。報告 `docs/BALANCE_REPORT.md`、基準 `docs/BALANCE_BASELINE.md`。
- 文件防過時（10/20）：刪除 `docs/archive/`（45 份）與已完成輪次的提示詞／報告 22 份，程式註解與文件裡的引用改寫或拿掉；新增 `tests/DocDrift.test.ts`：文件與註解裡的 repo 路徑、md 相對連結、方框檔頭第一行的名稱都必須存在，已移除的狀態欄位名（`tests/legacyEffectFields.ts`，與 `EffectFieldsRatchet` 共用）不得出現在註解與文件（WORKLOG 為歷史，不檢查）。順手修：`worker.md` 的 Facade 路徑、`types.ts` 效果槽位註解、兩個檔頭名稱（`FACTION_SKINS`、`GameRenderer`）。保留：`MOBILE_UI_AUDIT`（仍有未修項）、`STATE_OWNERSHIP_DESIGN`、`COORD_GUARD_FINDINGS`、`DEPTH_ORDER_FINDINGS`、`PERF_LIFECYCLE_FINDINGS`（程式註解引用的理由）。

### R. 2026-10-20 合約分層（Harness² 方法移植，雲端工作階段 `claude/funny-cori-xqw4jq`）
- 研究 `google-research/harness2`（任務層 Propose–Probe–Compose、經驗層反思庫、8 種 harness 元件與成本排序），只移植方法，不裝框架（DECISIONS §4）。
- 新增 skill 4 個（`.claude/skills/`）：`render-verify`、`rebaseline-fidelity`、`agent-prompt`（INV／DOM 分段、寫查證過的事實、提示詞範本）、`review-round`（每個改動一行 kept／revised／dropped＋證據、收尾、合約效果表）；METHODOLOGY §3 的流程搬進 skill，CLAUDE.md 加觸發表。
- hook（`tools/hooks/agent-guardrails.mjs`）：改到渲染／生命週期檔案時每個工作階段提醒一次實跑（新增 PostToolUse）。主代理審查時改成不卡自動長鏈：雲端版本的「push／main 上 merge／重錄基準一律跳確認」改為只有破壞性 push（強推、`--tags`／`--all`、刪分支）跳確認，重錄基準改成 PostToolUse 事後提醒取證清單；`merge\b` 會誤攔 `git merge-tree`／`merge-base` 也一併消失；唯讀子代理（explorer／reviewer）不再因提到排序鍵、閃爍而被要求寫 RenderSpec。
- 新增 `tools/ui-e2e/runtime-smoke.mjs`：真實 rAF 跑一場戰鬥，檢查 0 頁面錯誤、有單位、`battleTime` 前進、畫布有變（抓凍結畫面）；雲端 Chromium 實跑通過。
- 新增 `tests/HarnessContract.test.ts`（skill 觸發句、子代理模型、hook 腳本存在、hook 判定 7 組情境）；`DocDrift` 加掃 `.claude/skills`。
- 長指令觀測與重試（10/21）：Gemini 兩度無限等待已結束的指令（2 小時、70 分鐘；IDE 收不到開 vite／瀏覽器指令的完成通知）。新增 `tools/agent/run.mjs`：前景包裝長指令，log 最後一行 `EXIT=<代碼>`＋`status.json`（含心跳），逾時結束自己的子程序樹（回 124），`--check <名稱>` 印狀態與下一步；`AGENTS.md` §7 加逾時表與「卡住就 --check、同一步兩次失敗就記報告跳下一個任務」；`agent-prompt` 範本同步。`tests/AgentRunner.test.ts` 驗證成功／失敗／逾時殺孫程序／--check。
- 奧義規格化（Gemini UA 與 UA6，主代理審查後合併 `3061fbc`）：見 `docs/VFX_PIPELINE_MAP.md` §4.20。審查決定：kept → 色彩改動（依據：技能 `element`）、`mb_u2` 專屬配方（依據：原與 `rb_u1` 共用同一配方）；revised → 舊 C6（依據：總表上全場奧義貼地半徑 550～720 px 蓋滿畫面），改成上限＋STORM 散布（UA6），使用者否決命中時的範圍格閃光（詠唱預警已足、瞬發奧義看到也無用）。驗證：657 項測試、保真 6/6、perf 斷言、smoke 全過。
- 奧義有感（Gemini UF，主代理審查後合併 `c7df349`）：見 `docs/VFX_PIPELINE_MAP.md` §4.21。審查修正 `e211b83`：聚光重抽震動亂數（改沿用主畫布變換）、橫幅漸層 `as unknown as` 型別造假、`typeof engine.isValid` 防禦式寫法（測試假引擎補 `isValid`）。驗證：673 項測試、保真 6/6（與 UF0 相同）、perf 斷言、smoke、`--feel` 全畫面圖。
- 實作代理分段等待（10/21）：UA6 在 10 秒的 smoke 之後停了 6.5 小時（IDE 把工具呼叫轉背景、代理交出回合）→ `run.mjs --detach／--wait`（`2af6435`）；UF 時發現 IDE 終端機的 Job 會在指令返回時收掉 detached 子程序（狀態永遠 starting，`--wait` 呼叫 30 次）→ Windows 改經 WMI `Win32_Process.Create` 啟動（父程序 WmiPrvSE，不在 Job 內），starting 超過 10 秒回報 `STATE=LOST` 並給前景改跑指令（`d4345e5`）。
- 奧義回饋（10/21，主代理，`85d01c2`）：詠唱暗場＋聚光移除——奧義詠唱只有 0.1～2 秒，來不及聚焦，只看到畫面亮暗快速交替（VRR OLED 上像閃爍），實作在 `c7df349` 可取回；規則改為詠唱短於 5 秒不做全畫面亮度變化（ART_SPEC §6、RenderSpec §11）。使用者最喜歡的 `mb_u1` 黑洞、`rr_u2` 核彈依 `6927b68` 之前的舊版構圖做回（VFX_PIPELINE_MAP §4.21），UltSpec C1～C8 0 新違規；`ult-sheet --feel` 加 `--ids`／`--times`。
- 背景管線現代化（Gemini BG，主代理審查後合併 `f887910`）：參數集中 `BACKGROUND_FX`／`BACKGROUND_COLORS`、每幀 0 次建漸層（快取）、星星大小亮度改雜湊、靜態層依 dpr 烘焙、品質階層（Tier 2 減半、Tier 3 只畫靜態層）、`tests/BackgroundRenderer.test.ts`。審查決定（`2f8c3c7`）：revised → 光點改回 `arc`（依據：拆解探針，16px sprite 縮放 `drawImage` 每次背景多約 0.08 ms，是成本變 2～4 倍的主因）；revised → 地平線光暈改成目的矩形固定、縮放取樣範圍（依據：整張縮放在脈動縮小時兩側露出硬邊）。bg-probe 開視窗 2560×1440 每次背景（main／Gemini 版／修完）：VOID 0.033／0.089／0.033、FOREST 0.033／0.122／0.033、ICE 0.089／0.189／0.089、MAGMA 0.022／0.089／0.022、DESERT 0.044／0.100／0.033。保真 6/6 PASS；`battle_frozen` 0→0.308 是星星不再耗用 `Math.random`、保真 harness 的亂數序列位移，未重錄。

  | 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
  | :-- | :-- | :-- |
  | `AGENTS.md` §7＋`run.mjs --detach／--wait`（WMI 啟動） | 40 分鐘跑完約 30 個長指令，0 次 LOST、0 次卡住等待（`tools/ui-e2e/out/agent-logs/*-bg*`） | helped |
  | 提示詞的文字停下條件（保真變差就停、bg-probe 不得高於改前） | BG3／BG4 保真變差、bg-probe 變 2～4 倍仍繼續，報告寫「無遺留」 | no effect |

- 近戰攻擊與受擊特效（Gemini MF，主代理審查修正後合併 3c9d06f）：見 docs/VFX_PIPELINE_MAP.md §4.22、報告 docs/MELEE_FX_REPORT.md。18 招近戰普攻補齊目標處揮擊（FX_SWING_* 刀弧／下壓重擊／尖端閃光，取代 8 招空序列與直線光束 SLASH_CONNECT），7 招近戰主動技新增專屬命中包（data/vfx/registry/melee_parts.ts），	ests/MeleeFxSpec.test.ts M1～M4 違規 32 → 0。審查修正（3dbd265）：revised → 還原 SkillSequences.ts 主動技區段並將 7 招專屬特效掛回 ACTIVE_VISUALS[id].impactFx（依據：SkillExecutor.ts:234 的 ownHit 規則使無投射物主動技在 HIT_FX 只播陣營預設小打擊、不播 isualHitEffect；MF4 誤以為會疊兩次而全域去重，導致 7 招新特效實機完全沒播、另有 24 招主動技主特效消失，也是 battle_frozen 0.50% FAIL 的根因）；revised → MeleeFxSpec M3 加驗實機可達、M4 改比對 HIT_FX 實際播放特效、補無投射物主動技 impactFx 回歸測試；revised → sr_a3 治療圖騰紋章與液滴改 ASH_POISON。驗證：685 項測試、保真 6/6 PASS（battle_frozen 回到 0.305／0.32%，不需重錄）、perf 護欄、smoke、重拍 melee_after.png。
- 實機驗收批次（10/22，使用者確認）：近戰特效、勝利音樂、背景管線、平衡輪、導播鏡頭抖動、單一格閃爍共 6 項實機確認 OK（刪除 docs/MELEE_FX_REPORT.md、docs/BALANCE_REPORT.md、docs/ULT_FEEL_REPORT.md）；技能新效果實機可用（「戰場有點混亂，不過暫時先這樣」記進 HANDOFF §4）；奧義回饋「視覺還是太弱，原版的體積感很強，現在都太虛化」排入 HANDOFF §2「奧義體積感強化」；3 個暫緩的奧義 C1 違規併入「位移技能軌跡」輪（docs/DASH_MOTION_AGENT_PROMPT.md）一起清零。
- 位移技能軌跡＋近戰前衝＋奧義 C1 歸零（Gemini DM，主代理審查修正後合併 `7315658`）：報告 `docs/DASH_MOTION_REPORT.md`。`tr_u3`／`wr_u3`／`wb_u5` 詠唱調至 0.3 s 清零 `tests/ult-spec.baseline.json` C1；`MotionCommands.dashTo` 寫入朝目標爆發初速（`DASH_BURST_SPEED: 380`）與上下坡高度差補償，下坡給予起跳初速（`DASH_HOP_VZ: 140`），`SkillExecutor` 突進前由 `PhysicsSystem.recordTrailPoint` 記錄殘影起點；近戰單體與前踏主動技呼叫 `MotionCommands.lungeToward`（`MELEE_LUNGE_OFFSET_PX: 14`、`MELEE_LUNGE_SPEED: 220`）。審查修正（`dc56395`）：revised → `PhysicsEngine.stepPhysics` 下坡高度差吸收量改依安全落速上限（`FALL_DAMAGE_THRESHOLD * 0.85`）封頂（依據：6 層 144 px 高崖下衝時 `z += 144` 若全數進入自由落體，落地 `vz = -479.8` 會自摔扣 168 HP；封頂後高崖下衝仍走拋物線且自傷為 0），並同步更新 `RenderSpec.ts` §3 與 §10。驗證：696 項測試、保真 6/6 PASS（`battle_frozen` 0.305／0.32%，不需重錄）、perf 護欄、smoke 全過。
- 行為樹優化與技能強度重調（Gemini BT，主代理審查修正後合併 `2405b6b`）：報告 `docs/BT_OPT_REPORT.md`。消除 4 類 AI 行為異常（非施法期間友軍目標殘留 `2040 -> 0` ticks、自身中心 PBAOE 空放 `11 -> 0` 次、對 `>=95%` HP 友軍空補與自殘補自己 `15 -> 0` 次、遠距空開短效自身增益），並同步重調法師／戰士等技能數值。審查修正（`c2d70aa`）：revised → `ChaseTarget(slot < 2)` 對非敵對技能改回傳 `FAILURE`（依據：滿血時治療／增益技能落入 `ChaseTarget` 對敵走位回傳 `SUCCESS` 會吞掉 Tick、阻斷輔助放普攻，或讓 `sr_a3` 治療圖騰衝入敵陣 2 格）；revised → `forceAiUpdate = true` 由純幾何查詢 `TargetingSystem.getImpactArea` 移至施法完成／中斷唯一收尾入口 `CastingEngine.resetCaster`；dropped → 移除 `sr_a3` 允許在滿血友軍旁空放的特例硬編碼；revised → 微調 `mb_u1`／`mb_u5` 威力使 2000 場對稱模擬 6 項平衡指標全數 PASS（藍方勝率一般 46.6%、交換 48.8%、合併 47.7%，p50 16.9 s，高頻技能勝率差超標 0 筆、同職業紅藍差最大 12.3%）。`battle_frozen` 因選標與傷害浮字改變重錄（`57e5089`，5 張地形 0 差異）。驗證：707 項測試、保真 6/6 PASS、smoke 全過。

### S. 2026-10-23～25 專案清理第一階段（`feat/project-cleanup` 合併進 main）

結論：清掉多餘的 export 和孤立模組，修了三個功能問題和座標排序；全庫逐檔語義審計沒有完成，未讀清冊和 SINK／VOID 轉入 HANDOFF。主代理是 Codex Argon／Astra 加 Gemini 3.8H，最後一段由 Claude 審查。

- **功能修正**：
  - F01 `d951930`：施法者死亡時取消還沒放完的施法序列。
  - F02 `fbe56ca`：單體技能序列鎖定目標的即時位置，因此重錄 `battle_frozen`（`b9622b3`，五地形 hash 不變）。
  - F03 `dd85241`：技能編輯器數值先暫存草稿，`UPDATE_SKILL` 加邊界驗證。
- **清理**：C01–C05（私有化型別、helper、查表常數，移除未用 export）、C02 退役 `GlowSpriteCache`（−218 行）、C03 移除 `tintStrength`；H01–H05 檔頭與文件對齊；AUDIT01 收斂四個 export、隔離測試障礙物。
- **座標（COORD-R1）**：
  - `96b5ea5`：depth oracle 改照 `ObstacleSprite` 取樣。
  - `8f7ef65`：排序距離改成未壓扁平面。
  - `cc056b0`（主審）：非對稱滯後——進入前格立即切換，原始格穩定不變才放開。
  - coord-guard 穩定錯序 19→7（只套 8f7ef65 時是 25），static 7→1。Gemini 報告的組別數字有誤，以 `docs/PROJECT_CLEANUP_COORD_R1_REVIEW.md` 為準。
- **合約**：Codex 派工表、hook 第 7 條強制 `--model`／`--effort`、專案 `.codex/config.toml`（`a2820d7`、`15a4e99`，合併 `cb15d46`）。Codex Sol／high 做跨模型審查，10 條意見採納 8 條。
- **收尾**：刪除已完成的提示詞（CLOSE02、COORD_R1、F01）與被取代的報告（A0、AUDIT01、C01–C05、CLOSE02、COORD_R1、F01–F03、H01–H05、V01）。保留清冊 CSV、COORD_R1_REVIEW、NEXT_PLAN、兩份 ULT 提示詞。後續再刪一批：A0 資料連同一次性產生工具 `tools/audit/cleanup-a0-inventory.mjs`、`MOBILE_UI_AUDIT.md`、`SKILL_NAMES.md`，以及本機分支 `feat/ult-volume`（`5fd0c8d`，UV1–UV4 沒合併）。未追蹤的舊提示詞與審查（27 份）移到 `C:\Git\_asset_staging\docs\archive-2026-10-25\`。`ULT_REDESIGN_PLAN.md` 因為兩份 ULT 提示詞會讀，改為進版控。
- **驗證**：lint、788 個測試、build、runtime-smoke、perf:guard（保真 6/6，`battle_frozen` 0.000）。

  | 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
  | :-- | :-- | :-- |
  | COORD_R1 提示詞的文字停下條件（「新錯序無法解釋則 B 未完成」） | Gemini 照樣交付，報告把 CORPSE×TERRAIN 4→15 寫成 5→1（`coord-r1-*/coord_guard.json`） | no effect（再次印證 METHODOLOGY §4 第 8 條） |
  | hook 第 7 條（Codex 呼叫必須寫模型與強度） | 合併前只有主代理手動呼叫，還沒攔過真實派工 | no effect（尚無樣本） |
  | Codex 跨模型審查 harness | 找出 3 個 hook 繞過方式和 skill 範本矛盾，Claude 自審沒抓到 | helped |

### T. 2026-10-25～26 奧義時序與視覺重製（ULT-T01 `feat/ult-timing` 合併 fb67049；ULT-V01 `feat/ult-visual` 合併 17cbacd，分支已 push）

結論：50 招奧義有效詠唱至少 1.5 秒，並全部重做成充能式的魔法構造體演出；實戰探針抓到並修掉兩個回歸；天降類改成詠唱結束就必中；粒子預算放寬到 630／1000。報告 `docs/ULT_VISUAL_CLAUDE_REPORT.md`，逐招設計 `docs/ULT_VISUAL_MATRIX.csv`。

- **ULT-T01**：`COMBAT_PARAM.ULT_MIN_CAST_SEC` 1.5，資料、技能編輯器、施法事件、讀條一致。
- **ULT-V01 視覺**：
  - 13 種構造體造型、`spiral` 零件、`PartAnim.rise` 高度關鍵影格。
  - 全 50 招 `charged`，資產從詠唱開始播。天降類的特效命中對齊真正的傷害時刻（`ultImpactDelay`）。
  - 共用命中包只給傷害技，另有單體版。
  - 美術方向：召喚物是半透明能量構造體，自然現象用粒子與煙（記憶 `ult-art-direction-magic-volume`）。
- **實戰探針** `tools/vfx/ult-battle-probe.mjs`：5 地圖 × 50 招時序與殘留、移動目標、同場多奧義、打斷、重置全部 PASS。
  - 修掉的回歸：單體技命中發射器留在目標舊位置（b49cf08，RenderSpec §4.1 新增「已生成粒子跟隨」）；打斷後仍在原命中時刻爆開（改成每次序列有編號 `seqRun`）。
- **玩法（使用者選 B，DECISIONS §5）**：天降類詠唱結束就必中，落點與目標在詠唱結束時記下（ab306eb）。
- **效能**：新工具 `tools/ui-e2e/perf-particle-budget.mjs`。預算 240／380 → 630／1000、物件池 350 → 1000，大範圍危害場生成爆發每幀每場最多 12 格（80a7d32）。8 招同時：略過特效 290 → 0，p95 12.3 → 12.2 ms、p99 15.8 → 19.3 ms。`perf:frames` 那次開在副螢幕無效，HANDOFF §2 待重跑。
- **驗證**：lint、811 個測試、build、runtime-smoke、perf:guard 全部通過；保真與 UI 基準沒有重錄。
- **收尾**：刪除 `ULT_TIMING_AGENT_PROMPT.md`、`ULT_VISUAL_CLAUDE_AGENT_PROMPT.md`，以及只有這兩份提示詞在讀的 `ULT_REDESIGN_PLAN.md`。

### U. 2026-10-26 雷射改投射物、手機記憶體兩輪（合併 3de15a0、d3c924a、7dd59d0）

結論：遠程光束只留給奧義；iPhone 長跑被系統回收分頁的主因找到並修掉，模擬 iPhone 版面的存活畫布由約 1.6 GB 降到約 0.4 GB。

- **雷射改投射物**（f98b875）：12 招普攻／主動技改成真投射物、6 種新飛行物外觀，tr_a5 改近身命中爆發；`tests/BeamUltOnly.test.ts` 把守；`battle_frozen` 依取證流程重錄（5a8fc24）。
- **GroundDrape 畫布池整理**（4a51934）：大範圍奧義把離屏畫布撐到 2048² 後從不釋放，佔 567 MB；改成每 120 幀整理（沒用到的釋放、過大的縮小）。同時粒子上限依品質階層縮放（`VFX_BUDGET.TIER_BUDGET_RATIOS`）。`perf-lifecycle-soak.mjs` 新增 `--device=iphone`。
- **單位圖集只留 0.5 倍**（39b1025）：選層級的縮放不含鏡頭與 DPR，永遠選 0.5，全尺寸、全尺寸白閃與 0.25 從未被畫到；拿掉後單位圖集 186 → 58 MB，原圖不再持有。保真全過、未重錄。
- **實機**：使用者回報 iPhone「應該沒事」；奧義觀感「先這樣」；雷射改投射物、近戰前衝、行為樹 OK；衝刺殘影太快看不清（HANDOFF B 線 R2）。
- **收尾**：刪除 `BT_OPT_REPORT.md`、`ULT_TIMING_REPORT.md`、`PROJECT_CLEANUP_NEXT_PLAN.md`（三個執行包都完成）。

### V. 2026-10-26 R1 特效零件快取依品質階層給上限（合併 7e3516d）

結論：桌機特效壓力情境的零件快取不再抖動（headless 探針第 2、3 輪擠出 79／5 → 0／0，工作集約 178 MiB）；手機與觸控裝置維持 96 MiB。

- Codex Sol／medium 在獨立 clone `C:\Git\_wt_r1` 實作：`VFX_PARTS.MAX_BYTES_BY_TIER`／`MAX_ENTRIES_BY_TIER`（桌機 224 MiB／576，階層 2／3 為 96 MiB／320）、探針 `tools/ui-e2e/part-cache-probe.mjs`。
- 主代理審查補修：品質階層開場是 0、跑順不降階，iPhone 會吃到桌機上限；新增 `isMemoryConstrainedDevice()`（`pointer: coarse`）與 `CONSTRAINED_MIN_LIMIT_TIER = 2`。
- 驗證：沙盒外完整 `npm test` 825 項、lint、build、runtime-smoke 通過；`perf:guard` 由 Codex 跑過（補修只影響觸控裝置）。
- **主螢幕 `perf:frames`（238 Hz，主代理自跑）**：`battle_vfx_storm` 三輪擠出 0／0／0（改前 151／150／100），最長幀 320.7 → 66.7 ms，1% low 19.1 → 35.8 FPS，median 8.4、p95 16.7 ms 不變；快取 167～184 MB。每輪重新載入頁面，約 240 次未命中都是冷啟動烘焙，剩下 45～67 ms 的長幀歸因同為 VFX Script，推測是冷烘，暫不處理。`battle_calm` 1% low 52.7、`showcase` 58 FPS。報告 `R1_PART_CACHE_REPORT.md` 已刪。
- 派工教訓：Codex workspace-write 沙盒連獨立 clone 的 `.git` 都唯讀，無法 commit，由主代理代為 commit；`AgentRunner.test.ts` 在沙盒內必失敗。`agent-prompt` skill 待更新。

### W. 2026-10-26 BAL-02 平衡重跑（合併 a4e8f47）

結論：天降必中與雷射改投射物後藍方掉到 45.7%，Gemini 3.8H 調 15 招數值後回到 49.9%（一般 49.3%／交換 50.4%），p50 17.4 秒，勝率差超標 0 招。

- 報告 `docs/BAL02_REPORT.md`（改前／改後表、15 招改動理由、§5.2 機制缺口建議）；BAL0 基準併入報告，`BAL02_BASELINE.md` 與提示詞已刪。
- 主代理審查：只改數值欄位、皆在幅度上限內；重跑標準量測與報告逐字一致；lint／824 項測試／build 通過。
- `battle_frozen` 依取證流程重錄（a2ca5e9，先合入 main 的 R1 再重錄）：單位、血條、浮字、特效與導播鏡頭次像素平移；5 張地形 0 重錄、全過。
- 合約：`agent-prompt` skill 的 Codex 段改為「獨立 clone＋複製 node_modules、沙盒內不 commit、測試排除 AgentRunner」（R1 三次派工卡在沙盒寫入與 `.git` 唯讀）。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| BAL02 提示詞把標準量測固定成指令＋「與背景數字 ±0.5% 不一致就停」 | Gemini BAL0 重現 44.0／47.4，主代理重跑最終數字逐字一致 | helped |

### X. 2026-10-27 R2 衝刺殘影停留（合併 53f2901）

結論：衝刺殘影原本只在速度 > 300 px/s 時畫，衝刺 0.13 秒內就減速，殘影一閃即逝；改成高速結束後留在路徑上 0.3 秒淡出，可見時間 0.20 → 0.52 秒。

- `UnitFrameStore` 保存最後一組殘影的世界座標，依 `battleTime` 淡出（暫停不流逝）；軌跡峰值 ≥ `AFTERIMAGE.LINGER_MIN_PEAK_SPEED`（600 px/s，近戰前衝最高 540）才停留。走路、近戰前衝殘影維持 0。RenderSpec §10 同步。
- 探針 `tools/ui-e2e/dash-afterimage-probe.mjs`（wb_a2、wr_a3、mb_a3＋走路、前衝對照組）。
- 驗證：沙盒外完整 `npm test` 836 項、lint、build、runtime-smoke；Codex 跑 `perf:guard`（`battle_frozen` 0.001，未重錄）、`verify:coords` 通過。
- 派工：第一版提示詞把 `rb_a4`（冰霜陷阱）誤列為衝刺技能，Codex 照停下條件停下；以 `--resume-last` 更正後完成。`DASH_MOTION_REPORT.md`、`R2_DASH_AFTERIMAGE_REPORT.md` 已刪。

### Y. 2026-10-27 獅心／灰燼 20 套 skin 正式整合（合併 fe7a9e5）

結論：兩陣營五職業男女 20 套動畫接進遊戲，女性啟用（男女各半），圖集依陣容載入、換隊釋放；模擬 iPhone soak 穩態與改前相同。

- GPT（Codex App）完成試烘焙審查後的整合（S0～S3：離線工具與 `art-source/faction-skins/`、0.5 倍出貨圖集＋manifest `atlasScale`、按陣容載入並行 2、離場釋放、殘影染色快取清除）。審圖用二進位檔（約 35 MB）沒有進 main。
- **記憶體根因**（主代理）：A→B→A 換隊探針顯示應用持有的畫布不累積（圖集固定 20 張約 58 MB），渲染程序卻每換一次隊多約 10 MB——`<img>` 解碼的點陣被瀏覽器依網址快取，20 套輪流上場就一直長。改成 `fetch → createImageBitmap`、烘完 `close()`（8e140f1）：6 輪換隊渲染程序 183→181 MB（原 204→326）；iPhone soak 穩態 2046.2 MB（main 2047.1、GPT 版 2209.6）。GPU 程序 560～830 MB 擺盪屬瀏覽器紋理快取，main 相同。
- **外觀契約**（使用者核准，af0fe0c）：`SHIELD_VISUAL.height` 80→82（圖集未就緒時的預設高度）；護盾範圍測試排除死亡動作（死亡單位不畫護盾）；頭頂容許 8／2→12 px（法師帽 +11.9、戰士坦克改髮型 −4.8；20 套平均與公式差 0.2 px）。
- 驗證：843 項測試、lint、build、smoke、`perf:guard` 通過；300 場模擬改前改後逐場一致（體型不消耗模擬亂數）；`battle_frozen` 取證重錄（ae7d9c1，只有單位圖案變）。
- 合約教訓：給 GPT 的提示詞寫目標＋硬限制，不細拆任務；提示詞要它 `rebase` 與 `AGENTS.md` 衝突，已改成「main 只新增文件就繼續」。提示詞與整合報告已刪。

### Z. 2026-10-27 R4 網格效果優先序（合併 b9bed4a）

結論：同一格的地面資訊只留一層完整填色（縮圈預警／背水一戰 > 詠唱預警 > 危害液面 > 狀態底色 > 縮圈染色／地塊光），次要層降透明或不畫；探針場景中疊兩層以上的格子 19 → 0。

- `engine/renderers/grid/GroundPriority.ts`：256 種旗標組合預先解析成倍率表，`GridRenderStrategy` 每幀唯一寫入逐格表（重用 typed array）；`GridOverlays`／`HazardPainter`／`ZoneRenderer` 只讀倍率。RenderSpec §12。
- 施法者腳下的 AOE 詠唱不再同時畫預警染色與 AOE 指示；詠唱預警改用施法者陣營色（原本全部用第一個施法者的技能色）。玩家射程只留邊線。
- 縮圈預警填色上限：設計稿 0.4 實測變土黃、警示感太弱，使用者看 0.75／0.55／0.40 三格對照後選 **0.55**（ced6b95）。
- 驗證：沙盒外完整 `npm test` 848 項、lint、build、smoke、`verify:coords`、perf A/B 通過；`battle_frozen` 取證重錄（1aec89b，只有預警／詠唱格變），5 張地形未重錄。
- 提示詞與報告已刪。

### AA. 2026-10-27 R3 屍體滑行排序：診斷後不修

- Codex（Sol／medium）只做 R3-0 量測與分類，沒有找到有證據支持、能把 CORPSE×VFX 減半的修法，照停下條件停止；主代理判定不修（DECISIONS §5 2026-10-27）。
- 預設參數下：全部振盪 84、CORPSE×VFX 24、static 1；`--order` 穩定錯序 42 段／196 pair-frames／wrongFrames 421。後者與 COORD-R1 的參數不同。改用 COORD-R1 參數（`--sink --flicker --order --seeds=2 --seedStart=1 --seconds=10 --orderSeconds=10 --biomes=FOREST,VOID,MAGMA --orderBiomes=FOREST,VOID,MAGMA`）在 9b39bde 重量：判定 726,262 pair-frames、穩定錯序 9 段（34）、wrongFrames 105、振盪 65（COORD-R1 cc056b0：701,554／7（23）／131／93）。CORPSE×TERRAIN 仍是同一具屍體的 6 段（20），另有 AURA×TERRAIN、TERRAIN×UNIT、HAZARD×UNIT 各 1 段（3～8 幀）。**沒有退步**，不派二分搜尋；`PROJECT_CLEANUP_COORD_R1_REVIEW.md` 已刪。

### AB. 2026-10-28 R5 手機模擬量測工具（合併 b652615）

結論：新增 `tools/ui-e2e/perf-mobile-emu.mjs`（iPhone 14 Pro 版面＋CDP CPU 降速、真實 rAF、品質階層不釘死），取代在手機上開 `?perf`。只新增工具，產品程式碼沒動。

- 第一份基準（合併 skin、R2、R4 之後，headless dev server）：4 倍 CPU 展示模式平均 64.7／1% low 13.2 FPS，5.4／7.5／28.7 秒降到階層 1／2／3；8 招奧義平均 75.3／1% low 11.6 FPS、全程階層 3。1 倍 CPU 全程階層 0（展示 215／58 FPS、奧義 185／43 FPS）。用法、限制與完整數字在 `docs/R5_MOBILE_EMU_REPORT.md`（保留作基準）。
- 只能模擬 CPU 與版面；GPU、WebKit、iOS 記憶體回收以實機為準。

### AC. 2026-10-28 累計擊殺播報（合併 d334abd）

結論：連殺音效改用 PVPSound 的 UT 播報語音，只放本機。新增「累計擊殺」：全場首殺 First Blood，個人第 2～6 殺依序 Killing Spree、Rampage、Dominating、Unstoppable、Godlike，7 殺以上 MASSACRE（`KILL_SPREE` 事件只有音效；畫面文字仍是 5 秒窗口的 DOUBLE～PENTA KILL，不出聲）。

- 音檔在 `public/assets/audio/local/Kill/kill_1～7.mp3`：Epic 版權、無散布授權，已 gitignore（測試檢查），不列 manifest，不得 commit、push 或部署（`ASSET_LEDGER.md` §7）。`CueDef.synth` 改為選填，沒有合成後備的 Cue 缺檔時靜音。
- 試過但放棄：程序化合成提示音（Codex 實作，使用者聽了不要）、Kokoro-82M 與 Chatterbox TTS（語氣平、會念錯）。兩個 PVPSound GitHub repo 都沒有授權條款，網路上說它是 CC-BY 的說法不涵蓋遊戲原聲。
- 參考：PVPSound 有兩套計數——Multi Kill（16 秒內，Double→Monster）與 Kill Streak（60 秒內，Killing Spree→Godlike），另有 Payback（90 秒內復仇）。我們的 `KILL_STREAK_WINDOW` 是 5 秒，戰棋節奏下可能偏短。
- 疊音修正（合併 36f20e9）：使用者實機聽到好幾句同時播。原因是全場每個單位都會播報，PVPSound 只算玩家本人的擊殺並排隊依序播。改成 `CueDef.exclusive` 互斥群組：播報同時只有一條，高階打斷低階、同階或低階丟掉（不補播）；新那條缺檔時不打斷。
- 開關（合併 c63286f）：音訊設定加「擊殺播報」開關，預設關閉（`AUDIO.DEFAULT_ANNOUNCER_ENABLED`），關閉時引擎丟掉 ANNOUNCER 群組並停掉正在播的。視窗用 HEAD 檢查 7 個本機檔的 content-type 都是音訊才顯示開關（dev server 對缺檔回 index.html），所以沒有本機檔的 clone 看不到。使用者實機聽過，2026-10-28 結案。

### AC. 2026-10-28 手機效能：CPU 歸因與後處理降階（合併 8191bbd）

- **歸因**：iPhone 版面、CPU 4 倍、有 GPU 的視窗模式錄 CPU profile（探針 `tools/ui-e2e/out/_scratch_cpuprof.mjs`，未進 repo）：主執行緒 99% 忙碌；地塊／網格 23～25%（`drawBlock` 10%）、瀏覽器原生 26～29%、其他渲染 17～20%、特效 12～13%、單位 6～9%、模擬 2%。降到品質階層 3 仍滿載，瓶頸是繪製呼叫數。headless 沒有 GPU 時 `drawImage` 會被軟體點陣化高估，歸因要用 headed。
- **地塊烘焙 Phase 2**：計畫擬好但使用者決定先放（HANDOFF §4）。
- **後處理降階**（9153f7b，主代理直接改）：轉場色差與戰鬥結束模糊＋灰階都要複製整張畫布再套 filter，品質階層 2／3 改成跳過，戰鬥結束只留壓暗（`RENDER_QUALITY.POST_FX_MAX_TIER = 1`）。866 項測試、保真全過；`perf:guard` 首跑 FOREST 顆粒 A/B 1.22 屬 vsync 雜訊，重跑兩次 1.00。手機模擬單次量測：展示 1% low 13.2 → 15.6 FPS，但奧義段（改動碰不到）同樣差了約 2.6 FPS，單次雜訊同量級，效果要多次取平均才能確認。

### AD. 2026-10-28 核心寶石藏到角色後面（合併 5acca84）

結論：新 skin 的投影中心落在 Q 版大頭的臉上，半透明寶石蓋住臉。投影成形後的核心改在角色之前畫（`UnitCorePainter` BEHIND 層，被角色擋住），光暈放大 `CORE_VISUAL.behindGlowScale` 1.6，施法與受擊（新 `hitGlow` 0.6 × hitFlashTimer 比例）時從輪廓邊緣透出；實體寶石（拖曳、幽靈、出生前）仍在 FRONT 層，出生期間兩層交叉淡入淡出。位置與 `getCoreAnchor` 不變（投射物起點改前改後相同）。主代理直接改（84b95e7）；866 項測試、smoke、`perf:guard` 全過（battle_frozen 0.194，未重錄）。沙漠地面上施法背光偏淡，主要靠腳下法陣辨識。

### AE. 2026-10-28 R6 近戰高低差規則 A＋縮放（合併 ef93c09）

結論：射程 1 的技能每差一層高度算一格距離（只能打同一層相鄰格），遠程保留高地加成；手動縮放不再被導播拉回，滾輪／雙指改乘法。

- 射程 SSOT `TargetingSystem.getEffectiveRange`：近戰回傳 `射程 − 層數`；射程顯示 `checkIsRange` 改呼叫同一函式（座標棘輪刪 1 筆）。原本高處近戰被高地加成到可砍 3 格外、低打高保底 1 的錯一併消失。
- 選目標：Codex 原本把「沒有同層可站鄰格／走不到」的敵人直接排除；使用者指出行為樹本來就靠追擊尋路與突進／拉取技能接近，主代理改成扣分（`COMBAT_PARAM.MELEE_UNREACHABLE_PENALTY` 1500），自己有可用的突進或拉取技能時不扣分，A* 只對暫列第一的候選跑。br-soak 10/10、0 次發呆。
- 縮放：`UI_SETTINGS.CAMERA_ZOOM`（0.4～3.0、導播 0.45～1.6、滾輪 1.15 倍／100 px）；引擎 `CameraSystem` 是唯一來源；雙擊／雙點或換戰鬥交回導播。
- 平衡（未調數值）：藍方 49.9% → 52.7%、p50 18 秒、超標 3 招 → HANDOFF A 的 BAL-03。
- 與 main 的核心顯示（§AD）、連殺播報合併後：879 項測試、lint、`perf:guard`、smoke 通過；`battle_frozen` 取證重錄（3358aac）。
- 派工：提示詞把 `tests/*.baseline.json` 整個列為受保護，棘輪要求刪除已修好的項目時 Codex 停下；規則改成「基準只准刪除不再出現的項目」。

### AF. 2026-10-28 BAL-03 近戰高低差規則後的平衡（合併 32ec5de）

結論：R6 近戰規則 A 讓藍方升到 52.7%、3 招法師奧義超標；GPT（Codex App，目標導向提示詞）調數值後藍方 51.1／53.0／合併 52.0%，p50 17.9 秒，超標 0 招，同職業差距最大 18.9%（治療）。主代理重跑標準量測逐字一致。

- 改動（只有數值，皆在 ±50% 內、射程不跨 1／2 線）：紅方近戰普攻約 10 招 power +25%；`mr_u3` power 620→900、cost 100→80；`mr_u5` 630→500；`mb_u3` cost 100→85；藍方一招主動技 cast 1.2→1.0、power 320→350；紅方治療 3 招 +20～33%。報告 `docs/BAL03_REPORT.md`（保留）。
- 驗證：lint、build、879 項測試（`AgentRunner` 時序測試在高負載下偶發失敗，單獨重跑 7/7）、保真 6 張全過（`battle_frozen` 0.000，不用重錄）、br-soak 由 GPT 跑 10/10。
- 合約效果：GPT 用目標導向提示詞一次跑完，沒有中途停下詢問；主代理誤把 R7 提示詞提交到它的分支，事先提醒後它保留了該提交。
- `BAL03_AGENT_PROMPT.md`、`R6_MELEE_ZOOM_REPORT.md` 已刪。

### AG. 2026-10-28 R7 大逃殺格界屍體閃爍（合併 6f83ce4）

結論：屍體擊飛滑行達到 `MAX_SLIDE` 後，舊算法每幀用隨時間變化的位移向量重新正規化，浮點末位誤差（約 1e-14 px）讓停在格界上的屍體腳下格在兩格之間交替；旁邊是塌落格時高度在 24 與 −286 之間來回，畫面閃爍。改成用固定初速方向直接求封頂終點（`deathMotion.ts`，6 行），封頂後腳下格切換 55 → 0、高度往上跳 15 → 0。

- GPT（Codex App）在獨立工作樹做；沒有用到已否決的修法（高度 clamp、排序鎖、速度過濾）。RenderSpec 與檔頭同步，新增 DeathMotion 測試要求封頂後每幀座標完全相同。
- **推擠飄移沒有重現**：隔離探針（真實 StackingResolver＋PhysicsEngine，四單位同格）被擠開的單位 0.5 秒內回到新格中心，屬正常過渡；沒改推擠程式，留待使用者提供實機情境（HANDOFF B）。
- 驗證：GPT 在 810dd50 跑全套（300 場逐場相同、座標各項不增加、br-soak 10/10、perf:guard）；主代理在合併 BAL-03 後的 main 補跑 300 場合併前後逐場相同、880 項測試、保真 6 張全過（`battle_frozen` 0.000）。`TerrainBlockCacheBudget` 測試偶發失敗一次，重跑皆過（HANDOFF B）。
- 合約效果：目標導向提示詞＋「300 場逐場不變」這條會失敗的硬限制，讓 GPT 在推擠沒有證據時沒有硬改。

### AH. 2026-10-29 OPT-01 第一批：死碼、部署閘門、工具清理、縮圈修正（合併 85d5708、edf2d71、55c76cd、1a2ba4d）
- 計畫在 `docs/OPTIMIZATION_PLAN.md`。O0 補完清查：Codex Luna 因環境沒有 `rg`、中文亂碼而沒有產出，改用 explorer 子代理（可達性、data 魔法數字、素材路徑）。
- O1（`973e337`，Codex Luna）：刪 `DUAL_STRIKE`、`VISUAL_SLASH`、5 個沒人呼叫的 `useEngineCommands` 輔助函式、`WindowId` 的 `skillDb`／`vfxMap`、多餘匯出、`VFXValidator` 的 `console.log`、`game.ts` 的 `as any`；knip 歸零。`PAUSE_GAME`／`RESUME_GAME` 有測試在用，保留。
- O2（`b14f940`）：`package-lock.json` 進版控；部署改 `npm ci`、Node 24，build 前跑 lint＋test。要 push 後才驗得到 CI。
- O3a（`d2983c9`）：刪 49 支沒有入口的一次性腳本（還原：`git checkout ab8e92c -- <path>`）；新增 `tests/ToolsReferenced.test.ts`。
- O4b（`1b85051`，Codex Sol）：ZoneSystem Z1 預警格每幀強制 AI 決策、Z2 `minRadius`≠1 時背水一戰壞掉、Z3 最終階段可能切斷地圖、Z4 自寫 LCG、Z6 魔法數字。batch-sim 200 場藍方 54.5%→55.0%、平均 20.6→20.5 秒；br-soak 20/20；新增 `tests/ZoneShrink.test.ts`。
- 合約效果：`worker` 子代理的 3 檔上限與 Facade 禁令讓它拒絕 12 檔的 O1（正確擋下，改派 Codex）；O4b 的「不准把勝率調回來」硬限制沒有被觸發（差異只有 0.5 個百分點）。

### AI. 2026-10-29 OPT-01 O4a 規則數值具名化（合併 432f6a8）
- Codex Sol：AI、戰鬥、狀態、地圖、移動、物理 29 檔的 189 個未命名數字搬進 `constants/`（新檔 `constants/ai.ts`；`DAMAGE_RULES` 等），只搬不改值。batch-sim 200 場 seed 1 改前兩次一致、改前改後 61,058 欄位一致。掃描器總數 1,216→1,027。
- 新增 `tests/MagicNumberBudget.test.ts`＋`tests/magic-number-budget.json`：每檔未命名數字只減不增。
- 順帶發現未改：`PhysicsEngine` 的 `isAirborne || z > 0.1` 後半看似多餘。

### AJ. 2026-10-29 OPT-01 O3b＋O5a 雜湊統一與詠唱預警對稱（合併 b763c56、O5a 見 git log）
- O3b：刪 `BAL03_REPORT`、`R5_MOBILE_EMU_REPORT`；清冊凍結；`npm run perf:mobile`；`game.ts` 的「危險決策」只在 `forceAiUpdate`（剛被預警叫醒）時記。
- O5a（Codex Sol）：`engine/math/hash.ts` 收容 8 份確定性亂數／雜湊；`tests/Hash.test.ts` 用舊程式碼的黃金值鎖住（Synth 連續 10 萬次相同）；`tests/NoLocalHash.test.ts` 擋 `engine/math` 以外的特徵常數。同環境 A/B 六張保真場景逐像素相同。
- Z5：詠唱預警不再假設玩家是藍方；`ActiveZone.isEnemy`→`team`，紅藍都用進度波紋＋施法者陣營色（與 `GroundPriority.castColorAt` 同源），刪 `ZONE_RENDER.ENEMY_*`。`battle_frozen` 只在預警遮罩內變動（22,750 px，遮罩外 0），保真仍 PASS，未重錄。
- 教訓（寫進 `render-verify`）：保真數字跨次執行會漂移，「畫面沒變」要用同環境 A/B 證明；第一次派工因為拿兩次執行比容差而白停兩輪。測試裡的 `git ls-files` 加 `-c safe.directory`（Codex 沙盒 clone 擁有者檢查）。

### AK. 2026-10-29 OPT-01 O5b 特效參數具名化
- Codex Sol：`PartBakers`／`PartSpec` → `data/vfx/parts/partConfig.ts`；`VFXFactory`、`UnitShatter`、`CombatVFXHandler`、`VFXPhysics`、`SequenceSystem`、`VFXSystem`、`ProjectileRenderer` → `constants/vfx.ts`。共 259 個（`PartBakers` 181→8）。零件總表 52 件 0 差異；六場景同環境 A/B 逐位元相同；perf:guard 通過。
- 第一次 A/B 探針在未改碼時 FOREST 就有 61 萬像素差異，Codex 正確停下；改用 O5a 證明穩定的腳本後通過。

### AL. 2026-10-29 OPT-01 O6 UI 顏色改用樣式代碼
- Codex Luna：components 9 檔＋`AnnouncerSystem` 的 85 個顏色字面值 → `data/ui/tokens.ts`（`UI_LITERAL_TOKENS`，`gen:tokens` 產生 `styles/tokens.css`）或 `constants/palette.ts`（`TEAM_COLORS` UI 強調色、`ANNOUNCER_TEXT_COLORS`）。e2e:ui 樣式基準 0 差異、未重錄。Tailwind 任意色 class 保留。
- `MagicNumberBudget` 測試加上 `tests/color-literal-budget.json`（顏色只減不增）。
- 第一次因沙盒 git 擁有者檢查直接停下；之後提示詞一律寫 `git -c safe.directory`（`agent-prompt` skill 已記）。

### AM. 2026-10-29 OPT-01 O5c 程序工廠、地形、HUD 參數具名化
- Codex Sol：`UIFactory`、`EnvironmentFactory`、`CoreFactory` 等程序工廠，`TerrainRenderer`／`TerrainLoopAtlas`／`ObstacleSpriteStore`／`TerrainBlockCache`、`NoiseLib`、`background`、`PostProcessor`、`tactical`、`hud`、`FrozenPainter` 共 347 個數字＋`UltWorldRenderer` 9 個顏色 → `constants/{terrain,render,units,hud,vfx}.ts`、`materialConfig`、`vfxPalette`。同環境 A/B 31 張（六場景＋五張地形全景＋20 張底座特寫）0 差異；perf:guard 通過。

### AN. 2026-10-29 OPT-01 O5d 音訊、導播、座標數學、data 函式
- Codex Sol：`Synth` 音色 → `data/audio/synthPatches.ts`；`AudioEngine`／`AudioSystem`、`DirectorSystem`、`AnimationSystem`、`VisualMath`、`TrajectoryMath`、`RenderList`、`RenderStats`、`useGameApp` 等 → `constants/*`；`SkillSequences`、`selectSpriteFrame` 函式內預設值 → 檔內具名物件。13 檔預算降到 0。
- 證據：`tests/SynthGolden.test.ts`（18 種音色，搬前寫好、搬後不改字通過）；六場景＋10 格導播序列同環境 A/B 0 差異；`verify:coords` 固定種子結果相同；perf:guard 通過。主代理把 `RenderSpec` 規格文字改成「實際數值（常數名）」。

### AO. 2026-10-29 OPT-01 O7 架構白皮書＋OPT-01 結案
- O7（Codex Sol）：`docs/ARCHITECTURE_WHITEPAPER.md` 依現行程式碼重寫（14 章、每條附出處、數值用 `{{常數路徑}}` 下載時代入）；`DesignExporter` 改用 `?raw` 載入，系統選單項目改名「下載架構白皮書」，一次下載白皮書＋`RenderSpec` 座標規格；`tests/WhitepaperDrift.test.ts`。刪掉舊版無法由程式碼支持的宣稱（PRODUCTION_READY、絕無轉型、背水一戰中者即死等）。
- **更正**：OPT-01 清查時說白皮書「2025-12-24 起沒有 UI 入口」是錯的——主代理只搜了 `components/`、`hooks/`，漏掉根目錄 `App.tsx:84`（`onDownloadSpec={actions.downloadSpec}` → `SystemMenu`「匯出設計規格」）。功能一直可用；O7 沿用並改善，無損失。之後清查入口要含根目錄 `App.tsx`、`index.tsx`。
- `tools/ui-e2e/windows.e2e.mjs`「DRAFT bodyType」寫死 `MALE`，10-27 男女各半後約一半機率失敗；改成只檢查 `MALE`／`FEMALE`。
- **OPT-01 總結**（2026-10-28～29，O0～O7）：未命名數字 1,231→115、顏色字面值 135→49（`MagicNumberBudget`、`color-literal-budget` 只減不增）；8 份雜湊統一到 `engine/math/hash.ts`（`NoLocalHash`）；刪 49 支無入口腳本（`ToolsReferenced`）；knip 歸零並列入驗收；部署前跑 lint＋test（lockfile 進版控）；縮圈兩個行為 bug（Z1 每幀強制 AI、Z2 背水一戰在 minRadius≠1 時壞掉）與最終階段切斷地圖；詠唱預警紅藍對稱；白皮書重寫。所有「只搬不改值」的輪次都以 batch-sim 逐欄位相同、黃金值測試或同環境 A/B 逐像素相同證明。
- 合約效果：「同環境 A/B」取代「和上次數字比容差」後，O5b～O5d 三輪一次過；`git -c safe.directory` 寫進提示詞後沒有再卡沙盒。`worker` 子代理的 3 檔上限正確擋下 12 檔任務。

### AP. 2026-10-29 收尾、實機問答與修正（Codex 週額度剩 4%，改用 Sonnet 子代理）
- 合約：派工表加「Codex 不足 → general-purpose Sonnet 子代理＋獨立 clone」；HANDOFF §1 不再記 commit 快照，`review-round` 收尾要逐行重讀 §1（§1 停在 10-26 三天的根因）；AGENTS 補 `pushEvent` 佇列與 VFX 零件參數位置；CLAUDE.md 單一寫入者改成「單一擁有者或 domain 模組組」。
- `Agent` 回到純資料：`saveState`／`reset` 移到 `engine/core/AgentLifecycle.ts`；刪重複的 `PAUSE_GAME`／`RESUME_GAME`（遊戲暫停走 `START_GAME`／`STOP_GAME`）；`TerrainBlockCacheBudget` 偶發失敗根因是沒固定時鐘（卡頓 ≥4 ms 超過烘焙預算），已固定。
- 單位 manifest 508 KB→142 KB（緊湊 JSON，內容逐項相同）。
- 近戰攻擊格（見 HANDOFF §2 B）、轉場不閃＋圖集預載＋不借上一張地圖地塊、詠唱頭光 0.85→0.28、衝刺殘影加強；`battle_frozen` 因近戰走位改變重錄一次（取證 `tools/ui-e2e/out/battle_frozen_old_new_diff.png`，地形 5 張未動）。
- **事故**：移除子代理工作樹時 `git worktree remove --force` 順著 `node_modules` junction 刪掉主資料夾部分套件；用版控 lockfile `npm ci` 還原。hook 已擋 `worktree remove --force`；之後子代理一律用獨立 clone＋robocopy 的真 `node_modules`。
- 實機確認結案：skin 外觀、地面預警、縮放、平衡大致 OK（地形約影響 30% 勝負）、屍體閃爍、縮圈、白皮書、低品質結束畫面。推擠飄移結案。正式版素材 P1 已到位（`ASSET_NEEDS.md` 頂部狀態）。地形烘焙 P2-A 的 GPT 提示詞 `docs/BAKE_P2_AGENT_PROMPT.md`。

### AQ. 2026-10-29 多段傷害引擎（Sonnet 子代理，`feat/multi-hit-engine`）
- `Skill.hits { count, interval }`：STORM 類 11 招照 `ult_visuals` 的段數與節奏、黑洞 `mb_u1` 4 段×0.4 秒。`MultiHitScheduler`（`CombatSystem` 每 tick 推進）每段呼叫 `resolveHit`（威力 1/N），爆擊、格擋、護盾、吸血每段各自判定；AOE 每段重判範圍、單體鎖原目標、目標死亡跳過、施法者死亡照打、被放逐取消。
- CC 照 WoW：硬控一次施放對每個目標只套一次（第一段打中時；DOT／HOT／增益也只套一次，護盾量依段數分攤）；遞減依類別（暈眩／沉默／迷惑＝恐懼＋變形／定身／放逐／嘲諷）100%→50%→25%→免疫（`DR_IMMUNITY_THRESHOLD` 0.25→0.125，單發控制也多吃一次）、計時從控制結束才倒數；變形改算硬控。位移與新 `SLOW` 狀態每段套、不吃遞減；移動取危害區與 `SLOW` 較慢者。牽引最多拉到中心格；第 2 段起不算撞擊傷害與受擊推力。
- 傷害帶 `channel: 'DIRECT' | 'PERIODIC'`（只記錄，公式未分流）；危害跳傷間隔進 `HAZARD_RULES.TICK_INTERVAL`；batch-sim 統計危害區傷害。施法者死後不再吸血、不再自傷。
- 驗證（主代理在 clone 重跑）：lint、951 測試、build、knip、smoke、保真全過，`battle_frozen` 0 差異。batch-sim 1500 場 seed 21 勝率 50.3%→50.0%、時間不變；超出 ±5% 的單招見 HANDOFF §2 A。

### AR. 2026-10-30 多段命中視覺對齊、增減益視覺正規化（Sonnet 子代理，`feat/multi-hit-visuals`、`feat/cc-visual`）
- 落點時間唯一來源 `engine/math/HitCadence.ts`（`skill.hits.cadence`：EVEN／ACCEL／CLUSTER），排程器與 `SkillSequences` 共用；`rr_u3`、`rb_u5` 的節奏改成傷害也照打。`rb_u5` 落點掛在 `VFXSequence.impact`，投射物抵達才播。黑洞每段 `FX_ULT_BLUE_BLACKHOLE_PULSE`。實跑探針 12 招落點與傷害同一 tick；1500 場勝率 50.0%→49.9%。
- 羊、冰塊改 Blender 程式建模烘焙（`tools/assets/blender/render_cc_body.py`，共用 `bake_common.py`；`public/assets/cc_bodies/` 約 310 KB），羊項圈用遮罩依陣營上色，執行期只 `drawImage`。
- 狀態視覺：16 組 `STATUS_*` 色帶（測試禁止狀態借陣營色帶）；`status_parts` 改用 `category`（HARD_CC／DEBUFF／BUFF…）；頭頂與腳下各只畫最高優先；新增 `StatusStripPainter` 圖示列（品質階層上限 8/6/4/2），`GaugePainter` 只剩詠唱；`SLOW` 腳踝箭頭；多段傷害數字錯開（`HUD_TEXT_MOTION.STAGGER`）。刪 `UIFactory.generateStatusIcon`、`AssetManager.getStatusIcon`。
- `battle_frozen` 取證重錄一次（圖示列、數字錯開、狀態色；地形 5 張 0 差異，證據 `cc_fidelity_cmp.png`）。主代理在 clone 重跑：lint、991 測試、build、knip、smoke、`perf:guard`、保真全過。

### AS. 2026-10-31 省 token 合約（TokenEconomizer 移植，雲端工作階段 `chore/token-economy`）
- 從 microsoft/TokenEconomizer 萃取規則，不裝插件（判斷模型與 LLM 事實提議器會多花額度）。
- 常駐瘦身：Codex 呼叫說明與檔位表移到新 skill `codex-dispatch`；METHODOLOGY §5／§6 移到 `docs/PROJECT_MAP.md`；HANDOFF §4 烘焙細節改連結。常駐 CLAUDE.md＋HANDOFF＋METHODOLOGY 24.3 KB→21.3 KB（−12%；計畫估 −35% 太樂觀，剩下的多半每輪都需要）。
- METHODOLOGY §1 快取規則（合約／設定中途改下一個工作階段才生效）；§6 環境事實清單（≤12 條、附日期、禁「可略過／已完成」，`HarnessContract` 檢查）。
- 迴圈守衛 hook（`PostToolUseFailure`）：同一失敗第 3 次要求換假設、第 5 次停下回報。狀態改成只附加的日誌：實測三個平行失敗用讀–改–寫只記到 2。雲端實跑觸發成功；Codex payload 形狀未實測。
- 工具修剪：deny `NotebookEdit`；`tools/agent/tool-usage-audit.mjs` 依 TE 門檻提出建議，不寫設定，`review-round` 約每 5 輪跑一次。
- 驗證：lint、build 過；測試 992/993（`AgentRunner` Linux 上本來就失敗，CI 已排除）。
- 合約效果：待觀察（迴圈守衛的提醒有沒有讓代理換方向、環境事實有沒有增長），下一次 review-round 記。

### AT. 2026-10-31 憲法切分、AS 覆核、Gemini 改由主代理直接派（本機 `chore/constitution-split`）
- 使用者把全域 `~/.claude/CLAUDE.md` 定為憲法（位階高於本 repo 合約）。本機事實（PowerShell 寫法 6 條）移過去；Codex 檔位表、額度、呼叫方式移到全域 `codex-call` skill，`codex-dispatch` 只留 hook 與副本同步。雲端工作階段讀不到憲法，鐵律仍留在本 repo。
- AS 覆核修了兩個 bug：`tool-usage-audit.mjs` 沒讀子代理紀錄，會建議 deny 只在子代理用過的 `ReportFindings`（實測 2 次），另依 TE 保護計畫模式與網路工具；`HarnessContract` 環境事實測試在 Windows checkout（CRLF）必失敗，改用 `/\r?\n/` 切行。
- 迴圈守衛另有全域版 `~/.claude/hooks/loop-guard.mjs`，本 repo 自己掛了 `PostToolUseFailure`，全域版讓位。
- 長線實作改由主代理用 agy 直接派 Gemini 4（`agent-prompt` 改寫；不順利才回 IDE `/goal`）。`tools/agent/gemini-allow.json` 是確切指令的允許清單，`HarnessContract` 擋萬用字元與 commit／push／刪除。實測：萬用字元無效、`--mode auto` 帳號不能用、被拒一次整個執行就結束、不寫「不串接」時模型會把兩個指令串成一行；Gemini 不能 commit，由主代理審查後代為 commit。
- 驗證：lint、build、`npm test` 全過（見本輪 commit）。
- 同日重評 Gemini 檔位（全域 `agy-call`，原名 `gemini-call`，記來源）：Argon 代理式寫程式落後 Sonnet 5.5（Terminal-Bench 4.0 約 57% 對 71%），訂閱額度約 3.8 Flash 的 8～11 倍，論壇有 Argon（high）在測試反覆失敗時改驗證腳本、捏造完成報告的詳細回報。實作小包改為先 Flash high、兩次不及格才升 Argon medium，一份提示詞 ≤3 任務；`agent-prompt` 範本加「驗證不准動」與報告附檔案:行號，審查先看 `tests/**`。
- 同日再改：agy 裡的 Claude Sonnet 5.5（走 Antigravity 額度，不吃 Claude Pro）納入派工。同一小任務（slugify，埋一條矛盾案例）實測：Sonnet medium 18 秒、輸出 1.5k；Flash high 61 秒、輸入 77.5k／輸出 6.2k；Argon medium 72 秒、輸出 2.3k；三者都停下回報矛盾、沒改測試。實作小包首選改為 agy 的 `claude-sonnet-5-5-medium`、次選 Argon medium；使用者回報訂閱額度，主代理記在 `~/.claude/QUOTA.md` 並依換池順序自己切換。另實測 agy 會寫到工作區外（使用者全域設定 `nonWorkspaceFileAccessPolicy: ALLOW`，`--settings` 蓋不掉）。
- 同日再改（使用者提供 Antigravity 額度畫面）：Pro 有三個池：Gemini Models（Flash，5 小時＋週）、Gemini 4 Argon（只有週）、Claude and GPT（5 小時＋週，週只有約 1.5 個 5 小時窗）。以本機用量反推（`~/.claude/QUOTA.md`）：Claude 池週約 2.2 美元等值、Argon 週約 5 美元、Flash 5 小時約 10 美元；換算實作小包每週 Sonnet 約 2 包、Argon 約 3 包，Opus 一次長線就接近整週。實作首選改回 Argon medium，agy 的 Sonnet 只當升級，Opus 不用；讀檔與機械性工作只走 Flash 池。
- 同日修正：Flash 池最大，token 多不是成本，規格明確的實作小包改回 `gemini-3.8-flash-high` 首選（A/B 一樣過關、老實回報矛盾）；要跨檔判斷的給 Argon medium；兩次不及格再升一級，Sonnet 最後。
- 11/01 依使用者對三家服務的評價定分工（寫進憲法）：Claude 最貴最穩，寫程式與架構遠勝 Codex；Codex 美術視覺強、邏輯不輸 Claude，只派美術視覺與邏輯根因，不派寫程式；Gemini 便宜耐操，主力 3.8 Flash high，Gemini 4 Argon 使用者實際用過覺得不堪用，不派實作。Flash 兩次不及格或要判斷的小包收回 Claude（agy 的 Sonnet → Sonnet 子代理）。

### AU. 2026-11-01 轉場實機確認結案
- 使用者實機看轉場（不閃、圖集預載、單位停穩 3 幀後出現）OK，HANDOFF §2 C、§3 第 1 項刪除。CPU×4 模擬剩下的 33～58 ms 進場尖峰移到 HANDOFF §4，與地形烘焙一起暫緩（轉場期間已有 12 ms 分幀烘焙，尖峰來源未量）。

### AV. 2026-11-01 未命名數字清理 D1～D3（agy Gemini 3.8 Flash high，合併 `725d30a`）
- 只搬家不改值：D1 UI／hooks／數學／鏡頭 21 檔（47 數字、2 顏色，`5b63708`）、D2 graphics＋presentation 18 檔（15、19，`d49dacc`）、D3 渲染器 15 檔（25、17，`7786c63`）。新物件放在 `constants/ui.ts`、`render.ts`、`vfx.ts`、`hud.ts`、`terrain.ts` 檔尾；數學固有值（`HEX_SIDES` 等）用檔內常數；同值同義的沿用既有常數。預算檔 108／49 → 9／6，剩下的是刻意不動（HANDOFF §2 D）。
- 證據：每包 lint、`npm test`（994）、build、knip、runtime-smoke；D2、D3 `perf:guard`（保真＋效能）；D3 `coord-guard --order` 與 base 同環境 A/B，每個種子 judged／wrongPairFrames／stableEpisodes 相同。`ConstantsBarrel` 名單與快照只新增。回退：`git revert -m 1 725d30a`。
- Flash 品質：D1 部分及格（20 檔正確，但把 `constants/render.ts` 每個物件結尾的 `} as const;` 刪光、沒加要求的物件；一個指令被拒後結束，沒報告）；D2 及格；D3 第一次不及格（同一段常數往檔尾重複貼約 15 次，想用 git 還原被拒，104 秒結束），第二次改成主代理先加好常數、提示詞禁止 git 還原後及格。三包都由主代理調降預算、補快照。
- 觀察（confounded，未升級成規則）：3 次失敗有 2 次在「往共用常數檔新增」那一步；D3 第二次同時改了兩個條件，無法單獨歸因。之後類似的搬家輪，可以先試「主代理先加好常數、代理只改使用處」。提示詞也寫錯兩處計數規則（`Math.PI / 6`、`1 << 5` 在算式裡仍算），由主代理修正。
- 派工：`tools/ui-e2e/out/` 在新 clone 不存在，agy 輸出改寫到 scratchpad；Git Bash 的 robocopy 會把 `/E` 轉成路徑，改用 PowerShell 執行。

### AW. 2026-11-01 震動收歸導演、大逃殺模式、換場背景淡化（過夜長線，合併 `98cb693`）
- **T2 震動**（`feat/shake-director`）：13 個震動來源改送 `CAMERA_IMPACT`，由 `DirectorSystem` 的 `ShakeDirector` 決定：同 tick 取最大不累加、MINOR 衝擊打在非焦點單位乘 0.4、上限 0.7，導演 AI 關掉照樣運作；`CameraSystem.addTrauma` 取最大、抖動改兩條正弦。RUMBLE 改聽 `CAMERA_IMPACT`（ULT／FALL／KNOCKBACK／DASH，與以前發 `CAMERA_SHAKE` 的同一組）。導演設定視窗三個滑桿（`SET_SHAKE_TUNING`，夾在 `UI_SETTINGS.SHAKE_*`）。單位受擊抖動、VFX 零件抖動不動。
- **T3 大逃殺**（`feat/allegiance`）：`Agent.side`（預設＝team，複製到危害區、投射物），53 處 `x.team ===/!== y.team` 以 codemod 改成 `sameSide()`（`engine/core/Allegiance.ts`）；勝負看最後剩的 side。`PLACE_AGENT.side`、`winnerId`、`battleMode`（TEAMS／ROYALE）；ROYALE 生成 10 人各一個 side、外觀技能隨機 team，控制列與展示畫面都有「雙陣營／大逃殺」鈕。勝利畫面與檢視器的陣營名改讀 `getFactionSkin(team).name`。
- **T1 背景**（`feat/bg-crossfade`）：閃爍原因是換場景那幀靜態背景快取同步重建後直接畫上（全螢幕 A→B）。改成雙畫布、轉場中 0.6 秒淡入（`BACKGROUND_FX.SCENE_FADE_S`），IDLE 時照舊直接切（保真不受影響）。證據：背景條平均色 main 換場景一次跳 18，分支約 0.5 秒內逐步、每步 ≤ 8。
- **背景耗用率**（`tools/ui-e2e/out/bg-layer-probe.mjs`，CPU 每幀平均）：桌機 0.035～0.064 ms（靜態底圖約 0.007、光點＋光暈約 0.02、極光 0.029、樹冠光束 0.015、沙塵 0.013、霧 ≤0.008）；CPU×4 最高 0.165 ms，且自動降到第 3 階關掉動態層。CPU 上不需要降級；GPU 填充量不到，留手機 `?quality=3` 對照。換場景後 33～38 ms 的幀不是背景。
- 證據：三條疊在 main 上試合併（只有 `types.ts` 兩邊新增，兩邊都保留），lint、1014 項測試、build、knip、smoke、perf:guard 全過；`balance:sim --battles=200 --seed=21` 與 main 逐欄相同（只有 `wallSeconds` 不同）。回退：`git revert -m 1` 各合併 commit（`47877710` 震動、`290da7c0` 大逃殺、`98cb6939` 背景）。
- Flash 品質：T2 及格但漏了規格沒列的兩個來源（我的 grep 被 `head` 截掉），還自己加了音效備援旗標讓舊測試過關（已移除、測試改成新契約）；T3 第一次在另一個 agy 同時執行時一開始就被拒，單獨重派後及格；震動 UI 及格（最後一個指令被拒，沒報告）。常數、型別全部主代理先加好，三包都沒再出現 D 輪那種常數檔損壞。

### AX. 2026-11-01 遮擋剪影灰白修正（主代理，合併 `d48d69e`）
- 使用者回報單位進戰鬥後蒙一層灰白、雙方都有、不太會恢復。排除：受擊閃白（計時為負）、狀態疊色（visualStatus NONE）、護盾、mip 圖集（載入時預烘）。實證：把 `UNIT_SPRITE.silhouetteAlpha` 暫時設 1.0，被判定遮擋的單位整個變白，其中幾個前方沒有東西。
- 原因：遮擋剪影把 25% 白整個疊在被判定遮擋的單位上；判定寬（前方鄰格高 20 px、或 60 px 內有障礙物），戰鬥中常成立。
- 修正：`SilhouetteMask` 把剪影裁成只畫在擋住它的東西上——地塊＝頂面六角往下延伸的凸包、障礙物＝圖的不透明像素（暫存畫布 destination-in）；位置取本幀 TERRAIN／OBSTACLE op。`GridSpatial.getOcclusionSources`（判定與舊兩函式同一份）；RenderSpec §13。
- 證據：lint、1019 項測試（新增 `tests/SilhouetteMask.test.ts`）、build、knip、smoke、perf:guard；`battle_frozen` 保真 0.167→0.368、壞像素 0.00%→0.38%（門檻 0.5%，未重錄），新舊差異只在被遮擋單位與其上的半透明傷害字。剪影強制 1.0 時單位維持原色、白只出現在擋住單位的柱子上。回退：`git revert -m 1 d48d69e`。
- 過程：探針一度關錯函式（改 `GridSpatial` 靜態方法沒攔到 renderer 的呼叫）而誤判「不是剪影」；假時鐘相減因粒子雜訊失敗；最後用「把效果放大到 1.0」直接看最快。修正一開始誤以主資料夾當時的 `feat/announcer-side` 為基底，已改疊到 main 重驗。

### AY. 2026-11-01 擊殺播報依觀看陣營、導播目標進取景（另一工作階段實作，主代理審查合併）
- 擊殺累計改成每個陣營一個池（`sessionState.sideKills`，大逃殺＝每人一個）；語音播報、First Blood、DOUBLE～PENTA 字只給觀看陣營（`Allegiance.isWatchedSide`）。觀看陣營＝`DirectorSystem.getWatchSide`：導播開＝導播目標的陣營，關＝單位檢查器點選的單位（新 `UICommand SET_WATCH_AGENT`），變動時發 `WATCH_SIDE` 給 AudioSystem。
- 拿掉擊殺／奧義強制切鏡（`KILL_FOCUS_S`、`ULT_FOCUS_S` 刪除）；導播目標永遠加進取景群組、權重最高（`tests/DirectorFraming.test.ts`）。`battle_frozen` 因鏡頭構圖改變在分支上重錄（只有這張；證據圖 `tools/ui-e2e/out/battle_frozen_old_new_diff.png`，未進版控：整張略為拉遠平移，單位與地形相對位置不變）。
- 合併：基於 `1b2c56c`，與 main 的遮擋剪影修正只在 `docs/HANDOFF.md` §3 衝突（兩項都留，編號 9、10）；基準圖 main 沒動、沒有衝突，不重錄。
- 證據（合併後）：lint、1028 項測試、build、knip、smoke、perf:guard 全過；`battle_frozen` 0.062、壞像素 0.16%（門檻 0.8／0.5%），其他 5 張與合併前相同。

### AZ. 2026-11-01 設定表單分類抬頭（主代理）
- `SchemaForm` 加 `heading` 欄位類型（只有標題、沒有值）；導演設定分成「自動運鏡」「鏡頭震動」，展示設定的鏡頭分頁共用同一份 schema。`tests/SchemaForm.test.ts` 檢查分組。
- 順手修 e2e：工具列小視窗（420×400）檢查原本等 500 ms，剛好碰上 500 ms 的位移過場；大逃殺鈕讓工具列變寬後要先切精簡排版再滑回，量到半路（x=98～148）。停下後 x=9、寬 403。斷言不變，等待改 1200 ms。
- 證據：lint、單元測試、knip、smoke、e2e:ui 全過；截圖確認兩個抬頭。
### BA. 2026-11-01 遊戲玩法面板：陣營數×每陣營人數（主代理）
- 使用者：大逃殺按鈕位置不好，要正規的玩法面板、可定義陣營數與人數。拿掉控制列與展示畫面的模式鈕；縮圈視窗改名「遊戲玩法」，加「陣營」區（陣營 2～8、每陣營 1～10、總數上限 20、套用鈕），展示設定的玩法分頁共用同一份 schema。
- 資料流：`engine.battleSetup` 唯一寫入者 `UICommandSystem`（`SET_BATTLE_SETUP`，夾範圍與總數）；`APPLY_BATTLE_SETUP` 發 `BATTLE_SETUP_APPLY`，`useGameApp` 收到後換新地圖重生成（展示模式直接開打）。生成：兩陣營沿用左右對分（預設 2×5 與改前完全相同），三個以上用最遠點取樣選據點、各陣營輪流取最近空格；皮膚依陣營雙數藍、單數紅。結算文字依這一局的設定。`SchemaForm` 加 `action` 欄位類型。
- 證據：lint、1032 項測試（新增 SET_BATTLE_SETUP／APPLY 與玩法 schema 測試）、build、knip、smoke、e2e:ui、perf:guard 全過，六張保真數字和 main 完全相同。實跑：面板設 4×3 套用→12 人、side 0～3 各 3 人；6×1→6 人各自一陣營，5 倍速打完結算「最後倖存者」，頁面錯誤 0。
- 沒做：三個以上陣營的外觀區分（只有藍紅兩套皮膚）。

### BB. 2026-11-01 玩法面板總池制、轉場壓黑（agy Flash high＋主代理）
- A：`querySpawnableHexes`（不含障礙物與最外圈）由生成與面板共用；`SET_BATTLE_SETUP` 夾到總池＝min(可出生格−1, 40)；selector 提供 pool／maxFactions／maxUnitsPerFaction，滑桿用 `maxValueId` 動態上限；生成前依新地圖重新夾並在設定變動時重新規劃陣容。
- B：`RenderPipeline` 最上層黑幕，OUT 漸黑、IN 漸亮（`BACKGROUND_FX.BLACKOUT_FADE_S` 0.35 秒）；RenderSpec §1 與檔頭補一行。探針：展示模式兩次換場，換場前 6 幀四個取樣點亮度都是 0。
- 派工：主代理先加常數、`maxValueId` 欄位與 3 個規格測試。Flash 做完 A1、A2 後被一個不在允許清單的指令拒絕而結束（沒報告、留下多餘空行與混合行尾）；接生成、清理、B 由主代理做。
- 證據：lint、1034 項測試、build、knip、smoke、e2e:ui、perf:guard 全過，六張保真數字與 main 相同。

### BC. 2026-11-02 AI 發呆與大逃殺勝率量測、全員坦克修正（agy Flash high＋主代理）
- 工具 `tools/balance/ai-idle-sim.mjs`（`npm run balance:idle`）：四個場景，輸出各職業勝率、存活、擊殺、死因與發呆原因，加總對不上就失敗。Flash 寫，主代理排除勝負已定的慢動作階段、加 `--hp`、依隊伍統計勝場。
- 使用者「每場都是騎士贏」的主因：`planShowcaseRoster` 用陣營內索引取職業，每陣營 1 人時全是坦克（BA 帶進來的錯）。`factionRoleIndex` 修正，2×5 不變。實跑：10×1 各職業 2 人、4×3 為 3／3／2／2／2、2×5 各 2 人。
- 量測時發現：`useGameApp` 開局血量 600～1000 蓋掉職業血量，`batch-sim` 卻用職業血量，過去平衡數字和遊戲內不同。待使用者決定（HANDOFF §2 F）。
- 基準（200 場 seed 21，遊戲內血量）｜大逃殺勝率：法師 37%、遊俠 26.5%、輔助 18%、坦克 9.5%、戰士 7%，平手 4，紅方法師 53 勝對藍方 21 勝。發呆：坦克 6.2%、戰士 4.5%、其他約 1%。全戰士 5v5 發呆 2.2%、全戰士大逃殺 2.5%。
- 開局改用職業血量（使用者 11-02 決定）：拿掉 `SPAWN_HP_*`。每人保留一次 `random()` 取號，否則之後的地圖亂數整串位移（VOID 18.5、battle_frozen 4.8，保留後六張都過，不必重錄）。
- 量測與設計提案寫在 `docs/AI_ROYALE_DESIGN.md`：大逃殺勝率、混用插槽實驗、發呆與繞圈根因。
- 證據：lint、1035 項測試、build、knip、smoke、perf:guard 全過，`battle_frozen` 0.065。

### BD. 2026-11-02 AI 狀態拓樸與大逃殺規則（主代理，M1～M8）
- 架構：`engine/ai/ModeMachine.ts` 依 `data/ai_profiles.ts` 的 `AI_MODE_GRAPH` 切模式，每個模式一棵小樹（DEAD、CONTROLLED、ACQUIRE、ENGAGE、FIGHT、RETREAT、TRAPPED、UNSTICK、FINALE）。對外仍是 `a.bt.tick(a)`；檢視器顯示目前模式、它的樹和最近的轉換。
- 使用者決定（11-01 回覆「OK」接受提案，實機要再看）：近戰在跳躍力內可打高低差（推翻 R6 規則 A）；地塊 ≤ 活人，或活人 ≤3 且地塊 ≤7 就進背水一戰，地圖停止縮小。
- 量到的根因：逃生只看鄰格（警告圈兩層厚或安全格被佔就判無路可逃）；重力場 ×0.3 速度沒算進逃生時間；選敵在射程外每次決策重算；遠程 `goalUnchanged` 永遠不成立；出生可能落在被障礙物圍死的格子。
- 量測工具修正：`moveBlocked` 是誤判（敵方重力場裡慢慢走，每 tick 不到 0.5 像素）；被控制不算發呆。基準用修正後的工具在 M2 重量，舊數字（全坦克 ≥3 秒 1.71 次／場）含誤判，不能直接比。
- 數字（200 場 seed 21，基準→現在）｜≥3 秒發呆／場：全坦克 0.39→0.01、大逃殺 0.04→0.01、全戰士 0→0、雙陣營 0.01→0.04（都是贏家等被放逐的最後一人）。路徑重算／秒：全戰士 1.62→0.74、全坦克 3.37→1.48。繞圈：全戰士 4.65%→1.89%（目標 1.5% 未達）。過早逃跑：大逃殺 2.8%→0.86%、全坦克 3.91%→1.86%（目標 0.5% 未達）。大逃殺勝率 坦克／戰士／遊俠／法師／輔助 41.2／7.0／18.6／19.1／14.1 → 21.1／18.1／23.1／22.1／15.6。背水一戰時長：大逃殺平均 2.9 秒、最長 7.1 秒；全坦克 5.3 秒、p90 12.2 秒。
- 未達或沒做：墜落死亡佔比大逃殺 5.9%→6.0% 沒變（多半是落地時被暈）；`_savedCombatTarget`（施法目標與戰鬥目標分開）沒拆，見 HANDOFF。
- 副作用：雙陣營藍方勝率（1500 場 seed 21，兩種擺法平均）51.4%→55.5%。分段：M4 50.9%、M5 54.2%、M6／M7 55.5%。沒調數值，待使用者決定。
- 保真：`BTNode.id` 原本用 `Math.random`，節點數一變就移動表現流；VOID 又是鏡頭還沒從展示戰鬥收斂就擷取，所以 M1 模擬完全相同卻 VOID 失敗。id 改計數器、暖機改 8 次。重錄 VOID（只有鏡頭，五個場景的地塊高度與障礙物和主線相同）與 `battle_frozen`（單位位置）。
- 證據：lint、1048 項測試、build、knip、smoke、e2e:ui、perf:guard 全過；瀏覽器實跑 10×1 三場 0 個頁面錯誤。

### BE. 2026-11-02 本機清理與文件全量核對（主代理＋agy Flash 只讀盤點）
- 刪分支 `docs/royale-balance-notes`、`feat/ai-topology`（都已合併）；清 `tools/ui-e2e/out`（176 MB 一次性輸出）與 `dist`；移除 6 個空的 `_wt_opt-*`。6 個有內容的 `_wt_*`（約 3.5 GB，查過沒有未合併的分支與未提交的改動）由使用者手動刪（主代理的刪除被權限檢查擋下）。
- 刪文件：`BAL02_REPORT`、`R7_DRIFT_CORPSE_REPORT`、`ULT_VISUAL_CLAUDE_REPORT`、`ULT_VISUAL_MATRIX.csv`（結論在本檔 W、AG、T 節）；`PROJECT_CLEANUP_AUDIT01_*.csv`（凍結的清冊）；`BGM_CANDIDATES`（已由 `data/audio/music.ts`、`ASSET_LEDGER`、`CREDITS` 取代）；`CORE_PROJECTION_DESIGN`（已實作，規格在 `RenderSpec`、`VisualMath`、`PEDESTAL_CORE`）。
- 修正：README（控場 19 種、AI 拓樸、VFX 展示庫、匯出器、背水一戰、大逃殺規則、平衡指令）；AGENTS（`materialConfig` 範圍、AI 位置）；PROJECT_MAP（戰鬥曲、AI 段落）；ASSET_NEEDS（冰塊與羊已烘焙）；ASSET_LEDGER（補 10 組女性圖集）；ART_STYLE_BIBLE（不存在的檔名）；`prepare_runtime_atlases.mjs` 與它的 README 指向已刪分支，改標籤。
- 工具：刪 `tools/ui-e2e/drift-corpse-probe.mjs`（R7 一次性取證）；`parts-sheet`、`ult-battle-probe` 還用得到，入口改記在 `VFX_PIPELINE_MAP`。
- Flash 的 23 份盤點，查證後兩條是錯的（`tools/hooks`、`UnitShatter.ts` 都存在），另外漏了指向已刪分支這條。

### BF. 2026-11-03 展示模式隨機陣營×人數、標題依模式變化（主代理）
- `rollShowcaseSetup`：一半機率雙陣營（每邊 5～10 人，五個職業才會全部露出），其餘大逃殺（先抽每陣營人數再抽陣營數，否則陣營一多就只剩每陣營 1 人），總人數 8～20。常數 `GAME_APP_PARAM.SHOWCASE_SETUP`。
- 標題卡：`BATTLE ROYALE · 4 FACTIONS × 5` 玫瑰紅，`TEAM BATTLE · 6 VS 6` 青色。
- 探針抓到兩個錯：抽設定時地圖還是上一局縮圈後的殘圖，總池很小被夾低（出現 2x1）；StrictMode 重跑 effect 把隨機值存成玩家設定，回手動沒還原。都已修。
- 證據：瀏覽器連跑 12 局都在 8～20 人、標籤相符、回手動 2×5、0 個頁面錯誤；lint、1051 項測試、build、knip、smoke、e2e:ui、perf:guard 全過，基準沒有重錄。

### BG. 2026-11-03 近戰被打回頭、陣營染色、背水一戰留一格（主代理＋agy Sonnet 量測／Flash 實作）
三項各一條分支、疊著做（`feat/melee-dodge` → `feat/faction-tint` → `feat/last-stand-one`），2026-11-03 一起合併。
- **近戰躲貓貓**：新增被打回頭（剛掉血、現有目標在射程外 → 鎖定 `lastHitSourceId`，嘲諷優先；`TARGET_RULES.RETALIATE_WINDOW_S`＝1，受擊時間由 `TargetingSystem` 自己記，不加 Agent 欄位）。量測工具新增 `mutualLockPct`、`hitNoTurnPct`、`CIRCDIAG`。數字（200 場 seed 21，`node tools/balance/ai-idle-sim.mjs --scenario=MELEE …`）：被打沒回頭 1.64%→0.79%；繞圈 1.89%→1.88%（目標 1.5% **未達**）；換目標／分鐘 9.6→11；≥3 秒發呆 MELEE 0→0、TEAMS 0.04→0.06（贏家等最後一人被放逐）、ROYALE 0.01→0.01。雙陣營藍方勝率（`npm run balance:sim -- --battles=1500 --seed=21 [--swapSides]`）兩種擺法 53.9／57.1 → 54.1／57.1（平均 55.5→55.6）。「互相鎖定又打不到」只有 3.24%、單段最長 2.23 秒，是正常接近，沒做「一方站住等」。繞圈約六成是目標在鄰格、自己施法中（走開再回來的戰鬥位移），約兩成是繞著沒鎖定自己的靜止目標走（攻擊格被佔滿，要做 P1 ③ 攻擊格認領）。
- **陣營染色**（只在陣營數 ≥3）：`data/units/factionTint.ts`（色票池＝藍原色、紅原色、六個色相，每局以 matchSalt＋局數洗牌；HSV 換色，藍色範圍 190～262°、飽和度 ≥0.18）、`Agent.look`、`getAgentSkin(agent)` 是渲染端的外觀唯一入口；圖集變體鍵 `BLUE:MAGE:MALE@135` 在 `SpriteAtlasStore.bakeAtlas` 烘焙期做一次，剪影在同基底的變體間共用。雙陣營路徑與快取鍵形狀不變：`npm run perf:guard` 全過，保真基準沒有重錄。載入耗時（探針 `--per=3`，6 人／17 人／22 人）：2 陣營 111 ms、6 陣營 384 ms、8 陣營 616～703 ms（約每個變體 +70～100 ms）。記憶體（實測，展示模式 40 局，畫布面積加總）：平均約 71 MB、最高約 99 MB；main 同量測 8 局最高 81.7 MB。實際只留 0.5 層級，每張約 2.9 MB；剪影共用抵掉大部分增量。手動 40 人的上限約 174 MB（算的）。血條色碼另放寬來源色相到 180°（藍隊血條 187°，在圖集範圍外）。已知限制：羊的項圈（`CcBodyStore`）、護盾描邊（用色階 id）、地面施法區域（`GridOverlays` 的 `zoneInfo.team`）、結算標題與檢視器仍用隊伍色；陣營多於 8 時顏色重複。
- **背水一戰留一格**：`checkLastStand` 只在地塊剩 1 格觸發，移除 `ZONE.LAST_STAND_FEW_ALIVE／FEW_TILES`，沒加新 AI 模式（TRAPPED 就是大風吹）。數字（200 場 seed 21，`--scenario=ROYALE`／`TANK_ROYALE`）：墜落佔死亡 5.5%→6.2%／3.4%→6.0%；平均時長 29.3→29.8 秒／38.0→39.0 秒；≥3 秒發呆 0.01→0.01（兩者）；背水一戰時長平均與最長都只有 0.5 秒（最後一格一到，多出的人隨塌陷掉落）。
- **使用者審查後的兩個修正**：
  - 坦克不回頭（`TargetingSystem` 加 `a.role !== Role.TANK`）。全員大逃殺各職業勝率（5 個種子各 200 場，T/W/R/M/S）：main 24.9/16.5/22.0/18.6/18.1；近戰都回頭 31.9/15.8/18.3/17.7/16.4；現在 26.4/17.5/20.4/18.2/17.4。雙陣營藍方勝率 53.5／56.2（平均 54.9，每種擺法 ±2.5）。
  - 背水一戰改成最後一圈開始倒數時觸發（`checkLastStand`：警告格數＝地塊數−1，要確認警告格屬於這一層），倒數結束照常塌陷。AI、`StackingResolver` 看新的 `isFinalTileOnly`，倒數期間照原來的判斷逃與搶格子、每格只站一人；傷害三倍、禁治療、橫幅從倒數開始。時長（200 場 seed 21，`ai-idle-sim`）：ROYALE 18 場，平均 3.7、p90 8.2、最長 10.5 秒；TANK_ROYALE 53 場，平均 5.1、p90 10.5、最長 10.5 秒；TEAMS 3 場，平均 4.5、最長 6.7 秒。平手 2／2／0 場，與修正前同級。多數不到 10 秒是因為傷害三倍先打完。

### BH. 2026-11-03 手機奧義掉幀：貼地特效改合成圖＋預烘六角遮罩；縮圈不再重置鏡頭（主代理）
結論：iPhone 14 Pro 5v5 持續放奧義從 34～36 FPS、低 5% 13 變成 60 FPS、低 5% 53～55（階層 3）；自動畫質＋導播 60／56.6，自動升到階層 0（完整解析度）時仍約 55／40。10v10 自動＋導播 41.7／30.1（修前約 21.7），未達 50。

- **怎麼找到的**：桌機量不準。CPU×4 模擬把問題指向主執行緒，但實機渲染 JS 只有 2～3 ms／每幀 24～46 ms；本機三種設定（有 GPU、無 GPU、無 GPU＋CPU×4）都重現不了實機排名。改用網址帶旗標的實機 A/B（程式在 commit 10f5065a 的 `diagnostics/`，已刪，要用再從 git 取），逐項關掉、交替跑抵銷發熱，每輪約 2.5 分鐘：
  - 第一輪：只有不畫地塊到 60 FPS；毛玻璃、UI、混色、`ImageBitmap`、液面、危害區、解析度都在雜訊內。
  - 第二輪：地塊本身無辜，不畫**貼地特效**才到 60 FPS，它在同一個 op 裡。整片烘成一張 36.9、共用大圖 36.3，都沒幫助。
  - 第三輪：**六角路徑裁切**才是主因。改矩形裁切 60.0／56.5（貼回 219 次），不裁切 59.9／54.8；`Path2D` 43.3、不用 screen 46.2、離屏半解析 48.3、離屏每 3 幀 42.0。
  - 第四輪：逐特效遮罩 42.6～56.8，每個特效最多三層，成本隨特效數增加。
  - 第五輪：合成＋pattern 遮罩 59.7／60.0，和矩形對照同級；合成＋預烘大圖只有 32 FPS（drawImage 貼大張遮罩比 pattern 填色慢得多，原因沒查）。
- **做法**：貼頂面的鋪設依混合模式合成一張（`GroundDrapeLayer.renderPlanes`），與 `engine/renderers/DrapeHexMask.ts` 的預烘遮罩合成三色層（(q−r) mod 3，相鄰格必不同色），逐格只貼矩形。懸空平面（詠唱環）每個一組三色層。觸控裝置離屏單邊上限 1024（`GROUND_DRAPE.MAX_CANVAS_PX_TOUCH`）。`tests/DrapeHexMask.test.ts` 擋住改回路徑裁切。
- **畫面**：五種地形與直向六角同幀比對，差異約動態雜訊的 1.5 倍；合成版沙漠左側法陣略偏粉紅。保真沒有重錄，`battle_frozen` 0.163→0.201（上限 0.8）。
- **鏡頭**：`useGameCamera.centerCamera` 依賴 `engine.mapVersion`，縮圈塌陷也會變，所以每 10 秒瞬間跳回全圖縮放。改看只有重建地圖才變的 `engine.map.generation`。iPhone 版面實際戰鬥 45 秒：最大縮放變化 31→0.18／秒，最大平移 8241→81 px／秒。展示模式換局時（場上無單位）仍會跳。
- **沒做**：計畫中的「品質階層改成先減繪製」，實機顯示自動畫質已能升到階層 0，不需要。診斷的階層欄也顯示釘死的階層會被改掉（標「階層 2」結束時是 1），所以各階層那幾列只能當自動畫質的結果看。
- **過程疏失**：有兩次檢查失敗指令卻沒停（一次 commit 只在本機，一次 push 了偶發失敗的 `AgentRunner`，重跑全過），之後合併腳本改成失敗就停。

### BI. 2026-11-03 詠唱環隨單位移動時破圖：遮罩改走畫布變換（主代理）
結論：`applyHexMask` 不再改共用 pattern 的變換，位移與縮放改走畫布變換。使用者上線後實機確認環不再破、FPS 也比上一版穩；使用者實機看到破圖時 FPS 都會降，兩者一起出現（肉眼觀察，沒有 A/B 數字）。修法有效，但 Safari 的機制本身只是推論，沒有單獨在 iPhone 上驗證。

- **症狀**：使用者 iPhone 實機截圖（13 陣營大逃殺，導播），詠唱環碎成矩形塊、弧線被切斷，單位移動時才會閃。這不是疊層順序問題，是遮罩對不上格子：每格只貼矩形，靠相鄰格在該層透明；遮罩一偏，矩形就露出來。
- **推論的原因**：iPhone Safari 對同一個 context 重設同一個 pattern 時視為沒變，之後的 `pattern.setTransform` 不生效，遮罩留在舊位置。單位不動時層內相對位置不變所以看起來正常。
- **證據**：桌機 Skia 重現不了，修前修後每幀變動量幾乎相同。一次性探針（未進版控，已刪）用 `SIMSTALE=1` 模擬上述行為後，修前出現和截圖同樣的矩形塊，修後環完整。

  | 比對（沙漠、移動速度 4，抽 4 幀，差異 >30 的像素數） | 結果 |
  | :-- | :-- |
  | 修前＋模擬 vs 修前 | 47738～56258 |
  | 修後＋模擬 vs 修後 | 33143～33442，第 59 幀的差異圖全在地形貼圖上 |
  | 修後 vs 修前（都不模擬） | 0 |

- **順帶發現**：`TerrainRenderer` 烘地塊時也用同樣寫法改共用 pattern（第 422、478 行），所以上表模擬下還有地形差異。若推論成立，iPhone 上各地塊變體的貼圖偏移可能都一樣；只是偏移不同，不會破圖，使用者也沒回報，沒有改。
- **驗證**：lint、測試、build、`runtime-smoke`、`perf:guard`、`perf:fidelity` 全過，保真沒有重錄（`battle_frozen` 0.041）。畫布變換版沒有在 iPhone 上用 A/B 量過 FPS。
- **過程疏失**：第一次套修正的指令多了一個沒有輸入的 `cat`，卡住 400 秒轉背景，修正沒有套用，我卻回報「已改好」。使用者問狀況時才讀檔發現。第一次寫的防回歸測試也比對到檔頭註解而失敗，已改成只比對呼叫。

### BJ. 2026-11-03 導播改成排分清單＋緩進緩出群組；切畫質不再瞬跳（主代理）
結論：鏡頭跳動有兩個原因，都修了。真機要使用者確認。

- **瞬跳**：`useGameLoop` 每秒檢查一次解析度，自動畫質一改就呼叫 `centerCamera`，鏡頭瞬間跳回全圖。桌機不會自己切畫質，所以之前量不到；手動切 3 次跳 3 次，修後 0 次。戰鬥中視窗尺寸改變也不再置中，轉場只在全黑時置中。
- **群組**：舊版分奧義、施法、逃生、全景四層，全圖施法者都算成員，收招那一 tick 就離開。修前一場 28 秒有 24 次目標縮放跳超過 25%（0.45～1.57），24 次都在施法人數改變的當下，和使用者「瞬間雙目標遺失」的判斷一致。
- **做法**：`engine/presentation/DirectorRoster.ts` 依動作給分、隨時間衰減，分數高的在前、同分先進榜。主角是榜首，要贏過黏著分 10 分、至少看滿 2 秒才換，失效立刻換。`CameraTargetGroup` 成員緩進緩出並多留 1.5 秒，權重也決定它能把鏡頭拉多遠；導播再加縮放速度上限。拿掉 ID 拆平手（藍方多 4 分）、職業加分、奧義縮放下限、`forceFocus`、`priorityTimer`。全景層拿掉了，開局大家發呆時鏡頭看主角。
- **量測**（iPhone 版面實跑，main 與新版交替各 6 場，每場最多 40 秒；隨機對局，不是同一場）：

  | 項目 | main | 新版 |
  | :-- | :-- | :-- |
  | 目標縮放跳超過 25%（這項有速度上限，等於必然是 0） | 139 | 0 |
  | 實際縮放方向反轉 | 45 | 15 |
  | 主角在畫面內（6 場平均） | 90% | 97% |
  | 主角的目標在畫面內 | 83% | 89%（有一場 65%） |
  | 奧義施法者在畫面內 | 80% | 91% |
  | 主角換人次數 | 39 | 56 |

  主角換人變多了：舊版選定後鎖 2.5～4 秒，新版最短 2 秒。實機覺得太跳就調高 `MIN_HOLD_S` 或 `STICKY_SCORE`。看過新版移動中 16 張連續畫面，沒有裁掉單位。
- **保真**：`battle_frozen` 依新取景重錄（獨立 commit）。舊圖放大 1.195 倍對齊後，戰場差異從 36.2 降到 5.5，剩縮放重取樣的細邊與大小固定的 HUD。五張地形基準沒動。
- **過程疏失**：查突進時說「12 個戰士都帶突進，6 場只放 1 次」是錯的：`play()` 依 `skillIds` 重建 `skills`，探針改 `skills` 被蓋掉了。改 `skillIds` 重跑是 21 次施放。第一次量鏡頭的探針也忘了開局，先交出過一份 0 單位的數字。

### BK. 2026-11-03 技能效果契約：每種效果都用真引擎驗過（主代理）
結論：新增 `tests/SkillEffectContract.test.ts`（35 項），用真的引擎跑 tick，看單位行為和數值，每個控制都有對照組。查到 3 個真問題並修好，修之前前兩個測試確實失敗。

- **變羊**：只有物理和畫面在讀，單位照常施法、走路。改走 `Effects.isIncapacitated`（暈眩、變羊共用）。
- **無敵**：擋得住直接傷害，擋不住持續傷害和危害區。改在 `applyDirectDamage` 擋，真實傷害（墜落、反噬）照扣。
- **`sr_a5`**：漏寫 `ccType`，補成原本數值的持續治療。
- **有效但原本沒驗過的**：暈眩、放逐、定身、沉默、恐懼、嘲諷、致盲、易傷、護盾、持續傷害與治療、加速、緩速、反傷、吸血、擊退、拉引、突進、燃魔、回魔、斬殺、反噬、自我控制、多段命中、四種危害區。
- **平衡**：1500 場 seed 21，藍方 803→797 勝，`mr_a3` 43.6%→45.3%（單次 n≈300，在誤差內）。
- **架構**：不是標準 ECS。`Agent` 是 74 個欄位的純資料類別，效果是固定槽位，系統依序跑，沒有元件或查詢。技能效果最多 2 個控制加 2 個附帶效果，`CCManager` 用 switch 分派，屬性還會隱性產生危害區。目前不重寫，靠契約測試守住。

### BL. 2026-11-04 技能管線重建：狀態機、動作清單、機動槽（主代理設計與引擎，Flash 實作機制與資料）
結論：技能改成四個時機的動作清單，描述承諾但沒做的機制全部真的做了，每個單位多一個機動槽。設計在 `docs/SKILL_PIPELINE_DESIGN.md`。

- **重構段（不改玩法）**：技能狀態機、狀態阻擋表、150 招遷移到動作清單、隱性危害區變明寫資料。`npm run balance:fingerprint` 180 場全部相同；故意讓恐懼不擋施法時 91 場不同、測試失敗 3 項。
- **機制**：穿透、破盾、必中、低血增傷、隨機傷害、驅散、機率、隨機負面、彈跳連鎖、直線貫穿、交換位置、瞬移、後撤、陷阱，`tests/SkillMechanics.test.ts` 每項都有對照組。圖騰沒有另做地面物件：`sr_a3` 描述是範圍回血，現況就是。
- **機動槽實戰（90 場，含 30 場大逃殺）**：遊俠、法師、輔助後撤的目標距離 1.6～1.7→3.4～4.2；戰士突進 3.7→1.4。鉤子用真引擎驗過（距離 4→1）；統計當下量不到，因為投射物還沒到。每個單位每場放 1.7～3.9 次。
- **平衡（只有 5v5，數值還沒調）**：藍方 54.7%（seed 21，兩邊站位各 750 場：靠左 52.4%、靠右 57.1%），平均約 19 秒。**更正（11-04）**：原本寫 51.9% 是錯的，當時下 `--swap`，`batch-sim` 只認 `--swapSides`，參數被忽略，1500 場全是靠左站位。後面各招的極端值來自那次單邊的 1500 場。奧義 `rr_u3` 63、`sb_u5` 61，`rr_u1` 40、`mr_u3` 41。主動 `rb_a4` 59、`wb_a2` 59，`mr_a3` 37、`rr_a5` 41。普攻 `sb_b2` 58，`rr_b2` 37、`tr_b2` 39。機動 `tb_m1` 56，`tr_m2` 45、`rr_m1` 45。機動技每招每場放 0.3（`mr_m2`）～2.0（`tr_m1`）次。
- **實跑**：`runtime-smoke` 通過；機動技連續畫面（鉤、突進、推開各 6 張）沒有破圖，頁面錯誤 0；`perf:guard` 通過（17.5 ms）。`battle_frozen` 重錄，地形 5 張沒變。
- **和設計不同的地方**：`wb_a5`、`rb_a3` 原訂多段，主動技沒有多段視覺支援，改單發；`mb_u3` 原訂加 200 傷，會違反奧義視覺規則 C7，先不加。兩項都留給平衡輪。
- **順手修的錯**：第一包資料把緩速寫成 30（`SLOW.value` 是比例），審第二包時發現，連測試一起改。`hasGapCloser` 改成只算拉人：突進爬不上牆，算進去會讓單位鎖定打不到的目標。
- **派工**：Flash high 跑 4 包（測試遷移 11 分鐘、機制兩包 13、18 分鐘、資料 19 分鐘），全部一次過，碰到無權改的項目都停下回報。做法：主代理先加好型別、寫好紅色驗收，Flash 只補實作。

合約效果：

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| 提示詞附主代理先寫好的紅色驗收與型別，測試列為受保護 | 4 包都沒動驗收；3 包回報了無權解決的失敗（`tb_b2` 關鍵字、`DashSkillVisuals`、`flatSkill` 型別） | helped |
### BM. 2026-11-04 導播改框主角與目標：三種景別、鏡頭視窗（主代理設計與驗收，agy Flash high 實作兩包）
結論：鏡頭不再框全場，只框主角和它的目標。手機「比這一對該有的遠 30% 以上」從 55% 降到 23%（大逃殺 54%→14%），桌機 87%→3%。手感要使用者實機確認。

- **起因**：使用者覺得鏡頭莫名拉很遠、剩少數人又不拉近，也看了自己舊的 FCS 3D 導播。探針量到兩個不同原因：拉遠有 82～91% 是群組算的（奧義範圍中心、已離場與已死成員占 68～86%），活著 5 人以上時群組解出的縮放幾乎等於框全場；不拉近是鏡頭太慢（跟隨時間常數 4 秒、縮放 5 秒），剩兩人的階段只有 1.5～3 秒。
- **做法**：
  - `DirectorFight`：只有主角和目標決定鏡頭。主角還在走路且目標超過 `WALK_TARGET_RADIUS_PX` 時先不框目標；舊目標多留 `MEMBER_LINGER_S`，死者立刻離開。
  - `ShotZoomController`：特寫、中景、全景三種景別，縮放不再連續呼吸。往外差到 `SHOT_OUT_MARGIN`、往內要有 `SHOT_IN_MARGIN` 才換；換過後 `SHOT_MIN_HOLD_S` 內不再拉近，有人倒下時解除。每次換景別是一次緩進緩出。縮放長寬分開算，比較時用未夾的值，否則桌機永遠拉不近。
  - `CameraWindow`：焦點在框內鏡頭不動；Y 的框比 X 大，跳躍、擊飛不點頭。`FocusBlend`：換主角時焦點一次緩動。
  - 接戰前才框全部人。主角倒下時接它正在打的人，鏡頭留在同一場架。別處的奧義不再拉鏡頭，主角看滿 `ULT_CUT_HOLD_S` 才能被奧義搶走，`MIN_HOLD_S` 2→5。`directorMax` 1.6→2.2，跟隨與縮放剛度 0.25／0.2→3／4。刪 `CameraTargetGroup` 與縮放死區。
- **第一版不及格**：照原規格把「正在打主角的人」也框進來，手機 81% 停在全景，縮放比舊版還遠，反轉 12.8 次／分。探針 `主角到目標距離中位 219 px`，只框這一對放得下，才改成一對。也驗證了 FCS 的核心：戰鬥只看一對，Target Group 只用在佈陣。
- **量測**（新舊同一把尺，隨機對局，不是同一場；手機 5v5 各約 90 秒、大逃殺 4×3 各約 90 秒、桌機 5v5 各 72 秒）。最後一次調校把 `SHOT_OUT_BLEND_S` 0.7→1，之後只重跑測試與保真，這張表沒重量：

  | 項目 | 手機 5v5 舊→新 | 手機 4×3 舊→新 | 桌機 5v5 舊→新 |
  | :-- | :-- | :-- | :-- |
  | 縮放中位 | 0.61→0.71 | 0.63→1.15 | 1.25→2.20 |
  | 比主角＋目標遠 30%+ | 55%→23% | 54%→14% | 87%→3% |
  | 主角在畫面內 | 89%→94% | 83%→95% | 100%→99% |
  | 主角的目標在畫面內 | 85%→92% | 89%→96% | 100%→99% |
  | 奧義施法者在畫面內 | 0.87→0.64 | 0.82→0.75 | 1.00→0.87 |
  | 畫面內單位數中位 | 7→5 | 7→5 | 13→7 |
  | 換主角（次／分） | 22→14.5 | 24.6→15.4 | 25→15.8 |
  | 縮放方向反轉（次／分） | 9.4→13.2 | 7.5→8.3 | 12.5→1.7 |
  | 鏡頭螢幕速度 P95（px／秒） | 27→151 | 28→152 | 46→430 |
  | 畫面中心 1/4 短邊內沒有單位 | 6%→10% | 7%→36% | 0%→12% |

  變差的項目：別處的奧義較常拍不到（設計取捨）；鏡頭換位比以前快；手機反轉略多；這一對拉開時畫面中心是空的。剩 2 人的樣本太少（5v5 只有 2 秒），不能當結論；大逃殺剩 2 人 27 秒，縮放 1.16，比該有的遠 30%+ 0%。
- **驗證**：lint、1340 項測試、build、knip、smoke（battleTime 0.52→4.57）、`perf:guard` 全過。看過手機與桌機移動中各 16 張連續畫面。`battle_frozen` 依新取景重錄（獨立 commit）：舊圖放大 2.08 倍對齊後差異 43.63→7.29，剩邊緣重取樣與大小固定的 HUD；五張地形基準沒動，數字和改前相同。
- **派工**：主代理先加常數、型別、紅色驗收，Flash high 兩包都一次過，沒動驗收（第一包 24 項、第二包 16 項）。之後依量測改的一對取景、景別門檻由主代理直接做。第一次派工因為 clone 裡沒有 `tools/ui-e2e/out/` 而沒真的啟動。
- **探針疏失**：第一次探針照舊按 `START SIMULATION`，離開展示模式，打完一局就停，240 秒只有 12 秒交戰；已作廢重跑。
### BN. 2026-11-04 導播拉近後 iPhone 分頁一直被回收：貼地畫布改成借還（主代理）
結論：BM 推上去後使用者的 iPhone 顯示「重複發生問題」。iPhone 解析度（393×852、DPR 3）實跑，畫布記憶體最高 957～1147 MB，上一版 666 MB。修後連跑 8 局最高 589 MB。Safari 的實際上限量不到，分頁不再被回收要使用者實機確認。

- **根因**：`GroundDrape` 的懸空平面（詠唱環）畫布綁在登記陣列的位置上，平面換個位置就多開一組（來源圖加三色層共 4 張），要整整 120 幀沒用到才放掉；尺寸又隨縮放平方變大。鏡頭拉近後 1024²×144 張，`GroundDrape` 單獨 208 張、737 MB。上一版鏡頭遠，同樣的洩漏只到 640²×80 張，所以之前只是偶爾被回收。
- **修法**：畫布組每幀借還（`PlaneSurface`），同時有幾個平面就只有幾組；觸控裝置每個平面單邊上限 `MAX_PLANE_PX_TOUCH` 640、地塊烘焙倍率上限 `MAX_SCALE_TOUCH` 2。桌機不受影響，`battle_frozen` 0 差異，五張地形數字不變。
- **量測**（同一支探針 `tools/ui-e2e/out/mem-probe.mjs`，隨機對局）：

  | 項目 | 上一版（BM 之前） | BM | 借還 | 借還＋上限 |
  | :-- | :-- | :-- | :-- | :-- |
  | 畫布最高（MB） | 666 | 957～1147 | 700 | 589 |
  | 畫布中位（MB） | 464 | 581～600 | 499 | 497 |
  | `GroundDrape`（MB） | — | 737 | 224 | 97 |
  | 地塊 `TerrainRenderer`（MB） | — | 148 | 105 | 58 |
  | 跑了幾秒 | 80 | 60～80 | 80 | 200 |

  現在最大的是 `VFXPartStore` 236 MB，它有依品質階層的位元組上限，這輪沒動。
- **驗證**：lint、1343 項測試（新增 `tests/GroundDrapePool.test.ts`，舊的 `GroundDrape` 跑同一份會失敗）、build、knip、smoke、`perf:guard` 全過；看過 DPR 3 手機移動中連續畫面，詠唱環沒有破圖。
- **BM 的疏失**：BM 推送前只比了鏡頭數字，沒量記憶體，而 HANDOFF 早就記著手機分頁會被回收。放大鏡頭會讓所有依裝置縮放配置的畫布變大，動到縮放範圍時要跑 `mem-probe` 比對。
### BO. 2026-11-04 音訊喚醒：手勢每次都試、被打斷能回來（主代理設計與驗收，agy Flash high 實作）
結論：使用者 iPhone 有時完全沒聲音，要重新整理才有機會恢復。真瀏覽器重現兩個卡死點，修後都能自己回來；iOS 上是否解決要使用者實機確認。

- **根因（程式碼與重現）**：
  - 手勢只聽 `pointerdown`、`keydown`，而且只試一次。依 HTML 規範觸控的 `pointerdown` 不算使用者手勢，`resume()` 可能無效，但 `isUnlocked` 照樣設 true、監聽也移除，之後怎麼點都不再試。這點桌機 Chromium 重現不出來（合成事件照樣喚醒），是依規範推論。
  - `resume()` 只認 `suspended`；iOS 被來電或其他 App 打斷時是 `interrupted`，回不來。探針：context 被停之後再點，仍是 `suspended`。
  - `blur` 把總音量淡到 0，只有 `focus` 會恢復。探針：`blur` 後回到頁面、再點畫面，總音量都還是 0。
  - context 停住時 `playCue` 照樣建立 source，`onended` 不會來，24 個發聲槽被佔滿。
- **修法**（只動 `engine/audio/AudioEngine.ts`）：手勢監聽 `pointerdown`、`pointerup`、`touchend`、`click`、`keydown`，整個生命週期都在；`isUnlocked` 只在 context 真的跑起來才設；`statechange`、回到頁面、`pageshow`、解除靜音都會試著喚醒；總音量在回到頁面、`pageshow`、手勢時也會恢復；context 沒在跑時音效直接丟掉。頁面隱藏時不喚醒。
- **驗證**：新增 `tests/AudioWake.test.ts` 19 項（派工前 12 項失敗）；lint、測試、build、knip、smoke 全過。`tools/ui-e2e/out/audio-wake-probe.mjs` 用真自動播放政策跑：被停之後 context 回到 `running`；`blur` 後回到頁面總音量 0→0.64。
- **派工**：主代理先加常數、寫紅色驗收，Flash high 一次過，沒動驗收。主代理收尾把兩份重複的恢復邏輯併成 `tryResume`，拿掉多餘的 `typeof res.then` 防護，整理混雜的行尾。
- **沒做**：解碼或下載失敗會讓音檔整場標記失敗（`failedAssets`），這輪沒有證據是它，沒動；音樂有合成鋪底，不會全靜音。iPhone 側邊靜音開關會關掉 Web Audio，重新整理也救不回來，要改得用 `navigator.audioSession`，是產品決定，留給使用者。
- **實機回饋（同日）**：導播焦點、拉近、景別頻率、畫質、記憶體都 OK，分頁不再回收。通常穩定 40～60 FPS，20 人岩漿低於 20。
- **實機確認（11-05）**：使用者確認音效喚醒好了。
- **收尾（11-05）**：`mem-probe` 收進 `tools/ui-e2e/`，掛 `npm run perf:mem`，沒有單位或頁面出錯時退出碼 1；iPhone 解析度跑 40 秒，畫布最高 472 MB。README 的數字對照資料與型別：170 招、9 種元素、19 種狀態、17 種動作、12 招多段都對；「19 種控場」改成「19 種狀態」，因為其中有增益；「7 種彈道視覺」實際是 20 種外觀（6 種形狀、4 種飛行軌跡）。

### BP. 2026-11-04 UI 全面改版（主代理設計與審查，agy 多線、Sonnet、GPT Astra 與 Sol 參與）
結論：UI 改成純投影加共用元件庫，視窗層級、毛玻璃材質、行為樹獨立視窗、開場標題都照使用者要求做完。實機手感待使用者確認。

- **驗收（合併前最後一次，feat/ui-refresh）**：`npm test` 1371 項通過；`npm run audit:ui -- all` 43 檔 0 違規；`e2e:ui`、`e2e:gallery` 全過；`perf:fidelity` 六場景通過且未重錄；`perf:guard` 通過。8 種視窗最大化 0/384 遮擋，巢狀模糊 0，小於 24px 的控制項 0，原生 `<select>` 0。
- **架構**：`hooks/useEnginePort`（`useView`、`useViewOf`、`useCommands`）是 UI 碰引擎的入口；`engine/systems/ui/views/` 放 selector；選取改 `hooks/useSelection`；`session.timeScale` 移除。`types.ts` 的 `ViewCommand`／`GameCommand` 分類是給下一輪用的。
- **元件**：`components/ui/primitives/`，`?ui-gallery` 可看全部（動態載入）。原生 `<select>` 換 Radix，emoji 換 lucide。
- **基準**：樣式基準重錄兩次，各自獨立 commit，最後一次只動 `showcase_card`、`showcase_enter_btn`。
- **順手修的**：手機寬度下重新註冊視窗會蓋掉開啟狀態，START 因此消失；`drag pan` 從固定座標起手，隨機地圖上會按到單位或障礙物而偶發失敗，改從空格起手。
- **派工數字**：agy 同時跑 4 條可行；agy 的 Claude 池一個大包就吃光 5 小時窗（L3 中途 429，主代理補完）；GPT 視覺審查抓到最大化視窗蓋住子視窗。最後一輪 GPT 回報 5 項，修 3 項，1 項看截圖判定誤報（log 字型），1 項是素材（見 HANDOFF）。
- **上線後使用者回報（11-05）**：視窗卷軸拖不動，因為 8px 的縮放把手整條蓋在 8px 的卷軸上，內容改成讓開把手。選單文字重疊與沒靠左，因為 `cn` 不解 class 衝突，`h-auto`、`justify-start` 輸給按鈕內建值；`Button` 加 `size="auto"`、`align`，稽核加 `button-override` 規則。Playwright 無頭模式預設隱藏卷軸，e2e 改驗點擊落點，真拖動用探針另跑（捲動 0 到 5145）。
- **手機實機（11-05）**：播放列的「開始」「速度」文字佔位，版面換成兩列又被撐大。改純圖示單列，桌機與手機同一套版面，寬度隨內容；靜態稽核與 e2e 都加了檢查。
- **主代理犯的錯**：兩次用 `;` 把 commit 接在測試後面，測試失敗仍提交，事後補修正 commit。

### BQ. 2026-11-05 機動技射程與落點（主代理清查、驗收與修正，GPT Sol 實作）
結論：機動技不再吃高度，突進與後撤改成範圍內選落點，機動擊退與鉤子不再把人弄出場。5v5 每場墜落死 0.60→0.17～0.20，大逃殺 100 場 145→37。手感待實機確認。

- **起因**：使用者問站高地會不會飛全場或掉場外。探針：突進 5→7 格、鉤子 6→8 格（地圖 8～9 × 10～11 格）；突進沒有格數上限；後撤一半落在警告格；鉤子把人拉過施法者；墜落死約 70% 死前 4 秒內被機動技移動過。
- **做法**：`engine/systems/combat/LandingPlanner.ts`（合法落點與評分分開，手動選落點時可直接用）；`getSkillRange` 統一技能射程；`ActivationMet` 沒有落點就不放；`npm run balance:mobility` 是實戰驗收，含次數下限。
- **量測**（200 場，seed 31；`npm run balance:mobility`，seed 47 同樣全過）：

  | 項目 | 改前 | 改後 |
  | :-- | :-- | :-- |
  | 機動突進 最大位移 | 7 格 | 5 格 |
  | 機動突進 目標超過資料射程 | 22.9% | 0.6% |
  | 機動突進 隔空打中（最遠距離） | 22.5%（8 格） | 0（1 格） |
  | 機動突進 沒動也沒貼身 | 未單獨量（位移為 0 共 16.9%） | 4.5% |
  | 機動突進 每場次數 | 1.66 | 1.67 |
  | 後撤 落警告格 | 49.7% | 0 |
  | 後撤 貼場邊 | 49.9% | 0.6% |
  | 後撤之後墜落死 | 21 次 | 0 |
  | 後撤 每場次數 | 2.6 | 2.45 |
  | 瞬移 落警告或危害 | 41.7% | 0 |
  | 鉤子穿過施法者／拉出場 | 107／5 次 | 0 |
  | 機動擊退推出場 | 59 次 | 0 |
  | 每場墜落死 | 0.60 | 0.17 |

- **其他實測**：藍方勝率靠左 52.4→52.9%、靠右 57.1→58.4%（seed 21，各 750 場，±3.6%）。`balance:idle` 100 場（seed 21）：雙陣營墜落死 54→23、發呆占比 0.76→0.68%；大逃殺墜落死 145→37、發呆占比 0.44→0.38%，最長連續發呆 2.46→4.99 秒（只比最長一筆，沒追原因）。`npm test` 1399 項通過；lint、knip、build、`runtime-smoke`、`perf:guard` 通過。`battle_frozen` 重錄（地形 5 張通過），`tools/balance/fingerprint.baseline.json` 重錄（180 場全部不同，行為刻意改變）。
- **審查時主代理改的**（GPT 交回時 2 項門檻沒過、5 項測試失敗，它照停下條件回報，沒有動驗證）：已經貼身還換格（`DashMotion` 抓到）；`ActivationMet` 每個 AI 週期都先跑規劃，改成便宜條件先看、冷卻與詠唱中不跑；奧義也被改成要貼身才打中，違反定案，收回只限機動技；單體鉤子改走六角直線，才會正好停在身邊；`calculateKnockback` 的 boolean 聯集參數拿掉。
- **這輪多修的**：`mb_m1`、`mr_m1`、`sb_m2`、`sr_m2` 射程 3，先跳開再判定射程，幾乎打不中描述承諾的近敵，改成打跳開前瞄準的目標。這幾招的傷害與緩速因此變多，平衡輪要看。
- **驗收門檻改過一次**：「突進位移為 0 ≤3%」改成「沒動也沒貼身 ≤5%」。目標自己走到身邊時不動是對的；剩下的 4.5% 多半是詠唱 0.2～0.3 秒內路被擋（200 場 15 次：路被擋 13、目標跑出射程 1、目標已死 1）。試過選定目標後再確認落點，兩組種子數字完全不變，已拿掉。另外探針改成沒移動不算落點、已在虛空裡的單位不算被拉出場，兩項都是量測錯誤（瞬移 2.08%、拉出場 1 次都來自這裡）。
- **沒做**：大逃殺的 `balance:mobility` 門檻（探針只跑 5v5）；手動選落點的 UI；彈跳等其他技能的平衡。
- **回退**：這輪的 commit 各自可 revert（驗收、實作、基準重錄、文件）；只想恢復機動擊退出場，把 `CCManager.calculateKnockback` 的 `ringOut` 改回 `kind === 'KNOCKBACK'`。
## 3. 更早的輪次與審查修補

- **效能四（2026-10-12 合併）**：`?perf` HUD、`perf:frames`／`perf:attribution`、去 `shadowBlur`、`VFX_BUDGET`。我調過品質治理器門檻（`RENDER_QUALITY.DOWN_MS` 14／`UP_MS` 9）。當時列的殘留熱點（`TextPainter`、`ProjectileDrawer`、`ProceduralPainter` 等）已在 2026-10-19 全部清除或零件化（§3 K）。
- **美術（合併）**：KayKit 預渲染精靈 10 張（`public/assets/units`，manifest 在同目錄）＋地形貼圖 10 張＋粒子貼圖 5 張；體型軸 `Team×Role×BodyType`（MALE 有素材）。
- **AI Studio 的「美術修正輪」（`8c014d1`）— 我審查後修補的重點**：
  1. **畫面凍結**：`useGameApp` 在 React StrictMode 清理時立刻 `engine.destroy()` 並重用 → 引擎永遠停止。已改為**延後一個 tick 銷毀、重新掛載則取消**。
  2. **誤刪必要檔案**：它把 `ImperialTokenFactory`／`CovenantTokenFactory`（仍負責單位腳下底座與職業圖示）當舊管線刪掉，底座變成實心圓。已從 `b4b0b20` 復原（連同 `MaterialPainter`、`imperial.ts`／`covenant.ts`／`types.ts`／`index.ts`、`materialConfig.ts`、`UnitFactory.ts`）。
  3. **地形烘焙卡頓**（熔岩地圖個位數 FPS 的主因）：快取鍵含浮動相位×縮放級距，容量滿時**整個清空**造成重烘焙風暴。已加「每時間窗烘焙預算＋借用相鄰縮放級距 sprite」與「只丟舊縮放級距」（`RENDER_CACHE.BAKE_BUDGET_MS`／`BAKE_WINDOW_MS`、`TerrainBlockCache.ts`）。**使用者仍需在熔岩圖實測**；若仍卡，開 `?perf` 重現後在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`（尖峰記錄器已內建，含各階段耗時與 `terrainCache` hits／misses／evictions）。
  4. **BGM 疊音**：AI Studio 的共享引擎＋擁有者計數＋請求序號修法**使用者已確認修好**。
  5. 其他：角色大小 `UNIT_SPRITE.targetHeightCanvasUnits=59`（護盾稜柱為上限，測試遍歷全部影格）；護盾高度現在**自動貼合角色頭頂**（`SHIELD_VISUAL.headMargin`、`computeShieldGeometry`，飛行單位跟隨 body center）；`battle_frozen` 基準因單位變大已重錄一次（5 個地形基準仍 0 差異）。

### BR. 2026-11-06 單位狀態美術與 Inspector 狀態面板（GPT Astra 設計與原型、GPT Sol 實作，agy Sonnet 與 Sol 初審，主代理裁定）
- 使用者要求：狀態表現在模型本身，不在單位身上貼圖示（第一版身側符號被否決），參考 LoL。原型三輪，使用者只採用點名的：暈眩（頭上小星環＋失衡）、變羊（Blender 重烘、腿剩 30%、無項圈）、定身（粗藤蔓）、燃燒（火舌附身）、中毒（全身染綠＋泡泡）。其餘狀態、圖示列、血條、浮字維持原樣（同環境 A/B 0 像素差異）。未採用的原型與評語見 HANDOFF N。
- 中毒用固定 8 頁的外觀快取（8.0 MiB），draw 路徑無逐單位裁切、filter、離屏；20 人實戰 8 種外觀同時中毒，顯色後退回原色 849→0 幀，首次顯色最多晚 13 幀。定身改四段深度帶，不再重疊兩次。
- 資料：`StatusQueries` 正規化 17 槽＋護盾、`STATUS_OBSERVATION` 顯示用觀測事件（不派送 HUD／音效）與 `StatusPresentationSystem` 記錄來源；放逐不再被 Inspector 當成死亡。指紋三模式 60/60 相同，觀測開關 3600 tick 的 sourceId、DR、RNG 零差異。
- Inspector STATUS 分頁新增 ACTIVE EFFECTS：依 CONTROL／DAMAGE & WEAKEN／RECOVERY & PROTECT 分組，剩餘時間、施加者、來源跳轉（只改選取，不改觀看陣營）；手機底部面板。面板圖示用正確置中重烘，圖示列的舊烘焙不動。
- 驗證（GPT 在沙盒、主代理在沙盒外補跑完整測試）：lint、build、knip、audit:ui、e2e:ui（style 0 差異）、runtime-smoke、verify:coords、perf:guard、perf:mem。iPhone 實機未測。

### BS. 2026-11-07 美術輪關卡與驗證四級（主代理，借鑑 awesome-gamedev-agent-skills）
- 新增 `art-round` skill：先寫視覺系統簡報，先讓一個代表素材通過，才成組量產；並列出風格跑掉的訊號（跑掉就回基準圖重做）。起因是狀態美術第二、三版整組做完才被整組否決（BR）。新增 `tools/assets/art-board.py`：把候選圖以實際高度貼在真實戰場截圖上，附灰階與放大格；候選沒有透明像素時退出碼 1。
- 驗證分四級（實跑／靜態／備妥未跑／未驗證）寫進 `agent-prompt` 回報格式與範本、`review-round` 審查與 HANDOFF §3、`render-verify` 回報。
- 驗證：`art-board.py` 用羊素材加四張保真截圖實跑，並測試不透明候選（退出碼 1）、缺檔（退出碼 2）；`npm test` 147 檔 1462 項通過；lint 通過；Codex 副本已同步。

- 探針狀態快照 `tools/ui-e2e/lib/diag.mjs`：`captureDiag` 讓截圖和狀態 JSON 一定是同一幀，`createScenario` 逐步檢查中間狀態、0 單位直接判失敗、結尾印 `Summary:` 並回傳退出碼；寫進 `render-verify` §5。一次性探針實跑：3 步通過時退出碼 0，加一步故意失敗時退出碼 1，截圖上的追蹤 ID 與 JSON 過濾出的單位一致。檢查腳本盤點：runtime-smoke、fidelity、coords、perf-ab、audit:ui、e2e:ui、perf:mem、fingerprint、mobility 失敗時都已經回非零，不改。

| 合約改動 | 實際造成的行為差異 | 判定 |
| :-- | :-- | :-- |
| `art-round` skill、驗證四級 | 尚未有一輪用過；下一個美術輪（羊重做，HANDOFF F）再判定 | no effect（待觀察） |
| `render-verify` §5 探針快照與情境鏈 | 尚未有一輪用過 | no effect（待觀察） |

### BT. 2026-11-09 圖示列置中修正；I-3 攻擊格認領查無根因、撤銷（主代理）
- `StatusStripPainter.bakeIcon` 把零件錨點放在 `c + (w/2 − anchorX)·k`，外框中心反而偏兩倍；旋轉零件的位移向量也要跟著轉。一次性探針（烘焙 60 px）：外框中心最大偏移 22→3.5 px，被裁圖示 4→0（BANISH、VULNERABLE、BURN、HASTE），對照圖肉眼確認。runtime-smoke 通過、perf:guard 通過、lint／test／build 綠。
- I-3 基準（main 31cbd7a5，`ai-idle-sim` 200 場 seed 21）：全戰士繞圈 1.03%（目標 1.5% 已達；HANDOFF 的 1.90% 是 11-03 的數字）、路徑重算 0.40／秒、≥3 秒發呆 0。雙陣營戰士繞圈 3.54%。在 CIRCDIAG 加「目標鄰格是否全被佔」標記重跑 TEAMS：前 14 類繞圈樣本全部是鄰格有空位（佔滿 0 秒），約 6 成是目標在鄰格、自己沒在走路卻有位移（攻擊或技能位移），約 4 成是走路中繞著靜止目標（有空格）。攻擊格認領沒有對應的根因，不做；診斷改動只在一次性 clone，沒進版控。

### BU. 2026-11-09 可玩地基 L1 指令佇列＋L3 固定步長（主代理）
- `engine/core/CommandQueue.ts`：戰鬥中的 `GameCommand` 排到下一個 tick 開頭套用（`GameEngine.tick` 開頭 `uiCommands.flushQueued()`），連同 `state.time.tick`（新欄位，唯一寫入者 `TimeSystem.tick`）記進 `engine.commands.log`；畫面指令（`VIEW_COMMAND_TYPES`，型別檢查與 `ViewCommand` 一致）立即套用不記錄；`STOP_GAME`、`SET_TIME_SCALE`、`SET_BATTLE_SETUP`、`SET_SHOWCASE_MODE` 戰鬥中也立即套用，立即套用前先清佇列保持順序。`clear()` 清紀錄。
- `engine/core/FixedStep.ts`＋`useGameLoop`：每個 tick 固定 1/60 秒（`GAME_LOOP_PARAM.SIM_HZ`），倍率只決定每幀跑幾個 tick，上限 15（`MAX_TICKS_PER_FRAME`，取代 `MAX_ACCUMULATOR_MS` 250）。
- `tests/CommandQueue.test.ts` 9 則：步長規劃、佇列時序與順序、同種子＋紀錄重播出同一場（600 tick，含戰鬥中的 `EDIT_AGENT`、`SET_OBSTACLE`）、不送指令結果不同（防空測）、倍率 5 倍與 1 倍結果相同。`UltCastTiming` 一則改成送指令後跑一個 tick 再檢查（語意改變，規則不變）。
- 驗證：lint、`npm test`、build、knip 通過；`balance:fingerprint` TEAMS／ROYALE／SQUADS 各 60/60 完全相同；runtime-smoke、perf:guard 通過；實跑探針（真實 rAF）battleTime／真實時間在 0.5／1／5 倍是 0.50／1.00／4.97，戰鬥中的 `EDIT_AGENT` 先排隊、下一幀套用並記錄。還沒在手機上試高倍率（5 倍時每幀跑 5 個 tick）。

### BV. 2026-11-10 20 人岩漿掉幀：實機 A/B 四輪查無單一原因；固定階層修正（主代理）
- 做法：`diagnostics/PhoneAB.ts`（`?phoneab`，已刪，要用從 git 取 commit db9cb667）合併進 main 推上 Pages，使用者在 iPhone 跑。岩漿 20 人、每 4 秒一對奧義、不死。
- 第一輪（固定階層 1、無導播、無縮圈，每段 14 秒）：現況 52.8 FPS，關液面 49.0／34.9、關漂浮 40.3、關環境粒子 36.9、三項全關 39.8、沙漠 48.0；FPS 隨發熱 52.8→34.9；JS 2.2～4.3 ms 對每幀 19～29 ms。液面不是原因（BH 那輪的「液面在雜訊內」量的是沒有液面的沙漠）。
- 第二輪（每項前後夾基準）：階層 0 色調分級 45.3 對 52.3／52.8；導播 49.7（手機上沒拉近）；縮圈 42.0、低 5% 19.8（基準低 5% 36.5／25.9）；實際設定 43.5、低 5% 20.6、自動降到階層 3。
- 第三輪（縮圈全開，每段 24 秒）：關警告疊層 17.8 ms 對 24.5／23.1；塌陷後 1.5 秒平均和警告期相同；每次塌陷重烘 27～54 塊地塊。
- 第四輪（比較警告格畫法）：現況 19.6／18.2／20.9／25.0 ms，不切混色 23.0、不 save 18.2、**關警告 22.0**——推翻第三輪；同設定的現況四次相差 6.8 ms。
- 結論：成本分散在 GPU，沒有單一開關能救；這套量法的雜訊約 ±3.5 ms，第三輪的 6 ms 是雜訊。沒改渲染。
- 修正：`createQualityGovernor` 自己記一份釘死狀態，執行期 `setPinnedTier` 會被它的 `forceSetQualityTier` 蓋掉（第一輪「不漂浮」結束在階層 3、BH 的「釘死的階層會被改掉」都是這個）。現在尊重模組層釘死值，`tests/RenderQuality.test.ts` 加一則。只影響診斷，正式遊玩不呼叫 `setPinnedTier`。

### BW. 2026-11-17 優化開案書 S1 平衡工具步長對齊、S2 開戰快照＋種子（主代理）
- **S1**：`tools/balance/` 的 batch-sim、ai-idle-sim、sim-fingerprint、mobility-probe 預設步長改讀 `GAME_LOOP_PARAM.SIM_HZ`（1/60），`--dt` 保留做 A/B；依 tick 寫的門檻改成秒（指紋取樣 0.5 秒、idle-sim「在走」15 px／秒）；工具改傳 `GameEngine({ audio: false })`。`tests/BalanceToolStep.test.ts` 擋寫死的 1/30。指紋基準重錄（獨立 commit），之後連跑兩次 180/180 相同。
- S1 停下條件沒觸發：`balance:idle` 200 場改前後（TEAMS／MELEE／ROYALE）發呆與繞圈差距都在 0.4 個百分點內（TEAMS 戰士繞圈 3.46→3.33%、MELEE 1.17→0.80%）。`balance:sim --battles=400 --seed=21`：dt 0.0167、藍方 55.2%、平均 19.1 秒、24.1 秒跑完。
- **S2**：`engine/core/MatchSnapshot.ts` 實作 `captureMatch`／`restoreMatch`／`matchStartOf`／`battleLogOf`；`CommandQueue` 記起點（`beginMatch`／`endMatch`／`battleLog`）。`START_GAME` 只在 tick 0（開新的一場）擷取快照、播種、設體型鹽；tick > 0 是暫停後繼續（`togglePlay` 用 STOP／START 暫停），不重擷取。沒給種子時 `UICommandSystem.freshSeed` 產生並寫回紀錄。`RESET_GAME` 有起點就還原快照（地形與佈陣不再重新生成），`CLEAR_BOARD` 丟掉起點。
- 跟著改的隱藏狀態：①引擎技能庫改成出廠副本（`factorySkills`，以前是淺拷貝，`UPDATE_SKILL` 會改到 `DEFAULT_SKILL_DB` 和別的引擎）；②`AgentManager.matchSalt` 從靜態欄位改成每顆引擎一份（`engine.agentManager.matchSalt`，初值 0），靜態版讓同一行程的第二顆引擎體型跟著上一顆的種子跑；③`clear()` 補清 `state.finalHex`；④`addAgent` 加 `idOverride`、`GameEngine` 加 `entityCounter`／`restoreEntityCounter`（Facade 刻意變更）。
- `hooks/useGameApp.ts` 改用 `engine/math/rng.ts` 的佈陣流（`setupRandom`，獨立 mulberry32 狀態，首次使用時由 Math.random 起始），刪掉對齊舊序列的空抽；外觀鹽改用 hook 自己的 `lookSaltRef`。測試的 `new GameEngine()` 改 `{ audio: false }`（音訊測試除外，57 檔）。
- 改到的既有測試（不在受保護清單）：`SimState.test.ts`、`CommandQueue.test.ts` 開戰帶種子；`SkillEditor.test.ts` 改成驗出廠值不被改；`BodyTypeEditor.test.ts` 鹽改由 START_GAME 決定。所有權表 `hp` 的 lifecycle 加 `MatchSnapshot.ts`。
- 驗證：S2 契約 13 則全過；lint、`npm test`（這個分支全過）、build、knip、`balance:fingerprint` 180/180 相同；runtime-smoke battleTime 0.53→4.60；一次性生命週期探針（真實頁面）：展示模式換局換種子、0 單位站在障礙物上，手動開戰→暫停→繼續（種子不變）→RESET（地形與站位還原）→重開（新種子）全過、0 頁面錯誤。
- 兩項待決定由開案的 Fable 工作階段裁決（使用者授權）：①`battle_frozen` 只重錄這一張（獨立 commit，渲染碼 diff 為空、其他 5 張未重錄；重錄前兩次差 0.074，重錄後兩次 0.000）；保真工具擲骰前固定佈陣流。②選 A：職業→移動數值只在 `AgentManager.applyRoleMotion`，生成與 `EDIT_AGENT` 換職業共用（以前換職業只改 `role`，還原快照會分歧，TANK→MAGE 1.1/2/2/0 對 0.95/1/0/1）；`tests/RoleEditSnapshot.test.ts` 驗每個職業換過後還原重播相同。換職業後 `hp`／`maxHp`／體型仍是舊職業的（既有行為）。

### BX. 2026-11-17 優化開案書 S3 回放、seek／undo、基準回放檔（主代理）
- `engine/core/Replay.ts`：`stepSimulation` 是模擬前進的唯一入口（固定步長 `SIM_STEP_S` 只定義在這裡），`useGameLoop`、`sim-fingerprint` 與平衡工具預設路徑都改叫它（`--dt` 的 A/B 仍直接 tick），`simFingerprint.ts` 的 `DT` 改讀它。`exportReplay`／`startReplay`／`seekTo`／`takeOver`／`undoLastCommand`，S3 契約 7 則全過。
- 回放閘門：session 掛在 `engine.commands.replay`，擋不擋只看 `session.active`；`UICommandSystem` 在回放中丟掉外部的 `GameCommand`，不影響模擬的除外（`CommandQueue.isSimNeutral`：STOP／START（繼續）／`SET_TIME_SCALE`／`SET_SHOWCASE_MODE`），這幾種也不進回放檔、不餵、undo 不算。紀錄播完並超過 `endTick`、或引擎因勝負自己停下，回放自動結束（展示流程之後的清盤不會被擋）。
- 快轉：`EventBus.mute` 只放行 `UI_COMMAND`（匯流排上其他監聽者全是表現層），`GameEngine.fastForwarding` 讀它，tick 裡跳過 `director.update` 與視覺事件。seek 完發 `REPLAY_SEEKED`，renderer `resync()`＝`reset()` 去掉鏡頭重設。seek／undo 前丟掉排隊中的指令（`discardPending`）。
- **修了既有 bug（Facade 刻意變更）**：暫停後繼續（tick > 0 的 `START_GAME`）以前會重跑開局重設：戰鬥時間歸零（猝死計時、延遲傷害、多段排程跟著錯）、戰鬥紀錄被清空、AI 全部重建、動作打斷。現在 `play()` 在 tick > 0 只恢復運轉。`SET_AGENT_SKILL` 改成當下換上技能物件（以前要等暫停後繼續才生效）。「開戰前／開戰後」收成單一判斷 `GameEngine.battleStarted`（運轉中或跑過 tick）：`play()` 繼續、`START_GAME` 是否開新的一場、`addAgent` 是否當場備妥技能與 AI、`SET_AGENT_SKILL` 是否當場換技能物件都讀它（暫停中放的單位以前靠繼續時重跑 `prepareForBattle` 補 AI）。`tests/Replay.test.ts` 7 則：其中 3 則在沒修 `play()` 時失敗，「暫停中放單位／換技能／換職業後繼續並回放」與「開戰前換技能不留洞」2 則在沒有 `battleStarted` 時失敗。
- UI（使用者 11-17 定案：回放是結算畫面多一個按鈕，外觀照既有規範）：結算畫面（`VictoryOverlay`）加「回放這一場」（從開戰快照重播，含戰中指令）與「存回放」，樣式同既有的整寬次要按鈕；播放列維持原樣；系統選單只加「載入回放」（`engine/presentation/ReplayIO.ts`，選檔／下載／`public/replays` 讀取，版本不同在主控台警告）。重新開始、隨機戰場、下一關、再戰、切模式會先結束回放。回放控制由組裝層直接呼叫 `Replay.ts`，不走 `UICommand`（它們換掉整場，本身不是這一場紀錄裡的指令）。接手（`takeOver`）目前沒有 UI，留給 G3。實跑（`victory-probe.mjs`）：回放播到底 → 結算畫面存回放（endTick 1830、seed 3）→ 回放這一場 → 再播到底 tick、勝方、倖存者都相同，0 頁面錯誤。
- 基準場景：`tools/replay/record-bench.mjs` 錄 `public/replays/bench-magma-20.json`（岩漿 10v10、13×11、seed 3、1830 tick／30.5 秒、藍勝）；`?replay=<檔名>` 開機直接播；`perf:frames` 加情境 `replay_magma20`，`PERF_SCENARIOS` 可只跑指定情境。模擬改了（G1、G2）它仍播得出來，但已不是同一場。
- 驗證：lint、`npm test` 3077 則、build、knip、`balance:fingerprint` 180/180 相同；runtime-smoke battleTime 0.53→4.58；perf:guard 保真 6 張與效能護欄通過；`e2e:ui` ALL PASSED、`audit:ui -- all` 0 違規。一次性探針（真實頁面，`tools/ui-e2e/out/replay-probe.mjs`）：`?replay=` 載入 20 人岩漿 → 播到 tick 1200 → `seekTo(900)`（粒子 75→0）→ 存回放 → 播到底 tick 1830、藍勝 → 重新整理（展示模式）→ 選檔載入 → 播到底 tick 1830、藍勝、倖存者與血量相同，0 頁面錯誤；實點按鈕（`buttons-probe.mjs`）：回放中 `EDIT_AGENT` 被擋 → 按接手 → 指令在 tick 319 生效、接手鈕消失 → 按回到開頭 → 帶著 tick 319 的指令重播到底，0 頁面錯誤。seek 後第一幀的紫格與冰刺是 tick 900 當下真的存在的 ICE（剩 0.18 秒）與 GRAVITY 危害，0.2 秒內消失，不是殘留。`perf:frames` 的 `replay_magma20` 只跑過 8 秒冒煙（refreshRate 233），還沒當基準量。
### BY. 2026-11-18 優化開案書 R1 畫面插值（主代理）
- **先量（結案條件沒過，所以做）**：一次性探針 `node tools/ui-e2e/out/r1-interp-probe.mjs [interp=0]`（headed 真實 rAF，`skip=K`＝每 K 個 vsync 交一幀；239 Hz 主螢幕在另一個工作階段跑批次時實際只有 75～192 Hz）。修前移動中位移為 0 的幀：約 165 Hz 61～65%、約 118 Hz 46～50%；40 FPS 位移變異係數 0.26～0.42。開案書的門檻是 < 5% 且 < 0.15。
- **前後對照**（同一探針；指標＝每幀畫出位移 ÷（模擬每 tick 速度 × 幀時間／步長），只取模擬等速段，理想 1；三段的變異係數）：

| 設定（實測 Hz） | 不插值 `interp=0` | 契約字面（直接用 alpha） | 現在 `(gap−1+alpha)/gap` |
| :-- | :-- | :-- | :-- |
| skip1（75～192） | 0.65／1.46／1.64 | — | 0.004／0.006／0.000 |
| skip2（79～118） | 0.79／1.02／1.04 | — | 0.002／0.005／0.004 |
| skip4（46～59） | 0.28／0.21／0.20 | 0.40／0.09／0.50 | 0.001／0.002／0.006 |
| skip6（33～39） | 0.25／0.27／0.23 | 0.35／0.60／0.47 | 0.002／0.003／0.001 |

  位移為 0 的幀：修後 0～0.8%。純模型（等速，40 FPS）：不插值 1、2 交替，字面 alpha 2、1 交替，現在恆 1.5。
- **契約修正**：R1 第 2 則原本要求跨 5 個 tick 時直接用 alpha，實測比不插值更抖；回報後由 Fable 改成 `(5−1+0.5)/5`（`fix/r1-contract` 的 `0efe8f57`，本分支 cherry-pick），R1 四則全過。
- **作法**：`useGameLoop` 算 `acc/step`（沒在跑或暫停給 1）→ `GameRenderer.update` → `RenderPipeline` → `UnitFrameStore.build(..., { tick, alpha })`。store 記每個單位上一個看到的 tick 的腳點（含 physics 與屍體擊飛）與腳下高度，在排序鍵、腳下格、殘影之前插值；血條錨點改讀插值後的位置。起點是模擬狀態不是上一幀畫的位置，中間沒看到的 tick 以直線帶過。不插值：剛出現、tick 倒退、拖曳預覽、平均每 tick 超過 `UNIT_FRAME.INTERP_SNAP_PX_PER_TICK`（＝`HEX_SIZE`）。`?interp=0` 關閉（`RENDER_QUALITY.INTERP_QUERY_KEY`）。RenderSpec §3、UnitFrame 檔頭同步。
- **沒插值的**：physics.z（跳躍高度）、投射物（不經 UnitFrame，開案書列為停下條件）、跟著單位的粒子與發射點／受擊點（讀模擬位置，最多早一個 tick）。看得出來再處理。
- **驗證**：lint、`npm test` 1543 則、build、knip；`balance:fingerprint` 180/180 相同；runtime-smoke battleTime 0.52→4.55、0 頁面錯誤；perf:guard 保真 6 張與效能護欄通過。保真插值開／關數字相同（FOREST 0.651 等是既有差異；`__stepFrames` 的場景不受影響）。看圖：`tools/ui-e2e/out/r1-frames-shot.mjs` 連續 16 幀畫布，`r1-sheet.py` 拼成 `tools/ui-e2e/out/r1-shots/sheet-{on,off}{1,6}.png`；40 FPS 走路每幀間距平均，約 165 Hz 交戰中衝刺殘影黏在路徑、被牽引的單位平順、貼身排序正確，血條、底座、詠唱環不脫離，沒有殘影或跳動。實機（239 Hz、iPhone）比 `?interp=0` 還沒做（HANDOFF §3）。

### BZ. 2026-11-18 優化開案書 G2 施法目標與戰鬥目標分開（主代理）
- `Agent.castTarget` 只放友軍施法的目標；`a.target` 從此只表示戰鬥目標（敵人）。對敵與地面施法維持 `castTarget = null`，瞄準照舊讀 `a.target`／`targetHex`（契約註解與驗收都只針對友軍，沒有擴大範圍）。
- 唯一寫入者 `SkillStateMachine`：選招經 `aimCastAt`（前搖中不改，因為行為樹在前搖中照常每次決策重跑選招）、`endWindup` 清空；所有權表登記為 `single`。施法管線一律經 `castAim()`（`castTarget ?? target`）讀：`CombatSystem` 起手與結算（紀錄、`CAST_START` 目標、預警區、轉向、天降快照）、`CastingEngine` 轉向與結束後重新決策、`SkillExecutor`、`SkillActions` 的 DASH、`ProjectileSystem`、`ZoneSystem`、行為樹 `IsTargetInRange`／`MoveToOptimal`。`TargetingSystem` 的友軍黏著改讀 `castTarget`（不改的話黏著會默默消失）。
- 刪掉 `restoreCombatTarget`（11 處呼叫）與暫存戰鬥目標欄位。`CastPushPull` 地面推拉起手時照舊清 `a.target`，但不再事後找回施法前的目標，由 `HasTarget` 下次決策重新選敵。
- 新測試：`tests/CastTargetSplit.test.ts` 用完整 tick 跑一次友軍治療，前搖一開始就把友軍補到門檻以上（前搖中的選招會選不到人），拿掉前搖凍結時會失敗（突變檢查過）；`tests/SimBusListeners.test.ts` 規定模擬層（systems／ai／physics／core／math）只准監聽 `Replay.FAST_FORWARD_ALLOW` 放行的事件（現為 `UI_COMMAND`），`AudioSystem` 列允許清單。`FAST_FORWARD_ALLOW` 改為匯出。`BTOptimization` 兩則改寫成新語意。
- 量測（400 場 seed 21，改動前→後，雜訊 ±4.9 個百分點）：藍方勝率 55.2%→56.1%、靠右 57.8%→56.4%（平均 56.5%→56.25%），平均長度 19.1→19.4 秒、19.3→19.3 秒。`balance:idle` 200 場：TEAMS 各職業發呆 1.1/1.0/0.5/0.5/0.6%→1.0/0.8/0.5/0.3/0.5%，繞圈最大變動 +0.16 點（坦克 2.59→2.75%），輔助的目標切換每分鐘 38→7.1 次（以前每次對友軍施法都換一次 `a.target`）；ROYALE 發呆與繞圈都在 ±0.16 點內。開案書 G2 寫的是 600 場 ±1.5 點，這次照派工單用 400 場與雜訊門檻。
- 指紋：改動後 TEAMS 6/60、ROYALE 19/60、SQUADS 3/60 相同（預期會變），獨立 commit 重錄，之後連跑兩次 0 差異。lint、`npm test` 161 檔 1547 則、build、knip 全過；G2 契約 4 則真的通過，S2、S3 契約維持通過。
- 留下的：`engine/renderers/grid/GroundPriority.ts` 的 `isCasterCenteredTelegraph` 仍讀 `targetHex ?? target`，註解說要和建立預警區的來源一致；現有技能沒有「單體、帶 AOE 半徑、對友軍」的組合（170 招查過），所以結果不變。這一輪渲染線有 R1 在跑、不能動渲染檔，之後動到那裡時改讀 `castAim`。

### CA. 2026-11-18 優化開案書 R2 對局流程移出 React（主代理 Fable）
- 一局接一局的流程（結算停留、退場、換圖、進場、等圖集、生成、開戰）搬進 `engine/systems/match/MatchFlowSystem.ts`，用真實時間推進（`useGameLoop` 每個畫面呼叫一次），取代 `useGameApp` 的巢狀 `setTimeout`。排陣容、抽地圖、放單位在 `engine/systems/match/Deployment.ts`（純函式，亂數由呼叫端傳入），展示回合與手動的骰子、下一關、套用設定共用。
- 階段多半由引擎狀態當場推導（打完了＝`RESULT_HOLD`、開戰了＝`PLAYING`、否則 `LOBBY`），流程只記計時階段，而且不監聽 `engine.bus`：回放、跳轉、手動重開都不用通知它（`tests/SimBusListeners.test.ts` 維持通過）。結算結果在進結算那一刻鎖存，轉場清盤後 UI 仍讀得到。
- UI 改讀 `selectSessionView`、`selectBoardView`（`engine/systems/ui/views/session.ts`）：hook 的 session 狀態、單位數輪詢、地圖寬高與場景的鏡像欄位全部刪掉；階段一變流程就發 `MATCH_PHASE`，UI 立刻刷新（`refreshEngineViews`），hook 自己送完指令也立刻刷新。
- 轉場階段由流程持有：`GameRenderer.update` 每幀讀 `engine.matchFlow.transition`，`GameCanvas` 不再收 props，進場開始時的鏡頭置中改聽 `MATCH_PHASE`。等圖集由組裝層注入 `isRosterReady`，下一批陣容用 `MATCH_ROSTER` 公布。
- 亂數：展示回合全部來自注入的 `nextSeed`（陣營設定、地圖大小、出生格用這一局的本地序列 `createRandomStream`；地圖生成器與場景抽選讀模擬流，換圖前先重設；開戰給 `START_GAME` 種子）。手動骰子維持全域佈陣流與原本的抽號順序。
- 行為改變（四項，都是刻意的）：平手也會進下一局（以前 `winner` 是 null 就卡住）；分頁在背景時流程跟著停，回來從停下的地方接著走（`GAME_APP_PARAM.FLOW_MAX_FRAME_MS` 限制每個畫面最多前進 100 毫秒）；分出勝負後播放鈕一律不動作（以前藍方獲勝時擋不住，因為 `Team.BLUE` 是 0）；編輯面板的地圖寬高顯示引擎實際的值（夾過範圍的）。
- 轉場時間（`tools/ui-e2e/out/r2-flow-probe.mjs`，展示模式不按 START，改動前→後）：結算停留 2011～2023→2004～2007 毫秒、退場 1199～1203→1198～1201、進場 1504→1498～1500、進場後到開打 9～10→9～12；事件順序相同（清盤→退場、清盤→進場＋換圖、進場結束→開打）。連跑 6 局 0 頁面錯誤（dev server 開著 StrictMode）。
- 驗證：R2 契約 6 則真的通過；`npm test` 161 檔 1547 則、lint、build、knip；`balance:fingerprint` 180/180；`runtime-smoke`；`perf:guard`（保真 6 張沒重錄，`battle_frozen` 0.000；效能比值 0.99～1.00）；`?replay=bench-magma-20.json` 開機正常；手動模式實跑 8 項（進手動、骰子、打完結算停住、結算按回放、切回展示沿用玩家設定）全過。
- 展示旗標（`SET_SHOWCASE_MODE`，音訊在聽）在流程送完清盤、佈陣、開戰指令之後才公布，同一個值不重複公布：音訊處理那些指令時還是切換前的模式，提示音與選曲和以前一樣（先公布的話，進手動時會多一聲點擊音）。
- 新測試 `tests/MatchFlow.test.ts`（7 則，無畫面）：轉場期間仍讀得到上一局的結果與陣營設定、平手進下一局、一個畫面隔 10 秒不跳過階段、手動結算停住、重開後立刻讀不到舊勝方、切進展示沿用玩家設定且回手動還原、展示旗標的公布順序。`tests/RngSplit.test.ts` 的掃描範圍加上 `engine/systems/match`。
- `MapEditorToolbar` 的 `mapW`／`mapH` 只有介面宣告，沒有輸入框在用，所以改成從引擎讀不影響任何輸入。
- `npm run e2e:ui` 在工作樹裡有一項「no console/page errors」失敗：兩個字型檔經 `node_modules` 連結回 403（Vite 不服務工作樹以外的路徑），其餘全過、樣式快照 0 差異；這是工作樹環境造成的。在主資料夾（暫時切到這個版本）重跑：暖機後連兩次 242 項全過，`npm run audit:ui -- all` 44 檔 0 違規。剛切換版本後的第一次會在開頁就逾時（`page.goto` 8 秒，Vite 快取是冷的），先跑一次 `runtime-smoke` 暖機就不會。
- 開機 effect 在 StrictMode 下跑兩次、各開一個展示回合（和以前一樣）：陣容局數計數器因此在擲骰時是 3，`battle_frozen` 的體型靠它固定；改成只跑一次會讓那張基準變動。

### CB. 2026-11-18 優化開案書 U1 視窗可用模式改成 `modes`（主代理 Fable）
- `WindowDef` 的 `visibleInShowcase`／`visibleInManual`／`visibleOnGameOver` 三個布林換成必填的 `modes: readonly AppMode[]`；`data/ui/windows.ts` 十個視窗照 2026-11-17 的布林換算（契約 U1 的換算表），行為不變。
- `filterWindowDefsByMode` 改成查表（`def.modes.includes(mode)`）；`RegisteredWindows`、`SystemMenu`、`getRegisteredWindows` 收 `AppMode`，不再各自用 `showcase`／`manual`／`gameover` 字串。
- 目前模式只在一處決定：`appModeOf(SessionView)`（`engine/systems/ui/views/session.ts`）：展示模式＝`SHOWCASE`，手動分出勝方＝`GAME_OVER`，否則 `MANUAL`；`App.tsx` 的結算判斷也改讀它；選單（`SystemMenu`）維持原本「有勝方就收起」的條件（展示模式從分出勝負到下一局開打之間也收起），沒有併進 `appModeOf`。`PLAY`、`REPLAY`、`EDIT` 留給 G3、S3、G5。
- 契約檔修正（作者修改，`MANIFEST.json` 已更新）：`R.contract.test.ts` 的 U1 換算檢查原本直接讀三個布林，型別拿掉之後通不過型別檢查，改成在測試裡自己宣告舊欄位。
- 驗證：U1 契約 2 則真的通過；`npm test` 162 檔 1554 則、lint、build、knip；`npm run e2e:ui` 241 項通過、樣式快照 0 差異，剩下 1 項是工作樹字型檔 403（環境，見 §2 CA）。

### CC. 2026-11-18 優化開案書 G3 玩家操控，第一片（主代理 Fable）
- 控制者決定模式圖：`AISystem.buildAI` 依 `agent.controller` 選 `AI_MODE_GRAPH` 或新的 `PLAYER_MODE_GRAPH`（`data/ai_profiles.ts`）；外部仍只呼叫 `a.bt.tick`。玩家圖四個模式：陣亡、受控（和 AI 圖同一批條件）、`HOLD`（沒指令：原地堅守，不追不逃，普攻打得到人就打）、`ORDER`（執行 `Agent.order`；這一刻做不了就留在這個模式裡照堅守做，指令留著，不來回切模式）。兩個模式都先看嘲諷（`ObeyTaunt`）：被嘲諷時去打嘲諷者，蓋過指令與堅守，和 AI 單位的規則一致。`ModeMachine` 遇到不在這張圖裡的模式就從起點重新開始（換控制者時用）。
- 指令是 `GameCommand`：`SET_CONTROLLER`、`ORDER_MOVE`／`ORDER_ATTACK`／`ORDER_CAST`／`ORDER_STOP`，自動進佇列、進紀錄、可回放、可 undo。`UICommandSystem` 只驗證（單位要存在、活著、是玩家控制；目的地要在地圖上且不是障礙物；攻擊目標要是活著的敵人；施放的槽位要有技能）；`Agent.order` 的寫入只在新的 `engine/core/Orders.ts`。
- 執行節點在 `engine/ai/BTRegistry.ts`（`OrderMove`、`OrderAttack`、`OrderCast`，加上 `HoldGround`、`ObeyTaunt`），內部呼叫 AI 用的 `SkillReady`、`IsTargetInRange`、`CastSkill`、`ChaseTarget`、`MoveToOptimal` 與 `aimCastAt`，沒有複製決策碼。施放指令在 `SkillStateMachine.commitSkill`（技能真的放出去）才清掉，被打斷、冷卻中、魔力不足都留著。
- `engine/game.ts`（Facade）改一個條件：有指令的單位每個 tick 都決策，到了、目標沒了才能當下反應。AI 單位沒有指令：`balance:fingerprint` 180/180 相同、沒重錄。
- 開戰前下的指令存進開戰快照（`MatchUnitSnapshot.order`，可省略欄位；`types/Match.ts` 的版本規則改成「增減必填欄位才改版本號」），所以「先下指令再開戰」的一場用回放檔重播結果相同（`tests/PlayerOrders.test.ts`）。
- UI 第一片：Inspector 多一列 PLAYER CONTROL 開關（附提示「點地面移動、點敵人攻擊」）；點擊規則寫在 `engine/systems/ui/tapIntent.ts`（純函式），`useGameInput` 只負責送出；戰術層對「還沒起步的移動指令」也畫目的地標記（原本選取單位的路徑與目標連線就會顯示其餘部分）。技能施放的 UI 留第二片。
- 契約檔修正（作者修改，`MANIFEST.json` 已更新）：`ORDER_CAST` 那則驗收原本等 `CAST_START` 事件，但第 2 槽是普攻、`CombatSystem` 對普攻不發那個事件；而且目標在 9 格外，走到之前就被隊友打死。改成先把目標血量加厚，再驗證「進入該槽前搖」且「該槽進了冷卻」（被打斷的普攻不進冷卻）。
- 驗證：G3 契約 9 則真的通過，S2、S3、R、U1 契約維持通過；`npm test` 164 檔 1573 則（新增 `tests/PlayerOrders.test.ts` 13 則、`tests/TapIntent.test.ts` 6 則）、lint、build、knip；`balance:fingerprint` 180/180；`runtime-smoke`；`perf:guard`（保真 6 張沒重錄）；`npm run audit:ui -- all` 0 違規；`npm run e2e:ui` 樣式快照 0 差異（工作樹裡剩 1 項字型檔 403，見 §2 CA）。
- 實跑（`tools/ui-e2e/out/g3-play-check.mjs`，每次是不同的隨機戰場；選取、開關、開戰前下指令這幾項每次都過，戰鬥中的幾項在單位途中被暈、被恐懼或鏡頭移動時會偶發不成立，確定性的驗證以 `tests/PlayerOrders.test.ts` 與 `e2e:ui` 為準）：點選單位 → 開 PLAYER CONTROL → 開戰前點空地（指令成立、畫出目的地）→ 開戰後走到、指令清掉 → 堅守不動 → 戰鬥中點敵人（攻擊指令、鎖定目標）→ 指令都在紀錄裡 → 0 頁面錯誤。
- 預設對局會碰到的既有機制都補了測試（`tests/PlayerOrders.test.ts` 共 13 則）：縮圈時站在警告格上下指令走得出去；目的地塌掉就清掉移動指令；嘲諷蓋過指令、指令留著；堅守中被推開，強制位移照常發生（強制位移不設 `isMoving`，不會被堅守取消）；被定身時留在 `ORDER` 模式不抖動；暫停時下的指令繼續後照做，回放相同。
- `npm run e2e:ui` 加了 4 項玩家操控檢查（開關切換控制者、選取中的玩家單位點空地產生移動指令、下指令後選取不變、切回 AI 清掉指令），共 245 項通過。行為樹視窗對玩家單位畫的是玩家圖，新節點都有中文標籤；手機尺寸的 Inspector 那一列排版正常。
- 已知的行為（都照契約的定義，試玩後再看要不要改）：堅守時射程內沒有敵人就不動，被遠程打不會還手；堅守的單位站在即將塌陷的格子上不會自己走開，會掉下去；移動指令的目的地被佔著時指令留著、每個 tick 重試；戰鬥中才接手的單位按重開後會變回 AI（重開還原的是開戰當下的快照）。

### CD. 2026-11-19 G3 試玩回饋：鏡頭跟著操控的單位、場上標示（主代理 Fable）
- 使用者回饋：不知道自己控的是哪一隻，鏡頭要專注在操控的單位上，選取或 UI 要有視覺輔助。
- 導播（`engine/presentation/DirectorSystem.ts`）：玩家操控的單位優先當主角，不看排分、不等最短時間，別處的奧義也不搶鏡；有好幾個玩家單位時跟點選中的那一個（`SET_WATCH_AGENT`）。取景以它為中心（以前是「主角和它的目標」的重心，主角常偏在一側），四周至少看得到 `DIRECTOR_PARAM.PLAYER_VIEW_RADIUS_PX`（約 3.5 格，要看得到周圍才能點地面）；它的目標比較遠就撐到框得進目標，最多到遠景。開戰就跟著它，不先看全場。切回 AI 後導播恢復自己選主角。
- 標示（`engine/renderers/tactical.ts`）：玩家單位腳下一圈脈動的金色光圈加淡淡的底色（畫在血條之下），頭上一個上下浮動的金色箭頭（畫在血條之上，人擠在一起也不會被蓋住）；不必選取就看得到，開戰前場上只有核心時箭頭貼著核心上方。位置全部讀 `UnitFrame`，`RenderSpec` 已加一列。
- 看圖調過一輪：第一版箭頭畫在血條之下，被旁邊單位的血條蓋住；光圈 3 px 細線在岩漿地形上不明顯。改成箭頭在 HUD 之後畫、光圈加粗到 4 px 並加底色、鏡頭改成以單位為中心。
- 驗證：`tests/DirectorPlayerFocus.test.ts` 4 則（一直是主角、開戰就框在它身上且留得出視野、多個玩家單位跟點選的、切回 AI 恢復）；`npm test` 165 檔 1577 則、lint、build、knip；`balance:fingerprint` 180/180；`runtime-smoke`；`perf:guard`（保真 6 張沒重錄：沒有玩家單位時畫面不變）；`e2e:ui` 246 項全過、`audit:ui` 0 違規。實跑截圖確認開戰前與戰鬥中都看得到光圈與箭頭、單位在畫面中央。
### CE. 2026-11-19 優化開案書 G4 AI 圖鍵型別化與 profile（子工作階段）
- **鍵有型別**：`BTRegistry` 的 `BTConditions`／`BTActions` 標註成 `Record<BTConditionKey, …>`（兩個鍵清單是字面量聯集，少一個、多一個鍵都是編譯錯誤）。開案書寫的 `satisfies` 做不到：表內節點互相呼叫（`BTConditions["X"]`）會讓表型別循環，TS 靜默把整張表推成 `any`，鍵型別失效（用 `const x: number = BTConditions` 驗過不報錯）。`data/ai_profiles.ts` 的 `BTDef`／邊／圖改成可換鍵型別的泛型：本檔手寫的常數用 `BTNodeKey`／`BTConditionKey`（打錯鍵是編譯錯誤），`BTDef`／`AIModeGraph` 保持寬鬆字串，給外來資料（編輯器載入、存檔）與契約測試用，要先過驗證。
- **`validateModeGraph`**（`engine/ai/ModeGraphValidation.ts`）：initial、邊兩端、`when`／`unless` 恰好一個且在登錄表、`onFailure`、小樹鍵、組合節點至少一個子節點；`AISystem.buildAI` 建樹前呼叫，不合格丟錯，刪掉 `console.warn` 加假節點的做法。
- **profile**：`AI_PROFILE_BY_ROLE`（`data/ai_profiles.ts`）是職業對圖的唯一一張表，五個職業都指向 `AI_MODE_GRAPH`；玩家單位仍用 `PLAYER_MODE_GRAPH`。
- 驗證：`npm run lint`、`npm test`（165 檔 1576 則）、`npm run knip`、`npm run build` 全過；`npm run balance:fingerprint` TEAMS／ROYALE／SQUADS 各 60/60 identical。新測試 `tests/ModeGraphKeys.test.ts`（`@ts-expect-error` 打錯鍵、壞圖被回報）。
### CF. 2026-11-19 優化開案書 U2 bundle 切分與體積預算（Sonnet 子工作階段）
- **做了什麼**：`components/ui/window/windowRegistry.tsx` 的十個視窗本體改 `React.lazy`，`Suspense` 的 fallback（`EmptyState`「LOADING」）放在 `ToolWindow` 裡面，所以第一次開視窗時外框立刻出現、不跳版面；`hooks/useGameApp.ts` 的 `downloadSpec` 改成按下才動態 import `DesignExporter`（白皮書原文 `?raw`、常數表跟著離開進入點）；`vite.config.ts` 加 `manualChunks`（`vendor-react`、`vendor-ui` 兩包）；新增 `tools/check-bundle-budget.mjs`，掛在 `npm run build` 後面。
- **前後對照**（`npm run build`，gzip 為 vite 輸出）：

| | 進入點 JS | 進入點 gzip | 首次載入總 gzip（進入點＋preload） |
| :-- | :-- | :-- | :-- |
| 切分前（本包 main） | 1,364.30 kB | 422.48 kB | 422.5 kB（單一 chunk） |
| 只做延遲載入 | 1,195.91 kB | 360.10 kB | 360.1 kB |
| 加 `manualChunks`（現況） | 846.76 kB | 249.8 kB | 371.7 kB（`vendor-react` 69.4 kB、`vendor-ui` 52.5 kB 可跨部署快取） |

  延遲載入的視窗各自成 chunk（`SkillDbTab` 13.1 kB、`UnitInspectorBody` 6.6 kB、`DesignExporter` 26.9 kB 等）。TanStack Virtual、Radix Select 跟著 `SkillDbTab`／`UnitInspectorBody` 一起離開進入點的部分已離開；仍在進入點用到的 Radix 在 `vendor-ui`。首次造訪總下載量沒有變少（比切分前少約 50 kB 是白皮書與視窗內容延後），好處在每次部署後重複造訪只重抓 250 kB。開案書預期進入點 gzip 280～300 kB，實際 250 kB 較好；build 的 500 kB 警告只剩引擎主包（846 kB，開案書允許）。
- **預算**：`tools/check-bundle-budget.mjs` 量 `dist/index.html` 指到的進入點與 modulepreload，gzip 後進入點 ≤ 257.5 kB（實測 249.8 ×1.03）、首次載入總和 ≤ 383.2 kB（實測 371.7 ×1.03）；超過退出碼 1，`--print` 只印數字。調高預算要在這裡寫理由。
- **驗證**：`npm run lint`、`npm test`（164 檔 1573 項）、`npm run build`（含預算）、`npm run knip`、`npm run balance:fingerprint`（3 組各 60/60 identical）、`node tools/ui-e2e/runtime-smoke.mjs`（開發伺服器，StrictMode 下引擎推進、畫布變化）、`npm run perf:guard`（fidelity 與 perf-ab 全過，基準未動）、`npm run audit:ui -- all`（0 違規）、`npm run e2e:ui`（只剩已知的工作樹 403「no console/page errors」，樣式快照與各視窗項目全過）。
- **已知（開發模式限定）**：Vite 開發伺服器第一次遇到延遲載入視窗裡新的相依時會做「依賴重新最佳化」並整頁重載，e2e 在乾淨快取的第一輪 `db` 視窗曾因此失敗一次（頁面被重載、手動模式狀態掉了），快取建好後不再發生。正式 build 不受影響。
- **回退**：單一 commit，`git revert`。
### CG. 2026-11-19 優化開案書 U3 UI 小修（Sonnet 子工作階段）
- **`testId` 欄位**：`TabItem`、`SegmentedOption` 多了選填的 `testId`，直接寫在分頁／選項按鈕上；展示設定的四個分頁與四個方向鍵不再用 label 裡的 span 帶識別。順手去掉方向鍵選項的空 span（它在 flex 裡多佔一個 gap，圖示偏左約 2 px）。e2e 的選擇器 `showcase-tab-matrix` 改成 `showcase-tab-visual`（巢狀的 matrix span 本來就是同一個分頁），`ui-remount-audit.mjs` 的分頁名單同步。樣式快照 0 差異。
- **`dbSignature` 結案不做**：量測（`node` 微基準，240 個技能、每個 5 欄位，2000 次暖機後跑 20000 次）每次 0.0198 ms、簽名 9059 字元；每秒 10 次共約 0.2 ms，是 16.7 ms 一幀的 0.1%以下。要改成版本號得在 `UPDATE_SKILL` 與 `MatchSnapshot` 還原（`skillDB.length = 0; push(...)` 原地改寫）兩處以上都加一，漏一處技能下拉就不更新，風險大於 0.2 ms 的收益。再有證據顯示它進了前十名再重開。
- **平板觸控縮放把手**：左、右、下把手仍是 44 px 厚，但改成跨在邊框上：內側只留 `HANDLE_INNER_PX_COARSE`（12 px），其餘 32 px 在視窗外側；視窗貼齊螢幕邊時，外側取螢幕剩餘空間（最少 0），內側相應加厚。上緣把手維持 8 px 不外伸。因為把手在視窗外，觸控模式（粗指標、非窄版、非最大化、非收合）的視窗根節點不再 `overflow-hidden`，內容區自己加 `rounded-b-ui-window` 裁切。滑鼠與桌機路徑完全不變，樣式快照 0 差異。
  - 前後量測（`E2E_ONLY=tablet-edge npm run e2e:ui`，1180×820 觸控；820 寬以下是底部面板沒有把手）：視窗內側被把手蓋住 45 px → 13 px（12 px 加 1 px 邊框）；視窗右、左、下緣內 14 px 的點擊從命中把手改成命中內容；把手外側 8 px 的點命中把手，拖曳它視窗寬 640 → 580。
  - 新 e2e `runTabletEdgeSuite`（7 項）；`constants-snapshot.json` 加一個新鍵。
- 驗證：lint、`npm test` 164 檔 1573 則、build、knip、`audit:ui -- all` 全過；`npm run e2e:ui` 只剩「no console/page errors」一項（工作樹字型經 `node_modules` 連結 403，環境造成），其餘全過。
### CH. 2026-11-19 優化開案書 U4 技能下拉加搜尋（agy Gemini 4 Neon high 試跑）
- **做了什麼**：新 primitive `components/ui/primitives/Combobox.tsx`（Radix Popover＋輸入框，沿用 `SelectOption`／`SelectProps`，層級用 `UI_Z.POPOVER`；方向鍵、Home／End、Enter、跳過 disabled、中文輸入法組字中不攔鍵），進 Gallery；`UnitStatusTab` 的技能槽改用它。預設文字在 `data/ui/labels/primitives.ts`（代理原本寫在元件裡，主代理移過去）。沒用 TanStack Virtual：技能數幾十個，`max-h-72` 捲動就夠，開案書的「超過約 150 行改 `cmdk`」沒觸發（146 行），不加依賴。
- **派工方式**：主代理先寫紅色驗收（`tools/ui-e2e/ui-gallery.e2e.mjs` 的 combobox 14 項，受保護），agy `gemini-4-neon-high` 實作，12 分 24 秒一次過，沒碰驗收。執行者評估與額度記在全域 `agy-call` 的 `MODELS.md`。
- 驗證：worktree 內 gallery e2e ALL PASS、lint、`npm test` 1580 則、knip。合併後在主資料夾（CH＋CI 一起）重跑：lint、`npm test` 167 檔 1586 則、build（預算內：進入點 252.5／257.5 kB）、knip、`balance:fingerprint` 三組各 60/60、gallery e2e、`e2e:ui` ALL PASSED、`audit:ui -- all` 0 違規。未驗：技能槽本身沒有專屬互動 e2e（只有 Gallery 那一顆），手機上輸入法與底部面板的手感待實機。
- **回退**：merge commit `git revert -m 1`。
### CI. 2026-11-19 DECISIONS 拆出 ADR（agy Orchestrator（Neon）試跑）
- **做了什麼**：架構級決策拆成 `docs/adr/0001`～`0022`（一決策一檔：背景／決定／放棄的做法／後果／證據），規則與範本在 `docs/adr/README.md`；背水一戰的改版拆成 0009（已取代）→ 0010。`docs/DECISIONS.md` 改成索引＋小決定，章節標題（§1～§5、「AI 與大逃殺」、「UI」）保留，其他檔的「DECISIONS §4」引用不用改。合併：0001（禁 3D 後端＋特效預烘）、0007（保真基準＋同環境 A/B）。查不到的欄位照規定寫「原紀錄沒有寫」。
- **閘門**：`tests/AdrIndex.test.ts`（主代理先寫的紅色驗收）檢查編號連續、狀態三種寫法、五個章節、取代鏈雙向一致、索引連到每一份、DECISIONS 錨點還在。
- **派工方式**：agy `gemini-pro-orchestrator-neon`（Neon 規劃、Hydrogen 執行），22 分一次過；Orchestrator 不收 `--effort`。
- 驗證：AdrIndex、DocDrift、`npm test` 1586 則。
- **回退**：merge commit `git revert -m 1`。
### CJ. 2026-11-20 清理與合約校正 C1（主代理 Opus，使用者同意）
- **清理**：移除 `.claude/worktrees/` 剩下 3 個已合併工作樹（先 `rmdir` junction）、刪 15 條已合併本機分支、刪 `C:\Git` 下 7 個本專案舊 clone（`_wt_director_shot`、`_wt_mobility`、`_wt_skill_design`、`_wt_skill_pipeline`、`_wt_status_art`、`_wt_status_visuals`、`_wt_ui_hero`，HEAD 都已在 main）與 `_agent_allow`（11-03 舊紀錄）；封存 3 個閒置工作階段。狀態美術原型先複製到 `C:\Git\_asset_staging\art\`（逐檔比對相同）再刪。**刪掉沒讀過的未追蹤檔**：`_wt_skill_design` 的 `docs/_argon_design.md`、`_argon_err.txt`、`_argon_result.json`、`MOBILITY_DESIGN_AGENT_PROMPT.md`、`SKILL_AUDIT_AGENT_PROMPT.md`（舊輪的 Argon 輸出與提示詞，只核對 HEAD 在 main）。遠端 `origin/docs/skill-table` 已合併但沒刪（刪遠端分支算 push）。
- **C1**：`CLAUDE.md` 拿掉 Pro 方案字樣（改 Max 5x）、Codex 可派整包設計＋實作（和全域 `codex-call` 一致；查過 DECISIONS 與 `docs/adr` 沒有「Codex 不派實作」的紀錄，10-26 的額度決策反而是實作優先派 Codex）、補一段「動手原則」給雲端工作階段；`agent-prompt`、`codex-dispatch` 跟著改，Codex 副本已同步。HANDOFF §1 額度那段、§4 地形烘焙的派工對象一起更新。
- 合約效果紀錄：

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| `agent-prompt` 改成 Neon 檔位、加 `--print-timeout` 與「先建 `tools/ui-e2e/out/`」 | 本輪 R3 第一次派工因輸出資料夾不存在立刻結束，補建後一次跑完 | 還沒有改後的派工可對照 |
| `CLAUDE.md`／`codex-dispatch` 允許 Codex 實作 | 本輪沒派 Codex（見底） | no effect（尚未觸發） |

### CK. 2026-11-20 編輯器換職業時血量、魔力上限跟著換（主代理 Opus）
- `AgentManager.applyRoleChange`：上限取自和生成同一處（`UNIT_DB`、大逃殺 `spawnHp`），現有血量、魔力照比例縮放（開戰前滿血換完仍滿血；活著的不會變 0）；同一指令另給 `maxHp`／`hp` 仍會覆寫。體型（男女外觀）不由職業決定，維持原值。
- 驗證：`RoleEditSnapshot` 加 2 則（沒有修正時 3 則有 2 則失敗）；lint、`npm test` 1583 則、build、knip、`balance:fingerprint` 三組各 60/60。
- **回退**：分支 `fix/role-edit-vitals` 單一 commit，`git revert`。

### CL. 2026-11-20 優化開案書 R3 導播避讓手機底部 UI（agy Gemini 4 Neon high＋主代理審查）
- **做了什麼**：`hooks/useViewInsets.ts`（只在 `GameCanvas` 掛一次）量底部面板（窄螢幕的 `ToolWindow`）與播放列蓋住畫布的高度，變了才送 `SET_VIEW_INSETS`；`DirectorSystem.buildFrame` 的縮放與死區改用 `effectiveViewport()`，焦點移到露出區域中央；手動置中（`useGameCamera.centerCamera`）用同一份 insets。型別與清理規則在 `engine/math/insets.ts`（模擬端的 `UICommandSystem` 存值也要用，不能 import 表現端；代理原本在兩處各寫一次，主代理收成一處）。契約 R3 改 `done`；所有 `pending()` 呼叫都沒了，代理順手刪掉 `ContractPending.pending`（knip 會擋），下一個契約空殼要用時再加回來。
- **派工**：agy `gemini-4-neon-high`，第一次因 `tools/ui-e2e/out/` 不存在立刻結束，補建後一次跑完，沒碰契約與驗收。
- 驗證（實跑）：契約 R3 3/3、新測試 `DirectorViewInsets` 3 則、lint、`npm test` 1584 則、build、knip、`balance:fingerprint` 60/60×3、`runtime-smoke`、`perf:guard`（保真 6 張通過；FOREST 0.651，main 同機量 0.627，漂移範圍）、代理跑的 `e2e:ui`（第二次熱快取 ALL PASSED）與 `audit:ui -- L1～L4`。手機模擬探針（390×844 DPR 3、戰鬥中、玩家單位、打開 Inspector）：main 主角 y=421、面板上緣 188（被蓋住）；分支 y=92、insets.bottom=656。沒驗的列在 HANDOFF §3。
- **回退**：分支 `feat/r3-view-insets` 單一 commit，`git revert`。

### CM. 2026-11-20 優化開案書 G1 技能平衡第一輪（主代理 Opus）
- **量法**：`batch-sim` 每種站位 1500 場，種子 21 與 77 各一組（共 6000 場）；同一種子的單技能勝率差主要由它被抽到的那幾場陣容決定（換數值也不太動），所以只看兩個種子都超標的。
- **結果**：藍方勝率 種子 21：54.5／55.4 → 49.5／51.1；種子 77：56.1／56.8 → 53.0／51.2；合併 55.6% → 51.2%。對戰時間中位數 17.7 → 18.2 秒。大逃殺（`ai-idle-sim` 200 場）平均 26.6 → 26.55 秒，各職業發呆、繞圈比例差不多。改了哪些技能列在 commit 訊息。
- **沒達標**：單技能勝率差 ±5% 以內。兩個種子都超標：紅方 `mr_u4`、`sr_a4`、`mr_a5`、`rr_u3`、`tr_b4` 偏強（削了 10～20% 仍在 +6% 左右），`rr_u1` 約 −9%（處決傷害被目標剩餘血量封頂，加威力反而每次施放傷害下降，已還原，列為設計題）。`tr_b2`、`sr_a4` 的持續時間被 `SkillMechanics` 測試固定，這兩項沒改。
- **派工**：主代理自己做（判斷題）；顧問（Fable）提醒把「整體勝率」與「單技能拉平」分開調、補種子 77 的基準、設迭代上限，照做。
- **回退**：分支 `balance/g1-skills` 兩個 commit（數值、指紋重錄），一起 `git revert`。

### CN. 2026-11-20 實機確認清單結案（使用者）
- 使用者確認 HANDOFF §3 的 9 項都過了，清單清空：R3 導播避讓手機底部 UI（CL）、技能下拉搜尋（CH）、玩家操控的鏡頭與標示（CD）、對局流程移出 React 含音訊（CA）、工具視窗延遲載入與平板把手（CF、CG）、畫面插值（BY）、狀態美術與面板（BR）、機動技落點（BQ）、技能管線（BL）。

### CO. 2026-11-20 優化開案書 R4 嘲諷、加速零件方向；刪舊控制條（agy Gemini 4 Neon high＋主代理審查）
- 主代理先加型別與空殼（`engine/renderers/status/StatusDirection.ts`、`status_parts` 的 `orient`）與紅色驗收 `tests/StatusDirection.test.ts`（9 則），再派 Neon high。第一次派工在開工檢查就停：提示詞寫了舊計時欄位名（`DocDrift` 擋）、空殼多匯出一個型別（knip 擋），都是主代理的錯；修好重派一次完成。
- `StatusOrchestrator` 每幀算方向（嘲諷＝指向嘲諷者的腳點，加速＝`path[0]` 的格心，靜止依 `facing`），`drawPartLayer` 收 `orientAngle`：有方向時 rotation＝方向−nativeAngle、rise 沿反方向；沒傳時輸出不變（保真 6 張通過，沒重錄）。主代理補：沒有 `mapConfig` 時加速不給方向。
- 刪 `BarPainter` 讀舊計時欄位的控制條與型別。`fx-shot.mjs` 加 `STATUS:TAUNT`／`STATUS:HASTE`。
- 驗證：`tests/StatusDirection.test.ts` 9/9、lint、build、knip、smoke、`perf:guard` 通過；截圖上嘲諷標記太小，倒三角轉向沒有用肉眼確認（HANDOFF §3）。
- **回退**：`git revert` R4 的合併 commit。

### CP. 2026-11-20 優化開案書 G1 技能平衡第二輪（主代理 Opus）
- 拆解（seed 21，兩種站位各 1500 場，每招拿掉一個部件）：`mr_u4` 拿掉毒區 +7.8→−2.0%、`rr_u3` 拿掉火區 +6.1→−0.3%、`mr_a5` 回魔 35→18 +6.1→+0.9%、`sr_a4` 拿掉燃魔 +6.5→+3.4%、`tr_b4` 暈眩 0.5→0.25 只 +5.8→+4.8%。第一輪削威力推不動，是削錯部件。
- v1（部件削一半）藍方 52.5%；v2 加削 `rb_a1` 暈眩、`rb_u4` 定身，幾乎無效（52.4%）；v3（定案）：`mr_u4` 毒區 6→4 秒、`rr_u3` 火區 5→3.5 秒、`sr_a4` 燃魔 18→12、`mr_a5` 回魔 35→28、`rb_a1` 冰區 1.5→0.75 秒（勝率差 +6.3→+2.1／−1.8%）。藍方 seed 21 50.6%、seed 77 52.2%，平均 51.4%；對戰時間中位數 18.2～18.3 秒。指紋重錄。
- 大逃殺 `ai-idle-sim --scenario=ROYALE` 300 場 seed 21：基準勝率 10%，奧義與主動技裡偏強的有 `tb_a1`、`sb_u4`、`rr_u3`、`sb_a1`、`tb_a5`、`sr_a2`、`mr_u4`（z>3），偏弱 `rb_u1`、`wr_a1`；普攻與機動技綁職業，勝率反映職業強弱。樣本小，沒調。
- 沒達標：單技能 ±5%（HANDOFF J）。量測檔在 `tools/ui-e2e/out/g1r2-*`（不進版控）。
- **回退**：`git revert` G1 第二輪的合併 commit（數值與指紋一起）。

### CQ. 2026-11-20 優化開案書 U5 熱路徑配置（量完結案，主代理 Opus）
- 臨時探針（CDP `HeapProfiler.startSampling`，間隔 4 KB）：20 人戰鬥，前 20 秒 19～20 人在場，配置共 1.7 MB；前三名 `BattleLogger.log` 19.5%、`vfx/state.getParticle` 14%、`RenderList.next` 9.7%。60 秒版（單位會被斬殺、墜落、縮圈，20→6 人）2.5 MB，排名相同。
- 開案書的三個候選（`getTerrainHeight` 組字串、tick 開頭 `agents.filter`、`getSpatialHazardsAt`）都不在前 10 名，照本包規則不改。

### CR. 2026-11-20 站在敵方危害區上依風險決定去留（ADR 0023，主代理 Opus，使用者提議看血量）
- 原本 `WantsRetreat`、`IsInUrgentDanger`、`IsInWarningZone` 各自判斷「腳下有敵方危害就走」，和縮圈警告格同等對待；全場型危害幾乎沒有安全格，整隊在持續時間內一直找路。
- 新模組 `engine/ai/HazardRisk.ts`（參數 `constants/ai.ts` `HAZARD_RISK`）：留到結束的傷害 ≥ 血量 × 0.7、或血量 < 30%（會扣血時）、或出口 ≤ 1 步 → 走；其他留下繼續打。BT 的三個條件改呼叫它（`mustLeaveHazard`）。縮圈警告格不變。驗收 `tests/HazardRisk.test.ts`（7 則）。
- 平衡（兩種站位各 1500 場）：藍方 seed 21 50.6→50.7%、seed 77 52.2→52.5%；`mr_u4` 勝率差 +5.6→+3.0%（21）、+4.2→+2.7%（77），`rr_u3` +4.6→+4.3%、+5.8→+5.3%，`mr_a2` 沒變。
- `ai-idle-sim` 200 場 seed 21（main 對照）：TEAMS 撤退時間坦克 6.03→4.13%、戰士 3.76→2.74%、遠程 3.41→2.50%、法師 3.95→3.56%、輔助 4.29→3.19%；攻擊時間略增；發呆、過早逃跑沒有變差；尋路呼叫每秒約 +20%（坦克 1.06→1.30）。ROYALE 同方向。
- 驗證：lint、build、knip、smoke、指紋重錄後 PASS；`npm test` 只有 `AgentRunner` 時序測試在整套負載下逾時（單獨跑 7/7 通過）。
- 沒做：尋路、選目標、落點仍各自判斷「這格有沒有敵方危害」（ADR 0023 後果），第二階段再看。
- **回退**：`git revert` 這個 commit（含指紋）。

### CS. 2026-11-20 接近敵人時扛得住的危害格可以走（ADR 0024，主代理 Opus）
- `HazardRisk.hazardTolerable`（不致命且血量不低、或不扣血）成為「這格危害能不能接受」的唯一判斷；去留判斷改以它為底。尋路扛得住的格加 `PATH_RULES.TOLERABLE_HAZARD_COST` 2 分（原一律 15 分），`MovementSystem` 路徑檢查、`bestAdvanceCell`、重新站位只排除扛不住的格，`TargetingSystem` 的「危險中」同步。機動技落點與逃生尋路照舊。`tests/HazardRisk.test.ts` 加 3 則（共 10 則）。
- 平衡（對照第一階段 §2 CR，兩種站位各 1500 場）：藍方 seed 21 50.7→51.0%、seed 77 52.5→52.6%；`rr_u3` +4.3→+2.8%（21）、+5.3→+5.8%（77），`mr_u4` +3.0→+2.3%、+2.7→+3.6%，方向不一致，在雜訊內。
- `ai-idle-sim` 200 場 seed 21：尋路呼叫每秒降 7～10%（坦克 1.30→1.21、法師 0.65→0.61），撤退與攻擊時間持平；TEAMS 最後一圈撤退時間 10.2→6.8%。
- 結論：AI 規則已經不是危害技能偏強的原因，剩下是傷害本身。
- **回退**：`git revert` 這個 commit（含指紋）。

### CT. 2026-11-23 嘲諷標記不再指向嘲諷者（主代理 Opus，使用者實機回饋）
- 使用者：像 WoW 一樣，嘲諷只要有標記，被嘲諷的單位走過去打嘲諷者就是效果。`status_parts` 的嘲諷倒三角拿掉 `orient`（固定尖端朝下），`StatusOrient` 只剩 `MOVE`；`StatusDirection`、`StatusOrchestrator` 刪掉找嘲諷者的分支與 frames context；`tests/StatusDirection.test.ts` 改成驗嘲諷不帶方向（6 則）。加速的速度線照舊（HANDOFF §3 待回饋）。
- 驗證：lint、`npm test`、build、knip、runtime-smoke、`perf:guard`（保真 6 張沒重錄）、`balance:fingerprint` 180/180；`fx-shot --keys=STATUS:TAUNT` 截圖看得到倒三角朝下。
- **回退**：`git revert` 這個 commit。

### CU. 2026-11-23 PLAY 模式開案、契約 P0、瞄準放慢 P2（主代理 Opus，Fable 經 API 終審）
- 使用者定前提：一隻主角、桌機優先、即時＋選目標時放慢、獨立 PLAY 模式、按鈕＋點目標；終審後追加：機動技點地面或單位、主角陣亡觀戰到結束、沒指令時自動反擊。開案書 `docs/plans/play-mode.md`、ADR 0025。
- Fable 這週用完，第一次經 Console API 點數做終審（`api-call` skill，single 模式）：16000 token 全被思考用掉、沒有正文（US$1.10）；加到 40000 重送完成（US$1.45）。總評「先改幾處再開工」，照改：瞄準狀態放引擎（`SET_AIM`、`engine.state.aim`，原本只放 React，Canvas 疊層讀不到、放慢沒人重設）、開新局取消瞄準、`SessionView.playHeroId`、`isCastTarget` 讓 HUD／點擊／`ORDER_CAST` 共用、兩則驗收的時序（等 `GAME_START` 次數、戰鬥中 `exitPlay` 要 tick）、P5 前提自檢、點擊容差放表現層。
- 契約：`tests/contracts/PLAY.contract.test.ts`（P1 五則、P2 四則、P5 六則＋前提自檢），`status.ts` 加 P1、P2、P5。
- P2：`SET_AIM` 只收玩家單位、有技能的槽；`effectiveTimeScale` 給固定步長與 `renderer.update`。實跑探針（`tools/ui-e2e/out/aim-slowmo-probe.mjs`）每秒 tick 60.7 → 17.9（0.295 倍）→ 60.4。lint、`npm test` 1618 則、knip、build（進入點 254.4／257.5 kB）、smoke、指紋 180/180、`perf:guard` 全過。
- 既有耦合（回報、沒處理）：`targetTimeScale` 有三個寫入者（`UICommandSystem`、`VictorySystem`、`engine/game.ts`）。
- **回退**：P2 與契約各一個 commit，`git revert`。

### CV. 2026-11-23 G1 第三輪：tr_b4、sr_a4 拆解（主代理 Opus，只量沒改）
- 量法：獨立 clone 用 `tools/ui-e2e/out/g1r3-driver.mjs` 每個變體改一處技能資料，`batch-sim` 種子 21、77 各兩種站位 1500 場（共 28 段，約 60 分鐘）。同一種子裡沒動到的招，勝率差在變體間浮動約 ±1 點，這是雜訊量級。
- 現況（危害區 AI 兩階段之後，§2 CR、CS）：藍方 51.0％／52.6％；`tr_b4` +4.7／+8.1％、`sr_a4` +4.1／+6.8％，種子 21 都已回到 ±5％ 內。
- `tr_b4`：拿掉暈眩 −2.9／−3.0 點，威力 88→72 只 −1.0／−0.7 點。強在暈眩（打斷施法），不在傷害。
- `sr_a4`：拿掉重力區 −6.9／−9.3 點（變成 −2.8／−2.5％）；拿掉易傷 −2.4／−0.4；拿掉燃魔 −1.5／−1.8；威力減半 −0.8／−1.6。強在重力區。
- 兩個種子同方向都超出 ±5％ 的現在是：`sb_b4` −7.7／−8.9％、`sb_b1` +6.0／+5.0、`rb_u4` +5.9／+5.1、`rr_b1` +5.3／+5.8、`rb_u2` +5.2／+5.3（`rr_u1` 已接受偏弱）。`sb_b4`「淨化之光」是傷害技卻驅散**減益**，打在敵人身上等於沒有附加效果（讀資料，推論）。
- 沒改任何數值，等使用者決定（HANDOFF J）。

### CW. 2026-11-23 PLAY P1 對局流程、P3 點擊容差、P5a 選目標規則（主代理 Opus＋Sonnet 子代理）
- P1（Opus）：Sonnet 子代理回報「完成、全綠」，但它的 commit 只改了一行檔頭、契約狀態仍是 pending；主代理比對 diff 發現後自己實作。`planPlayRoster`、`deployRoster` 回傳生成的單位 id、`beginPlayMatch`／`equipHero`；從 PLAY 回展示不把 PLAY 的陣營設定記成玩家的。`tests/PlayFlow.test.ts`：主角倒下對局照打、導播改跟別人、照常結算。
- P5a（Opus）：`queryCastTargeting`／`isCastTarget`（機動技＝可點地面、射程 0＝自身、範圍技＝可點地面、其他＝點單位）；`resolveTap` 的瞄準與 PLAY 點擊規則；`ORDER_CAST` 驗證改用 `isCastTarget`。PLAY 契約三包全部 done，程式裡沒有 `ContractPending` 空殼了。
- P3（Sonnet 子代理，主代理審 diff 後 cherry-pick）：`engine/renderers/frame/UnitPick.ts` 是「點到哪個單位」的唯一判斷（身體框＝腳底到血條錨點、半寬＝框高×0.35、容差滑鼠 4／觸控 14 螢幕像素、重疊選排序鍵最前面）；`hooks/pickAgentAt.ts` 是輸入層唯一入口，沒點到才退回格子。RenderSpec 加一列。容差是估的，等實機調。
- 整合分支 `feat/play-integ` 驗證：`npm test` 173 檔 1624 則、lint、knip、build（進入點 255.2／257.5 kB）、`balance:fingerprint` 180/180、runtime-smoke、`perf:guard`（保真 6 張）、`audit:ui -- all` 0 違規、`e2e:ui` 253 項全過、樣式快照 0 差異（第一次跑在 db 視窗出現 React「Invalid hook call」，當時多個 Vite 行程同時在跑，重跑全過，推論是相依套件重新最佳化的偶發）。
- **回退**：各包一個 commit，`git revert`。

### CX. 2026-11-23 G1 第三輪：sb_b4 驅散方向修正（主代理 Opus，使用者選 1）
- `sb_b4`「淨化之光」是傷害技，原本驅散**減益**，打在敵人身上沒有附加效果；改成驅散敵人的**增益**（`DISPEL` polarity `BUFF`），`tests/SkillMechanics.test.ts` 同步。
- 量測（`batch-sim` 種子 21、77 各兩種站位 1500 場，改前為 §2 CV 的 base，`tools/ui-e2e/out/g1r3-compare.mjs`）：`sb_b4` 勝率差 −7.7／−8.9％ → −3.8／−6.6％；藍方 51.0／52.6％ → 51.8／53.2％（兩種子平均 52.5％，超出目標帶 50±1.5％ 約 1 點；單一種子的信賴區間約 ±1.8％）；平均時長 19.5／19.8 → 19.6／19.9 秒。改後兩個種子都超標的只剩 `rr_u1`（已接受偏弱）與 `rr_b1` +6.0／+5.0％。
- 指紋重錄（改前 36 場不同），重錄後連跑兩次 PASS；lint、`npm test` 1624 則、knip、build 通過。
- **回退**：`git revert` 這個 commit（數值、測試、指紋一起）。

### CY. 2026-11-23 PLAY 模式長鏈：P7 自動反擊、P4 入口與選主角與結算、P5 戰鬥 HUD、P6 e2e（主代理 Opus，使用者：排長鏈做完）
- P7：`Agent.stance`（HOLD／COUNTER，唯一寫入者 `SET_STANCE`，開戰快照可省略欄位）；玩家圖堅守模式先試 `CounterAttack`（最後打自己的敵人 `lastHitSourceId` 在 `PLAY_PARAM.COUNTER_LEASH_HEX` 8 格內就普攻追打）。PLAY 主角設 COUNTER，手動模式維持 HOLD（契約 G3 不變）。驗收先用種子 72 沒抓到「追」：攻擊者貼身、原地就還手，探針看清後改用攻擊者在 3 格外的種子 73；堅守那組改看「自己有沒有起步」（擊退不算）。
- P4：展示標題卡多 PLAY 鈕 → 選主角（職業＋四槽 Combobox，預設隨機）→ 開戰；PLAY 中收起播放列與編輯工具列；結算 PlayResult（VICTORY／DEFEAT／DRAW）。「職業＋隊伍能帶哪些技能」收成 `SkillQueries.roleSkills`，AgentManager 改用它（指紋不變）。勝負判斷放 `session.ts`：放 `views/play.ts` 會把技能標籤表拉進進入點（量到 +1.1 kB）。
- P5：`PlayHUD`（血魔、四技能鈕含冷卻與不能放的原因、1～4、S、空白鍵、Esc／右鍵取消、主角倒下後觀戰 ×1／×2／×4）；`selectHeroBar` 是唯一資料來源（內容沒變回同一個物件）；戰術層 `drawAimTargets` 畫可選目標圈（RenderSpec 加一列）；`ORDER_CAST` 成立時 `UICommandSystem` 取消瞄準。手機 390 寬第一版 HUD 超出畫面，改成窄螢幕血魔條換一列、技能鈕縮小。
- P6：`e2e:ui` 加 PLAY 套件（桌機、手機各一輪，`E2E_ONLY=play` 可單跑）。手機那輪兩個時序問題修在驗收的等待方式（提示列等它出現；射程內施放指令會立刻放完，改看指令紀錄）。
- 驗證：`npm test` 175 檔 1629 則、lint、knip、build（進入點 256.1／257.5 kB；PlaySetup、PlayResult、PlayHUD 各自延遲載入）、`audit:ui` 0 違規、`e2e:ui` 271 項全過與樣式快照 0 差異、runtime-smoke、`perf:guard`（保真 6 張）、`balance:fingerprint` 180/180。第一次完整 e2e 的 Inspector 組 5 項 EDIT_AGENT 失敗，單獨跑兩次、重跑完整都過（HANDOFF D 的時序偶發同類）。
- 沒驗的：手感（放慢 0.3 倍、點擊容差 4／14 px、按鈕大小）只有截圖與探針，等使用者實機。
- **回退**：各包一個 commit，`git revert`。

### CZ. 2026-11-24 PLAY 射程 0 機動技修正、大逃殺加樣本、工具佈陣提案（主代理 Opus，使用者：照順序開跑）
- **Pages 部署**：11-22、11-23 有 3 次在最後的 deploy 步驟失敗（lint、測試、build、上傳都過，GitHub 端回「No artifacts named github-pages」）；重跑最新一次成功，PLAY 已上線。
- **射程 0 的機動技**（HANDOFF §3 那項「6 招射程 0 沒專門驗」）：`tb_m2`、`mb_m2`、`sb_m1`、`tr_m2`、`mr_m2`、`sr_m1` 都是自身周圍半徑 1 的擊退，沒有位移，卻因為 `castTargeting.targetModeOf` 先判斷 MOBILITY 而進了 UNIT_OR_GROUND。探針：點 3 格外的地面，主角走到差 1 格就停住挨打，15 秒內 12 種情況（6 招 × 點地面／不帶目標）都沒放出。改成先判斷射程 0（SELF，按一下就放）；敵人貼身時 13～19 tick 放出、敵人被推到 4 格。`tests/PlayerOrders.test.ts` 加一則（修前紅、修後綠）。SELF 技能身邊沒敵人時會一直等（G3 的既有設計），沒改。
- 驗證：lint、`npm test` 175 檔 1630 則、build、`E2E_ONLY=play npm run e2e:ui` 全過。
- **大逃殺加樣本**（只量沒改）：`ai-idle-sim --scenario=ROYALE --battles=1500`，種子 21、77 各一次（各約 140 秒）。職業勝率（每場 2 人，期望 20%）：坦克 13.5／15.5%、戰士 10.6／10.2%、遠程 24.2／27.3%、法師 27.0／25.3%、輔助 24.0／21.0%。單技能和同職業同槽的其他招比（奧義、主動技；`tools/ui-e2e/out/royale-z.mjs`，不進版控），兩個種子都同方向 |z|≥3 的：偏強 `tb_u3`（21.8／23.4% 對 7.4／8.1%）、`tb_a1`（24.5／23.4% 對 10.0%）、`tr_a4`、`tb_a5`、`wr_u5`、`wr_a5`、`wr_a3`、`rr_u2`；偏弱 `tb_u2`（1.0／4.3%）、`mb_u3`（1.5／4.2%）、`sr_u3`、`tr_a3`。CP 的 300 場名單裡 `tb_a1`、`tb_a5` 這次也偏強；`rr_u3` 只有種子 21 超標。
- **工具佈陣開案書**：API 點數的 Fable 5.2 寫 `docs/plans/tool-deployment.md`（single 附 9 個檔）。第一次 high、上限 40000：思考用掉 36882，正文只寫到 §1 就截斷（$2.03）；第二次 medium、上限 48000、限制篇幅，end_turn（$1.36）。等使用者決定（HANDOFF L 第 4 項）。
- **回退**：射程 0 的修正一個 commit，`git revert`。

### DA. 2026-11-24 PLAY 瞄準引導、機動技選目標分三種、預警參數（主代理 Opus，使用者：問顧問、用現成資源、照推薦分三種、調共用預警參數）
- 盤點（顧問確認方向）：射程格（`GridRenderStrategy.checkIsRange`）、游標格（`useGameInput` 的 `hoveredHexRef`，本來就在 UI 層）、施法範圍（`getImpactArea`＋Cast 疊層）、目標圈（`drawAimTargets`）都已存在，這輪只接線；撤回上一版提案的 ADR、手機兩段確認、按兩次自動施放、虛線。
- 機動技點地面探針（14 招）：鉤拉、擊退對空地照樣放出；突進只往點的方向走 1 格；後撤退 1 格、方向和點哪裡無關。改成照 `castMotion` 分三種（突進／瞬移＝UNIT_OR_GROUND、後撤＝SELF、其他照一般規則），契約 P5 與 MANIFEST 同步。
- 接線：`castTargeting.aimedCast` 是解析 aim 的唯一處；`tapIntent.hoverHexOf` 讓瞄準中的游標格＝點下去會施放的位置（同一個 resolveTap）；技能鈕頂端對象色帶讀 `TACTICAL_COLORS`；目標圈游標下那一個加粗（`AIM_RING_FOCUS_WIDTH`）。
- 範圍預覽一開始看不見：頁面裡直接 import 模組查證，旗標都對（Cast＋Range），是外觀問題——射程與施法範圍同格都用 screen 疊格邊會洗成白色；冰原、沙漠上 screen 會把同色系填色吃掉。`GroundPriority` 加「同格有施法範圍時射程讓開」，`GRID_OVERLAY.RANGE` 填色 0.1→0.35、新增 `CAST_BLEND` source-over。沙漠、VOID 清楚，冰原可辨但偏弱。
- 驗證：lint、`npm test` 175 檔（`AgentRunner` 時序偶發一次，單獨重跑過）、build、knip、runtime-smoke（battleTime 0.52→4.60）、`perf:fidelity` 6 張（`battle_frozen` 取證後獨立重錄，地形 5 張 0 差異）、`perf-ab --assert` 通過。截圖探針 `tools/ui-e2e/out/aim-shots.mjs`（不進版控）。
- 沒驗的：手感與預警會不會太搶眼，等使用者實機。`onCast` 位移判斷散在 `SkillExecutor`、`BTRegistry`、`SkillStateMachine` 三處（既有耦合，沒動，待提案）。
- **回退**：`git revert` 重錄那個 commit 與功能 commit（順序：先重錄、後功能）。

### DB. 2026-11-24 夜間長鏈：游標格每幀重算、後撤實放、部署查證、兩份提案（主代理 Opus，使用者：你處理、可跑的長鏈就安排、有問題問顧問）
- 顧問指出今晚上線功能的兩個缺口。① 游標格只在 pointermove 更新：滑鼠不動按 1～4 或單位走開時預覽停在舊位置。`useGameInput` 記最後一個滑鼠位置（觸控放開／離開畫布清掉；觸控這條沒實測，Playwright 用的是滑鼠，未驗證），GameCanvas 每幀 `refreshHover`，仍走 `hoverHexOf`。探針 `tools/ui-e2e/out/aim-stale.mjs`（不暫停、滑鼠停在敵人身體上方不動、比對畫出的格子＝現在點下去的範圍）：修前 5/5 失敗（7 格只對上 2～3 格）、修後 5/5 通過。② 後撤類機動技 6 招實放：敵人在 2 格內 13 tick 放出、退 2 格；沒敵人時指令掛著約 4.7 秒後才放（只回報，沒改）。
- `balance:fingerprint` 180/180（今晚引擎相關改動沒動到模擬）。
- PLAY e2e 偶發「點敵人沒送出指令／手機畫面沒敵人」：HEAD 3 次 1 次、改後 3 次 2 次，同類，3 次的樣本分不出差異（HANDOFF D）。
- 部署：重跑失敗的錯誤是「Multiple artifacts … count is 2」（actions/deploy-pages#338）；第一次就失敗的「No artifacts」原因未定（失敗與成功的間隔都是 0 秒）；11-22 起 push 7 次第一次失敗 6 次、dispatch 2/2 成功。workflow 拆 build／deploy 兩個 job，**只在本機 commit，沒 push**（commit 訊息裡的「7 次失敗 5 次」算錯，以這裡為準）。
- 提案：`docs/plans/oncast-motion-decoupling.md`（只寫文件）。工具佈陣開案書補 P0 查證 12 條（explorer 子代理讀碼）：放置順序會影響抽技能 → 觸發 §2.3 停下條件，等使用者決定。
- 其他：`play-mode.md` 加 2026-11-24 註記（P5 規則已改）；記憶加「先用現成管線資源」。
- **回退**：游標格修正一個 commit；workflow 一個 commit（未 push）；文件 `git revert`。

### DC. 2026-11-24 PLAY 介面手機版清查、主畫面入口交換鈕、主角輪廓光（主代理 Opus，使用者：排長鏈做完、入口改成小交換符號）
- 清查（iPhone 14 Pro Safari 可視區 393×659、852×361，觸控）：直向選主角職業列右溢 19 px；橫向選主角面板 418 px 高、開戰鈕在畫面外；直向技能名被截成一個字、HUD 150 px；橫向 HUD 佔高度 34%；主畫面標題卡橫向頂出上緣 36 px。原因：技能鈕用 `className={cn(...)}` 覆寫 Button 的高度、對齊（UI 定義禁止，`ui-audit-static` 只認兩種 className 寫法所以沒抓到）；HUD 用 Tailwind `sm:`（640）、其他畫面用 `useCompactViewport`（900）兩套斷點；只看寬度不看高度；手機底部面板用了真模糊。舊 e2e 的手機輪是 390×844、沒觸控、只查左右。
- 驗收先改紅：`ui-audit-static` 補認 `cn(...)` 與 `sm:` 前綴（修前抓到 PlayHUD 1 處）；PLAY e2e 改成桌機＋iPhone 直／橫（觸控），檢查四邊出界、文字截斷、HUD 高度 ≤ 22%、技能圖示、觸控取消瞄準、結算畫面版面；`E2E_PLAY_VIEWS` 可只跑某個版面。
- PLAY HUD：單列；技能鈕只放技能圖示（沿用檢查器的 `SkillIcon`，投影加 `visual`、`color`）＋快捷鍵數字＋對象色帶，名稱在 title 與瞄準提示；尺寸讀新 token `--ui-play-*`（觸控 48 px），排法在 `index.css` 的 `.play-hud`；手機純色外殼。觀戰倍率改 Segmented；PlayHUD 列進 `CONTROL_BAR_FILES`。瞄準提示移到上方中間，顯示技能名，觸控只寫「點選目標」，多一顆取消鈕。結果：直向 338×94、橫向 458×66（佔 18%）。
- 選主角：窄畫面與手機橫向職業只放文字；手機橫向改兩欄（面板 242 px 高）。文字表移到 `data/ui/labels/play.ts`（PLAY，延遲載入）與 `showcase.ts`（主畫面入口，首屏）。
- 主畫面入口：兩顆大鈕改成一顆入口鈕＋交換鈕（lucide `ArrowLeftRight`），在 START SIMULATION／PLAY 之間切換，預設模擬（9 支工具腳本都點 START SIMULATION）。手機橫向標題卡和入口並排貼底。換入口時不重掛按鈕：重掛會重播上浮動畫，Playwright 點擊時把 `overflow:hidden` 的根捲動 16 px（e2e 抓到）。
- PLAY 中不畫導播攝影機框（DIRECTOR_CAM_FEED、TRK_ID）。
- 主角輪廓光（`engine/renderers/units/UnitOutlinePass.ts`）：精靈／變羊本體畫出來那一刻記下剪影切片與畫布變換，tactical overlay 之後、血條之前在最上層補金色描邊（實線 2 px＋光暈 4 px，CSS px，`UNIT_OUTLINE`）；剪影圖集和受擊閃白共用一次查詢，不用 shadowBlur。站在障礙物、別的單位後面也看得到輪廓。RenderSpec「玩家單位標示」同步。
- 進入點預算：main 256.7 kB，改完 257.57 kB 超標；拆出 showcase 文字表、精簡輪廓程式（外框改用中心＋半寬、拿掉 beginFrame、flush 併進 tactical-overlay 計數範圍）後 257.5 kB 剛好過，**幾乎沒有餘裕**。
- 驗證：lint、`npm test` 175 檔 1634 則、build（預算過）、`audit:ui` 0 違規、`E2E_ONLY=play` 三個版面全過、runtime-smoke（battleTime 0.52→4.57）、`perf:guard`（保真 6 張過；第一次 VOID／FOREST 超標是剛 build 完的負載，重跑全部 16.7 ms 過）、完整 `e2e:ui` 310 項全過（含樣式快照）、knip。截圖探針 `tools/ui-e2e/out/play-iphone-probe.mjs`、`home-probe.mjs`、`outline-shots.mjs`（不進版控）。
- 收尾複查（顧問）：屍體也走 `SpriteUnitRenderer.draw`（`UnitDeathPainter`），拿掉 `hp > 0` 會讓倒下的主角留金邊，加回 `outlineKindOf`；為了預算再省兩處（外框只留光暈寬、`resetTransform`），進入點 257.5 kB 過。外框改寫後在 HEAD 重拍輪廓（桌機 DPR 2、手機，含變羊）對得上；`npm test` 1634、runtime-smoke、knip 重跑過。
- 沒驗的：iPhone 實機（Safari 的合成行為、手感、輪廓粗細）。好幾招共用同一個 `visual`，圖示會一模一樣（例：遠程三招都是箭），只靠快捷鍵與色帶分。
- **回退**：一個 commit，`git revert`。

### DD. 2026-11-24 PLAY 技能鈕兩字縮寫、技能圖示美術輪代表素材（主代理 Opus，使用者：縮寫和每招一個圖示都要）
- 縮寫規則（`data/ui/labels/play.ts` 的 `skillShortLabel`，唯一判斷處）：四字名取後兩字（招式本身：斬擊、彈射、閃現），後兩字以「之」開頭改取前兩字（淨化之光→淨化），三字名取前兩字（震盪箭→震盪），8 招例外表（撞名或不成詞）。先比過前兩字規則：同職業不同槽撞名 24 組（法師可能四招都是「奧術」），後兩字 6 組。`tests/SkillShortLabel.test.ts` 4 則：都是兩字、不以「之」開頭、同一個主角可能同時帶到的技能不撞名（不分陣營，比 PLAY 抽法嚴）、是原名的子字串。修前紅（5 組撞名），加例外後綠。
- HUD：技能鈕圖示 28 px（新 token `--ui-play-slot-icon`）＋下面一行縮寫（`--ui-font-num`）；投影加 `skillId`。DECISIONS「UI」操作列純圖示那條記下這個例外（使用者 11-24）。e2e 加「四顆鈕都有兩字縮寫且不重複」。
- 進入點預算又超 6 bytes（投影在首屏包）：拿掉投影裡沒人讀的 `cost` 與 `mp`（`mp` 是整數、幾乎每個 tick 變，原本會讓 HUD 多重繪），257.5 kB 過。
- 驗證：lint、`npm test` 176 檔 1638 則、build（預算過）、`audit:ui` 0、knip、`E2E_ONLY=play` 三個版面過（直向「畫面裡沒有敵人」一次，是 HANDOFF D 的已知偶發，單獨重跑過）。手機截圖看過縮寫（直、橫）。
- **技能圖示美術輪（art-round，停在代表素材關卡）**：現行圖示依 `visual` 只有 7 種，而且好幾招的技能色接近黑（`mb_u1` 奧術漩渦、`wr_u5` 毀滅重擊），現在的圖示在原尺寸幾乎看不見。沒有生圖工具、Codex 這週不給本專案，代表素材用本機已有的 lucide 線條圖（ISC，`node_modules/lucide-react`，約 2170 個）。對照板 `tools/ui-e2e/out/icon-board.png`（產生：`node tools/ui-e2e/out/icon-board.mjs`，不進版控）：遠程（藍）、法師（藍）、戰士（紅）各四顆，三列＝現行／A 白線色底（底＝技能色壓暗、白線）／B 色線暗底＋光暈，原尺寸貼岩漿戰場、放大 3 倍、灰階。主代理先看：B 和現行一樣，技能色太暗的兩招看不見；A 每種顏色都清楚、灰階也分得出。等使用者選。
- **回退**：一個 commit，`git revert`。

### DE. 2026-11-24 技能圖示美術輪：每招一個圖示（主代理 Opus，使用者：妳決定就好）
- 選風格 A「白線色底」（art-round §3 第 4 點，使用者交給主代理）：對照板 `tools/ui-e2e/out/icon-board.png` 上，B 和現行一樣，技能色接近黑的招（`mb_u1` 奧術漩渦、`wr_u5` 毀滅重擊）在原尺寸看不見；A 線條固定白色，每種技能色都清楚，灰階也分得出。沒派 agy：對照表是一張資料表，一個上下文就做得完，用測試驗收。
- 對照表 `data/ui/skillGlyphs.ts`：170 招各指定一個 lucide 線條圖（共 114 種），同一職業 34 招不重複（兩陣營一起算）。`tests/SkillGlyphs.test.ts`：每招都有、只有這些招、圖在已安裝的 lucide 裡而且是正式名稱（`angry`、`music`、`waves` 是轉發別名，改成 `face-angry`、`eighth-notes`、`waves-horizontal`）、同職業不重複、JSON 和表與 lucide 原始資料一致。先紅（JSON 還沒產生）後綠。
- 不把線條打進程式包：lucide 會被分到預載的 `vendor-ui`，初始載入預算只剩約 2.6 kB。改成 `npm run gen:skill-glyphs`（`tools/assets/gen-skill-glyphs.mjs`）把用到的圖抽成 `public/assets/ui/skill_glyphs.json`（26 kB），`hooks/adapters/skillGlyphs.ts` 第一次要用時才下載。`SkillIcon` 有對照就畫徽章（`.skill-glyph`：底＝技能色壓暗到 55%、外框＝技能色、白線），還沒載完或沒有對照（編輯器新增的技能）用舊的程序圖示。檢查器與 PLAY HUD 同一個元件。進入點與初始載入預算都過。
- 沒換的：戰場上單位頭頂的詠唱量表（`GaugePainter`，畫布）仍是舊圖示；換它是渲染線，`battle_frozen` 保真基準可能要重錄，留在 HANDOFF。
- 驗證：lint、`npm test` 177 檔 1642 則、build（兩個預算都過，JSON 有複製到 dist）、`audit:ui` 0、knip、完整 `e2e:ui` 313 項全過（含樣式快照）、手機直橫截圖看過（四顆圖示都不一樣，暗色技能也看得到）。ASSET_LEDGER §6b 記 lucide（ISC）。
- **回退**：一個 commit，`git revert`；只想退回舊圖示，刪 `public/assets/ui/skill_glyphs.json` 也會自動退回。

### DF. 2026-11-24 推上 main 後 Pages 建置超出進入點預算，地圖編輯工具列改延後載入（主代理 Opus，使用者：推上）
- DC～DE 四個 commit 快轉進 main 並 push（c9045c54..c53554c2）。Pages 的 build job 失敗：CI 算出進入點 gzip 257,502 bytes，預算 257,500（本機同一份是 257,499，兩邊 zlib 差幾個 bytes）。線上仍是上一版。
- 門檻不能放寬（CLAUDE.md），所以找首屏用不到的東西搬出進入點：用 source map 看進入點組成，引擎本來就要在首屏跑（展示模式），UI 裡 `MapEditorToolbar`（原始碼 10 kB）只在手動模式（HUD 開著）出現，改成 `React.lazy`（和 PLAY 畫面、工具視窗同一種做法）。進入點 257.5 → 256.6 kB，初始載入 380.6 → 379.8 kB，留出約 0.9 kB 餘裕。
- 驗證：lint、`npm test` 177 檔 1642 則、build（兩個預算過）、knip、完整 `e2e:ui`：第一次第一頁就逾時（開發伺服器冷啟動），重跑 312 項過、1 項失敗＝PLAY iPhone 直向「畫面裡沒有敵人可瞄準」（HANDOFF D 的偶發），單獨重跑直向又失敗一次。這次在同一個版面連兩次，比之前頻繁，記進 HANDOFF。
- **回退**：一個 commit，`git revert`。

### DG. 2026-11-24 PLAY 主角標示：輪廓 50%、腳下橢圓換成地塊光（主代理 Opus，使用者：輪廓太強改 50%、有輪廓就不要橢圓、腳下用網格的特效發亮）
- 輪廓：`UNIT_OUTLINE.HERO.ALPHA` 0.5，貼回時乘上去。腳下橢圓（`TacticalRenderer.drawPlayerRings`）與 `TACTICAL_DRAW.PLAYER_RING_*` 六個常數刪掉；瞄準圈原本借用光圈的脈動速度，改成自己的 `AIM_RING_PULSE_SPEED`。
- 腳下那格：沿用現成的地塊光（`GridOverlays` 的 LIGHT 層，screen 疊色），`GridRenderStrategy` 在 agents 迴圈記下主角所在格（`agent.q／r`），寫進那格 TERRAIN op 的 `oLightCol／oLightInt`。誰要標示只在 `UnitOutlinePass.outlineKindOf` 判斷（改成 export，輪廓與地塊光共用）。強度 `TILE_LIGHT` 1.25 × `GAIN` 0.4 = 0.5，已經頂到共用的 `GRID_OVERLAY.LIGHT.MAX_ALPHA`，沒動。
- **修到的舊 bug**：`RenderOp.clear()` 沒重設 `oLightCol／oLightInt`（以前沒人寫入所以沒發現），池子重用後上百格都亮。補重設，`tests/RenderOpClear.test.ts` 擋（修前紅、修後綠）；探針量到修後一幀只剩主角那一格。
- 看圖（`tools/ui-e2e/out/marker-biomes.mjs`，五種地形各一張主角特寫，桌機 DPR 2、RTX 4070）：岩漿、森林、冰原、虛空清楚，沙漠最淡（金色疊橘黃）。虛空那張亮格在主角旁邊：不暫停連拍（`marker-burst.mjs`，主角走路中每 250 ms 一筆）量到邏輯格和腳位換算的格最多差 1 格，只在走進下一格那一刻切換，是「站的那一格」的正常行為，沒改。地塊光優先序最低（`GroundPriority`：預警、施法範圍、危害、狀態地色、縮圈都會蓋過），主角被變羊、站上紅格時腳下不亮，只剩輪廓與箭頭；列進 HANDOFF §3 給使用者實機看，沒動優先序。
- RenderSpec「玩家單位標示」、`constants/terrain.ts`（`PLAYER_MARK` 註解）、DECISIONS「UI」同步。
- 驗證：lint、`npm test` 178 檔 1643 則、build（進入點 256.7／257.5 kB）、runtime-smoke（battleTime 0.52→4.57）、`perf:guard`（保真 6 張過，`battle_frozen` 0 差異）、`E2E_ONLY=play` 三個版面全過。沒驗的：iPhone 實機。
- **回退**：一個 commit，`git revert`。

### DH. 2026-11-25 PLAY 操控手感：實測延遲來源、MOBA／RTS 對照、ADR 0026、K1 玩家指令打斷規則（主代理 Opus，K1 實作 agy Gemini 4 Neon high；使用者：控制不貼手、研究 MOBA／RTS、問答定規則、合併 K1）
- 研究（`docs/plans/control-feel.md`）：探針 `tools/ui-e2e/out/input-latency3.mjs`（不進版控）量到傳導鏈本身 1～3 tick；延遲來自玩家指令沿用 AI 規則：普攻前搖中下移動等前搖走完（中位數 0.48 秒，10 筆）、走路中改向等 `REPATH_MIN_S`（中位數 0.23 秒，10 筆）、冷卻／魔力不足／自身技身邊沒敵人時乾站不普攻（魔力只靠出招累積，魔力不足會卡死）；輸入層放開才送、漂移超過 8 px 指令不見。使用者問答定案寫成 ADR 0026，拆 K1～K4（§7）。
- K1（Neon 約 16 分鐘，7 則紅色驗收一次全綠、沒動測試）：打斷規則集中在 `Orders.orderInterrupts`；取消走 `SkillStateMachine` 新的 CANCEL 邊；`MovementSystem.allowImmediateRepath`；`ORDER_CAST` 依 `playerCastRefusal` 拒收、HUD 變暗並在上方提示原因（`PLAY_TEXT.CAST_BLOCK_*`）；SELF 招直接放，`targetModeOf` 搬到 `SkillQueries`。
- 主代理審查補兩處：取消前搖原本不發事件，詠唱字與詠唱序列會殘留 → 新事件 `CAST_CANCEL`（`CombatSystem.cancelCast` 發，`announcesCast` 與 CAST_START 共用判斷；HUD 直接收掉詠唱字、`SequenceSystem.cancel`）。普攻冷卻被當成拒收，反擊中普攻鈕幾乎一直變暗（PLAY e2e 抓到）→ 普攻冷卻不拒收（攻擊間隔，MOBA 也不拒收），加一則驗收。舊測試「冷卻中下的施放指令不會被丟掉」與 ADR 0026 相反，移除。
- 改後：普攻前搖中下移動，固定種子模擬 23 次有 22 次 1 tick 內換路；剩 1 次是路被隊友擋住、先照堅守打一下（ADR 0022 既有設計，沒改，改了可能來回抖動）。走路改向 4 筆都 1 tick。瀏覽器探針換很多場後頁面會當（main 同樣會，第 27 輪），樣本因此小。
- 驗證：lint、`npm test` 179 檔 1650 則、build（進入點 257.2／257.5 kB，只剩 0.3 kB）、knip、`balance:fingerprint` 180／180 相同、runtime-smoke、`E2E_ONLY=play` 三個版面過（iPhone 直向「畫面裡沒有敵人」偶發一次，單獨重跑過）。沒驗的：實機手感。
- **回退**：`git revert 3a59fc62`（K1 實作）；驗收在 `bceb2eb1`。

### DI. 2026-11-25 PLAY 操控 K2 奧義詠唱逐步扣魔、K3 桌機滑鼠與 Quick Cast（主代理 Opus，實作 agy Gemini 4 Neon high 兩條並行；使用者：照 session-002 開 K2、K3，合併）
- 前置（主代理，`7d955603`）：播放列 `PlaybackHUD` 在展示與 PLAY 模式是隱藏的，改 `React.lazy`，進入點 257.2 → 255.5 kB；`windows.e2e.mjs` 支援 `--only=<組>`、新增 `npm run e2e:play`（允許清單只收確切指令）。完整 `e2e:ui` 314 項過。
- K2（Neon 約 6 分鐘，10 則紅色驗收全綠、沒動測試）：`SkillStateMachine` 新增 `drainsManaDuringWindup`（tag ULT，扣魔、結算、魔力檢查共用）與 `windupDuration`（`beginWindup` 與扣魔共用）；每 tick 扣 `cost × min(dt, castTimer) ÷ 時長`、扣到 0 為止，完成只加 `gain`；前搖中的奧義不算魔力不足；不新增 Agent 欄位。`BTRegistry` 386、1007 行與 `TargetingSystem` 166 行的 `a.mp >= s.cost` 是既有重複判斷，沒動。
- 指紋重錄（`cedd9f7a`）：改前 180／180 全不同（取樣含 mp）；`--dump=TEAMS:0` 比對 main，第一個差異在第 15 幀，只有詠唱奧義中的單位 mp 不同。`balance:sim` 兩種子各 1000 場（±3.1%）藍方勝率：種子 1 50.0 → 50.2%、種子 21 50.8 → 51.5%，平均每場 +0.1 秒，雜訊內。
- K3（Neon 約 19 分鐘，PointerGesture 8 則與 e2e K3 11 項全綠、沒動測試）：`tapIntent.pointerGesture` 對應表（PLAY 滑鼠左鍵按下即下令、中鍵拖鏡頭、右鍵拖鏡頭或點一下取消瞄準；觸控與非 PLAY 照舊）；`resolveQuickCast` 與瞄準中 `resolveTap` 共用 `resolveAimCast`；`useGameInput` 照手勢分派，`PlayHUD` 的 window `contextmenu` 監聽移除（右鍵取消只在輸入層）。Quick Cast：`components/ui/play/playPrefs.ts` 唯一擁有者（localStorage，預設關；鍵名放這裡而不是 `constants/ui.ts`，因為 `UI_PIN` 受 `ConstantsBarrel` 快照鎖定），選主角畫面開關（非觸控才顯示），`App` 持有 ref 接 `GameCanvas`→`useGameInput` 與 `PlayHUD`。附帶消失：PLAY 暫停時滑鼠左鍵拖會變成編輯用的拖單位（`MOVE_AGENT`）。
- 紅色驗收的 e2e 全在暫停中做、監聽 bus 記錄送出的 UI_COMMAND，避開「敵人移動中點偏」偶發。寫的時候踩過：鍵 1～4 對應槽位順序是 ULT／ACTIVE／BASIC／MOBILITY，開局按 1、2 會被魔力拒收，所以改用普攻槽（鍵 3）；左鍵點的空地要離單位 ≥3 格，否則會點到身體框。
- agy 第一次派 K2 時，第一步就用終端機讀派工單被拒、整次結束（派工單裡「讀檔用內建工具」那句它還沒讀到）；`-p` 直接寫明後重派就正常。
- 驗證（`integ/k2k3`，主資料夾）：lint、`npm test` 181 檔 1668 則、build（進入點 256.1／257.5 kB）、knip、`balance:fingerprint` 180／180 相同、runtime-smoke（battleTime 0.52→4.65）、完整 `e2e:ui` 324 項全過。沒驗的：桌機實機手感、iPhone。
- **回退**：K3 `git revert 3be5a80d`；K2 `git revert bbb0eb52 cedd9f7a`（要一起退，指紋跟著實作）；播放列延後載入在 `7d955603`。

### DJ. 2026-11-25 PLAY 操控 K4 觸控（主代理 Opus，實作 agy Gemini 4 Neon high；使用者：照 session-003 開 K4，合併）
- 紅色驗收（主代理，`a25bad46`）：`tests/PointerGesture.test.ts` 改寫觸控一則、加 `multiPointerGesture`、`resolveSkillDrop` 共 8 則紅；`windows.e2e.mjs` 的 `runPlayTouchChecks` 用 CDP `Input.dispatchTouchEvent` 送真的觸控（`page.click`／`page.mouse` 在 `hasTouch` 裡仍是滑鼠指標），iPhone 兩版面各 11 項，main 上紅 4 項（單指滑動、兩指平移、技能鈕拖曳兩項），其餘是防退化（點按下令、第二指取消、捏合在 main 已成立；捏合本來就在 `useCameraControl`，不另做）。探針前提：畫布真的收到 `touch`、真的同時兩指。
- 實作（Neon 約 16 分鐘，`302b64e6`，沒動驗收）：`tapIntent` 的 PLAY 觸控 `ORDER_ON_UP`（放開位置下令）、`multiPointerGesture`（只有 PLAY 觸控剛好兩指是鏡頭）、`resolveSkillDrop`（不在畫布或不能接指令＝取消；在畫布上走 `resolveQuickCast`，沒目標＝留在瞄準）；`useGameInput` 兩指中點位移送 `CAMERA_PAN`；`quickCastRef` 改成 `PlayPointerPort`（`quickCast`、`hoverAt`、`dropSkill`）；`PlayHUD` 技能鈕拖曳（超過拖曳門檻才送 `SET_AIM`，拖曳後補發的 click 抑止、鍵盤 click 照舊）；`.play-slot` `touch-action: none`。附帶消失：PLAY 暫停中單指從單位身上滑動會變成編輯用的拖單位（`MOVE_AGENT`）。
- e2e 前提加固（主代理，`8642ed11`、`b1db24f9`，斷言不變）：敵人只選腳下 56 px 內沒有別的單位的、點腳下往上 12 世界 px（腳下在身體框下緣，會落到上一格空地：HANDOFF D「瞄準時點敵人沒送出指令」的來源之一）、取目標前等鏡頭停下、空地與滑動起點要在畫布上；觸控檢查移到 HUD 出現後立刻做（主角較晚會先倒下）、開頭清掉殘留瞄準、結束時交還導播縮放；「瞄準時點敵人」改比點擊前後的施放筆數。修前完整跑偶發 2～4 項，修後 iPhone `e2e:play` 連兩次、完整 `e2e:ui` 一次全過。一次直向技能鈕拖放沒送出施放（留在瞄準），原因未明，加診斷後沒再出現。
- 驗證（`integ/k4-touch`，主資料夾）：lint、`npm test` 181 檔 1675 則、build（進入點 256.4／257.5 kB）、knip、`balance:fingerprint`、runtime-smoke、完整 `e2e:ui` 346 項全過。沒驗的：iPhone 實機；拒收槽不能拖、SELF、觸控筆、非 PLAY 觸控只有讀碼與單元測試。
- **回退**：`git revert 302b64e6`（e2e 前提加固的兩個 commit 可留著）。

### DK. 2026-11-25 K4 後續：PLAY 連點不重設縮放、非 PLAY 右／中鍵拖出畫布後游標格停更新（主代理 Opus；使用者：PLAY 關掉雙擊重設、直接 commit 到 main）
- 部署：`73b8956b` 的 Pages 第一次就成功（run 45634376593）。11-24 拆成 build、deploy 兩個 job 後 push 6 次，deploy 步驟 5/5 第一次成功，唯一失敗是 build job 的進入點預算（DF）。
- 游標格（`hooks/useGameInput.ts`）：`handlePointerDown` 先把指標記進 `activePointers` 才判斷 `IGNORE` 就 return；這種指標沒有 capture，在畫布外放開時畫布收不到 `pointerup`，那筆紀錄留著，K4 加的提早 return（`IDLE` 且有按著的指標）就一直擋掉懸停。改成 `IGNORE` 不記（從根源修，不加指標類型判斷）。探針（`tools/ui-e2e/out/hover-stale-probe.mjs`，不進版控；非 PLAY、右鍵與中鍵各一次：畫布上按下、拖到按鈕上放開、回畫布掃 9 點數游標格非 null）：修前 0/9、0/9，修後 9/9、9/9；不按鍵移出移回的對照 7/9～9/9（展示鏡頭會動，部分點落到地圖外）。沒處理的邊角：已有觸控按著時再按 `IGNORE` 的滑鼠鍵，仍走多指標分支、沒有 capture。
- 雙擊／雙點重設縮放（`hooks/useCameraControl.ts`）：PLAY 模式連點是連續下令，`dblclick` 與觸控雙點不再交還導播（`tapResetsZoom`，讀 `engine.matchFlow.isPlay`）；手動、展示模式照舊。`tests/CameraInput.test.ts` 加一則（真的 `MatchFlowSystem.startPlay`），拿掉判斷時會紅（2 次重設）。
- 驗證（主資料夾）：lint、`npm test` 181 檔 1676 則、build（進入點 256.5／257.5 kB）、runtime-smoke、完整 `e2e:ui` 全過。沒驗的：實機（HANDOFF §3）。
- **回退**：`git revert` 這個 commit。

### DL. 2026-11-25 K1～K4 Fable 終審（API）與三項修正（主代理 Opus，終審 Fable 5.2 走 API 點數 $2.09；使用者：Fable 開案、終審用 API，修 #1～#3）
- 終審：單次請求附 `bceb2eb1^..HEAD` 的程式與測試 diff、`useGameInput.ts`、`tapIntent.ts`、ADR 0026、`control-feel.md`、`AGENTS.md`（輸入 86826、輸出 34828 token）。報 4 項 important，主代理讀碼查證 3 項成立；第 4 項（拖技能鈕時主角陣亡，`dragRef` 殘留）不成立：結算時 `PlayHUD` 整個卸載（`App.tsx`），觀戰期間沒有技能鈕。其餘（既有 bug、架構、低信心）記在 HANDOFF §2 PLAY 那條。
- #1 奧義詠唱中換目標乾站：同一招前搖中的施放指令只要不是延續同一個前搖（換目標、換格），會取消前搖、已扣的魔力不退，但拒收判斷在取消前做、把它當成延續而跳過魔力檢查，新指令就因魔力不足在 `OrderCast` 原地等回魔。改成先組指令，`orderInterrupts(...).cancelWindup` 為真時用取消後的狀態判斷（`playerCastRefusal` 加 `restartsWindup`，`resourceBlock` 的 `isThisWindup` 改成參數）：魔力不夠就拒收、不打斷。
- #2 瞄準卡在放不了的槽：瞄準中那一槽進冷卻後，點目標被靜默拒收、瞄準不清；再按同一顆鈕只跳「冷卻中」。改成施放被拒收時，瞄準的是同一槽就結束瞄準（`UICommandSystem`，仍是 `state.aim` 唯一寫入處）；`PlayHUD.pressSlot` 拒收時若按的是瞄準中的那一顆，先送 `SET_AIM null`。
- #3 滑鼠 chord：同一個滑鼠已按著一顆鍵時再按或放另一顆，瀏覽器只發 `pointermove`（`button` 是變化的那顆）。`useGameInput` 把按下、放開的手勢起止抽成 `beginGesture`／`endGesture`／`resetGesture`，`pointermove` 用 `tapIntent.mouseChordChange`（按鍵位元表只在 `tapIntent`）判斷：按下＝放棄目前手勢、照那顆鍵開始（左鍵照樣下令）；放開的是目前手勢的那顆＝照放開結束（右鍵點一下照樣取消瞄準），再由還按著的鍵接手、不下令。
- 紅色驗收（主代理先寫）：`tests/PlayReviewFixes.test.ts` 4 則（#1、#2 各一則紅、一則防退化），紅在要驗的那一行；`PointerGesture.test.ts` 加 `mouseChordChange`、`heldMouseButtons` 3 則；`windows.e2e.mjs` 的 K3 桌機加 3 項（右鍵拖中按左鍵下一筆指令、放開右鍵後左鍵不拖不下令、左鍵按著時右鍵點一下取消瞄準），main 上 3 項全紅。
- 驗證（`fix/k-final-review`，`C:\Git\_wt_k3_input`）：lint、`npm test` 182 檔 1683 則、build（進入點 256.9／257.5 kB）、knip、`balance:fingerprint`（TEAMS／ROYALE／SQUADS 各 60/60 相同：`resourceBlock` AI 也在用，行為沒變）、runtime-smoke、完整 `e2e:ui` 346 項過（另 3 項：chord 驗收本身的落點問題，改完後 `e2e:play` 連兩次 chord 三項都過；K4 點按、滑動是既有偶發，見下）。chord 驗收第一版把右鍵拖到開頭取的空地座標，前面拖過鏡頭（還會被畫面邊緣夾住），左鍵常落到地圖外：改成右鍵按著不拖、按之前重取空地。探針（`tools/ui-e2e/out/chord-probe.mjs`，不進版控）：右鍵按著時按左鍵，main 0/2 送出指令、分支 3/3；觸控點按分支 4/4。
- HUD 那一半的 #2 探針（`tools/ui-e2e/out/hud-aim-probe.mjs`，不進版控；瞄準某槽 → 冷卻 99、魔力 0 → 再按那顆鈕）：main 瞄準留著、分支瞄準結束。
- e2e 偶發：K4 單指點按／滑動有三種失敗。① 放開時原本的空地座標已不在地圖上（`tapNow.hex` null，取目標後鏡頭又動了）；② 敵人走進那一格（送出 `ORDER_ATTACK`）；③ 格子正確、事件序列正常（`pointerdown`、`pointerup`），卻沒送出指令，原因未明。同一資料夾只跑 `iphone-landscape` 交替 A/B 各 3 次：main 失敗 2 次（滑動沒指令一次、②一次）、分支 0 次；分支加內部紀錄只跑兩種 iPhone 版面 5 次全過。③ 只在先跑桌機的完整套件裡出現（分支 10 次有 3 次、main 5 次 0 次），差異還不足以下結論，可能是真的 bug。K3「左鍵按下送移動」與「瞄準時點敵人」在 main 也偶發（主角倒下或點偏）。沒驗的：實機（HANDOFF §3）。（11-26 更正見 §2 DM：③ 是真的 bug；「只在完整套件出現」不成立；② 推論是敵人身體框、沒有單獨抓到。）
- **回退**：`git revert` 這一輪的 commit。

### DM. 2026-11-26 PLAY 點己方身體框蓋住的地面不再被吞掉（主代理 Opus；使用者：追 K4 e2e 偶發 ③，根因回報後選「A＋B 都修」）
- 根因（DL 的 ③）：放開點那一格是空地，但落在主角或隊友的身體框裡（身體框比格子高，再加觸控容差 14 px）。`pickAgentAt` 身體框優先，`resolveTap` 在 PLAY 對己方單位一律回 `NONE`，移動指令被吞掉。確定性重現（`tools/ui-e2e/out/k4-bodybox-repro.mjs`，不進版控；PLAY 暫停中找這種點、CDP 真觸控點一下）：iPhone 直、橫各 10 場，這種點 10/10 沒送指令，對照的空地點 10/10 送出 `ORDER_MOVE`；畫面上可走空地被己方身體框蓋住的比例直向 19.4%、橫向 11.0%（敵方 7.5%、9.0%，n≈1.9 萬點）。e2e 原本選的空地（`k4-e2e-ground.mjs`，各 30 場）落在己方框裡直向 2 場、橫向 5 場，就是 ③ 的來源；桌機滑鼠也會中（紅色驗收在桌機重現），所以 DL 寫的「只在完整套件出現」不成立。DL 的 ②「敵人走進那一格」推論是落在敵人身體框，沒有單獨抓到。
- A（產品，`engine/systems/ui/tapIntent.ts` 的 `resolveTap`）：PLAY 不瞄準時點到己方單位，指標那一格不是它站的格子就落到原本的點地面判斷（地圖上、非障礙物＝`ORDER_MOVE`）；那一格就是它站的格子、或點到非 PLAY 照舊。那一格站著別的單位（前面的隊友蓋住後面的敵人或隊友腳下）時也是 `ORDER_MOVE`：`UICommandSystem` 本來就收有人的格子、走得過去才走，測試釘住現狀；要不要改成攻擊那格的敵人是新規則，沒做。敵人身體框照舊攻擊；瞄準中走 `resolveAimCast`，沒改（同類問題，HANDOFF §2 PLAY 等使用者決定）。契約 P5 原樣通過。
- B（e2e，`tools/ui-e2e/windows.e2e.mjs` 的 `playScreenTargetsNow`）：選空地改用產品自己的 `renderer.unit.pickAgent`＋觸控容差＋`K3_PICK_SLACK_PX`（6 px），取代「離所有單位 3 格」的估法；另外回傳 `behind`（己方身體框本體蓋住的空地），K3 桌機、K4 兩種 iPhone 各加一項「點己方身後的地面送出移動」。
- 紅色驗收（改 A 之前）：`tests/TapIntent.test.ts` 加 3 則（真的開一場 PLAY），2 則紅在要驗的那一行；第 3 則原本紅在前提：戰鬥中 `SET_OBSTACLE` 排到下一個 tick 才套用，測試改成 emit 後 `flushQueued()`。`e2e:play` 新增三項全紅（`behindSent: []`）。
- 驗證（`fix/play-tap-own-body`，`C:\Git\_wt_k3_input`）：lint、`npm test` 182 檔 1686 則、build（進入點 256.9／257.5 kB）、knip、runtime-smoke；完整 `e2e:ui` 349 項過，新增三項全過，另 3 項紅：桌機 Quick Cast、iPhone 直向技能鈕拖放與「瞄準時點敵人」，都是瞄準路徑（`resolveAimCast`／`resolveSkillDrop`，這次沒動），是既有偶發；接著重跑 `e2e:play` 100 項全過（含這 3 項）。沒驗的：實機（HANDOFF §3）。
- **回退**：`git revert` 這一輪的 commit。
### DN. 2026-11-26 瞄準中點己方身體框蓋住的地面、onCast 位移判斷收進 SkillQueries（主代理 Opus；使用者 11-26 積壓卡片：瞄準「照樣改」、onCast「同意動工」）
- 瞄準（`engine/systems/ui/tapIntent.ts`）：DM 的判斷抽成 `ownBodyOverGround`（PLAY、己方、指標那一格不是它站的格子），`resolveTap` 的移動與 `resolveAimCast` 共用這一處。`resolveAimCast` 先看點到的單位是不是這招的目標（是就對它施放，治療點隊友照舊），不是且 `ownBodyOverGround` 成立就落到地面判斷（UNIT_OR_GROUND 的招對那一格施放）；Quick Cast、技能鈕拖放、`hoverHexOf` 預覽都走 `resolveAimCast`／`resolveTap`，一起跟上。`tests/TapIntent.test.ts` 加 2 則（真的開一場 PLAY）：範圍技點主角／隊友身後空地＝對那格施放、預覽同一格；點己方自己站的格子、地圖外、單體技點己方身體框＝不動作。
- onCast（照 `docs/plans/oncast-motion-decoupling.md`）：`SkillQueries` 匯出 `castMotion`、新增 `movesSelf`、`hasCastAction`；`motionOfAction` 用 `never` 窮舉，`CastAction` 加新種類沒處理就編譯失敗。`SkillExecutor` 的 `mobilityDash`（仍只認 DASH）、`retreated`（`castMotion === 'BACK'`）、不前衝條件（`!movesSelf`），`SkillStateMachine` 的定身擋招（`movesSelf`）都改讀它。資料裡的 `onCast` 都只有一個動作（BLINK 2、DASH 3、RETREAT 6），同義替換。
- 驗證（主資料夾 main）：lint、`npm test` 182 檔 1689 則、build（進入點 257.0／257.5 kB）、knip、`balance:fingerprint`（TEAMS／ROYALE／SQUADS 各 60/60 相同）、`e2e:play` 100 項全過。沒驗的：實機（HANDOFF §3）。
- **回退**：`git revert` 這一輪的 commit（瞄準與 onCast 各一個）。
### DO. 2026-11-27 PLAY 指令路徑三項耦合（開案書 `docs/plans/play-order-decoupling.md`；研究與 D0～D3 實作 Fable 5.2 子代理，審查與合約其餘四處主代理 Opus；使用者 11-26：第 1 項選 A、D1／D2 動工）
- 研究：Fable 讀 Game Programming Patterns（Command、Event Queue、State）、OpenRA、0 A.D.、Unity／Android 的拖曳門檻；結論是不改走 `engine.bus`（回放快轉時 bus 靜音，ADR 0019 禁止模擬層訂閱），改把職責放回擁有者。
- D1（`55a0cd8f`）：`currentTelegraph` 只由 `SkillStateMachine` 寫：`beginWindup` 多收預警格參數、`endWindup` 清掉，`CombatSystem`、`CastingEngine` 不再寫；登記進 `AGENT_FIELD_OWNERS`。新測試 `tests/TelegraphOwnership.test.ts`（先紅後綠）。審查時把重複的「會不會預警」判斷收成 `SkillQueries.announcesCast`，`CombatSystem` 與測試都讀它（`7c3d853e`）。
- D2（`756e8822`）：拖曳門檻收成 `tapIntent.isPastDragSlop`；`useGameInput` 兩處直接讀，`PlayHUD` 經 `PlayPointerPort` 讀（元件不能 import 引擎模組）。埠還沒填時當成還沒開始拖。
- D3（`48b1c6ce`）：`UICommandSystem.applyPlayerOrder` 搬成 `engine/systems/orders/OrderIntake.ts` 的 `applyOrder`，`UICommandSystem` 回到只驗證；ADR 0027。合約「系統之間只透過 `engine.bus`」改寫成「改別的系統的狀態呼叫擁有者的 API，bus 只通知、模擬層不訂閱」：`AGENTS.md`（Fable）、`CLAUDE.md`、`docs/METHODOLOGY.md`、`.claude/agents/reviewer.md`、`.codex/agents/reviewer.toml`（主代理；子代理不改主代理合約）。合約改動下一個工作階段才生效。
- 驗證：D0 逐 tick 探針（`tools/ui-e2e/out/order-ab.mjs`，不進版控；3 種子、89 道 `ORDER_*`，取消前搖 16、立即換路 15、拒收 8、預警格出現 14／清掉 13）D1、D3 後和基準 `cmp` 相同；`balance:fingerprint` 每包 180/180；`perf:fidelity` 六張 PASS、改前改後數字相同；runtime-smoke 過。審查後重跑（`_wt_play-orders`）：lint、`npm test` 183 檔 1695 則、build（進入點 257.0／257.5 kB）、knip、指紋 180/180；主資料夾 `e2e:play` 100 項全過。沒驗的：實機（行為不變，無新項目）。
- **回退**：反向 `git revert` 這四個 commit（`7c3d853e`、`48b1c6ce`、`756e8822`、`55a0cd8f`）。
### DP. 2026-11-27 工具佈陣收斂（開案書 `docs/plans/tool-deployment.md`、ADR 0028；P0～P4 與判準、情境表 Fable 5.2 子代理，P5 收尾、P6、審查主代理 Opus；使用者 11-26 同意動工含 P5）
- 五支無畫面工具（`simFingerprint.ts`、`ai-idle-sim.mjs`、`batch-sim.mjs`、`mobility-probe.mjs`、`record-bench.mjs`）的佈陣改走新入口 `tools/sim/headlessBattle.ts` 的 `buildHeadlessBattle`，它只組合 `Deployment.ts` 的 `planRoster`／`deployRoster`；對戰規模只留 `SIM_SCENARIOS` 一份。引擎、`data/`、`constants/`、`types.ts` 零修改。`tests/HeadlessBattle.test.ts` 驗入口並掃描 `tools/balance`、`replay`、`sim` 不得自己佈陣。
- 停下兩次：① P2／P3 的「新值落在舊版三種子最小～最大」判準有約一半機率誤判（20/105 值在外）。主代理加跑 ai-idle TEAMS 種子 4～9 改前改後（`node tools/balance/ai-idle-sim.mjs --scenario=TEAMS --battles=200 --seed=N`），合併種子 1～9 後各職業勝率 |z|≤0.75、idle% 差 ≤0.1 點，判為雜訊，開案書 §3.2(c) 改成兩比例 z 檢定（|z|<2）。swapSides 3000 場×3 種子合計 A +0.69（±1.46）、B −0.35（±2.06），在雜訊內，沒動 `Deployment.ts`。② P5 讓 `PlayerOrders`（縮圈）、`PlayerStance`（反擊）兩則測試變紅：它們靠種子湊站位。改成明寫前提（縮圈：全部原地堅守、縮圈掃到誰就由誰當主角；反擊：找攻擊者在 2 格到 `COUNTER_LEASH_HEX` 之間的種子），新舊佈陣下都過。種子 73 在新站位下攻擊者 9 格外，照規則不追，不是 bug。
- P5：預測（改前寫定）TEAMS 0/60、SQUADS 0/60、ROYALE 60/60，結果一致；重錄後逐筆比對基準 TEAMS 60、SQUADS 60、ROYALE 0 場變，180/180。
- 工具輸出從這一輪起和舊紀錄不能直接比（分界 `31c74032`）；新工具和遊戲同樣左邊陣營先放。
- 驗證（`integ/2026-11-27`，DN、DO、DP 三條合在一起）：lint、`npm test` 184 檔 1704 則、build（進入點 257.0／257.5 kB）、knip、`balance:fingerprint` 180/180、runtime-smoke 過。`e2e:play` 四次 2／2／3／0 項紅，main（`08f81481`）交替跑兩次 3／2 項紅，失敗項目都是 K3／K4 既有偶發（HANDOFF §2 D），判為偶發。
- **回退**：反向 revert；P3 依賴 P2 與情境表收斂（`5ba85f97`），先退後者之後的 commit；P5 程式與基準同一個 commit，不用 `--record` 回退。
### DQ. 2026-11-28 畫面打光：WebGL2 打光與後製通道（ADR 0029 取代 0001；開案書 `docs/plans/visual-experiment.md`、`docs/plans/lighting-pass.md`；主席 Fable 5.2，階段 A～E 由排程工作階段跑；Codex 做 F0 探針、F3 長條圖工具、盲評與 F4 調查；使用者 11-27「畫面好很重要」、11-28「0001 改」「你全權處理弄好你滿意就回主線部署」）
- **結論**：使用者說戰場「亂而平」。量測（`npm run perf:layers`）證實 FOREST、ICE、DESERT 的環境比單位亮；只調烘焙打光在 64 px 下看不出差別、只在 Canvas 2D 壓暗做不出衰減與投影。改成世界照舊用 Canvas 2D 畫，之上加一個 WebGL2 通道打光：冷環境光加月光、每個單位一盞暖色點光、地面投影與接觸暗部、特效與玩法標示不受壓暗、特效照亮周圍、泛光、色調映射。
- **做法**（`engine/renderers/lighting/`，參數只在 `constants/lighting.ts`）：`RenderPipeline.draw` 在通道啟用時把世界畫進離屏的世界畫布，每畫完一個 op 呼叫 `LightingPass.tag` 記遮罩（直立物幾何、特效、玩法標示，半解析度；地塊本體不重畫）並收集點光與投影物；`present` 上傳、打光、後製、貼回主畫布。疊層與 HUD 照舊畫在主畫布，不打光。不引入任何函式庫。
- **開關與退路**：預設桌機開、觸控裝置關；`?lit=0`／`?lit=1` 覆寫。WebGL2 或 `EXT_color_buffer_float` 拿不到、只有軟體算圖（`failIfMajorPerformanceCaveat`）、render target 建不起來、context 遺失時走原路徑。自適應品質降到解析度階層（`RENDER_QUALITY.LIT_MAX_TIER`）時釋放通道、這個頁面不再打開（網址明寫 `lit=1` 時不關）。
- **量測**（每個數字的指令在 `docs/plans/lighting-pass.md` §7）：
  - 盲評（兩位 Sonnet `reviewer`，匿名、左右隨機的對照板，取低分，六張平均）：打光關 3.5、開 5.2；兩位六張都偏好打光版。體積感與材質兩項開關同分（40 px 的單位上看不出來）。第一位在四張圖給打光版的可讀性 1 分（關是 2 分）：光池外的單位與暗處的格線要找；之後把單位保底受光與環境光調高，這次調整沒有再送評。
  - 內顯（無頭 Edge 不加旗標選到 AMD 內顯、1280×720）：打光讓 33 FPS 掉到 17；約 30 秒內自動關掉，回到 56 FPS（關掉後品質階層也降了）。
  - 桌機 RTX 4070、2560×1440：特效壓力下平均少約 7 FPS（被 56 Hz vsync 釘住，沒有每幀毫秒數）。
  - 手機模擬（只降 CPU 4 倍）：平均 FPS 少三到四成，所以觸控裝置預設關。iPhone 實機沒量。
  - 關閉打光時 `npm run perf:fidelity` 六張的數字和 main 逐位數相同（VOID 0.296、FOREST 0.659、ICE 0.302、MAGMA 0.614、DESERT 0.500、battle_frozen 0.177）。
- **工具**：`perf:layers`（分層亮度與彩度；`--assert-order` 在 Canvas 2D 路徑有 12 筆明度順序違反，沒有調到變綠）、`perf:vfx-strip`（技能特效連續格，決定性）、`perf:lit`（打光開關對照與 `--walk N` 連續幀）。`render-fidelity` 與凍結幀探針的網址固定帶 `lit=0`（基準只對應 Canvas 2D 路徑）；`windows.e2e.mjs` 加 `--force_high_performance_gpu`（不加時選到內顯，打光讓指標類檢查 14 項逾時；加了之後 352 項全過）。`perf-frames` 加 `PERF_QUERY`、`perf-mobile-emu` 加 `--query`。
- **保留與丟掉**：
  - kept -> 烘焙主光與色帶收進 `bake_common.py`（`ea1935e5`）-> 重構前後原始 PNG 逐像素 0 差異。
  - dropped -> 烘焙打光預設 `--lighting`（`bac6c919`，已 revert）-> 兩位評審 64 px 下都分不出來。
  - dropped -> Canvas 2D 內壓暗、降彩、背景、縮圈格、六角光池（`4454108b`～`315a17e0`，`e5f994f3` 還原）-> 和打光通道疊加會太暗；數值留在 `visual-experiment.md` §9～§12。
  - dropped -> 離線打光原型（`819386b8` 的探針）-> 引擎版取代。
  - kept -> F3 技能特效抽樣結果、F4 本機圖生 3D 調查 -> HANDOFF §2 O 的待辦還要用（`docs/plans/visual-experiment/`）。
- **驗證**（`exp/visual-lighting`，合併前）：lint、`npm test` 184 檔 1704 項、build（進入點 257.4／257.5 kB）、knip、`perf:guard`（保真六張、效能護欄）、`runtime-smoke`（預設與 `lit=0`）、`e2e:ui` 352 項全過、`perf:lit` 六張與 60 幀連續畫面 0 個頁面錯誤。主席看過：五群系與戰鬥幀的對照、60 幀走路條（光與影子連續）、本機預覽的展示模式與編輯模式。沒驗的：iPhone 實機、WebKit、context 遺失路徑、長時間遊玩、PLAY 模式的實際手感。
- **回退**：`git revert -m 1` 合併 commit 回到純 Canvas 2D；只想關掉效果的話把 `RENDER_QUALITY.LIT_DEFAULT_ON` 改成 false（程式留著、預設不載入）。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| ADR 0029 取代 0001；`AGENTS.md` §1 第 4 點、`CLAUDE.md` 架構不變式、`METHODOLOGY.md` §2 改成「WebGL 只用在 `engine/renderers/lighting/`，不引入渲染函式庫」 | 排程工作階段照這條把 WebGL 程式碼限定在一個目錄、沒有引入函式庫（`git diff main --stat` 只有 `lighting/` 三個檔用到 GL） | helped |
| 全域 `art-benchmark` skill（開案先定標、交圖盲評） | 第一輪盲評就判 F1 不量產，省掉整組重烘；排程工作階段的第一位評審派工單洩漏了版本，靠「盲評要匿名」這條才發現並重評 | helped |
| 排程任務的派工單寫「驗收失敗兩次就停、不改驗收」 | C1 的 0 差異驗收第一種做法沒過，它照備案改做法而不是放寬門檻（`lighting-pass.md` §7 C1） | helped |
### DR. 2026-11-28 打光常開：拿掉自動關閉、所有裝置預設開、context 還原後繼續打光（ADR 0030；主席 Fable 5.2；使用者 11-28 實機回饋「沒兩下就被關掉了，不論如何都不可以被關掉」「預設開，然後我們要優化特效系統」）
- **結論**：DQ 上線當天使用者在桌機看到打光很快被關掉。重現後確認不是選到內顯：一般 Chrome 視窗用的是 RTX 4070，打光開著 45～192 FPS，幀率短暫低於 45 就觸發 `LIT_MAX_TIER` 的自動關閉，關掉後 56～229 FPS。照使用者的決定拿掉自動關閉，手機也預設開；之後的效能工作改成降打光自己的成本（開案書 `docs/plans/lighting-cost.md`，等使用者選先做哪一包）。
- **做法**：`LightingGate` 不再讀品質階層與裝置類別（`requested()` 只看網址與 `RENDER_QUALITY.LIT_DEFAULT_ON`）；刪 `RENDER_QUALITY.LIT_MAX_TIER` 與 `LightingPass.dispose`。跑不動時自適應品質照舊降解析度，打光通道的畫布跟著變小。
- **順帶修到的錯**：用 `WEBGL_lose_context` 觸發 context 遺失再還原，還原後 `lost` 一直是 true、打光回不來。原因是擴充在還原後失效，`EXT_color_buffer_float` 只在建構子啟用一次，render target 建不起來就被判成永久停用。改成 `createResources` 每次重建都重新啟用；同時接受 `EXT_color_buffer_half_float` 當備援（中間貼圖是 RGBA16F）。
- **量測**（探針都不進版控，在 `tools/ui-e2e/out/`）：
  - 線上版時間軸：`node tools/ui-e2e/out/lit-timeline-probe.mjs "https://avalon-ash.github.io/Group-Battler-FFT-Final/" 75`（一般 Chrome 視窗、不加 GPU 旗標、2544×1345；顯示卡字串 `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`）：第 48 秒 `__LIGHTING__` 變 `shed`。
  - 階層與 context：`node tools/ui-e2e/out/lit-timeline-probe.mjs local 3 --torture`：階層 0→1→2→3→2→0 全程 `active`，世界畫布 2544×1345 → 1908×1008 → 1272×672 再回來；context 遺失時 `lost` true、畫面是未打光的原路徑、戰鬥照跑；還原後 `lost` false、畫面恢復打光（截圖 `tools/ui-e2e/out/lit-always-on/lost-vs-restored.png`）。修正前還原後 `lost` 仍是 true。
  - 內顯：同一工具加 `--lowgpu --size=1280x720`，48 秒（`ANGLE (AMD, AMD Radeon(TM) Graphics …)`、1264×625、開發伺服器）：全程 `active`，第 8 秒起在階層 3，之後 30～41 FPS（第 0 秒 8 FPS、第 8 秒 13 FPS 是降階前）。
  - 觸控模擬：加 `--touch --gpu`（393×660、DPR 3、`pointer: coarse`）：沒寫 `lit` 就是 `active`。
  - 打光成本逐項關閉：見開案書 §2（場景不穩，只當初步證據）。
- **手機解析度的畫布記憶體**（`node tools/ui-e2e/mem-probe.mjs 60 "mute&quality=0"` 與 `… "mute&quality=0&lit=0"`，393×852、DPR 3、品質階層釘 0，各三次，中位／最高 MB）：打光開 818／925（4 局）、458／525、431／490；打光關 403／479、482／606、358／475（其餘都 3 局）。同設定三次之間就差到一倍（抽到的場景不同），打光開關的差在這個雜訊之內；打光通道自己的畫布是 7 張 10 MB（第一次那筆記成 21 張 21 MB，工具用呼叫堆疊歸類，把經過 `tag` 建立的別的快取也算進去）。GL 貼圖工具量不到，DQ 的估算（階層 0 約 44 MB）沒有變。
- **沒驗證的**：iPhone 實機（幀數、發熱、分頁回收、真實的 context 遺失）、WebKit 上兩個擴充的支援；`EXT_color_buffer_half_float` 那條路在桌機沒有被走到（桌機有 `EXT_color_buffer_float`）。
- **驗證**（`feat/lit-always-on`）：lint、`npm test`、build（進入點 257,372／257,500 位元組）、knip、`runtime-smoke`、`perf:guard`（保真六張過、效能護欄過）、`e2e:ui`、`e2e:play`、`perf:lit` 全部退出碼 0（紀錄 `tools/ui-e2e/out/gates-lit-always-on.log`，未進版控）。
- **回退**：revert 這個 commit 回到「桌機開、觸控關、降到解析度階層就關」；只想關掉效果的話把 `RENDER_QUALITY.LIT_DEFAULT_ON` 改成 false。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| ADR 0030（只改 0029 的預設與自動關閉一條，0029 維持採用） | 還沒有後續工作用到 | unverified |
### DS. 2026-11-28 打光成本 C0、C1：量測工具與直立物遮罩（開案書 `docs/plans/lighting-cost.md`；主席 Fable 5.2；使用者 11-28「處理效能部分到你滿意，視覺也是，我只有一個需求，現代化」）
- **結論**：使用者的假設是「最大成本是舊的仿光效特效」。量到的是：打光讓每幀 4.75 → 9.94 ms，八成以上花在用 Canvas 2D 重畫遮罩，著色器量不出來，特效類 op 全部加起來不打光 0.65、打光 2.23 ms。這個渲染器執行期沒有多邊形，面數不影響打光；貴的是貼圖次數與畫布之間互相讀取。仿光效零件改成光仍然值得做（少畫、省快取記憶體、光會照到場景），排在開案書 C2。
- **C0**：`npm run perf:lit-cost`（`tools/ui-e2e/lit-cost.mjs`）。凍結戰鬥的固定場景、每種做法開新頁面畫相同的幀、逐幀同步推進後強制顯示卡做完再計時；量的是真實時鐘（保真工具的假時鐘會把每幀量成 16.67 ms，第一次就踩到）。場景不同或頁面出錯時退出碼 1。
- **C1**（都在 `engine/renderers/lighting/LightingPass.ts`）：
  - kept -> 直立物的章先蓋在暫存畫布上各自的格子裡，整幀畫完才一次貼進幾何遮罩（`beginItem`／`endItem`／`flushItems`）-> 完整打光 9.94 → 8.81 ms；`perf:lit` 六張每張 92 萬像素只差 0～4 個像素。
  - kept -> 剪影的透明度改由呼叫端決定（`SpriteUnitRenderer`、`PolymorphPainter` 只畫形狀；遮擋剪影在 `SilhouetteMask` 設 `UNIT_SPRITE.silhouetteAlpha`；打光遮罩用 `LIGHTING.GEO.UNIT_COVERAGE` 0.68 畫一次，等於原本 25% 畫 4 次）-> 8.81 → 8.70 ms，在雜訊內；`perf:fidelity` 六張過，打光畫面只差單位邊緣的半透明像素（0.3～1.3%）。沒有載到圖集時的備援圓形剪影現在也是 25%（以前是不透明白）。
  - kept -> 蓋章 `source-in` 改 `source-atop`（格子已裁切到章的矩形，結果相同、不用另開一層）-> 量的時候機器有別的負載，分不出差別。
  - dropped -> 改用跟直立物一樣大的小暫存畫布（假設整張畫布被改寫前要先複製）-> 變慢，完整打光 9.94 → 11.37 ms；成本跟畫布被讀幾次成正比，不是跟畫布大小。
- **量測**（`npm run perf:lit-cost`，RTX 4070、2560×1440、開發伺服器；完整表在開案書 §2.1、§4.1）：完整打光 9.94 → 8.14 ms，不打光 4.75 → 4.63 ms，打光的額外成本 5.19 → 3.52 ms（少三成）。同做法重跑差約 ±0.1 ms；機器有別的負載時整組一起慢三成，所以每次連對照組一起量。
- **驗證**（`perf/lighting-cost`）：lint、`npm test` 1704 項、build（進入點 257,371／257,500 位元組）、knip、`runtime-smoke`、`perf:guard`（保真六張的數字和 main 相同：ICE 0.302、MAGMA 0.614、DESERT 0.500、battle_frozen 0.177；效能護欄過）、`perf:lit`（同版本連拍兩次 0 差異）都過。`e2e:ui` 兩次各 1 項紅、`e2e:play` 三次 2 次各 1 項紅，都是 PLAY 瞄準與拖放技能（Quick Cast 目標不同、拖放沒送出指令）；同一天在 main 上 `e2e:play` 三次也是 2 次各 1 項紅（同一類），判定是既有的偶發（HANDOFF §2 D），不是這一輪造成。
- **補驗**（commit 之後，main 與分支同一個工作階段各拍一次）：遮擋剪影那一幀有 4 個被擋住的單位，Canvas 2D 路徑 0 差異；`perf:lit -- --walk 60` 靜止六張差 0.27～1.3%、連續格差 2.4%，都在單位輪廓邊緣；強制每個直立物幀中途貼一次，和正常版差 0～18 個像素（手機直向約 16 個直立物就會走到這條路）。行為改變一處：剪影現在跟著出場淡入、墜落淡出變淡，以前固定 25%。
- **還沒到的**：目標是打光的額外成本低於 2 ms，現在 3.52 ms。點光約 0.09 ms 一盞（9 盞 0.84 ms），所以「光暈零件一對一換成點光」會比現在貴，C2 要先量不帶投影的光與特效餘光兩條路。
- **回退**：revert 這個 commit；`perf:lit-cost` 的 `item_*` 做法會跟著失效（它們修補 `beginItem`／`endItem`）。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| 開案書寫「每次連不打光的對照組一起量，不跨次比絕對值」 | 同一輪第二次量測全組慢三成，靠對照組才沒把負載干擾當成改動的效果 | helped |

### DT. 2026-11-28 打光成本第二批 P1～P6：量測修正、遮罩成本的去向、光的成本（開案書 `docs/plans/lighting-cost.md` §8；主席 Opus 5.5，分支 `perf/lighting-cost-2`；使用者 11-28「妳安排，到明天之前所有額度都妳調用，我要結果」）
- **結論**：目標（打光的額外成本 3.52 → 2 ms 以下）**沒有達到，正式路徑沒有改動**。修正量測工具之後，同一份程式（和 main 相同）的額外成本是 3.06～3.29 ms（6 次執行），3.52 有一部分是第一頁偏差。剩下的成本是遮罩上的 2D 重畫（瓶頸在 Chrome 的 GPU 行程）；這一批想到的精確等價做法都量過，沒有一個超過雜訊。最大的一項（貼地鋪設重畫進特效遮罩約 1 ms）比它的呼叫數該有的貴，成因沒查明，是下一步。3.52 → 約 3.1 是量測更正，不是改善。2 ms 以下要等鋪設查明、C5（精靈由顯示卡成批畫），或接受畫面差異。這台機器今天 `direct` 5.6～5.9 ms（§8 要求 4.6～4.9；使用者的 Chrome 同時佔顯示卡 3D 約 14%），所以只比同一次執行裡的差：完整打光 ÷ 不打光 1.54～1.59 倍（C1 之後 1.76 倍是第一頁偏差下的數字）。
- **P1（工具，`tools/ui-e2e/lit-cost.mjs`）**：
  - kept -> 正式量測前先跑一個不計時的頁面 -> 第一個頁面固定比後面慢 0.3～1 ms（同一次執行 `full` 7.66／8.01／12.87、`full_again` 7.31／7.01／11.86 ms）；C1 的各項差與「點光 0.09 ms 一盞」都帶著這個偏差。
  - kept -> `--repeat N`（做法輪流開頁面合併）、`noise` 改成同一段在不同頁面間的差、`full_again`／`direct_again` 對照組、表尾印 `full − direct`、`--shot` 每個做法存一張截圖（驗做法有沒有畫出它說的東西）。
  - kept -> 細項做法：上傳拆背景／遮罩／世界、地塊遮罩拆疊層／鋪設、鋪設拆平面／懸空平面，以及 P2～P4 的假設測試（每個都能重跑）。
- **細項**（`--repeat 2`，開案書 §4.2 完整表）：遮罩重畫 2.36 ms，其中貼地鋪設逐格重畫進特效遮罩 0.91（另兩次 0.98、1.02）、特效類 op 0.63、單位 0.33、障礙物 0.16；挖洞、基礎疊層、點光、背景上傳都在雜訊內。上傳的成本是點陣化遮罩累積的繪製（每張遮罩上傳兩次不變貴）。1280×720 額外成本 2.41 ms，2560×1440 3.06 ms：大部分跟像素數無關。Chrome 追蹤：瓶頸在 GPU 行程的主執行緒（Skia 送出 2D 繪製、WebGL 指令），頁面的 JS 每幀只多約 0.6 ms；遮罩裡的鋪設每幀約 90 次貼圖、58 次 save、7 次 clip（約 11 µs 一次，光暈貼圖約 5.6 µs）；平面、懸空平面兩條路各自拿掉都讓 Skia 送出時間 3.0 → 1.4～1.5 ms，不能相加，成因沒查明。
- **P2、P3**（遮罩與上傳；全部 dropped，正式路徑沒有改動，表在開案書 §4.2）：
  - dropped -> 上傳改 `texSubImage2D` -> 同一次執行和舊路徑比 +0.29 ms（雜訊 0.33）；第一次量到的 −0.84 是第一頁偏差。
  - dropped -> 遮罩延後到世界畫完再重畫、地塊遮罩先畫、鋪設不切換混合模式 -> +0.03、−0.21（雜訊 0.90）、−0.01 ms。
  - dropped（沒做，先量上限）-> 三張遮罩合成一張上傳、背景不經 GL、玩法標示改在著色器擋、鋪設改 WebGL 畫 -> 上傳兩次不變貴、背景上傳 +0.02、挖洞 −0.06、上傳鋪設圖層就要 0.68 ms。
- **P4**（光的成本，只量，開案書 §5.1）：多 16／32／64 盞光（帶投影 +0.06／+0.20／+0.16 ms，64 盞範圍 300 +0.13，不帶投影 +0.00／−0.19／+0.09）都在雜訊附近；同樣數量的光暈貼圖（世界＋特效遮罩各一次）+0.31／+0.81／+0.72 ms。桌機上點光比光暈貼圖便宜，「0.09 ms 一盞」是第一頁偏差。建議 C2 在打光開啟時把 `glow` 零件改成點光；「不帶投影」是為手機做的假設（桌機分不出），要先處理 64 盞上限與取捨規則。C3、C4 建議不做（待終審）。用 `--shot` 確認光真的有畫出來（64 盞換掉 18 萬～147 萬像素）。
- **P6**（Sonnet 子代理，只讀）：`docs/plans/gpu-sprites-survey.md`，47 列 painter 的 Canvas 2D 功能與檔案行號；op 數是實測、每 op 呼叫數是讀碼推算。主席審過後提交。
- **P5**（Sonnet 子代理，只查不修）：`tools/ui-e2e/windows.e2e.mjs` 加 `--lit=0`（網址多接 `&lit=0`）。`npm run e2e:play` 打光開／關交替各 5 次（每次 100 項）：開 5 次中 3 次紅、共 3 項；關 5 次中 2 次紅、共 5 項（一次連鎖紅 4 項）。紅的都是 iPhone 觸控 K4 的點擊、點身後地面、拖放技能鈕、瞄準時點敵人，兩組都有；這個樣本分不出偶發紅和打光有關（`tools/ui-e2e/out/p5-e2e.md`、`p5-lit-*.log`、`p5-nolit-*.log`）。前提由主席另外驗過（`tools/ui-e2e/out/p5-litcheck.mjs`，同樣的無頭 Edge 與啟動參數）：桌機與 iPhone 橫向檢視預設 `__LIGHTING__` = `active ANGLE (NVIDIA … RTX 4070 …)`，加 `lit=0` 是 `null`。
- **驗證**（分支相對 main 沒有任何 `engine/`、`constants/`、`data/`、`components/`、`hooks/`、`tests/` 的差異；`git diff --stat main -- engine constants data components hooks types.ts constants.ts tests` 為空）：lint、`npm test` 1704 項、build（進入點 257.4／257.5 kB）、knip、`runtime-smoke`（0 頁面錯誤、引擎在跑、畫面在變）、`perf:guard`（保真六張 VOID 0.296、FOREST 0.659、ICE 0.302、MAGMA 0.614、DESERT 0.500、battle_frozen 0.177，和 main 相同；效能護欄過）。`perf:lit -- --walk 60` 和 `lit-main-walk/` 比：靜止六張 0.27～1.28%、連續格 2.38%，和 DS 補驗記的 C1 差異同量；`lit-main-walk/` 是 C1 合併前拍的，所以這是 C1 的差，不是這一批的。同版本連拍兩次差 0～2 個像素。幀中途貼圖的路徑（`flushItems`）沒有改，沒有重驗。HEAD 上 `npm test` 1704 項過；`npm run e2e:ui` 一次 1 項紅（PLAY iPhone 直向 K4「點己方身後地面送出移動指令」，`behindSent: []`），和 P5 兩組都出現的偶發同一類，沒有為它改程式。
- **回退**：這一批只動了量測工具與文件；revert 各 commit 即可。`perf:lit-cost` 的新做法靠成員名稱修補 `LightingPass`、`GroundDrapeLayer`（`blitPlane`、`drawPlaneOnTile`、`drawOnTile`、`planes`、`entries`），改名會直接失敗。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| 開案書 §8「同一份程式重跑兩次的差當雜訊，改動的效果要超過它才算」 | 主席照做才發現第一頁偏差（`full_again`），把 `texSubImage2D` 的 −0.84 ms 判成偏差而不是收進正式路徑 | helped |
| 開案書 §8「做不到 2 ms 也要交出量到的最好結果與原因」 | 主席沒有為了達標去做會動畫面的近似（鋪設不跟逐格高度），停在精確等價的做法都試完 | helped |

### DU. 2026-11-28 打光成本第三批 Q1～Q4：仿光效零件改成光（ADR 0031；開案書 `docs/plans/lighting-cost.md` §9；主席 Opus 5.5，分支 `perf/lighting-cost-2`；使用者 11-28「仿光效特效全面改光效通道」「現代化」，同日「新製程需求和舊 ADR 衝突時主代理直接決定」）
- **結論**：打光開啟時，柔邊、加法的 `glow` 零件改登記成點光（不帶投影）、只畫縮小核心；打光關閉時畫面與保真數字和 main 相同。桌機量測場景每幀只有 3～9 個柔邊 glow，光暈改成光的開關差在雜訊內，打光的額外成本 3.07～3.21 ms（第二批 3.06～3.29），沒有變大也沒有變小。外觀只調一次初值（範圍 2.5 → 6、強度 3 → 12），定調待原工作階段看對照板（`tools/ui-e2e/out/c2-boards/`，`INDEX.md` 列每一格）。
- **Q1**（Sonnet 子代理實作，主席審 diff）：首屏 5 個元件改成直接 import 單一 primitives 檔，進入點 gzip 257,365 → 253,581 位元組（`npm run build`），`e2e:ui` 全過（commit `210b501f`）。
- **Q2 機制**（commit `ebbd545c`）：
  - kept -> 「哪些零件是仿光效」只在 `PartSpec.partLight`；「貼圖還是光」只在 `drawPart`，依畫布角色（`PartLightSink.roleOf`）：世界畫布登記成光、特效與玩法標示遮罩照同一個 op 世界那一趟的盞數一一對應、其他畫布照舊 -> 單元測試 `tests/PartLight.test.ts` 7 項；`perf:lit-cost` 與 `perf:vfx-strip` 讀 `LightingPass.partStats`，遮罩對不上的 op 數在量測場景與 50 招奧義都是 0。
  - kept -> 登記口 `engine/renderers/lighting/PartLightSink.ts` 在進入點、不讀 `LIGHTING`（核心縮放由 sink 回傳）-> 進入點 253,581 → 253,999 位元組，預算 257,500。
  - kept -> 上限 `PART_LIGHT.MAX` 64 和單位的 `MAX_LIGHTS` 分開算 -> 單位的光不會被擠掉。
  - kept -> `PART_LIGHT.MAX` 0 等於改前 -> 暫設 0 跑 `npm run perf:lit -- --walk 60`，和改前分支 `lit-branch-walk/` 比：靜止 0～1 px、連續格 2 px；對照板的「改前」用這個設定。
- **Q3 對照板**（commit `96d9a9c6`）：`perf:vfx-strip` 加 `--lit`、`--lighting`、`--out`。7 招（F3 點名的 `sb_a1`、`rb_u1`、`wb_a1`；50 招奧義掃過後零件光最多的 `rr_u3` 每幀 30.5、`mb_u2` 18.2、`mr_u5` 9.1；投射物 `mb_a1`）× 4 版本（改前、只有光、光＋核心、草擬值光＋核心）。F3 那三招每幀最多只有 1 個柔邊 glow：它們的同心圓環與白閃是 ring、rays、硬光暈，不在這次範圍。只有 `rr_u3` 撞上限（29 幀）；命中後相鄰幀平均差 9.56 → 9.70～9.73，和沒撞上限的 `mb_u2`（5.32 → 5.18～5.50）同量級，看不出上限造成的閃爍。
- **Q4**：ADR 0031（狀態：採用；修訂 0029「特效一律走預烘焙零件」在打光開啟時的做法，0029 其他各條不變，不標取代），`docs/DECISIONS.md` 加索引，開案書 §4.3 增補。
- **驗證**：lint、`npm test` 1711 項、build（進入點 254.0／257.5 kB）、knip、`runtime-smoke` PASS；`perf:guard` 保真 VOID 0.296、FOREST 0.659、ICE 0.302、MAGMA 0.614、DESERT 0.500、battle_frozen 0.177（和 main 相同），效能護欄過；`perf:lit -- --walk 60` 和改前比 VOID 1.082%、battle_frozen 0.328%、連續格 2.522%，其餘四張 0（差異是光，看過 VOID 那一塊：單位旁地面多一塊藍光）；`e2e:ui` 一次 1 項紅（PLAY iPhone 直向 K4「點己方身後地面送出移動指令」，送出的格差一格），和 DT 的 P5 兩組都出現的偶發同一類，沒有為它改程式。
- **沒驗的**：手機（iPhone）的成本與外觀；光暈多的奧義單獨量時間；context 遺失或 render target 建不起來那一幀（已登記成光的零件那一幀只剩核心）。
- **既有耦合（回報，沒處理）**：hex 色碼解析有三份：`data/ui/tokens.ts` 的 `hexToRgbChannels`（這次用它）、`TerrainLoopAtlas.parseHex`、`PartBakers.withAlpha`。
- **回退**：revert `96d9a9c6`、`ebbd545c`；只想關掉不 revert 時把 `LIGHTING.PART_LIGHT.MAX` 設 0（等於改前）。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| 派工單 §9「外觀由原工作階段看圖決定，線主席調一次初值就停」 | 主席看到草擬值幾乎沒有受光後只調一次（6／12），保留草擬值那一列在對照板上，沒有反覆調 | helped |

### DV. 2026-11-28 幾何遮罩改由 WebGL 畫（C5 第一片；ADR 0032；開案書 `docs/plans/gpu-geo-mask.md`；主席 Opus 5.5，分支 `feat/gpu-geo-mask`；使用者 11-28「現代化」「精靈由顯示卡畫」，同日「舊的管線真的沒用了可以拔掉，不需要併行」）
- **結論**：打光開啟時，幾何遮罩（單位剪影、障礙物）不再用 Canvas 2D 暫存畫布蓋漸層章、整張上傳，改由 GL 一趟 instanced quad 畫進遮罩貼圖；舊路徑與比對用的旗標已刪。同一幀新舊幾何遮罩內部 alpha、g 0 差，r／b 最多 2（FOREST、ICE、MAGMA）；最終畫面差超過 8 的像素在單位與障礙物邊緣。成本在雜訊內（新舊同一次執行 −0.25 ms，雜訊 0.66）：這一片是之後法線圖、特效遮罩、世界本體走同一條 instance 路的地基，不是省時間的那一步。
- **機制**（commit `fe44cf45`）：
  - kept -> `engine/renderers/SpriteCapture.ts`：painter 貼精靈的唯一出口（`SpriteUnitRenderer`、`PolymorphPainter` 的剪影分支、`RenderDispatcher` 的 OBSTACLE 本體與加法疊層）；擷取畫布（1×1、不點陣化）上只記來源圖、來源矩形、目的矩形、變換、不透明度、混合 -> 單位剪影的影格、mip、目的矩形、傾斜、翻滾、淡入淡出全部只在 painter 裡，打光目錄不重算；`tests/SpriteCapture.test.ts` 3 項。
  - kept -> `engine/renderers/lighting/GeoMaskGpu.ts`：每張擷取到的貼圖一個 instance（五個 vec4），同一張圖的連續 instance 一次 `drawArraysInstanced`，順序＝繪製順序、一律預乘 source-over；章的 r、g、b 在片段著色器解析計算（`shaders.ts` `GEO_VERT`／`GEO_FRAG`）-> 量測場景每幀 28 個 instance、26 次繪製。
  - kept -> 圖集第一次用到時上傳成 `gl.ALPHA` 貼圖 -> 量測場景 22 張 13,498,780 位元組；RGBA 是 53,995,120，比對結果相同。
  - kept -> `perf:lit`（`lit-shots.mjs`）加 `--query`、`--out`（兩種設定各拍一組逐像素比）。
  - 修正（commit `20536300`）-> 障礙物加法疊層原本用 `ONE, ONE` -> 比對在 ICE（7 個疊層）、MAGMA（16 個）量到障礙物內部 r／b 差到 113（章的顏色加到超過覆蓋率；FOREST 那一幀沒有疊層，第一輪沒抓到）；改成 source-over 後內部 ≤2。`SpriteCapture` 不再記混合模式。
- **比對**（探針 `tools/ui-e2e/out/geo-compare.mjs`、`geo-pixdiff.py`，不進版控；完整表在開案書 §6）：
  - 同一幀兩條路的幾何遮罩（`readPixels` 讀著色器實際取樣的貼圖，2560×1440）：FOREST 3 幀內部 alpha、g 0 差、r／b ≤2，alpha 差 >2 的 561～635 px（直立物約 11.7 萬 px），0～2 個單位帶旋轉；ICE 3 幀（33 個 instance，含 7 個疊層）221～310 px；MAGMA（42 個，含 16 個疊層）491 px（直立物 2.1 萬），內部同樣 0／0／≤2；差異在邊緣與疊層光暈那一圈（看過 FOREST、MAGMA 的差異圖）。
  - 旗標關和 main 的 `perf:lit`：打光 6 張 0 px、連續格 10 px（差 1）。旗標開和關：1.1～4.0% 像素有差，差 >8 的 69～635 px，在單位與障礙物邊緣（兩個單位重疊的邊也算）；差 1 的約 3.4 萬 px 是泛光把邊緣差異抹開。
- **刪舊路徑**（commit `77f31973`）：`beginItem`／`endItem`／`flushItems`、`makeStamp`、暫存畫布與幾何遮罩畫布、它們的上傳、`GEO.STAMP_SIZE`、`?geogpu` 旗標、`lit-cost` 的 `item_no_stamp`／`item_no_cell`／`geo_gpu`。遮罩貼圖建不起來時整個通道停用（同 render target）。
- **驗證**（HEAD）：lint、`npm test` 1714 項、build（進入點 254.4／257.5 kB）、knip、`runtime-smoke` PASS；`perf:lit -- --walk 60` 刪舊路徑後和刪前的 GL 路徑 0～1 px，`lit=0` 和 main 0～2 px，疊層修正後和舊路徑差 >8 的 69～635 px 在邊緣；`perf:guard` 保真 VOID 0.207、FOREST 0.695、ICE 0.359、MAGMA 0.668、DESERT 0.529、battle_frozen 0.000，效能護欄過。**保真數字和以前記的 0.296／0.659／0.302／0.614／0.500／0.177 不同，但同一天 main 跑出完全相同的六個數字**（`fe44cf45` 也相同，battle_frozen 擷取圖 main 與分支 0 px 差）：是環境漂移，原因沒查；以後比 main 要同一天各跑一次。`e2e:ui` 第一次 3 項紅（PLAY 桌機 K3 左鍵拖曳、iPhone 橫向 K4 拖放技能鈕、iPhone 橫向瞄準時點敵人），重跑一次全過。
- **量測**（`node tools/ui-e2e/lit-cost.mjs --repeat 2`，RTX 4070、2560×1440）：新舊同一次 full 9.915、geo_gpu 9.665（−0.25，雜訊 0.656）、direct 6.544、full_again 9.965 ms；刪舊路徑後單獨一次 full − direct 3.30 ms（不和前一次比）。
- **沒驗的**：iPhone／WebKit（`gl.ALPHA` 從畫布上傳、instanced 繪製）；第一次用到圖集那一幀的上傳卡頓（量測都有暖身）；手機顯示卡記憶體多一份 alpha 圖集；變羊、暈眩的單位沒有特地放進比對的幀（擷取走的是同一個 painter，旋轉的單位有 0～2 個）；context 遺失與還原。
- **既有的（回報，沒改）**：幾何遮罩的單位腳底用 `UnitFrame.footX／floorY`（不含轉場位移、不經 `snap`），世界畫布上的單位畫在 `snap(op.ty)`，差次像素、轉場中差一個轉場位移；GL 路徑照舊沿用。障礙物加法疊層蓋在別的直立物上時，舊路徑是先加進自己那一格再 source-over，GL 直接加在遮罩上（只在疊層的半透明光暈範圍）。
- **回退**：依序 revert 文件 commit、`20536300`、`77f31973`（回到兩條路並存，`?geogpu=1`）、`fe44cf45`（回到 main）。

| 合約改動 | 實際造成的行為差異（在哪看到） | 判定 |
| :-- | :-- | :-- |
| 派工單「單位剪影的來源矩形要有單一出處的查詢介面，不要在打光目錄裡重算」 | 主席沒有在打光目錄算影格與變換，改成讓 painter 經 `SpriteCapture` 交出貼圖參數；旋轉、翻滾、淡出的單位不用另寫一份就對得上（比對內部 0 差） | helped |
| 派工單「新舊兩條路輸出的幾何遮罩要能比對」＋顧問「比著色器實際取樣的貼圖」 | 探針同一幀兩條路都畫、用 `readPixels` 讀兩張貼圖，不經 `getImageData` 的解預乘；邊緣與內部分開數 | helped |
