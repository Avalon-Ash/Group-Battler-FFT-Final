
import { SceneTheme } from "../../types";
import { HEX_SIZE } from "../../constants";
import { AssetManager } from "../assets";
import { MapConfig } from "../utils";
import { createCanvas } from "../graphics/CanvasUtils";
import { VFXFactory } from "../graphics/VFXFactory";

export class BackgroundRenderer {
    private staticCache: HTMLCanvasElement | null = null;
    private lastSceneId: string = "";
    private lastWidth: number = 0;
    private lastHeight: number = 0;

    public draw(
        ctx: CanvasRenderingContext2D, 
        width: number, 
        height: number, 
        scene: SceneTheme, 
        mapConfig: MapConfig, 
        globalTime: number
    ): void {
        // 1. Rebuild Static Background Layer (Gradient + Stars + Mountains)
        if (!this.staticCache || this.lastSceneId !== scene.id || this.lastWidth !== width || this.lastHeight !== height) {
            this.updateStaticCache(width, height, scene);
        }
        
        // 2. Draw Static Layer
        if (this.staticCache) {
            ctx.drawImage(this.staticCache, 0, 0);
        }

        // 3. Draw Dynamic Atmospheric Elements
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

        // A. Deep Background Gradient (Richer)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background);
        bgGrad.addColorStop(0.4, scene.fogColor); 
        bgGrad.addColorStop(1, scene.horizon); 
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // B. Scene Specific Static Features
        if (scene.bgFeature === 'SKY_RIVER') {
            this.drawStaticSkyRiver(ctx, w, h);
        } else {
            this.drawStaticStars(ctx, w, h, 150); // More stars
        }

        // C. Distant Grid (Retro-wave floor)
        // Draw grid BEFORE horizon seam so seam covers it
        this.drawPerspectiveGrid(ctx, w, h, scene.horizon);

        // D. Mountains / Dunes
        if (scene.bgFeature === 'DUNES') {
            this.drawStaticDunes(ctx, w, h, scene.horizon, scene.fogColor);
        } else {
            this.drawStaticMountains(ctx, w, h, scene.horizon, scene.fogColor);
        }

        // E. Horizon Blending Strip (Seam Fix) - Improved Gradient
        // Increased Height to 350 to allow smoother falloff
        const horizonY = h * 0.6;
        const seamHeight = 350; 
        const seamGrad = ctx.createLinearGradient(0, horizonY - seamHeight * 0.6, 0, horizonY + seamHeight * 0.4);
        
        // [FIX] Using 'screen' or brighter blend modes earlier caused the line. 
        // We use source-over with 100% opacity at the core to physically cover the seam.
        const fogRgbaFull = this.hexToRgba(scene.fogColor, 1.0); // Full opacity at core
        const fogRgbaMid = this.hexToRgba(scene.fogColor, 0.8);
        const fogRgbaZero = this.hexToRgba(scene.fogColor, 0);

        seamGrad.addColorStop(0, fogRgbaZero);
        seamGrad.addColorStop(0.3, fogRgbaMid);
        seamGrad.addColorStop(0.5, fogRgbaFull); 
        seamGrad.addColorStop(0.7, fogRgbaMid);
        seamGrad.addColorStop(1, fogRgbaZero);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = seamGrad;
        ctx.fillRect(0, horizonY - seamHeight * 0.6, w, seamHeight);

        // F. Vignette
        const rad = Math.max(w, h);
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.4, w/2, h/2, rad * 0.9);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.8)'); // Darker vignette
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }

    private drawPerspectiveGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
        ctx.save();
        ctx.globalAlpha = 0.15; // Slightly clearer
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        const horizonY = h * 0.6;
        const centerX = w * 0.5;
        
        // Vertical lines converging to horizon
        ctx.beginPath();
        for (let x = -w; x < w * 2; x += 100) {
            ctx.moveTo(x, h);
            ctx.lineTo(centerX + (x - centerX) * 0.1, horizonY);
        }
        ctx.stroke();

        // Horizontal lines - With Fadeout near horizon
        // [FIX] Start fading out earlier (0.2 instead of 0.15) to ensure zero overlap with sky
        for (let y = h; y > horizonY; y -= (y - horizonY) * 0.1 + 2) {
            // Distance Factor (0 at horizon, 1 at bottom)
            const dist = (y - horizonY) / (h - horizonY);
            if (dist < 0.2) continue; 
            
            ctx.globalAlpha = 0.15 * Math.pow(dist, 0.5); // Fade out as it goes back
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    private drawStaticStars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number) {
        ctx.fillStyle = '#fff';
        const seed = 123;
        for(let i=0; i<count; i++) {
            const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.7;
            const size = Math.random() * 1.8;
            const alpha = Math.random() * 0.6 + 0.2;
            ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    private drawStaticSkyRiver(ctx: CanvasRenderingContext2D, w: number, h: number) {
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, w, h * 0.8);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.3, 'rgba(79, 70, 229, 0.15)');
        grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.25)');
        grad.addColorStop(0.7, 'rgba(79, 70, 229, 0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h*0.2);
        ctx.quadraticCurveTo(w*0.5, h*0.5, w, h*0.4);
        ctx.lineTo(w, h*0.7);
        ctx.quadraticCurveTo(w*0.5, h*0.8, 0, h*0.5);
        ctx.fill();

        this.drawStaticStars(ctx, w, h, 200);
        ctx.restore();
    }

    private drawStaticMountains(ctx: CanvasRenderingContext2D, w: number, h: number, colorFar: string, colorNear: string) {
        const drawLayer = (yOffset: number, color: string, roughness: number, seedOffset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, h * 0.6 + yOffset);
            for(let x=0; x<=w; x+=20) {
                const n = Math.sin(x * 0.01 + seedOffset) * Math.cos(x * 0.03) * roughness;
                ctx.lineTo(x, h * 0.6 + yOffset + n);
            }
            ctx.lineTo(w, h * 0.6 + yOffset);
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
        drawDune(h * 0.65, colorFar, 30, 0.005, 0);
        
        ctx.globalAlpha = 0.6;
        drawDune(h * 0.75, colorNear, 40, 0.003, 2);
        ctx.globalAlpha = 1.0;
    }

    // --- DYNAMIC RENDERING ---

    private drawDynamicElements(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, mapConfig: MapConfig, t: number) {
        ctx.save();

        // 1. Drifting Particles (New Layer)
        // Draw some random floating specks
        ctx.fillStyle = scene.ambientColor;
        const speckCount = 50;
        for(let i=0; i<speckCount; i++) {
            const speed = (i % 5 + 1) * 10;
            const y = (h + (i * 53) - (t * speed)) % h;
            const x = (w + (i * 97) + Math.sin(t + i)*50) % w;
            const size = Math.sin(t * 2 + i) + 2;
            
            ctx.globalAlpha = (Math.sin(t + i) * 0.5 + 0.5) * 0.6;
            ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
        }

        // 2. Horizon Glow
        const glowH = h * 0.7;
        const pulse = 1.0 + Math.sin(t * 0.5) * 0.1;
        const horizonGrad = ctx.createRadialGradient(w/2, glowH, w * 0.2, w/2, glowH, w * 0.8 * pulse);
        horizonGrad.addColorStop(0, scene.horizon);
        horizonGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, h/2, w, h/2);

        // 3. Features
        if (scene.bgFeature === 'AURORA') {
            this.drawAurora(ctx, w, h, t);
        } else if (scene.bgFeature === 'CANOPY') {
            this.drawCanopyRays(ctx, w, h, t);
        } else if (scene.bgFeature === 'HEAT_WAVE') {
            this.drawHeatHaze(ctx, w, h, t, scene.horizon);
        }

        // 4. Fog / Atmospheric Effects
        if (scene.textureType === 'DESERT') {
            this.drawSandStorm(ctx, w, h, t, scene.fogColor);
        } else {
            this.drawFogLayers(ctx, w, h, scene.fogColor, mapConfig, t);
        }

        ctx.restore();
    }

    private drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.globalCompositeOperation = 'screen';
        const numBands = 3;
        const baseH = h * 0.4;
        
        for (let i = 0; i < numBands; i++) {
            const speed = t * 0.2 + i;
            ctx.beginPath();
            ctx.moveTo(0, baseH);
            for (let x = 0; x <= w; x += 50) {
                const y = baseH + Math.sin(x * 0.005 + speed) * 50 + Math.sin(x * 0.02 - speed) * 20;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, 0);
            ctx.lineTo(0, 0);
            
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.5, `hsla(170, 80%, 60%, 0.15)`); 
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    private drawCanopyRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.globalCompositeOperation = 'overlay';
        const raySprite = VFXFactory.getTexture('BEAM', 'rgba(255,255,255,0.1)');
        
        const numRays = 4;
        for (let i = 0; i < numRays; i++) {
            const angle = Math.sin(t * 0.2 + i) * 0.1 + 0.6;
            const x = w * (0.2 + i * 0.2) + Math.sin(t * 0.1) * 50;
            
            ctx.save();
            ctx.translate(x, -100);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.15 + Math.sin(t * 0.5 + i) * 0.05;
            ctx.drawImage(raySprite, -50, 0, 100, h * 1.5);
            ctx.restore();
        }
    }

    private drawHeatHaze(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createLinearGradient(0, h, 0, h * 0.6);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.globalAlpha = 0.2 + Math.sin(t * 2) * 0.05;
        ctx.fillStyle = grad;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);
        
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#fff';
        const bands = 5;
        for(let i=0; i<bands; i++) {
            const y = h - ((t * 50 + i * 100) % (h*0.4));
            ctx.fillRect(0, y, w, 10);
        }
    }

    private drawFogLayers(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, mapConfig: MapConfig, t: number) {
        ctx.globalCompositeOperation = 'screen';
        const fogSprite = AssetManager.getFogCloud(color);
        const numClouds = 4;
        
        for (let i = 0; i < numClouds; i++) {
            const speed = 25;
            const x = ((t * speed + i * (w / numClouds)) % (w + 400)) - 200;
            const y = h * 0.6 + Math.sin(i + t * 0.2) * 50;
            const size = 400;
            
            ctx.globalAlpha = 0.08; 
            ctx.drawImage(fogSprite, x - size/2, y - size/2, size, size * 0.5);
        }
    }

    private drawSandStorm(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string) {
        ctx.globalCompositeOperation = 'overlay'; 
        
        const windSpeed = 300; // Increased wind speed
        const drift = t * windSpeed;
        
        // 1. Base Dust Haze
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.2; 
        ctx.fillRect(0, 0, w, h);

        // 2. Flying Sand Clouds (Midground)
        const fogSprite = AssetManager.getFogCloud(color);
        const numClouds = 6;
        for (let i = 0; i < numClouds; i++) {
            const x = ((drift + i * (w / numClouds)) % (w + 600)) - 300;
            const y = (Math.sin(i * 132 + t) * 0.5 + 0.5) * h;
            const size = 500;
            
            ctx.globalAlpha = 0.12;
            ctx.drawImage(fogSprite, x, y, size, size * 0.3);
        }
        
        // 3. Low Ground Mist (NEW) - Flowing sand near the floor
        const mistH = 200;
        const mistY = h - mistH;
        
        const mistGrad = ctx.createLinearGradient(0, mistY, 0, h);
        mistGrad.addColorStop(0, 'rgba(0,0,0,0)');
        mistGrad.addColorStop(0.4, color);
        mistGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        
        ctx.fillStyle = mistGrad;
        ctx.globalAlpha = 0.4 + Math.sin(t*3) * 0.1;
        ctx.fillRect(0, mistY, w, mistH);

        // Fast moving noise layer in the mist
        const noiseX = (drift * 1.5) % 100;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.05;
        for(let i=0; i<10; i++) {
            const barH = 5 + Math.random()*10;
            const barY = h - 50 - Math.random() * 100;
            ctx.fillRect(0, barY, w, barH);
        }

        // 4. Fast Streaks (Foreground Wind)
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.08;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 30; i++) {
            // Skew streaks to look like they are flying over the grid
            const streakX = ((drift * 2.5 + i * 153) % (w + 200)) - 100;
            const streakY = (Math.sin(i * 21) * 0.5 + 0.5) * (h * 0.8) + h * 0.2; // Keep lower on screen
            ctx.moveTo(streakX, streakY);
            ctx.lineTo(streakX + 150, streakY + 5);
        }
        ctx.stroke();
    }
}
