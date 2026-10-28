# TACTICAL.OS 系統架構白皮書

本文描述現行程式的責任分工；系統選單會一起下載本白皮書與獨立座標規格，白皮書中的常數佔位符由匯出器於下載時解析。（`components/ui/SystemMenu.tsx`、`hooks/useGameApp.ts`、`engine/presentation/DesignExporter.ts`）

## 1. 總覽與分層

- `GameEngine` 組合地圖、AI、移動、物理、戰鬥、狀態、縮圈及表現系統，並安排 tick 與生命週期；渲染入口由 `GameRenderer` 提供。（`engine/game.ts`、`engine/renderer.ts`）
- 模擬系統計算戰場狀態，presentation 衍生動畫並將事件映射為 HUD、序列與特效，renderers 負責提交、排序及 Canvas 繪製。（`engine/game.ts`、`engine/presentation/AnimationSystem.ts`、`engine/presentation/VisualSystem.ts`、`engine/renderers/RenderPipeline.ts`）
- UI 的遊戲操作透過 `UI_COMMAND` 交給 `UICommandSystem`；拖曳預覽座標與 `GameCanvas` 綁定 renderer 是現存的直接寫入用途。（`types.ts`、`engine/systems/ui/UICommandSystem.ts`、`components/GameCanvas.tsx`）
- 下載動作由 hook actions 傳入系統選單，元件不直接匯入匯出器。（`App.tsx`、`hooks/useGameApp.ts`、`components/ui/SystemMenu.tsx`）

## 2. 事件匯流排與狀態擁有權

- `EventBus` 以事件名稱對應 handler 集合，同步派發型別化通知，支援訂閱、取消與清空。（`engine/events/EventBus.ts`、`types.ts`）
- 戰鬥視覺事件先由 `pushEvent` 取得池化物件並排入佇列，tick 尾端透過 `GAME_EVENT` 通知音訊，再交給 renderer 處理視覺；它與即時 bus 通知是不同通道。（`engine/game.ts`、`engine/events/GameEventPool.ts`、`engine/systems/audio/AudioSystem.ts`）
- `Agent` 主要保存資料，仍有 `saveState`、`reset` 生命週期方法；欄位責任可查 ownership 定義，狀態效果保存在 `effects` 固定槽，其極性、控制及清除規則來自效果定義表。（`engine/core/Agent.ts`、`engine/core/AgentOwnership.ts`、`engine/core/Effects.ts`、`data/status/effect_defs.ts`）
- `AnimationSystem` 衍生動畫與 `view.visualStatus`，並衰減受擊閃光及位移；模擬端以 view commands 觸發受擊表現。（`engine/presentation/AnimationSystem.ts`、`engine/core/ViewCommands.ts`）

## 3. SSOT 地圖

- 全域型別入口為 `types.ts`，Agent、列舉及粒子細節分別在下列契約檔案。（`types.ts`、`engine/core/Agent.ts`、`engine/types/Enums.ts`、`types/VFXSchema.ts`）
- `constants.ts` 只轉發領域常數：幾何、戰鬥、配色、單位、HUD、地形、VFX、UI、渲染、音訊及 AI；新增參數應放入對應領域檔案。（`constants.ts`、`tests/ConstantsBarrel.test.ts`）
- 技能、AI 樹、效果規則及陣營外觀由資料表供應，烘焙材質與 VFX 零件參數分開管理。（`skillDatabase.ts`、`data/ai_profiles.ts`、`data/status/effect_defs.ts`、`data/units/factionSkin.ts`、`data/vfx/materialConfig.ts`、`data/vfx/parts/partConfig.ts`）

## 4. 座標協議摘要

- 完整層序、sortBias、座標空間與錨點協議以 `RenderSpec` 為準，另附的下載檔由它自身產生；本文僅列操作入口。（`engine/renderers/RenderSpec.ts`）
- 單位地面高度用 `getUnitGroundHeight`，受擊／身體錨點用 `getUnitAnchor`，發射錨點用 `getCoreAnchor`；繪製端共用 `UnitFrame` 快照，避免各 painter 重算高度。（`engine/math/VisualMath.ts`、`engine/renderers/frame/UnitFrame.ts`、`engine/renderers/RenderSpec.ts`）
- 指標逆投影集中在 `PointerProjector`；等角壓縮係數為 {{ISO_SCALE_Y}}、地塊高度尺度為 {{BLOCK_HEIGHT}}，值由匯出當下的常數模組提供。（`engine/math/PointerProjector.ts`、`constants/geometry.ts`、`engine/presentation/DesignExporter.ts`）

## 5. AI、選敵與尋路

- `AISystem` 將標準 AI 資料樹建成 Selector、Sequence、Condition 與 Action，行為實作由 registry 提供；目前建樹入口使用標準 profile。（`engine/systems/ai.ts`、`engine/behaviorTree.ts`、`engine/ai/BTRegistry.ts`、`data/ai_profiles.ts`）
- `TargetingSystem` 檢查存活、放逐、出界、地圖有效性及技能敵意，並計算地形影響後的射程；選敵參數集中於 AI 常數。（`engine/ai/TargetingSystem.ts`、`constants/ai.ts`）
- `Pathfinder` 使用優先佇列、成本與前驅記錄搜尋，透過 `SpatialProvider` 查詢地圖、障礙與單位，爬升判斷使用共用規則。（`engine/ai/Pathfinder.ts`、`engine/math/ClimbRule.ts`、`types.ts`）

## 6. 戰鬥與傷害

- 技能執行交由傷害計算器產生傷害、暴擊、斬殺、格擋、護盾與附帶資源結果，再由執行端套用；暴擊倍率為 {{DAMAGE_RULES.CRIT_MULTIPLIER}}。（`engine/systems/combat/SkillExecutor.ts`、`engine/systems/combat/DamageCalculator.ts`、`constants/combat.ts`）
- 斬殺依缺失生命追加基礎值，再套驟死倍率；治療不走坦克傷害減免分支，護盾吸收與直接傷害共用入口。（`engine/systems/combat/DamageCalculator.ts`、`engine/systems/combat/DirectDamage.ts`）
- `DirectDamage` 提供傷害、治療與致命歸零命令，將 HP 下限、治療上限與來源歸屬集中處理；狀態效果另由狀態系統更新。（`engine/systems/combat/DirectDamage.ts`、`engine/systems/status/EffectSystem.ts`）

## 7. 縮圈與背水一戰

- 縮圈先逐層移除，到達 minRadius 或整層移除將清空地圖時改為外圈逐格塌陷；實際移除本輪已警告的格子，保留最後安全格。（`engine/systems/ZoneSystem.ts`）
- 塌陷先處理格上單位，呼叫致命命令、清除放逐旗標、死亡處理及虛空掉落，再裁剪危害格、送出 `TILE_COLLAPSED` 並移除地形。（`engine/systems/ZoneSystem.ts`、`engine/systems/combat/DirectDamage.ts`、`engine/systems/status/ControlSystem.ts`）
- 剩下最後安全格時設定 `isLastStand` 與 `finalHex`，發出終局通知；傷害計算停用治療、致盲落空、坦克格擋及護盾吸收，並增加傷害，並非保證任意攻擊都立即致死。（`engine/systems/ZoneSystem.ts`、`engine/systems/combat/DamageCalculator.ts`）

## 8. 特效與詠唱預警

- 現行特效拓樸與工具入口另見管線地圖；事件路由至 HUD、VFX 與 Sequence，投射物則由獨立提交及零件 painter 繪製。（`docs/VFX_PIPELINE_MAP.md`、`engine/presentation/VisualSystem.ts`、`engine/presentation/vfx/renderers/ProjectileRenderer.ts`）
- 粒子分派讀取 `PARTICLE_TRAITS`，零件經參數量化、烘焙與快取後繪製；大型貼地效果由 GroundDrape 逐格鋪設。（`constants/vfx.ts`、`engine/renderers/vfxparts/PartSpec.ts`、`engine/renderers/vfxparts/VFXPartStore.ts`、`engine/renderers/GroundDrape.ts`）
- 詠唱預警對紅藍使用相同的存活、詠唱與範圍條件；施法者中心預警去重也不依敵我分流，色彩由陣營資料決定。（`engine/renderers/grid/GridRenderStrategy.ts`、`engine/renderers/grid/GroundPriority.ts`）

## 9. 單位外觀與素材

- 陣營外觀由 `getFactionSkin` 提供；圖集映射、體型與動畫選格分別由 appearance 資料及函式供應，SpriteUnitRenderer 消費它們。（`data/units/factionSkin.ts`、`data/units/appearance/sprite.ts`、`data/units/appearance/bodyTypes.ts`、`data/units/appearance/selectSpriteFrame.ts`、`engine/renderers/units/factions/SpriteUnitRenderer.ts`）
- 精靈選格依死亡、受擊、施法／攻擊、移動、待機優先序，缺少施法動畫時回退攻擊動畫，朝向包含垂直遲滯。（`data/units/appearance/selectSpriteFrame.ts`）
- 單位素材由圖集 store 管理，地形素材與地塊烘焙另有各自 store／cache。（`engine/renderers/units/SpriteAtlasStore.ts`、`engine/renderers/grid/TerrainTextureStore.ts`、`engine/renderers/grid/TerrainBlockCache.ts`）

## 10. HUD

- `EventHUDMapper` 將傷害、治療、控制與詠唱事件映射為浮動文字，HUD 系統管理浮字更新，HUDRenderer 繪製血條、量表及文字。（`engine/presentation/visuals/EventHUDMapper.ts`、`engine/presentation/hud.ts`、`engine/renderers/HUDRenderer.ts`）
- 血條與浮字的佈局參數集中於 HUD 常數，單位繪製錨點取自 UnitFrame。（`constants/hud.ts`、`engine/renderers/frame/UnitFrame.ts`、`engine/renderers/HUDRenderer.ts`）

## 11. 快取與品質階層

- VFXPartStore 快取鍵由參數與影格數構成，依品質階層限制條目及位元組並以 LRU 淘汰；觸控裝置另有限制策略。（`engine/renderers/vfxparts/VFXPartStore.ts`、`data/vfx/parts/partConfig.ts`）
- RenderQuality 可由查詢參數固定階層，或依視窗平均、降升階等待與冷卻調度；階層影響色調分級與 DPR，最大 DPR 為 {{RENDER_QUALITY.MAX_DPR}}。（`engine/renderers/RenderQuality.ts`、`constants/render.ts`）

## 12. 亂數與決定性

- 模擬流由 `random()` 提供，種子化後使用可重設序列；未種子化時回退 `Math.random`，測試可注入來源。（`engine/math/rng.ts`）
- 表現流使用 `Math.random`，不得消耗模擬序列；共用雜湊與 PRNG 演算法集中在 hash 模組，只有 rng 模組持有共用模擬亂數狀態。（`engine/math/rng.ts`、`engine/math/hash.ts`、`tests/RngSplit.test.ts`）
- 決定性驗證涵蓋亂數流隔離及同種子戰鬥重現，不能由此推論所有瀏覽器與任意輸入時序都完全一致。（`tests/RngSplit.test.ts`）

## 13. 音訊

- AudioSystem 訂閱遊戲事件及 UI 音訊命令，橋接共享 AudioEngine；戰鬥曲依場景選擇，播報與效果 cue 來自音訊資料表。（`engine/systems/audio/AudioSystem.ts`、`engine/audio/AudioEngine.ts`、`data/audio/music.ts`、`data/audio/cues.ts`）
- 音訊事件參數與音量相關預設由音訊常數供應。（`constants/audio.ts`、`engine/systems/audio/AudioSystem.ts`）

## 14. 自動化閘門

- MagicNumberBudget：阻擋受掃描引擎區域新增未列入預算的魔法數字。（`tests/MagicNumberBudget.test.ts`）
- color-literal-budget：由 MagicNumberBudget 比對色碼預算，阻擋色彩字面值增加。（`tests/MagicNumberBudget.test.ts`、`tests/color-literal-budget.json`）
- NoLocalHash：掃描雜湊特徵常數，阻擋演算法在共用數學模組之外重新散落。（`tests/NoLocalHash.test.ts`）
- ToolsReferenced：阻擋進版控工具腳本缺少可辨識入口。（`tests/ToolsReferenced.test.ts`）
- DocDrift：阻擋文件／註解失效路徑、部分檔頭名稱漂移與已移除狀態欄位名稱。（`tests/DocDrift.test.ts`）
- CoordinateProtocol：以只減不增基準阻擋繞過座標協議的既定違規增加。（`tests/CoordinateProtocol.test.ts`）
- RngSplit：阻擋模擬／表現亂數流混用，檢查同種子重現。（`tests/RngSplit.test.ts`）
- ConstantsBarrel：鎖定常數匯出集合與各匯出值的結構快照。（`tests/ConstantsBarrel.test.ts`）
- LayerBoundary：阻擋受掃描模擬檔案匯入表現層；音訊橋接目錄是測試明列的排除範圍。（`tests/LayerBoundary.test.ts`）
- WhitepaperDrift：阻擋白皮書佔位符無法在常數匯出解析，並驗證未知佔位符的匯出診斷。（`tests/WhitepaperDrift.test.ts`）
