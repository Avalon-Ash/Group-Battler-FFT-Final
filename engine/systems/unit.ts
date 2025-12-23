
import { Agent } from "../game";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { Role, Team, MovementType } from "../../types";
import { RenderableItem } from "./grid";
import { HEX_SIZE } from "../../constants";
import { HexUtils, MapConfig } from "../utils";

// Modules
import { drawImperialLegion, drawArcaneCovenant } from "../renderers/units/UnitModels";
import { drawFlyingAnchor, drawFlightVFX, drawCastingVFX, drawStatusEffects, drawStatusIcons, drawSpawnIndicator } from "../renderers/units/UnitVisuals";

// Visual Constants
const MAX_UNIT_SIZE_RATIO = 0.85; 
const UNIT_REFERENCE_HEIGHT = 100; 

export class UnitRenderSystem {
    
    public collectRenderables(
        agents: Agent[], 
        getTerrainHeight: (q: number, r: number) => number, 
        globalTime: number, 
        highlightAgent: Agent | null,
        mapConfig: MapConfig
    ): RenderableItem[] {
        const list: RenderableItem[] = [];
        
        agents.forEach(agent => {
            if (agent.hp <= 0 && agent.fullyDead) return;

            // --- HEIGHT CORRECTION LOGIC ---
            let h = 0;
            
            if (agent.isMoving && agent.path.length > 0) {
                // Movement Interpolation
                // Linearly interpolate between start tile height and end tile height based on move progress
                const h1 = getTerrainHeight(agent.q, agent.r);
                const nextHex = agent.path[0];
                const h2 = getTerrainHeight(nextHex.q, nextHex.r);
                h = HexUtils.lerp(h1, h2, agent.moveProgress);
            } else {
                // Static / Physics Drift
                // If the unit has drifted significantly from its logical tile center (e.g., knockback),
                // sample height at its visual position to prevent clipping through walls.
                const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
                const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
                
                if (distSq > 100) {
                    const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                    h = getTerrainHeight(visualHex.q, visualHex.r);
                } else {
                    h = getTerrainHeight(agent.q, agent.r);
                }
            }

            // Apply Visual Offset (Y is down in Canvas, so subtract height to move "up")
            const visualY = agent.py - h;
            
            list.push({
                y: agent.py + 1, // Sort by base position (ground level) to maintain consistency with terrain sorting
                z: 10,
                draw: (ctx) => this.drawAssembly(
                    ctx, 
                    agent, 
                    agent.px, 
                    visualY, 
                    globalTime, 
                    highlightAgent === agent,
                    false // Normal Mode
                )
            });
        });

        return list;
    }

    // Called by Renderer for Occlusion Pass
    public drawSilhouette(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        getTerrainHeight: (q: number, r: number) => number,
        globalTime: number,
        mapConfig: MapConfig
    ) {
        // Consistent height logic for silhouettes
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

    // =================================================================================
    // 🎨 HIERARCHICAL VECTOR ASSEMBLY RENDERER
    // =================================================================================

    private drawAssembly(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        drawX: number, 
        drawY: number, 
        globalTime: number, 
        isSelected: boolean,
        isSilhouette: boolean
    ) {
        // 1. Setup Constraint Space
        const maxDimension = HEX_SIZE * 2 * MAX_UNIT_SIZE_RATIO;
        
        // Distinct Scale Factors for Roles
        let roleScaleMod = 1.0;
        switch(agent.role) {
            case Role.TANK: roleScaleMod = 1.25; break; // Bulky
            case Role.WARRIOR: roleScaleMod = 1.1; break; // Standard strong
            case Role.RANGER: roleScaleMod = 0.9; break; // Agile/Slim
            case Role.MAGE: roleScaleMod = 0.9; break; // Small/Floating
            case Role.SUPPORT: roleScaleMod = 0.95; break;
        }

        const scaleFactor = (maxDimension / UNIT_REFERENCE_HEIGHT) * roleScaleMod;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(scaleFactor, scaleFactor);

        // 3. Apply Physics (Z-Jump / Blast)
        // We apply Physics Z translation to the whole container (Base + Body)
        const physX = agent.physics.x / scaleFactor;
        const physY = agent.physics.y / scaleFactor;
        const physZ = agent.physics.z / scaleFactor; 

        // --- DRAW BASE & ANCHOR (Ground Level - Before Physics Translation) ---
        // This ensures the marker stays on the "Ground" even if the unit flies up
        if (!isSilhouette && agent.hp > 0 && agent.visualStatus !== 'POLYMORPH') {
            const assets = SpriteManager.getUnitImages(agent.role, agent.team);
            
            // Standard Ground Base
            ctx.save();
            ctx.drawImage(assets.base, -64, -79); 
            
            // FLYING UNIT ANCHOR (Target Reticle on Grid + Lift Beam)
            if (agent.movementType === MovementType.FLYING) {
                drawFlyingAnchor(ctx, agent, globalTime, physX, physY, physZ);
            }

            // Casting Floor Rune (Ground level)
            if (agent.castingSkillIdx !== -1) {
                const skill = agent.skills[agent.castingSkillIdx];
                if (skill) {
                    const circle = AssetManager.getMagicCircle(skill.color, skill.tag === 'ULT');
                    ctx.save(); 
                    ctx.scale(1, 0.5); 
                    ctx.rotate(globalTime * 2);
                    ctx.globalAlpha = 0.6;
                    ctx.drawImage(circle, -64, -64, 128, 128); 
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        // Apply Logic/Physics Offset to Body
        ctx.translate(physX, physY - physZ); 
        ctx.rotate(agent.physics.angle); // Apply Ragdoll Rotation

        // --- PREPARE BODY TRANSFORM ---
        // Shift up to align body feet with ground (y=0)
        const BODY_GROUNDING_OFFSET = -31; 
        let bodyFloat = BODY_GROUNDING_OFFSET; 
        
        // Add Breathing / Hovering
        if (agent.hp > 0) {
             if ((agent.role === Role.MAGE || agent.role === Role.SUPPORT) && !agent.isMoving && agent.visualStatus === 'NONE') {
                bodyFloat -= 5 + Math.sin(globalTime * 2) * 3; // Mages float higher
            }
        } else {
            bodyFloat = -5; // Dead units sink slightly into ground
        }

        ctx.translate(0, bodyFloat);

        // --- 2. Spawn Animation (Materialize) ---
        let spawnAlpha = 1.0;
        let whiteOverlay = 0;

        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; // From game.ts init
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); // 0 -> 1
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic Out
            
            spawnAlpha = eased;
            const spawnStretch = 2.0 - eased; // 2.0 -> 1.0
            whiteOverlay = 1 - eased; // 1 -> 0
            
            // Scale body vertically around its feet (now at 0,0 due to translate)
            ctx.scale(1, spawnStretch);
            ctx.globalAlpha *= spawnAlpha;
        }

        // Hit Flash / Death Filter
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(80%)'; 
        } else if (!isSilhouette && agent.hitFlashTimer > 0) {
            ctx.filter = 'brightness(200%)'; 
        } else if (whiteOverlay > 0) {
            ctx.filter = `brightness(${100 + whiteOverlay * 200}%)`;
        }

        // --- FLIGHT VFX (Under Feet) ---
        // Drawn before flipping scale so particles don't flip with facing
        if (agent.movementType === MovementType.FLYING && agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            drawFlightVFX(ctx, agent, globalTime);
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        // SILHOUETTE MODE SETUP
        if (isSilhouette) {
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 0.8; 
        }

        // 4. Render Body (or Special Form)
        if (agent.visualStatus === 'POLYMORPH') {
            // Draw Sheep
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(globalTime * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            // Standard Unit Render
            if (agent.team === Team.BLUE) {
                drawImperialLegion(ctx, agent, globalTime, isSilhouette);
            } else {
                drawArcaneCovenant(ctx, agent, globalTime, isSilhouette);
            }
            
            // Casting VFX (Only if alive)
            if (!isSilhouette && agent.hp > 0 && agent.castingSkillIdx !== -1) {
                drawCastingVFX(ctx, agent, globalTime);
            }
            
            // Frozen Overlay
            if (agent.visualStatus === 'FROZEN') {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                // Ice block needs to cover body, roughly centered
                ctx.drawImage(ice, -48, -75, 96, 128);
                ctx.restore();
            }
            
            // Stasis Overlay
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

        // 6. Selection Ring & Status (Only Normal Mode & Alive)
        if (!isSilhouette) {
            drawStatusIcons(ctx, agent, globalTime, drawX, drawY, scaleFactor);
            drawStatusEffects(ctx, agent, globalTime);
            
            if (isSelected && agent.hp > 0) {
                // Draw Selection Ring around Body center (approx -20)
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 / scaleFactor; 
                ctx.beginPath();
                ctx.ellipse(0, -20, 30, 15, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore(); // End Assembly

        // 7. Spawn Role Indicator
        // Drawn AFTER restore so it is not affected by body stretch/fade/rotation
        if (agent.spawnTimer > 0 && !isSilhouette) {
            drawSpawnIndicator(ctx, agent, drawX, drawY, scaleFactor);
        }
    }
}
