
import { createCanvas } from "./CanvasUtils";
import { HEX_SIZE, ISO_SCALE_Y, VFX_RENDER, UNIT_SHADOW, VFX_FACTORY } from "../../constants";
import { GRASS_DETAIL, VOID_RUNES } from "../../data/vfx/terrainAmbience";

const TEXTURE_SIZE = VFX_FACTORY.TEXTURE_SIZE;
const CENTER = TEXTURE_SIZE / 2;

/**
 * 程序化貼圖的型別（封閉清單）：呼叫端傳不支援的名稱會編譯失敗。
 * V5a 刪貼圖時 SMOKE／GLOW／ROCK／SHADOW_BLOB 仍有呼叫者，字串型別讓它們悄悄變成洋紅除錯方塊——這個型別就是為了擋那種回歸。
 */
export type VFXTextureType = 'BEAM' | 'SHADOW_BLOB' | 'DEBUG';

/** 非零件粒子用哪張貼圖：只剩 GENERIC_DEBUG＝除錯方塊（天氣 T4 已改零件） */
export function particleTexture(_particleType: string): VFXTextureType {
    return 'DEBUG';
}

class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    public reset() { this.cache.clear(); }

    /**
     * 程序化貼圖（快取）：SHADOW_BLOB（單位接地陰影）、BEAM（森林背景光束）、DEBUG（洋紅除錯方塊）。
     */
    public getTexture(type: VFXTextureType, color: string): HTMLCanvasElement {
        const key = `T92_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        ctx.translate(CENTER, CENTER);
        const r = VFX_FACTORY.SHADOW_RADIUS;

        switch (type) {
            case 'SHADOW_BLOB': {
                // 單位腳下的接地陰影（UnitShadowPainter，multiply 疊在地面上）
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, color);
                grad.addColorStop(UNIT_SHADOW.MID_STOP, UNIT_SHADOW.MID_COLOR);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'BEAM': {
                const beamGrad = ctx.createLinearGradient(0, -VFX_FACTORY.BEAM_HALF_HEIGHT, 0, VFX_FACTORY.BEAM_HALF_HEIGHT);
                beamGrad.addColorStop(0, 'transparent');
                beamGrad.addColorStop(VFX_FACTORY.BEAM_FADE_IN, color);
                beamGrad.addColorStop(VFX_FACTORY.BEAM_FADE_OUT, color);
                beamGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = beamGrad;
                ctx.fillRect(VFX_FACTORY.BEAM_LEFT, -VFX_FACTORY.BEAM_HALF_HEIGHT, VFX_FACTORY.BEAM_WIDTH, VFX_FACTORY.BEAM_HEIGHT);
                break;
            }
            case 'DEBUG':
                ctx.fillStyle = VFX_RENDER.DEBUG_DOT_COLOR;
                ctx.fillRect(VFX_FACTORY.DEBUG_ORIGIN, VFX_FACTORY.DEBUG_ORIGIN, VFX_FACTORY.DEBUG_SIZE, VFX_FACTORY.DEBUG_SIZE);
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

        const sp = GRASS_DETAIL.sprite;
        const { canvas, ctx } = createCanvas(sp.size, sp.size);
        ctx.translate(sp.anchorX, sp.anchorY); // 底部中心對齊
        
        const scale = sp.scaleBase + (variant % sp.scaleCycle) * sp.scaleStep;
        const h = sp.bladeHeight * scale;
        const w = sp.bladeWidth * scale;
        
        // 1. 預渲染陰影 (不使用 shadowBlur，改用漸層圓)
        const shadowR = w * sp.shadowRadiusMul;
        const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowR);
        shadowGrad.addColorStop(0, sp.shadowColor);
        shadowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shadowGrad;
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y);
        ctx.beginPath(); ctx.arc(0, 0, shadowR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 2. 預渲染葉片主體
        const grassGrad = ctx.createLinearGradient(0, 0, 0, -h);
        grassGrad.addColorStop(0, sp.rootColor);      // 根部深色
        grassGrad.addColorStop(sp.midStop, color);    // 中段主色
        grassGrad.addColorStop(1, sp.tipColor);       // 葉尖高亮

        ctx.fillStyle = grassGrad;
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(-w * sp.curveCtrl, -h * sp.curveCtrl, 0, -h);
        ctx.quadraticCurveTo(w * sp.curveCtrl, -h * sp.curveCtrl, w, 0);
        ctx.closePath();
        ctx.fill();

        this.cache.set(key, canvas);
        return canvas;
    }

    public generateFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(VFX_FACTORY.FOG_WIDTH, VFX_FACTORY.FOG_HEIGHT);
        const grad = ctx.createRadialGradient(VFX_FACTORY.FOG_CENTER_X, VFX_FACTORY.FOG_CENTER_Y, 0, VFX_FACTORY.FOG_CENTER_X, VFX_FACTORY.FOG_CENTER_Y, VFX_FACTORY.FOG_GRADIENT_RADIUS);
        grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(VFX_FACTORY.FOG_CENTER_X, VFX_FACTORY.FOG_CENTER_Y, VFX_FACTORY.FOG_RADIUS_X, VFX_FACTORY.FOG_RADIUS_Y, 0, 0, Math.PI*2); ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public getTerrainDetail(type: string, color: string, variant: number): HTMLCanvasElement {
        const key = `DETAIL_${type}_${color}_${variant}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(HEX_SIZE * 2, HEX_SIZE * 2);
        ctx.translate(HEX_SIZE, HEX_SIZE);
        
        ctx.fillStyle = color;
        ctx.globalAlpha = VFX_FACTORY.DETAIL_ALPHA;
        
        if (type === 'FOREST') {
            ctx.beginPath();
            ctx.moveTo(0, VFX_FACTORY.FOREST_TIP_Y);
            ctx.lineTo(VFX_FACTORY.FOREST_HALF_WIDTH, VFX_FACTORY.FOREST_BASE_Y);
            ctx.lineTo(-VFX_FACTORY.FOREST_HALF_WIDTH, VFX_FACTORY.FOREST_BASE_Y);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'VOID') {
            const runes = VOID_RUNES;
            ctx.globalAlpha = runes.alpha;
            ctx.lineWidth = runes.lineWidth;
            ctx.beginPath();
            for(let i=0; i<runes.arms; i++) {
                const angle = i * Math.PI * 2 / runes.arms;
                ctx.moveTo(0,0);
                ctx.lineTo(Math.cos(angle)*runes.armLength, Math.sin(angle)*runes.armLength);
            }
            ctx.strokeStyle = color;
            ctx.stroke();
        }
        
        this.cache.set(key, canvas);
        return canvas;
    }
}

export const VFXFactory = new VFXTextureCache();
