# VFX INVENTORY — 特效系統全量盤點與管線審查 (P1)

> **版本**：v1.0 (Performance Round 4 - P1)  
> **日期**：2026-10-12  
> **基準解析度**：2560×1440 @ 239 Hz, DPR 1 (RTX 4070)  
> **審查範疇**：`data/vfx/`、`engine/systems/vfx/`、`engine/systems/visuals/`、`engine/renderers/`、`engine/graphics/`

---

## 1. 盤點摘要

TACTICAL.OS 目前擁有兩套並存的視覺/特效管線：
1. **ECS-Particle 登記管線**（`VFX_REGISTRY`，共 **109** 個已登記資產）：由 `VFXPlayer` 讀取 `VFXAsset` emitter 配置，透過 `VFXStateManager` 粒子池生成粒子，經由 `VFXPhysics` 模擬，並由 `BillboardPainter`、`GroundPainter`、`ProceduralPainter` 繪製。
2. **直接程序化繪製管線（未登記於 `VFXRegistry`）**：包括 `HazardPainter`（地形危害格）、`ShieldPainter`（單位 3D 護盾稜柱）、`UnitAuraPainter`（詠唱法陣與奧義聖域）、`UnitShatter`（死亡碎片解體）、`TextPainter`（浮動傷害/詠唱破棄/Glitch 文字）、`ProjectileDrawer`（飛行物尾跡）、`GroundEffectPainter`（CC/DoT 地板光暈與煙霧）、`ZoneSystem`（地圖邊界崩塌與下墜）。

---

## 2. 全量特效清單 (VFX Inventory)

### 2.1 登記於 `VFX_REGISTRY` 的資產群 (共 109 項)

| 類別 | Key 前綴 / 代表性項目 | 定義檔 | 觸發事件 / 調用路徑 | 繪製函式 | 是否登記 | 生命週期 | 數量上限 | 繪製手法與資源特性 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **共享基礎** | `FX_TELEPORT`, `FX_SPAWN_BLUE`, `FX_SPAWN_RED`, `FX_CASTING_ULT`, `FX_CASTING_ACTIVE`, `FX_CAST_BREAK`, `FX_MASSIVE_IMPACT`, `FX_MUZZLE_FLASH` | `data/vfx/registry/shared.ts` | `GAME_EVENT` (`SPAWN`, `CAST_BREAK`, `PROJECTILE_SPAWN`, 等) | `ProceduralPainter`, `BillboardPainter` | **是** | 0.25s ~ 1.2s | `MAX_PARTICLES` (400) | `PILLAR` (3D 稜柱漸層)、`MAGIC_CIRCLE`、`SPARK` (離屏 Canvas 貼圖)、`screen` 混合 |
| **共享受擊** | `FX_HIT_GENERIC`, `FX_HIT_SHIELD_SPARK`, `FX_HIT_FIRE`, `FX_SELF_DAMAGE`, `FX_HEAL_BURST`, `FX_VAMP_BURST`, `FX_MANA_BURN`, `FX_MANA_RESTORE` | `data/vfx/registry/shared.ts` | `HIT_FX`, `DAMAGE`, `HEAL` | `BillboardPainter`, `GroundPainter` | **是** | 0.2s ~ 0.8s | `MAX_PARTICLES` | `SHOCKWAVE` (`shadowBlur=15`)、`SPARK` 貼圖、`screen` |
| **狀態光環循環** | `FX_STATUS_STUN_LOOP`, `FX_STATUS_SILENCE_LOOP`, `FX_STATUS_POISON_LOOP`, `FX_STATUS_BURN_LOOP`, `FX_STATUS_REGEN_LOOP`, `FX_STATUS_BANISH_LOOP`, `FX_STATUS_FEAR_LOOP`, `FX_STATUS_ROOT_LOOP`, `FX_STATUS_VULNERABLE_LOOP` | `data/vfx/registry/shared.ts` | `AgentVFXSystem.update` (每 0.3s~0.5s 補發) | `BillboardPainter` | **是** | 0.4s ~ 1.0s | 每單位單一循環 | 離屏貼圖 blit (`SPARK`, `SMOKE`, `ATMOSPHERE`), `screen` |
| **帝國受擊/主動** | `FX_HIT_BLUE_*` (Physical, Tech, Holy, Arcane, Ice), `FX_ACTIVE_BLUE_*` (Tech Shield, Holy Smite, Tech Burst, Frost Snap, Arcane Ripple) | `data/vfx/registry/imperial.ts` | 技能命中 / 施放 (`SkillExecutor`) | `BillboardPainter`, `GroundPainter` | **是** | 0.3s ~ 0.9s | `MAX_PARTICLES` | `HEX_GLOW`, `SHOCKWAVE`, `BLAST` (`shadowBlur=30`), `SPARK` |
| **帝國奧義** | `FX_ULT_BLUE_*` (Sanctuary, Kings Blessing, Aegis, Titan Smash, Final Defense, Thunder Slam, Daybreak, Excalibur, Bladestorm, Lightspeed, Glacial Burst, Starfall, Orbital Beam, Lockdown, Overload, Blackhole, Timestop, Torrent, Focus Beam, Intervention, Resurrection, Hymn, Wrath, Rain) | `data/vfx/registry/imperial.ts` | 奧義施放 (`SKILL_SEQUENCES`, `CombatSystem`) | `ProceduralPainter`, `GroundPainter`, `BillboardPainter` | **是** | 0.8s ~ 3.5s | `MAX_PARTICLES` | `GIANT_HEX`, `PILLAR`, `BLACK_HOLE` (徑向漸層+六角吸積盤), `DEATH_RAY`, `MaterialPainter.drawLayeredBeam` |
| **聖約受擊/主動** | `FX_HIT_RED_*` (Physical, Heavy, Blood, Magma, Fel, Shadow), `FX_ACTIVE_RED_*` (Shadow Scream, War Stomp, Blood Rage, Magma Eruption, Fel Splash) | `data/vfx/registry/covenant.ts` | 技能命中 / 施放 (`SkillExecutor`) | `BillboardPainter`, `GroundPainter` | **是** | 0.3s ~ 1.0s | `MAX_PARTICLES` | `CRACKS` (隨機多邊形裂痕), `SHOCKWAVE`, `RUBBLE` (物理重力碎片+投影) |
| **聖約奧義** | `FX_ULT_RED_*` (Guillotine, Plague, Undying, Nightmare, Blood Wall, Ragnarok, Bloodstorm, Demon Form, Unlimited Blade, Devastate, Railgun, Nuke Flash, Inferno, Headhunter, Doom, Meteor, Death Finger, Void Portal, Poison Rain, Soul Burn, Soul Web, Blood Pact, Voodoo, Blood Moon) | `data/vfx/registry/covenant.ts` | 奧義施放 (`SKILL_SEQUENCES`, `CombatSystem`) | `ProceduralPainter`, `GroundPainter`, `BillboardPainter` | **是** | 0.8s ~ 4.0s | `MAX_PARTICLES` | `DOMAIN` (3D 六角結界+漸層側壁), `BLACK_HOLE`, `DEATH_RAY`, 大量 `SMOKE` 與 `SPARK` |
| **背水決戰** | `FX_LAST_STAND_LOCKED`, `FX_LAST_STAND_RING`, `FX_LAST_STAND_CHAIN`, `FX_LAST_STAND_SOUL_PULSE` | `data/vfx/registry/last_stand.ts` | `GROUND_IMPACT: LOCKED`, 決戰觸發 | `GroundPainter`, `BillboardPainter` | **是** | 1.0s ~ 3.0s | `MAX_PARTICLES` | `HEX_GLOW`, `RING`, 鎖定地面粒子 |
| **危害場粒子** | `FX_HAZARD_FIELD_FIRE`, `FX_HAZARD_FIELD_POISON`, `FX_HAZARD_FIELD_ICE`, `FX_HAZARD_FIELD_GRAVITY`, `FX_HAZARD_FIELD_GENERIC` | `data/vfx/registry/hazards.ts` | `HAZARD_SPAWN` 事件 | `GroundPainter` (`drawFireField`, `drawIceField`, 等) | **是** | 4.0s (固定鎖定) | 每格上限 1 (`HAZARD_FIELD_MAX_PER_CELL`) | `GRID_FIELD` 向量幾何 / `MaterialPainter` 噪聲貼圖 |

---

### 2.2 未登記於 `VFX_REGISTRY` 的直接繪製系統

| 類別 | Key / 識別 | 實作檔案 | 觸發來源 / 呼叫端 | 繪製函式 | 是否登記 | 生命週期 | 數量上限 | 繪製手法與效能特徵 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **網格危害區** | `FIRE`, `POISON`, `ICE`, `GRAVITY`, `GENERIC` | `engine/renderers/grid/painters/HazardPainter.ts` | `GridRenderStrategy` 逐格巡覽 `spatialHazards` | `HazardPainter.draw` | **否** (讀取 `data/vfx/hazard_visuals.ts`) | 由 `hazard.duration` 決定 | 無（全地圖危險格數） | 3 層體積霧 (煙霧貼圖 3 次 drawImage)、熔岩波浪 (`SurfacePainter`)、3D 冰柱擠出 (`VolumePainter.drawExtrusion`)、虛空黑洞 (`shadowBlur=20`, 旋轉渦流線) |
| **單位 3D 護盾** | `SHIELD` | `engine/renderers/status/painters/ShieldPainter.ts` | `RenderPipeline` 繪製單位時 | `VolumePainter.draw3DPrism` | **否** | 隨護盾值存亡 | 依有護盾單位數 (最多 10) | **高耗點**：每個護盾每幀調用 `createLinearGradient` 6 次（6 個面），雙層掃描線 |
| **技能詠唱法陣** | 普通詠唱法陣 | `engine/renderers/units/painters/UnitAuraPainter.ts` | 單位 `castingSkillIdx !== -1` | `UnitAuraPainter.drawCastingVFX` | **否** | 詠唱期間 (1~2.5s) | 依詠唱單位數 (最多 10) | **高耗點**：每單位每幀 `shadowBlur = 12`，雙重旋轉六邊形邊界，上升光點粒子 |
| **奧義詠唱聖域** | 奧義法陣與神聖柱 | `engine/renderers/units/painters/UnitAuraPainter.ts` | 單位施放 ULT 詠唱 | `UnitAuraPainter.drawUltimateChantVFX` | **否** | 奧義詠唱期間 (2~4s) | 同時詠唱單位數 | **高耗點**：每幀 `shadowBlur = 20`，超大六邊形法陣，虛線符文環，垂直光柱填充 |
| **單位死亡碎裂** | `UnitShatter` | `engine/systems/visuals/effects/UnitShatter.ts` | `AGENT_DIED` 事件 | `UnitShatter.spawn` 派發粒子至 `VFXSystem` | **否** | 3.5s ~ 4.5s | 每名死亡單位 16~20 個粒子 | 拆解角色 Base, Rim, Core, RoleIcon 畫布為 SPRITE 粒子，加 12~16 個水晶碎屑，帶重力彈跳與落地旋轉 |
| **浮動文字與數字** | 傷害、治療、暴擊、吸收、CC、KILL_STREAK | `engine/renderers/hud/TextPainter.ts` | `DAMAGE`, `HEAL`, `KILL_STREAK` | `TextPainter.drawFloatingText` | **否** | 1.0s ~ 1.5s | `MAX_ACTIVE_TEXTS = 60` | 描邊文字、縮放彈跳、`KILL_STREAK` 特殊粗體字體 |
| **技能呼喊與破棄** | SHOUT (詠唱名稱、成功昇華、破棄 Glitch) | `engine/renderers/hud/TextPainter.ts` | `CAST_START`, `CAST_BREAK`, 技能完成 | `TextPainter.drawFloatingText` (SHOUT 分支) | **否** | 詠唱時間 + 0.5s | 每單位 1 條 | **高耗點**：`createLinearGradient` 掃描背景，`shadowBlur=10~20`，破棄時 RGB Split 三色分離重繪，`Math.random()` 每幀亂流抖動 |
| **飛行物與尾跡** | 普通投射物、奧義投射物 | `engine/renderers/ProjectileDrawer.ts` | `RenderList` 收集飛行物 RenderOp | `ProjectileDrawer.draw` | **否** (讀取 `PROJECTILE_VISUALS`) | 飛行時間 (0.3s~1.5s) | 飛行中投射物數 | **高耗點**：帝國尾跡每幀調用 `createLinearGradient`；聖約尾跡逐段 `stroke()` 迴圈 |
| **光束與連線** | `BEAM`, `SLASH_CONNECT`, `GENERIC_BEAM` | `engine/systems/vfx/renderers/painters/ProceduralPainter.ts` | `VISUAL_BEAM`, `VISUAL_SLASH` | `ProceduralPainter.drawBeam` | **否** (作為 Particle.type 繪製) | 0.2s ~ 0.4s | 活躍光束數 | `MaterialPainter.drawLayeredBeam` 或 legacy 模式下的 `createLinearGradient` |
| **狀態地面光暈** | `POISON`, `REGEN`, `ROOT`, `FROZEN`, `POLYMORPH` | `engine/renderers/status/painters/GroundEffectPainter.ts` | 單位身上有對應 CC / Buff | `GroundEffectPainter.draw` | **否** | 隨 Buff 持續時間 | 帶狀態單位數 | `ROOT` 帶 `shadowBlur=10`；`REGEN` 每幀繪製旋轉十字粒子；`POISON` 4 條上下波動毒氣線 |
| **AOE 預警範圍** | 網格 AOE Telegraph | `engine/renderers/grid/GridRenderStrategy.ts` | 單位詠唱且有 `currentTelegraph` | `GridOverlays.drawOverlay` | **否** | 詠唱期間 | 覆蓋格數 | 網格輪廓線與呼吸光暈填充 |
| **地圖縮圈崩塌** | 邊界墜落六角格 | `engine/systems/ZoneSystem.ts` + `GridRenderStrategy` | 縮圈時間觸發 | `GridRenderStrategy` 墜落 Op | **否** | 墜落直至超出螢幕 | 崩塌邊緣格數 | 依負 Z 計算 2.5D 偏移並漸隱透明度 |

---

## 3. 可疑項與效能隱患分析 (Suspicious Items)

### 3.1 同一事件被多處重複繪製 (Redundant Dual Rendering)
- **危害區雙重管線**：
  - 當 `HazardSystem` 產生危害區（如火、毒、冰）時，發送 `HAZARD_SPAWN` 事件。
  - **管線 A**：`EventVFXMapper` 監聽到 `HAZARD_SPAWN`，透過 `VFXSystem.playEffect` 產生 `GRID_FIELD` 粒子，由 `GroundPainter.draw` 繪製熔岩/冰面/毒池貼圖。
  - **管線 B**：同時間，`GridRenderStrategy` 在網格渲染層檢索該格的 `getSpatialHazardsAt(q, r)`，並調用 `HazardPainter.draw` 繪製 3 層體積煙霧、液體、裂紋或擠出冰柱！
  - **結論**：同一個危害區在同一個畫布位置被**兩個獨立系統各畫了一次**，消耗兩倍的繪製呼叫。

### 3.2 渲染熱點中的物件與漸層分配 (Allocation & Gradient Churn)
- **`VolumePainter.draw3DPrism` (60+ 漸層/幀)**：
  - 繪製 3D 稜柱側面時，在 `for (const i of indices)` 迴圈內**針對每個面**執行：
    ```ts
    const grad = ctx.createLinearGradient(0, v1.y - height, 0, v1.y);
    ```
  - 當 10 個單位皆有護盾（`ShieldPainter`）或詠唱領域（`drawHexDomain`）時，每幀呼叫 60 次以上的 `createLinearGradient`。
  - 對於 `SOLID` 樣式，漸層兩個 stop 甚至都是同色（`grad.addColorStop(0, color); grad.addColorStop(1, color);`），純屬無謂開銷。
- **`VolumePainter.drawExtrusion` (重複漸層)**：
  - `HazardPainter` 畫冰柱時，在 `for (const i of indices)` 內部重複執行 3 次完全相同的 `ctx.createLinearGradient(0, -height, 0, 0)`（與迴圈索引 `i` 無關）。
- **`ProjectileDrawer.ts` (每幀每發投射物建立漸層)**：
  - 帝國投射物尾跡每幀計算 `ctx.createLinearGradient(x, y, endX, endY)`。
- **`TextPainter.ts` (SHOUT 詠唱條漸層)**：
  - 每個正在詠唱呼喊的文字每幀 `createLinearGradient(-halfW, 0, -halfW + revealW, 0)`。
- **`VFXPlayer.processEmitter` (每幀陣列分配)**：
  - 檢查危害區粒子上限時，執行 `system.state.particles.filter(...)`，每次生成粒子都會建立全新陣列遍歷所有粒子。

### 3.3 高負載熱路徑中的 `shadowBlur` 累加 (Shadow Blur Thrashing)
Canvas 2D 的 `shadowBlur` 是極度高昂的 CPU/GPU 軟體模糊光柵化操作。目前在全特效齊發情境下，每幀有大量的 `shadowBlur` 被反覆啟用：
1. `UnitAuraPainter.ts:33`：普通詠唱 `shadowBlur = 12`（每詠唱單位 1 次/幀）。
2. `UnitAuraPainter.ts:81`：奧義詠唱 `shadowBlur = 20`（每奧義單位 1 次/幀）。
3. `GroundPainter.ts:200`：衝擊波 / 爆炸 `shadowBlur = 15 ~ 30`（每個衝擊波 1 次/幀）。
4. `HazardPainter.ts:135`：重力黑洞 `shadowBlur = 20`（每危害格 1 次/幀）。
5. `TextPainter.ts:94, 194, 201`：呼喊文字昇華/詠唱進度 `shadowBlur = 10 ~ 20`。
6. `GroundEffectPainter.ts:34`：禁錮 CC `shadowBlur = 10`。
7. `UnitCorePainter.ts:31`：單位受創 `shadowBlur = traumaBlur` (4 ~ 28)。

### 3.4 每幀使用 `Math.random()` 重算的視覺 (Jitter & CPU Churn)
- `TextPainter.ts:35`：文字打斷碎裂每幀 `translate((Math.random()-0.5)*10, ...)` 造成亂流抖動。
- `TextPainter.ts:116-137`：破棄 Glitch 效果每幀多次 `Math.random()`。
- `GroundPainter.ts:91, 154`：非 Material 模式下，裂紋方向與毒氣泡泡位置每幀隨機重新採樣。

### 3.5 確定為死碼的資產與檔案 (Dead Code)
- `data/vfx/beam_visuals.ts`：定義了 `BEAM_VISUALS`，但全專案無任何檔案引用它。
- `data/vfx/cast_visuals.ts`：全專案無任何引用。
- `data/vfx/procedural_visuals.ts` 以及 `data/vfx/procedural/` 目錄下的 5 個檔案（`pillar_visuals.ts`, `domain_visuals.ts`, `hex_visuals.ts`, `beam_visuals.ts`, `grid_visuals.ts`）：定義了大量 procedural 資料物件，但除自身相互匯入外，全專案無任何外部引用。
- `data/vfx/vfx_library.ts`：僅供檢視器頁籤 `VFXMapTab.tsx` 讀取，戰鬥主管線未引用。

---

## 4. 壓力情境重現驗證 (`battle_vfx_storm`)

在 `tools/ui-e2e/lib/vfx-storm.mjs` 中，透過模擬全戰場極限狀況：
- 10 名單位同時施放技能（涵蓋圓形、環形、AOE 預警 telegraph 與詠唱法陣）。
- 每 600ms 循環觸發多發 `VISUAL_BEAM`、`VISUAL_SLASH`、`PROJECTILE_SPAWN/HIT` 與 `IMPACT_AOE`。
- 模擬單位死亡觸發 `AGENT_DIED`（啟動 `UnitShatter` 實體碎裂）、`DEATH`、`CAST_BREAK`。
- 連續生成 30+ 傷害/暴擊/吸收浮字與 SHOUT 呼喊條。
- 持續施加 POISON、REGEN、SHIELD 狀態，觸發體積稜柱與地面氣流。

**基準測試結果對照 (2560×1440 @ 239 Hz, RTX 4070)**：
- `battle_calm`（一般交戰）：Median 8.4 ms, p90 12.6 ms, p99 **20.9 ms**, 1% Low 34.5 FPS.
- `battle_vfx_storm`（全特效齊發）：Median 8.4 ms, p90 12.6 ms, p99 **20.8 ms**, Max **62.5 ms** (掉至 ~16 FPS 瞬間釘選), 1% Low 39.3 FPS.

CDP Tracing 歸因顯示：**100% 的 >16.7 ms 長幀皆發生在 Canvas Render / VFX 繪製階段**，瀏覽器 Layout / DOM / React 提交耗時為 0 ms。長幀的核心瓶頸在於 Canvas 狀態切換、`shadowBlur` 光柵化、重複漸層建立與多層重複繪製。

---

## 5. 後續優化指引 (For P2 & P3)

依成本推估，P3 的高回報候選項目排序如下：
1. **`VolumePainter.draw3DPrism` 漸層快取/移除**：消除 60+ 次/幀的 `createLinearGradient`；SOLID 樣式直接改用 `fillStyle = color`；GRADIENT_FADE 改用單一快取或垂直預烘焙 sprite。
2. **`GroundPainter` 與 `HazardPainter` 危害區重複繪製去重**：確保同一格危害區僅由單一管線繪製，避免多重疊加。
3. **熱路徑 `shadowBlur` 移除或快取化**：將 `UnitAuraPainter`（法陣光暈）、`GroundPainter`（衝擊波）的即時 `shadowBlur` 替換為 `GlowSpriteCache` 離屏貼圖或去發光優化。
4. **浮動文字與 SHOUT 漸層/抖動快取**：快取文字進度條漸層，種子化隨機雜訊，限制同時浮字數量。
