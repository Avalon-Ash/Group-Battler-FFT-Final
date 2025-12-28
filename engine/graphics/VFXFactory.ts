
import { createCanvas } from "./CanvasUtils";
import { GeometryPainter } from "./painters/GeometryPainter";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

const TEXTURE_SIZE = 64; 
const CENTER = TEXTURE_SIZE / 2;

// ============================================================================
// 🏭 MAIN FACTORY (The Facade)
// ============================================================================

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Entry point for generic particles (Smoke, Glow, Shards)
     */
    public getTexture(type: string, color: string): HTMLCanvasElement {
        // Normalization for legacy keys
        if (type === 'DUST' || type === 'PEBBLE') type = 'RUBBLE';
        if (type === 'RING' || type === 'SHOCKWAVE_RING') type = 'SHOCKWAVE';

        const key = `VFX_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4;
        ctx.translate(CENTER, CENTER);

        // --- DISPATCHER ---
        switch (type) {
            case 'ATMOSPHERE':
            case 'GLOW':
                ParticlePainter.drawAtmosphere(ctx, r, color);
                break;
            case 'CLOUD': // NEW: Dense volumetric cloud for poison/fog
                this.drawCloudTexture(ctx, r, color);
                break;
            case 'SMOKE':
            case 'SMOKE_PUFF':
                ParticlePainter.drawSmoke(ctx, r, color);
                break;
            case 'SHOCKWAVE':
                ParticlePainter.drawShockwave(ctx, r, color);
                break;
            case 'SPIKE':
            case 'SPARK':
                ParticlePainter.drawSpike(ctx, r * (type === 'SPARK' ? 0.3 : 0.8), color);
                break;
            case 'SHARD':
            case 'RUBBLE':
            case 'ROCK':
            case 'CHIP':
                ctx.fillStyle = color;
                GeometryPainter.drawHex(ctx, 0, 0, r * 0.5, 'FILL');
                break;
            case 'HEX_HALO':
            case 'HEX_FRAME':
                IconPainter.drawHexHalo(ctx, r, color);
                break;
            case 'HEX_LOCK':
            case 'HEX_RUNE':
                IconPainter.drawHexLock(ctx, r, color);
                break;
            case 'MAGIC_CIRCLE':
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                GeometryPainter.drawHex(ctx, 0, 0, r * 0.9, 'STROKE');
                ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2); ctx.stroke();
                break;
            case 'WARNING_HATCH':
                this.drawWarningHatch(ctx, r, color);
                break;
            default:
                // Fallback debug shape
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    // New: Dense Cloud Texture Generation
    private drawCloudTexture(ctx: CanvasRenderingContext2D, r: number, color: string) {
        // Base Blob
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        
        // Draw multiple overlapping circles to create irregular cloud shape
        const count = 5;
        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = r * 0.3;
            const size = r * 0.6;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Center fill
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI*2);
        ctx.fill();
    }

    // --- TERRAIN DETAIL CACHING (FPS OPTIMIZATION) ---
    public getTerrainDetail(type: string, color: string, variant: number): HTMLCanvasElement {
        const vIdx = variant % 4;
        const key = `TERRAIN_${type}_${color}_${vIdx}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const size = HEX_SIZE * 2; 
        const { canvas, ctx } = createCanvas(size, size);
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.translate(cx, cy);
        ctx.scale(1, ISO_SCALE_Y); 

        const rnd = (offset: number) => {
            const v = Math.sin(vIdx * 999 + offset) * 1000;
            return v - Math.floor(v);
        };

        ctx.fillStyle = color;
        ctx.globalAlpha = type === 'VOID' ? 0.1 : 0.3;

        if (type === 'FOREST') {
            for(let i=0; i<8; i++) {
                const px = (rnd(i) - 0.5) * HEX_SIZE * 1.4;
                const py = (rnd(i+10) - 0.5) * HEX_SIZE * 1.4;
                if (px*px + py*py > (HEX_SIZE*0.7)**2) continue;
                
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px - 1.5, py - 5);
                ctx.lineTo(px + 1.5, py - 5);
                ctx.fill();
            }
        } else if (type === 'DESERT') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for(let i=0; i<3; i++) {
                const py = (rnd(i) - 0.5) * HEX_SIZE;
                ctx.beginPath();
                ctx.moveTo(-10, py);
                ctx.quadraticCurveTo(0, py + 4, 10, py);
                ctx.stroke();
            }
        } else if (type === 'VOID') {
             ctx.strokeStyle = color;
             ctx.lineWidth = 1;
             ctx.beginPath();
             const px = (rnd(1) - 0.5) * HEX_SIZE;
             const py = (rnd(2) - 0.5) * HEX_SIZE;
             ctx.moveTo(px, py);
             ctx.lineTo(px + 10, py);
             ctx.lineTo(px + 15, py + 5);
             ctx.stroke();
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
        } else {
            for(let i=0; i<5; i++) {
                const px = (rnd(i*2) - 0.5) * HEX_SIZE * 1.2;
                const py = (rnd(i*2+1) - 0.5) * HEX_SIZE * 1.2;
                if (px*px + py*py > (HEX_SIZE*0.7)**2) continue;
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + rnd(i*3), 0, Math.PI*2);
                ctx.fill();
            }
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    private drawWarningHatch(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.save();
        GeometryPainter.drawHex(ctx, 0, 0, r, 'FILL');
        ctx.globalCompositeOperation = 'source-in';
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        
        const size = r * 2;
        const spacing = 10;
        ctx.beginPath();
        for (let i = -size; i < size; i += spacing) {
            ctx.moveTo(i - size, -size);
            ctx.lineTo(i + size, size);
        }
        ctx.stroke();
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 2;
        GeometryPainter.drawHex(ctx, 0, 0, r, 'STROKE');
        ctx.restore();
    }

    public generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        ctx.translate(cx, cy);

        switch (visual) {
            case 'HEX_DART':
            case 'ARROW': ProjectilePainter.drawImperialSniper(ctx, color); break;
            case 'CRYSTAL': ProjectilePainter.drawImperialCrystal(ctx, color); break;
            case 'ORB': ProjectilePainter.drawImperialOrb(ctx, color); break;
            case 'BOLT': ProjectilePainter.drawCovenantBolt(ctx, color); break;
            case 'AXE': ProjectilePainter.drawCovenantAxe(ctx, color); break;
            case 'FIREBALL': ProjectilePainter.drawCovenantFireball(ctx, color); break;
            case 'BOMB': ProjectilePainter.drawBomb(ctx, color); break;
            default: ProjectilePainter.drawCovenantBolt(ctx, color); break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    public generateGlowOrb(color: string): HTMLCanvasElement { return this.getTexture('ATMOSPHERE', color); }
    public generateCracks(color: string): HTMLCanvasElement { return this.getTexture('CRACKS', color); }
    
    public generateFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_CLOUD_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        const grad = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
        grad.addColorStop(0, color); 
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(64, 32, 30, 0, Math.PI*2);
        ctx.arc(44, 32, 20, 0, Math.PI*2);
        ctx.arc(84, 32, 20, 0, Math.PI*2);
        ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_ZONE_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        return this.getTexture('SHOCKWAVE', color); 
    }
}

export const VFXFactory = new VFXTextureCache();
