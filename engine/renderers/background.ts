// ╔══════════════════════════════════════════════════════════╗
// ║  BackgroundRenderer — 場景背景繪製器                     ║
// ║  職責：繪製遠景底色、星空、透視格線、地形剪影與動態環境特效 ║
// ║  上游：RenderPipeline 在 drawWorld 前呼叫                ║
// ║  [ARCH] 參數集中於 constants/terrain.ts (BACKGROUND_FX) ║
// ╚══════════════════════════════════════════════════════════╝

import { SceneTheme } from "../../types";
import { BACKGROUND_COLORS, BACKGROUND_FX } from "../../constants";
import { AssetManager } from "../assets";
import { MapConfig } from "../utils";
import { createCanvas } from "../graphics/CanvasUtils";
import { VFXFactory } from "../graphics/VFXFactory";
import { VisualMath } from "../math/VisualMath";

export class BackgroundRenderer {
    private staticCache: HTMLCanvasElement | null = null;
    private lastSceneId: string = "";
    private lastWidth: number = 0;
    private lastHeight: number = 0;

    // 動態層預烘焙與快取
    private horizonGlowCanvas: HTMLCanvasElement | null = null;
    private moteSprites: Map<string, HTMLCanvasElement> = new Map();

    private auroraCanvas: HTMLCanvasElement | null = null;
    private auroraCtx: CanvasRenderingContext2D | null = null;
    private auroraGrad: CanvasGradient | null = null;
    private auroraGradW: number = 0;

    private heatHazeGrad: CanvasGradient | null = null;
    private heatHazeKey: string = '';

    private sandstormGrad: CanvasGradient | null = null;
    private sandstormGradKey: string = '';
    private sandstormMistGrad: CanvasGradient | null = null;
    private sandstormMistKey: string = '';

    public draw(ctx: CanvasRenderingContext2D, width: number, height: number, scene: SceneTheme, mapConfig: MapConfig, globalTime: number): void {
        if (!this.staticCache || this.lastSceneId !== scene.id || this.lastWidth !== width || this.lastHeight !== height) {
            this.updateStaticCache(width, height, scene);
        }
        if (this.staticCache) {
            ctx.drawImage(this.staticCache, 0, 0);
        }
        this.drawDynamicElements(ctx, width, height, scene, mapConfig, globalTime);
    }

    private hexToRgba(hex: string, alpha: number): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(0,0,0,${alpha})`;
        return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }

    private updateStaticCache(w: number, h: number, scene: SceneTheme) {
        const ST = BACKGROUND_FX.STATIC;
        if (!this.staticCache) {
            const { canvas } = createCanvas(w, h);
            this.staticCache = canvas;
        } else {
            this.staticCache.width = w;
            this.staticCache.height = h;
        }

        this.lastSceneId = scene.id;
        this.lastWidth = w;
        this.lastHeight = h;

        const ctx = this.staticCache.getContext('2d')!;
        ctx.clearRect(0, 0, w, h);

        if (Number.isFinite(w) && Number.isFinite(h)) {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, scene.background);
            bgGrad.addColorStop(ST.BG_GRAD_FOG_STOP, scene.fogColor); 
            bgGrad.addColorStop(ST.BG_GRAD_HORIZON_STOP, scene.horizon); 
            ctx.fillStyle = bgGrad;
        } else {
            ctx.fillStyle = scene.background;
        }
        ctx.fillRect(0, 0, w, h);

        if (scene.bgFeature === 'SKY_RIVER') this.drawStaticSkyRiver(ctx, w, h);
        else this.drawStaticStars(ctx, w, h, ST.STARS_COUNT_DEFAULT);

        this.drawPerspectiveGrid(ctx, w, h, scene.horizon);

        if (scene.bgFeature === 'DUNES') this.drawStaticDunes(ctx, w, h, scene.horizon, scene.fogColor);
        else this.drawStaticMountains(ctx, w, h, scene.horizon, scene.fogColor);

        // SSOT: Use VisualMath.HORIZON_Y_PCT
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const seamHeight = ST.SEAM_HEIGHT; 
        if (Number.isFinite(horizonY)) {
            const seamGrad = ctx.createLinearGradient(0, horizonY - seamHeight * ST.SEAM_TOP_OFFSET_RATIO, 0, horizonY + seamHeight * ST.SEAM_BOTTOM_OFFSET_RATIO);
            
            for (let i = 0; i < ST.SEAM_STOPS.length; i++) {
                seamGrad.addColorStop(ST.SEAM_STOPS[i], this.hexToRgba(scene.fogColor, ST.SEAM_ALPHAS[i]));
            }
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = seamGrad;
            ctx.fillRect(0, horizonY - seamHeight * ST.SEAM_TOP_OFFSET_RATIO, w, seamHeight);
        }

        const rad = Math.max(w, h);
        const vig = ctx.createRadialGradient(w/2, h/2, rad * ST.VIGNETTE_INNER_RATIO, w/2, h/2, rad * ST.VIGNETTE_OUTER_RATIO);
        vig.addColorStop(0, BACKGROUND_COLORS.VIGNETTE_START);
        vig.addColorStop(1, BACKGROUND_COLORS.VIGNETTE_END);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        // 預烘焙地平線光暈 sprite
        this.updateHorizonGlow(w, h, scene);
    }

    private updateHorizonGlow(w: number, h: number, scene: SceneTheme) {
        const G = BACKGROUND_FX.HORIZON_GLOW;
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const gh = Math.max(1, Math.round(h * G.FILL_H_RATIO));
        if (!this.horizonGlowCanvas) {
            const { canvas } = createCanvas(w, gh);
            this.horizonGlowCanvas = canvas;
        } else {
            this.horizonGlowCanvas.width = w;
            this.horizonGlowCanvas.height = gh;
        }
        const ctx = this.horizonGlowCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, w, gh);
        const localY = horizonY + G.Y_OFFSET - h * G.FILL_Y_RATIO;
        const horizonGrad = ctx.createRadialGradient(
            w / 2, localY, w * G.INNER_RADIUS_RATIO,
            w / 2, localY, w * G.OUTER_RADIUS_RATIO
        );
        horizonGrad.addColorStop(0, scene.horizon);
        horizonGrad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, 0, w, gh);
    }

    private getMoteSprite(color: string): HTMLCanvasElement {
        let sprite = this.moteSprites.get(color);
        if (!sprite) {
            const R = 8;
            const size = R * 2;
            const { canvas, ctx } = createCanvas(size, size);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(R, R, R, 0, Math.PI * 2);
            ctx.fill();
            this.moteSprites.set(color, canvas);
            sprite = canvas;
        }
        return sprite;
    }

    private drawPerspectiveGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
        const ST = BACKGROUND_FX.STATIC;
        ctx.save();
        ctx.globalAlpha = ST.GRID_ALPHA;
        ctx.strokeStyle = color;
        ctx.lineWidth = ST.GRID_LINE_WIDTH;
        
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const centerX = w * 0.5;
        
        ctx.beginPath();
        for (let x = -w; x < w * 2; x += ST.GRID_STEP_X) {
            ctx.moveTo(x, h);
            ctx.lineTo(centerX + (x - centerX) * ST.GRID_CONVERGE_RATIO, horizonY);
        }
        ctx.stroke();

        for (let y = h; y > horizonY; y -= (y - horizonY) * ST.GRID_DECAY_RATE + ST.GRID_STEP_MIN) {
            const dist = (y - horizonY) / (h - horizonY);
            if (dist < ST.GRID_MIN_DIST) continue; 
            ctx.globalAlpha = ST.GRID_ALPHA * Math.pow(dist, ST.GRID_DIST_POW);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawStaticStars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
        const ST = BACKGROUND_FX.STATIC;
        ctx.fillStyle = BACKGROUND_COLORS.STAR_WHITE;
        const seed = ST.STARS_SEED;
        for(let i=0; i<count; i++) {
            const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * ST.STARS_HEIGHT_PCT;
            const size = Math.random() * ST.STARS_MAX_SIZE;
            ctx.globalAlpha = Math.random() * ST.STARS_ALPHA_RANGE + ST.STARS_MIN_ALPHA;
            ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
        }
    }

    private drawStaticSkyRiver(ctx: CanvasRenderingContext2D, w: number, h: number) {
        const ST = BACKGROUND_FX.STATIC;
        const SR = ST.SKY_RIVER;
        ctx.save();
        if (Number.isFinite(w) && Number.isFinite(h)) {
            const grad = ctx.createLinearGradient(0, 0, w, h * SR.HEIGHT_RATIO);
            grad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT);
            grad.addColorStop(0.3, BACKGROUND_COLORS.SKY_RIVER_SECONDARY);
            grad.addColorStop(0.5, BACKGROUND_COLORS.SKY_RIVER_PRIMARY);
            grad.addColorStop(0.7, BACKGROUND_COLORS.SKY_RIVER_SECONDARY);
            grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, h * SR.P0_Y_RATIO);
            ctx.quadraticCurveTo(w * SR.CP0_X_RATIO, h * SR.CP0_Y_RATIO, w * SR.P1_X_RATIO, h * SR.P1_Y_RATIO);
            ctx.lineTo(w * SR.P2_X_RATIO, h * SR.P2_Y_RATIO);
            ctx.quadraticCurveTo(w * SR.CP1_X_RATIO, h * SR.CP1_Y_RATIO, SR.P3_X_RATIO, h * SR.P3_Y_RATIO);
            ctx.fill();
        }
        this.drawStaticStars(ctx, w, h, ST.STARS_COUNT_SKY_RIVER);
        ctx.restore();
    }

    private drawStaticMountains(ctx: CanvasRenderingContext2D, w: number, h: number, colorFar: string, colorNear: string) {
        const ST = BACKGROUND_FX.STATIC;
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const drawLayer = (yOffset: number, color: string, roughness: number, seedOffset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, horizonY + yOffset);
            for(let x=0; x<=w; x+=ST.MOUNTAINS_STEP) {
                const n = Math.sin(x * ST.MOUNTAINS_FREQ_A + seedOffset) * Math.cos(x * ST.MOUNTAINS_FREQ_B) * roughness;
                ctx.lineTo(x, horizonY + yOffset + n);
            }
            ctx.lineTo(w, horizonY + yOffset);
            ctx.lineTo(w, h);
            ctx.fill();
        };
        const far = ST.MOUNTAINS_FAR;
        ctx.globalAlpha = far.alpha;
        drawLayer(far.yOffset, colorFar, far.roughness, far.seedOffset);
        const near = ST.MOUNTAINS_NEAR;
        ctx.globalAlpha = near.alpha;
        drawLayer(near.yOffset, colorNear, near.roughness, near.seedOffset);
        ctx.globalAlpha = 1.0;
    }

    private drawStaticDunes(ctx: CanvasRenderingContext2D, w: number, h: number, colorFar: string, colorNear: string) {
        const ST = BACKGROUND_FX.STATIC;
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const drawDune = (yBase: number, color: string, amp: number, freq: number, offset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, yBase);
            for(let x=0; x<=w; x+=ST.DUNES_STEP) {
                const y = yBase + Math.sin(x * freq + offset) * amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, yBase);
            ctx.lineTo(w, h);
            ctx.fill();
        };
        const far = ST.DUNES_FAR;
        ctx.globalAlpha = far.alpha;
        drawDune(horizonY + far.yOffset, colorFar, far.amp, far.freq, far.offset);
        const near = ST.DUNES_NEAR;
        ctx.globalAlpha = near.alpha;
        drawDune(horizonY + near.yOffset, colorNear, near.amp, near.freq, near.offset);
    }

    public drawDynamicElements(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, mapConfig: MapConfig, t: number) {
        ctx.save();
        const M = BACKGROUND_FX.MOTES;
        const moteSprite = this.getMoteSprite(scene.ambientColor);
        for(let i=0; i<M.COUNT; i++) {
            const speed = (i % M.SPEED_MOD + M.SPEED_BASE) * M.SPEED_MULT;
            const y = (h + (i * M.Y_SEED) - (t * speed)) % h;
            const x = (w + (i * M.X_SEED) + Math.sin(t + i)*M.X_SWING) % w;
            const size = Math.sin(t * M.SIZE_FREQ + i) + M.SIZE_BASE;
            ctx.globalAlpha = (Math.sin(t + i) * 0.5 + 0.5) * M.ALPHA_MULT;
            ctx.drawImage(moteSprite, x - size, y - size, size * 2, size * 2);
        }

        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const G = BACKGROUND_FX.HORIZON_GLOW;
        const pulse = G.PULSE_BASE + Math.sin(t * G.PULSE_FREQ) * G.PULSE_AMP;
        if (this.horizonGlowCanvas) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = G.ALPHA;
            const gh = h * G.FILL_H_RATIO;
            const gw = w * pulse;
            const gScaledH = gh * pulse;
            const gx = (w - gw) * 0.5;
            const localY = horizonY + G.Y_OFFSET - h * G.FILL_Y_RATIO;
            const gy = h * G.FILL_Y_RATIO + localY * (1 - pulse);
            ctx.drawImage(this.horizonGlowCanvas, gx, gy, gw, gScaledH);
        }

        if (scene.bgFeature === 'AURORA') this.drawAurora(ctx, w, h, t);
        else if (scene.bgFeature === 'CANOPY') this.drawCanopyRays(ctx, w, h, t);
        else if (scene.bgFeature === 'HEAT_WAVE') this.drawHeatHaze(ctx, w, h, t, scene.horizon);
        if (scene.textureType === 'DESERT') this.drawSandStorm(ctx, w, h, t, scene.fogColor);
        else this.drawFogLayers(ctx, w, h, scene.fogColor, mapConfig, t);
        ctx.restore();
    }

    /** 極光：在低解析度離屏畫布畫好三條帶，再以一次 drawImage 放大、screen 混合貼回（見 BACKGROUND_FX.AURORA） */
    private drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        const A = BACKGROUND_FX.AURORA;
        const baseH = h * A.BASE_HEIGHT_PCT;
        const regionH = baseH + A.WAVE_A.amp + A.WAVE_B.amp;
        if (!Number.isFinite(w) || !Number.isFinite(regionH) || w <= 0 || regionH <= 0) return;

        const s = A.RESOLUTION_SCALE;
        const cw = Math.max(1, Math.ceil(w * s));
        const ch = Math.max(1, Math.ceil(regionH * s));
        if (!this.auroraCanvas || !this.auroraCtx) {
            const { canvas, ctx: actx } = createCanvas(cw, ch);
            this.auroraCanvas = canvas;
            this.auroraCtx = actx;
        } else if (this.auroraCanvas.width !== cw || this.auroraCanvas.height !== ch) {
            this.auroraCanvas.width = cw;
            this.auroraCanvas.height = ch;
        }

        const actx = this.auroraCtx;
        actx.setTransform(1, 0, 0, 1, 0, 0);
        actx.globalCompositeOperation = 'source-over';
        actx.clearRect(0, 0, cw, ch);
        actx.setTransform(s, 0, 0, s, 0, 0);
        actx.globalCompositeOperation = 'screen';
        // 帶與帶之間的疊加沿用呼叫端當下的 alpha，貼回時不再乘一次
        actx.globalAlpha = ctx.globalAlpha;
        
        // 快取極光漸層，避免每幀建立
        if (!this.auroraGrad || this.auroraGradW !== w) {
            const grad = actx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT);
            grad.addColorStop(0.5, BACKGROUND_COLORS.AURORA_COLOR);
            grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
            this.auroraGrad = grad;
            this.auroraGradW = w;
        }
        actx.fillStyle = this.auroraGrad;

        for (let i = 0; i < A.BANDS; i++) {
            const speed = t * A.TIME_SPEED + i;
            actx.beginPath(); actx.moveTo(0, baseH);
            for (let x = 0; x <= w; x += A.SAMPLE_STEP) {
                const y = baseH + Math.sin(x * A.WAVE_A.freq + speed) * A.WAVE_A.amp + Math.sin(x * A.WAVE_B.freq - speed) * A.WAVE_B.amp;
                actx.lineTo(x, y);
            }
            actx.lineTo(w, 0); actx.lineTo(0, 0);
            actx.fill();
        }

        const prevAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 1;
        ctx.drawImage(this.auroraCanvas, 0, 0, w, regionH);
        ctx.globalAlpha = prevAlpha;
    }

    private drawCanopyRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.globalCompositeOperation = 'overlay';
        const C = BACKGROUND_FX.CANOPY;
        const raySprite = VFXFactory.getTexture('BEAM', BACKGROUND_COLORS.CANOPY_RAY);
        for (let i = 0; i < C.RAYS_COUNT; i++) {
            const angle = Math.sin(t * C.SWAY_FREQ + i) * C.SWAY_AMP + C.BASE_ANGLE;
            const x = w * (C.X_START_RATIO + i * C.X_STEP_RATIO) + Math.sin(t * C.X_SWAY_FREQ) * C.X_SWAY_AMP;
            ctx.save(); ctx.translate(x, C.Y_OFFSET); ctx.rotate(angle);
            ctx.globalAlpha = C.ALPHA_BASE + Math.sin(t * C.ALPHA_FREQ + i) * C.ALPHA_AMP;
            ctx.drawImage(raySprite, C.DRAW_OFFSET_X, 0, C.WIDTH, h * C.HEIGHT_MULT); ctx.restore();
        }
    }

    private drawHeatHaze(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        const HZ = BACKGROUND_FX.HEAT_HAZE;
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        ctx.globalCompositeOperation = 'screen';
        if (Number.isFinite(h) && Number.isFinite(horizonY)) {
            const key = `${h}_${horizonY}_${color}`;
            if (!this.heatHazeGrad || this.heatHazeKey !== key) {
                const grad = ctx.createLinearGradient(0, h, 0, horizonY);
                grad.addColorStop(0, color);
                grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
                this.heatHazeGrad = grad;
                this.heatHazeKey = key;
            }
            ctx.fillStyle = this.heatHazeGrad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = HZ.ALPHA_BASE + Math.sin(t * HZ.ALPHA_FREQ) * HZ.ALPHA_AMP;
        ctx.fillRect(0, horizonY, w, h - horizonY);
        ctx.globalAlpha = HZ.BANDS_ALPHA; ctx.fillStyle = BACKGROUND_COLORS.STAR_WHITE;
        for(let i=0; i<HZ.BANDS_COUNT; i++) {
            const y = h - ((t * HZ.SPEED + i * HZ.SPACING) % (h * HZ.RANGE_RATIO));
            ctx.fillRect(0, y, w, HZ.BAND_HEIGHT);
        }
    }

    private drawFogLayers(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, mapConfig: MapConfig, t: number) {
        const F = BACKGROUND_FX.FOG;
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        ctx.globalCompositeOperation = 'screen';
        const fogSprite = AssetManager.getFogCloud(color);
        for (let i = 0; i < F.LAYERS_COUNT; i++) {
            const x = ((t * F.SPEED + i * (w / F.LAYERS_COUNT)) % (w + F.WRAP_PAD)) - F.WRAP_OFFSET;
            const y = horizonY + Math.sin(i + t * F.SWAY_FREQ) * F.SWAY_AMP;
            ctx.globalAlpha = F.ALPHA; ctx.drawImage(fogSprite, x + F.DRAW_OFFSET_X, y + F.DRAW_OFFSET_Y, F.WIDTH, F.HEIGHT);
        }
    }

    private drawSandStorm(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        const S = BACKGROUND_FX.SANDSTORM;
        ctx.globalCompositeOperation = 'overlay'; 
        const drift = t * S.WIND_SPEED;
        if (Number.isFinite(w)) {
            const key = `${w}_${color}`;
            if (!this.sandstormGrad || this.sandstormGradKey !== key) {
                const grad = ctx.createLinearGradient(0, 0, w, 0);
                grad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT);
                grad.addColorStop(0.5, color);
                grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
                this.sandstormGrad = grad;
                this.sandstormGradKey = key;
            }
            ctx.fillStyle = this.sandstormGrad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = S.OVERLAY_ALPHA; ctx.fillRect(0, 0, w, h);
        const fogSprite = AssetManager.getFogCloud(color);
        for (let i = 0; i < S.FOG_COUNT; i++) {
            const x = ((drift + i * (w / S.FOG_COUNT)) % (w + S.FOG_WRAP_PAD)) - S.FOG_WRAP_OFFSET;
            const y = (Math.sin(i * S.FOG_HASH + t) * 0.5 + 0.5) * h;
            ctx.globalAlpha = S.FOG_ALPHA; ctx.drawImage(fogSprite, x, y, S.FOG_WIDTH, S.FOG_HEIGHT);
        }
        const mistH = S.MIST_HEIGHT, mistY = h - mistH;
        if (Number.isFinite(mistY) && Number.isFinite(h)) {
            const mKey = `${mistY}_${h}_${color}`;
            if (!this.sandstormMistGrad || this.sandstormMistKey !== mKey) {
                const mistGrad = ctx.createLinearGradient(0, mistY, 0, h);
                mistGrad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT);
                mistGrad.addColorStop(0.4, color);
                mistGrad.addColorStop(1, BACKGROUND_COLORS.VIGNETTE_END);
                this.sandstormMistGrad = mistGrad;
                this.sandstormMistKey = mKey;
            }
            ctx.fillStyle = this.sandstormMistGrad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = S.MIST_ALPHA_BASE + Math.sin(t * S.MIST_ALPHA_FREQ) * S.MIST_ALPHA_AMP; ctx.fillRect(0, mistY, w, mistH);
        ctx.strokeStyle = BACKGROUND_COLORS.STAR_WHITE; ctx.globalAlpha = S.STREAKS_ALPHA; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < S.STREAKS_COUNT; i++) {
            const streakX = ((drift * S.STREAKS_SPEED_MULT + i * S.STREAKS_SPACING) % (w + S.STREAKS_WRAP_PAD)) - S.STREAKS_WRAP_OFFSET;
            const streakY = (Math.sin(i * S.STREAKS_HASH) * 0.5 + 0.5) * (h * S.STREAKS_HEIGHT_RATIO) + h * S.STREAKS_BASE_RATIO;
            ctx.moveTo(streakX, streakY); ctx.lineTo(streakX + S.STREAKS_DX, streakY + S.STREAKS_DY);
        }
        ctx.stroke();
    }
}