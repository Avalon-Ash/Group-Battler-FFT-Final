
import { createCanvas } from "./CanvasUtils";
import { GeometryPainter } from "./painters/GeometryPainter";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";
import { HexGeometry } from "./utils/HexGeometry";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

// Updated: 128px for high fidelity on all screens
const TEXTURE_SIZE = 128; 
const CENTER = TEXTURE_SIZE / 2;

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public getTexture(type: string, color: string): HTMLCanvasElement {
        // Normalize keys
        if (type === 'DUST' || type === 'PEBBLE') type = 'RUBBLE';
        if (type === 'RING' || type === 'SHOCKWAVE_RING') type = 'SHOCKWAVE';

        const key = `VFX_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        // Standard Radius for tile-sized effects (matches HEX_SIZE)
        const r = 36; 
        
        ctx.translate(CENTER, CENTER);

        switch (type) {
            case 'ZONE_BASE':
                this.drawZoneBase(ctx, r, color);
                break;
            // REMOVED: ZONE_RIPPLE, WARNING_HATCH - Deprecated
            case 'ATMOSPHERE':
            case 'GLOW':
                ParticlePainter.drawAtmosphere(ctx, r, color);
                break;
            case 'CLOUD': 
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
                // Draw simple physical chunks (no iso needed for tiny debris)
                HexGeometry.traceHex(ctx, 0, 0, r * 0.5, false);
                ctx.fill();
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
                HexGeometry.traceHex(ctx, 0, 0, r * 0.9, true);
                ctx.stroke();
                // Inner circle
                ctx.beginPath(); 
                ctx.ellipse(0, 0, r*0.7, r*0.7*ISO_SCALE_Y, 0, 0, Math.PI*2); 
                ctx.stroke();
                break;
            case 'SHADOW_BLOB':
                this.drawShadowBlob(ctx, r, color);
                break;
            default:
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    // --- REFACTORED GENERATORS USING HEX_GEOMETRY ---

    private drawZoneBase(ctx: CanvasRenderingContext2D, r: number, color: string) {
        // Soft Glow Hex
        const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        // Use HexGeometry to ensure shape matches map exactly
        HexGeometry.traceHex(ctx, 0, 0, r * 0.95, true);
        ctx.fill();
    }

    private drawShadowBlob(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.filter = 'blur(8px)'; 
        ctx.beginPath();
        // Accurate ISO shadow
        ctx.ellipse(0, 0, r * 0.8, r * 0.8 * ISO_SCALE_Y, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.filter = 'none';
    }

    private drawCloudTexture(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, color);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        const count = 5;
        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = r * 0.3;
            const size = r * 0.6;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist * ISO_SCALE_Y; // Squash clouds too
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI*2); ctx.fill();
    }

    public getTerrainDetail(type: string, color: string, variant: number): HTMLCanvasElement {
        const vIdx = variant % 4;
        const key = `TERRAIN_${type}_${color}_${vIdx}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const size = HEX_SIZE * 2; 
        const { canvas, ctx } = createCanvas(size, size);
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.translate(cx, cy);
        // Note: Terrain details are drawn flat then projected, OR drawn pre-projected.
        // Here we draw pre-projected to save render calls.
        ctx.scale(1, ISO_SCALE_Y); 

        const rnd = (offset: number) => {
            const v = Math.sin(vIdx * 999 + offset) * 1000;
            return v - Math.floor(v);
        };

        ctx.fillStyle = color;
        ctx.globalAlpha = type === 'VOID' ? 0.1 : 0.3;

        // Simple Detail Logic
        for(let i=0; i<5; i++) {
            const px = (rnd(i*2) - 0.5) * HEX_SIZE * 1.2;
            const py = (rnd(i*2+1) - 0.5) * HEX_SIZE * 1.2;
            if (px*px + py*py > (HEX_SIZE*0.7)**2) continue;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 + rnd(i*3), 0, Math.PI*2);
            ctx.fill();
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    // Proxy methods for other assets
    public generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        ctx.translate(64, 32);
        switch (visual) {
            case 'HEX_DART': ProjectilePainter.drawImperialSniper(ctx, color); break;
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
        ctx.beginPath(); ctx.ellipse(64, 32, 40, 25, 0, 0, Math.PI*2); ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateBlastZone(color: string): HTMLCanvasElement {
        return this.getTexture('SHOCKWAVE', color); 
    }
}

export const VFXFactory = new VFXTextureCache();
