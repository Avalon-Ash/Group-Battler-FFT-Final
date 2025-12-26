
import { SceneTheme } from "../../types";
import { HEX_SIZE } from "../../constants";
import { AssetManager } from "../assets";
import { MapConfig } from "../utils";
import { createCanvas } from "../graphics/CanvasUtils";

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
        // 1. Check if we need to regenerate static cache
        if (!this.staticCache || this.lastSceneId !== scene.id || this.lastWidth !== width || this.lastHeight !== height) {
            this.updateStaticCache(width, height, scene);
        }

        // 2. Draw Static Layer (Instant blit)
        if (this.staticCache) {
            ctx.drawImage(this.staticCache, 0, 0);
        }

        // 3. Dynamic Elements (Clouds / Fog / God Rays)
        // These need to animate every frame
        this.drawDynamicElements(ctx, width, height, scene, mapConfig, globalTime);
    }

    private updateStaticCache(w: number, h: number, scene: SceneTheme) {
        // Create or Resize Canvas
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

        // --- DRAW STATIC CONTENT ---
        
        // 1. Base Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background);
        bgGrad.addColorStop(0.5, scene.horizon);
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Horizon Glow (Static)
        const hY = h * 0.6;
        const hGlow = ctx.createRadialGradient(w/2, hY, w*0.1, w/2, hY, w*0.8);
        hGlow.addColorStop(0, scene.horizon);
        hGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        // 3. Static Stars / Nebula Base
        if (scene.id === 'VOID' || scene.id === 'ICE' || scene.id === 'FOREST') {
             ctx.fillStyle = '#fff';
             const seed = 123; 
             for(let i=0; i<80; i++) {
                 const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
                 const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.8;
                 const size = Math.random() * 2;
                 // Static Alpha for base stars
                 ctx.globalAlpha = 0.6 * (scene.id === 'VOID' ? 0.8 : 0.4);
                 ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
             }
        }

        // 4. Distant Silhouette (Static Mountains)
        if (scene.id === 'FOREST' || scene.id === 'ICE' || scene.id === 'DESERT' || scene.id === 'MAGMA') {
            ctx.globalCompositeOperation = 'source-over';
            const drawMountainLayer = (yOffset: number, color: string, roughness: number, seedOffset: number) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
                    // Use static seed instead of time
                    const n = Math.sin(x * 0.01 + seedOffset) * Math.cos(x * 0.03) * roughness;
                    ctx.lineTo(x, h * 0.55 + yOffset + n);
                }
                ctx.lineTo(w, h);
                ctx.fill();
            };
            ctx.globalAlpha = 0.3;
            drawMountainLayer(0, scene.fogColor, 60, 0);
            ctx.globalAlpha = 0.5;
            drawMountainLayer(60, scene.horizon, 40, 100);
        }
    }

    private drawDynamicElements(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, mapConfig: MapConfig, t: number) {
        ctx.save();

        // 1. Moving Clouds
        if (scene.id !== 'VOID') {
            this.drawMovingClouds(ctx, w, h, scene, t);
        }

        // 2. Twinkling Stars / Moving Nebula (Overlay)
        if (scene.id === 'VOID' || scene.id === 'ICE') {
             ctx.globalCompositeOperation = 'screen';
             const cloudCount = 3;
             for(let i=0; i<cloudCount; i++) {
                 const x = (Math.sin(i * 1.5 + t * 0.05) * 0.5 + 0.5) * w;
                 const y = (Math.cos(i * 1.2 + t * 0.03) * 0.3 + 0.3) * h;
                 const radius = w * 0.4;
                 const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                 grad.addColorStop(0, scene.ambientColor);
                 grad.addColorStop(1, 'transparent');
                 ctx.fillStyle = grad;
                 ctx.globalAlpha = 0.1; // Subtler
                 ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
             }
        }

        // 3. God Rays & Sky Features
        this.drawGodRays(ctx, w, h, t);
        this.drawSkyFeatures(ctx, w, h, scene, t);

        // 4. Atmospheric Fog (Screen Space)
        const mapPxW = mapConfig.w * HEX_SIZE * 2;
        const mapPxH = mapConfig.h * HEX_SIZE * 2;
        this.drawAtmosphericFog(ctx, mapPxW, mapPxH, scene, t);

        // 5. Vignette (Cheaper)
        // Only draw if strictly needed, or bake into static. 
        // Keeping here for now as it helps focus dynamic elements.
        const rad = Math.min(w, h) * 0.8;
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.5, w/2, h/2, rad * 1.5);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
    }

    private drawMovingClouds(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number) {
        const layers = 2;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = scene.fogColor;
        
        for(let l=0; l<layers; l++) {
            const speed = (l + 1) * 10;
            const yBase = h * (0.1 + l * 0.2);
            const scale = 100 + l * 50;
            
            ctx.globalAlpha = 0.1 + l * 0.1;
            
            for(let i=0; i<6; i++) {
                const x = ((t * speed + i * (w/4)) % (w + scale*2)) - scale;
                const y = yBase + Math.sin(t * 0.5 + i) * 20;
                
                // Use rect for clouds if distant to save path perf, or ellipse
                ctx.beginPath();
                ctx.ellipse(x, y, scale, scale * 0.4, 0, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }

    private drawGodRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        
        const sourceX = w * 0.8 + Math.sin(t * 0.1) * 100;
        const sourceY = -100;
        
        const grad = ctx.createRadialGradient(sourceX, sourceY, 50, sourceX, sourceY, w);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); 
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        // Reduced ray count for perf
        for(let i=0; i<4; i++) {
            const angle = Math.PI / 2 + 0.3 + Math.sin(t * 0.05 + i) * 0.1 + (i * 0.15);
            const width = Math.PI / 32 * (1 + Math.sin(t + i)*0.2);
            const rayLen = w * 1.5;
            
            ctx.beginPath();
            ctx.moveTo(sourceX, sourceY);
            ctx.lineTo(sourceX + Math.cos(angle - width) * rayLen, sourceY + Math.sin(angle - width) * rayLen);
            ctx.lineTo(sourceX + Math.cos(angle + width) * rayLen, sourceY + Math.sin(angle + width) * rayLen);
            ctx.fill();
        }
        ctx.restore();
    }

    private drawSkyFeatures(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number) {
        if (scene.bgFeature === 'NONE') return;

        ctx.globalCompositeOperation = 'screen';
        
        if (scene.bgFeature === 'SKY_RIVER') {
            const color = scene.ambientColor;
            // Reduced loop count
            for(let i=0; i<3; i++) {
                const lineWidth = 30 + i * 10;
                const amplitude = 30 + i * 10;
                const phase = t * (0.2 + i * 0.05);
                const yBase = h * 0.3 + i * 20;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = 0.1 - (i * 0.01);
                ctx.beginPath();
                // Increased step size
                for(let x=0; x<=w; x+=30) {
                    const y = yBase + Math.sin(x * 0.005 + phase) * amplitude + Math.cos(x * 0.01 - t*0.5) * 20;
                    if (x===0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        } else if (scene.bgFeature === 'AURORA') {
            const colors = ['#34d399', '#818cf8']; 
            for(let i=0; i<2; i++) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.2, colors[i]);
                grad.addColorStop(0.8, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.globalAlpha = 0.15;
                const phase = t * 0.5 + i * 2;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=40) {
                    const y = h * 0.4 + Math.sin(x * 0.01 + phase) * 100 * Math.sin(x*0.002);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(w, 0); 
                ctx.lineTo(0, 0); 
                ctx.fill();
            }
        } else if (scene.bgFeature === 'HEAT_WAVE') {
            ctx.fillStyle = '#fca5a5';
            ctx.globalAlpha = 0.05;
            // Reduced count
            for(let i=0; i<5; i++) {
                const x = (i / 5) * w;
                const height = h * 0.5 + Math.sin(t * 2 + i) * 50;
                const width = w / 5;
                ctx.fillRect(x, h - height, width, height);
            }
        }
    }

    private drawAtmosphericFog(ctx: CanvasRenderingContext2D, mapW: number, mapH: number, scene: SceneTheme, t: number) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        const fogColor = scene.fogColor || '#fff';
        const fogSprite = AssetManager.getFogCloud(fogColor); 
        const numClouds = 6; // Reduced from 8
        
        for (let i = 0; i < numClouds; i++) {
            const speed = 20;
            const x = ((t * speed + i * (mapW / numClouds)) % (mapW * 1.5)) - mapW * 0.25;
            const y = (Math.sin(i * 123 + t * 0.1) * 0.5 + 0.5) * mapH;
            const size = 300 + Math.sin(i) * 100;
            
            ctx.globalAlpha = 0.1 + Math.sin(t * 0.5 + i) * 0.05; 
            ctx.drawImage(fogSprite, x - size/2, y - size/2, size, size * 0.6);
        }
        ctx.restore();
    }
}
