
import { Agent } from "../game";
import { SpriteManager } from "../sprites";
import { AssetManager } from "../assets";
import { Role, Team, MovementType } from "../../types";
import { RenderableItem } from "./grid";
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
                const h1 = getTerrainHeight(agent.q, agent.r);
                const nextHex = agent.path[0];
                const h2 = getTerrainHeight(nextHex.q, nextHex.r);
                h = HexUtils.lerp(h1, h2, agent.moveProgress);
            } else {
                // Static / Physics Drift
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
            
            list.push({
                y: agent.py + 1, // Sort by base position
                z: 10,
                draw: (ctx) => this.drawAssembly(
                    ctx, 
                    agent, 
                    agent.px, 
                    visualY, 
                    globalTime, 
                    highlightAgent === agent, // Direct reference check
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
        const maxDimension = HEX_SIZE * 2 * MAX_UNIT_SIZE_RATIO;
        
        // Distinct Scale Factors for Roles
        let roleScaleMod = 1.0;
        switch(agent.role) {
            case Role.TANK: roleScaleMod = 1.25; break; 
            case Role.WARRIOR: roleScaleMod = 1.1; break; 
            case Role.RANGER: roleScaleMod = 0.9; break; 
            case Role.MAGE: roleScaleMod = 0.9; break; 
            case Role.SUPPORT: roleScaleMod = 0.95; break;
        }

        const scaleFactor = (maxDimension / UNIT_REFERENCE_HEIGHT) * roleScaleMod;

        ctx.save();
        ctx.translate(drawX, drawY); // Base Position (Ground)
        ctx.scale(scaleFactor, scaleFactor);

        // Physics values scaled
        const physX = agent.physics.x / scaleFactor;
        const physY = agent.physics.y / scaleFactor;
        const physZ = agent.physics.z / scaleFactor; 

        // --- 1. DRAW BASE (Solid physical object on Ground) ---
        if (!isSilhouette && agent.hp > 0 && agent.visualStatus !== 'POLYMORPH') {
            const assets = SpriteManager.getUnitImages(agent.role, agent.team);
            
            // Draw The Heavy Base
            ctx.save();
            ctx.drawImage(assets.base, -64, -79); 
            ctx.restore();

            // Flying Tether (If flying)
            if (agent.movementType === MovementType.FLYING) {
                drawFlyingAnchor(ctx, agent, globalTime, physX, physY, physZ);
            }

            // Ground Rune (If Casting)
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
        }

        // --- 2. PREPARE BODY TRANSFORM (The Projection) ---
        // Move to physics offset (X, Y) and apply Lift (Z)
        ctx.translate(physX, physY - physZ); 
        ctx.rotate(agent.physics.angle); 

        // Vertical Float Animation
        let bodyFloat = -UNIT_BODY_OFFSET; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat -= Math.sin(globalTime * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat -= Math.sin(globalTime * 4) * 2;
        }

        ctx.translate(0, bodyFloat);

        // Spawn Animation
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

        // Hit/Death Filters
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(80%)'; 
        } else if (!isSilhouette && agent.hitFlashTimer > 0) {
            ctx.filter = 'brightness(200%)'; 
        } else if (whiteOverlay > 0) {
            ctx.filter = `brightness(${100 + whiteOverlay * 200}%)`;
        }

        // Flight Thrusters
        if (agent.movementType === MovementType.FLYING && agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            drawFlightVFX(ctx, agent, globalTime);
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        // Silhouette Setup
        if (isSilhouette) {
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.globalAlpha = 0.8; 
        }

        // --- 3. DRAW BODY ---
        if (agent.visualStatus === 'POLYMORPH') {
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(globalTime * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            if (agent.team === Team.BLUE) {
                ImperialRenderer.draw(ctx, agent, globalTime, isSilhouette);
            } else {
                CovenantRenderer.draw(ctx, agent, globalTime, isSilhouette);
            }
            
            if (!isSilhouette && agent.hp > 0 && agent.castingSkillIdx !== -1) {
                drawCastingVFX(ctx, agent, globalTime);
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

        // --- 4. STATUS & UI ---
        if (!isSilhouette) {
            drawStatusIcons(ctx, agent, globalTime, drawX, drawY, scaleFactor);
            drawStatusEffects(ctx, agent, globalTime);
        }

        ctx.restore(); // Undo Body Transform

        // --- SELECTION BRACKET REMOVED FROM HERE ---
        // Moved to TacticalRenderer for clean Overlay drawing

        // Spawn Role Icon
        if (agent.spawnTimer > 0 && !isSilhouette) {
            drawSpawnIndicator(ctx, agent, drawX, drawY, scaleFactor);
        }
    }
}
