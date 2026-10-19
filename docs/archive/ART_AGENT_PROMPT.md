# 外出執行指令 #8：美術管線與奇幻 HD 素材導入（貼給 IDE 代理）

> 用法：`/goal docs/ART_AGENT_PROMPT.md`
> **前置條件**：
> 1. 音訊輪（`feat/audio`，**已含 U0**）已由主代理合併進 `main`。本輪在**新分支 `feat/art-fantasy-hd`**（由 `main` 開出）上進行；**不得在 `main`、`perf/*`、`feat/audio` 上工作、不得 push、不得合併**。開工時分支不存在 → 停下回報，不要自行從別的分支開。同一時間只能有一個代理在此工作樹執行。**若 `types.ts` 的 `WindowDef` 沒有 `visibleInManual`（U0 未完成）→ 停下回報。**
> 2. 素材暫存區 `C:\Git\_asset_staging\`（**在 repo 之外**）內有：`art\terrain_grid.jpg`（地形 2×5 材質表，AI 生成）、`sprites\`（**單位精靈圖集：10 張 `<team>_<role>_male.webp`＋`manifest.json`，由主代理以 Blender 離線預渲染 CC0 的 KayKit 角色產生**，格式見 §「精靈 manifest 格式」）、`tools\blender_scripts\`（`render_unit.py`、`pack_sprites.py`，產生上述圖集的腳本）、`docs\`（`ART_STYLE_BIBLE.md`、本檔、`AUDIO_AGENT_PROMPT.md`）。子資料夾 `art\ref_*\` 是使用者的風格參考稿，**不得複製進 repo**。**第一步先把 `docs\*.md` 複製進 repo 的 `docs\`（已存在者略過）、把 `art\terrain_grid.jpg` 複製到 `art-source\`、`sprites\*` 複製到 `art-source\sprites\`、`tools\blender_scripts\*.py` 複製到 `tools/assets/blender/`，並 commit**（任務 A0a 前置）。
>
> **背景決策（使用者全權授權主代理，2026-10-11）**：題材**奇幻**（FFT-like）；**保持六角格**；固定等距視角、不旋轉。**單位美術＝3D 預渲染精靈**（KayKit Adventurers，**CC0**，Q 版卡通風，先求有再求好；Blender 離線算圖：正交相機仰角 30°（＝引擎 `ISO_SCALE_Y=0.5`）、卡通色階＋深褐描邊、**四個斜向 SE/SW/NE/NW 全部原生渲染、不鏡射**，所以持握手／披風／配件在任何方向都一致）。陣營靠披風／布料色與護甲色調區分（BLUE＝獅心：皇家藍；RED＝灰燼軍團：深紅＋暗色護甲）。引擎採 ECS 精神（`Agent` 純資料，外觀由 renderer 讀 `data/units/appearance/` 設定），所以「換美術」＝換資料與繪製器，**不改模擬邏輯**。**體型軸**：外觀鍵是 `Team × Role × BodyType`（動畫與方向在 manifest 內）；**本輪只有 `MALE` 有素材**。`FEMALE` 先登錄為 `enabled: false`（日後以 Quaternius 等素材補、**只新增資料＋圖集、不改渲染器**），其餘體型（幼童、巨人、動物、神話生物）同理（詳見 `docs/ART_STYLE_BIBLE.md` §7、§11）。
>
> **整串一次跑完（無待核定事項）。** **不做**：push／動 `main`／合併、改 `engine/systems/**` 的遊戲邏輯、改 `Agent`（**唯一例外**：A2a 允許在 `Agent` 與 `types.ts` 新增一個**純資料可選欄位** `bodyType?: BodyTypeId`，不得新增方法；未設定時由資料表解析）、改 CSS/Tailwind、新增 npm 依賴（圖像處理用已有的 `playwright-core` 在瀏覽器 canvas 內處理）、引入 Three/Pixi/WebGL（`AGENTS.md` §1.4）、**自行執行 Blender 或重新生成精靈**（精靈由主代理負責；缺格／畫面有問題就在報告列出，不要自己改圖）。

---

## 精靈 manifest 格式（`art-source/sprites/manifest.json` → 複製為 `public/assets/units/manifest.json`）

```
{ version, cellPx: 256, anchor: {x:128, y:184.32}, pxPerWorldUnit, elevationDeg: 30,
  directions: ["SE","SW","NE","NW"], referenceHeightPx,
  units: { "<TEAM>:<ROLE>:<BODY>": {            // 例 "BLUE:TANK:MALE"
      file, atlas:{w,h}, idleHeightPx,
      anims: { idle|walk|attack|cast|hit|death: {
          fps, loop,
          frames: { SE:[{x,y,w,h,ox,oy},...], SW:[...], NE:[...], NW:[...] } } } } } }
```
- `{x,y,w,h}`＝裁切後的圖集矩形；`{ox,oy}`＝該矩形左上角相對**腳底錨點**的偏移（來源像素；繪製位置＝錨點＋偏移×縮放）。
- 動畫：`idle`(6 格，loop)、`walk`(6，loop)、`attack`(6)、`hit`(3)、`death`(6，播完停在最後一格)；`cast`(6) **只有 MAGE／SUPPORT 有**，其他職業沒有 `cast` 時**退回 `attack`**。每個方向的格數相同。
- 單位職業對應（KayKit）：TANK＝騎士（劍盾）、WARRIOR＝蠻族（雙手斧）、RANGER＝帽兜盜賊（弩）、MAGE＝法師（法杖＋帽）、SUPPORT＝法師無帽（法術書＋魔杖，白金／暗色長袍）。SUPPORT 目前是暫代造型，日後換專用神職模型。
- 全部圖集**共用同一相機與同一錨點**，故不同單位的相對大小與腳底基準一致；縮放用**單一全域比例**（`UNIT_SPRITE` 常數 ÷ `referenceHeightPx`），不要各單位各自正規化。

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程與守則**沿用 `docs/archive/PERF_AGENT_PROMPT.md` 的「指令本文」與「本輪額外規則」**（≤3 檔、lint/test/build、一任務一 commit、不 push、同題失敗 3 次就停、不 `as any`、常數進 `constants.ts`、渲染迴圈無 `console.log`、保留既有註解），差異：① 進度寫在新檔 `docs/ART_PROGRESS.md`；② 結束後在 `docs/archive/DECOUPLING_HANDOFF.md` 新增 §11「美術導入結果」；③ `e2e:ui` 只在 **[E2E]** 任務與 FINAL 跑（各連跑兩次）；④ 量測網址一律 `?quality=0`（並依音訊輪的規則帶 `?mute`）。

**先閱讀**：`AGENTS.md`、`docs/ART_STYLE_BIBLE.md`（尤其 §7、§11）、`docs/BAKED_RENDERING_DESIGN.md`、`docs/PERF_REPORT_3.md`、`types.ts`、`constants.ts`、`data/units/appearance/*`、`engine/renderers/units/**`（尤其 `painters/UnitBodyPainter.ts`、`factions/*Renderer.ts`、`painters/UnitShadowPainter.ts`、`UnitDeathPainter.ts`、`painters/UnitIndicatorPainter.ts`、狀態／光環繪製器）、`engine/graphics/units/*TokenFactory.ts`、`engine/renderers/grid/TerrainRenderer.ts` 與 `TerrainBlockCache.ts`、`engine/graphics/materials/MaterialPainter.ts`、`data/vfx/materialConfig.ts`、`engine/systems/unit/UnitSystem.ts`、`engine/systems/**/AnimationSystem*`（**只讀**，找出 `Agent` 上已衍生的動畫欄位：移動中、攻擊／施法進度、受擊計時、死亡計時、面向）、`engine/core/Agent.ts`（注意 `agent.facing`：BLUE=+1、RED=−1，僅左右）、`tools/ui-e2e/render-fidelity.mjs`。

**開工檢查**：分支必須是 `feat/art-fantasy-hd`；`git status` 乾淨；`npm run lint`、`npm test`、`npm run build`、`npm run e2e:ui`、`npm run perf:guard` 全綠。若 `docs/ART_PROGRESS.md` 已存在，從第一個未完成任務接續。

### 本輪「保真鐵律」的特別授權（取代 `docs/archive/PERF_AGENT_PROMPT.md` 的禁止重錄）

本輪是**預期的外觀變更**，因此：
- 每個美術任務（A1 地形、A2 單位）**完成後各允許重錄一次**對應的 fidelity baseline（A1：5 個地形場景 + `battle_frozen`；A2：`battle_frozen`），但必須同時**存下「改前／改後」並排對照圖**到 `tools/ui-e2e/out/art_before_after_*.png` 並寫進 `docs/ART_PROGRESS.md`。
- 重錄前必須先跑一次 `perf:fidelity` 確認「失敗原因＝預期的外觀改變」（不是 bug）；重錄後連跑兩次 `perf:fidelity` 必須 0 差異（決定性）。
- **不得放寬門檻**。其他任務（A0、A2e、A3）不得重錄。
- 所有新素材預設**開啟**，但每種都要有一個 `constants.ts` 開關可回退為舊的程序化外觀（`TERRAIN_SKIN.enabled`、`UNIT_RENDER_MODE: 'sprite' | 'procedural'`），舊程式碼保留不刪。

### 任務（依序）

`A0a` → `A0b` → `A1a` → `A1b` **[E2E]** → `A2a` → `A2b` → `A2e` → `A2c` **[E2E]** → `A3` → `REPORT` → `FINAL`（`U0` 已在音訊輪完成；`A2e` 需放在 `A2c` 之前，使 `A2c` 的 baseline 重錄一次涵蓋所有單位外觀變更）

| 任務 | 內容 | 檔案（≤3；測試/docs/tools/素材不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **A0a** | **素材目錄、授權制度、精靈入庫**：新增 `public/assets/`（Vite `base: './'`，**程式內一律以 `import.meta.env.BASE_URL` 組路徑**，不得寫死 `/assets/...`）；把 `art-source/sprites/*.webp` 與 `manifest.json` 複製到 `public/assets/units/`；新增（或補充，音訊輪可能已建立）`docs/ASSET_LEDGER.md`（表：檔名、類型、來源、作者或模型、授權、日期、來源網址或提示摘要、是否需致謝）與 `CREDITS.md`。登記：① **KayKit Adventurers Character Pack 1.0**（作者 Kay Lousberg，CC0，https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 ，2023；經 Blender 離線卡通渲染、改色後的衍生精靈 10 張，登記為「衍生自 CC0 素材」，致謝為**非強制但建議**列入 `CREDITS.md`）；② `terrain_grid.jpg`（Google Gemini 圖像生成，提示見 Style Bible §5）；③ 所有 `public/assets/units/*.webp` 與 manifest。`tools/assets/blender/README.md`：說明如何重現精靈（下載 KayKit、Blender 4.5、執行 `render_unit.py`／`pack_sprites.py` 的指令；**本代理不執行**）。 | docs、素材 | manifest 可被 JSON 解析；每個圖集檔存在；大小總和 ≤ 預算 |
| **A0b** | **素材驗證與地形處理工具**（不新增依賴）：① `tools/assets/verify-sprites.mjs`：用 `playwright-core` 無頭瀏覽器載入每個圖集並**逐格檢查**（矩形在圖集範圍內、每個單位每個動畫每個方向格數一致、10 個單位 × 必備動畫齊全、非空白像素），失敗就列清單並結束碼非 0；輸出 `tools/ui-e2e/out/assets_preview_units.png`（10 個單位 × 4 方向的 idle 第 0 格並排，供目視檢查持握手／披風四向連貫）。② `tools/assets/process-terrain.mjs`：把 `art-source/terrain_grid.jpg` 的 2×5 swatch **只裁內部**（偵測 swatch 外接框、各內縮 2% 去邊，忽略下方文字標籤；懸崖行的上緣苔蘚/冰緣/砂緣**保留**），輸出 `public/assets/terrain/<THEME>_top.webp` 與 `<THEME>_side.webp`（512×512），**頂面做無縫化**（鏡射偏移交叉淡化，四邊可拼貼）、**側面只做水平無縫**。腳本必須**可重跑、決定性**，並在 `tools/assets/README.md` 說明；預覽圖存 `tools/ui-e2e/out/assets_preview_terrain.png`（10 張材質）。 | tools、素材 | 腳本可重跑、輸出決定性；預覽圖可目視 |
| **A1a** | **地形材質貼圖化（TERRAIN_SKIN）**：`data/vfx/materialConfig.ts`（或 `constants.ts` 的新 `TERRAIN_SKIN`）新增 `enabled`（預設 true）、`texturePxPerHex`（貼圖縮放）、`sideTexturePxPerUnit`、`tintStrength`、`variantOffsets`（每個 variant 的貼圖位移，避免重複）、各主題貼圖路徑槽位（資料驅動，渲染器不得硬寫路徑）。新增 `engine/renderers/grid/TerrainTextureStore.ts`（純衍生資源快取：以 `Image`／`createImageBitmap` 載入、`createPattern`；載入完成前**維持舊程序化外觀**，完成後重烘焙 sprite 快取——需讓 `TerrainBlockCache` 的「材質簽章」把貼圖就緒狀態納入，簽章變動即清空）。`TerrainRenderer.paintBlock`（在**烘焙階段**進行，執行期仍是 sprite blit，不得每幀繪製貼圖）：頂面＝以六角形裁切後填入主題貼圖（沿用現有頂面的等距 Y 壓縮與 variant 位移）＋保留現有的邊緣高光/環境光遮蔽/高度明暗疊層（用 `tintStrength` 控制疊色）；側面＝側面貼圖水平拼貼並套現有側面明暗。MAGMA 的即時液面層與 VOID/MAGMA 浮動維持原行為。 | `TerrainRenderer.ts`、`TerrainTextureStore.ts`（新）、`materialConfig.ts` 或 `constants.ts` | lint/test/build；`TERRAIN_SKIN.enabled=false` 時 `perf:fidelity` 與改前 0 差異（證明可回退）；開啟時目視檢查 5 個主題 |
| **A1b** **[E2E]** | 單元測試（貼圖未就緒時回退舊外觀、簽章變動清空快取）；縮放 0.5×/1×/2×/3× 截圖（`tools/ui-e2e/capture-zoom.mjs`）目視不模糊／無接縫；**依「保真鐵律的特別授權」重錄 5 個地形 baseline 與 `battle_frozen` 各一次**，附前後對照圖；`perf:headed`（若存在）或 `perf:ab` 量測：**地形貼圖化後閒置 ms 不得比改前高 >5%**（因為仍是 sprite blit；超標就找原因：sprite 尺寸、未命中率、貼圖解析度）。`e2e:ui` 兩次 ALL PASSED。 | tools、baseline | 全綠；效能不退步 |
| **A2a** | **單位外觀資料（SSOT）＋體型軸＋圖集快取**：① `types.ts` 新增 `BodyTypeId = 'MALE' \| 'FEMALE'`（字串聯集，日後擴充）；`Agent`（`engine/core/Agent.ts`）新增**純資料可選欄位** `bodyType?: BodyTypeId`（**不得加方法**；既有序列化／複製／Design 匯出若會列舉欄位則一併處理）。② `data/units/appearance/bodyTypes.ts`（新）：`BODY_TYPE_PROFILE: Record<BodyTypeId, { label, enabled, heightScale, shadowScale, anchorYOffset, fallback: BodyTypeId \| null }>`（MALE：`enabled: true`、全 1.0、`fallback: null`；FEMALE：**`enabled: false`**〔尚無素材〕、`fallback: 'MALE'`）與 `BODY_TYPE_SPAWN`（`constants.ts` 或同檔：`weights`，MALE:1、FEMALE:0；**權重只對 `enabled` 的體型生效**，設計師可調）、純函式 `pickBodyType(agentId: string, matchSalt: number): BodyTypeId`（FNV-1a／mulberry 類雜湊後依有效權重抽取；**決定性、不消耗模擬用的 `random()`、禁止 `Math.random`**；沒有任何有效體型時回 MALE）與 `resolveBodyType(agent): BodyTypeId`（`agent.bodyType ?? 預設常數`；若該體型未 `enabled` 則沿 `fallback` 鏈退回，舊資料安全）。**使用者決策：預設就是「每個產生的單位隨機派發體型」**；要指定由戰場編輯器改（見 A2e）。③ 在 `data/units/appearance/` 新增 `sprite.ts`（與 `types.ts` 補型別）：`SPRITE_APPEARANCE[Team][Role][BodyTypeId] = { manifestKey, targetHeight, shadowRadius, flashStrength }`（以 helper 由共用預設產生，避免手抄）；`manifestKey` 形如 `BLUE:TANK:MALE`；查找函式 `lookupSpriteAppearance(team, role, body)` 依 `fallback` 鏈退回（FEMALE 缺 → MALE → `null`＝走 procedural），**渲染器不得出現 `'MALE'`／`'FEMALE'` 字面值**。④ `constants.ts` 加 `UNIT_RENDER_MODE: 'sprite' \| 'procedural'`（預設 `'sprite'`）與 `UNIT_SPRITE`（**單一全域縮放**〔目標單位高度 canvas unit，除以 manifest `referenceHeightPx` 得比例〕、方向切換滯後、受擊閃白時長、死亡淡出時長與下沉距離、`mipLevels` 等**所有調校數字**）。⑤ 新增 `engine/renderers/units/SpriteAtlasStore.ts`（純衍生資源快取：載入 `manifest.json` 與各圖集 `ImageBitmap`；**預烘焙「受擊白閃」剪影版本**（`source-atop` 填白一次，之後直接 blit）；**預烘焙縮小層級（mip）**：以 `createImageBitmap` 的 `resizeQuality: 'high'` 產生 ½、¼ 層，繪製時依「實際螢幕縮放」選最接近且不小於需求的層級，避免縮小取樣的閃爍／鋸齒；**懶載入**：只載入場上出現的（陣營,職業）圖集，其餘閒置時預取；提供唯讀 ready promise 與 `isReady(manifestKey)`；`?mute` 無關）。**本任務為授權的 6 檔例外**（`types.ts`、`Agent.ts`、`bodyTypes.ts`、`sprite.ts`、`SpriteAtlasStore.ts`、`constants.ts`；皆為資料／型別／純衍生資源，commit 說明）。 | ≤6（例外） | lint/test/build；單元測試（manifest 解析、key 查找、缺圖回退、`resolveBodyType` 預設與 `enabled`／fallback 鏈、10 組外觀齊全且每個 manifestKey 都存在於 manifest、mip 層級選擇純函式） |
| **A2b** | **SpriteUnitRenderer（逐格動畫）**：新增 `engine/renderers/units/factions/SpriteUnitRenderer.ts`，簽章同 `ImperialRenderer.draw(ctx, agent, t, isSilhouette)`；在 `UnitBodyPainter`（約第 179–181 行的陣營分派處）依 `UNIT_RENDER_MODE` 與圖集就緒狀態分派（未就緒或 `'procedural'` → 走舊的 Imperial/Covenant 渲染器，**舊程式碼不刪**）。① **選格純函式**（新檔放 `data/units/appearance/` 或同目錄，便於單元測試）`selectSpriteFrame(agentState, t) → { anim, dir, frameIndex }`：動畫優先序 **死亡 > 受擊 > 施法/攻擊 > 移動(walk) > idle**；`cast` 缺時退回 `attack`；攻擊／施法／受擊／死亡的格序以**進度**（`getCastProgress`、受擊與死亡計時，沿用 `AnimationSystem` 已衍生的欄位，**只讀、不改系統**）映射到 `0..frames-1`（死亡播完停最後一格）；idle／walk 以 `t × fps` 循環（依 `agent.id` 做相位偏移，避免整隊同步）。② **方向**：不鏡射；依 `agent.facing`（+1 面右、−1 面左）與垂直方向（單位**向畫面上方移動／攻擊上方目標**＝上，以位置差或目標相對位置判斷，並用 `UNIT_SPRITE` 的滯後常數避免來回閃）從四個原生視角選一：右下＝SE、右上＝NE、左下＝SW、左上＝NW；只有資料宣告 `mirrorFrom` 的缺圖方向才水平鏡射（目前沒有）。③ **繪製**：先 `resolveBodyType(agent)`、`lookupSpriteAppearance(...)`（全缺→procedural）；`BODY_TYPE_PROFILE` 的 `heightScale`／`shadowScale`／`anchorYOffset` 在此套用，**渲染器內不得出現體型字面值**；位置＝腳底錨點（對齊現有身體基線，使視覺高度與現有版面相當，不破壞血條、頭頂標示、選取圈位置）＋格的 `ox/oy`×全域縮放；`drawImage` 用整格矩形（來源像素，經 mip 層級換算）。**保留的程序化效果（輕量）**：受擊閃白（預烘焙剪影疊加）＋輕微抖動、出生淡入；**不再**做前衝／squash（有真動畫了）。`isSilhouette`（被遮擋剪影）：以預烘焙剪影版本低 alpha 繪製。**不得每幀建立漸層/離屏 canvas；不得使用 `shadowBlur`**（第二輪已證明是熱點）。舊科幻 core 光暈（`UnitCorePainter`）在 sprite 模式下**不繪製**。`UnitShadowPainter` 維持（地面陰影由引擎畫）。 | `SpriteUnitRenderer.ts`（新）、`UnitBodyPainter.ts`、`selectSpriteFrame` 所在檔（新，資料／純函式） | lint/test/build；單元測試（`selectSpriteFrame`：優先序、進度映射、cast→attack 退回、死亡停格、方向滯後）；目視 10 個單位 × 四向 × idle/walk/attack/受擊/死亡 |
| **A2e** | **體型隨機派發＋戰場編輯器可改**（使用者決策：**預設每個產生的單位隨機派發體型；要指定由玩家在戰場編輯器改，單位放置前、放置後都能改**；目前只有 MALE 有素材，所以實際上全為 MALE，但**機制要完整，日後 FEMALE 的 `enabled` 一打開就生效**）。① **產生時派發**：在 `engine/systems/agentManager.ts` 產生單位處（與 `a.role` 隨機同一區塊；若呼叫端已帶 `bodyType` 覆寫則尊重覆寫）設定 `a.bodyType = pickBodyType(a.id, matchSalt)`。**不得呼叫 `random()`／`Math.random()`**（否則會位移模擬用的種子序列，破壞 fidelity 決定性與「procedural 模式與改前逐像素相同」的驗證）。`matchSalt` 於每場開始／重置時取 `Date.now()`（fidelity 腳本已把 `Date.now` 合成化，所以量測仍決定性；正式執行每場不同）；salt 存放位置自行選最小侵入處（例如 `AgentManager` 的靜態欄位在 `RESET_GAME`／開局時刷新），**Agent 之外不得新增狀態到渲染器**。② **指令擴充**（`types.ts`）：`UICommand` 的 `PLACE_AGENT` 與 `EDIT_AGENT` 各新增可選欄位 `bodyType?: BodyTypeId`，由 `UICommandSystem`（及既有放置／編輯處理路徑）寫入 `Agent.bodyType`；`EDIT_AGENT` 改體型後立即反映在畫面（渲染器每幀讀 `resolveBodyType`，無需重建）。③ **UI**：`MapEditorToolbar`（放置前）新增「體型」選擇：`隨機`（預設，不帶欄位）＋**每個 `enabled` 的體型一個選項**（由 `BODY_TYPE_PROFILE` 產生，**不寫死**；目前只出現「男」，FEMALE 啟用後自動出現），以 `draftBodyType` 狀態傳入 `PLACE_AGENT`；`UnitInspectorBody`（放置後）新增體型下拉，沿用既有草稿提交流程送 `EDIT_AGENT`。文案走既有 i18n／標籤慣例（`BODY_TYPE_PROFILE.label`）。④ **測試**：純函式測試（`pickBodyType` 同輸入同輸出；權重 0 或未 `enabled` 時永不選到；**以測試用的假 profile 啟用兩種體型時，1000 個連號 id 的比例落在 40–60%**）；單元／整合測試（產生單位後 `bodyType` 已設、覆寫被尊重）；`e2e`：放置時選擇的體型寫入 `Agent.bodyType`、Inspector 修改後值更新（僅 MALE 啟用時以單一選項驗證流程；多體型的斷言用假 profile 在單元測試覆蓋）。**本任務為授權的 ≤9 檔例外**（`types.ts`、`agentManager.ts`、`UICommandSystem` 相關、`MapEditorToolbar.tsx`、`UnitInspectorBody.tsx`、放置狀態所在 hook／元件、`bodyTypes.ts`、`constants.ts`；皆為機械式小改動，commit 說明）。**不重錄 baseline**（此任務不改任何既有畫面像素；若 fidelity 有差異＝bug，要找出原因）。 | ≤9（例外） | lint/test/build/`perf:fidelity`（0 差異）/e2e×2（含新斷言） |
| **A2c** **[E2E]** | **死亡與狀態整合**：`UnitDeathPainter` 在 sprite 模式下改為「播放 `death` 動畫 → 停格 → 淡出＋輕微下沉」（沿用既有死亡事件與時序，只換繪製；若現有死亡時序比 `death` 動畫短，以時序為準、動畫按比例壓縮）；檢查狀態圖示／光環（`UnitAuraPainter`、狀態繪製器）在 sprite 上的位置仍正確；`UnitIndicatorPainter` 的隊伍標示與角色圖示保留（確認不與 sprite 衝突，必要時調位置常數）。**依特別授權重錄 `battle_frozen` 一次**（附前後對照圖）；`UNIT_RENDER_MODE='procedural'` 時應與改前逐像素相同（以暫時切換驗證後還原）。量測 `perf:headed`／`perf:ab`（`manual_battle`）：**sprite 模式戰鬥 ms 不得比改前高 >5%**（預期更低：少了大量路徑繪製）；超標就找原因並修（例如 mip 層級選錯、未預烘焙、每幀 `getTransform`）。`e2e:ui` 兩次 ALL PASSED（點選單位、拖曳、Inspector 等既有套件全過）。 | tools、baseline | 全綠；效能不退步 |
| **A3** | **特效粒子材質（輕量）與障礙物清單**：① 嘗試取得 **Kenney Particle Pack（CC0）**（kenney.nl 或 OpenGameArt 鏡像）；若網路可用，把選用的少量貼圖（光點、火花、煙、魔法圈、星芒，≤2 MB 總計）放進 `public/assets/vfx/`，登記 ledger（授權 CC0、來源網址、日期）；新增 `engine/renderers/ParticleTextureStore.ts`（以色彩鍵預烘焙著色版本，`source-in` 一次，之後 blit）並讓 `ParticlePainter` 在旗標 `VFX_SPRITES.enabled`（預設 true）時改用貼圖粒子；**旗標關閉時行為逐像素不變**；網路不可用或授權不明 → **跳過，並在報告註明**，不得偽造授權。② 盤點目前所有**障礙物／場景物件**（樹、岩石、水晶等：查 `data/` 與 `engine/renderers/grid/**` 的 obstacle 類型）與目前所有**程序化繪製的主要視覺元素**，輸出 `docs/ASSET_NEEDS.md`：每項的 key、用途、建議像素尺寸、錨點、是否需要多朝向，以便主代理後續以同一 Blender／素材管線或 Gemini 生成下一批（障礙物、道具、技能圖示、UI 圖示、FEMALE 與其他體型）。**本任務不生成障礙物貼圖。** | ≤3 檔 | lint/test/build/`perf:guard`（旗標關時 0 差異） |
| **REPORT** | `docs/ART_REPORT.md`：①各任務 commit 與結果②前後對照圖路徑（地形 5 主題、單位 10 個 ×4 方向、戰鬥畫面）③效能前後（閒置/戰鬥，附 GPU 字串與 DPR；圖集記憶體估算）④回退方式（各開關與 tag）⑤素材清單與授權摘要⑥**使用者目視檢查清單**（縮放時的清晰度／閃爍、四向持握手一致性、兩陣營辨識度、各職業辨識度、受擊/死亡、與 HUD 的重疊、單位大小與六角格比例）⑦未完成／建議（FEMALE 與其他體型、專用神職、障礙物、技能圖示、UI 圖示、更多動作格〔跑步、格擋、蓄力〕、更接近 FFT 的寫實比例、影格數與解析度取捨）。補寫 `DECOUPLING_HANDOFF.md` §11。 | docs | — |
| **FINAL** | 全量驗證：lint/test/build/`e2e:ui`（兩次）/`perf:guard`；工作樹乾淨、未 push；本地 tag：`art-ckpt-A1`、`art-ckpt-A2`、`art-ckpt-final`（完成當下就打）。 | docs | — |

### 本輪額外規則

- **取捨順序**（額度吃緊時）：`A0a/A0b → A2a/A2b/A2c（單位）→ A1a/A1b（地形）→ A2e → A3`，其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。**
- **效能預算**：本輪所有圖像素材都必須在「載入／烘焙階段」處理成可直接 `drawImage` 的資源；**執行期不得每幀做 `createPattern`、`createRadialGradient`、`getImageData`、濾鏡、`shadowBlur`**。`public/assets/**` 總大小本輪上限 **12 MB**；WebP 優先。**圖集解碼後記憶體**（約 10 個圖集 × 數 MB × 含 mip）要在報告估算；懶載入以避免一次全載。
- **載入體驗**：素材載入期間（通常 <1 s）維持舊程序化外觀，載入完成後平順切換，不得出現空白單位或空白地形；載入失敗（404/解碼錯誤）要**靜默回退**舊外觀並在 `console.warn` **一次**（非渲染迴圈內）。
- **決定性**：`render-fidelity` 的合成時間環境下，素材載入需在量測前完成（腳本等待 `window.__ASSETS_READY__ === true` 或等價旗標；請在素材 store 提供一個唯讀 ready promise，並在 fidelity/perf 腳本中等待它）。
- **不得改**：`Agent`（A2a 的可選資料欄位 `bodyType?` 除外）、`engine/systems/**` 邏輯、`types.ts` 的既有欄位語意。**不得自行重算或改動精靈圖**（找到問題就記錄於報告，由主代理處理）。
- 停工原則：只有遇到會導致產品功能壞掉、且本文件未涵蓋的情況才停下；其餘自行選擇最低風險、可回退的做法並記錄在報告。

---

## 回來後使用者要做的事（給人看）

1. 讀 `docs/ART_REPORT.md`，看前後對照圖（`tools/ui-e2e/out/art_before_after_*.png`）與 `assets_preview_units.png`。
2. 在主螢幕（239 Hz）開網頁看實際畫面：Showcase 與手動戰鬥各看一次；試縮放與兩陣營對戰；覺得地形／單位哪裡不對（比例、顏色、辨識度、動作）就列出來，由主代理調整後重新渲染。
3. 不滿意可把 `constants.ts` 的 `UNIT_RENDER_MODE` 改回 `'procedural'`、`TERRAIN_SKIN.enabled` 改回 `false` 立即回退。
4. 不要 push；合併進 `main` 前先等主代理審查。
