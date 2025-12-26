
import { createCanvas } from "./CanvasUtils";
import { isChaosStyle } from "../systems/vfx/utils";

// Dimensions
const TEXTURE_SIZE = 128; // Standard size for pre-baked assets
const CENTER = TEXTURE_SIZE / 2;

class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    // Accessor for legacy code and new system
    public getTexture(type: 'GLOW' | 'SOLID' | 'OUTLINE' | 'NOISE' | 'BLAST', color: string): HTMLCanvasElement {
        const key = `${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const texture = this.bakeTexture(type, color);
        this.cache.set(key, texture);
        return texture;
    }

    private bakeTexture(type: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4; // Padding to avoid clipping

        ctx.translate(CENTER, CENTER);

        // Pre-bake blend mode adjustments? 
        // No, keep pixel data pure. Blend mode is applied at render time.

        if (type === 'GLOW') {
            // Soft blurry hex
            const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            this.pathHex(ctx, r);
            ctx.fill();
        } 
        else if (type === 'SOLID') {
            // Crisp solid hex with rim
            ctx.fillStyle = color;
            this.pathHex(ctx, r * 0.9);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            this.pathHex(ctx, r * 0.9);
            ctx.stroke();
        }
        else if (type === 'OUTLINE') {
            // Sharp stroke
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            this.pathHex(ctx, r * 0.8);
            ctx.stroke();
        }
        else if (type === 'NOISE') {
            // Textured hex
            ctx.fillStyle = color;
            this.pathHex(ctx, r);
            ctx.fill();
            
            // Overlay Noise
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
                // Chaos Spikes
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
                // Order Lens Flare
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, '#ffffff');        
                grad.addColorStop(0.3, color);          
                grad.addColorStop(1, 'transparent');  
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            }
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

    // --- Legacy Bridge Methods (To keep existing code working) ---
    // These now alias to the new cached system where possible or create on demand
    
    generateGlowOrb(color: string, size: number = 64): HTMLCanvasElement {
        return this.getTexture('GLOW', color);
    }

    generateFogCloud(color: string): HTMLCanvasElement {
        // Fog is unique enough to keep a dedicated generator or just use a large GLOW
        return this.getTexture('GLOW', color); 
    }

    generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        // Projectiles are complex sprites, keep using dedicated generation
        // But we could optimize this later
        return this.createLegacyProjectile(visual, color);
    }

    generateBlastZone(color: string): HTMLCanvasElement {
        // Just use a large Glow/Blast texture
        return this.getTexture('BLAST', color);
    }

    // Moved legacy generator here for encapsulation
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
            // Bolt
            const grad = ctx.createLinearGradient(0, 0, 96, 0);
            grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#fff');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.ellipse(cx, cy, 30, 8, 0, 0, Math.PI*2); ctx.fill();
        }
        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
