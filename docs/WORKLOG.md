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
- **障礙物素材**：已下載 CC0 的 KayKit Forest Nature／Dungeon Remastered／Medieval Hexagon 與 Kenney Nature Kit 到 `_asset_stagingssets3d\`（`docs/ASSET_LEDGER.md` §6），O1 Blender 管線尚未開始。
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

- 近戰攻擊與受擊特效（Gemini MF，主代理審查修正後合併 3c9d06f）：見 docs/VFX_PIPELINE_MAP.md §4.22、報告 docs/MELEE_FX_REPORT.md。18 招近戰普攻補齊目標處揮擊（FX_SWING_* 刀弧／下壓重擊／尖端閃光，取代 8 招空序列與直線光束 SLASH_CONNECT），7 招近戰主動技新增專屬命中包（data/vfx/registry/melee_parts.ts），	ests/MeleeFxSpec.test.ts M1～M4 違規 32 → 0。審查修正（3dbd265）：revised → 還原 SkillSequences.ts 主動技區段並將 7 招專屬特效掛回 ACTIVE_VISUALS[id].impactFx（依據：SkillExecutor.ts:234 的 ownHit 規則使無投射物主動技在 HIT_FX 只播陣營預設小打擊、不播 isualHitEffect；MF4 誤以為會疊兩次而全域去重，導致 7 招新特效實機完全沒播、另有 24 招主動技主特效消失，也是 attle_frozen 0.50% FAIL 的根因）；revised → MeleeFxSpec M3 加驗實機可達、M4 改比對 HIT_FX 實際播放特效、補無投射物主動技 impactFx 回歸測試；revised → sr_a3 治療圖騰紋章與液滴改 ASH_POISON。驗證：685 項測試、保真 6/6 PASS（attle_frozen 回到 0.305／0.32%，不需重錄）、perf 護欄、smoke、重拍 melee_after.png。
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

| 合約改動 | 實際造成的行為差異 | 判定 |
| :-- | :-- | :-- |
| `art-round` skill、驗證四級 | 尚未有一輪用過；下一個美術輪（羊重做，HANDOFF F）再判定 | no effect（待觀察） |
