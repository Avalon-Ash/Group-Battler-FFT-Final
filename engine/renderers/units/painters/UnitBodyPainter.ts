
import { Agent } from "../../../../game";
import { Team, AnimState, MovementType } from "../../../../../types";
import { UNIT_BODY_OFFSET } from "../../../../../constants";
import { ImperialRenderer } from "../factions/ImperialRenderer";
import { CovenantRenderer } from "../factions/CovenantRenderer";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { UnitAuraPainter } from "./UnitAuraPainter";
import { SpriteManager } from "../../../sprites";

export const UnitBodyPainter = {
    draw(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        px: number, py: number, pz: number, 
        t: number, 
        isSilhouette: boolean, 
        isSelected: boolean,
        scaleFactor: number
    ) {
        ctx.save(); 
        
        // 1. Transform to Body Center (Standard Anchor)
        // px, py are Ground Coordinates.
        // pz is Height from terrain.
        // UNIT_BODY_OFFSET shifts from feet to center of mass.
        const bodyY = py - pz - UNIT_BODY_OFFSET;
        
        ctx.translate(px, bodyY); 
        ctx.rotate(agent.physics.angle); 

        // 2. Animation Bobbing / Floating
        let bodyFloat = 0; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat = Math.sin(t * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat = Math.sin(t * 4) * 2;
        }
        ctx.translate(0, bodyFloat);

        // 3. Spawn Animation
        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; 
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            ctx.scale(1, 2.0 - eased); 
            ctx.globalAlpha *= eased;
        }

        // 4. Status Filters
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(80%)'; 
        } else if (!isSilhouette && agent.hitFlashTimer > 0) {
             ctx.filter = 'brightness(200%)';
        }

        // 5. Flight VFX
        if (agent.movementType === MovementType.FLYING && agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            UnitFlightPainter.drawFlightVFX(ctx, agent, t);
        }

        // 6. Facing Flip
        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        // 7. Render Strategy
        if (isSilhouette) {
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 0.8; 
        }

        if (agent.visualStatus === 'POLYMORPH') {
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(t * 5) * 5);
            // Sheep sprite is 64x64. Center is 32,32. 
            // We are at body center. Draw centered.
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            // Faction Specific Renderers
            // Renderers assume (0,0) is Body Center
            if (agent.team === Team.BLUE) {
                ImperialRenderer.draw(ctx, agent, t, isSilhouette);
            } else {
                CovenantRenderer.draw(ctx, agent, t, isSilhouette);
            }
            
            // Casting Effects (Not in silhouette)
            if (!isSilhouette && agent.hp > 0 && agent.castingSkillIdx !== -1) {
                const skill = agent.skills[agent.castingSkillIdx];
                if (skill && skill.tag === 'ULT') {
                    UnitAuraPainter.drawUltimateChantVFX(ctx, agent, t);
                } else {
                    UnitAuraPainter.drawCastingVFX(ctx, agent, t);
                }
            }
            
            // Frozen State Overlay
            if (agent.visualStatus === 'FROZEN') {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                // Ice sprite is 96x128. Anchor center bottom?
                // Draw centered on body
                ctx.drawImage(ice, -48, -64, 96, 128);
                ctx.restore();
            }
        }
        
        ctx.restore(); 
    }
};
