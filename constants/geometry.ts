// ╔══════════════════════════════════════════════════════════╗
// ║  constants/geometry.ts — 地圖幾何、尺寸、投影與錨點常數 SSOT  ║
// ║  職責：定義六角網格尺寸、地塊高度、單位縮放與視覺錨點      ║
// ║  下游：engine/math、engine/renderers、engine/systems      ║
// ╚══════════════════════════════════════════════════════════╝

import { HexLayout, ZoneConfig } from '../types';

export const DEFAULT_HEX_LAYOUT: HexLayout = 'FLAT';
export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
    enabled: true,
    initialRadius: 12,
    shrinkInterval: 10,
    minRadius: 1
};
export const HEX_SIZE = 48;
export const BLOCK_HEIGHT = 24;
export const MAX_TERRAIN_TIER = 6;
export const ISO_SCALE_Y = 0.5;
export const UNIT_BODY_OFFSET = 36;
export const UNIT_HOVER_OFFSET = 6;
export const UNIT_SCALE = 0.65;

/** 單位模型視覺中心距地板的 Z 偏移（像素）。
 *  對應 Sprite 高度的約 50%。依美術 Sprite 尺寸調整。 */
export const AGENT_MODEL_CENTER_Z = 64;

/** 沒有單位目標的特效（地面目標點）的身體高度：地面 + CENTER_OFFSET（EventVFXMapper） */
export const VISUAL_ANCHORS = {
    CENTER_OFFSET: 30
};

export const MAX_ARC_HEIGHT = 150;

/**
 * 漂浮地形（虛空／熔岩）的繪製時浮動 SSOT。只影響畫面，不影響模擬與排序鍵。
 * 唯一實作：VisualMath.floatBobAt；地塊（GridRenderStrategy）與「繪製用地面高度」（RenderPipeline）共用，
 * 所以站在地塊上的單位、屍體、狀態、HUD、貼地特效跟地塊一起浮動。見 RenderSpec「漂浮位移」。
 */
export const FLOAT_BOB = {
    BIOMES: ['VOID', 'MAGMA'] as readonly string[],
    AMPLITUDE: 4,
    SPEED: 1.5,
    /** 相位隨世界座標變化（x + y）的比例，讓相鄰島塊錯開 */
    PHASE_PER_PX: 0.01,
    /** 投射物發射格的漂浮位移在飛行進度 t 到這個值時淡出為 0（發射點與漂浮的施法者對齊，之後走原軌跡） */
    LAUNCH_FADE_T: 0.5,
} as const;
