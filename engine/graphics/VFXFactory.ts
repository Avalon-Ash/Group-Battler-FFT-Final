
import { createCanvas } from "./CanvasUtils";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";
import { HexGeometry } from "./utils/HexGeometry";
import { HEX_SIZE } from "../../constants";

const TEXTURE_SIZE = 128; 
const CENTER = TEXTURE_SIZE / 2;

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public reset() { this.cache.clear(); }

    public getTexture(type: string, color: string): HTMLCanvasElement {
        if (['DUST', 'PEBBLE', 'CHIP', 'RUBBLE', 'DEBRIS', 'SHARD'].includes(type)) type = 'ROCK';
        if (['CLOUD', 'SMOKE_PUFF', 'MUSHROOM'].includes(type)) type = 'SMOKE';
        if (['GLOW', 'FLARE', 'CORE', 'ATMOSPHERE'].includes(type)) type = 'GLOW_SPRITE';

        const key = `T92_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.translate(CENTER, CENTER);
        const r = 40; 

        switch (type) {
            case 'SMOKE': ParticlePainter.drawSmoke(ctx, r, color); break;
            case 'GLOW_SPRITE': ParticlePainter.drawAtmosphere(ctx, r, color); break;
            case 'SPIKE':
            case 'SPARK': ParticlePainter.drawSpike(ctx, r * (type === 'SPARK' ? 0.3 : 0.8), color); break;
            case 'ROCK':
                ctx.fillStyle = color;
                HexGeometry.traceHex(ctx, 0, 0, r * 0.5, false);
                ctx.fill();
                break;
            case 'HEX_LOCK': IconPainter.drawHexLock(ctx, r, color); break;
            case 'SHADOW_BLOB':
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, color); 
                grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
                grad.addColorStop(1, 'transparent'); 
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
                break;
            case 'CRACKS': ParticlePainter.drawCracks(ctx, r, color); break;
            case 'SLASH': ParticlePainter.drawSlash(ctx, r, color); break;
            case 'BEAM':
                const beamGrad = ctx.createLinearGradient(0, -60, 0, 60);
                beamGrad.addColorStop(0, 'transparent');
                beamGrad.addColorStop(0.2, color);
                beamGrad.addColorStop(0.8, color);
                beamGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = beamGrad;
                ctx.fillRect(-10, -60, 20, 120);
                break;
            default:
                // Fallback for missing textures (Magenta Square for debug)
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(-5,-5,10,10);
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    public generateGlowOrb(color: string): HTMLCanvasElement { return this.getTexture('GLOW_SPRITE', color); }
    public generateCracks(color: string): HTMLCanvasElement { return this.getTexture('CRACKS', color); }
    public generateFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        const grad = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
        grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(64, 32, 40, 25, 0, 0, Math.PI*2); ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public getTerrainDetail(type: string, color: string, variant: number): HTMLCanvasElement {
        const key = `DETAIL_${type}_${color}_${variant}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(HEX_SIZE * 2, HEX_SIZE * 2);
        ctx.translate(HEX_SIZE, HEX_SIZE);
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        
        if (type === 'FOREST') {
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(8, 5);
            ctx.lineTo(-8, 5);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'VOID') {
            ctx.beginPath();
            for(let i=0; i<4; i++) {
                const angle = i * Math.PI / 2;
                ctx.moveTo(0,0);
                ctx.lineTo(Math.cos(angle)*8, Math.sin(angle)*8);
            }
            ctx.strokeStyle = color;
            ctx.stroke();
        }
        
        this.cache.set(key, canvas);
        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
