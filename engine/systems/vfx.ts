
import { GameEngine } from "../game";
import { HexUtils, Vector, MapConfig } from "../utils";
import { AssetManager } from "../assets";
import { RenderableItem } from "./grid";
import { SceneTheme, Team } from "../../types";
import { PALETTE } from "../../constants";

const UNIT_CHEST_HEIGHT = 40;
const GRAVITY = 1800; // Gravity for particles

interface Particle {
    active: boolean; // Pooling flag
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rotation: number;     // Current rotation
    vRotation: number;    // Rotation speed
    life: number;
    maxLife: number;
    color: string;
    size: number;
    type: 'SPARK' | 'SMOKE' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'RING' | 'BEAM' | 'SHOCKWAVE' | 'PILLAR' | 'DOMAIN';
    targetX?: number; // For BEAM
    targetY?: number; // For BEAM
    delay?: number;
}

interface Decal {
    x: number;
    y: number;
    color: string;
    life: number;
    scale: number;
}

interface GridFlash {
    q: number;
    r: number;
    color: string;
    life: number;
}

export class VFXSystem {
    public particles: Particle[] = [];
    public decals: Decal[] = [];
    public gridFlashes: GridFlash[] = [];

    // Object Pool
    private particlePool: Particle[] = [];

    private getParticle(): Particle {
        if (this.particlePool.length > 0) {
            const p = this.particlePool.pop()!;
            p.active = true;
            return p;
        }
        return { 
            active: true,
            x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, 
            rotation: 0, vRotation: 0,
            life: 0, maxLife: 0, color: '#fff', size: 0, type: 'SPARK' 
        };
    }

    private releaseParticle(p: Particle) {
        p.active = false;
        this.particlePool.push(p);
    }

    update(dt: number, globalTime: number, ambientType: string) {
        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            if (p.delay && p.delay > 0) {
                p.delay -= dt;
                continue;
            }

            p.life -= dt;
            if (p.life <= 0) {
                this.releaseParticle(p);
                this.particles.splice(i, 1);
                continue;
            }

            // Physics Integration
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.rotation += p.vRotation * dt;

            // Gravity & Environment Logic
            if (p.type === 'DEBRIS' || p.type === 'SHARD') {
                p.vz -= GRAVITY * dt; // Gravity
                
                // Ground Bounce
                if (p.z < 0) {
                    p.z = 0;
                    if (Math.abs(p.vz) > 100) {
                        p.vz = -p.vz * 0.5; // Bounce
                        p.vx *= 0.6; // Friction
                        p.vy *= 0.6;
                        p.vRotation *= 0.5;
                    } else {
                        p.vz = 0;
                        p.vx *= 0.1; // Stop sliding
                        p.vy *= 0.1;
                    }
                }
            } else if (p.type === 'SPARK' || p.type === 'SMOKE') {
                p.vx *= 0.90; 
                p.vy *= 0.90;
                p.vz *= 0.90; // Drag
            }
        }

        // Update Decals
        for (let i = this.decals.length - 1; i >= 0; i--) {
            this.decals[i].life -= dt * 0.5;
            if (this.decals[i].life <= 0) this.decals.splice(i, 1);
        }

        // Update Grid Flashes
        for (let i = this.gridFlashes.length - 1; i >= 0; i--) {
            this.gridFlashes[i].life -= dt * 2.0;
            if (this.gridFlashes[i].life <= 0) this.gridFlashes.splice(i, 1);
        }
    }

    // --- Spawners ---

    spawnUnitShatter(x: number, y: number, team: Team) {
        // Colors
        // Blue: Silver armor, Gold trim, Blue energy
        // Red: Iron armor, Bone trim, Red energy
        const armorColor = team === Team.BLUE ? '#e2e8f0' : '#27272a';
        const trimColor = team === Team.BLUE ? '#fbbf24' : '#a1a1aa';
        const coreColor = team === Team.BLUE ? '#3b82f6' : '#ef4444';

        // 1. Armor Shards (Heavy chunks)
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 200;
            const p = this.getParticle();
            
            p.x = x; p.y = y; p.z = 30 + Math.random() * 30; // Start at chest height
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.vz = 200 + Math.random() * 300; // Pop up
            
            p.life = 2.0; p.maxLife = 2.0;
            p.color = Math.random() > 0.5 ? armorColor : trimColor;
            p.size = 6 + Math.random() * 6;
            p.type = 'SHARD';
            p.rotation = Math.random() * Math.PI;
            p.vRotation = (Math.random() - 0.5) * 20;
            p.delay = 0;
            this.particles.push(p);
        }

        // 2. Core Sparks (Energy leak)
        this.spawnExplosion(x, y, 30, 15, coreColor, 1.5, 0.8, 'SPARK');

        // 3. Shockwave
        this.addImpact(x, y, coreColor, 'RING', 0.5);
        
        // 4. Ground Scorch
        this.addDecal(x, y, '#000');
    }

    spawnBeam(sx: number, sy: number, tx: number, ty: number, color: string) {
        const p = this.getParticle();
        p.x = sx; p.y = sy; p.z = 0;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.targetX = tx; p.targetY = ty;
        p.life = 0.5; p.maxLife = 0.5;
        p.color = color; p.size = 5;
        p.type = 'BEAM';
        p.delay = 0;
        this.particles.push(p);
    }

    spawnDomainExpansion(x: number, y: number, color: string, duration: number) {
        const p = this.getParticle();
        p.x = x; p.y = y; p.z = 10;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.life = duration; p.maxLife = duration;
        p.color = color; p.size = 0;
        p.type = 'DOMAIN';
        p.delay = 0;
        this.particles.push(p);
    }

    spawnExplosion(x: number, y: number, z: number, count: number, color: string, speed: number, life: number, type: 'SPARK' | 'SMOKE') {
        const actualCount = type === 'SPARK' ? count * 1.5 : count;
        
        for (let i = 0; i < actualCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 150 * speed;
            const p = this.getParticle();
            
            p.x = x; p.y = y; p.z = z;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.vz = (Math.random() * 150 + 50) * speed; // Sparks fly up
            p.life = life * (0.5 + Math.random() * 0.5);
            p.maxLife = life;
            p.color = color;
            p.size = type === 'SPARK' ? Math.random() * 4 + 3 : Math.random() * 3 + 1;
            p.type = type;
            p.delay = 0;
            
            this.particles.push(p);
        }
    }

    spawnDebris(x: number, y: number, color: string, count: number) {
        // Fallback for generic debris
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 50 + 20;
            const p = this.getParticle();
            
            p.x = x; p.y = y; p.z = 20;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.vz = Math.random() * 100 + 100;
            p.life = 2.0; p.maxLife = 2.0;
            p.color = color; p.size = Math.random() * 4 + 2;
            p.type = 'DEBRIS';
            p.delay = 0;
            
            this.particles.push(p);
        }
    }

    spawnTeleport(x: number, y: number, color: string) {
        this.spawnPillar(x, y, color, 1.0, 0);
        this.addImpact(x, y, color, 'RING', 1.0);
    }
    
    spawnDivinePillar(x: number, y: number, color: string, life: number, delay: number = 0) {
        this.spawnPillar(x, y, color, life, delay);
    }
    
    spawnPillar(x: number, y: number, color: string, life: number, delay: number = 0) {
        const p = this.getParticle();
        p.x = x; p.y = y; p.z = 0;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.life = life; p.maxLife = life;
        p.color = color; p.size = 100;
        p.type = 'PILLAR';
        p.delay = delay;
        this.particles.push(p);
    }

    spawnShockwave(x: number, y: number, color: string, life: number) {
        const p = this.getParticle();
        p.x = x; p.y = y; p.z = 10;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.life = life; p.maxLife = life;
        p.color = color; p.size = 0;
        p.type = 'SHOCKWAVE';
        p.delay = 0;
        this.particles.push(p);
    }

    addGridFlash(q: number, r: number, color: string) {
        this.gridFlashes.push({ q, r, color, life: 1.0 });
    }

    addImpact(x: number, y: number, color: string, type: 'RING', life: number) {
        const p = this.getParticle();
        p.x = x; p.y = y; p.z = 5;
        p.vx = 0; p.vy = 0; p.vz = 0;
        p.life = life; p.maxLife = life;
        p.color = color; p.size = 0;
        p.type = type;
        p.delay = 0;
        this.particles.push(p);
    }

    addDecal(x: number, y: number, color: string) {
        this.decals.push({
            x, y, color, life: 10.0, scale: 0.5 + Math.random() * 0.5
        });
    }

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

    collectRenderables(
        engine: GameEngine,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ): RenderableItem[] {
        const list: RenderableItem[] = [];

        // 1. Decals (Ground Level)
        this.decals.forEach(d => {
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

        // 2. Projectiles
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
             // If extremely close to target, use simple fallback to avoid jitter
             const dir = distRemaining > 0.1 ? Vector.normalize(currentDir) : {x: 1, y: 0};

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
                    ctx.drawImage(img, -48, -32, 96, 64);
                    ctx.restore();
                 }
             });
        });

        return list;
    }

    drawTopLayerParticles(
        ctx: CanvasRenderingContext2D, 
        scene: SceneTheme,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        this.particles.forEach(p => {
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
