# 字串鍵交叉引用稽核（2026-10-16）

守門測試：`tests/ReferenceIntegrity.test.ts`＋基準 `tests/reference-integrity.baseline.json`（棘輪：新增違規失敗、修好的項目要從基準刪掉，否則也失敗）。
沒有現存違規的規則直接寫成硬性斷言；有違規但需要設計的，列進基準。

## 總表

| 家族 | 狀態 | 已修 | 基準（只能縮小） |
| :-- | :-- | :-- | :-- |
| VFX 字串常值（`'FX_*'` 全掃描，含三元式、事件 text） | 乾淨 | — | 0 |
| VFX 組合鍵（詠唱崩解、AOE 崩解、`FX_HAZARD_FIELD_*`、hazard `spawnVfx`、`windupFx`） | 乾淨 | — | 0 |
| 技能序列 PARTICLE id | 壞 | — | `vfx.sequenceParticle` 49 組（81 個動作） |
| 技能序列陣營預設特效（`FX_HIT_{陣營}_{職業}`、`_HEAVY`、`FX_ULT_*_IMPACT`） | 潛伏 | — | `vfx.sequenceFallback` 13 |
| BEAM `style` | 無作用 | — | `vfx.beamStyle` 5 |
| 檢視器特效目錄 `vfx_library.ts` | 過期 | — | `vfx.libraryCatalog` 2 |
| 投射物：技能→定義 | 退回預設 | — | `projectile.skillKey` 1 |
| 投射物：定義→貼圖 | 退回 BOLT | — | `projectile.sprite` 6 |
| 投射物：無人引用的定義 | 死資料 | — | `projectile.orphan` 4 |
| 技能：id 唯一／id 編碼／自動配技／視覺設定雙向／VFXValidator 欄位 | 乾淨 | — | 0 |
| 狀態：`STATUS_VISUALS` 常值查表、`checkVFX` 鍵、id＝鍵 | 乾淨 | — | 0 |
| 狀態：循環粒子 | 壞 1 | — | `status.particle` 1 |
| 狀態：`SpecialVisualStatus` 對應條目 | 缺 1 | — | `status.specialVisual` 1 |
| DoT 顏色 `DOT_COLORS[dotType]` | **壞→已修** | 1 | 0 |
| AI 行為樹節點鍵 | 乾淨 | — | 0 |
| 場景／地形主題／障礙物 | 乾淨 | — | 0 |
| 單位精靈 Team×Role×BodyType→manifest | 乾淨 | — | 0 |
| 音訊（Cue／曲目／匯流排事件） | 乾淨（型別保證） | — | 不另設測試 |

## 已修

- **燃燒 DoT 顯示成毒綠色**：`CCManager` 只寫 `dotType = 'BURN' | 'POISON'`，但 `DOT_COLORS` 的鍵是 `FIRE`，`GroundEffectPainter` 地面氣流退回 `#a3e635`、`EffectSystem` 傷害字退回 `#10b981`。把鍵改成 `BURN`（顏色不變）。自 2026-04 引入 `DOT_COLORS` 起就是壞的。
- 小重構（無行為變更）：`engine/assets.ts` 匯出 `PROJECTILE_TEXTURE_KEYS`，讓測試讀同一份清單。

## 基準明細與判斷

- **`vfx.sequenceParticle`**：`GLOW`、`SMOKE_PUFF`、`SPARK` 是粒子型別不是登記鍵；`PROJ_*` 是投射物 id；`BEAM_RED_LINK`／`DRAIN_LINK`／`SLASH_CONNECT` 是光束樣式。都來自 `active_visuals`／`basic_visuals` 的 `vfxOverride` 混用與 `SkillSequences` 寫死的 `'GLOW'`／`'SPARK'`／`'SMOKE_PUFF'`。依 `ART_VFX_PLAN.md` §5 留給基本攻擊／主動技特效輪重做（拆 `hitFx`／`beamStyle`／`projectile`）。
- **`vfx.sequenceFallback`**：`FX_HIT_*_{TANK..SUPPORT}`、`FX_HIT_BLUE_HEAVY`、`FX_ULT_*_IMPACT` 不存在；只有技能缺 `visualHitEffect`／`vfxOverride` 時才會用到，目前每個技能都有自己的，所以畫面沒壞。新增技能若漏填就會靜默無特效。
- **`vfx.beamStyle`**：5 個 BEAM_SNIPE 奧義把 `vfxOverride`（命中特效 id）兼當光束 style。實際上 `VFXSystem.playBeam` 只存 `p.style`，`ProceduralPainter` 畫光束從不讀它——**所有 style 都畫成同一種光束**（`SLASH_CONNECT`、`DEATH_RAY` 也一樣）。待新增光束零件時一併處理。
- **`vfx.libraryCatalog`**：`FX_ULT_BLUE_AEGIS`、`FX_ULT_RED_NUKE` 在今天的奧義零件化（`6927b68`）移出登記表，檢視器「特效地圖」分頁還列著。純展示，無替代目標，交給下一輪改目錄文字。
- **`projectile.skillKey`**：`rr_a2`（爆裂散射）`projectileSpeed 1500` 但 `visual: 'SMASH'`、沒有 `visualProjectileEffect`，查不到定義退回 `DEFAULT_PROJECTILE`。要選哪種彈道是設計決定。
- **`projectile.sprite`**：`AssetManager.getProjectile` 只認 `ARROW／FIREBALL／BOLT／BOMB`；`HEX_DART`、`CRYSTAL`×2、`ORB`、`AXE`、`BEAM` 全部畫成 BOLT。`VFXFactory` 其實有 `BEAM`、`SLASH` 貼圖但被白名單擋掉。需美術。
- **`projectile.orphan`**：`PROJ_BLUE_WAVE` 沒有技能引用；`wb_u5`／`rr_u1`／`mr_u2` 以技能 id 當鍵，但三者 `projectileSpeed 0`、從不生成投射物。另：`ProjectileVisualDef.renderType`（`RAY`／`BEAM`）沒有任何渲染器讀取。
- **`status.particle`**：`STASIS.particleEffect = 'FREEZE_LOOP'` 未登記，而且 `AgentVFXSystem.checkVFX` 根本沒檢查 STASIS，雙重失效；無明顯對應特效。
- **`status.specialVisual`**：`AnimationSystem` 在逃生時把 `visualStatus` 設成 `DANGER`，但沒有 `STATUS_VISUALS.DANGER`，也沒有渲染器分支——只有檢視器下拉選單列出它。

## 只回報、未設測試

- `DOT_COLORS` 的 `VOID`／`ICE`／`COVENANT`／`IMPERIAL` 永遠查不到（`dotType` 只有兩種值）；`Agent.dotType` 型別是 `string`，收窄成 `'POISON' | 'BURN'` 可讓編譯器把關。
- `Skill.visualHitEffect` 只在基本攻擊序列與主動技後備序列使用，主動技／奧義序列改讀 `*_VISUALS.vfxOverride`；命中事件 `HIT_FX` 一律用陣營通用特效。
- 音訊 `CueId`／`TrackId`、匯流排 `EventMap`、`GameEventType`、`ParticleType`、`specialVisualStatus` 都是 TS 聯集型別，編譯期已檢查；檔案存在性由 `tests/AudioAssets.test.ts` 覆蓋。16 個匯流排事件都有發送者與訂閱者。

## 是否為「棄置的單位架構改造」遺留

證據不支持。依 `git log -S` 追溯：序列粒子 id 混用來自 2026-01 的 Kernel v9.3（`ef27a72`／`748f206`）；`FREEZE_LOOP`、`DANGER`、`BURN`／`FIRE` 來自 2026-04～05 的狀態特效輪；`PROJ_BLUE_WAVE` 等投射物來自 2025-12。單位精靈／體型管線（最近的單位改造）與自動配技全部乾淨。唯一新的債是今天奧義零件化留下的 2 個目錄條目。
