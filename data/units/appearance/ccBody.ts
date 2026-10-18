// ╔══════════════════════════════════════════════════════════╗
// ║  ccBody — 控制狀態的「本體替換」外觀表（變羊、冰塊）       ║
// ║  職責：變羊的羊（毛球叢、臉、腿、顏色、跳動）與凍結冰塊的   ║
// ║        尺寸、色階、面板透明度；只有數據，沒有繪製          ║
// ║  下游：PolymorphPainter／FrozenPainter（烘焙一次成離屏畫布） ║
// ║  [ARCH] 尺寸單位＝單位局部座標（UnitBodyPainter 在           ║
// ║  ctx.scale(UNIT_SCALE) 之後繪製，原點＝精靈繪製原點，腳底在   ║
// ║  UNIT_SPRITE.footOffsetLocal）；烘焙畫布的底邊就是腳底，所以   ║
// ║  不新增任何座標／排序規則（RenderSpec §4 精靈繪製原點）。     ║
// ║  冰塊色階沿用 VFX_RAMPS.LION_ICE（與狀態零件同一色階）。      ║
// ╚══════════════════════════════════════════════════════════╝

import { VFX_RAMPS } from '../../vfx/parts/vfxPalette';

/** 一團羊毛：圓心與半徑（烘焙盒座標，盒左上為原點，朝右） */
export interface WoolPuff { x: number; y: number; r: number }

/**
 * 變羊的羊（朝右；烘焙時依 agent.facing 翻轉）。
 * 盒子底邊 y = groundY 就是腳底。毛球由後（上）往前（下）排列，後畫的蓋住先畫的。
 */
export const SHEEP_BODY = {
    /** 烘焙解析度倍率（畫布像素 / 局部單位）：縮放鏡頭時保持銳利 */
    bakeScale: 3,
    /** 繪製放大倍率（相對烘焙盒的局部單位）：羊要在遊戲縮放下一眼認得出來，所以比盒子標稱大小再放大一點 */
    drawScale: 1.3,
    /** 烘焙盒大小（局部單位，含外框留白） */
    boxW: 76,
    boxH: 62,
    /** 腳底線（盒內 y） */
    groundY: 60,
    /** 外框粗（局部單位） */
    outlineWidth: 2,
    /** 毛球叢（背→前） */
    wool: [
        { x: 14, y: 25, r: 7 },
        { x: 24, y: 17, r: 9 },
        { x: 37, y: 14, r: 10 },
        { x: 50, y: 19, r: 8.5 },
        { x: 20, y: 31, r: 10 },
        { x: 33, y: 28, r: 11 },
        { x: 47, y: 30, r: 10 },
        { x: 27, y: 38, r: 9 },
        { x: 39, y: 38, r: 9 },
        { x: 9, y: 33, r: 6 },
        { x: 52, y: 38, r: 7 },
    ] as readonly WoolPuff[],
    /** 腿：x 中心、頂端 y、寬；底到 groundY。far＝遠側（稍暗） */
    legs: [
        { x: 21, top: 38, w: 6, far: true },
        { x: 44, top: 38, w: 6, far: true },
        { x: 27, top: 40, w: 6, far: false },
        { x: 50, top: 40, w: 6, far: false },
    ] as readonly { x: number; top: number; w: number; far: boolean }[],
    /** 蹄高 */
    hoofHeight: 3,
    /** 頭（橢圓）、耳、眼、口鼻、額前羊毛 */
    head: { x: 63, y: 34, rx: 8.5, ry: 9.5 },
    ear: { x: 56.5, y: 27.5, rx: 3, ry: 6, angle: -0.7, innerRx: 1.6, innerRy: 3.8 },
    eye: { x: 65.5, y: 31, r: 2.6, pupilR: 1.3, pupilDx: 0.6 },
    muzzle: { x: 69, y: 39, rx: 4.2, ry: 3.2 },
    nose: { x: 71, y: 38, r: 1.1 },
    fringe: { x: 62, y: 24, r: 5.5 },
    /** 項圈（陣營色）：兩端點與線寬 */
    collar: { x0: 57.5, y0: 30, x1: 58.5, y1: 42, width: 3 },
    /** 尾巴小毛球 */
    tail: { x: 6, y: 28, r: 4.5 },
    /** 顏色 */
    colors: {
        outline: '#1e1b2e',
        woolBase: '#f8fafc',
        woolShade: '#b6c2dd',
        woolHighlight: '#ffffff',
        skin: '#3a3350',
        skinFar: '#2a2540',
        skinLight: '#524a70',
        hoof: '#171425',
        earInner: '#f9a8d4',
        eyeWhite: '#ffffff',
        eyePupil: '#1e1b2e',
        silhouette: '#ffffff',
    },
    /** 毛球的明暗：亮面（左上）縮小偏移與半徑比例、高光半徑比例與偏移 */
    puffLight: { dx: -0.14, dy: -0.18, rScale: 0.8 },
    puffHighlight: { dx: -0.32, dy: -0.38, rScale: 0.24, minR: 7 },
    /** 動畫 */
    /** hz＝每秒跳幾下（落地時 phase=0）；height＝跳高；squash＝落地壓扁比例 */
    hop: { hz: 1.6, height: 5, squash: 0.07 },
} as const;

/** 凍結冰塊（六角稜柱，朝上為平頂六角）：烘焙一次，單位在裡面 */
export const ICE_BLOCK = {
    bakeScale: 3,
    /** 六角半徑（局部單位，水平方向）與高度 */
    radius: 36,
    height: 96,
    /** 烘焙盒留白 */
    pad: 4,
    /** 面板色階（沿用狀態零件的冰色階） */
    ramp: VFX_RAMPS.LION_ICE,
    /** 各面透明度：頂面、左（受光）、前、右（背光） */
    alpha: { top: 0.4, left: 0.3, front: 0.22, right: 0.4 },
    /** 邊線寬與透明度 */
    edgeWidth: 1.6,
    edgeAlpha: 0.95,
    /** 內側斜向高光條：[起點比例, 寬度比例]（沿面寬），透明度 */
    streaks: [[0.18, 0.1], [0.4, 0.05]] as readonly (readonly [number, number])[],
    streakAlpha: 0.4,
    /** 整體繪製透明度（疊在單位之上） */
    drawAlpha: 1,
} as const;
