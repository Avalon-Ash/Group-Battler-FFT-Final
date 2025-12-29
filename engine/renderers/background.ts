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
        if (!this.staticCache || this.lastSceneId !== scene.id || this.lastWidth !== width || this.lastHeight !== height) {
            this.updateStaticCache(width, height, scene);
        }
        if (this.staticCache) {
            ctx.drawImage(this.staticCache, 0, 0);
        }
        this.drawDynamicElements(ctx, width, height, scene, mapConfig, globalTime);
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
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background);
        bgGrad.addColorStop(0.5, scene.horizon);
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
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
        if (scene.id === 'VOID' || scene.id === 'ICE' || scene.id === 'FOREST') {
             ctx.fillStyle = '#fff';
             const seed = 123; 
             for(let i=0; i<80; i++) {
                 const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
                 const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.8;
                 const size = Math.random() * 2;
                 ctx.globalAlpha = 0.6 * (scene.id === 'VOID' ? 0.8 : 0.4);
                 ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
             }
        }
        if (scene.id === 'FOREST' || scene.id === 'ICE' || scene.id === 'DESERT' || scene.id === 'MAGMA') {
            ctx.globalCompositeOperation = 'source-over';
            const drawMountainLayer = (yOffset: number, color: string, roughness: number, seedOffset: number) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
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
        const rad = Math.min(w, h) * 0.8;
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.5, w/2, h/2, rad * 1.5);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }
    private drawDynamicElements(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, mapConfig: MapConfig, t: number) {
        ctx.save();
        if (scene.id === 'FOREST' || scene.id === 'DESERT') {
            const raySprite = VFXFactory.getTexture('BEAM', 'rgba(255,255,255,0.1)'); 
            const sourceX = w * 0.8 + Math.sin(t * 0.1) * 100;
            const sourceY = -100;
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.3; 
            ctx.translate(sourceX, sourceY);
            ctx.rotate(Math.PI * 0.6); 
            const rayLen = w * 1.5;
            const rayWidth = 200;
            ctx.drawImage(raySprite, 0, -rayWidth/2, rayLen, rayWidth);
            ctx.rotate(0.2);
            ctx.drawImage(raySprite, 0, -rayWidth/3, rayLen, rayWidth*0.8);
        }
        const mapPxW = mapConfig.w * HEX_SIZE * 2;
        const mapPxH = mapConfig.h * HEX_SIZE * 2;
        ctx.globalCompositeOperation = 'screen';
        const fogColor = scene.fogColor || '#fff';
        const fogSprite = AssetManager.getFogCloud(fogColor); 
        const numClouds = 4; 
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        for (let i = 0; i < numClouds; i++) {
            const speed = 20;
            const x = ((t * speed + i * (mapPxW / numClouds)) % (mapPxW * 1.5)) - mapPxW * 0.25;
            const y = (Math.sin(i * 123 + t * 0.1) * 0.5 + 0.5) * mapPxH;
            const size = 300;
            ctx.globalAlpha = 0.05; 
            ctx.drawImage(fogSprite, x - size/2, y - size/2, size, size * 0.6);
        }
        if (scene.id === 'ICE') {
            const auroraH = h * 0.4;
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            const offset = (t * 0.2) % 1;
            grad.addColorStop(0, 'transparent');
            grad.addColorStop((0.3 + offset)%1, '#06b6d4');
            grad.addColorStop((0.7 + offset)%1, '#818cf8');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.2;
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            ctx.moveTo(0, auroraH);
            for(let x=0; x<=w; x+=50) {
                ctx.lineTo(x, auroraH + Math.sin(x * 0.01 + t) * 50);
            }
            ctx.lineTo(w, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
        }
        ctx.restore();
    }
}