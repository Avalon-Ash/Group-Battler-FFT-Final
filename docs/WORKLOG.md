# 工作紀錄（已完成的輪次）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。只記「做了什麼、證據在哪」，平常不用讀；要查某個系統的來龍去脈時再搜尋。
> 新完成的輪次往最後加一節（日期＋一句話結論＋commit／報告位置），HANDOFF 裡對應的 TBD 同時刪掉。

## 1. Git 歷程備忘
- **單一主線**：`C:\Git\Group-Battler-FFT-Final`，分支 `main`。主代理與 IDE 代理都在這個資料夾工作。若 `git worktree list` 還看得到 `Group-Battler-main`／`-death-vfx`／`-chore`，代表搬遷步驟尚未做完。
- `main` 已含：大逃殺修正、死亡特效／擊飛、AI Studio 清理、文件整理、合約改版（`CLAUDE.md`／`AGENTS.md`／`.claude/agents/`）、README 更新。push 狀態以 `git status -sb` 為準。
- **美術／特效改造已合併（2026-10-16）**：進度、決策在 `docs/ART_VFX_PLAN.md`，規格在 `docs/ART_SPEC.md`（§0 世界觀、§13 詠唱／中斷）。全部 50 個奧義已改六角零件版；光束本體仍是程式繪製（待新增 beam 零件）。HD 為主線，SD 原型已移除（tag `pixel-proto-ckpt`）。目前沒有進行中的分支。

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

## 3. 更早的輪次與審查修補

- **效能四（2026-10-12 合併）**：`?perf` HUD、`perf:frames`／`perf:attribution`、去 `shadowBlur`、`VFX_BUDGET`。我調過品質治理器門檻（`RENDER_QUALITY.DOWN_MS` 14／`UP_MS` 9）。當時列的殘留熱點（`TextPainter`、`ProjectileDrawer`、`ProceduralPainter` 等）已在 2026-10-19 全部清除或零件化（§3 K）。
- **美術（合併）**：KayKit 預渲染精靈 10 張（`public/assets/units`，manifest 在同目錄）＋地形貼圖 10 張＋粒子貼圖 5 張；體型軸 `Team×Role×BodyType`（MALE 有素材）。
- **AI Studio 的「美術修正輪」（`8c014d1`）— 我審查後修補的重點**：
  1. **畫面凍結**：`useGameApp` 在 React StrictMode 清理時立刻 `engine.destroy()` 並重用 → 引擎永遠停止。已改為**延後一個 tick 銷毀、重新掛載則取消**。
  2. **誤刪必要檔案**：它把 `ImperialTokenFactory`／`CovenantTokenFactory`（仍負責單位腳下底座與職業圖示）當舊管線刪掉，底座變成實心圓。已從 `b4b0b20` 復原（連同 `MaterialPainter`、`imperial.ts`／`covenant.ts`／`types.ts`／`index.ts`、`materialConfig.ts`、`UnitFactory.ts`）。
  3. **地形烘焙卡頓**（熔岩地圖個位數 FPS 的主因）：快取鍵含浮動相位×縮放級距，容量滿時**整個清空**造成重烘焙風暴。已加「每時間窗烘焙預算＋借用相鄰縮放級距 sprite」與「只丟舊縮放級距」（`RENDER_CACHE.BAKE_BUDGET_MS`／`BAKE_WINDOW_MS`、`TerrainBlockCache.ts`）。**使用者仍需在熔岩圖實測**；若仍卡，開 `?perf` 重現後在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`（尖峰記錄器已內建，含各階段耗時與 `terrainCache` hits／misses／evictions）。
  4. **BGM 疊音**：AI Studio 的共享引擎＋擁有者計數＋請求序號修法**使用者已確認修好**。
  5. 其他：角色大小 `UNIT_SPRITE.targetHeightCanvasUnits=59`（護盾稜柱為上限，測試遍歷全部影格）；護盾高度現在**自動貼合角色頭頂**（`SHIELD_VISUAL.headMargin`、`computeShieldGeometry`，飛行單位跟隨 body center）；`battle_frozen` 基準因單位變大已重錄一次（5 個地形基準仍 0 差異）。
