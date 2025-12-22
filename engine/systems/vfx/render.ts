
import { GameEngine } from "../../game";
import { HexUtils, Vector, MapConfig } from "../../utils";
import { AssetManager } from "../../assets";
import { RenderableItem } from "../grid";
import { SceneTheme } from "../../../types";
import { VFXSystem } from "../vfx";
import { Particle } from "../vfx/state"; // Changed import to state

const UNIT_CHEST_HEIGHT = 40;

export class VFXRenderer {

    // --- Helper to calculate vertical offset during map transition ---
    private getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
        if (phase === 'IDLE') return 0;
        const centerQ = Math.floor(mapConfig.w / 2);
        const centerR = Math.floor(mapConfig.h / 2);
        const hex = HexUtils.fromPx(x, y, mapConfig);
        const maxDist = Math.max(mapConfig.w, mapConfig.h) / 2;
        const dist = Math.sqrt((hex.q - centerQ)**2 + (hex.r - centerR)**2);
        const d = dist / maxDist;
        
        if (phase === 'OUT') {
            const trigger = d * 0.3;
            if (t > trigger) {
                const fallT = Math.min(1, (t - trigger) * 2.5);
                return fallT * fallT * fallT * 1000;
            }
        } else if (phase === 'IN') {
            const trigger = d * 0.3;
            const riseT = Math.max(0, Math.min(1, (t - trigger) * 2.5));
            const easedRise = 1 - Math.pow(1 - riseT, 3);
            return (1 - easedRise) * 1000;
        }
        return 0;
    }

    // --- Rendering Collections ---

    public collectRenderables(
        engine: GameEngine,
        vfx: VFXSystem,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ): RenderableItem[] {
        const list: RenderableItem[] = [];

        // 1. Decals (Ground Level) - Access via state
        vfx.state.decals.forEach(d => {
            const offsetY = this.getTransitionOffset(d.x, d.y, mapConfig, transitionT, transitionPhase);
            const drawY = d.y + offsetY;
            if (drawY > d.y + 800) return;

            list.push({
                y: drawY, z: 0,
                draw: (ctx) => {
                    const img = AssetManager.getBlastZone(d.color);
                    ctx.save();
                    ctx.translate(d.x, drawY);
                    ctx.scale(d.scale, d.scale);
                    ctx.globalAlpha = Math.min(1, d.life);
                    ctx.drawImage(img, -64, -32, 128, 64);
                    ctx.restore();
                }
            });
        });

        // 2. Projectiles (Projectiles are stored in Engine, not VFX state, so this remains same)
        engine.projectiles.forEach(p => {
             const offsetP = this.getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
             if (offsetP > 500) return;

             let hStart = 0, hEnd = 0;
             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             if (getTerrainHeight && mapConfig) {
                 const startHex = HexUtils.fromPx(p.startX, p.startY, mapConfig);
                 const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, mapConfig);
                 hStart = getTerrainHeight(startHex.q, startHex.r);
                 hEnd = getTerrainHeight(targetHex.q, targetHex.r);
             }

             const getVisualPos = (lx: number, ly: number) => {
                 const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: lx, y: ly});
                 const t = Math.min(1, Math.max(0, currentDist / totalDist));
                 const currentTerrainHeight = hStart + (hEnd - hStart) * t;
                 
                 let arcOffset = 0;
                 // Apply Arc to ARROW, FIREBALL, and BOMB
                 if (p.skill.visual === 'ARROW' || p.skill.visual === 'FIREBALL' || p.skill.visual === 'BOMB') {
                     const apex = Math.min(150, totalDist * 0.3);
                     arcOffset = Math.sin(t * Math.PI) * apex; 
                 }
                 
                 const off = this.getTransitionOffset(lx, ly, mapConfig, transitionT, transitionPhase);
                 return {
                     x: lx,
                     y: ly - currentTerrainHeight - UNIT_CHEST_HEIGHT - arcOffset + off,
                     shadowY: ly - currentTerrainHeight + off
                 };
             };

             const headVis = getVisualPos(p.x, p.y);
             
             // Calculate Pitch Rotation (Visual Angle)
             // Use current direction to target to allow for homing curves
             const lookAheadDist = 5;
             const currentDir = Vector.sub(p.targetPos, {x: p.x, y: p.y});
             const distRemaining = Vector.mag(currentDir);
             
             // SAFE FALLBACK: If extremely close, keep moving towards target (or use last known good dir)
             // to prevent NaN when normalization fails on 0-length vector
             let dir;
             if (distRemaining > 0.1) {
                 dir = Vector.normalize(currentDir);
             } else {
                 // Fallback to overall trajectory logic to prevent snap
                 const totalTrajectory = Vector.sub(p.targetPos, {x: p.startX, y: p.startY});
                 const totalMag = Vector.mag(totalTrajectory);
                 dir = totalMag > 0.1 ? Vector.normalize(totalTrajectory) : {x: 1, y: 0};
             }

             const nextLx = p.x + dir.x * lookAheadDist;
             const nextLy = p.y + dir.y * lookAheadDist;
             const nextVis = getVisualPos(nextLx, nextLy);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             
             // Extra rotation for bombs (spin)
             const spin = p.skill.visual === 'BOMB' ? (Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y}) * 0.1) : 0;

             list.push({
                 y: p.y + 50 + offsetP, z: 20, 
                 draw: (ctx) => {
                    // Draw Shadow
                    ctx.save();
                    ctx.translate(headVis.x, headVis.shadowY);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();

                    // Draw Projectile
                    ctx.save();
                    ctx.translate(headVis.x, headVis.y);
                    if (p.skill.visual === 'BOMB') {
                        ctx.rotate(spin);
                    } else {
                        ctx.rotate(angle);
                    }
                    
                    const img = AssetManager.getProjectile(p.skill.visual || 'BOLT', p.skill.color);
                    
                    // DEBUG: Visual Fallback for Missing Assets
                    if (img && img.width > 0) {
                        ctx.drawImage(img, -48, -32, 96, 64);
                    } else {
                        // Draw pink box if asset is broken
                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(-5, -5, 10, 10);
                    }
                    
                    ctx.restore();
                 }
             });
        });

        return list;
    }

    public drawTopLayerParticles(
        ctx: CanvasRenderingContext2D, 
        vfx: VFXSystem,
        scene: SceneTheme,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        // Iterate over vfx.state.particles
        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            
            const offset = this.getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (offset > 800) return; 

            const progress = 1 - (p.life / p.maxLife);
            // Z acts as Y-offset in 2D draw call (up is negative)
            const drawY = p.y + offset - p.z;
            
            if (p.type === 'PILLAR' || p.type === 'SHOCKWAVE' || p.type === 'DOMAIN') {
                ctx.save();
                ctx.translate(p.x, drawY - 20); // Ground effects
                if (p.type === 'PILLAR') this.drawPillar(ctx, p, progress);
                else if (p.type === 'SHOCKWAVE') this.drawShockwave(ctx, p, progress);
                else if (p.type === 'DOMAIN') this.drawDomain(ctx, p, progress);
                ctx.restore();
                return;
            }

            ctx.save();
            ctx.translate(p.x, drawY);
            
            if (p.type === 'BEAM') {
                if (p.targetX !== undefined && p.targetY !== undefined) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = (1 - Math.abs(progress - 0.5)*2) * 5;
                    ctx.lineCap = 'round';
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(p.targetX - p.x, p.targetY - p.y); 
                    ctx.stroke();
                }
            } else if (p.type === 'RING') {
                ctx.scale(1, 0.55); 
                const r = progress * 40;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 1 - progress;
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
            } else if (p.type === 'SPARK') {
                const r = p.size;
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, '#fff'); 
                grad.addColorStop(0.3, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.globalAlpha = 1 - Math.pow(progress, 3); 
                ctx.globalCompositeOperation = 'lighter'; 
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'DEBRIS' || p.type === 'SHARD') {
                // Drawing Shards as jagged polygons
                ctx.fillStyle = p.color;
                ctx.rotate(p.rotation);
                
                // Draw a rough triangle/quad shape
                ctx.beginPath();
                const s = p.size;
                if (p.type === 'SHARD') {
                    // Jagged Shard
                    ctx.moveTo(-s, -s/2);
                    ctx.lineTo(0, -s);
                    ctx.lineTo(s, -s/2);
                    ctx.lineTo(0, s);
                } else {
                    // Box debris
                    ctx.rect(-s/2, -s/2, s, s);
                }
                ctx.fill();
                
                // Add highlight edge
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        });
    }

    private drawPillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        ctx.globalCompositeOperation = 'lighter';
        
        const lifeRatio = p.life / p.maxLife;
        const pulse = 1 + Math.sin(progress * 15) * 0.1;
        const baseWidth = 50 * (lifeRatio < 0.2 ? lifeRatio * 5 : 1) * pulse;
        const height = 1000;
        const alpha = Math.sin(lifeRatio * Math.PI) * 0.8; 
        
        ctx.save();
        ctx.scale(1, 0.55); 
        const ringSize = baseWidth * 1.5;
        const ringGrad = ctx.createRadialGradient(0, 0, ringSize * 0.5, 0, 0, ringSize);
        ringGrad.addColorStop(0, 'rgba(255,255,255,0)');
        ringGrad.addColorStop(0.5, p.color);
        ringGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = ringGrad;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath(); ctx.arc(0, 0, ringSize, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        const coreGrad = ctx.createLinearGradient(0, 0, 0, -height);
        coreGrad.addColorStop(0, '#fff');
        coreGrad.addColorStop(0.3, 'rgba(255,255,255,0.2)');
        coreGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = coreGrad;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-baseWidth * 0.2, -height, baseWidth * 0.4, height);

        const glowGrad = ctx.createLinearGradient(0, 0, 0, -height);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(0.5, 'transparent');
        
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillRect(-baseWidth * 0.8, -height, baseWidth * 1.6, height);
    }

    private drawShockwave(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        ctx.scale(1, 0.55); 
        const r = progress * 250; 
        const width = 30 * (1 - progress);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = width;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }

    private drawDomain(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
         ctx.scale(1, 0.55); 
         ctx.fillStyle = p.color;
         ctx.globalAlpha = 0.3 * (1 - progress);
         ctx.globalCompositeOperation = 'screen';
         ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.fill();
         ctx.strokeStyle = p.color;
         ctx.lineWidth = 2;
         ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI*2); ctx.stroke();
    }
}
