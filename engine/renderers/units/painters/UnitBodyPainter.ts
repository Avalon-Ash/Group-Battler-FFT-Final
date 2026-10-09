
// ╔══════════════════════════════════════════════════════════╗
// ║  UnitBodyPainter — 存活單位的主體繪製                    ║
// ║  職責：hp > 0 單位的外觀渲染、血條、狀態圖示繪製         ║
// ║  [ARCH] 外觀資料來源：UNIT_APPEARANCE (SSOT)             ║
// ║  [ARCH] hp <= 0 時 early return，死亡演出由 DeathPainter 負責 ║
// ║  [ARCH] AnimState 由 AnimationSystem 寫入，此處唯讀       ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { Team, AnimState, MovementType, ActionState } from "../../../../types";
import { UNIT_SCALE, VFX_PARAM, ISO_SCALE_Y } from "../../../../constants";
import { ImperialRenderer } from "../factions/ImperialRenderer";
import { CovenantRenderer } from "../factions/CovenantRenderer";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { UnitCorePainter } from "./UnitCorePainter";
import { UnitAmbientPainter } from "./UnitAmbientPainter";
import { SpriteManager } from "../../../sprites";
import { VisualMath } from "../../../math/VisualMath";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { MaterialPainter } from "../../../graphics/materials/MaterialPainter";
import { MATERIAL_CONFIG } from "../../../../data/vfx/materialConfig";

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
        // [ARCH] 存活檢查：UnitBodyPainter 僅負責 hp > 0 的視覺表現
        // 死亡演出已遷移至 UnitDeathPainter.draw() 並由 UnitRenderSystem 統一調度
        if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;
        
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

        const isDashing = agent.actionState === ActionState.EVADING;

        // Draw High Speed Ghosts / Trails (Behind Body)
        if ((isHighSpeed || isDashing) && !isSilhouette && agent.hp > 0) {
            if (MATERIAL_CONFIG.enabled && MATERIAL_CONFIG.motionTrail.enabled) {
                // [MATERIAL UPGRADE] 動態拖尾：以遞減 alpha 疊繪單位貼圖殘影
                const assets = SpriteManager.getUnitImages(agent.role, agent.team);
                const pz = agent.physics.z;
                const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
                ctx.save();
                ctx.translate(px + agent.visualOffset.x, bodyY + agent.visualOffset.y);
                ctx.scale(UNIT_SCALE, UNIT_SCALE);
                const screenVy = vy * ISO_SCALE_Y;
                MaterialPainter.drawMotionTrail(ctx, assets.base, 64, vx, screenVy, 0.45);
                ctx.restore();
            } else {
                // 原本的 screen 幾何 ghost 作為 fallback
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
        }

        ctx.save(); 
        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
        // Apply visual offset for hit shake without polluting physics position
        ctx.translate(px + agent.visualOffset.x, bodyY + agent.visualOffset.y); 

        // Task 5: CAST_ULT Pulsing
        if (agent.animState === AnimState.CAST_ULT) {
            const progress = 1 - (agent.castTimer / (agent.castingAnimationTimer || 1));
            const ultPulse = 1 + 0.15 * Math.abs(Math.sin(progress * Math.PI * 3));
            ctx.scale(ultPulse, ultPulse);
        }
        
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

        if (hitBrightness > 0) {
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

            // Layer 3: Ambient Faction VFX
            if (!isSilhouette && agent.hp > 0) {
                UnitAmbientPainter.draw(ctx, agent, t);
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
