
import { Agent } from "../game";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { Role, Team, MovementType } from "../../types";
import { RenderList, RenderOpType } from "../renderers/RenderList";
import { HEX_SIZE, UNIT_BODY_OFFSET } from "../../constants";
import { HexUtils, MapConfig } from "../utils";

// Modules
import { ImperialRenderer } from "../renderers/units/factions/ImperialRenderer";
import { CovenantRenderer } from "../renderers/units/factions/CovenantRenderer";
import { drawFlyingAnchor, drawFlightVFX, drawCastingVFX, drawStatusEffects, drawStatusIcons, drawSpawnIndicator, drawSkillGroundIndicator, drawUltimateChantVFX } from "../renderers/units/UnitVisuals";

// Visual Constants
const MAX_UNIT_SIZE_RATIO = 0.85; 
const UNIT_REFERENCE_HEIGHT = 100; 

export class UnitRenderSystem {
    
    public submitRenderables(
        renderList: RenderList,
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig
    ) {
        agents.forEach(agent => {
            if (agent.hp <= 0 && agent.fullyDead) return;

            // --- HEIGHT CORRECTION LOGIC ---
            let h = 0;
            
            if (agent.isMoving && agent.path.length > 0) {
                const h1 = getTerrainHeight(agent.q, agent.r);
                const nextHex = agent.path[0];
                const h2 = getTerrainHeight(nextHex.q, nextHex.r);
                h = HexUtils.lerp(h1, h2, agent.moveProgress);
            } else {
                const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
                const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
                
                if (distSq > 100) {
                    const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                    h = getTerrainHeight(visualHex.q, visualHex.r);
                } else {
                    h = getTerrainHeight(agent.q, agent.r);
                }
            }

            // Ground Y (The floor)
            const visualY = agent.py - h;
            
            const op = renderList.next();
            op.type = RenderOpType.UNIT;
            op.y = agent.py + 1; // Sort base
            op.z = 10;
            
            op.agent = agent;
            op.tx = agent.px; // Draw X
            op.ty = visualY;  // Draw Y (Ground)
            op.time = globalTime;
            op.uSelected = (highlightAgent === agent);
            op.uSilhouette = false;
        });
    }

    public drawSilhouette(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        mapConfig: MapConfig
    ) {
        let h = 0;
        if (agent.isMoving && agent.path.length > 0) {
            const h1 = getTerrainHeight(agent.q, agent.r);
            const nextHex = agent.path[0];
            const h2 = getTerrainHeight(nextHex.q, nextHex.r);
            h = HexUtils.lerp(h1, h2, agent.moveProgress);
        } else {
            const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
            const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
            if (distSq > 100) {
                const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                h = getTerrainHeight(visualHex.q, visualHex.r);
            } else {
                h = getTerrainHeight(agent.q, agent.r);
            }
        }
        const visualY = agent.py - h;
        this.drawAssembly(ctx, agent, agent.px, visualY, globalTime, false, true);
    }

    // =========================================================================================
    // 🎨 ASSEMBLY PIPELINE: The core drawing logic
    // =========================================================================================
    public drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean
    ) {
        // 1. Calculate Scaling
        const maxDimension = HEX_SIZE * 2 * MAX_UNIT_SIZE_RATIO;
        let roleScaleMod = 1.0;
        switch(agent.role) {
            case Role.TANK: roleScaleMod = 1.25; break; 
            case Role.WARRIOR: roleScaleMod = 1.1; break; 
            case Role.RANGER: roleScaleMod = 0.9; break; 
            case Role.MAGE: roleScaleMod = 0.9; break; 
            case Role.SUPPORT: roleScaleMod = 0.95; break;
        }
        const scaleFactor = (maxDimension / UNIT_REFERENCE_HEIGHT) * roleScaleMod;

        // START MAIN TRANSFORM STACK
        ctx.save();
        
        // 2. Global Position Transform (Screen Space -> Unit Root)
        ctx.translate(drawX, drawY); 
        ctx.scale(scaleFactor, scaleFactor);

        // Calculate Physics Offsets (Scaled to Local Space)
        const physX = agent.physics.x / scaleFactor;
        const physY = agent.physics.y / scaleFactor;
        const physZ = agent.physics.z / scaleFactor; 

        // 3. LAYER: GROUND (Shadows / Base Plates / Casting Circles)
        // These are drawn relative to physics X/Y but usually stay on ground (Z=0)
        if (!isSilhouette && agent.hp > 0 && agent.visualStatus !== 'POLYMORPH') {
            this.drawGroundElements(ctx, agent, physX, physY, physZ, globalTime);
        }

        // 4. LAYER: UNIT BODY ROOT (Apply Physics Translation)
        // Now we move the context to the unit's actual body center (Chest/Feet)
        ctx.translate(physX, physY - physZ); 

        // 5. Apply Body Physics Rotation (e.g. Knockback spin)
        ctx.rotate(agent.physics.angle); 

        // 6. LAYER: ANIMATED BODY
        this.drawBodyElements(ctx, agent, globalTime, isSilhouette, isSelected, scaleFactor);

        // END MAIN TRANSFORM STACK
        ctx.restore();
    }

    private drawGroundElements(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number) {
        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        
        // Base Token / Shadow
        ctx.save();
        // Base stays at feet level (py), ignoring jump height (pz) usually, unless we want shadow to jump
        ctx.translate(px, py - pz); 
        
        // 1. Draw Base Plate
        // Use -64, -64 to perfectly center the 128x128 isometric base asset on the tile center
        ctx.drawImage(assets.base, -64, -64); 

        // 2. Draw Role Icon (Chess Piece Style)
        ctx.save();
        const iconBaseY = -24; 
        ctx.translate(0, iconBaseY);
        const breath = Math.sin(t * 2) * 1.5;
        ctx.translate(0, breath);

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(0, 28, 14, 6, 0, 0, Math.PI*2); ctx.fill();

        ctx.globalAlpha = 1.0; 
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
        ctx.drawImage(assets.icon, -32, -32, 64, 64);
        
        ctx.restore(); // End Icon
        ctx.restore(); // End Ground Group

        // Flying Tether
        if (agent.movementType === MovementType.FLYING) {
            drawFlyingAnchor(ctx, agent, t, px, py, pz);
        }

        // Casting Magic Circle (NEW: Unified Volumetric System)
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                const radius = skill.aoeRadius || 1;
                const isAOE = skill.type === 'AOE';
                
                ctx.save();
                // Pass the tag to determine visual intensity (Basic vs Active vs Ult)
                drawSkillGroundIndicator(ctx, px, py - pz, skill.color, t, progress, radius, skill.tag, isAOE);
                ctx.restore();
            }
        }
    }

    private drawBodyElements(ctx: CanvasRenderingContext2D, agent: Agent, t: number, isSilhouette: boolean, isSelected: boolean, scaleFactor: number) {
        // "Breathing" Animation (Idle Float)
        let bodyFloat = -UNIT_BODY_OFFSET; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat -= Math.sin(t * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat -= Math.sin(t * 4) * 2;
        }
        ctx.translate(0, bodyFloat);

        // Spawn / Hit Flash effects
        let spawnAlpha = 1.0;
        let whiteOverlay = 0;

        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; 
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            spawnAlpha = eased;
            whiteOverlay = 1 - eased; 
            ctx.scale(1, 2.0 - eased); 
            ctx.globalAlpha *= spawnAlpha;
        }

        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(80%)'; 
        } else if (!isSilhouette && agent.hitFlashTimer > 0) {
             whiteOverlay = 0.6; 
             ctx.filter = 'brightness(200%)';
        }

        // Apply Flight VFX (Thrusters)
        if (agent.movementType === MovementType.FLYING && agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            drawFlightVFX(ctx, agent, t);
        }

        // Face Direction
        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        if (isSilhouette) {
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 0.8; 
        }

        // Draw Model
        if (agent.visualStatus === 'POLYMORPH') {
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(t * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            if (agent.team === Team.BLUE) {
                ImperialRenderer.draw(ctx, agent, t, isSilhouette);
            } else {
                CovenantRenderer.draw(ctx, agent, t, isSilhouette);
            }
            
            if (!isSilhouette && agent.hp > 0 && agent.castingSkillIdx !== -1) {
                // Check if ULT to dispatch to new renderer
                const skill = agent.skills[agent.castingSkillIdx];
                if (skill && skill.tag === 'ULT') {
                    drawUltimateChantVFX(ctx, agent, t);
                } else {
                    drawCastingVFX(ctx, agent, t);
                }
            }
            
            if (agent.visualStatus === 'FROZEN') {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                ctx.drawImage(ice, -48, -75, 96, 128);
                ctx.restore();
            }
            
            if (agent.visualStatus === 'STASIS') {
                ctx.save();
                ctx.fillStyle = '#facc15';
                ctx.globalAlpha = 0.4;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.ellipse(0, -15, 25, 50, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Icons
        if (!isSilhouette) {
            drawStatusIcons(ctx, agent, t, 0, 0, scaleFactor);
            drawStatusEffects(ctx, agent, t);
        }
    }
}
