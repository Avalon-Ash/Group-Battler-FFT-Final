# 陣營外觀槽位（Faction Skin）

> 目標：現在用免費素材與程序化畫法，日後把手繪貼圖放進資料夾、改一行 manifest，就能換掉陣營辨識度的弱點，**不改程式**。
> SSOT：[`data/units/factionSkin.ts`](../data/units/factionSkin.ts)（`FACTION_SKINS`、`getFactionSkin()`）。渲染器只讀這張表，不再自己判斷 Team。

## 1. 單位身上「隨陣營改變」的視覺清單（改造後的來源）

| 視覺 | 讀取位置 | 皮膚欄位 | 貼圖槽 |
| :-- | :-- | :-- | :-- |
| 精靈圖集選擇 | `SpriteUnitRenderer.ts`（`lookupSpriteAppearance`，鍵 `TEAM:ROLE:BODY`）、`SpriteAtlasStore.ts:183` | `sprite.atlasKey` | 圖集仍走 `public/assets/units/manifest.json` |
| 精靈染色（目前皆 null） | `SpriteAtlasStore.bakeAtlas`（烘焙期） | `sprite.tint` | — |
| 棋座：底面、側面厚度、落地陰影 | `UnitFactory.generateTokenBase`、`PedestalGeometry.ts` | `pedestal.*` | — |
| 棋座頂面 | `UnitFactory.ts`（頂面步驟） | `pedestal.top*`、`textureBlend/Alpha` | `pedestalTexture` |
| 棋座邊框（Lionheart 乾淨金邊六角／Ashen 缺角焦黑斷邊） | `ImperialTokenFactory.ts`／`CovenantTokenFactory.ts` | `pedestal.rim*`、`ring` | `pedestalRim` |
| 棋座中央徽記 | 同上 `drawEmblem` | `pedestal.emblem*` | `emblem` |
| 職業字形（刻在棋座頂面） | `UnitFactory.drawEngravedGlyph`（烘焙進棋座） | `classIcon.color/glow/scale/alpha` | `classIcon` |
| 棋座核心（懸浮六角晶體） | `CoreFactory.generate`、`UnitCorePainter` | `core.*`（尺寸位置見 `CORE_VISUAL`） | `core` |
| 棋座/圖示繪製與快取 | `UnitShadowPainter.ts`、`engine/sprites.ts`（`getUnitImages`，鍵含 team/role/body/layout） | — | — |
| 投影常駐光（護甲縫／餘燼粒子） | `UnitAmbientPainter.ts` | `projection.*` | — |
| 飛行尾跡／殘影色 | `UnitFlightPainter.ts`、`UnitBodyPainter.ts` | `projection.trailColor` | — |
| 護盾描邊色 | `ShieldPainter.ts` | `shield.strokeColor` | — |
| 血條/選取框顏色 | `BarPainter.ts` | `hud.*` | — |
| 死亡碎片/靈魂/血噴 | `UnitShatter.ts` | `death.*` | — |
| 精靈載入前的退路圓盤 | `UnitBodyPainter.ts`、`UnitDeathPainter.ts` | `fallbackBodyColor` | — |

未納入（不屬本輪範圍）：`AgentVFXSystem.ts:80`（`FX_IDLE_RED/BLUE` 特效鍵）、`agentManager.ts:70` 出生事件色（仍讀 `FACTION_VISUALS.primaryColor`）、`GridRenderStrategy` 陣營高亮、技能特效。選取環目前沒有獨立繪製（選取只改血條邊框）。

## 2. 解析順序與退路

每個槽位查找：`slot:ROLE:BODY` → `slot:ROLE` → `slot`（越具體越優先）。找不到、檔案不存在或載入失敗 → **該槽走程序化畫法**，不會丟例外；警告只在非同步載入階段印一次，渲染迴圈零輸出。貼圖載入完成後 `factionTextureStore.revision` 遞增，`SpriteManager` 丟棄舊烘焙並重烘一次，每幀成本不變。

## 3. 如何新增手繪貼圖（不改程式）

1. 檔案放 `public/assets/factions/<blue|red>/`（PNG，透明背景）。
2. 在 `public/assets/factions/manifest.json` 登記，鍵為槽位名：

```json
{
  "version": 1,
  "factions": {
    "BLUE": {
      "pedestalTexture": "blue/pedestal.png",
      "pedestalRim": "blue/rim.png",
      "emblem": "blue/emblem.png",
      "classIcon:TANK": "blue/icon_tank.png"
    },
    "RED": { "classIcon": "red/icon.png" }
  }
}
```

3. 規格（`FACTION_TEXTURE_SPEC`）：
   - `pedestalTexture`／`pedestalRim`：**俯視**正方形 256 px，內切棋座外接圓（半徑＝正方形一半）；引擎負責等距壓扁，並以 FLAT 六角朝向繪製，POINTY 地圖自動旋轉 30°。頂面貼圖會被棋座輪廓裁切；邊框貼圖中央透明。
   - `emblem`：俯視 128 px，繪製邊長＝`2 × radius × emblemScale`。
   - `classIcon`：**俯視**字形 128 px，繪製邊長＝`2 × radius × classIcon.scale`，刻在棋座頂面（等距壓扁，不再是懸浮看板）。
   - `core`：直立看板 128 px（縮成 `CORE_VISUAL.canvasSize` 畫布），只換晶體本體，光暈仍由 `core.glow` 烘焙。
   - 鍵語法：`slot`、`slot:ROLE`、`slot:ROLE:BODY`（ROLE 為 TANK/WARRIOR/RANGER/MAGE/SUPPORT，BODY 為 MALE/FEMALE）。
4. 想改色調而非整張貼圖：改 `FACTION_STYLE`／`FACTION_SKINS` 或 `data/units/appearance/{imperial,covenant}.ts` 的顏色欄位；精靈染色用 `sprite.tint`。
5. 跑 `npx vitest run --dir tests tests/FactionSkin.test.ts`：驗證 manifest 鍵合法、檔案存在、每個 Team×Role×Body 皮膚完整。

## 4. 本輪佔位改進
- Lionheart：乾淨連續的金色六角邊框、皇家藍琺瑯頂面、金色小六角徽記。
- Ashen：缺角＋斷邊的焦黑六角、深紅頂面與餘燼裂縫、黑色缺角核心；邊框色由金橘改為焦鐵灰（`covenant.ts`）。
- 兩者皆有實體側面厚度與落地陰影；FLAT／POINTY 皆正確貼合六角。

## 5. 驗證
`node tools/ui-e2e/faction-shot.mjs --tag=<name>` 輸出 `tools/ui-e2e/out/faction/<tag>_{frozen,t300,pedestals}.png`（gitignored）。
