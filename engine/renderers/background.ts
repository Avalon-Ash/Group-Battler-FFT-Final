
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
    }

    private drawComplexBackground(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number): void {
        // 1. Base Gradient (Sky + Horizon)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, scene.background); // Sky Top
        bgGrad.addColorStop(0.6, scene.horizon);  // Horizon Line
        bgGrad.addColorStop(1, '#000');           // Below Horizon (Ground blend)
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // 2. Stars / Nebula (For Space/Ice/Night themes)
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

        // 3. Distant Silhouette / Terrain (Mountains)
        if (scene.id === 'FOREST' || scene.id === 'ICE' || scene.id === 'DESERT' || scene.id === 'MAGMA') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = scene.background; // Blend with sky color but darker
            ctx.globalAlpha = 0.5;
            
            const drawMountainLayer = (speed: number, yOffset: number, roughness: number) => {
                ctx.beginPath();
                ctx.moveTo(0, h);
                for(let x=0; x<=w; x+=20) {
                    // Simple procedural terrain noise
                    const n = Math.sin(x * 0.01 + t * speed) * Math.cos(x * 0.03) * roughness;
                    ctx.lineTo(x, h * 0.6 + yOffset + n);
                }
                ctx.lineTo(w, h);
                ctx.fill();
            };

            // Far Layer
            drawMountainLayer(0.01, 0, 50);
            // Near Layer (Darker)
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.3;
            drawMountainLayer(0.02, 50, 30);
        }

        // 4. Special Sky Features
        this.drawSkyFeatures(ctx, w, h, scene, t);

        ctx.restore();
    }

    private drawSkyFeatures(ctx: CanvasRenderingContext2D, w: number, h: number, scene: SceneTheme, t: number) {
        if (scene.bgFeature === 'NONE') return;

        ctx.globalCompositeOperation = 'screen';
        
        if (scene.bgFeature === 'SKY_RIVER') {
            // --- COSMIC RIVER ---
            const color = scene.ambientColor; // Purple
            
            // Draw multiple sine waves to simulate a flowing river
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
            
            // Add particles in the river
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.6;
            for(let i=0; i<20; i++) {
                const prog = (t * 0.1 + i / 20) % 1;
                const x = prog * w;
                const y = h * 0.3 + 50 + Math.sin(x * 0.005 + t * 0.2) * 40;
                ctx.beginPath(); ctx.arc(x, y, Math.random()*2 + 1, 0, Math.PI*2); ctx.fill();
            }

        } else if (scene.bgFeature === 'AURORA') {
            // --- VERTICAL CURTAINS ---
            const colors = ['#34d399', '#22d3ee', '#818cf8']; // Green, Cyan, Indigo
            
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
                ctx.lineTo(w, 0); // Top Right
                ctx.lineTo(0, 0); // Top Left
                ctx.fill();
            }

        } else if (scene.bgFeature === 'CANOPY') {
            // --- GOD RAYS ---
            ctx.globalCompositeOperation = 'overlay';
            const centerX = w * 0.8;
            const centerY = -100;
            
            const grad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, w);
            grad.addColorStop(0, '#fef08a'); // Yellow light
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.2;
            
            // Draw Angular Rays
            for(let i=0; i<6; i++) {
                const angle = Math.PI / 2 + Math.sin(t * 0.2 + i) * 0.2 + (i * 0.3);
                const width = Math.PI / 16;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + Math.cos(angle - width) * w * 1.5, centerY + Math.sin(angle - width) * w * 1.5);
                ctx.lineTo(centerX + Math.cos(angle + width) * w * 1.5, centerY + Math.sin(angle + width) * w * 1.5);
                ctx.fill();
            }
        } else if (scene.bgFeature === 'HEAT_WAVE') {
            // Rising heat distortion visual
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
        const fogSprite = AssetManager.getFogCloud(fogColor); // Use pre-rendered sprite
        const numClouds = 8;
        
        for (let i = 0; i < numClouds; i++) {
            // Moving clouds across the map
            const speed = 20;
            const x = ((t * speed + i * (mapW / numClouds)) % (mapW * 1.5)) - mapW * 0.25;
            const y = (Math.sin(i * 123 + t * 0.1) * 0.5 + 0.5) * mapH;
            const size = 300 + Math.sin(i) * 100;
            
            ctx.globalAlpha = 0.1 + Math.sin(t * 0.5 + i) * 0.05; // Pulse opacity
            ctx.drawImage(fogSprite, x - size/2, y - size/2, size, size * 0.6);
        }
        
        ctx.restore();
    }
}
