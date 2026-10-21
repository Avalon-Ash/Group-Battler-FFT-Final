# 特效管線地圖（P0）與覆蓋率矩陣（P1）

> **現況（2026-10-20）**：§1～§3 是 2026-10-18 遷移前的快照，保留作歷史。現在所有特效都走零件：粒子後端只看 `constants/vfx.ts` 的 `PARTICLE_TRAITS`——`PART`／`PART_GROUND`／`PART_DEBRIS`（含天氣）→ `PartPainter`＋`VFXPartStore`；`BEAM` → `PartPainter.drawBeam`；其餘 → 洋紅除錯點（`ParticleRenderer.drawDebugDot`）。投射物 → `ProjectilePartPainter`（`data/vfx/projectile_visuals.ts`）；危害、詠唱環、護盾、AOE 預警 → 零件層（`PartLayerPainter`）。`ProceduralPainter`、`GroundPainter`、看板繪製器、`ProjectileDrawer` 都已刪除。特效系統在 `engine/presentation/vfx/`、`engine/presentation/visuals/`（S2 搬家）。每一輪的變更見 §4。

> 2026-10-18。目的：遷移前先看清「事件 → 資料表 → 播放 → 粒子 → 繪製後端」每一條路，避免像座標問題那樣盲改。
> 靜態矩陣來自直接載入登記表／技能序列（無執行期）；執行期矩陣來自 `node tools/vfx/vfx-coverage.mjs`（不改引擎，在頁面內包住繪製器計數）。
> 「新材質」＝預烘焙六角零件（`PART`／`PART_GROUND`／`PART_DEBRIS`，`PartPainter`＋`VFXPartStore`）；其餘都是舊路線。

## 1. 管線拓樸

```
遊戲事件（engine.events / bus）
 ├─ CAST_START ─► VisualSystem ─► SKILL_SEQUENCES[skill.id] ─► SequenceSystem.dispatch
 │     （VISUAL_SLASH／VISUAL_BEAM 另經 CinematicVFXHandler 也跑同一序列）
 │       PARTICLE   → VFXSystem.playEffect(id)          （VFX_REGISTRY）
 │       BEAM       → VFXSystem.playBeam(style)          （BEAM_STYLES → BEAM／DEATH_RAY 粒子）
 │       GRID_PULSE → playEffect(FX_GRID_IMPACT_BLUE|RED) （依 action.color 是否含 '#3b' 選色）
 │       HEAVEN_FALL→ 直接 getParticle() 生 ROCK／GIANT_HEX （不經登記表）
 ├─ 命中 SkillExecutor.resolveHit → playEffect(skill.visualHitEffect || 陣營預設)
 ├─ EventVFXMapper → handlers
 │     CombatVFXHandler：護盾火花、吸血、回魔、治療、自傷、燒魔、DOT → FX_STATUS_BURN_LOOP
 │     UnitVFXHandler  ：出場 FX_SPAWN_*、詠唱中斷 FX_CAST_BREAK＋陣營碎裂、AOE 中斷
 │     CinematicVFXHandler：無序列時的 SLASH_CONNECT／GENERIC_BEAM 後備光束
 │     HAZARD_SPAWN    ：HAZARD_VISUALS[type].spawnVfx 或 FX_HAZARD_FIELD_*
 │     GROUND_IMPACT LOCKED → FX_LAST_STAND_LOCKED
 ├─ AgentVFXSystem（每幀）：待機 FX_IDLE_*、擊退塵 FX_STATUS_ROOT_LOOP
 ├─ ProjectileSystem → PROJECTILE_VISUALS → ProjectileRenderer → ProjectileDrawer（直接繪製）
 ├─ AGENT_DIED → UnitShatter.spawn → FX_HIT_GENERIC＋碎片粒子
 └─ VFXAmbience（天氣 ATMOSPHERE 粒子）

VFXSystem.state.particles
 └─ VFXRenderer.submitRenderables（engine/presentation/vfx/render.ts）
      ├─ 大型貼地 → GroundDrapeLayer（逐格頂面）
      └─ RenderOp VFX → ParticleRenderer.drawSingleParticle 依 p.type 分派：
           PART*           → PartPainter         ← 新材質
           PROCEDURAL_SET  → ProceduralPainter   （PILLAR HEX_BEAM GIANT_HEX DOMAIN DEATH_RAY BEAM MAGIC_CIRCLE BLACK_HOLE）
           GROUND_PLANE_SET→ GroundPainter       （SHOCKWAVE RING BLAST CRACKS GRID_FIELD HEX_GLOW）
           其餘            → BillboardPainter    （SPARK SMOKE GLOW SHARD ROCK ATMOSPHERE…）

不經粒子的直接繪製（各自讀 Agent／狀態）：
  單位：UnitAuraPainter（詠唱環，懸空平面）、UnitCorePainter、UnitAfterimagePainter、UnitDeathPainter、
        UnitAmbientPainter、UnitShadowPainter、UnitIndicatorPainter、UnitFlightPainter、PedestalGhostPainter
  狀態：StatusOrchestrator → StatusPartPainter（新零件，STATUS_PARTS）＋ ShieldPainter（舊）
  地格：GridOverlays（預警／射程）、HazardPainter（HAZARD_VISUALS）、ZoneRenderer（縮圈）
  文字：TextPainter（SHOUT／傷害數字）
```

## 2. 已確認的結構問題（讀碼，未經執行期）
1. **繪製後端由 `p.type` 字串決定，不是由資產宣告**：`ParticleRenderer`、`VFXPlayer`（`FIXED_ORIENTATION_PARTICLES`、`PROCEDURAL_TYPES`）、`render.ts`（`VFX_GROUND_TYPES`）各有一份型別清單，彼此不一致也沒有測試對照。
2. **`SkillDef.visualCastEffect`／`visualAoeEffect` 只有 `VFXValidator` 在檢查，引擎沒有任何地方播放**——欄位是死的（目前資料也沒填）。
3. ~~**`GRID_PULSE` 用 `action.color?.includes('#3b')` 判斷藍紅**~~：已修，改依施法者陣營（`SequenceSystem.teamOf`）。
4. **序列可能被跑兩次**：`VisualSystem` 在 `CAST_START` 跑一次，`CinematicVFXHandler` 在 `VISUAL_SLASH／VISUAL_BEAM` 又查同一張 `SKILL_SEQUENCES`（待執行期確認是否同一技能兩條都觸發）。
5. **`HEAVEN_FALL` 不經登記表**，直接生 `ROCK`／`GIANT_HEX` 粒子，零件化時會漏。
6. **死登記鍵**（程式與資料皆無引用）：`FX_CASTING_ULT`、`FX_CASTING_ACTIVE`、`FX_MASSIVE_IMPACT`、`FX_HIT_FIRE`、`FX_STATUS_{REGEN,BANISH,FEAR,VULNERABLE}_LOOP`；`FX_STATUS_{STUN,SILENCE,POISON}_LOOP` 只剩 inspector 的 `VFX_LIBRARY` 引用。
7. `FX_STATUS_ROOT_LOOP` 被拿來當「擊退塵」，名稱與用途不符。

## 3. 靜態覆蓋矩陣（登記表 119 鍵、技能 150 個）

| 類別 | 數量 | 說明 |
| :-- | --: | :-- |
| 全零件資產 | 84 | 奧義 50、主動、普攻命中、詠唱中斷碎裂 |
| 混用資產 | 0 | 沒有半零件半舊粒子的資產 |
| 舊粒子資產 | 35 | 見下 |

舊粒子資產（括號內是舊粒子類型）：
- **共用戰鬥**：`FX_HIT_GENERIC`（SHOCKWAVE／RUBBLE／GLOW）、`FX_HIT_SHIELD_SPARK`、`FX_HEAL_BURST`、`FX_VAMP_BURST`、`FX_MANA_BURN`、`FX_MANA_RESTORE`、`FX_SELF_DAMAGE`、`FX_MUZZLE_FLASH`、`FX_CAST_BREAK`（共用碎片那層）
- **格子脈衝**：`FX_GRID_IMPACT_BLUE／RED`（GRID_FIELD）
- **單位生命週期**：`FX_SPAWN_BLUE／RED`（HEX_GLOW／MAGIC_CIRCLE／PILLAR）、`FX_IDLE_BLUE／RED`（SPARK）、`FX_TELEPORT`
- **狀態迴圈**：`FX_STATUS_*_LOOP` 9 個
- **危害／終局**：`FX_HAZARD_FIELD_*` 5 個（GRID_FIELD）、`FX_LAST_STAND_LOCKED`
- **死鍵**：見 §2.6

技能層（序列＋命中＋投射物）：

| 層 | 普攻 50 | 主動 50 | 奧義 50 |
| :-- | --: | --: | --: |
| 序列含舊資產 | 0 | 29 | 38 |
| 　其中只因 `GRID_PULSE` | 0 | 26（另 3：tb_a3／mb_a5 直接放 `FX_GRID_IMPACT_BLUE`，mb_a3 `FX_TELEPORT`） | 38 |
| 命中特效為舊資產 | 0 | 2（`FX_GRID_IMPACT_BLUE`、`FX_TELEPORT`） | 0 |
| 用程式光束（`ProceduralPainter`） | 20 | 7 | 5 |
| 投射物（`ProjectileDrawer`，全 SPRITE） | 23 | 11 | 1 |
| `HEAVEN_FALL` 直接生粒子 | 0 | 0 | 9 |

光束樣式：`SLASH_CONNECT` 13、`GENERIC_BEAM` 7、`DEATH_RAY` 5、`LIGHTNING_BEAM` 3、`HOLY_RAY` 3、`BLOOD_LINK` 3（全部程式繪製）。

## 4. 執行期覆蓋矩陣
`node tools/vfx/vfx-coverage.mjs --skills=all --battleSec=90`，再 `node tools/vfx/vfx-coverage-report.mjs`（完整表在 `tools/ui-e2e/out/vfx/coverage.md`）。
每個粒子帶來源標記（`fx:<鍵>`／`beam:<樣式>`／`direct`＝不經登記表），依實際分派到的後端計數；出場、待機、天氣視為背景不計。

### 4.1 技能（每個技能單獨施放一次）

| 類別 | 技能 | 只用零件 | 含舊後端 | 執行期沒抓到技能粒子 |
| :-- | --: | --: | --: | --: |
| 普攻 | 50 | 0 | 38 | 12 |
| 主動 | 50 | 3 | 46 | 1 |
| 奧義 | 50 | 4 | 46 | 0 |

「沒抓到」的 13 個（`tb_b1～b4`、`wb_b4`、`sb_b2`、`tr_b3`、`tr_b4`、`wr_b4`、`rr_b2`、`mr_b3`、`sr_b2`、`rr_a2`）是單獨施放時沒有觸發命中，屬於探針的限制；靜態表顯示它們的命中特效都是零件。

舊後端來源（依涉及的技能數排序）：

| 來源 | 舊後端 | 技能數 | 性質 |
| :-- | :-- | --: | :-- |
| `FX_GRID_IMPACT_RED` | GROUND:GRID_FIELD | 60 | 共用格子脈衝；**其中 29 個是藍方技能**（§2.3 的選色 bug，實測證實） |
| `FX_MUZZLE_FLASH` | BILL:SPARK/GLOW | 31 | 每次投射物出手的槍口閃光 |
| `FX_STATUS_BURN_LOOP` | BILL:SPARK/SMOKE | 23 | DOT 每跳都播；**燒傷已有 StatusPartPainter 零件，重複繪製**；毒系 DOT 也播成火花 |
| `FX_HEAL_BURST` | BILL:SPARK/GLOW | 16 | 治療 |
| 程式光束 | PROC:BEAM | 32 | SLASH_CONNECT 11、GENERIC_BEAM 7、DEATH_RAY 5、LIGHTNING 3、HOLY_RAY 3、BLOOD_LINK 3 |
| `FX_GRID_IMPACT_BLUE` | GROUND:GRID_FIELD | 9 | 同上（藍方選對色的那些） |
| `direct` ROCK | BILL:ROCK | 9 | 奧義 `HEAVEN_FALL`（§2.5） |
| `FX_VAMP_BURST` | BILL | 2 | 吸血 |
| `FX_TELEPORT` | PROC:PILLAR、BILL:SPIKE | 1 | mb_a3 |

**估算**：只要把 6 個共用舊資產（GRID_IMPACT 藍紅、MUZZLE_FLASH、BURN_LOOP、HEAL_BURST、VAMP_BURST、TELEPORT）換成零件，只用零件的技能會從 7 個升到約 95 個；剩下的是 32 個光束技能（要新增光束零件）和 9 個 HEAVEN_FALL 奧義。

### 4.2 實戰（預設對戰）額外出現的舊來源
- `FX_HIT_GENERIC`（RUBBLE／GLOW／SHOCKWAVE）：死亡碎裂 `UnitShatter`，另有不經登記表的碎片（`direct` SHARD 90、SPARK 70、SMOKE_PUFF 28）。
- `FX_HIT_SHIELD_SPARK`（HEX_SHARD／RIPPLE）：護盾吸收。
- `FX_CAST_BREAK` 共用層（SHARD／SMOKE_PUFF）：與零件版 `FX_CAST_BREAK_RED/BLUE` 同時播。
- `FX_MANA_BURN`（SHOCKWAVE）。
- 出場 `FX_SPAWN_*`：ProceduralPainter 的 `drawTechMandala`／`drawHexPillar`（每次布陣都會播）。

### 4.3 不經粒子的直接繪製器（實戰中有被呼叫）
投射物 `ProjectileDrawer`（全部）、光束 `ProceduralPainter.drawBeam`、詠唱環 `UnitAuraPainter`、飛行緞帶 `UnitFlightPainter.drawRibbonTrail`、陣營氛圍 `UnitAmbientPainter.drawImperialAmbient／drawKhorneAmbient`、護盾 `ShieldPainter`、死亡 `UnitDeathPainter`、危害 `HazardPainter`、地格預警 `GridOverlays`、縮圈 `ZoneRenderer`、地面指示 `UnitIndicatorPainter`＋`VolumePainter.drawVolumetricHex`。
這些不屬於「零件化」範圍內的粒子，但都是遷移時要逐一決定「留程式繪製／改零件／改烘焙」的項目。

### 4.4 步驟 1～2 之後（2026-10-18）
| 類別 | 技能 | 只用零件 | 含舊後端 | 沒抓到 |
| :-- | --: | --: | --: | --: |
| 普攻 | 50 | 18 | 20 | 12 |
| 主動 | 50 | 41 | 8 | 1 |
| 奧義 | 50 | 36 | 14 | 0 |

只用零件：7 → **95**。剩下的舊來源只有程式光束（32 技能）、`HEAVEN_FALL` 的 ROCK（9）、`FX_MANA_BURN`（1）；藍方播紅色脈衝 29 → 0，DOT 舊燒傷迴圈 23 → 0。
新零件資產在 `data/vfx/registry/shared_parts.ts`；出手閃光拆成 `FX_MUZZLE_FLASH_BLUE／RED`（零件不吃 colorOverride，由 `EventVFXMapper` 依施法者陣營選）。
單一特效前後對照：`node tools/vfx/fx-shot.mjs --keys=<鍵> --body=<身體高度的鍵>`。
已知：治療的綠色在冰面上偏青（疊加混合）；battle_frozen 保真差異 0.03% → 0.40%（門檻 0.5%，未重錄）。

### 4.5 步驟 3（光束零件）之後
| 類別 | 技能 | 只用零件 | 含舊後端 | 沒抓到 |
| :-- | --: | --: | --: | --: |
| 普攻 | 50 | 38 | 0 | 12 |
| 主動 | 50 | 48 | 1 | 1 |
| 奧義 | 50 | 41 | 9 | 0 |

只用零件：95 → **127**。剩下：`HEAVEN_FALL` 的 ROCK（9 奧義）、`FX_MANA_BURN`（sr_a4）。
- 新零件 kind `beam`（`PartSpec`／`PartBakers.bakeBeam`／`VFX_PARTS.BEAM`）：一段 64 單位、可首尾無縫平鋪的光管磚；邊緣 `clean`／`dashed`（死光）／`zigzag`（閃電，4 影格）／`beads`（血鏈），樣式表 `BEAM_STYLES.edge`、陣營色階 `FACTION_BEAM_RAMP_ID`（閃電藍方覆寫為 `LION_LIGHTNING`）。
- `VFXSystem.playBeam` 有陣營時掛零件；`ParticleRenderer` 把掛零件的 `BEAM` 交給 `PartPainter.drawBeam`（沿起點→終點平鋪、尖頭裁切、往終點捲動）。粒子型別仍是 `BEAM`，排序與漂浮位移規則（RenderSpec §2、§5）不變；沒有陣營的後備光束沿用 `ProceduralPainter.drawBeam`。
- 對照：`node tools/vfx/fx-shot.mjs --keys=BEAM:DEATH_RAY:RED,...`。光束端點量測（`beam-align-shot`）FOREST／VOID 皆 0 px；verify:coords 振盪 39 對、靜止 0、sink 0；battle_frozen 0.43%（門檻 0.5%，未重錄）。

### 4.6 步驟 4（隕石、燒魔）之後
技能層全部零件化：抓得到粒子的 137 個技能都只用零件（普攻 38／主動 49／奧義 50；另 13 個單獨施放沒觸發命中，靜態表顯示命中特效為零件）。
- `HEAVEN_FALL`（METEOR）：`SequenceSystem` 依施法者陣營生成兩顆同步自由落體的 `PART_DEBRIS`（岩塊 shard＋光暈），色階與尺寸在 `shared_parts.ts` 的 `METEOR_PARTS`／`METEOR_SIZE`；沒有陣營時沿用舊 ROCK。已知：零件路徑沒有舊看板的落點影子。
- `FX_MANA_BURN`：虛紫閃光＋六道光芒＋火星（`ASH_VOID`）。
- 對照：`node tools/vfx/fx-shot.mjs --keys=FALL:BLUE,FALL:RED,FX_MANA_BURN --body=FX_MANA_BURN`。
- 實戰仍有舊粒子：死亡碎裂（`UnitShatter`：`FX_HIT_GENERIC`＋直接生成的 SHARD／SPARK／SMOKE_PUFF）、`FX_HIT_SHIELD_SPARK`、`FX_CAST_BREAK` 共用層。

### 4.7 死亡碎裂、護盾火花、詠唱中斷共用層之後
登記表與實戰粒子全部零件化：探針的實戰段已沒有任何舊後端來源（天氣 ATMOSPHERE 屬環境氛圍，另計）。
- `UnitShatter`：仍逐顆生成（保留受擊方向噴濺與預算降階），外形換成零件——塵煙 smoke、火花 hard glow、靈魂光、血滴 droplet；色階 `factionSkin` 的 `death.ramps`，動畫 `shared_parts.ts` 的 `DEATH_PARTS`。
- `FX_HIT_GENERIC`（中性 `STATUS_SLATE` 閃光＋貼地環＋碎石）、`FX_HIT_SHIELD_SPARK`（`LION_ICE` 六角碎晶＋漣漪；播放點改到身體高度、漣漪落在格子地面，與一般命中同錨點）。
- 舊的共用 `FX_CAST_BREAK` 改為 `FX_CAST_BREAK_BURST_BLUE／RED`（`cast_break.ts`，在施法者核心高度爆散）。
- 對照：`fx-shot.mjs --keys=DEATH:BLUE,DEATH:RED --t=0.05,0.2,0.45,0.8,1.3`；verify:coords 振盪 41 對、靜止 0、sink 0。
- 已知：冰面上 `lighter` 混合的六角碎片偏白（與地面詠唱中斷碎片相同）。

### 4.8 V1（守門與探針補強）之後
- 探針兩個盲點修正：`caster.target` 要設成 Agent 物件（曾設成 id 字串，近戰單體技能打不到）；放好單位後結束出場計時（`spawnTimer > 0` 時投射物會被丟掉）。另加事件計數（每個標籤收到哪些遊戲事件）。
- 結果：**150／150 技能都只用零件**（普攻／主動／奧義各 50）。
- 粒子型別特性表 `PARTICLE_TRAITS`（constants.ts）取代 4 份散落清單；`tests/VFXBackend.test.ts` 鎖住推導結果，並以只減不增名單擋住新的舊後端資產（目前 25 個）與引擎直接生成的舊型別（ATMOSPHERE／BEAM／GENERIC_DEBUG／GIANT_HEX／ROCK）。

### 4.9 V2（剩餘活的舊資產）之後
- 零件化：`FX_SPAWN_BLUE／RED`（獅盾／角顱法陣＋光柱）、`FX_IDLE_BLUE／RED`、`FX_SELF_DAMAGE`、`FX_MANA_RESTORE`、`FX_LAST_STAND_LOCKED`、`FX_HAZARD_FIELD_*`（5 個，改為場出現時的地面爆點；持續場面仍由 HazardPainter 畫）、擊退塵改用新鍵 `FX_KNOCKBACK_DUST`。
- 登記表剩下的舊後端資產只有死鍵（`FX_CASTING_*`、`FX_HIT_FIRE`、`FX_MASSIVE_IMPACT`、`FX_STATUS_*_LOOP`），留給 V3 刪除。
- 保真工具修正：展示戰鬥在模擬流種子化前借用 Math.random，特效抽籤改變了展示單位的走位與鏡頭，第一張擷取（VOID）因鏡頭沒收斂而整張偏移（23% 像素）。`render-fidelity.mjs` 改為頁面載入後立即 `__resetSeed`，與特效脫鉤；新舊版本與原基準皆 0 差異，未重錄。

### 4.10 V3（死碼清理）之後
- 刪除：登記表死鍵 13 個（`FX_CASTING_*`、`FX_HIT_FIRE`、`FX_MASSIVE_IMPACT`、`FX_STATUS_*_LOOP`，`registry/shared.ts` 整檔）、`SkillDef.visualCastEffect／visualAoeEffect`、`ProceduralPainter`、`GroundPainter`、`MaterialPainter` 只供它們用的 6 個函式與輔助、`material-preview.html`／`materialPreview.ts`；另清掉 4 處 `--noUnusedLocals` 報的未使用項。
- 無陣營後備改零件：光束用 `NEUTRAL_BEAM_RAMP_ID`、隕石用 `METEOR_NEUTRAL`；`ParticleRenderer` 遇到 PROC／GROUND 型別畫洋紅除錯點（`VFX_RENDER.DEBUG_DOT_*`）。
- 結果：實戰＋150 技能共 10,824 顆粒子，全是 PART（7,704）或天氣 ATMOSPHERE（3,120）；棘輪名單：舊後端資產 0、直接生成的舊型別只剩 ATMOSPHERE／BEAM（已掛零件）／GENERIC_DEBUG。
- 保真 0 變化（未重錄）。

### 4.11 V4（投射物零件化）之後（2026-10-19）
- 新零件 `missile`（`PartSpec`／`PartBakers.bakeMissile`／`VFX_PARTS.MISSILE`）：箭、能量彈、法球、飛斧、炸彈、血鉤六種外形，指向 +x、錨點在中心；實體外形一般混合、能量外形加法。
- 投射物表收斂成一張 SSOT `data/vfx/projectile_visuals.ts`（原本 `projectiles/shared／imperial／covenant.ts` 的值全被同檔覆寫表蓋掉，是死資料）：軌跡參數＋`look`（外形、長度、色階或依陣營的色階、拖尾 streak／smoke／none、頭部光暈）。
- 繪製 `ProjectilePartPainter`：光痕＝光束磚沿取樣點串接、煙＝煙零件逐點蓋、頭部 glow、本體依速度拉長；色階由 `op.pTeam` 選，不再從技能顏色字串猜陣營。參數 `PROJECTILE_RENDER`。
- 刪除：`ProjectileDrawer`（每幀漸層＋顏色猜陣營）、`graphics/painters/ProjectilePainter`、`AssetManager.getProjectile`／`PROJECTILE_TEXTURE_KEYS`、`VFXFactory` 的 ARROW／FIREBALL／BOLT／BOMB 貼圖。模擬端沒人讀的 `Projectile.trail` 一併拿掉。
- 修正：`dipAmount` 從未傳進 `trajectoryInfo`（HOVER_DIP 永遠用預設 20）；表裡的 `speed`、`renderType`、`colorOverride`、`trailLength` 欄位從未被讀，已移除（速度只看 `skill.projectileSpeed`）。
- 驗收：`fx-shot --keys=PROJ:<鍵>:<陣營>` 18 組新舊對照（`tools/ui-e2e/out/vfx/proj_cmp.png`）；實戰 5 張地圖＋150 技能 0 頁面錯誤；battle_frozen 0.21%（門檻內，未重錄）；perf-ab 通過。

### 4.12 V5a（舊管線死碼）之後（2026-10-19）
- 證據：`vfx-coverage --liveness --battles=5`（5 張地圖輪替＋150 技能）列出整輪零呼叫的方法，再以 `git grep` 確認零引用才刪。
- `ParticleType` 收斂成 PART／PART_GROUND／PART_DEBRIS／BEAM／ATMOSPHERE／GENERIC_DEBUG；`PARTICLE_TRAITS` 後端只剩 PART／BILL；`GROUND_DRAPE.MODE` 只剩 PART_GROUND；預算的 `SECONDARY_TYPES`／`CRITICAL_TYPES`（只列舊型別，永遠比對不到）拿掉，行為不變。
- 貼花整條路徑（`state.decals` 從未有人 push）：`Decal`、`RenderOpType.DECAL`、`SUB_LAYER.DECAL`、分發分支、`AssetManager.getBlastZone`。
- 混沌旗標 `isChaosStyle`／`op.vChaos`／GroundDrape `chaos`（零件不吃顏色，沒有繪製器讀它）。
- 舊貼圖：`VFXFactory.getTexture` 只留 GLOW_SPRITE（天氣、AOE 體積光）、CRACKS（危害裂痕）、BEAM（森林背景光束）；`ParticlePainter` 刪 8 個方法；`IconPainter`、`GeometryPainter` 整檔刪；`SurfacePainter.drawFog`、`VolumePainter.drawHexRipple`、`UnitFlightPainter.drawFlyingAnchor`、`AssetManager.getGlowSprite`。
- `BillboardPainter` 只剩天氣（參數 `BILLBOARD`）；`materialConfig` 刪 ice／poison／void／particles／lightning／beam／unit.armor 與 6 個型別。
- 結果：除錯點 0 次；battle_frozen 0.21%（與 V4 相同）、地形 0 差異。

### 4.13 V5b（直接繪製器零件化）之後（2026-10-19）
- 詠唱環 `UnitAuraPainter`：環、聖域（陣營 sigil）、光點、能量柱全部是零件，色階＝陣營×技能屬性（`data/vfx/element_ramps.ts`），參數 `CAST_RING`。飛行緞帶 `UnitFlightPainter` 刪除（在縮放／旋轉後的座標系畫，位置是錯的），拖尾共用 `vfxparts/TrailStreak`。
- 共用零件層：`data/vfx/parts/partLayer.ts`（格式）＋`vfxparts/PartLayerPainter.ts`（解析與繪製）；狀態（`status_parts`）與危害（`hazard_visuals`）都用它。沒有繞行也沒有上升的多份層改為均分旋轉角（漩渦臂）。
- 新零件 `prism`（六角稜柱，等距投影與版面烘焙在 sprite 裡，glass／solid）：護盾 `ShieldPainter`（稜柱＋上升掃描環＋陣營上下緣，`SHIELD_VISUAL`，陣營色階 `factionSkin.shield.accentRamp`）、冰封危害的冰塊。
- 危害 `HazardPainter`：`HAZARD_VISUALS` 改成每格零件層＋中心格層（重力漩渦只畫在中心格，不再每格一個黑洞）；熔岩液面沿用地形循環影格。RenderOp 直接帶 `SpatialHazard`（刪 `GroundHazard` 與每幀配置的物件）。
- AOE 地面預警 `UnitIndicatorPainter`：範圍光＋內外環零件（`AOE_INDICATOR`），不再每幀 `shadowBlur`。
- 刪除：`VolumePainter`（整檔）、`SurfacePainter.drawCracks`、`ParticlePainter.drawCracks`、`VFXFactory` CRACKS、`NoiseLib.applyNoiseMask`、`materialConfig.scorch`、`Z_LAYERS.HAZARD_FOG`。
- **回歸修正**：V5a 刪貼圖時 `HazardPainter`（SMOKE／GLOW／ROCK）與 `UnitShadowPainter`（SHADOW_BLOB）仍在呼叫，畫成洋紅除錯方塊。`VFXFactory.getTexture` 改收封閉型別 `VFXTextureType`，傳不支援的名稱編譯不過；SHADOW_BLOB 復原（參數 `UNIT_SHADOW`）。
- HUD（同輪）：血條／護盾／魔力填色改預烘焙 sprite 切片（漸層＋光暈＋高光，依顏色、高度、裝置縮放快取），選取框與量表進度弧的 `shadowBlur` 改寬描邊；量表的控制顏色改讀 `STATUS_VISUALS`（原本寫死、與狀態 SSOT 不一致）；背水一戰橫幅漸層依畫布尺寸快取、標題光暈預烘焙；浮動文字碎裂亂流改確定性雜湊。參數 `HUD_BAR`、`HUD_GAUGE`、`LAST_STAND_BANNER`、`TEXT_ANIM`。渲染路徑已沒有每幀 `shadowBlur`（只剩烘焙期）。
- 驗收：`fx-shot --keys=SHIELD:<陣營>`、`HAZARD:<類型>`、`CAST:tb_a3`（AOE 預警）新舊對照；battle_frozen 0.03%（陰影從除錯方塊恢復成柔和陰影，門檻內未重錄）、地形 0 差異。

### 4.14 V6（外觀調校）之後（2026-10-19）
- **亮底發白**：`fx-shot --scene=<地圖>` 量白色飽和像素（min(R,G,B) ≥ 245）。ICE 上加法零件把金色洗白、橘紅火焰變粉紫，DESERT 吞掉熔岩火。修法：① `flame` 零件預設一般混合（本體保留色相，光暈仍由 glow 零件加法提供；危害火舌早先已這樣做）；② 加法零件乘群系增益 `VFX_BIOME_GAIN`（ICE 0.7、DESERT 0.85，`VFXPartStore.setAdditiveGain`，RenderPipeline 每幀依地圖設定）。HIT_BLUE_HOLY 白色比例 ICE 4.15% → 1.82%（FOREST 2.77%），HIT_RED_MAGMA ICE 1.95% → 0.07%。對照 `tools/ui-e2e/out/vfx/biome_cmp.png`（前）／`biome_cmp2.png`（後）。
- **隕石落點影子**：HEAVEN_FALL 多生一顆貼地煙零件（`CHAR`，壽命＝自由落體時間），隨墜落從 0.25 長到 1 並加深（`METEOR_SIZE.SHADOW`、`METEOR_SHADOW_ANIM`）。
- **光束兩端光點**：`playBeam` 另取一張硬光暈（`Particle.beamEnd`，取代只寫不讀的 `beamCore`），`PartPainter.drawBeam` 畫在發射口（較小）與命中點，隨光束收窄淡出並閃動（`VFX_PARTS.BEAM.END_*`）。
- 保真：battle_frozen 0.09%（畫面內沒有火焰、光束、隕石），地形 0 差異。

### 4.15 V7（效能驗證＋保真重錄）之後（2026-10-19）
- `tools/ui-e2e/lib/vfx-storm.mjs` 重寫：舊版寫的是不存在的欄位（`a.currentSkill`、`a.x`、`engine.vfx`），大多空轉。現在走真實入口：每 600 ms 每個單位用 `initiateCast` 詠唱輪替的本陣營奧義、一半掛滿護盾、登記四種空間危害、每人一發投射物（輪替外觀）＋一條光束（輪替樣式）。`__vfxStormStats()` 回報零件快取依種類的未命中／擠出，`perf:frames` 記錄量測窗內的差值。
- 發現：192 條目上限在壓力下來回擠（8 秒 127 次未命中、113～127 次擠出）。柔邊零件（非硬光暈、煙）改 `SOFT_BAKE_SCALE` 1 倍烘焙（最大條目是 256 半徑光暈 4.2 MB），`MAX_ENTRIES` 320、位元組預算不變 64 MB → 擠出 49 次（改由位元組上限決定）。
- 幀間隔：本機這次 harness 只有 56 Hz（rAF 被壓在 60 Hz），平穩／壓力／展示三個情境都卡在 17.7 ms，p99 無法分辨；**需在 239 Hz 主螢幕重跑 `npm run perf:frames`**。
- 保真：battle_frozen 一次性重錄（`359bc66`，證據 `tools/ui-e2e/out/fidelity_v7_evidence.png`：388 px／0.042%，全在單位區：接地陰影復原、血條 sprite 邊緣、量表光暈、柔邊光暈重取樣）；五個地形基準 0 差異未動。

### 4.16 U1（奧義時序與反饋）＋實機回饋（2026-10-19）
- 實機 `perf:frames`（238 Hz，3 輪 × 20 秒）：平穩 median 4.2／p99 16.7 ms、壓力 8.4／24.8 ms、展示 4.2／12.6 ms。壓力下零件快取 64 MB 仍擠出 71～189 次 → `VFX_PARTS.MAX_BYTES` 96 MB。
- `VFX_BIOME_GAIN` ICE 0.77、DESERT 0.94（實機偏暗，各提亮 10%）；重力漩渦中心格加強（光暈、射線、雙層旋臂、軌道光點）。
- **奧義清查**：序列在詠唱開始就播（傷害幀在詠唱結束）、詠唱被打斷仍播完整特效、`scale` 欄位從未套用、HEAVEN_FALL 落地時間錯、震屏偏弱、STORM 在模組載入時用 `Math.random`。修法：`VFXSequence.hitAt`（序列內的命中時刻），`VisualSystem` 在 CAST_START 以 `startDelay = max(0, cast − hitAt)` 排程，CAST_BREAK 取消佇列；`Particle.fxScale` 群組縮放（size／spread／speed／vz），`PartPainter.scaleAt` 乘上；HEAVEN_FALL `hitAt = √(2h/g)`；每個奧義命中幀加共用 `FX_ULT_IMPACT_BLUE/RED`（光暈、雙地環、地面射線、碎石、火花）；參數集中 `ULT_SEQUENCE`（`data/vfx/ult_visuals.ts`）。全螢幕閃光維持移除（PostProcessor）。
- 保真 harness：移除模組載入的 `Math.random` 讓開機地圖隨機化偏移 → `render-fidelity.mjs` 固定 `FIDELITY_MAP`（12×8 POINTY）並先暖機一次。VOID（舊基準在鏡頭收斂途中截取）與 battle_frozen（奧義區 0.39%）重錄於 `681e07e`，其他 0 差異。
- 驗證：`tools/vfx/fx-shot.mjs` CAST 模式（`--probe` 印序列佇列）；之後每個奧義的美術細調可在此結構上逐一進行。

### 4.17 障礙物 O1～O4＋地形 T2～T5（2026-10-19）
- **障礙物**：`tools/assets/blender/render_obstacle.py` 用單位同款相機（正交 30°、同一套 toon 色帶與描邊）渲染，1 BU＝HEX_SIZE、原點固定像素；TREE＝KayKit 樹 4 種、WALL＝KayKit 柱＋Kenney 石柱／方尖碑、SANDSTONE＝Kenney 高岩、ICE_CRYSTAL／OBSIDIAN_PILLAR＝腳本建的六角稜柱（黑曜柱頂發光）。`pack_obstacles.py` 裁切成 WebP 圖集＋`public/assets/obstacles/manifest.json`（約 300 KB）。執行期 `ObstacleSpriteStore` 依 q,r 雜湊選變體、合成足跡陰影＋精靈一次；錨點讀 manifest（`ENV_SPRITE` 只剩載入前的程序化退路）。
- **熔岩**：舊版每格同一張暗橢圓、全場同步。新版熔體放射漸層＋脈動、環面 Voronoi 硬殼沿圓周漂移、裂縫發光、冒泡、岸邊暗環；4 個硬殼變體＋每格相位（雜湊），液態危害同路徑。效能：每影格一張小 canvas 時 MAGMA p99 16～18 ms（關液面 3.7 ms），改成整組影格一張圖（`LoopSheet`）＋縮放級距 ≤1 用 1 倍烘焙後 10.6～11.9 ms，低於重繪前（13.6～13.9 ms）。
- **地表裝飾**：草叢改 KayKit 草／灌木預渲染（以底部為軸斜切風擺，每變體 1～3 叢）；沙漠碎石、冰渣、虛空碎塊烘進地塊 sprite（`TERRAIN_AMBIENCE.decor`）。圖集載入時地塊與草叢快取依 `obstacleSpriteStore.revision` 重烘。
- **網格**：落差描邊 alpha 0.7→0.45、崖邊亮邊 0.85→0.6（`TERRAIN_SKIN.edge`）。
- **天氣**：`VFXAmbience` 生 PART 粒子（WEATHER_* 中性色階），以 `Particle.weather` 計數（ownerId 沒有對應單位會被 VFXSystem 回收）。ATMOSPHERE、BillboardPainter、ParticleTextureStore 與 5 張 Kenney 粒子貼圖刪除；後端棘輪只剩 BEAM、GENERIC_DEBUG。
- 驗證：`tools/ui-e2e/obstacle-shot.mjs`（各群系全圖＋放大，`--frames=600` 看天氣）、`biome-frames.mjs`、`terrain-contrast.mjs`、保真兩次附證據重錄（`ad64afd` 障礙物、`f312187` 地表）。

### 4.18 O3＋T2 崖邊＋T3 氛圍層（2026-10-19）
- **障礙物動態**（`OBSTACLE_SPRITE.ANIM`）：樹以底部為軸斜切風擺（12 影格表）；冰晶星芒、黑曜柱頂發光是「靜態本體＋加法疊層」，執行期只改疊層 alpha／位置（`ObstacleSprite.overlay`，RenderDispatcher 多一次 drawImage）。先做的整張影格表版在 MAGMA 量到 p99 多 3～5 ms，疊層版與關掉動畫交錯 A/B 無差異。每格相位依 q,r 雜湊。
- **崖邊裝飾**（`TERRAIN_AMBIENCE.edge`，`TerrainRenderer.paintEdgeDecor`）：只畫在前側落差邊——森林垂草、冰雪簷＋冰柱、熔岩發光邊＋滴落、虛空淡光；烘進地塊 sprite，每幀成本不變。
- **氛圍層**（`BIOME_ATMOSPHERE`）：依地圖額外的零件粒子層，只在地圖格子範圍內生成（`spawn: 'ISLAND'`）：森林低處霧氣＋斜射光柱、虛空紫霧、熔岩往上飄的熱浪光暈。`Particle.weather` 改為層編號（1＝場景天氣）。
- 驗證：`tools/ui-e2e/obstacle-sheet-dump.mjs`（動畫影格並排）、verify:coords 振盪 85（靜止 2，慢速漂移的霧／光柱）、保真重錄 `516b22e`（證據 `tools/ui-e2e/out/fidelity_o3_evidence.png`）。

### 4.19 詠唱法陣重新設計＋場景鋸齒（2026-10-19，`2f36ff3`、`6ac59fd`）
- 實機回饋：藍色詠唱光環毛刺、實線讓畫面髒；整體場景有鋸齒。
- **法陣**：新零件 `magicCircle`（`PartSpec`／`PartBakers.bakeMagicCircle`，參數 `VFX_PARTS.MAGIC`）。外層＝徑向半透明圓盤＋雙同心圓＋種子符文帶＋刻度；內層＝獅心六芒星／灰燼倒三角＋斷弧，頂點光點、中心光。所有線條＝烘焙時模糊的主色光暈＋細亮芯，不畫實線。`UnitAuraPainter` 外層／內層反向慢轉（0.45／0.8 rad/s，舊版 3～6）、詠唱開始淡入（`CAST_RING.FADE_IN_S`），screen 混合（`GROUND_DRAPE.PLANE_BLEND` 必須等於 `CAST_RING.BLEND`）。`UnitIndicatorPainter` 的 AOE 預警同樣改用法陣外層。對照工具 `tools/vfx/magic-circle-dump.mjs`。
- **地格疊層**：真正的「藍色毛刺」是 AOE 範圍格與區域波紋逐格描 1.5～2 px 實線，相鄰格雙邊排成密集網格。新 `engine/renderers/grid/SoftTile.ts`（半透明底＋模糊內緣光＋淡芯線，依外觀×尺寸×layout 快取）取代 `GridOverlays` 的預警／射程／滑過與 `ZoneRenderer` 的波紋／邊界（虛線邊界移除，敵方邊界改較亮的紅光）。縮圈預警保留醒目紅底（`GRID_OVERLAY.WARNING.FILL_ALPHA` 0.75）。`ring` 零件的外光暈改為烘焙時模糊（`VFX_PARTS.RING.HALO_BLUR`）。
- **鋸齒**：主畫布每幀 `imageSmoothingQuality='high'`（`RENDER_QUALITY.IMAGE_SMOOTHING`，離屏畫布同）；op 繪製點改對齊裝置像素（`RenderDispatcher.setDeviceGrid`／`snap`，RenderSpec §3），`TerrainRenderer.drawBlock` 不再 `Math.floor`。
- 驗證：lint、`vitest --dir tests` 590、build、perf-ab 持平；保真 VOID／ICE／MAGMA／battle_frozen 重錄（證據 `tools/ui-e2e/out/fidelity_aa_evidence.png`），FOREST／DESERT 在門檻內未動。
- **補漏（同日）**：`sigil` 零件（技能地面紋章 51 處＋奧義聖域，太陽／獅盾／角顱／倒三角）仍是深色粗光暈＋實心主線的三層硬描邊，改成同一套透光圓盤＋烘焙模糊光暈＋細主線＋亮芯（`VFX_PARTS.SIGIL`）。詠唱中斷 `FX_CAST_BREAK_*` 的硬邊斷裂六角環改成詠唱法陣外層往外崩開淡出；AOE 中斷逐格閃的環改 `ring` 新選項 `soft`（只畫模糊光暈＋細芯）。保真 6 張 0 差異。
- 參考：Clip Studio 法陣教學（同心圓→符文帶→多邊形星）、realtimevfx 法陣 WIP 討論（分層慢轉、加法光暈）、發光線條＝寬模糊光暈＋細亮芯。

### 4.20 奧義規格化 UA＋UA6（2026-10-21，合併 `3061fbc`）
- ART_SPEC §6 寫成棘輪測試 `tests/UltSpec.test.ts`（C1 時序 hitAt ≤ cast、C2 主爆發對齊 hitAt、C3 起手／餘韻、C4 時長 1～2 s、C5 發射器 3～6、C6 中央貼地半徑 ≤ 1.3 × min(aoeRadius, 3) 圈＋STORM 每擊 ≤ 1.5 格、C7 傷害擴張環／治療上升、C8 粒子 ≤ 80）；違規 132 → 3（`tr_u3`／`wb_u5`／`wr_u3` 詠唱 0.2 s 小於 HIT_LEAD 0.3，受技能資料限制）。
- 範圍不靠特效表示：詠唱期間的逐格預警（`currentTelegraph`）就是範圍；舊「貼地零件對齊 aoeRadius」會讓全場奧義蓋滿畫面，已廢除。
- STORM 落點散布：`SkillSequences` 給每擊 `scatterRings／scatterIndex／scatterCount`，`SequenceSystem.computeScatterOffset` 確定性向日葵分佈（黃金角），每個落點重算所在格地面高度（`tests/UltScatter.test.ts`）。
- HEAVEN_FALL 為對齊傷害降低落下高度（`tr_u1`、`sr_u4` 300 px，多數 1000 px）；STORM 次數統一 8（C8）；`mb_u2` 改用專屬配方 `FX_ULT_BLUE_ABSOLUTE_ZERO`（原與 `rb_u1` 共用）；7 個紅方奧義的 `primary/secondaryColor` 改成與技能屬性一致。
- 對照總表：`node tools/vfx/ult-sheet.mjs --out=<dir>`（藍／紅各一張，取樣 hitAt−0.2～+0.8，STORM 加全景欄，ICE／DESERT 白色飽和比例寫 json）。報告已刪（UA／UA6，見 git 歷史 `3061fbc`）。

### 4.21 奧義有感 UF（2026-10-21，合併 `c7df349`）
- 共用演出（參數 `constants/vfx.ts` 的 `ULT_FEEL`；狀態 `engine/presentation/vfx/UltFeelStore.ts`，寫入者只有 `SequenceSystem`（新動作 `ULT_IMPACT`，在 hitAt），`VFXSystem.reset()` 清空）：
  - 詠唱暗場＋施法者聚光：做過（`c7df349`），奧義詠唱只有 0.1～2 秒，來不及聚焦、只見畫面亮暗快速交替（VRR OLED 上像閃爍），依使用者回饋移除；有 5～10 秒長詠唱時再取回。
  - 奧義名橫幅：做過（`3edfa7f`），使用者評「廉價」後移除，奧義名回到施法者頭頂喊招。
  - 命中光爆：`engine/renderers/ult/UltWorldRenderer.ts`，畫在後製之後、tactical overlay 與 HUD 之前；命中點局部加法光爆（不透明度上限 0.35），不做全畫面閃白。
- STORM：`UltVisualDef.cadence`（`rr_u3` ACCEL、`rb_u5` CLUSTER）；落點出地圖時沿中心方向縮回（`SequenceSystem.clampScatterToMap`，`engine.isValid`）。
- 重做（10/21 使用者最喜歡、依 `6927b68` 之前的舊版構圖做回）：`mb_u1` 黑洞（ASH_VOID 實色六角吸積盤＋反轉旋臂＋疊兩層 CHAR 黑核＋持續吸入碎晶＋結尾坍縮環）、`rr_u2` 核彈（上升火球＋範圍 3 大衝擊環＋蘑菇煙團＋高飛碎石＋火星）。
- 重做：`sr_u4` 空中月輪＋血光柱＋回流光點、`rr_u2`／`mr_u1` 餘韻收斂、`wb_u5` 獅盾紋章＋交錯斬痕、`sr_u1` 鎖鏈收緊、`sr_u5` 鬼火。
- 全畫面驗收圖：`node tools/vfx/ult-sheet.mjs --feel`（8 個奧義 × 詠唱／命中／餘韻）。報告 `docs/ULT_FEEL_REPORT.md`。

### 4.22 近戰揮擊與主動技專屬命中 MF（2026-10-22，合併 `3c9d06f`）
- 規格測試 `tests/MeleeFxSpec.test.ts`（棘輪基準 `tests/melee-fx.baseline.json`，違規 32 → 0）：M1 18 招近戰普攻皆有揮擊動作且無震動／格子脈衝；M2 普攻揮擊＋命中包各發射器 ≤ 0.35 s、粒子數總和 ≤ 14；M3 7 招近戰主動技（`tb_a5`、`wb_a5`、`tr_a4`、`wr_a1`、`wr_a2`、`wr_a4`、`sr_a3`）不沿用普攻命中包、發射器 2～6、≤ 0.8 s、粒子 ≤ 36 且實機可播；M4 序列粒子不與 `HIT_FX` 實際播放特效（`SkillExecutor.ts` `ownHit` 規則）重複。
- 新登記表 `data/vfx/registry/melee_parts.ts`（16 個 `FX_SWING_*` 刀弧／重擊下壓／刺擊尖端閃光＋7 個 `FX_ACTIVE_*` 專屬命中包）；4 個普攻命中包微調尾隨粒子時長 ≤ 0.35 s。
- 無投射物主動技的主特效僅由 `SkillSequences`（`ACTIVE_VISUALS[id].impactFx`）播放，`HIT_FX` 只播陣營預設小打擊；對照圖 `node tools/vfx/ult-sheet.mjs --feel --name=melee_before|melee_after`。報告 `docs/MELEE_FX_REPORT.md`。

## 5. 遷移順序建議
1. ✅ **先修 bug（不改材質）**：GRID_PULSE 依施法者陣營選色；DOT 不再播 `FX_STATUS_BURN_LOOP`（交給狀態零件），毒不播火花；`FX_CAST_BREAK` 共用層確認是否該拿掉。
2. ✅（前 6 個）**共用 6 資產零件化**（一次一條渲染工作）：GRID_IMPACT、MUZZLE_FLASH、HEAL_BURST、VAMP_BURST、TELEPORT；之後是 FX_HIT_GENERIC／護盾火花／出場特效。
3. ✅ **光束零件**（`ART_VFX_PLAN` 已列待辦）：6 種樣式、32 個技能。
4. ✅ **HEAVEN_FALL 改零件**（落下時間依高度，維持由序列直接生成，零件規格放資料檔）。死亡碎裂、護盾火花、詠唱中斷共用層 ✅。
5. ✅ **單一後端宣告＋棘輪**：資產宣告自己的後端，三份型別清單收斂成一份；新增 `tests/VFXBackend.test.ts`，以只減不增的基準鎖住舊後端數量（與 `CoordinateProtocol` 同模式）。
6. ✅ 清死鍵（§2.6）與死欄位（§2.2）。
