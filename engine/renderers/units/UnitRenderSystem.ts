
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
import { drawFlyingAnchor, drawFlightVFX, drawCastingVFX, drawStatusEffects, drawStatusIcons, drawSpawnIndicator } from "../renderers/units/UnitVisuals";

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

        // --- SELECTION BRACKET (FIXED) ---
        // Drawn HERE, inside the translation stack, so it follows the unit.
        // Drawn BEFORE rotation so it stays upright.
        if (isSelected && !isSilhouette) {
            this.drawSelectionBracket(ctx, globalTime);
        }

        // 5. Apply Body Physics Rotation (e.g. Knockback spin)
        ctx.rotate(agent.physics.angle); 

        // 6. LAYER: ANIMATED BODY
        this.drawBodyElements(ctx, agent, globalTime, isSilhouette, isSelected, scaleFactor);

        // END MAIN TRANSFORM STACK
        ctx.restore();

        // 7. LAYER: SPAWN INDICATOR (Screen Space / World Space Overlay)
        // This is drawn outside the scale/rotate stack to keep text readable
        if (agent.spawnTimer > 0 && !isSilhouette) {
            drawSpawnIndicator(ctx, agent, drawX, drawY, scaleFactor);
        }
    }

    private drawGroundElements(ctx: CanvasRenderingContext2D, agent: Agent, px: number, py: number, pz: number, t: number) {
        const assets = SpriteManager.getUnitImages(agent.role, agent.team);
        
        // Base Token / Shadow
        ctx.save();
        // Base stays at feet level (py), ignoring jump height (pz) usually, unless we want shadow to jump
        // But `py` in physics includes movement. Let's assume shadow tracks ground position.
        // However, existing logic passed (physX, physY-physZ) implying shadow jumps. 
        // We stick to established visual style:
        ctx.translate(px, py - pz); 
        ctx.drawImage(assets.base, -64, -79); 
        ctx.restore();

        // Flying Tether
        if (agent.movementType === MovementType.FLYING) {
            drawFlyingAnchor(ctx, agent, t, px, py, pz);
        }

        // Casting Magic Circle
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const circle = AssetManager.getMagicCircle(skill.color, skill.tag === 'ULT');
                ctx.save(); 
                ctx.translate(px, py - pz); 
                ctx.scale(1, 0.5); 
                ctx.rotate(t * 2);
                ctx.globalAlpha = 0.6;
                ctx.drawImage(circle, -64, -64, 128, 128); 
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
                drawCastingVFX(ctx, agent, t);
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
            // Note: Passed 0,0 because we are already translated to correct position
            drawStatusIcons(ctx, agent, t, 0, 0, scaleFactor);
            drawStatusEffects(ctx, agent, t);
        }
    }

    private drawSelectionBracket(ctx: CanvasRenderingContext2D, t: number) {
        ctx.save();
        ctx.translate(0, -45); // Center vertically on unit chest

        // 1. Rotating Brackets
        ctx.save();
        const bracketSize = 55; 
        ctx.rotate(t * 0.5);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#22d3ee'; 
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        
        const cornerLen = Math.PI / 3;
        for(let i=0; i<4; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, bracketSize, i * (Math.PI/2) - cornerLen/2, i * (Math.PI/2) + cornerLen/2);
            ctx.stroke();
        }

        // 2. Inner Ring
        ctx.rotate(-t * 1.5);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, bracketSize * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 3. Floating Arrow
        ctx.save();
        const bounce = Math.sin(t * 8) * 6;
        const arrowHeight = 85; 
        ctx.translate(0, -arrowHeight + bounce);
        
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(-8, -12); 
        ctx.lineTo(8, -12);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();
        
        // Dot
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -18, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}
