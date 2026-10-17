# Agent 狀態所有權設計（HANDOFF §7 待辦 #8）

> 2026-10-16，基準 commit `460b571`。**只設計、未實作**。行號以該 commit 為準。
> 方法：對 `engine/core/Agent.ts` 的 89 個欄位逐一 `git grep -nE "\.<field>(\s*[-+*/|&]?=[^=]|\+\+|--|\.(push|shift|splice)|\[..\]\s*=|\.x\s*=)"`，排除 `Agent.ts` 自身（建構／`reset`／`saveState`）與 `tests/`、`tools/`，再人工剔除同名誤判；別名寫入另查（只找到兩處別名，皆為讀取：`UnitBodyPainter.ts:70`、`UnitDeathPainter.ts:16`）；無 `Object.assign`／動態鍵寫入。
> 讀者欄縮寫：S＝模擬、R＝渲染（`engine/renderers`、`data/units/appearance`）、U＝UI（`components`、`hooks`、`selectors`）。
> 旗標：⚠＝跨系統多寫入者；◆＝視覺欄位由模擬寫或模擬讀視覺欄位；✓＝已是單一寫入者。

## 1. 欄位清單（89）

### 1.1 身分 identity（6）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `id` | 僅建構（`behaviorTree.ts:16`、`ProjectileSystem.ts:176` 是同名誤判） | 全層 | ✓ |
| `team` | 僅建構（`GameEventPool.ts:49`、`ProjectileSystem.ts:178` 誤判） | 全層 | ✓ |
| `role` | `agentManager.ts:52,55`；`UICommandSystem.ts:72,171` | S DamageCalculator/Director；R SpriteUnitRenderer、UnitBody/ShadowPainter；U 檢視器 | 生命週期＋編輯器，可接受 |
| `bodyType` | `agentManager.ts:58`；`UICommandSystem.ts:98,174` | R bodyTypes | 同上 |
| `skillIds` | `agentManager.ts:64`；**`components/inspector/tabs/UnitStatusTab.tsx:19`** | game、agentManager | ⚠ UI 直接寫引擎（繞過 UICommand；`UIBoundary` 的 `agent\.\w+\s*=` 抓不到索引寫入） |
| `initialState` | `Agent.saveState` | U showcaseConfigStore | ✓ |

### 1.2 屬性 stats（9，應只在生成時寫）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `maxHp` | `agentManager.ts:29`；`UICommandSystem.ts:79` | S 多處；R BarPainter | 可接受 |
| `maxMp` | `agentManager.ts:31`；`UICommandSystem.ts:92` | S Combat；R BarPainter | 可接受 |
| `moveSpeed` `jump` `weight` `movementType` | `agentManager.ts:32–35` | S 移動／尋路／物理；R UnitBody/FlightPainter | ✓ |
| `aiUpdateInterval` | `agentManager.ts:40` | game.ts | ✓ |
| `skills` | `game.ts:233,264`；`agentManager.ts:75` | S 多處；R Bar/Gauge/AuraPainter | 初始化邏輯重複在 facade 與 agentManager |
| `bt` | `game.ts:234,265`；`agentManager.ts:76`；`UICommandSystem.ts:107` | game、U BehaviorTreeTab | 同上 |

### 1.3 生命值 vitals（6）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `hp` | `PhysicsEngine.ts:111`；`ZoneSystem.ts:153`；`agentManager.ts:30`；`DirectDamage.ts:27`；`SkillExecutor.ts:184,245,288,322`；`EffectSystem.ts:74`；`UICommandSystem.ts:81,85` | 全層 | ⚠ 7 個模組；3 處直接設 0（Physics／Zone／SkillExecutor:322） |
| `shield` | `CCManager.ts:177`；`DamageCalculator.ts:144`；`DirectDamage.ts:22` | R BarPainter、ShieldPainter | ⚠ 兩條扣盾路徑 |
| `maxShield` | `CCManager.ts:178` | R ShieldPainter | ✓ |
| `mp` | `CombatSystem.ts:151`；`SkillExecutor.ts:258,271`；`UICommandSystem.ts:94` | S Combat、BT；R BarPainter | 戰鬥域內，可接受 |
| `lastHitDamage` | `SkillExecutor.ts:144,187` | SkillExecutor | ✓（`DirectDamage` 不設，語意不一致） |
| `lastHitSourceId` | `HazardSystem.ts:128`；`SkillExecutor.ts:186` | agentManager（擊殺歸屬）、ControlSystem | ⚠ Zone／Physics／DirectDamage 不設，擊殺歸屬依路徑而異 |

### 1.4 施法 casting（7）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `castingSkillIdx` `castTimer` | `CombatSystem.ts:67,69`；`CastingEngine.ts:35,81,82` | S BT、Animation；R Gauge/Bar/AuraPainter、selectSpriteFrame | 戰鬥域內 |
| `castingAnimationTimer` | `CombatSystem.ts:70`；`CastingEngine.ts:36,83` | **只有 R**（UnitBodyPainter、selectSpriteFrame） | ◆ 純視覺計時由模擬寫 |
| `curCDs` | `CombatSystem.ts:154`；`CastingEngine.ts:63`；`CooldownSystem.ts:9,12` | S BT、Combat | 設定／衰減分屬兩系統 |
| `currentTelegraph` | `CombatSystem.ts:89`；`CastingEngine.ts:84` | R GridRenderStrategy | 戰鬥域內 |
| `_interruptCooldown` | **`BTRegistry.ts:308`**；`CastingEngine.ts:55`；`CooldownSystem.ts:25,26` | S BT、Combat | ⚠ AI 直接寫施法鎖 |
| `_castCompleteCooldown` | `CastingEngine.ts:86`；`CooldownSystem.ts:31,32` | S BT、Combat | 設定／衰減 |

### 1.5 AI（8）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `target` | `BTRegistry.ts:23,146,562,587,590,621,628`；`TargetingSystem.ts:82,153,166,222`；**`CCManager.ts:136`** | S 多處；R tactical、selectSpriteFrame；S Animation | ⚠ 戰鬥寫 AI 狀態（嘲諷；TargetingSystem:166 已依 `tauntTargetId` 處理） |
| `targetHex` | `BTRegistry.ts`（13 處）；`TargetingSystem.ts:134,138,146`；**`CCManager.ts:137`** | S Combat、Projectile、Zone | ⚠ 同上 |
| `_savedCombatTarget` | `BTRegistry.ts:24,608` | BTRegistry | ✓ |
| `aiState` | `BTRegistry.ts`（14 處）；**`CastingEngine.ts:94`；`CombatSystem.ts:72–74`** | S AgentVFX、Director；U 檢視器 | ⚠ 戰鬥寫 `CASTING_*` |
| `actionState` | `BTRegistry.ts`（12 處）；**`game.ts:236`** | S Animation；R UnitBodyPainter、selectSpriteFrame | facade 內重設 |
| `aiUpdateTimer` | `game.ts:361,378`；`agentManager.ts:41` | game.ts | AI 排程在 facade |
| `forceAiUpdate` | `HazardSystem.ts:26`；`ZoneSystem.ts:101`；`CCManager.ts:143`（設 true）；`game.ts:379`（清除） | game.ts | 請求旗標（多生產、單消費），可接受 |
| `escapeCooldown` | `BTRegistry.ts:391`；`game.ts:356`（衰減） | BT、Targeting | 衰減寫在 facade |

### 1.6 移動 locomotion（12）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `q` `r` | `map.ts:48,49` | 全層 | ✓ |
| `px` `py` | `PhysicsEngine.ts:154–157`；`CCManager.ts:319,320`；`SkillExecutor.ts:55,56`；`map.ts:57,58`；`MotionEngine.ts:31,32,48,49`；`UICommandSystem.ts:219–243`；`hooks/useGameInput.ts:146,147`（D11 拖曳預覽例外） | 全層 | ⚠ 7 個模組 |
| `isMoving` | `BTRegistry.ts:236`；`agentManager.ts:118`；`CCManager.ts:37,77,100,118,157,325`；`MotionEngine.ts:14,59`；`MovementSystem.ts:52,128,138,149,159,167`；`StackingResolver.ts:52`；`ControlSystem.ts:62,78,86` | S 多處；R HUDRenderer、selectSpriteFrame | ⚠ 7 個模組（「停止移動」散落各處） |
| `path` | 同 `isMoving` 的集合（`MotionEngine.ts:25` 用 `shift`；`MapSpatial.ts:38` 是讀取誤判） | 同上 | ⚠；`MovementSystem.ts:135,156` 與 `trajectory` **共用同一陣列** |
| `trajectory` | `MovementSystem.ts:136,157` | R tactical；S ProjectileSystem | ✓（但與 `path` 別名） |
| `moveProgress` | `MotionEngine.ts:15,20,26,61`；`MovementSystem.ts:139,160` | R HUDRenderer | 移動域內 |
| `stuckTicks` | `MovementSystem.ts:125,130,147,154` | MovementSystem | ✓ |
| `moveSpeedMult` | `HazardSystem.ts:79,81,156`；`MotionEngine.ts:60`；`MovementSystem.ts:76,141,162` | MotionEngine | ⚠ 依執行順序：Hazard 每 tick 取 min、Motion 抵達重設 1、Movement 起步覆寫 |
| `facing` | `CastingEngine.ts:30`；`CombatSystem.ts:96,99`；`MotionEngine.ts:44` | **只有 R**（UnitBodyPainter、selectSpriteFrame） | ◆⚠ 視覺欄位、3 個寫入者 |
| `hasLandedLastStand` | `MovementSystem.ts:199,225` | MovementSystem | ✓（`reset()` 未清） |

### 1.7 物理 physics（2）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `physics.{x,y,z,vx,vy,vz,angle,vAngle}` | `PhysicsEngine.ts`（積分 51–141）；`HazardSystem.ts:154,155`；`ZoneSystem.ts:156–161`；`agentManager.ts:112–117`；`CCManager.ts:193,321,322`；`SkillExecutor.ts:61–63`；`map.ts:46`；`MotionEngine.ts:63–67`；`MovementSystem.ts:211,212,223,224`；`StackingResolver.ts:61,62` | 全層（R 多個 painter 讀 z） | ⚠ 10 個模組；多數是速度 `+=`（可視為累加器），但 `z`／`x`／`y` 也有直接改寫（Zone、map、CC、SkillExecutor） |
| `outOfBounds` | `PhysicsEngine.ts:55,114`；`agentManager.ts:119`（死亡重設） | S、R | 大逃殺修正後順序正確，✓ |

### 1.8 狀態 status（25）
CC 施加者是 `combat/CCManager.ts`，衰減者是 `status/ControlSystem.ts`／`EffectSystem.ts`：同一個「狀態域」的施加／衰減配對，視為單一擁有者。

| 欄位 | 施加 | 衰減／清除 | 域外寫入 | 主要讀者 |
| :-- | :-- | :-- | :-- | :-- |
| `stunTimer` | CC:74 | Control:27 | **`PhysicsEngine.ts:88`**（失足強制暈眩） ⚠ | S 多處；R Gauge/OverheadPainter |
| `stunMax` `silenceMax` | CC:75,88 | — | — | R GaugePainter |
| `banishTimer` `banishMax` | CC:96,97 | Control:20 | agentManager:121,122（死亡） | R Gauge/StateModelPainter |
| `stasisTimer` `stasisMax` | CC:108,109 | Control:22 | agentManager:123,124（死亡） | R StateModelPainter；S Animation |
| `silenceTimer` | CC:87 | Control:28 | — | S BT、Combat；R |
| `polymorphTimer` `invincibleTimer` `vulnerableTimer` | CC:156,164,171 | Control:32–48 | — | S DamageCalculator |
| `banished` | CC:99 | Control:61,67（每 tick 由 `banishTimer` 推導） | **`ZoneSystem.ts:154`**；agentManager:120 | 全層 | 
| `rootTimer` `fearTimer` | CC:35,36,117,124 | Control:29,30 | — | S BT、Combat；R |
| `tauntTimer` `tauntTargetId` | CC:131,132 | Control:55,56 | — | S Targeting |
| `blindTimer` | CC:150 | Control:31 | — | S DamageCalculator；R |
| `dotTimer` `dotDmg` `dotType` | CC:200–207 | Effect:29 | — | S Effect；R GroundEffectPainter |
| `hotTimer` `hotVal` | CC:214,215 | Effect:69 | — | S Effect |
| `drStacks` `drTimers` | CC:261,262 | Control:11,13 | — | CCManager |
| `fearMoveTimer` | — | Control:90,125,135 | — | ControlSystem ✓ |

`banished` ⚠（衍生值被三處各自寫）；`stunTimer` ⚠（物理寫入）；`dotDmg`／`hotVal` 在 `reset()` 未清。

### 1.9 死亡與生命週期（6）——目前的正面範例
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `deadLogged` | `agentManager.ts:108` | ZoneSystem | ✓ |
| `deathTimer` | `agentManager.ts:109,171` | R UnitDeathPainter、selectSpriteFrame | ✓（HANDOFF §3 A 修正成果） |
| `DEATH_ANIM_DURATION` | readonly | agentManager、R | ✓ |
| `fullyDead` | `agentManager.ts:176` | 全層 | ✓ |
| `ragdoll` | `agentManager.ts:157` | R UnitDeathPainter | ◆ 視覺資料由模擬建立（可接受：死亡瞬間快照） |
| `spawnTimer` | `agentManager.ts:71`；`CooldownSystem.ts:19,20` | S ProjectileSystem:140（開火閘門）；R HUDRenderer、UnitBodyPainter | 生命週期＋衰減 |

### 1.10 純視覺 visual-only（6）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `animState` | `AnimationSystem.ts:33–87`；**`game.ts:235,266`** | R UnitBodyPainter、selectSpriteFrame；U selectors | facade 內重設 |
| `visualStatus` | **`TargetingSystem.ts:88,135,139,149`；`CCManager.ts:82,110,112,160,167`；`ControlSystem.ts:24,38,40,49,51,70,81`；`AnimationSystem.ts:34,43,57,61,66,71`** | R 8 個 painter（POLYMORPH／FROZEN／INVINCIBLE／STASIS 分支）；**S `PhysicsEngine.ts:81` 用它判斷失能** | ⚠◆ **最嚴重**，見下 |
| `hitFlashTimer` | `AnimationSystem.ts:18`（衰減）；**`PhysicsEngine.ts:135`；`HazardSystem.ts:135`；`CCManager.ts:192`；`SkillExecutor.ts:212`；`EffectSystem.ts:61`** | R SpriteUnitRenderer、selectSpriteFrame；S Animation（HIT 分支）、**`DirectorSystem.ts:158`** | ⚠◆ 6 個模組 |
| `visualOffset` | `AnimationSystem.ts:23–26`；**`SkillExecutor.ts:216,217`**（模擬內 `Math.random`） | R UnitBodyPainter | ⚠◆ |
| `trailHistory` | **`PhysicsSystem.ts:25–33`；`MotionEngine.ts:53,54`**；agentManager:126 | R UnitBody/FlightPainter | ⚠◆ 兩處各自 push（移動中可能一 tick 兩筆，長度上限也各寫一份：15 與 `TRAIL_HISTORY_LENGTH`） |
| `activeCCVFX` | `agentManager.ts:131`（只重設為 `[]`） | 無 | 死欄位 |

**`visualStatus` 靜態推論（待單元測試確認）**：tick 順序是 `controls.update`（game.ts:355）→ `combat.update`（364）→ BT → `animation.update`（391，最後）。`AnimationSystem` 對每個活著的單位，除了受擊閃光分支（`hitFlashTimer > 0.05`，line 48 直接 `continue`）以外，每條路徑都覆寫 `visualStatus`（`NONE`／`STASIS`／`DANGER`）。因此 `CCManager` 設的 `FROZEN`、`ControlSystem` 每 tick 重設的 `POLYMORPH`／`INVINCIBLE` 在渲染前就被抹掉，只會在受擊閃光那幾幀殘留；`PhysicsEngine.ts:81` 讀到的也是上一 tick 被覆寫後的值。這就是 `deathTimer` 同類的 bug（兩個寫入者互相抵銷），而且還多了「模擬讀視覺欄位」。

### 1.11 編輯器暫態（2）
| 欄位 | 寫入者 | 主要讀者 | 旗標 |
| :-- | :-- | :-- | :-- |
| `dragOverQ` `dragOverR` | `hooks/useGameInput.ts:148,149`（D11）；`UICommandSystem.ts:221–245` | R UnitVisualProcessor；DesignExporter | UI 狀態掛在引擎實體上 |

**debug 群組**：無專屬欄位（`deadLogged` 歸生命週期）。

### 1.12 `Agent.reset()` 漏清的欄位
`trajectory`、`facing`、`_savedCombatTarget`、`aiState`、`aiUpdateTimer`、`forceAiUpdate`、`escapeCooldown`、`dotDmg`、`hotVal`、`hasLandedLastStand`、`dragOverQ/R`。目前多半被下一場的生成或 BT 覆寫，但它是「重設清單與欄位宣告兩處各寫一份」的 SSOT 漏洞，所有權表要一併涵蓋。

### 1.13 前十名多寫入者／錯置欄位
1. `visualStatus`：4 個寫入者互相覆寫＋模擬讀視覺欄位（疑似 FROZEN／POLYMORPH／INVINCIBLE 畫面從未顯示）。
2. `hitFlashTimer`：6 個模組寫入，視覺欄位由模擬寫，Director 讀。
3. `hp`：7 個模組；3 條路徑直接設 0，擊殺歸屬（`lastHitSourceId`）依路徑而異。
4. `physics.*`：10 個模組；速度累加與位置改寫混用。
5. `isMoving`／`path`：7 個模組；`path` 與 `trajectory` 共用陣列。
6. `px`／`py`：7 個模組（含 UI hook）。
7. `trailHistory`：兩個生產者重複 push，視覺欄位由模擬寫。
8. `banished`：衍生值被 CC／Control／Zone／agentManager 四處寫。
9. `target`／`targetHex`：`CCManager` 寫 AI 狀態。
10. `aiState`：`CombatSystem`／`CastingEngine` 寫 AI 狀態；其次 `moveSpeedMult`（依執行順序）、`skillIds`（UI 直接寫）。

## 2. 系統層與渲染層的依賴

### 2.1 渲染 → `engine/systems/`
- `engine/renderer.ts:14–25`：`systems/visuals/effects/UnitShatter`、`systems/grid`、`systems/vfx`、`systems/vfx/render`、`systems/unit`、`systems/hud`、`systems/CameraSystem`、`systems/VisualSystem`、`systems/visuals/SequenceSystem`
- `renderers/HUDRenderer.ts:5`、`renderers/hud/TextPainter.ts:2` → `systems/hud`
- `renderers/RenderDispatcher.ts:7,12` → `systems/vfx/renderers/ParticleRenderer`、`systems/unit`
- `renderers/RenderList.ts:3,6` → `systems/vfx/state`（Particle 型別）、`systems/ZoneSystem`（ActiveZone 型別）
- `renderers/grid/GridOverlays.ts:5` → `systems/ZoneSystem`（ActiveZone）
- `renderers/grid/GridRenderStrategy.ts:2`、`renderers/grid/TerrainRenderer.ts:18` → `systems/grid/GridCache`
- `renderers/tactical.ts:2` → `systems/grid`

### 2.2 `engine/systems/` → 渲染
- `systems/grid.ts:12,15` → `renderers/RenderList`、`renderers/grid/GridRenderStrategy`
- `systems/grid/GridCache.ts:7` → `graphics/utils/HexGeometry`
- `systems/unit/UnitSystem.ts:10,13–17` → `renderers/RenderList`、5 個 `renderers/units/painters/*`
- `systems/vfx/VFXAmbience.ts:5`、`VFXPlayer.ts:12,14` → `renderers/RenderQuality`、`graphics/VFXFactory`
- `systems/vfx/render.ts:3`、`systems/vfx/renderers/ProjectileRenderer.ts:3` → `renderers/RenderList`
- `systems/vfx/renderers/painters/{Billboard,Ground,Procedural}Painter.ts` → `graphics/*`
- `systems/visuals/effects/UnitShatter.ts:7` → `renderers/RenderQuality`
- `systems/DesignExporter.ts:3` → `renderers/RenderSpec`

### 2.3 模擬 ↔ 表現的交叉
- **模擬呼叫渲染**：`game.ts:52`（`GameRenderer` 型別）、`game.ts:100`（`engine.vfx` getter 指向 renderer）、`game.ts:340`（`renderer.processVisualEvents`）。
- **模擬讀視覺欄位**：`PhysicsEngine.ts:81`（`visualStatus`）、`DirectorSystem.ts:158`（`hitFlashTimer`）。
- **模擬建立視覺資料**：`agentManager.ts` → `systems/unit/RagdollFactory`；`agentManager.ts:15`、`CCManager.ts:6`、`CombatSystem.ts:15` → `data/vfx/*`（飄字標籤與顏色）。
- **表現系統放在 `systems/` 並在模擬 tick 內執行**：`AnimationSystem`（game.ts:391）。
- **住在 `systems/` 但其實是渲染系統**：`grid.ts`、`hud.ts`、`unit/UnitSystem.ts`、`unit/UnitVisualProcessor.ts`、`vfx/**`、`visuals/**`、`VisualSystem.ts`、`CameraSystem.ts`（由 `renderer.ts` 擁有）。它們只 import `game` 的型別，沒有反向寫入模擬欄位（`AgentVFXSystem` 只讀 CC 計時器），所以**真正的循環只在目錄層級**，不是資料流層級。

### 2.4 建議
渲染系統整批 `git mv` 到 `engine/presentation/`（機械性搬移＋改 import 路徑），共用型別（`ActiveZone`、`Particle`、`GridCache` 的邊表）抽到 `engine/types/`。這和欄位所有權無關、風險低，可獨立排在最後一期。

## 3. 設計

### 3.1 寫入者分類（所有方案共用）
每個欄位在所有權表中屬於以下一種：
- **single**：只有擁有者模組可寫。
- **domain**：一組模組視為同一擁有者（例：狀態域＝`CCManager`＋`ControlSystem`＋`EffectSystem`；施法域＝`CombatSystem`＋`CastingEngine`＋`CooldownSystem`；移動域＝`MovementSystem`＋`MotionEngine`＋`map.ts`）。條件：同一 tick 階段、互相知道對方。
- **accumulator**：多個生產者只能 `+=`／`-=`，單一消費者積分或清除（`physics.vx/vy/vz/vAngle`）。
- **request flag**：多個生產者只能設 `true`，單一消費者清除（`forceAiUpdate`）。
- **lifecycle**（每欄另列）：`Agent.ts`（建構／`reset`／`saveState`）、`agentManager.ts`（生成、`handleDeadState` 重設）、`UICommandSystem.ts`（編輯器命令，只在暫停或佈陣時）。

跨域寫入一律改為下列之一：
1. **擁有者的寫入 API**：擁有者模組匯出純函式（例：`applyDamage(a, amount, sourceId)`、`stopMovement(a)`），呼叫端任意、寫入只發生在擁有者檔案內。這正是 `agentManager.handleDeadState` 現在的模式，同步、零配置。
2. **事件推導**：擁有者在自己的更新中讀本 tick 已池化的 `engine.events`（`DAMAGE`、`HIT_FX`、`CC_APPLIED`），不新增配置。視覺欄位優先用這種。
3. **`engine.bus` 通知**：只用於「發生了什麼」，不當作寫入代理。

### 3.2 方案比較

| | A：子物件分組 | B：獨立元件儲存（ECS-lite） | C：扁平 Agent＋所有權表＋守門測試 |
| :-- | :-- | :-- | :-- |
| 形狀 | `agent.status.stunTimer`、`agent.view.animState`，子物件建構時配置一次 | `engine.stores.status.get(id)` 或 SoA typed array | 欄位不動；`AGENT_FIELD_OWNERS: Record<AgentField, Ownership>` |
| 純資料 | 是 | 是（Agent 退化為 id） | 是 |
| 每 tick 成本 | 多一次指標存取（可忽略），零配置 | Map 查找或索引管理；渲染需要 join，風險最高 | 零（只在測試時執行） |
| 改動量 | 約 600+ 處參照改名，碰到幾乎所有系統、painter、測試；與 `feat/art-vfx` 等分支大量衝突 | 等同重寫引擎資料層 | 新增 2 檔＋1 基準檔；之後每期只改違規處 |
| 強制力 | 群組可給非擁有者 `Readonly<AgentStatus>`，tsc 擋 | 模組私有儲存，最強 | 測試擋（grep 規則）＋可選的 TS 唯讀視圖 |
| 弱點 | 只是重新命名，不會自己修掉多寫入者 | 成本與風險遠超收益 | grep 抓不到別名寫入（目前 0 處）；擁有者以檔案為單位 |

**推薦 C**。理由：零執行期成本、改動最小、可以棘輪方式（ratchet）逐步收斂，且已有先例（`tests/UIBoundary.test.ts`＋`tests/ui-boundary.baseline.json`）。A 的好處（群組邊界可見）可以用 C 的表格＋型別視圖取得，不必付全面改名的代價；只有「純視覺」群組在收斂成單一擁有者（`AnimationSystem`）之後，才值得考慮局部 A（`agent.view`，可選，P9）。B 不採用。

### 3.3 C 的具體內容
1. **`engine/core/AgentOwnership.ts`（SSOT 資料）**
   ```ts
   type AgentField = Exclude<keyof Agent, 'saveState' | 'reset'>;
   interface Ownership { group: AgentGroup; kind: 'single'|'domain'|'accumulator'|'flag';
     owners: readonly string[]; lifecycle?: readonly string[]; note?: string; }
   export const AGENT_FIELD_OWNERS: Record<AgentField, Ownership> = { ... };
   ```
   型別是 `Record<AgentField, …>`：在 `Agent` 新增欄位卻沒填表，`tsc` 直接報錯（完整性由編譯器保證）。
2. **`tests/AgentOwnership.test.ts`**：掃描 `engine/`、`components/`、`hooks/`、`data/`（排除 `Agent.ts`、`tests/`、`tools/`），對每個欄位用寫入正規式（`=` 但非 `==`、`++`、`--`、`+=`、`.push/.shift/.splice`、索引寫入、巢狀 `.x =`）找出寫入點；不在 `owners ∪ lifecycle` 的記為違規；accumulator 只允許 `+=`／`-=`，flag 只允許 `= true`。同名誤判（`behaviorTree.ts` 的 `id`、`ProjectileSystem.ts` 的 `id/team`、`GameEventPool.ts` 的 `team`）列在表的 `ignore`。
3. **`tests/agent-ownership.baseline.json`**：目前違規清單（`"field@file"`）。新增違規 → 測試失敗；基準裡有但已消失的項目 → 也失敗（強迫更新基準往下收斂，不能回漲）。
4. **（可選）TS 唯讀視圖**：`type AgentView = DeepReadonly<Agent>`，painter／`selectSpriteFrame` 的參數改用它，`tsc` 擋住渲染層寫入。純型別，零執行期成本。

### 3.4 各群組的目標擁有者
| 群組 | 擁有者 | 要收掉的域外寫入 |
| :-- | :-- | :-- |
| identity／stats | lifecycle（agentManager、UICommandSystem） | `UnitStatusTab.tsx:19` 改走 UICommand；`skills`／`bt` 初始化集中到 agentManager（`game.ts` 為 facade，需主代理同意） |
| vitals | `combat/DirectDamage.ts` 擴充為寫入 API（`applyDamage`／`applyHeal`／`applyLethal`，一律設 `lastHitSourceId`） | SkillExecutor、EffectSystem、ZoneSystem、PhysicsEngine、DamageCalculator 的直接寫入 |
| casting | 施法域 | `BTRegistry.ts:308` 的 `_interruptCooldown`；`castingAnimationTimer` 長期移至視覺群組 |
| AI | `ai/BTRegistry`＋`ai/TargetingSystem` | `CCManager.ts:136,137`（嘲諷已由 Targeting 依 `tauntTargetId` 處理）；`aiState` 的 `CASTING_*` 改由 `castingSkillIdx` 推導；`escapeCooldown` 衰減移到 CooldownSystem |
| locomotion | 移動域，新增 `movement/MotionCommands.ts`（`stopMovement`、`teleportTo`） | CC、SkillExecutor、Control、BT、Stacking 的停止／位移；`moveSpeedMult` 改為「每 tick 由 Movement 依 Hazard 結果重算」 |
| physics | `PhysicsEngine`（積分）；速度為 accumulator | 位置直接改寫（Zone、map、CC、SkillExecutor）改走 `MotionCommands.teleportTo` 或 PhysicsEngine API |
| status | 狀態域 | `PhysicsEngine.ts:88`、`ZoneSystem.ts:154`；`banished` 只由 Control 推導 |
| death | agentManager ✓ | — |
| visual | `AnimationSystem`（單一寫入者，從狀態計時器與 `engine.events` 推導） | 其他所有 `visualStatus`／`hitFlashTimer`／`visualOffset`／`trailHistory` 寫入；`PhysicsEngine` 改讀狀態計時器 |
| editor | UI 拖曳（D11 例外） | 長期移出 `Agent` |

`visualStatus` 拆法：狀態域新增 sim 欄位 `ccVisual: SpecialVisualStatus`（CC 施加時寫、到期清除，取代現在 CC／Control 對 `visualStatus` 的寫入）；`AnimationSystem` 每 tick 推導 `visualStatus = 死亡 ? NONE : ccVisual !== NONE ? ccVisual : actionState === EVADING ? DANGER : NONE`；`TargetingSystem` 不再寫 `DANGER`；`PhysicsEngine.ts:81` 改讀 `ccVisual`／`polymorphTimer`。

## 4. 分期遷移（交給低階代理）

共同驗證：每期 `npm run lint`、`npm test`、`npm run build`。標「BR」的期別再跑 `node tools/ui-e2e/br-soak.mjs --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`；標「R」的期別動到渲染輸出，主代理需本機實跑截圖並跑 `npm run perf:guard`；保真基準若有差異需逐項說明，不得直接重錄。每期都要讓 `agent-ownership.baseline.json` 只減不增。

**高風險欄位（先處理、單獨成期）**：`visualStatus`（會改變畫面）、`hp`（死亡路徑）、`physics`／`px`／`py`（大逃殺墜落與擊飛）、`path`（與 `trajectory` 別名，不可改成 `length = 0`）。

| 期 | 內容 | 檔案（≤3） | 驗證 |
| :-- | :-- | :-- | :-- |
| P0 | 所有權表＋守門測試＋目前違規基準 | `engine/core/AgentOwnership.ts`、`tests/AgentOwnership.test.ts`、`tests/agent-ownership.baseline.json` | lint／test／build；不改執行期行為 |
| P1a | 先寫失敗測試：對單位施加 POLYMORPH／ICE 暈眩後跑完整 tick，斷言 `visualStatus`；證實或推翻 §1.10 的推論 | `tests/VisualStatusOwnership.test.ts` | test（預期失敗即證實） |
| P1b | 新增 `ccVisual`；CC／Control 改寫 `ccVisual` | `Agent.ts`、`CCManager.ts`、`ControlSystem.ts` | lint／test／build、BR |
| P1c | `AnimationSystem` 單一推導 `visualStatus`；Targeting 移除 DANGER 寫入；Physics 改讀 `ccVisual` | `AnimationSystem.ts`、`TargetingSystem.ts`、`PhysicsEngine.ts` | P1a 轉綠、BR、R（變形／冰凍／無敵會開始顯示） |
| P2a | `hitFlashTimer`／`visualOffset` 由 `AnimationSystem` 從本 tick `engine.events`（DAMAGE／HIT_FX）推導；移除 SkillExecutor、CCManager 的寫入 | `AnimationSystem.ts`、`SkillExecutor.ts`、`CCManager.ts` | test、R；先確認事件在 animation 執行時仍在列表中、且這幾條路徑都會發事件 |
| P2b | 移除 Physics、Hazard、Effect 的 `hitFlashTimer` 寫入（缺事件就在同檔補發）；Director 改讀事件或保留唯讀 | `PhysicsEngine.ts`、`HazardSystem.ts`、`EffectSystem.ts` | test、BR、R |
| P3 | `trailHistory` 只留 `PhysicsSystem` 一個生產者，長度上限改用常數 | `MotionEngine.ts`、`PhysicsSystem.ts` | test、R（拖尾密度可能變化） |
| P4a | `DirectDamage.ts` 加 `applyHeal`／`applyLethal`，一律設 `lastHitSourceId`；SkillExecutor 改呼叫 | `DirectDamage.ts`、`SkillExecutor.ts`、`tests/DirectDamage.test.ts` | test、BR（死亡仍經 `handleDeadState`） |
| P4b | Effect、Zone、Physics 改呼叫 vitals API | `EffectSystem.ts`、`ZoneSystem.ts`、`PhysicsEngine.ts` | test、BR |
| P4c | `DamageCalculator.ts:144` 扣盾併入 `DirectDamage` | `DamageCalculator.ts`、`DirectDamage.ts` | test（DamageCalculator／DirectDamage 測試） |
| P5a | 新增 `movement/MotionCommands.ts`（`stopMovement` 以新陣列重設、不清 `trajectory`；`teleportTo` 含 `physics.x/y` 補償）；CCManager 改呼叫 | `MotionCommands.ts`、`CCManager.ts`、`SkillExecutor.ts` | test、BR、R（擊退／衝刺） |
| P5b | Control、BTRegistry、StackingResolver 改呼叫 `stopMovement`；Control 的放逐分支加 `if (path.length)` 避免每 tick 配置 | `ControlSystem.ts`、`BTRegistry.ts`、`StackingResolver.ts` | test、BR |
| P5c | `moveSpeedMult`：Hazard 改寫自己的 `hazardSpeedMult`（或回傳值），Movement 單一計算 | `HazardSystem.ts`、`MovementSystem.ts`、`MotionEngine.ts` | test、BR |
| P6 | Zone／map 的 `physics.z` 直接改寫改走 PhysicsEngine API；速度寫入在表中標為 accumulator | `ZoneSystem.ts`、`map.ts`、`PhysicsEngine.ts` | test、BR（縮圈墜落） |
| P7a | 移除 `CCManager.ts:136,137` 的 AI 寫入（靠 `tauntTargetId`＋`forceAiUpdate`） | `CCManager.ts`、`tests/` 一檔 | test、BR（`--assert-idle`） |
| P7b | `aiState` 的 `CASTING_*` 改為推導；`_interruptCooldown` 由 BT 改走施法域 | `CombatSystem.ts`、`CastingEngine.ts`、`BTRegistry.ts` | test、BR |
| P8 | `banished` 只由 Control 推導；`PhysicsEngine.ts:88` 改呼叫狀態域 API | `CCManager.ts`、`ZoneSystem.ts`、`PhysicsEngine.ts` | test、BR |
| P9 | 收尾：刪 `activeCCVFX`；`reset()` 補齊 §1.12；`UnitStatusTab` 改走 UICommand（並補強 `UIBoundary` 索引寫入規則） | `Agent.ts`、`agentManager.ts`、`UnitStatusTab.tsx` | test、build |
| P10（需主代理同意） | `game.ts` 內 `skills`／`bt`／`animState`／`actionState` 重設與 `escapeCooldown` 衰減移出 facade | `game.ts`、`agentManager.ts`、`CooldownSystem.ts` | test、BR |
| P11（可選） | 渲染系統 `git mv` 至 `engine/presentation/`；共用型別抽到 `engine/types/` | 機械性搬移 | lint／test／build、R |
| P12（可選） | 純視覺群組改為 `agent.view` 子物件（方案 A 局部採用） | 機械性改名 | 同上、perf:guard |

給低階代理的提示詞要寫明：受保護檔案（`docs/HANDOFF.md`、`CLAUDE.md`、`AGENTS.md`、facade）、每期只碰表中列出的檔案、不得放寬基準或門檻、不得新增「安全網」掩蓋症狀（HANDOFF §4 教訓 6）。

## 5. 實作紀錄（2026-10-16，分支 `claude/ownership-p0-p2-b2e595`）

| 期 | commit | 檔案 | 內容 |
| :-- | :-- | :-- | :-- |
| P0 | `70035ab` | `engine/core/AgentOwnership.ts`、`tests/AgentOwnership.test.ts`、`tests/agent-ownership.baseline.json` | 所有權表（目前只涵蓋 P0～P2 欄位，型別為 `Partial<Record<AgentField, …>>`，全部填完後改 `Record`）＋守門測試：掃 `engine/`、`components/`、`hooks/`、`data/`（排除 `Agent.ts` 與表本身、去註解），對每個欄位的 `=`／複合賦值／`++`／`--`／巢狀 `.x =`／索引寫入／陣列變異找寫入點；不在 `owners ∪ lifecycle` 即違規。基準雙向棘輪（新增違規失敗；基準內已消失的項目也失敗）。初始基準 9 筆，與 §1.10 的人工清單一致。 |
| P1a | `c2e6171` | `tests/VisualStatusOwnership.test.ts` | **證實**：以 `CCManager.applyCC` 施加冰屬性暈眩／變形／無敵後跑完整 `engine.tick`，6/6 tick 的 `visualStatus` 皆為 `NONE`（AnimationSystem 在 tick 最後覆寫）。STASIS 不受影響（AnimationSystem 自行由 `stasisTimer` 推導）。三個案例先以 `it.fails` 記錄，P1c 轉綠。 |
| P1b | `94a16eb` | `Agent.ts`、`CCManager.ts`、`ControlSystem.ts`（＋表、基準） | 新增狀態域欄位 `ccVisual`（`reset()` 會清）；CC／Control 對 `visualStatus` 的寫入機械式改寫為 `ccVisual`。 |
| P1c | `7f99584` | `AnimationSystem.ts`、`TargetingSystem.ts`、`PhysicsEngine.ts`（＋表、基準、P1a 測試） | AnimationSystem 每 tick（含受擊閃光分支）推導 `visualStatus = ccVisual ≠ NONE ? ccVisual : (未失能且 EVADING ? DANGER : NONE)`；Targeting 不再寫 DANGER（原本除 EVADING 外都會被覆寫，效果不變）；Physics 改讀 `stunTimer`／`polymorphTimer`。 |
| P2 | `e1de756` | `AnimationSystem.ts`、`SkillExecutor.ts`、`CCManager.ts`、`PhysicsEngine.ts`、`HazardSystem.ts`、`EffectSystem.ts`（＋表、基準） | `hitFlashTimer`／`visualOffset` 改由 AnimationSystem 匯出的 `triggerHitFlash`／`triggerHitShake` 寫入（§3.1 方式 1：擁有者寫入 API）。基準歸零。 |

**與原計畫的差異**
- P2 沒有採用「從 `engine.events` 推導」：墜落傷害事件沒有 `targetId`、擊退／拉扯完全不發事件、Hazard 在不發事件時也會閃光，且各路徑閃光時長不同（0.2／0.1／`HIT_FLASH_DURATION`）。改成事件推導需要先動 5 個檔案的事件格式並會改變畫面；寫入 API 讓行為逐位元相同（含 `Math.random` 呼叫順序），所有權一樣收斂到單一檔案。P2a／P2b 合為一個 commit。
- `DirectorSystem.ts:153` 仍唯讀 `hitFlashTimer`（計畫允許）。

**畫面行為變化（待主代理實機確認，R 項目）**
- 冰屬性暈眩、變形、無敵的外觀（`UnitBodyPainter` 的 POLYMORPH／FROZEN 分支、`GroundEffectPainter`、`OverheadPainter`、`GaugePainter`、陰影隱藏、`UnitAmbientPainter` 停用常駐特效）**第一次會真的顯示**。
- 變形中的飛行單位會失去懸浮（原作者意圖；以前因覆寫而從未生效）。
- 受擊閃光幀內的 `visualStatus` 不再沿用上一 tick 的殘值。

**驗證**：每期 lint／test／build 全綠；P1c 與 P2 各跑 `br-soak --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`。結果皆 20/20 乾淨、0 殘影、0 發呆（P2 第一次執行在 seed 1 前就因 `clickDice: dice button matched 0 elements` 中止；另以 Playwright 開頁確認引擎與按鈕正常、無 pageerror，重跑 20/20 乾淨，判定為測試工具啟動時序問題）。未跑 perf 系列、未截圖（GPU 由效能五使用中）。

## 6. 實作紀錄 P4a～P6（2026-10-18，分支 `worktree-agent-a15e0adc76891997b`，停在 P7a）

前提：基準 `agent-ownership.baseline.json` 在 P2 後已是 `[]`，本輪沒有可再刪的項目；做法是每期把「已完全收乾淨」的欄位加進所有權表（基準維持空、不得新增）。

| 期 | commit | 內容 |
| :-- | :-- | :-- |
| P4a | `71fe6cc` | `DirectDamage.ts` 新增 `applyHeal`、`applyLethal`，`applyDirectDamage` 多一個 `sourceId`（傳 id 就覆寫 `lastHitSourceId`；`null`＝環境／自傷，沿用先前歸屬）。`SkillExecutor` 的傷害、治療、吸血、反噬、斬殺全改呼叫（技能傷害的護盾已在 DamageCalculator 扣過，所以傳 `bypassShield = true`）。斬殺現在也會設擊殺歸屬。 |
| P4b | `04d8d82` | `EffectSystem`（HoT）、`PhysicsEngine`（虛空）、`ZoneSystem`（縮圈）改呼叫 `applyHeal`／`applyLethal`。`hp` 進表（owners＝DirectDamage；lifecycle＝agentManager、UICommandSystem）。 |
| P4c | `389eed4` | 新增 `absorbWithShield`，`DamageCalculator` 與 `applyDirectDamage` 共用。`shield` 進表（domain：DirectDamage 扣、CCManager 加）。 |
| P5a | `0bef912` | 新增 `movement/MotionCommands.ts`：`stopMovement`（`isMoving = false`、`path` 換新陣列、不動 `trajectory`）、`teleportTo`（換格、貼齊 px/py、`physics.x/y` 補償）。`CCManager`（所有 CC 停步、擊退／拉扯）與 `SkillExecutor`（突進）改呼叫；位置裁決仍在 `ForcedMove`，`teleportTo` 只套用結果。暈眩／定身／變形現在也會清 `path`（原本只清 `isMoving`；所有讀 `path` 的地方都先檢查 `isMoving`，無行為差異）。 |
| P5b | `92e15c1` | `ControlSystem`、`BTRegistry`（Idle）、`StackingResolver` 改呼叫 `stopMovement`；Control 的放逐／暈眩／定身分支加 `isMoving \|\| path.length` 守衛，不再每 tick 配置空陣列。 |
| P5c | `2ed188f` | 敵方危害減速改為純函式 `HazardSystem.getHazardSpeedMult`（站在 GRAVITY／ICE 格內，或在 GRAVITY 牽引半徑內，取最小值），`MovementSystem.updateMovement` 每 tick 算出後傳給 `MotionEngine`（有效速度 = `min(moveSpeedMult, 危害倍率)`）。`moveSpeedMult` 只剩 `MovementSystem` 一個寫入者（`MotionEngine` 抵達時的重設已移除：移動中的單位每次起步都會被 `MovementSystem` 重設）。`isMoving`、`path`、`trajectory`、`moveSpeedMult` 進表；`MovementSystem`、`MotionEngine` 的停步也改走 `stopMovement`。 |
| P6 | `51bdc87` | `PhysicsEngine.startVoidFall`（縮圈墜落）、`PhysicsEngine.absorbGroundShift`（換格時以 `physics.z` 吸收腳下高度差）；`ZoneSystem`、`map.ts` 改呼叫。所有權表新增 `accumulators`：清單內的檔案只准對 `physics.*` 做 `+=`／`-=`（衝量、牽引、瞬移補償），測試用 `nonAccumulatePattern` 擋其他寫法。`physics` 進表。 |

**行為變化（需主代理實機確認，R 項目）**
- 冰面／重力場的減速不再「黏著」：以前離開危害後會維持慢速直到下一次 AI 更新，現在離開當 tick 就恢復。
- 重力場的牽引半徑減速與以前相同，只是改在移動時計算。
- 擊退／拉扯／突進的位置補償與以前逐位元相同（同一組運算，只是搬進 `teleportTo`）；未實機截圖。

**停在 P7a：前提不成立**
設計假設「嘲諷靠 `tauntTargetId`＋`forceAiUpdate` 就夠」。實際上 `TargetingSystem.updateTarget` 的嘲諷強制鎖定只在 `updateTarget` 內執行，而 `updateTarget` 只有兩個呼叫點：`BTRegistry.HasTarget`（**只在目前目標失效時**才呼叫）與 `calculateOptimalTarget` 的後備。因此移除 `CCManager` 的 `target.target = source`，被嘲諷的單位會繼續打原本還活著的目標，嘲諷失效。要做 P7a 必須先讓 AI 端尊重嘲諷（例如 `HasTarget` 在 `tauntTimer > 0` 且目標不是嘲諷者時呼叫 `updateTarget`），這要改 `BTRegistry.ts`（P7a 檔案清單沒有）。P7b、P8 因此未做。

**未收的相關寫入（不在各期檔案清單內，已列出供後續）**
- `lastHitSourceId` 仍有兩個直接寫入：`CCManager.applyImpact`、`HazardSystem.applyHazardEffect`（兩處都已有 `sourceId` 可傳給 `applyDirectDamage`，改一行即可，之後 `lastHitSourceId` 就能進表）。
- `px`／`py` 沒進表：`PhysicsEngine` 的靜止回正、`map.ts`、`UICommandSystem`、`useGameInput`（D11 例外）各有合理寫入，待另行決定。

**驗證**：每期 lint／`vitest run --dir tests` 全綠，P4a、P4b、P5a、P5b、P5c、P6 各跑 `br-soak --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`，皆 10/10 乾淨、0 殘影、0 發呆；P4c 依表不跑 BR。未跑 perf 系列、未截圖。
