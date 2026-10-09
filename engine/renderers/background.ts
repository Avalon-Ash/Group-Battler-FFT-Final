import { SceneTheme } from "../../types";
import { HEX_SIZE, BACKGROUND_COLORS } from "../../constants";
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
            bgGrad.addColorStop(0.4, scene.fogColor); 
            bgGrad.addColorStop(1, scene.horizon); 
            ctx.fillStyle = bgGrad;
        } else {
            ctx.fillStyle = scene.background;
        }
        ctx.fillRect(0, 0, w, h);

        if (scene.bgFeature === 'SKY_RIVER') this.drawStaticSkyRiver(ctx, w, h);
        else this.drawStaticStars(ctx, w, h, 150);

        this.drawPerspectiveGrid(ctx, w, h, scene.horizon);

        if (scene.bgFeature === 'DUNES') this.drawStaticDunes(ctx, w, h, scene.horizon, scene.fogColor);
        else this.drawStaticMountains(ctx, w, h, scene.horizon, scene.fogColor);

        // SSOT: Use VisualMath.HORIZON_Y_PCT
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const seamHeight = 350; 
        if (Number.isFinite(horizonY)) {
            const seamGrad = ctx.createLinearGradient(0, horizonY - seamHeight * 0.6, 0, horizonY + seamHeight * 0.4);
            
            seamGrad.addColorStop(0, this.hexToRgba(scene.fogColor, 0));
            seamGrad.addColorStop(0.3, this.hexToRgba(scene.fogColor, 0.8));
            seamGrad.addColorStop(0.5, this.hexToRgba(scene.fogColor, 1.0)); 
            seamGrad.addColorStop(0.7, this.hexToRgba(scene.fogColor, 0.8));
            seamGrad.addColorStop(1, this.hexToRgba(scene.fogColor, 0));
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = seamGrad;
            ctx.fillRect(0, horizonY - seamHeight * 0.6, w, seamHeight);
        }

        const rad = Math.max(w, h);
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.4, w/2, h/2, rad * 0.9);
        vig.addColorStop(0, BACKGROUND_COLORS.VIGNETTE_START);
        vig.addColorStop(1, BACKGROUND_COLORS.VIGNETTE_END);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }

    private drawPerspectiveGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const centerX = w * 0.5;
        
        ctx.beginPath();
        for (let x = -w; x < w * 2; x += 100) {
            ctx.moveTo(x, h);
            ctx.lineTo(centerX + (x - centerX) * 0.1, horizonY);
        }
        ctx.stroke();

        for (let y = h; y > horizonY; y -= (y - horizonY) * 0.1 + 2) {
            const dist = (y - horizonY) / (h - horizonY);
            if (dist < 0.2) continue; 
            ctx.globalAlpha = 0.15 * Math.pow(dist, 0.5);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawStaticStars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
        ctx.fillStyle = BACKGROUND_COLORS.STAR_WHITE;
        const seed = 123;
        for(let i=0; i<count; i++) {
            const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.7;
            const size = Math.random() * 1.8;
            ctx.globalAlpha = Math.random() * 0.6 + 0.2;
            ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
        }
    }

    private drawStaticSkyRiver(ctx: CanvasRenderingContext2D, w: number, h: number) {
        ctx.save();
        if (Number.isFinite(w) && Number.isFinite(h)) {
            const grad = ctx.createLinearGradient(0, 0, w, h * 0.8);
            grad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT);
            grad.addColorStop(0.3, BACKGROUND_COLORS.SKY_RIVER_SECONDARY);
            grad.addColorStop(0.5, BACKGROUND_COLORS.SKY_RIVER_PRIMARY);
            grad.addColorStop(0.7, BACKGROUND_COLORS.SKY_RIVER_SECONDARY);
            grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, h*0.2);
            ctx.quadraticCurveTo(w*0.5, h*0.5, w, h*0.4);
            ctx.lineTo(w, h*0.7);
            ctx.quadraticCurveTo(w*0.5, h*0.8, 0, h*0.5);
            ctx.fill();
        }
        this.drawStaticStars(ctx, w, h, 200);
        ctx.restore();
    }

    private drawStaticMountains(ctx: CanvasRenderingContext2D, w: number, h: number, colorFar: string, colorNear: string) {
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const drawLayer = (yOffset: number, color: string, roughness: number, seedOffset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, horizonY + yOffset);
            for(let x=0; x<=w; x+=20) {
                const n = Math.sin(x * 0.01 + seedOffset) * Math.cos(x * 0.03) * roughness;
                ctx.lineTo(x, horizonY + yOffset + n);
            }
            ctx.lineTo(w, horizonY + yOffset);
            ctx.lineTo(w, h);
            ctx.fill();
        };
        ctx.globalAlpha = 0.3;
        drawLayer(0, colorFar, 60, 0);
        ctx.globalAlpha = 0.5;
        drawLayer(60, colorNear, 40, 100);
        ctx.globalAlpha = 1.0;
    }

    private drawStaticDunes(ctx: CanvasRenderingContext2D, w: number, h: number, colorFar: string, colorNear: string) {
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const drawDune = (yBase: number, color: string, amp: number, freq: number, offset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, yBase);
            for(let x=0; x<=w; x+=30) {
                const y = yBase + Math.sin(x * freq + offset) * amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, yBase);
            ctx.lineTo(w, h);
            ctx.fill();
        };
        ctx.globalAlpha = 0.4;
        drawDune(horizonY + 50, colorFar, 30, 0.005, 0);
        ctx.globalAlpha = 0.6;
        drawDune(horizonY + 150, colorNear, 40, 0.003, 2);
    }

    private drawDynamicElements(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, mapConfig: MapConfig, t: number) {
        ctx.save();
        ctx.fillStyle = scene.ambientColor;
        for(let i=0; i<50; i++) {
            const speed = (i % 5 + 1) * 10;
            const y = (h + (i * 53) - (t * speed)) % h;
            const x = (w + (i * 97) + Math.sin(t + i)*50) % w;
            const size = Math.sin(t * 2 + i) + 2;
            ctx.globalAlpha = (Math.sin(t + i) * 0.5 + 0.5) * 0.6;
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
        }
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        const pulse = 1.0 + Math.sin(t * 0.5) * 0.1;
        const horizonGrad = ctx.createRadialGradient(w/2, horizonY + 50, w * 0.2, w/2, horizonY + 50, w * 0.8 * pulse);
        horizonGrad.addColorStop(0, scene.horizon);
        horizonGrad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, h/2, w, h/2);
        if (scene.bgFeature === 'AURORA') this.drawAurora(ctx, w, h, t);
        else if (scene.bgFeature === 'CANOPY') this.drawCanopyRays(ctx, w, h, t);
        else if (scene.bgFeature === 'HEAT_WAVE') this.drawHeatHaze(ctx, w, h, t, scene.horizon);
        if (scene.textureType === 'DESERT') this.drawSandStorm(ctx, w, h, t, scene.fogColor);
        else this.drawFogLayers(ctx, w, h, scene.fogColor, mapConfig, t);
        ctx.restore();
    }

    private drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.globalCompositeOperation = 'screen';
        const numBands = 3, baseH = h * 0.4;
        for (let i = 0; i < numBands; i++) {
            const speed = t * 0.2 + i;
            ctx.beginPath(); ctx.moveTo(0, baseH);
            for (let x = 0; x <= w; x += 50) {
                const y = baseH + Math.sin(x * 0.005 + speed) * 50 + Math.sin(x * 0.02 - speed) * 20;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, 0); ctx.lineTo(0, 0);
            if (Number.isFinite(w)) {
                const grad = ctx.createLinearGradient(0, 0, w, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, BACKGROUND_COLORS.AURORA_COLOR); 
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = BACKGROUND_COLORS.AURORA_COLOR;
            }
            ctx.fill();
        }
    }

    private drawCanopyRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.globalCompositeOperation = 'overlay';
        const raySprite = VFXFactory.getTexture('BEAM', BACKGROUND_COLORS.CANOPY_RAY);
        for (let i = 0; i < 4; i++) {
            const angle = Math.sin(t * 0.2 + i) * 0.1 + 0.6, x = w * (0.2 + i * 0.2) + Math.sin(t * 0.1) * 50;
            ctx.save(); ctx.translate(x, -100); ctx.rotate(angle); ctx.globalAlpha = 0.15 + Math.sin(t * 0.5 + i) * 0.05;
            ctx.drawImage(raySprite, -50, 0, 100, h * 1.5); ctx.restore();
        }
    }

    private drawHeatHaze(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        ctx.globalCompositeOperation = 'screen';
        if (Number.isFinite(h) && Number.isFinite(horizonY)) {
            const grad = ctx.createLinearGradient(0, h, 0, horizonY);
            grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.05;
        ctx.fillRect(0, horizonY, w, h - horizonY);
        ctx.globalAlpha = 0.05; ctx.fillStyle = BACKGROUND_COLORS.STAR_WHITE;
        for(let i=0; i<5; i++) {
            const y = h - ((t * 50 + i * 100) % (h * 0.4));
            ctx.fillRect(0, y, w, 10);
        }
    }

    private drawFogLayers(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, mapConfig: MapConfig, t: number) {
        const horizonY = h * VisualMath.HORIZON_Y_PCT;
        ctx.globalCompositeOperation = 'screen';
        const fogSprite = AssetManager.getFogCloud(color);
        for (let i = 0; i < 4; i++) {
            const speed = 25, x = ((t * speed + i * (w / 4)) % (w + 400)) - 200, y = horizonY + Math.sin(i + t * 0.2) * 50;
            ctx.globalAlpha = 0.08; ctx.drawImage(fogSprite, x - 200, y - 100, 400, 200);
        }
    }

    private drawSandStorm(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        ctx.globalCompositeOperation = 'overlay'; 
        const windSpeed = 300, drift = t * windSpeed;
        if (Number.isFinite(w)) {
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT); grad.addColorStop(0.5, color); grad.addColorStop(1, BACKGROUND_COLORS.TRANSPARENT);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = 0.2; ctx.fillRect(0, 0, w, h);
        const fogSprite = AssetManager.getFogCloud(color);
        for (let i = 0; i < 6; i++) {
            const x = ((drift + i * (w / 6)) % (w + 600)) - 300, y = (Math.sin(i * 132 + t) * 0.5 + 0.5) * h;
            ctx.globalAlpha = 0.12; ctx.drawImage(fogSprite, x, y, 500, 150);
        }
        const mistH = 200, mistY = h - mistH;
        if (Number.isFinite(mistY) && Number.isFinite(h)) {
            const mistGrad = ctx.createLinearGradient(0, mistY, 0, h);
            mistGrad.addColorStop(0, BACKGROUND_COLORS.TRANSPARENT); mistGrad.addColorStop(0.4, color); mistGrad.addColorStop(1, BACKGROUND_COLORS.VIGNETTE_END);
            ctx.fillStyle = mistGrad;
        } else {
            ctx.fillStyle = color;
        }
        ctx.globalAlpha = 0.4 + Math.sin(t*3) * 0.1; ctx.fillRect(0, mistY, w, mistH);
        ctx.strokeStyle = BACKGROUND_COLORS.STAR_WHITE; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 30; i++) {
            const streakX = ((drift * 2.5 + i * 153) % (w + 200)) - 100, streakY = (Math.sin(i * 21) * 0.5 + 0.5) * (h * 0.8) + h * 0.2;
            ctx.moveTo(streakX, streakY); ctx.lineTo(streakX + 150, streakY + 5);
        }
        ctx.stroke();
    }
}