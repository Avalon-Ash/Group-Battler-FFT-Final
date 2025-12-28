
import { OBSTACLE_STYLES } from "../../constants";
import { createCanvas } from "./CanvasUtils";

export const EnvironmentFactory = {
    
    generateObstacle(styleKey: string): HTMLCanvasElement {
        // Dimensions
        const width = 96; // Slightly wider for 3-face geometry
        const height = 110;
        const { canvas, ctx } = createCanvas(width, height);
        const cx = width / 2;
        const cy = height - 15; // Bottom anchor point (Ground level)
        
        // Default Fallback
        const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

        // Common Shadow (Flat Top Hex Shape)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        // Squashed flat-top hexagon shadow
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx - 15, cy + 12);
        ctx.lineTo(cx + 15, cy + 12);
        ctx.lineTo(cx + 30, cy);
        ctx.lineTo(cx + 15, cy - 12);
        ctx.lineTo(cx - 15, cy - 12);
        ctx.fill();
        ctx.filter = 'none';

        if (styleKey === 'TREE') {
            // --- STYLIZED PINE (Rounder for Flat Top) ---
            // Trunk
            ctx.fillStyle = '#291815'; 
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy); 
            ctx.lineTo(cx + 7, cy);
            ctx.lineTo(cx + 5, cy - 25);
            ctx.lineTo(cx - 5, cy - 25);
            ctx.fill();

            const layers = 3;
            const topY = cy - 95;
            const bottomY = cy - 20;
            
            for (let i = 0; i < layers; i++) {
                const ratio = i / layers;
                const layerY = topY + (bottomY - topY) * ratio;
                const spread = 24 + i * 14; 
                
                const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
                grad.addColorStop(0, style.highlight); 
                grad.addColorStop(0.4, style.main); 
                grad.addColorStop(1, style.dark); 
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx, layerY - 18); // Tip
                ctx.quadraticCurveTo(cx - spread * 0.5, layerY + 5, cx - spread, layerY + 15);
                ctx.quadraticCurveTo(cx, layerY + 10, cx + spread, layerY + 15);
                ctx.quadraticCurveTo(cx + spread * 0.5, layerY + 5, cx, layerY - 18);
                ctx.fill();
                
                ctx.strokeStyle = style.light;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, layerY - 18);
                ctx.lineTo(cx - spread, layerY + 15);
                ctx.stroke();
            }

        } else if (styleKey === 'ICE_CRYSTAL') {
            // --- SHARP CRYSTAL CLUSTER ---
            // Adjusted spread for flat top base
            const drawCrystal = (x: number, y: number, w: number, h: number, angle: number, color: string) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Left Face
                ctx.fillStyle = style.dark;
                ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-w, 0); ctx.lineTo(0, 5); ctx.fill();
                
                // Right Face
                const grad = ctx.createLinearGradient(0, -h, 0, 5);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, style.light);
                grad.addColorStop(1, style.main);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, 5); ctx.fill();
                
                ctx.strokeStyle = style.highlight;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            };

            drawCrystal(cx - 18, cy - 5, 12, 45, -0.3, '#fff');
            drawCrystal(cx + 15, cy, 14, 40, 0.3, '#fff');
            drawCrystal(cx, cy + 5, 18, 70, 0, '#fff'); 

        } else if (styleKey === 'OBSIDIAN_PILLAR') {
            // --- MONOLITH (Flat Top Hex Prism) ---
            const topY = cy - 85;
            const w = 22; // Half Width
            const d = 12; // Depth skew
            
            // 3 Faces Visible from Front
            
            // 1. Left (Dark)
            ctx.fillStyle = style.dark;
            ctx.beginPath();
            ctx.moveTo(cx - w, topY + d);
            ctx.lineTo(cx - w/2, topY + d*2);
            ctx.lineTo(cx - w/2, cy + d*2);
            ctx.lineTo(cx - w, cy + d);
            ctx.fill();

            // 2. Center (Main)
            ctx.fillStyle = style.main;
            ctx.beginPath();
            ctx.moveTo(cx - w/2, topY + d*2);
            ctx.lineTo(cx + w/2, topY + d*2);
            ctx.lineTo(cx + w/2, cy + d*2);
            ctx.lineTo(cx - w/2, cy + d*2);
            ctx.fill();

            // 3. Right (Lit)
            ctx.fillStyle = style.light;
            ctx.beginPath();
            ctx.moveTo(cx + w/2, topY + d*2);
            ctx.lineTo(cx + w, topY + d);
            ctx.lineTo(cx + w, cy + d);
            ctx.lineTo(cx + w/2, cy + d*2);
            ctx.fill();

            // Top Cap
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(cx - w, topY + d);
            ctx.lineTo(cx - w/2, topY + d*2);
            ctx.lineTo(cx + w/2, topY + d*2);
            ctx.lineTo(cx + w, topY + d);
            ctx.lineTo(cx + w/2, topY);
            ctx.lineTo(cx - w/2, topY);
            ctx.fill();
            
            // Emissive Veins
            ctx.strokeStyle = style.detail;
            ctx.shadowColor = style.highlight;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 60);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else {
            // --- WALL / STONE BLOCK (3-Face Perspective) ---
            const w = 40; // Total width
            const h = 55; 
            const topY = cy - h;
            const skew = 10;
            
            // Coordinates for 3 vertical columns (Left, Center, Right faces)
            const xL = cx - w/2 - 10;
            const xLM = cx - 15;
            const xRM = cx + 15;
            const xR = cx + w/2 + 10;
            
            const yBack = topY;
            const yFront = topY + skew;
            const yBaseBack = cy;
            const yBaseFront = cy + skew;

            // 1. Left Face (Angled)
            ctx.fillStyle = style.dark;
            ctx.beginPath();
            ctx.moveTo(xL, yBack);
            ctx.lineTo(xLM, yFront);
            ctx.lineTo(xLM, yBaseFront);
            ctx.lineTo(xL, yBaseBack);
            ctx.fill();
            
            // 2. Center Face (Flat)
            ctx.fillStyle = style.main;
            ctx.beginPath();
            ctx.moveTo(xLM, yFront);
            ctx.lineTo(xRM, yFront);
            ctx.lineTo(xRM, yBaseFront);
            ctx.lineTo(xLM, yBaseFront);
            ctx.fill();
            
            // 3. Right Face (Angled)
            ctx.fillStyle = style.light; // Simulate light from right
            ctx.beginPath();
            ctx.moveTo(xRM, yFront);
            ctx.lineTo(xR, yBack);
            ctx.lineTo(xR, yBaseBack);
            ctx.lineTo(xRM, yBaseFront);
            ctx.fill();
            
            // 4. Top Face
            ctx.fillStyle = style.light;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(xL, yBack);
            ctx.lineTo(xLM, yFront);
            ctx.lineTo(xRM, yFront);
            ctx.lineTo(xR, yBack);
            ctx.lineTo(xRM, yBack - skew);
            ctx.lineTo(xLM, yBack - skew);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            
            // 5. Edges
            ctx.strokeStyle = style.highlight;
            ctx.lineWidth = 1;
            ctx.lineJoin = 'round';
            
            // Vertical Spines
            ctx.beginPath(); ctx.moveTo(xLM, yFront); ctx.lineTo(xLM, yBaseFront); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(xRM, yFront); ctx.lineTo(xRM, yBaseFront); ctx.stroke();
            
            // Top Outline
            ctx.beginPath(); 
            ctx.moveTo(xL, yBack); ctx.lineTo(xLM, yFront); ctx.lineTo(xRM, yFront); ctx.lineTo(xR, yBack);
            ctx.stroke();
            
            // Rivets
            ctx.fillStyle = style.dark;
            ctx.beginPath(); ctx.arc(cx, yFront + 15, 3, 0, Math.PI*2); ctx.fill();
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
