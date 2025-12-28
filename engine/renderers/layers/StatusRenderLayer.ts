
import { Agent, GameEngine } from "../../game";
import { Team } from "../../../types";
import { ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../../constants";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { AssetManager } from "../../assets";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

// =========================================================================================
// 🛡️ STATUS RENDER LAYER (Dedicated Pipeline)
// 
// Purpose: Exclusive renderer for persistent status effects (Shields, CC, Debuffs).
// Architecture: Decoupled from UnitRenderer. Handles its own Z-sorting relative to units.
// Performance: Batches context state changes.
// =========================================================================================

export class StatusRenderLayer {

    public draw(ctx: CanvasRenderingContext2D, agents: Agent[], globalTime: number) {
        // We do two passes to handle depth correctly:
        // Pass 1: Floor Effects (Root, Traps) - Drawn BEHIND unit body logic (usually)
        // Pass 2: Body/Overhead Effects (Shield, Stun, Silence) - Drawn ABOVE unit
        
        // However, since this layer runs *after* unit body drawing in the main loop,
        // we utilize Z-offset logic to visual depth.

        for (const agent of agents) {
            if (agent.hp <= 0 && agent.fullyDead) continue;
            
            // Calculate Unit Center Mass
            // Note: We access physics directly for raw interpolation if needed
            const px = agent.px;
            const py = agent.py; 
            const pz = agent.physics.z; 
            
            // Banish hides everything else, render it and skip
            if (agent.banished) {
                this.drawBanishment(ctx, agent, px, py, pz, globalTime);
                continue;
            }

            this.drawFloorEffects(ctx, agent, px, py, pz, globalTime);
            this.drawBodyEffects(ctx, agent, px, py, pz, globalTime);
            this.drawOverheadIcons(ctx, agent, px, py, pz, globalTime);
        }
    }

    // --- 1. FLOOR / GROUND EFFECTS ---
    private drawFloorEffects(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        // ROOT (Chain/Vines)
        if (agent.rootTimer > 0) {
            const color = '#fbbf24'; // Amber
            ctx.save();
            ctx.translate(x, y - z); // Anchor to feet position visually
            
            // Dynamic pulsing ring
            const pulse = 0.8 + Math.sin(t * 10) * 0.2;
            SurfaceAssets.drawHexRipple(ctx, 0, 0, 20, color, pulse, 2);

            // 3D Spikes (Simulated)
            ctx.fillStyle = color;
            ctx.globalCompositeOperation = 'source-over'; // Solid
            for(let i=0; i<3; i++) {
                const angle = i * (Math.PI*2/3) + t;
                const r = 18;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r * ISO_SCALE_Y;
                
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy - 25); // Spike tip up
                ctx.lineTo(sx + 6, sy + 3);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // --- 2. BODY ENCAPSULATION (Shields, Fields) ---
    private drawBodyEffects(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        // SHIELD
        if (agent.shield > 0) {
            const isBlue = agent.team === Team.BLUE;
            const color = isBlue ? '#bae6fd' : '#f87171'; // Cyan vs Red tint
            
            // Shield Pulse
            const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
            const pulse = 0.2 + (pct * 0.3) + Math.sin(t * 3) * 0.1;
            
            ctx.save();
            ctx.translate(x, y - z); // Ground level anchor
            
            // Volumetric Prism Shell
            // Height 90 covers most standard units
            SurfaceAssets.draw3DPrism(ctx, 0, 0, 35, 90, color, pulse, 'SOLID');
            
            // Inner Core Ripple
            ctx.translate(0, -45); // Center mass
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            // Simple energy line
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI*2);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    // --- 3. OVERHEAD ICONS (CC Status) ---
    private drawOverheadIcons(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        // Priority System: Only show most severe CC
        let type = '';
        if (agent.stunTimer > 0) type = 'STUN';
        else if (agent.fearTimer > 0) type = 'FEAR';
        else if (agent.tauntTimer > 0) type = 'TAUNT';
        else if (agent.silenceTimer > 0) type = 'SILENCE';
        else if (agent.blindTimer > 0) type = 'BLIND';

        if (!type) return;

        const icon = AssetManager.getStatusIcon(type);
        if (!icon) return;

        // Bobbing Animation
        const bob = Math.sin(t * 6) * 5;
        const anchorY = y - z - UNIT_BODY_OFFSET - 60 + bob; // Approx 60px above body center

        ctx.save();
        ctx.translate(x, anchorY);
        
        // Glow Backing
        const color = STATUS_VISUALS[type]?.primaryColor || '#fff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        // Draw Icon
        ctx.drawImage(icon, -24, -24, 48, 48);
        
        ctx.restore();
    }

    // --- SPECIAL: BANISH / STASIS ---
    private drawBanishment(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        const isStasis = agent.visualStatus === 'STASIS';
        const color = isStasis ? '#facc15' : '#c084fc'; // Gold or Purple
        const height = 110; 
        
        ctx.save();
        ctx.translate(x, y - z);
        
        // Use SurfaceAssets for high-quality Prism
        // Opacity oscillation
        const opacity = 0.4 + Math.sin(t * 2) * 0.1;
        SurfaceAssets.draw3DPrism(ctx, 0, 0, 40, height, color, opacity, 'SOLID');
        
        // Lock Icon Floating inside
        const icon = AssetManager.getStatusIcon(isStasis ? 'STASIS' : 'BANISH');
        if (icon) {
            ctx.translate(0, -height/2);
            ctx.scale(0.8, 0.8);
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(icon, -24, -24);
        }

        ctx.restore();
    }
}
