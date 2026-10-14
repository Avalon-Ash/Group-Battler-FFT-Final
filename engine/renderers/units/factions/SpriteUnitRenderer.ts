/**
 * SpriteUnitRenderer — 2.5D 預渲染精靈單位繪製器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 簽章對齊 ImperialRenderer.draw(ctx, agent, t, isSilhouette)。
 *  - 依 ECS 精神，純粹消費 Agent 資料與外觀 SSOT 設定。
 *  - 繪製位置以腳底為錨點 (0, 0)，加上 frame.ox / frame.oy 乘以全域縮放。
 *  - 依縮放自動選用預烘焙 Mip（1.0, 0.5, 0.25），零執行期離屏分配。
 *  - 受擊閃白直接 blit 預烘焙之白色剪影，被遮擋輪廓以 low alpha 剪影 blit。
 *  - 嚴格遵守零 magic number、零體型字面值、無 shadowBlur。
 */

import { Agent } from '../../../core/Agent';
import { UNIT_SPRITE } from '../../../../constants';
import { spriteAtlasStore, selectMipLevel } from '../SpriteAtlasStore';
import { resolveBodyType, BODY_TYPE_PROFILE } from '../../../../data/units/appearance/bodyTypes';
import { lookupSpriteAppearance } from '../../../../data/units/appearance/sprite';
import { selectSpriteFrame } from '../../../../data/units/appearance/selectSpriteFrame';

export const SpriteUnitRenderer = {
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
     * 核心繪製方法
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean): void {
        const bodyType = resolveBodyType(agent);
        const bodyProfile = BODY_TYPE_PROFILE[bodyType];
        const appearance = lookupSpriteAppearance(agent.team, agent.role, bodyType);
        if (!appearance) return;

        const manifestKey = appearance.manifestKey;
        const unitDef = spriteAtlasStore.getUnitDef(manifestKey);
        if (!unitDef) return;

        const manifest = spriteAtlasStore.getManifest();
        const refHeight = manifest?.referenceHeightPx ?? UNIT_SPRITE.referenceHeightPx;
        const heightScale = bodyProfile?.heightScale ?? 1.0;
        const anchorYOffset = bodyProfile?.anchorYOffset ?? 0;

        // 單一全域縮放比例
        const globalScale = (UNIT_SPRITE.targetHeightCanvasUnits / refHeight) * heightScale;

        // 影格選取
        const hasCastAnim = 'cast' in unitDef.anims;
        const selection = selectSpriteFrame(agent, t, hasCastAnim);
        const frame = spriteAtlasStore.getFrame(
            manifestKey,
            selection.anim,
            selection.dir,
            selection.frameIndex
        );
        if (!frame) return;

        // Mip 層級選取
        const mipLevel = selectMipLevel(globalScale);

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

        // 目標繪製矩形（腳底為 0, 0 基準）
        let dx = frame.ox * globalScale;
        let dy = (frame.oy + anchorYOffset) * globalScale;
        const dw = frame.w * globalScale;
        const dh = frame.h * globalScale;

        // 受擊輕微抖動
        if (agent.hitFlashTimer > 0) {
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
        if (agent.hitFlashTimer > 0) {
            const silhouetteAtlas = spriteAtlasStore.getSilhouette(manifestKey, mipLevel);
            if (silhouetteAtlas) {
                const flashAlpha = Math.min(1.0, agent.hitFlashTimer / (UNIT_SPRITE.hitFlashDuration || 0.15));
                ctx.save();
                ctx.globalAlpha = flashAlpha * (appearance.flashStrength || 1.0);
                ctx.drawImage(silhouetteAtlas, sx, sy, sw, sh, dx, dy, dw, dh);
                ctx.restore();
            }
        }
    }
};
