
import { Agent } from "../../../game";
import { Team, AnimState, MovementType } from "../../../../types";
import { UNIT_SCALE, VFX_PARAM } from "../../../../constants";
import { ImperialRenderer } from "../factions/ImperialRenderer";
import { CovenantRenderer } from "../factions/CovenantRenderer";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { UnitCorePainter } from "./UnitCorePainter";
import { SpriteManager } from "../../../sprites";
import { VisualMath } from "../../../math/VisualMath";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";

export const UnitBodyPainter = {
    draw(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        px: number, py: number, 
        t: number, 
        isSilhouette: boolean, 
        isSelected: boolean,
        scaleFactor: number,
        terrainHeight: number
    ) {
        const vx = agent.physics.vx;
        const vy = agent.physics.vy;
        const speedSq = vx*vx + vy*vy;
        
        let tiltAngle = 0;
        let isHighSpeed = false;

        // SSOT: Use defined thresholds
        if (speedSq > VFX_PARAM.SPEED_TRAIL_THRESHOLD_SQ) {
            const speed = Math.sqrt(speedSq);
            isHighSpeed = speed > VFX_PARAM.SPEED_TILT_THRESHOLD;
            
            const dirX = vx / speed;
            const dot = dirX * agent.facing; 
            const maxTilt = 0.5; 
            // Calculate tilt based on reference max speed
            let tiltFactor = Math.min(1.0, speed / VFX_PARAM.SPEED_MAX_TILT_REF) * maxTilt;
            
            if (dot > 0) tiltAngle = tiltFactor * agent.facing;
            else tiltAngle = -tiltFactor * agent.facing * 1.5; 
        }

        const finalRotation = agent.physics.angle + tiltAngle;

        // Draw High Speed Ghosts / Trails (Behind Body)
        if (isHighSpeed && !isSilhouette && agent.hp > 0) {
            const history = agent.trailHistory;
            const step = 2;
            const maxGhosts = 2;
            const faction = FACTION_VISUALS[agent.team];
            
            for (let i = Math.max(0, history.length - 1 - (maxGhosts*step)); i < history.length - 1; i += step) {
                const pos = history[i];
                const opacity = (i / history.length) * 0.3; 
                ctx.save();
                const ghostY = VisualMath.getVisualBodyCenterY(pos.y, pos.z);
                ctx.translate(pos.x, ghostY);
                ctx.scale(UNIT_SCALE, UNIT_SCALE);
                ctx.rotate(finalRotation * 0.5);
                ctx.scale(agent.facing > 0 ? 1 : -1, 1);
                ctx.globalAlpha = opacity;
                ctx.globalCompositeOperation = 'screen'; 
                ctx.fillStyle = faction.flightTrailColor; 
                ctx.beginPath();
                ctx.moveTo(-10, -40); ctx.lineTo(10, -40);
                ctx.lineTo(5, 10); ctx.lineTo(-5, 10);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.save(); 
        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
        ctx.translate(px, bodyY); 
        
        let hitBrightness = 0;
        let squashX = 1.0;
        let squashY = 1.0;

        if (agent.hitFlashTimer > 0 && !isSilhouette) {
            const trauma = agent.hitFlashTimer / 0.1; 
            squashY = 1.0 - (trauma * 0.3);
            squashX = 1.0 + (trauma * 0.2);
            hitBrightness = 100 + Math.sin(t * 50) * 80;
        }

        // Spawn Animation: Drop-In instead of Stretch
        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; 
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            
            // Drop from height (-40px) to 0
            const dropOffset = (1 - eased) * -40;
            ctx.translate(0, dropOffset);
            
            // Fade in
            ctx.globalAlpha *= eased;
        }

        ctx.scale(UNIT_SCALE * squashX, UNIT_SCALE * squashY);
        ctx.rotate(finalRotation);

        let bodyFloat = 0; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat = Math.sin(t * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat = Math.sin(t * 4) * 2;
        }
        ctx.translate(0, bodyFloat);

        if (agent.hp <= 0 && !isSilhouette) {
            const fadeProgress = 1 - Math.max(0, agent.deathTimer / agent.DEATH_ANIM_DURATION);
            const opacity = Math.max(0, 0.7 - fadeProgress * 0.7); 
            ctx.filter = `grayscale(100%) opacity(${opacity * 100}%)`; 
        } else if (hitBrightness > 0) {
             ctx.filter = `brightness(${hitBrightness}%) contrast(120%)`;
        }

        // Layer 1: Rear Effects (Ribbons/Engines)
        if (agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            // Re-use threshold logic for trails
            if (agent.movementType === MovementType.FLYING || speedSq > 5000) {
                UnitFlightPainter.drawRibbonTrail(ctx, agent, t, terrainHeight);
            }
            if (agent.movementType === MovementType.FLYING) {
                UnitFlightPainter.drawFlightVFX(ctx, agent, t);
            }
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        if (agent.visualStatus === 'POLYMORPH' && !isSilhouette) {
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(t * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            // Layer 2: Main Body
            if (agent.team === Team.BLUE) {
                ImperialRenderer.draw(ctx, agent, t, isSilhouette);
            } else {
                CovenantRenderer.draw(ctx, agent, t, isSilhouette);
            }
            
            // Layer 4: Overlay Status (Ice Block)
            if (agent.visualStatus === 'FROZEN' && !isSilhouette) {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                ctx.drawImage(ice, -48, -64, 96, 128);
                ctx.restore();
            }
        }
        
        ctx.restore(); 
    }
};
