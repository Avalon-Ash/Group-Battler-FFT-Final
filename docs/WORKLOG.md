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

## 3. 更早的輪次與審查修補

- **效能四（2026-10-12 合併）**：`?perf` HUD、`perf:frames`／`perf:attribution`、去 `shadowBlur`、`VFX_BUDGET`。我調過品質治理器門檻（`RENDER_QUALITY.DOWN_MS` 14／`UP_MS` 9）。當時列的殘留熱點（`TextPainter`、`ProjectileDrawer`、`ProceduralPainter` 等）已在 2026-10-19 全部清除或零件化（§3 K）。
- **美術（合併）**：KayKit 預渲染精靈 10 張（`public/assets/units`，manifest 在同目錄）＋地形貼圖 10 張＋粒子貼圖 5 張；體型軸 `Team×Role×BodyType`（MALE 有素材）。
- **AI Studio 的「美術修正輪」（`8c014d1`）— 我審查後修補的重點**：
  1. **畫面凍結**：`useGameApp` 在 React StrictMode 清理時立刻 `engine.destroy()` 並重用 → 引擎永遠停止。已改為**延後一個 tick 銷毀、重新掛載則取消**。
  2. **誤刪必要檔案**：它把 `ImperialTokenFactory`／`CovenantTokenFactory`（仍負責單位腳下底座與職業圖示）當舊管線刪掉，底座變成實心圓。已從 `b4b0b20` 復原（連同 `MaterialPainter`、`imperial.ts`／`covenant.ts`／`types.ts`／`index.ts`、`materialConfig.ts`、`UnitFactory.ts`）。
  3. **地形烘焙卡頓**（熔岩地圖個位數 FPS 的主因）：快取鍵含浮動相位×縮放級距，容量滿時**整個清空**造成重烘焙風暴。已加「每時間窗烘焙預算＋借用相鄰縮放級距 sprite」與「只丟舊縮放級距」（`RENDER_CACHE.BAKE_BUDGET_MS`／`BAKE_WINDOW_MS`、`TerrainBlockCache.ts`）。**使用者仍需在熔岩圖實測**；若仍卡，開 `?perf` 重現後在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`（尖峰記錄器已內建，含各階段耗時與 `terrainCache` hits／misses／evictions）。
  4. **BGM 疊音**：AI Studio 的共享引擎＋擁有者計數＋請求序號修法**使用者已確認修好**。
  5. 其他：角色大小 `UNIT_SPRITE.targetHeightCanvasUnits=59`（護盾稜柱為上限，測試遍歷全部影格）；護盾高度現在**自動貼合角色頭頂**（`SHIELD_VISUAL.headMargin`、`computeShieldGeometry`，飛行單位跟隨 body center）；`battle_frozen` 基準因單位變大已重錄一次（5 個地形基準仍 0 差異）。
