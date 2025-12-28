
import { createCanvas } from "./CanvasUtils";
import { GeometryPainter } from "./painters/GeometryPainter";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";

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
            default:
                // Fallback debug shape
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    /**
     * Entry point for Projectile Sprites (High detail, directional)
     */
    public generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        // Projectiles need wider canvas for trails/speed
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        ctx.translate(cx, cy);

        // --- DISPATCHER ---
        switch (visual) {
            case 'HEX_DART':
            case 'ARROW':
                ProjectilePainter.drawImperialSniper(ctx, color);
                break;
            case 'CRYSTAL':
                ProjectilePainter.drawImperialCrystal(ctx, color);
                break;
            case 'ORB':
                ProjectilePainter.drawImperialOrb(ctx, color);
                break;
            case 'BOLT':
                ProjectilePainter.drawCovenantBolt(ctx, color);
                break;
            case 'AXE':
                ProjectilePainter.drawCovenantAxe(ctx, color);
                break;
            case 'FIREBALL':
                ProjectilePainter.drawCovenantFireball(ctx, color);
                break;
            case 'BOMB':
                ProjectilePainter.drawBomb(ctx, color);
                break;
            default:
                // Fallback Bolt
                ProjectilePainter.drawCovenantBolt(ctx, color);
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    /**
     * Helpers for other systems
     */
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
        // Cloud shape
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
        return this.getTexture('SHOCKWAVE', color); // Simplified reuse
    }
}

export const VFXFactory = new VFXTextureCache();
