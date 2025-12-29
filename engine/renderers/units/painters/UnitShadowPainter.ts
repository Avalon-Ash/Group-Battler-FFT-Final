
import { Agent } from "../../../../game";
import { SpriteManager } from "../../../sprites";
import { UnitIndicatorPainter } from "./UnitIndicatorPainter";
import { UnitAuraPainter } from "./UnitAuraPainter"; // Imported
import { VFXFactory } from "../../../graphics/VFXFactory";
import { UNIT_SCALE, ISO_SCALE_Y } from "../../../../../constants";

const HOVER_LIFT = 6; 

export const UnitShadowPainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number, isSilhouette: boolean) {
        if (isSilhouette || agent.visualStatus === 'POLYMORPH') return;

        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        
        // SurfaceY = Ground Level. py is passed as SurfaceY by RenderPipeline? 
        // No, in RenderPipeline: visualTopY = py - h. UnitShadowPainter receives `snapY` which is Top.
        // Wait, UnitVisualProcessor returns `y` as Ground Base Y. 
        // UnitRenderSystem.submitRenderables passes `op.ty` as `state.y - state.terrainHeight` which is SURFACE Y.
        // So `py` here IS the surface level. Correct.
        
        const surfaceY = py;
        const tokenY = surfaceY - HOVER_LIFT;

        ctx.save();
        
        // 1. Drop Shadow
        // Shadow shrinks as unit jumps (pz - agent.physics.z would be terrain height difference if jumping off cliff)
        // Ideally we use agent.physics.z for local jump height.
        const jumpHeight = agent.physics.z;
        const shadowScale = Math.max(0.6, 1.0 - (jumpHeight / 400));
        const shadowAlpha = Math.max(0.2, 1.0 - (jumpHeight / 200));
        const shadowBlob = VFXFactory.getTexture('SHADOW_BLOB', 'rgba(0,0,0,0.5)'); 
        
        ctx.save();
        ctx.translate(px, surfaceY); 
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.scale(shadowScale, shadowScale);
        ctx.globalAlpha = shadowAlpha;
        
        const w = 96;
        const h = w * ISO_SCALE_Y;
        ctx.drawImage(shadowBlob, -w/2, -h/2, w, h); 
        ctx.restore();

        // 2. CHANNELLING VFX (Moved Here for Stability)
        // Drawn at surface level, BEFORE unit body
        if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill && skill.tag === 'ULT') {
                UnitAuraPainter.drawUltimateChantVFX(ctx, agent, px, surfaceY, t);
            } else {
                UnitAuraPainter.drawCastingVFX(ctx, agent, px, surfaceY, t);
            }
        }

        // 3. Base Token
        ctx.save();
        ctx.translate(px, tokenY);
        ctx.scale(UNIT_SCALE, UNIT_SCALE); 
        ctx.drawImage(assets.base, -64, -64); 
        ctx.restore();

        // 4. Class Icon
        if (agent.hp > 0) {
            ctx.save();
            ctx.translate(px, tokenY);
            ctx.scale(UNIT_SCALE, UNIT_SCALE); 
            
            const iconBaseY = -20; 
            ctx.translate(0, iconBaseY);
            const breath = Math.sin(t * 2) * 1.5;
            ctx.translate(0, breath);

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 1.0; 
            ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
            ctx.drawImage(assets.icon, -32, -32, 64, 64);
            ctx.restore();
        }
        
        // 5. Skill Range Indicators (Targeting Feedback)
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                const radius = skill.aoeRadius || 1;
                const isAOE = skill.type === 'AOE';
                // Only draw indicator if AOE to avoid clutter for single target
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
