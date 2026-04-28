
import { createCanvas } from "./CanvasUtils";
import { ParticlePainter } from "./painters/ParticlePainter";
import { ProjectilePainter } from "./painters/ProjectilePainter";
import { IconPainter } from "./painters/IconPainter";
import { HexGeometry } from "./utils/HexGeometry";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

const TEXTURE_SIZE = 128; 
const CENTER = TEXTURE_SIZE / 2;

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public reset() { this.cache.clear(); }

    public getTexture(type: string, color: string): HTMLCanvasElement {
        if (['DUST', 'PEBBLE', 'CHIP', 'RUBBLE', 'DEBRIS', 'SHARD'].includes(type)) type = 'ROCK';
        if (['CLOUD', 'SMOKE_PUFF', 'MUSHROOM'].includes(type)) type = 'SMOKE';
        if (['GLOW', 'FLARE', 'CORE', 'ATMOSPHERE'].includes(type)) type = 'GLOW_SPRITE';
        if (['LIGHTNING', 'THUNDER'].includes(type)) type = 'BOLT';
        if (['FLAME', 'EMBER'].includes(type)) type = 'FIREBALL';

        const key = `T92_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        // [FIX] Warning for unknown types
        const KNOWN_TYPES = new Set(['SMOKE', 'GLOW_SPRITE', 'SPIKE', 'SPARK', 'ROCK', 'HEX_LOCK', 'SHADOW_BLOB', 'CRACKS', 'SLASH', 'HEX_GRID', 'CHAOS_RIFT', 'BEAM', 'BOLT', 'FIREBALL', 'BOMB', 'ARROW', 'GLITCH']);
        if (!KNOWN_TYPES.has(type)) {
            console.warn(`[VFXFactory] Unknown particle type: "${type}" — 將顯示 debug 洋紅色方塊`);
        }

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
            case 'SHADOW_BLOB': {
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, color); 
                grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
                grad.addColorStop(1, 'transparent'); 
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
                break;
            }
            case 'CRACKS': ParticlePainter.drawCracks(ctx, r, color); break;
            case 'SLASH': ParticlePainter.drawSlash(ctx, r, color); break;
            case 'HEX_GRID': ParticlePainter.drawHexGrid(ctx, r, color); break;
            case 'CHAOS_RIFT': ParticlePainter.drawChaosRift(ctx, r, color); break;
            case 'BEAM': {
                const beamGrad = ctx.createLinearGradient(0, -60, 0, 60);
                beamGrad.addColorStop(0, 'transparent');
                beamGrad.addColorStop(0.2, color);
                beamGrad.addColorStop(0.8, color);
                beamGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = beamGrad;
                ctx.fillRect(-10, -60, 20, 120);
                break;
            }
            case 'BOLT':
                ProjectilePainter.drawCovenantBolt(ctx, color);
                break;
            case 'FIREBALL':
                ProjectilePainter.drawCovenantFireball(ctx, color);
                break;
            case 'BOMB':
                ProjectilePainter.drawBomb(ctx, color);
                break;
            case 'ARROW': {
                // Slim arrow: shaft + triangular head
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(16, 0); ctx.stroke();
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -6); ctx.lineTo(12, 6); ctx.fill();
                // Fletching
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.7;
                ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-20, -6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-20, 6); ctx.stroke();
                break;
            }
            case 'GLITCH': {
                ctx.fillStyle = color;
                for (let i = 0; i < 4; i++) {
                    const h_rect = 2 + Math.random() * 3;
                    const w_rect = 20 + Math.random() * 40;
                    ctx.fillRect(-w_rect / 2, (Math.random() - 0.5) * 50, w_rect, h_rect);
                }
                break;
            }
            default:
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(-5,-5,10,10);
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    /**
     * 優化方案：預渲染草叢精靈，避免每幀重複建立漸層與計算路徑
     */
    public getGrassSprite(color: string, variant: number): HTMLCanvasElement {
        const key = `GRASS_${color}_${variant}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(64, 64);
        ctx.translate(32, 48); // 底部中心對齊
        
        const scale = 0.8 + (variant % 5) * 0.1;
        const h = 22 * scale;
        const w = 6 * scale;
        
        // 1. 預渲染陰影 (不使用 shadowBlur，改用漸層圓)
        const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 2);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
        shadowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shadowGrad;
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y);
        ctx.beginPath(); ctx.arc(0, 0, w * 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 2. 預渲染葉片主體
        const grassGrad = ctx.createLinearGradient(0, 0, 0, -h);
        grassGrad.addColorStop(0, 'rgba(0,0,0,0.4)'); // 根部深色
        grassGrad.addColorStop(0.5, color);           // 中段主色
        grassGrad.addColorStop(1, '#ffffff');         // 葉尖高亮

        ctx.fillStyle = grassGrad;
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(-w * 0.5, -h * 0.5, 0, -h);
        ctx.quadraticCurveTo(w * 0.5, -h * 0.5, w, 0);
        ctx.closePath();
        ctx.fill();

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
