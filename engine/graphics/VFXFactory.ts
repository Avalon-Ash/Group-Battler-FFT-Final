
import { createCanvas } from "./CanvasUtils";
import { isChaosStyle } from "../systems/vfx/utils";

// Dimensions
const TEXTURE_SIZE = 128; 
const CENTER = TEXTURE_SIZE / 2;

class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public getTexture(type: 'GLOW' | 'SOLID' | 'OUTLINE' | 'NOISE' | 'BLAST' | 'SHARD' | 'CHIP' | 'CRACKS', color: string): HTMLCanvasElement {
        const key = `${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const texture = this.bakeTexture(type, color);
        this.cache.set(key, texture);
        return texture;
    }

    private bakeTexture(type: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4;

        ctx.translate(CENTER, CENTER);

        if (type === 'GLOW') {
            const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            this.pathHex(ctx, r);
            ctx.fill();
        } 
        else if (type === 'SOLID') {
            ctx.fillStyle = color;
            this.pathHex(ctx, r * 0.9);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            this.pathHex(ctx, r * 0.9);
            ctx.stroke();
        }
        else if (type === 'OUTLINE') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            this.pathHex(ctx, r * 0.8);
            ctx.stroke();
        }
        else if (type === 'NOISE') {
            ctx.fillStyle = color;
            this.pathHex(ctx, r);
            ctx.fill();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for(let i=0; i<20; i++) {
                const rx = (Math.random() - 0.5) * r * 1.5;
                const ry = (Math.random() - 0.5) * r * 1.5;
                const rs = Math.random() * r * 0.4;
                ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI*2); ctx.fill();
            }
        }
        else if (type === 'BLAST') {
            const isChaos = isChaosStyle(color);
            if (isChaos) {
                ctx.fillStyle = color;
                ctx.beginPath();
                for(let i=0; i<12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const rad = (i % 2 === 0) ? r : r * 0.4;
                    const x = Math.cos(angle) * rad;
                    const y = Math.sin(angle) * rad;
                    if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
            } else {
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, '#ffffff');        
                grad.addColorStop(0.3, color);          
                grad.addColorStop(1, 'transparent');  
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            }
        }
        else if (type === 'CHIP') {
            // Simple Square Chip
            ctx.fillStyle = color;
            ctx.fillRect(-r/2, -r/2, r, r);
        }
        else if (type === 'SHARD') {
            // Triangular Shard
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(-r * 0.5, r * 0.4);
            ctx.lineTo(-r * 0.5, -r * 0.4);
            ctx.fill();
            // Subtle highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        else if (type === 'CRACKS') {
            // Pre-baked jagged fractal lines for Magma/Ground effects
            // This replaces the expensive per-frame drawing
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            const branches = 4;
            for(let i=0; i<branches; i++) {
                const angle = (i / branches) * Math.PI * 2 + (Math.random()*0.5);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                
                let cx = 0, cy = 0;
                const len = r * 0.9;
                const steps = 3;
                for(let j=0; j<steps; j++) {
                    const stepLen = len / steps;
                    // Deterministic randomness for baking
                    const r1 = Math.sin(i * 99 + j * 33);
                    const r2 = Math.cos(i * 55 + j * 77);
                    
                    cx += Math.cos(angle) * stepLen + r1 * 8;
                    cy += Math.sin(angle) * stepLen + r2 * 8;
                    ctx.lineTo(cx, cy);
                }
                ctx.stroke();
            }
            // Glowing Core
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        }

        return canvas;
    }

    private pathHex(ctx: CanvasRenderingContext2D, r: number) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    generateGlowOrb(color: string, size: number = 64): HTMLCanvasElement {
        return this.getTexture('GLOW', color);
    }

    generateFogCloud(color: string): HTMLCanvasElement {
        return this.getTexture('GLOW', color); 
    }

    generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        return this.createLegacyProjectile(visual, color);
    }

    generateBlastZone(color: string): HTMLCanvasElement {
        return this.getTexture('BLAST', color);
    }

    // New Accessor for Cracks
    generateCracks(color: string): HTMLCanvasElement {
        return this.getTexture('CRACKS', color);
    }

    private createLegacyProjectile(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(96, 64);
        const cx = 48, cy = 32;
        ctx.shadowColor = color; ctx.shadowBlur = 10;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        if (visual === 'ARROW') {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(80, cy); ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(90, cy); ctx.lineTo(70, cy - 8); ctx.lineTo(75, cy); ctx.lineTo(70, cy + 8); ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(0, 0, 96, 0);
            grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#fff');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.ellipse(cx, cy, 30, 8, 0, 0, Math.PI*2); ctx.fill();
        }
        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
