
import { OBSTACLE_STYLES } from "../../constants";
import { createCanvas } from "./CanvasUtils";

export const EnvironmentFactory = {
    
    generateObstacle(styleKey: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(64, 96);
        const cx = 32;
        const cy = 80;
        
        // Default Fallback
        const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

        ctx.fillStyle = style.main;
        ctx.strokeStyle = style.light;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        if (styleKey === 'TREE') {
            // --- ANCIENT TREE ---
            // Trunk
            ctx.fillStyle = style.dark;
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy); 
            ctx.lineTo(cx + 8, cy); 
            ctx.lineTo(cx + 6, cy - 40); 
            ctx.lineTo(cx - 6, cy - 40); 
            ctx.fill();

            // Foliage Layers
            ctx.fillStyle = style.detail; 
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5;
            
            const leaves = (y: number, r: number) => {
                ctx.beginPath(); 
                ctx.arc(cx, y, r, 0, Math.PI * 2); 
                ctx.fill(); 
                ctx.stroke();
            };
            leaves(cy - 40, 20);
            leaves(cy - 60, 16);
            leaves(cy - 75, 12);

        } else if (styleKey === 'ICE_CRYSTAL') {
            // --- ICE SPIKES ---
            ctx.fillStyle = style.main;
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = style.light; ctx.shadowBlur = 10;
            
            const shard = (x: number, h: number, w: number, ang: number) => {
                ctx.save();
                ctx.translate(x, cy);
                ctx.rotate(ang);
                ctx.beginPath();
                ctx.moveTo(-w, 0);
                ctx.lineTo(0, -h);
                ctx.lineTo(w, 0);
                ctx.fill(); ctx.stroke();
                
                // Highlight
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -h); ctx.stroke();
                ctx.restore();
            };

            shard(cx, 60, 15, 0);
            shard(cx - 10, 40, 10, -0.2);
            shard(cx + 12, 45, 12, 0.3);

        } else if (styleKey === 'OBSIDIAN_PILLAR') {
            // --- MAGMA ROCK ---
            ctx.fillStyle = style.main;
            
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy);
            ctx.lineTo(cx - 10, cy - 70);
            ctx.lineTo(cx + 15, cy - 80);
            ctx.lineTo(cx + 20, cy);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            
            // Cracks
            ctx.strokeStyle = style.detail; // Magma Red
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 5, cy - 30); ctx.lineTo(cx - 5, cy - 50);
            ctx.stroke();

        } else if (styleKey === 'SANDSTONE') {
            // --- ERODED ROCK ---
            ctx.fillStyle = style.main;
            
            ctx.beginPath();
            ctx.ellipse(cx, cy - 20, 20, 30, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            
            // Layers
            ctx.strokeStyle = style.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy - 10); ctx.quadraticCurveTo(cx, cy - 5, cx + 18, cy - 10);
            ctx.moveTo(cx - 18, cy - 30); ctx.quadraticCurveTo(cx, cy - 25, cx + 18, cy - 30);
            ctx.stroke();

        } else {
            // --- WALL (Default) ---
            // Main Boulder
            ctx.fillStyle = style.dark;
            ctx.beginPath(); 
            ctx.moveTo(cx, cy - 80); 
            ctx.lineTo(cx + 24, cy - 70); 
            ctx.lineTo(cx, cy - 60); 
            ctx.lineTo(cx - 24, cy - 70); 
            ctx.closePath(); 
            ctx.fill(); ctx.stroke();
            
            // Side Facets
            ctx.fillStyle = style.main; 
            ctx.beginPath(); 
            ctx.moveTo(cx - 24, cy - 70); 
            ctx.lineTo(cx, cy - 60); 
            ctx.lineTo(cx, cy); 
            ctx.lineTo(cx - 24, cy - 10); 
            ctx.closePath(); 
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = style.light; 
            ctx.beginPath(); 
            ctx.moveTo(cx, cy - 60); 
            ctx.lineTo(cx + 24, cy - 70); 
            ctx.lineTo(cx + 24, cy - 10); 
            ctx.lineTo(cx, cy); 
            ctx.closePath(); 
            ctx.fill(); ctx.stroke();
            
            // Moss Detail
            if (style.detail) {
                ctx.fillStyle = style.detail; 
                ctx.beginPath(); 
                ctx.arc(cx, cy - 5, 10, 0, Math.PI, true); 
                ctx.fill();
            }
        }

        return canvas;
    },

    generateIceBlock(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(96, 128);
        const cx = 48, cy = 90;
        
        ctx.fillStyle = 'rgba(224, 242, 254, 0.4)'; // Sky-100 translucent
        ctx.strokeStyle = '#38bdf8'; // Sky-400
        ctx.lineWidth = 2;
        
        // Crystal Shape
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx - 35, cy - 60);
        ctx.lineTo(cx, cy - 100);
        ctx.lineTo(cx + 35, cy - 70);
        ctx.lineTo(cx + 30, cy);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Facets
        ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx - 10, cy - 50); ctx.lineTo(cx - 30, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx + 15, cy - 40); ctx.lineTo(cx + 30, cy); ctx.stroke();
        
        return canvas;
    }
};
