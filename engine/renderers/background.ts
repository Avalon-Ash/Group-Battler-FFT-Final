
import { SceneTheme } from "../../types";
import { HEX_SIZE } from "../../constants";
import { AssetManager } from "../assets";
import { MapConfig } from "../utils";

export class BackgroundRenderer {

    public draw(
        ctx: CanvasRenderingContext2D, 
        width: number, 
        height: number, 
        scene: SceneTheme, 
        mapConfig: MapConfig, 
        globalTime: number
    ): void {
        // 1. Base Gradient & Complex Background
        this.drawComplexBackground(ctx, width, height, scene, globalTime);

        // 2. Atmospheric Fog (Screen Space overlay)
        // Map dimensions in pixels for fog scrolling
        const mapPxW = mapConfig.w * HEX_SIZE * 2;
        const mapPxH = mapConfig.h * HEX_SIZE * 2;
        this.drawAtmosphericFog(ctx, mapPxW, mapPxH, scene, globalTime);
        
        // 3. Vignette (Focus attention on center)
        const rad = Math.min(width, height) * 0.8;
        const vig = ctx.createRadialGradient(width/2, height/2, rad * 0.5, width/2, height/2, rad * 1.5);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
    }

    private drawComplexBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number): void {
        // 1. Base Gradient (Sky + Horizon)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background); // Sky Top
        bgGrad.addColorStop(0.6, scene.horizon);  // Horizon Line
        bgGrad.addColorStop(1, '#020617');        // Ground Blend
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // 2. Dynamic Moving Clouds (Parallax Layers)
        if (scene.id !== 'VOID') {
            this.drawMovingClouds(ctx, w, h, scene, t);
        }

        // 3. Stars / Nebula (For Space/Ice/Night themes)
        if (scene.id === 'VOID' || scene.id === 'ICE' || scene.id === 'FOREST') {
             // Nebula clouds
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
                 ctx.globalAlpha = 0.15;
                 ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
             }

             // Stars
             ctx.fillStyle = '#fff';
             const seed = 123; 
             for(let i=0; i<80; i++) {
                 const sx = (Math.sin(i * seed) * 0.5 + 0.5) * w;
                 const sy = (Math.cos(i * seed * 1.5) * 0.5 + 0.5) * h * 0.8; // Keep stars in upper sky
                 const size = Math.random() * 2;
                 const alpha = Math.sin(t + i) * 0.5 + 0.5;
                 ctx.globalAlpha = alpha * (scene.id === 'VOID' ? 0.8 : 0.4);
                 ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI*2); ctx.fill();
             }
        }

        // 4. Distant Silhouette (Mountains) - Filled Polygon for depth
        if (scene.id === 'FOREST' || scene.id === 'ICE' || scene.id === 'DESERT' || scene.id === 'MAGMA') {
            ctx.globalCompositeOperation = 'source-over';
            
            const drawMountainLayer = (speed: number, yOffset: number, color: string, roughness: number) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
                    const n = Math.sin(x * 0.01 + t * speed) * Math.cos(x * 0.03) * roughness;
                    ctx.lineTo(x, h * 0.55 + yOffset + n);
                }
                ctx.lineTo(w, h);
                ctx.fill();
            };

            // Far Layer (Lighter/Foggy)
            ctx.globalAlpha = 0.3;
            drawMountainLayer(0.005, 0, scene.fogColor, 60);
            
            // Near Layer (Darker)
            ctx.globalAlpha = 0.5;
            drawMountainLayer(0.01, 60, scene.horizon, 40);
        }

        // 5. Special Sky Features & God Rays
        this.drawGodRays(ctx, w, h, t);
        this.drawSkyFeatures(ctx, w, h, scene, t);

        ctx.restore();
    }

    private drawMovingClouds(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number) {
        // Multi-layered clouds
        const layers = 2;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = scene.fogColor;
        
        for(let l=0; l<layers; l++) {
            const speed = (l + 1) * 10;
            const yBase = h * (0.1 + l * 0.2);
            const scale = 100 + l * 50;
            
            ctx.globalAlpha = 0.1 + l * 0.1;
            
            for(let i=0; i<6; i++) {
                // Moving X
                const x = ((t * speed + i * (w/4)) % (w + scale*2)) - scale;
                const y = yBase + Math.sin(t * 0.5 + i) * 20;
                
                ctx.beginPath();
                ctx.ellipse(x, y, scale, scale * 0.4, 0, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }

    private drawGodRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        
        // Source position moves slowly
        const sourceX = w * 0.8 + Math.sin(t * 0.1) * 100;
        const sourceY = -100;
        
        const grad = ctx.createRadialGradient(sourceX, sourceY, 50, sourceX, sourceY, w);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); 
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        
        // Draw Angular Rays
        for(let i=0; i<5; i++) {
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
            // --- COSMIC RIVER ---
            const color = scene.ambientColor; // Purple
            
            for(let i=0; i<5; i++) {
                const lineWidth = 30 + i * 10;
                const amplitude = 30 + i * 10;
                const phase = t * (0.2 + i * 0.05);
                const yBase = h * 0.3 + i * 20;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.globalAlpha = 0.1 - (i * 0.01);
                ctx.beginPath();
                for(let x=0; x<=w; x+=10) {
                    const y = yBase + Math.sin(x * 0.005 + phase) * amplitude + Math.cos(x * 0.01 - t*0.5) * 20;
                    if (x===0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.6;
            for(let i=0; i<20; i++) {
                const prog = (t * 0.1 + i / 20) % 1;
                const x = prog * w;
                const y = h * 0.3 + 50 + Math.sin(x * 0.005 + t * 0.2) * 40;
                ctx.beginPath(); ctx.arc(x, y, Math.random()*2 + 1, 0, Math.PI*2); ctx.fill();
            }

        } else if (scene.bgFeature === 'AURORA') {
            const colors = ['#34d399', '#22d3ee', '#818cf8']; 
            
            for(let i=0; i<3; i++) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.2, colors[i]);
                grad.addColorStop(0.8, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.globalAlpha = 0.15;
                
                const phase = t * 0.5 + i * 2;
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
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
            for(let i=0; i<10; i++) {
                const x = (i / 10) * w;
                const height = h * 0.5 + Math.sin(t * 2 + i) * 50;
                const width = w / 10;
                ctx.fillRect(x, h - height, width, height);
            }
        }
    }

    private drawAtmosphericFog(ctx: CanvasRenderingContext2D, mapW: number, mapH: number, scene: SceneTheme, t: number) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        const fogColor = scene.fogColor || '#fff';
        const fogSprite = AssetManager.getFogCloud(fogColor); 
        const numClouds = 8;
        
        for (let i = 0; i < numClouds; i++) {
            // Clouds moving diagonally
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
