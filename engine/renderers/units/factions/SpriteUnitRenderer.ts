/**
 * SpriteUnitRenderer — 2.5D 預渲染精靈單位繪製器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 簽章為 draw(ctx, agent, t, isSilhouette)。
 *  - 依 ECS 精神，純粹消費 Agent 資料與外觀 SSOT 設定。
 *  - 繪製位置以腳底為錨點 (0, 0)，加上 frame.ox / frame.oy 乘以全域縮放。
 *  - 依縮放自動選用預烘焙 Mip（1.0, 0.5, 0.25），零執行期離屏分配。
 *  - 受擊閃白直接 blit 預烘焙之白色剪影，被遮擋輪廓以 low alpha 剪影 blit。
 *  - 嚴格遵守零 magic number、零體型字面值、無 shadowBlur。
 */

import { Agent } from '../../../core/Agent';
import { UNIT_SPRITE, UNIT_SCALE } from '../../../../constants';
import { spriteAtlasStore, selectMipLevel, UnitFrameDef } from '../SpriteAtlasStore';
import { resolveBodyType, BODY_TYPE_PROFILE } from '../../../../data/units/appearance/bodyTypes';
import { lookupSpriteAppearance } from '../../../../data/units/appearance/sprite';
import { selectSpriteFrame } from '../../../../data/units/appearance/selectSpriteFrame';

export interface SpriteDrawRect {
    dx: number;
    dy: number;
    dw: number;
    dh: number;
    screenScale: number;
    localScale: number;
}

/**
 * 計算精靈在螢幕（世界座標、未受 UNIT_SCALE 影響）之縮放比例
 */
export function computeSpriteScreenScale(
    refHeight: number = UNIT_SPRITE.referenceHeightPx,
    heightScale: number = 1.0,
    targetHeightCanvasUnits: number = UNIT_SPRITE.targetHeightCanvasUnits
): number {
    return (targetHeightCanvasUnits / refHeight) * heightScale;
}

/**
 * 計算精靈在已套用 ctx.scale(UNIT_SCALE, UNIT_SCALE) 的局部座標系中之補償縮放比例
 */
export function computeSpriteLocalScale(
    refHeight: number = UNIT_SPRITE.referenceHeightPx,
    heightScale: number = 1.0,
    targetHeightCanvasUnits: number = UNIT_SPRITE.targetHeightCanvasUnits
): number {
    return computeSpriteScreenScale(refHeight, heightScale, targetHeightCanvasUnits) / UNIT_SCALE;
}

/**
 * 計算精靈於局部座標系（原點為 VisualBodyCenterY）之繪製矩形，使腳底精確落在 surfaceY
 */
export function computeSpriteDrawRect(
    frame: Pick<UnitFrameDef, 'w' | 'h' | 'ox' | 'oy'>,
    refHeight: number = UNIT_SPRITE.referenceHeightPx,
    heightScale: number = 1.0,
    anchorYOffset: number = 0,
    targetHeightCanvasUnits: number = UNIT_SPRITE.targetHeightCanvasUnits
): SpriteDrawRect {
    const screenScale = computeSpriteScreenScale(refHeight, heightScale, targetHeightCanvasUnits);
    const localScale = screenScale / UNIT_SCALE;
    const dx = frame.ox * localScale;
    const dy = (frame.oy + anchorYOffset) * localScale + UNIT_SPRITE.footOffsetLocal;
    const dw = frame.w * localScale;
    const dh = frame.h * localScale;
    return { dx, dy, dw, dh, screenScale, localScale };
}

/** resolveFrame 的輸出（draw 與殘影共用；呼叫端自備或用模組內暫存，不跨呼叫保存） */
export interface ResolvedSpriteFrame {
    manifestKey: string;
    frame: UnitFrameDef | null;
    rect: SpriteDrawRect | null;
    mipLevel: number;
    flashStrength: number;
}

export function createResolvedSpriteFrame(): ResolvedSpriteFrame {
    return { manifestKey: '', frame: null, rect: null, mipLevel: 1, flashStrength: 1 };
}

const scratchFrame = createResolvedSpriteFrame();

export const SpriteUnitRenderer = {
    /**
     * 單位站姿「腳底到頭頂」的螢幕高度（世界座標、不受 UNIT_SCALE 影響）。
     * 供護盾等外框貼合實際角色高度（含體型縮放；飛行單位的升空位移由呼叫端的 body center Y 負責）。
     * 圖集未就緒或查無外觀時回傳 null，呼叫端應退回預設尺寸。
     */
    getHeadHeight(agent: Agent): number | null {
        if (!spriteAtlasStore.isReady()) return null;
        const bodyType = resolveBodyType(agent);
        const bodyProfile = BODY_TYPE_PROFILE[bodyType];
        const appearance = lookupSpriteAppearance(agent.team, agent.role, bodyType);
        if (!appearance) return null;
        const unitDef = spriteAtlasStore.getUnitDef(appearance.manifestKey);
        if (!unitDef) return null;
        const manifest = spriteAtlasStore.getManifest();
        const refHeight = manifest?.referenceHeightPx ?? UNIT_SPRITE.referenceHeightPx;
        const screenScale = computeSpriteScreenScale(refHeight, bodyProfile?.heightScale ?? 1.0);
        return (unitDef.idleHeightPx - (bodyProfile?.anchorYOffset ?? 0)) * screenScale;
    },


    /**
     * 檢查指定單位是否可由精靈圖集繪製
     */
    canRender(agent: Agent): boolean {
        if (!spriteAtlasStore.isReady()) return false;
        const bodyType = resolveBodyType(agent);
        const appearance = lookupSpriteAppearance(agent.team, agent.role, bodyType);
        if (!appearance) return false;
        return spriteAtlasStore.isReady(appearance.manifestKey);
    },

    /**
     * 解析單位本幀要畫的影格（影格選取、繪製矩形、Mip），寫進 out。draw 與殘影共用，
     * 殘影才會和本體畫同一張影格、同一個朝向。圖集未就緒或查無外觀時回傳 false。
     */
    resolveFrame(agent: Agent, t: number, out: ResolvedSpriteFrame): boolean {
        const bodyType = resolveBodyType(agent);
        const bodyProfile = BODY_TYPE_PROFILE[bodyType];
        const appearance = lookupSpriteAppearance(agent.team, agent.role, bodyType);
        if (!appearance) return false;

        const manifestKey = appearance.manifestKey;
        const unitDef = spriteAtlasStore.getUnitDef(manifestKey);
        if (!unitDef) return false;

        const manifest = spriteAtlasStore.getManifest();
        const refHeight = manifest?.referenceHeightPx ?? UNIT_SPRITE.referenceHeightPx;
        const heightScale = bodyProfile?.heightScale ?? 1.0;
        const anchorYOffset = bodyProfile?.anchorYOffset ?? 0;

        // 影格選取
        const hasCastAnim = 'cast' in unitDef.anims;
        const selection = selectSpriteFrame(agent, t, hasCastAnim);
        const frame = spriteAtlasStore.getFrame(
            manifestKey,
            selection.anim,
            selection.dir,
            selection.frameIndex
        );
        if (!frame) return false;

        // 目標繪製矩形（補償外層 UNIT_SCALE 並加上 footOffsetLocal 使腳底落在 surfaceY）
        const rect = computeSpriteDrawRect(frame, refHeight, heightScale, anchorYOffset);
        out.manifestKey = manifestKey;
        out.frame = frame;
        out.rect = rect;
        // Mip 層級選取（以實際螢幕縮放 screenScale 為準）
        out.mipLevel = selectMipLevel(rect.screenScale);
        out.flashStrength = appearance.flashStrength || 1.0;
        return true;
    },

    /**
     * 核心繪製方法
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean): void {
        const r = scratchFrame;
        if (!SpriteUnitRenderer.resolveFrame(agent, t, r) || !r.frame || !r.rect) return;
        const manifestKey = r.manifestKey;
        const frame = r.frame;
        const rect = r.rect;
        const mipLevel = r.mipLevel;
        let dx = rect.dx;
        const dy = rect.dy;
        const dw = rect.dw;
        const dh = rect.dh;

        // 來源圖集選取
        const atlasImage = isSilhouette
            ? spriteAtlasStore.getSilhouette(manifestKey, mipLevel)
            : spriteAtlasStore.getAtlas(manifestKey, mipLevel);
        if (!atlasImage) return;

        // 來源切片座標（轉換為該 Mip 解析度下之像素）
        const sx = frame.x * mipLevel;
        const sy = frame.y * mipLevel;
        const sw = frame.w * mipLevel;
        const sh = frame.h * mipLevel;

        // 受擊輕微抖動
        if (agent.view.hitFlashTimer > 0) {
            const hitShake = Math.sin(t * 80) * 2;
            dx += hitShake;
        }

        // 繪製本體
        if (isSilhouette) {
            ctx.save();
            ctx.globalAlpha = UNIT_SPRITE.silhouetteAlpha;
            ctx.drawImage(atlasImage, sx, sy, sw, sh, dx, dy, dw, dh);
            ctx.restore();
            return;
        }

        ctx.drawImage(atlasImage, sx, sy, sw, sh, dx, dy, dw, dh);

        // 受擊閃白疊層（預烘焙剪影直接 blit）
        if (agent.view.hitFlashTimer > 0) {
            const silhouetteAtlas = spriteAtlasStore.getSilhouette(manifestKey, mipLevel);
            if (silhouetteAtlas) {
                const flashAlpha = Math.min(1.0, agent.view.hitFlashTimer / (UNIT_SPRITE.hitFlashDuration || 0.15));
                ctx.save();
                ctx.globalAlpha = flashAlpha * r.flashStrength;
                ctx.drawImage(silhouetteAtlas, sx, sy, sw, sh, dx, dy, dw, dh);
                ctx.restore();
            }
        }
    }
};
