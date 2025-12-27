
import { Agent } from "../../game";
import { Team } from "../../../types";
import { HEX_SIZE } from "../../../constants";
import { FACTION_VISUALS } from "../../../data/vfx/faction_visuals";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { AssetManager } from "../../assets";
import { VFXFactory } from "../../graphics/VFXFactory";

/**
 * Draws the "Tether" for flying units.
 * Replaces old dashed line with a vertical energy beam gradient.
 */
export function drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.deathSpiritColor; 
    
    // Calculate ground point relative to current context (already translated to unit head)
    // Unit drawing context is at: physX, physY - physZ
    // So ground is at: 0, +physZ
    
    ctx.save();
    
    // Vertical Gradient Beam
    const grad = ctx.createLinearGradient(0, 0, 0, physZ);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); // Fade at body
    grad.addColorStop(0.5, color);        // Brightest in middle
    grad.addColorStop(1, 'rgba(0,0,0,0)'); // Fade at ground
    
    ctx.globalAlpha = 0.4 + Math.sin(t * 5) * 0.1;
    ctx.fillStyle = grad;
    
    // Thin beam
    const w = 2;
    ctx.fillRect(-w/2, 0, w, physZ);
    
    // Ground anchor glow
    ctx.translate(0, physZ);
    ctx.scale(1, 0.5); // Flatten for ISO
    
    const glow = VFXFactory.getTexture('GLOW', color);
    const sz = 24;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(glow, -sz/2, -sz/2, sz, sz);

    ctx.restore();
}

/**
 * Draws jet/flight trails.
 * Replaces rotating hex lines with scaling glow sprites.
 */
export function drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
    const color = faction.flightTrailColor;
    const glow = VFXFactory.getTexture('GLOW', color);

    ctx.save();
    ctx.translate(0, 10); 
    
    // Draw 2 oscillating thrusters
    for(let i = -1; i <= 1; i += 2) {
        ctx.save();
        const offsetX = i * 10;
        const pulse = Math.sin(t * 20 + i) * 0.2 + 0.8;
        
        ctx.translate(offsetX, 0);
        ctx.scale(0.5 * pulse, 1.0 * pulse);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow, -16, 0, 32, 48); // Stretch downwards
        ctx.restore();
    }
    
    ctx.restore();
}

/**
 * Draws casting indicator (Charging).
 * Replaces vector hexes with a rotating Ring Texture.
 */
export function drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    
    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;
    const ring = VFXFactory.getTexture('RING', color);
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Floating Ring above head
    ctx.translate(0, -60); 
    
    // Scale up as cast completes
    const scale = 0.5 + progress * 0.5;
    ctx.scale(scale, scale * 0.6); // Flattened
    
    ctx.rotate(t * 5);
    ctx.globalAlpha = 0.8 * progress;
    
    const size = 64;
    ctx.drawImage(ring, -size/2, -size/2, size, size);
    
    // Second ring rotating opposite
    ctx.rotate(t * -10);
    ctx.scale(0.7, 0.7);
    ctx.drawImage(ring, -size/2, -size/2, size, size);

    ctx.restore();

    if (skill.type === 'AOE') {
        drawDomainExpansion(ctx, agent, t, color, progress);
    }
}

/**
 * Draws AOE warning on caster.
 * Replaces stroke with expanding Shockwave texture.
 */
export function drawDomainExpansion(ctx: CanvasRenderingContext2D, agent: Agent, t: number, color: string, progress: number) {
    const texture = VFXFactory.getTexture('RING', color); // Use Ring for clean expansion
    
    ctx.save();
    ctx.translate(0, -40); 
    const scale = (0.5 + progress * 1.5) * 2.0; // Expand outward
    ctx.scale(scale, scale * 0.6); 
    
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (1 - progress) * 0.5; // Fade out as it expands
    
    const size = 64;
    ctx.drawImage(texture, -size/2, -size/2, size, size);
    
    ctx.restore();
}

/**
 * Draws Ultimate preparation.
 * Uses Magic Circle texture.
 */
export function drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    const skill = agent.skills[agent.castingSkillIdx];
    if (!skill) return;
    const progress = 1 - (agent.castTimer / skill.cast);
    const color = skill.color;
    const texture = VFXFactory.getTexture('MAGIC_CIRCLE', color);

    ctx.save();
    ctx.translate(0, -40); 
    
    // Spin faster as it completes
    ctx.rotate(t * (2 + progress * 5));
    ctx.scale(1, 0.6);
    
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.4 + progress * 0.6;
    
    const size = 100;
    ctx.drawImage(texture, -size/2, -size/2, size, size);

    // Core glow
    const glow = VFXFactory.getTexture('GLOW', color);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow, -30, -30, 60, 60);

    ctx.restore();
}

/**
 * Draws the ground indicator for skills.
 * Uses Volumetric Hex from SurfaceAssets (Texture based).
 */
export function drawSkillGroundIndicator(
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, 
    color: string, 
    t: number, 
    progress: number, 
    skillRadius: number, 
    type: string, 
    isAOE: boolean
) {
    // Note: Context is already translated to ground target position by caller
    
    const maxPx = Math.max(1, skillRadius) * HEX_SIZE;
    const currentRadius = maxPx * progress;
    const opacity = 0.3 + Math.sin(t * 5) * 0.1;

    // Use Volumetric Draw (No Vectors!)
    // We convert pixel radius back to approximate Hex unit for the drawing function
    // drawVolumetricHex expects screen coords x,y and radius in pixels
    SurfaceAssets.drawVolumetricHex(ctx, x, y, currentRadius, color, opacity);
    
    // Add a Ring at the edge for definition
    const ringSize = currentRadius * 2.5; 
    const ring = VFXFactory.getTexture('RING', color);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.58); // ISO
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = opacity * 1.5;
    ctx.drawImage(ring, -ringSize/2, -ringSize/2, ringSize, ringSize);
    ctx.restore();
}

/**
 * Draws status icons overhead.
 * Uses textures for backgrounds.
 */
export function drawStatusIcons(ctx: CanvasRenderingContext2D, agent: Agent, t: number, drawX: number, drawY: number, scaleFactor: number) {
    if (agent.hp > 0 && agent.castingSkillIdx !== -1) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (skill) {
            ctx.save();
            ctx.translate(0, -110);
            
            // Background Glow
            const bg = VFXFactory.getTexture('GLOW', skill.color);
            ctx.globalAlpha = 0.6;
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(bg, -30, -30, 60, 60);
            
            ctx.restore();
        }
    }
}

/**
 * Draws status effects (Stun, Silence, etc.)
 * Uses AssetManager icons.
 */
export function drawStatusEffects(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
    if (agent.hp <= 0) return;
    
    let statusId = 'NONE';
    if (agent.banished) statusId = 'BANISH';
    else if (agent.stunTimer > 0) statusId = 'STUN';
    else if (agent.silenceTimer > 0) statusId = 'SILENCE';
    
    if (agent.visualStatus !== 'NONE') statusId = agent.visualStatus;

    const def = STATUS_VISUALS[statusId];
    if (!def || def.overheadType === 'NONE') return;

    ctx.save();
    if (agent.facing < 0) ctx.scale(-1, 1);
    
    // Position above head
    ctx.translate(0, Math.round(-70));

    if (def.overheadType === 'ICON' || def.overheadType === 'GHOST_FLOAT' || def.overheadType === 'BUBBLE_POP') {
        const bob = Math.sin(t * 4) * 5;
        ctx.translate(0, bob);
        
        const icon = AssetManager.getStatusIcon(statusId);
        if (icon) {
            const size = 32;
            // Shadow for readability
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.drawImage(icon, -size/2, -size/2, size, size);
            ctx.shadowBlur = 0;
        }
    } 

    ctx.restore();
}
