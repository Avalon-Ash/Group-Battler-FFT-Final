// ╔══════════════════════════════════════════════════════════╗
// ║  ccBody — 控制狀態的「本體替換」外觀表（變羊、冰塊）       ║
// ║  職責：Blender 烘焙的羊與冰塊圖集（public/assets/cc_bodies） ║
// ║        的路徑、繪製倍率、跳動與透明度；只有數據，沒有繪製    ║
// ║  [ARCH] 圖集由 tools/assets/blender/render_cc_body.py →       ║
// ║  pack_cc_body.py 產生，四向（SE／SW／NE／NW）原生渲染，方向   ║
// ║  依 selectSpriteDirection 與單位精靈同一套選取。錨點＝格子    ║
// ║  中心的地面點（manifest 的 ax／ay），畫在單位局部座標、腳底   ║
// ║  貼 UNIT_SPRITE.footOffsetLocal，所以不新增座標／排序規則     ║
// ║  （RenderSpec §4 精靈繪製原點）。新羊無項圈，兩隊共用。       ║
// ║  render_status_art.py → pack_status_art.mjs，四向各四幀。   ║
// ╚══════════════════════════════════════════════════════════╝

/** 圖集位置（manifest 與各類型圖檔都在這個資料夾，URL 以 resolveAssetUrl 解析） */
export const CC_BODY_ASSETS = {
    dir: 'assets/cc_bodies',
    manifestPath: 'assets/cc_bodies/manifest.json',
} as const;

/** 圖集的類型鍵（manifest.types 的鍵） */
export type CcBodyType = 'SHEEP' | 'ICE_BLOCK';

/**
 * 變羊的羊。drawScale＝相對烘焙尺寸（1 px＝HEX_SIZE／pxPerHex canvas 單位）的繪製倍率；
 * 羊要在遊戲縮放下一眼認得出來，但不能比單位本身更高大。
 */
export const SHEEP_BODY = {
    drawScale: 1,
    fps: 8,
    materialKey: 'STATUS_SHEEP',
    /** 剪影變體（被遮擋輪廓、受擊閃白）的填色 */
    silhouetteColor: '#ffffff',
} as const;

/** 凍結冰塊（六角冰柱牢籠，半透明，單位在裡面）。drawAlpha＝整體繪製透明度（疊在單位之上） */
export const ICE_BLOCK = {
    drawScale: 1,
    drawAlpha: 1,
} as const;
