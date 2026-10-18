
import { Agent } from "../../../game";
import { SpriteManager } from "../../../sprites";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { UNIT_SCALE, ISO_SCALE_Y, UNIT_SHADOW } from "../../../../constants";
import { HexLayout } from "../../../../types";
import { VisualMath } from "../../../math/VisualMath";
import { resolveBodyType } from "../../../../data/units/appearance/bodyTypes";

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, t: number, isSilhouette: boolean, layout: HexLayout) {
        if (isSilhouette) return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team, resolveBodyType(agent), layout);
        const surfaceY = py;
        
        // SSOT: Use centralized shadow bias
        const tokenY = VisualMath.applyLayerBias(surfaceY, 'SHADOW');

        ctx.save();
        
        // Uses agent.physics.z directly (SSOT)
        const jumpHeight = agent.physics.z;
        
        // SSOT: Use centralized shadow formula
        const { scale: shadowScale, alpha: shadowAlpha } = VisualMath.getShadowProperties(jumpHeight);
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', UNIT_SHADOW.CORE_COLOR);
        
        ctx.save();
        ctx.translate(px, surfaceY); 
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.globalCompositeOperation = 'multiply'; // Use multiply to blend with ground
        
        const w = UNIT_SHADOW.WIDTH;
        const h = w * ISO_SCALE_Y;
        ctx.drawImage(shadowBlob, -w/2, -h/2, w, h); 
        ctx.restore();

        ctx.save();
        ctx.translate(px, tokenY);
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.drawImage(assets.base, -UNIT_SHADOW.BASE_HALF, -UNIT_SHADOW.BASE_HALF);
        ctx.restore();

        ctx.restore();
    }
};
