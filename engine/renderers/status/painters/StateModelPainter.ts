
import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { UNIT_BODY_OFFSET } from "../../../../../constants";

const HOVER_LIFT = 6;

export const StateModelPainter = {
    // x, y = Visual Surface Coordinates (Top of Block)
    drawBanishment(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, z: number, t: number) {
        if (!agent.banished) return;

        const isStasis = agent.visualStatus === 'STASIS';
        const color = isStasis ? '#facc15' : '#c084fc'; // Gold or Purple
        const secondaryColor = isStasis ? '#fef08a' : '#e9d5ff';
        
        // Calculate Body Center
        const centerY = y - z - UNIT_BODY_OFFSET - HOVER_LIFT;
        
        ctx.save();
        ctx.translate(x, centerY);
        
        // --- CRYSTAL CAGE VISUAL ---
        // A rotating Octahedron (Diamond shape)
        // Vertices: Top, Bottom, and 4 equator points
        
        const size = 50; 
        const height = 70;
        const rotation = t * 0.8;
        
        // Calculate projected vertices
        const topY = -height;
        const botY = height;
        
        const points = [];
        for(let i=0; i<4; i++) {
            const angle = rotation + (i * Math.PI / 2);
            points.push({
                x: Math.cos(angle) * size,
                y: Math.sin(angle) * size * 0.3 // Flatten Y for perspective
            });
        }

        // Draw Order: Back faces -> (Unit is theoretically here) -> Front faces
        // Since we are overlaying, we draw semi-transparent front faces.
        
        // 1. Back Faces (Darker, Inside)
        ctx.lineWidth = 1;
        points.forEach((p, i) => {
            const nextP = points[(i + 1) % 4];
            // Simple Z-sort: if point is "behind" (y is lower in iso usually implies far, but here we rotate)
            // Let's just draw all back faces with low opacity
            
            // We only really care about the rim for the "Cage" look
        });

        // 2. Front Crystal Faces
        const drawFace = (p1: {x:number, y:number}, p2: {x:number, y:number}, tipY: number, alpha: number) => {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(0, tipY);
            ctx.closePath();
            
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            
            ctx.strokeStyle = secondaryColor;
            ctx.globalAlpha = 0.8;
            ctx.stroke();
        };

        // Bobbing effect
        const bob = Math.sin(t * 2) * 5;
        ctx.translate(0, bob);

        // Draw Upper Pyramid
        for(let i=0; i<4; i++) {
            const p1 = points[i];
            const p2 = points[(i+1)%4];
            
            // Visibility check based on rotation to simulate 3D culling?
            // Or just draw all with additive blending for "energy" look
            drawFace(p1, p2, topY, 0.15);
        }

        // Draw Lower Pyramid
        for(let i=0; i<4; i++) {
            const p1 = points[i];
            const p2 = points[(i+1)%4];
            drawFace(p1, p2, botY, 0.1);
        }
        
        // 3. Central Energy Core
        ctx.globalCompositeOperation = 'screen';
        const pulse = 1.0 + Math.sin(t * 5) * 0.2;
        
        const icon = AssetManager.getStatusIcon(isStasis ? 'STASIS' : 'BANISH');
        if (icon) {
            ctx.save();
            ctx.scale(pulse, pulse);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(icon, -24, -24, 48, 48);
            ctx.restore();
        } else {
            // Fallback glow
            const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0, 0, 30 * pulse, 0, Math.PI*2); ctx.fill();
        }

        // 4. Floating Runes/Particles
        for(let i=0; i<3; i++) {
            const rAngle = -t * 1.5 + (i * Math.PI * 2 / 3);
            const rx = Math.cos(rAngle) * 40;
            const ry = Math.sin(rAngle) * 15;
            
            ctx.fillStyle = secondaryColor;
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
};
