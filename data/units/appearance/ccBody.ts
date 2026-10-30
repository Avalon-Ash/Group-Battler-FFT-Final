// ╔══════════════════════════════════════════════════════════╗
// ║  ccBody — 控制狀態的「本體替換」外觀表（變羊、冰塊）       ║
// ║  職責：Blender 烘焙的羊與冰塊圖集（public/assets/cc_bodies） ║
// ║        的路徑、繪製倍率、跳動與透明度；只有數據，沒有繪製    ║
// ║  [ARCH] 圖集由 tools/assets/blender/render_cc_body.py →       ║
// ║  pack_cc_body.py 產生，四向（SE／SW／NE／NW）原生渲染，方向   ║
// ║  依 selectSpriteDirection 與單位精靈同一套選取。錨點＝格子    ║
// ║  中心的地面點（manifest 的 ax／ay），畫在單位局部座標、腳底   ║
// ║  貼 UNIT_SPRITE.footOffsetLocal，所以不新增座標／排序規則     ║
// ║  （RenderSpec §4 精靈繪製原點）。陣營色只出現在羊的項圈：      ║
// ║  圖集附一張遮罩，載入後依 FACTION_SKINS 為每隊合成一次。      ║
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
    /** hz＝每秒跳幾下（落地時 phase=0）；height＝跳高（局部單位）；squash＝落地壓扁比例；stretchRatio＝最高點橫向伸展相對 squash 的比例 */
    hop: { hz: 1.6, height: 5, squash: 0.07, stretchRatio: 0.5 },
    /** 剪影變體（被遮擋輪廓、受擊閃白）的填色 */
    silhouetteColor: '#ffffff',
} as const;

/** 凍結冰塊（六角冰柱牢籠，半透明，單位在裡面）。drawAlpha＝整體繪製透明度（疊在單位之上） */
export const ICE_BLOCK = {
    drawScale: 1,
    drawAlpha: 1,
} as const;
