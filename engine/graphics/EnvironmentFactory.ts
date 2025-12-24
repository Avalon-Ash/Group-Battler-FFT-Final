
import { OBSTACLE_STYLES } from "../../constants";
import { createCanvas } from "./CanvasUtils";

export const EnvironmentFactory = {
    
    generateObstacle(styleKey: string): HTMLCanvasElement {
        // Dimensions
        const width = 80;
        const height = 110;
        const { canvas, ctx } = createCanvas(width, height);
        const cx = width / 2;
        const cy = height - 15; // Bottom anchor point (Ground level)
        
        // Default Fallback
        const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

        // Common Shadow (Ground Ambient Occlusion) - Cleaner ellipse
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, 28, 14, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.filter = 'none';

        if (styleKey === 'TREE') {
            // --- STYLIZED PINE (Clean Geometric Layers) ---
            
            // Trunk
            ctx.fillStyle = '#291815'; // Darker Wood
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy); 
            ctx.lineTo(cx + 6, cy);
            ctx.lineTo(cx + 4, cy - 25);
            ctx.lineTo(cx - 4, cy - 25);
            ctx.fill();

            const layers = 3;
            const topY = cy - 95;
            const bottomY = cy - 20;
            
            for (let i = 0; i < layers; i++) {
                const ratio = i / layers;
                const layerY = topY + (bottomY - topY) * ratio;
                // const nextY = topY + (bottomY - topY) * ((i+1)/layers);
                const spread = 15 + i * 14;
                
                const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
                grad.addColorStop(0, style.highlight); // Bright Tip
                grad.addColorStop(0.4, style.main); 
                grad.addColorStop(1, style.dark); // Dark Bottom
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx, layerY - 18); // Tip
                // Left Flare
                ctx.quadraticCurveTo(cx - spread * 0.5, layerY + 5, cx - spread, layerY + 15);
                // Bottom Curve (Concave up)
                ctx.quadraticCurveTo(cx, layerY + 10, cx + spread, layerY + 15);
                // Right Flare
                ctx.quadraticCurveTo(cx + spread * 0.5, layerY + 5, cx, layerY - 18);
                ctx.fill();
                
                // Edge Highlight (Rim)
                ctx.strokeStyle = style.light;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, layerY - 18);
                ctx.lineTo(cx - spread, layerY + 15);
                ctx.stroke();
                
                // Shadow underneath layer
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.moveTo(cx, layerY + 10);
                ctx.lineTo(cx + spread, layerY + 15);
                ctx.lineTo(cx - spread, layerY + 15);
                ctx.fill();
            }

        } else if (styleKey === 'ICE_CRYSTAL') {
            // --- SHARP CRYSTAL CLUSTER ---
            
            const drawCrystal = (x: number, y: number, w: number, h: number, angle: number, color: string) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Facet 1 (Left/Dark)
                ctx.fillStyle = style.dark;
                ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-w, 0); ctx.lineTo(0, 5); ctx.fill();
                
                // Facet 2 (Right/Light)
                const grad = ctx.createLinearGradient(0, -h, 0, 5);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, style.light);
                grad.addColorStop(1, style.main);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, 5); ctx.fill();
                
                // Rim
                ctx.strokeStyle = style.highlight;
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.restore();
            };

            drawCrystal(cx - 15, cy - 5, 10, 40, -0.2, '#fff');
            drawCrystal(cx + 12, cy, 12, 35, 0.3, '#fff');
            drawCrystal(cx, cy + 5, 16, 65, 0, '#fff'); // Main

        } else if (styleKey === 'OBSIDIAN_PILLAR') {
            // --- MONOLITH (Dark Geometric) ---
            
            const topY = cy - 75;
            const w = 25;
            
            // Main Body Gradient
            const rockGrad = ctx.createLinearGradient(cx - w, topY, cx + w, cy);
            rockGrad.addColorStop(0, style.light);
            rockGrad.addColorStop(0.4, style.main);
            rockGrad.addColorStop(1, style.dark);
            ctx.fillStyle = rockGrad;
            
            ctx.beginPath();
            ctx.moveTo(cx, topY); // Top tip
            ctx.lineTo(cx + w, cy - 20); // Right mid
            ctx.lineTo(cx + 10, cy); // Base Right
            ctx.lineTo(cx - 10, cy); // Base Left
            ctx.lineTo(cx - w, cy - 20); // Left mid
            ctx.closePath();
            ctx.fill();
            
            // Facet Highlights (Edges)
            ctx.strokeStyle = style.light;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, topY); ctx.lineTo(cx + w, cy - 20);
            ctx.moveTo(cx, topY); ctx.lineTo(cx - w, cy - 20);
            ctx.moveTo(cx, topY); ctx.lineTo(cx, cy); // Center spine
            ctx.stroke();
            
            // Emissive Veins
            ctx.strokeStyle = style.detail;
            ctx.shadowColor = style.highlight;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - 10); ctx.lineTo(cx + 5, cy - 30); ctx.lineTo(cx, cy - 50);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else if (styleKey === 'SANDSTONE') {
            // --- MESA STACK (Rounded Layers) ---
            
            const layers = 5;
            const w = 35;
            let currentW = w;
            let currentY = cy;
            
            for(let i=0; i<layers; i++) {
                const h = 15 + Math.random() * 5;
                const nextY = currentY - h;
                const nextW = currentW * (0.6 + Math.random() * 0.2); // Taper up
                
                // Gradient for rounded volume
                const grad = ctx.createLinearGradient(cx - currentW, 0, cx + currentW, 0);
                const color = i % 2 === 0 ? style.main : style.light;
                grad.addColorStop(0, style.dark);
                grad.addColorStop(0.2, color);
                grad.addColorStop(0.8, color);
                grad.addColorStop(1, style.dark);
                ctx.fillStyle = grad;
                
                ctx.beginPath();
                ctx.ellipse(cx, currentY, currentW, 10, 0, 0, Math.PI*2);
                ctx.fill();
                
                // Block body
                ctx.fillRect(cx - nextW, nextY, nextW * 2, currentY - nextY);
                
                // Top Highlight Rim
                ctx.strokeStyle = style.highlight;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.ellipse(cx, nextY, nextW, 6, 0, 0, Math.PI*2); ctx.stroke();
                ctx.globalAlpha = 1.0;

                currentY = nextY;
                currentW = nextW;
            }
            // Top Cap
            ctx.fillStyle = style.light;
            ctx.beginPath();
            ctx.ellipse(cx, currentY, currentW, 6, 0, 0, Math.PI*2);
            ctx.fill();

        } else {
            // --- STONE PILLAR (Stylized Fortification) ---
            const w = 30; // Half width
            const h = 60; // Height
            const topY = cy - h;
            
            // 1. Right Face (Shadow)
            ctx.fillStyle = style.dark;
            ctx.beginPath();
            ctx.moveTo(cx, topY);
            ctx.lineTo(cx + w, topY + 10); // Isometric top-right
            ctx.lineTo(cx + w, cy - 10);   // Bottom-right
            ctx.lineTo(cx, cy);            // Bottom-center
            ctx.fill();
            
            // 2. Left Face (Mid)
            ctx.fillStyle = style.main;
            ctx.beginPath();
            ctx.moveTo(cx, topY);
            ctx.lineTo(cx - w, topY + 10);
            ctx.lineTo(cx - w, cy - 10);
            ctx.lineTo(cx, cy);
            ctx.fill();
            
            // 3. Top Face (Light)
            ctx.fillStyle = style.light;
            ctx.beginPath();
            ctx.moveTo(cx, topY);
            ctx.lineTo(cx + w, topY + 10);
            ctx.lineTo(cx, topY + 20); // Center-down
            ctx.lineTo(cx - w, topY + 10);
            ctx.fill();
            
            // 4. Edges / Outline
            ctx.strokeStyle = style.highlight;
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            // Central Spine
            ctx.moveTo(cx, topY); ctx.lineTo(cx, cy);
            // Top Diamond
            ctx.moveTo(cx, topY); ctx.lineTo(cx + w, topY + 10); ctx.lineTo(cx, topY + 20); ctx.lineTo(cx - w, topY + 10); ctx.lineTo(cx, topY);
            ctx.stroke();
            
            // Rivet Details
            ctx.fillStyle = style.dark;
            ctx.beginPath(); ctx.arc(cx, topY + 30, 3, 0, Math.PI*2); ctx.fill();
        }

        return canvas;
    },

    generateIceBlock(): HTMLCanvasElement {
        const width = 96;
        const height = 128;
        const { canvas, ctx } = createCanvas(width, height);
        const cx = width / 2;
        const cy = height - 20;
        
        // Ice block uses ICE_CRYSTAL theme
        const style = OBSTACLE_STYLES['ICE_CRYSTAL'] || { 
            main: '#7dd3fc', light: '#bae6fd', dark: '#0ea5e9', detail: '#e0f2fe', highlight: '#ffffff' 
        };

        const drawShard = (x: number, y: number, w: number, h: number, angle: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Left Face
            ctx.fillStyle = style.dark;
            ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-w, 0); ctx.lineTo(0, w/2); ctx.fill();

            // Right Face
            const grad = ctx.createLinearGradient(0, -h, 0, w/2);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.4, style.light);
            grad.addColorStop(1, style.main);
            ctx.fillStyle = grad;
            
            ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, w/2); ctx.fill();
            
            // Highlights
            ctx.strokeStyle = style.highlight;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        };

        // Cluster of ice shards
        drawShard(cx - 20, cy, 15, 60, -0.3);
        drawShard(cx + 20, cy - 5, 18, 50, 0.3);
        drawShard(cx, cy + 10, 25, 90, 0); // Main center shard
        
        // Ground ice
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 10, 0, 0, Math.PI*2);
        ctx.fill();

        return canvas;
    }
};
