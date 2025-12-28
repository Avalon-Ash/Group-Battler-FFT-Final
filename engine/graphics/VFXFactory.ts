
import { createCanvas } from "./CanvasUtils";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";
import { HexGeometry } from "./utils/HexGeometry";
import { HEX_SIZE } from "../../constants";

// High fidelity texture size
const TEXTURE_SIZE = 128; 
const CENTER = TEXTURE_SIZE / 2;

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public getTexture(type: string, color: string): HTMLCanvasElement {
        // Normalize aliases
        if (type === 'DUST' || type === 'PEBBLE') type = 'RUBBLE';
        if (type === 'RING' || type === 'SHOCKWAVE_RING') type = 'SHOCKWAVE';

        const key = `VFX_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        // Base radius for tile effects
        const r = 40; 
        
        ctx.translate(CENTER, CENTER);

        // NOTE: For Ground Effects (Zone, Grid, Shockwave), we draw REGULAR geometry (applyIso = false).
        // The Renderer/Painter will handle the 2.5D projection (scale Y).
        
        switch (type) {
            case 'ZONE_BASE':
                this.drawRegularHex(ctx, r, color, 'FILL_GLOW');
                break;
            case 'GRID_FIELD':
                this.drawGridField(ctx, r, color);
                break;
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
                this.drawShockwave(ctx, r, color);
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
                // Physical debris is small enough to not care about exact projection
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
                this.drawMagicCircle(ctx, r, color);
                break;
            case 'SHADOW_BLOB':
                this.drawShadowBlob(ctx, r, color);
                break;
            case 'BEAM':
                const grad = ctx.createLinearGradient(-r, 0, r, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(-r*2, -r, r*4, r*2);
                break;
            default:
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    // --- GEOMETRY GENERATORS (MATH COMPLIANT) ---

    private drawRegularHex(ctx: CanvasRenderingContext2D, r: number, color: string, style: 'FILL' | 'STROKE' | 'FILL_GLOW') {
        // applyIso = false to ensure we get a Regular Hexagon. 
        // This texture will be squashed by the painter later.
        
        if (style === 'FILL_GLOW') {
            const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            HexGeometry.traceHex(ctx, 0, 0, r * 0.95, false);
            ctx.fill();
        } else {
            HexGeometry.traceHex(ctx, 0, 0, r, false);
            if (style === 'FILL') {
                ctx.fillStyle = color; ctx.fill();
            } else {
                ctx.strokeStyle = color; ctx.stroke();
            }
        }
    }

    private drawGridField(ctx: CanvasRenderingContext2D, r: number, color: string) {
        // Grid pattern inside a hex
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        HexGeometry.traceHex(ctx, 0, 0, r * 0.9, false);
        ctx.stroke();
        
        // Inner cross
        ctx.beginPath();
        ctx.moveTo(-r*0.5, 0); ctx.lineTo(r*0.5, 0);
        ctx.moveTo(0, -r*0.5); ctx.lineTo(0, r*0.5);
        ctx.stroke();
    }

    private drawShockwave(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        HexGeometry.traceHex(ctx, 0, 0, r * 0.8, false);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        HexGeometry.traceHex(ctx, 0, 0, r * 0.6, false);
        ctx.stroke();
    }

    private drawMagicCircle(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        HexGeometry.traceHex(ctx, 0, 0, r * 0.9, false);
        ctx.stroke();
        // Inner circle
        ctx.beginPath(); 
        ctx.arc(0, 0, r*0.7, 0, Math.PI*2);
        ctx.stroke();
    }

    private drawShadowBlob(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.filter = 'blur(8px)'; 
        ctx.beginPath();
        // Regular Circle or Hex (Painter will squash it to fit isometric)
        ctx.arc(0, 0, r * 0.8, 0, Math.PI*2);
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
            const y = Math.sin(angle) * dist; // Regular circular distribution
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
        // Pre-project details for terrain since TerrainRenderer draws them flat
        ctx.scale(1, 0.58); 

        const rnd = (offset: number) => {
            const v = Math.sin(vIdx * 999 + offset) * 1000;
            return v - Math.floor(v);
        };

        ctx.fillStyle = color;
        ctx.globalAlpha = type === 'VOID' ? 0.1 : 0.3;

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
