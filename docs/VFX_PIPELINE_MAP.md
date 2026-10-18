# 特效管線地圖（P0）與覆蓋率矩陣（P1）

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
 └─ VFXRenderer.submitRenderables（engine/systems/vfx/render.ts）
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
- 刪除：登記表死鍵 13 個（`FX_CASTING_*`、`FX_HIT_FIRE`、`FX_MASSIVE_IMPACT`、`FX_STATUS_*_LOOP`，`registry/shared.ts` 整檔）、`SkillDef.visualCastEffect／visualAoeEffect`、`ProceduralPainter`、`GroundPainter`、`MaterialPainter` 只供它們用的 6 個函式與輔助、`tools/material-preview.html`／`materialPreview.ts`；另清掉 4 處 `--noUnusedLocals` 報的未使用項。
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
- 驗收：`fx-shot --keys=SHIELD:<陣營>`、`HAZARD:<類型>`、`CAST:tb_a3`（AOE 預警）新舊對照；battle_frozen 0.03%（陰影從除錯方塊恢復成柔和陰影，門檻內未重錄）、地形 0 差異。

## 5. 遷移順序建議
1. ✅ **先修 bug（不改材質）**：GRID_PULSE 依施法者陣營選色；DOT 不再播 `FX_STATUS_BURN_LOOP`（交給狀態零件），毒不播火花；`FX_CAST_BREAK` 共用層確認是否該拿掉。
2. ✅（前 6 個）**共用 6 資產零件化**（一次一條渲染工作）：GRID_IMPACT、MUZZLE_FLASH、HEAL_BURST、VAMP_BURST、TELEPORT；之後是 FX_HIT_GENERIC／護盾火花／出場特效。
3. ✅ **光束零件**（`ART_VFX_PLAN` 已列待辦）：6 種樣式、32 個技能。
4. ✅ **HEAVEN_FALL 改零件**（落下時間依高度，維持由序列直接生成，零件規格放資料檔）。死亡碎裂、護盾火花、詠唱中斷共用層 ✅。
5. ✅ **單一後端宣告＋棘輪**：資產宣告自己的後端，三份型別清單收斂成一份；新增 `tests/VFXBackend.test.ts`，以只減不增的基準鎖住舊後端數量（與 `CoordinateProtocol` 同模式）。
6. ✅ 清死鍵（§2.6）與死欄位（§2.2）。
