import { Agent } from "../../../../game";
import { SpriteManager } from "../../../sprites";
import { UnitIndicatorPainter } from "./UnitIndicatorPainter";
import { UnitAuraPainter } from "./UnitAuraPainter";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { UNIT_SCALE, ISO_SCALE_Y } from "../../../../../constants";

const HOVER_LIFT = 6; 

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number, isSilhouette: boolean) {
        if (isSilhouette || agent.visualStatus === 'POLYMORPH') return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        const surfaceY = py;
        const tokenY = surfaceY - HOVER_LIFT;

        ctx.save();
        
        const jumpHeight = agent.physics.z;
        // 調低基礎透明度從 1.0 降至 0.35，避免呈現全黑塊
        const shadowScale = Math.max(0.4, 1.0 - (jumpHeight / 500));
        const shadowAlpha = Math.max(0.05, 0.35 - (jumpHeight / 300));
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,1)'); 
        
        ctx.save();
        ctx.translate(px, surfaceY); 
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        ctx.globalCompositeOperation = 'multiply'; // 使用色彩增值模式讓陰影與地表融合
        
        const w = 110; // 稍微放寬陰影範圍增加柔和感
        const h = w * ISO_SCALE_Y;
        ctx.drawImage(shadowBlob, -w/2, -h/2, w, h); 
        ctx.restore();

        if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill && skill.tag === 'ULT') {
                UnitAuraPainter.drawUltimateChantVFX(ctx, agent, px, surfaceY, t);
            } else {
                UnitAuraPainter.drawCastingVFX(ctx, agent, px, surfaceY, t);
            }
        }

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
            const breath = Math.sin(t * 2) * 1.5;
            ctx.translate(0, breath);

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 1.0; 
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
            ctx.drawImage(assets.icon, -32, -32, 64, 64);
            ctx.restore();
        }
        
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                const radius = skill.aoeRadius || 1;
                const isAOE = skill.type === 'AOE';
                if (isAOE) {
                    ctx.save();
                    ctx.translate(px, surfaceY);
                    UnitIndicatorPainter.drawSkillGroundIndicator(ctx, 0, 0, skill.color, t, progress, radius, skill.tag, isAOE);
                    ctx.restore();
                }
            }
        }
        
        ctx.restore();
    }
};