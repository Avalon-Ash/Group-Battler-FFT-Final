// ╔══════════════════════════════════════════════════════════╗
// ║  projection — 角色投影的高度 SSOT（投影中心、頭頂、血條）  ║
// ║  職責：從「精靈資料」推導投影離腳下地面的高度，不依賴圖集    ║
// ║        載入，所以模擬端（tick 內發射投射物）也能直接讀      ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §4。測試      ║
// ║  tests/CoreProjection.test.ts 比對本檔與                    ║
// ║  SpriteUnitRenderer.getHeadHeight（實際圖集），不得漂移。   ║
// ╚══════════════════════════════════════════════════════════╝

import { BodyTypeId } from '../../../types';
import { HUD_ANCHOR, UNIT_SPRITE } from '../../../constants';
import { BODY_TYPE_PROFILE } from './bodyTypes';

/** 站姿「腳底到頭頂」的高度（螢幕 px）＝精靈目標高度 × 體型 heightScale。傳入已解析的體型（resolveBodyType） */
export function projectionHeadHeight(body: BodyTypeId): number {
    return UNIT_SPRITE.targetHeightCanvasUnits * (BODY_TYPE_PROFILE[body]?.heightScale ?? 1);
}

/** 頭頂離腳下地面的高度＝腳底懸浮 + 頭頂高度。頭頂狀態標記（status_parts 的 HEAD 錨點）在它之上再加固定間距 */
export function projectionTopHeight(body: BodyTypeId): number {
    return UNIT_SPRITE.footHover + projectionHeadHeight(body);
}

/** 投影中心離腳下地面的高度＝腳底懸浮 + 頭頂高度 × 中心位置。發射點、受擊點、核心都是這一點 */
export function projectionCenterHeight(body: BodyTypeId): number {
    return UNIT_SPRITE.footHover + projectionHeadHeight(body) * UNIT_SPRITE.centerFraction;
}

/** 血條錨點離腳下地面的高度＝腳底懸浮 + 頭頂高度 + barHeadMargin */
export function hudBarHeight(body: BodyTypeId): number {
    return UNIT_SPRITE.footHover + projectionHeadHeight(body) + HUD_ANCHOR.barHeadMargin;
}

/** 浮動文字基準線離腳下地面的高度＝血條錨點 + textGap */
export function hudTextHeight(body: BodyTypeId): number {
    return hudBarHeight(body) + HUD_ANCHOR.textGap;
}
