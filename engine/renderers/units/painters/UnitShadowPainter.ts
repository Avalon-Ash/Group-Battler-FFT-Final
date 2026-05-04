
import { Agent } from "../../../game";
import { SpriteManager } from "../../../sprites";
import { UnitIndicatorPainter } from "./UnitIndicatorPainter";
import { UnitAuraPainter } from "./UnitAuraPainter";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { UNIT_SCALE, ISO_SCALE_Y } from "../../../../constants";
import { HexLayout } from "../../../../types";
import { VisualMath } from "../../../math/VisualMath";

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, t: number, isSilhouette: boolean, layout: HexLayout) {
        if (isSilhouette || agent.visualStatus === 'POLYMORPH') return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        const surfaceY = py;
        
        // SSOT: Use centralized shadow bias
        const tokenY = VisualMath.applyLayerBias(surfaceY, 'SHADOW');

        ctx.save();
        
        // Uses agent.physics.z directly (SSOT)
        const jumpHeight = agent.physics.z;
        
        // SSOT: Use centralized shadow formula
        const { scale: shadowScale, alpha: shadowAlpha } = VisualMath.getShadowProperties(jumpHeight);
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,1)'); 
        
        ctx.save();
        ctx.translate(px, surfaceY); 
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.globalCompositeOperation = 'multiply'; // Use multiply to blend with ground
        
        const w = 110; 
        const h = w * ISO_SCALE_Y;
        ctx.drawImage(shadowBlob, -w/2, -h/2, w, h); 
        ctx.restore();

        ctx.save();
        ctx.translate(px, tokenY);
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.drawImage(assets.base, -64, -64); 
        ctx.restore();

        if (agent.hp > 0) {
            ctx.save();
            ctx.translate(px, tokenY);
            ctx.scale(UNIT_SCALE, UNIT_SCALE); 
            
            const iconBaseY = -20; 
            ctx.translate(0, iconBaseY);
            // [FIX] 移除獨立浮動：icon 跟隨棋座靜止，身體浮動由 Faction Renderer 統一負責

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 1.0; 
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
            ctx.drawImage(assets.icon, -32, -32, 64, 64);
            ctx.restore();
        }
        
        ctx.restore();
    }
};
