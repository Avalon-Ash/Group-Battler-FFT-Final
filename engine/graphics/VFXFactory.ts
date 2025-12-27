
import { createCanvas } from "./CanvasUtils";

const TEXTURE_SIZE = 64; 
const CENTER = TEXTURE_SIZE / 2;

class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Get visual texture. 
     */
    public getTexture(type: 'SHARD' | 'RUBBLE' | 'SPIKE' | 'SPARK' | 'SLASH' | 'CRACKS' | 'RING' | 'GLOW' | 'MAGIC_CIRCLE' | 'DUST' | 'PEBBLE' | 'ATMOSPHERE' | 'GENERIC_DEBUG' | 'SMOKE_PUFF' | 'SHOCKWAVE' | 'HEX_HALO' | 'HEX_PRISM' | 'HEX_RUNE' | 'HEX_LOCK' | 'HEX_FRAME', color: string): HTMLCanvasElement {
        // Alias mapping
        if (type === 'DUST' || type === 'PEBBLE') return this.getTexture('RUBBLE', color);
        if (type === 'RING' || type === 'SHOCKWAVE_RING' as any) return this.getTexture('SHOCKWAVE', color); 

        const key = `${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const texture = this.bakeTexture(type, color);
        this.cache.set(key, texture);
        return texture;
    }

    public generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const texture = this.bakeProjectile(visual, color);
        this.cache.set(key, texture);
        return texture;
    }

    // --- HEXAGON HELPER ---
    private drawHexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; 
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    private bakeProjectile(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        
        ctx.translate(cx, cy);
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        if (visual === 'ARROW') {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3; 
            ctx.beginPath();
            ctx.moveTo(-40, 0); ctx.lineTo(20, 0);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            this.drawHexPath(ctx, 30, 0, 10);
            ctx.fill();
        }
        else if (visual === 'BOLT') {
            const grad = ctx.createLinearGradient(-40, 0, 40, 0);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, '#fff');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-40, 0); ctx.lineTo(0, -10); ctx.lineTo(40, 0); ctx.lineTo(0, 10);
            ctx.fill();
        }
        else if (visual === 'FIREBALL') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.4, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            this.drawHexPath(ctx, 0, 0, 25);
            ctx.fill();
        }
        else {
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        }
        return canvas;
    }

    public generateGlowOrb(color: string): HTMLCanvasElement {
        return this.getTexture('ATMOSPHERE', color);
    }

    public generateCracks(color: string): HTMLCanvasElement {
        return this.getTexture('CRACKS', color);
    }

    public generateFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_CLOUD_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        const w = 128, h = 64;
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.6, color.replace(')', ', 0.4)').replace('rgb', 'rgba')); 
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        this.drawHexPath(ctx, w/2, h/2, 30); ctx.fill();
        this.drawHexPath(ctx, w/2-20, h/2, 20); ctx.fill();
        this.drawHexPath(ctx, w/2+20, h/2, 20); ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_ZONE_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        ctx.translate(cx, cy);
        ctx.scale(1, 0.58); 
        const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, 60);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)');
        grad.addColorStop(0.2, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        this.drawHexPath(ctx, 0, 0, 55); 
        ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    // =========================================================================================
    // 🔨 VOLUMETRIC TEXTURE BAKING (HEXAGON EDITION)
    // =========================================================================================

    private bakeTexture(type: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4;

        ctx.translate(CENTER, CENTER);

        // 1. ATMOSPHERICS
        if (type === 'ATMOSPHERE' || type === 'GLOW' || type === 'SMOKE_PUFF') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            if (type === 'SMOKE_PUFF') {
                grad.addColorStop(0, color); 
                grad.addColorStop(0.4, color);
                grad.addColorStop(1, 'transparent');
            } else {
                grad.addColorStop(0, '#ffffff'); // Hot core
                grad.addColorStop(0.3, color);
                grad.addColorStop(1, 'transparent');
            }
            ctx.fillStyle = grad;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            this.drawHexPath(ctx, 0, 0, r * 0.8); 
            ctx.fill();
            return canvas;
        }

        // 2. HARD DEBRIS
        if (type === 'SHARD' || type === 'RUBBLE' || type === 'ROCK' || type === 'CHIP') {
            ctx.fillStyle = color;
            this.drawHexPath(ctx, 0, 0, r * 0.6); 
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(0,0); ctx.lineTo(r*0.4, -r*0.4); ctx.lineTo(-r*0.4, -r*0.4);
            ctx.fill();
            return canvas;
        }

        // 3. ENERGETIC BURSTS
        if (type === 'SPIKE' || type === 'SPARK') {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            const w = type === 'SPARK' ? r * 0.3 : r * 0.5;
            for(let i=0; i<6; i++) {
                const angle = i * Math.PI/3;
                ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r); 
                ctx.lineTo(Math.cos(angle + Math.PI/6)*w, Math.sin(angle + Math.PI/6)*w); 
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0,0, w*0.5, 0, Math.PI*2); ctx.fill();
            return canvas;
        }

        // 4. RINGS & WAVES (Hex Rings)
        if (type === 'SHOCKWAVE' || type === 'SHOCKWAVE_RING' as any || type === 'RING') {
            const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            this.drawHexPath(ctx, 0, 0, r * 0.8);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
            this.drawHexPath(ctx, 0, 0, r * 0.6);
            ctx.stroke();
            return canvas;
        }

        // 5. MAGIC CIRCLE
        if (type === 'MAGIC_CIRCLE') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            this.drawHexPath(ctx, 0, 0, r * 0.9);
            ctx.stroke();
            ctx.save();
            ctx.rotate(Math.PI/6);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            this.drawHexPath(ctx, 0, 0, r * 0.6);
            ctx.stroke();
            ctx.restore();
            return canvas;
        }

        // 6. CC: HEX HALO (Stun) - Single clean hex for rotation
        if (type === 'HEX_HALO' || type === 'HEX_FRAME') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.lineCap = 'round';
            this.drawHexPath(ctx, 0, 0, r * 0.8);
            ctx.stroke();
            
            // Add dots at corners
            ctx.fillStyle = '#fff';
            for(let i=0; i<6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = Math.cos(angle) * r * 0.8;
                const py = Math.sin(angle) * r * 0.8;
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
            }
            return canvas;
        }

        // 7. CC: HEX PRISM - NOT USED DIRECTLY, WE USE WIREFRAME CONSTRUCT IN RENDERER
        // But keeping a subtle fill version just in case
        if (type === 'HEX_PRISM') {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            this.drawHexPath(ctx, 0, 0, r * 0.8);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            this.drawHexPath(ctx, 0, 0, r * 0.8);
            ctx.stroke();
            return canvas;
        }

        // 8. CC: HEX LOCK
        if (type === 'HEX_LOCK' || type === 'HEX_RUNE') {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 5;
            this.drawHexPath(ctx, 0, 0, r * 0.8);
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
            ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
            ctx.stroke();
            return canvas;
        }

        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
