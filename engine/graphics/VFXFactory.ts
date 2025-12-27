
import { createCanvas } from "./CanvasUtils";

const TEXTURE_SIZE = 64; 
const CENTER = TEXTURE_SIZE / 2;

class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Get visual texture. 
     * TYPES:
     * - SHARD: Faceted 3D-like chunk
     * - RUBBLE: Cluster of tiny dots (Gravel)
     * - SPIKE: Sharp starburst (Impact)
     * - SPARK: Needle line
     * - SLASH: Sharp crescent
     * - CRACKS: Jagged lines
     */
    public getTexture(type: 'SHARD' | 'RUBBLE' | 'SPIKE' | 'SPARK' | 'SLASH' | 'CRACKS' | 'RING' | 'GLOW' | 'MAGIC_CIRCLE' | 'DUST' | 'PEBBLE', color: string): HTMLCanvasElement {
        // Mapping old/alias types to new sharp types
        if (type === 'DUST' || type === 'PEBBLE') return this.getTexture('RUBBLE', color);
        if (type === 'GLOW' || type === 'RING') return this.getTexture('SPIKE', color);

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

    public generateGlowOrb(color: string): HTMLCanvasElement {
        return this.getTexture('GLOW', color);
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
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(w/2, h/2, w/2, h/2, 0, 0, Math.PI*2);
        ctx.fill();
        
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_ZONE_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        
        ctx.translate(cx, cy);
        ctx.scale(1, 0.5); 
        
        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI*2); ctx.stroke();
        
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateHexFog(color: string): HTMLCanvasElement {
        const key = `HEX_FOG_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        
        const { canvas, ctx } = createCanvas(128, 128);
        const cx = 64, cy = 64;
        const size = 50;
        
        const grad = ctx.createRadialGradient(cx, cy, size*0.5, cx, cy, size);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            const angle = (Math.PI/6 + Math.PI/4) + i * Math.PI/3;
            const x = cx + Math.cos(angle) * size;
            const y = cy + Math.sin(angle) * size;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.fill();
        
        this.cache.set(key, canvas);
        return canvas;
    }

    // =========================================================================================
    // 🔨 LOW-POLY FACET BAKING
    // =========================================================================================

    private bakeTexture(type: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4;

        ctx.translate(CENTER, CENTER);

        if (type === 'SHARD') {
            // Faceted Rock/Crystal Chunk
            // Draw a base polygon, then draw a "highlight" facet on top
            
            // 1. Base Shape (Darker/Main Color)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-r*0.6, -r*0.8);
            ctx.lineTo(r*0.8, -r*0.2);
            ctx.lineTo(r*0.4, r*0.8);
            ctx.lineTo(-r*0.8, r*0.4);
            ctx.closePath();
            ctx.fill();

            // 2. Highlight Facet (Top Left) - Gives 3D look
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(-r*0.6, -r*0.8);
            ctx.lineTo(0, 0); // Center point
            ctx.lineTo(-r*0.8, r*0.4);
            ctx.closePath();
            ctx.fill();

            // 3. Shadow Facet (Bottom Right)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r*0.8, -r*0.2);
            ctx.lineTo(r*0.4, r*0.8);
            ctx.closePath();
            ctx.fill();
            
            // 4. Rim
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        else if (type === 'RUBBLE') {
            // Cluster of tiny sharp debris (Gravel spray)
            ctx.fillStyle = color;
            const count = 5;
            for(let i=0; i<count; i++) {
                const ox = (Math.random() - 0.5) * r * 1.5;
                const oy = (Math.random() - 0.5) * r * 1.5;
                const s = 2 + Math.random() * 4;
                
                // Draw square/diamond dots, NOT circles
                ctx.fillRect(ox, oy, s, s);
            }
        }
        else if (type === 'SPIKE') {
            // Sharp Impact Starburst (Comic style POW)
            ctx.fillStyle = color;
            ctx.beginPath();
            const points = 8;
            for(let i=0; i<points*2; i++) {
                const angle = (i / (points*2)) * Math.PI * 2;
                const len = i % 2 === 0 ? r : r * 0.3; // Spiky
                const x = Math.cos(angle) * len;
                const y = Math.sin(angle) * len;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
            ctx.fill();
            
            // White core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, r*0.2, 0, Math.PI*2);
            ctx.fill();
        }
        else if (type === 'SPARK') {
            // Needle Line
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            // Thin diamond
            ctx.moveTo(-r, 0); 
            ctx.lineTo(0, 2); 
            ctx.lineTo(r, 0); 
            ctx.lineTo(0, -2);
            ctx.fill();
            
            // Halo
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r*0.8, 0); ctx.lineTo(r*0.8, 0);
            ctx.stroke();
        }
        else if (type === 'CRACKS') {
            // Lightning/Fracture lines
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'butt'; 
            ctx.lineJoin = 'bevel';
            
            const branches = 3;
            for(let i=0; i<branches; i++) {
                const angle = (i / branches) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                
                // Zig Zag
                let cx = 0, cy = 0;
                const len = r;
                const cx1 = Math.cos(angle) * len * 0.5 + (Math.random()-0.5)*15;
                const cy1 = Math.sin(angle) * len * 0.5 + (Math.random()-0.5)*15;
                ctx.lineTo(cx1, cy1);
                
                const cx2 = Math.cos(angle) * len;
                const cy2 = Math.sin(angle) * len;
                ctx.lineTo(cx2, cy2);
                
                ctx.stroke();
            }
        }
        else if (type === 'MAGIC_CIRCLE') {
            // Keep geometric circle for Magic, but sharpen it
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            // Octagon instead of circle for "hard" feel
            const sides = 8;
            for(let i=0; i<=sides; i++) {
                const a = (i/sides)*Math.PI*2;
                const x = Math.cos(a)*r*0.8;
                const y = Math.sin(a)*r*0.8;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.stroke();
            
            // Runes as squares
            ctx.fillStyle = '#fff';
            for(let i=0; i<4; i++) {
                const a = (i/4)*Math.PI*2;
                const x = Math.cos(a)*r*0.8;
                const y = Math.sin(a)*r*0.8;
                ctx.fillRect(x-2, y-2, 4, 4);
            }
        }

        return canvas;
    }

    private bakeProjectile(visual: string, color: string): HTMLCanvasElement {
        const w = 64; const h = 32;
        const { canvas, ctx } = createCanvas(w, h);
        const cy = h/2;

        if (visual === 'ARROW' || visual === 'BOLT') {
            // Arrowhead
            ctx.fillStyle = '#fff'; 
            ctx.beginPath(); ctx.moveTo(w, cy); ctx.lineTo(w-12, cy-6); ctx.lineTo(w-12, cy+6); ctx.fill();
            
            // Shaft (Rect)
            ctx.fillStyle = color; 
            ctx.fillRect(0, cy-2, w-10, 4);
        }
        else if (visual === 'FIREBALL' || visual === 'BOMB') {
            // Jagged Rock/Fireball
            ctx.fillStyle = color;
            ctx.beginPath(); 
            const spikes = 6;
            const r = 14;
            const cx = w-16;
            for(let i=0; i<spikes*2; i++) {
                const a = (i/(spikes*2))*Math.PI*2;
                const rad = i%2===0 ? r : r*0.6;
                ctx.lineTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad);
            }
            ctx.fill();
            
            // Core
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx-4, cy-4, 8, 8);
        }
        else {
            // Beam segment
            ctx.fillStyle = color;
            ctx.fillRect(0, cy-3, w, 6);
        }
        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
