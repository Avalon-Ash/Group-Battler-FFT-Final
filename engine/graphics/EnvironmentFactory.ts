
import { OBSTACLE_STYLES, HEX_SIZE } from "../../constants";
import { createCanvas } from "./CanvasUtils";
import { HexGeometry } from "./utils/HexGeometry";

// --- STRICT ALIGNMENT CONSTANTS ---
export const ENV_CANVAS_W = 128;
export const ENV_CANVAS_H = 160;
export const ENV_ANCHOR_X = 64;  
export const ENV_ANCHOR_Y = 140; 

export const EnvironmentFactory = {
    
    generateObstacle(styleKey: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ENV_CANVAS_W, ENV_CANVAS_H);
        
        // Setup Anchor: (0,0) is now the CENTER of the hexagonal SURFACE on the ground
        ctx.translate(ENV_ANCHOR_X, ENV_ANCHOR_Y);
        
        const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

        // 1. Draw Base Shadow (Strict Hexagon Footprint)
        this.drawHexShadow(ctx);

        // 2. Draw Object based on Type (Growing Upwards y < 0)
        if (styleKey === 'TREE') {
            this.drawIsoTree(ctx, style);
        } else if (styleKey === 'ICE_CRYSTAL') {
            this.drawIsoCrystal(ctx, style);
        } else if (styleKey === 'OBSIDIAN_PILLAR') {
            this.drawIsoPillar(ctx, style);
        } else {
            this.drawIsoWall(ctx, style); // Default Wall/Sandstone
        }

        return canvas;
    },

    generateIceBlock(): HTMLCanvasElement {
        // Special case for Frozen Status Model
        const { canvas, ctx } = createCanvas(ENV_CANVAS_W, ENV_CANVAS_H);
        ctx.translate(ENV_ANCHOR_X, ENV_ANCHOR_Y);
        const style = OBSTACLE_STYLES['ICE_CRYSTAL'];
        
        // Draw a translucent block enclosing the unit
        this.drawIsoCrystal(ctx, style, 0.7);
        return canvas;
    },

    // --- GEOMETRY PRIMITIVES ---

    drawHexShadow(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.filter = 'blur(4px)';
        const r = HEX_SIZE * 0.9;
        
        // Use Unified Math (applyIso=true for floor shadow)
        HexGeometry.traceHex(ctx, 0, 0, r, true);
        
        ctx.fill();
        ctx.restore();
    },

    drawIsoWall(ctx: CanvasRenderingContext2D, style: any) {
        const height = 55;
        const r = HEX_SIZE * 0.9; // Slightly smaller than tile
        
        // Vertices (Unified Source of Truth)
        // Note: HexGeometry vertices are relative to (0,0).
        const verts = HexGeometry.getVertices(r, true);
        
        // Indices for Flat Top Hex (0 deg start):
        // 3: Left, 2: Bottom-Left, 1: Bottom-Right, 0: Right
        const v3 = verts[3];
        const v2 = verts[2];
        const v1 = verts[1];
        const v0 = verts[0];

        // Draw Sides (Extrude Up)
        const topY = -height;

        // Left Face (v3 -> v2)
        ctx.fillStyle = style.dark;
        ctx.beginPath();
        ctx.moveTo(v3.x, v3.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.lineTo(v2.x, v2.y + topY);
        ctx.lineTo(v3.x, v3.y + topY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = style.highlight; ctx.lineWidth = 1; ctx.stroke();

        // Front Face (v2 -> v1)
        ctx.fillStyle = style.main;
        ctx.beginPath();
        ctx.moveTo(v2.x, v2.y);
        ctx.lineTo(v1.x, v1.y);
        ctx.lineTo(v1.x, v1.y + topY);
        ctx.lineTo(v2.x, v2.y + topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Face (v1 -> v0)
        ctx.fillStyle = style.light;
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v0.x, v0.y);
        ctx.lineTo(v0.x, v0.y + topY);
        ctx.lineTo(v1.x, v1.y + topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Top Face (Full Hex)
        ctx.save();
        ctx.translate(0, topY);
        ctx.fillStyle = style.light;
        ctx.globalAlpha = 0.9;
        HexGeometry.traceHex(ctx, 0, 0, r, true);
        ctx.fill();
        
        // Inner Detail
        ctx.fillStyle = style.detail;
        ctx.beginPath(); ctx.arc(0, 0, r*0.4, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    },

    drawIsoPillar(ctx: CanvasRenderingContext2D, style: any) {
        const height = 90;
        const r = HEX_SIZE * 0.7; // Thinner than wall
        
        const verts = HexGeometry.getVertices(r, true);
        const v3 = verts[3];
        const v2 = verts[2];
        const v1 = verts[1];
        const v0 = verts[0];
        
        const topY = -height;

        // Left Face
        ctx.fillStyle = style.dark;
        ctx.beginPath();
        ctx.moveTo(v3.x, v3.y); ctx.lineTo(v2.x, v2.y); 
        ctx.lineTo(v2.x, v2.y + topY); ctx.lineTo(v3.x, v3.y + topY);
        ctx.fill();

        // Front Face
        ctx.fillStyle = style.main;
        ctx.beginPath();
        ctx.moveTo(v2.x, v2.y); ctx.lineTo(v1.x, v1.y);
        ctx.lineTo(v1.x, v1.y + topY); ctx.lineTo(v2.x, v2.y + topY);
        ctx.fill();
        
        // Rune on Front
        ctx.strokeStyle = style.detail;
        ctx.lineWidth = 2;
        ctx.shadowColor = style.detail;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(0, -30); ctx.lineTo(0, -60);
        ctx.moveTo(-5, -45); ctx.lineTo(5, -45);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Right Face
        ctx.fillStyle = style.light;
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y); ctx.lineTo(v0.x, v0.y);
        ctx.lineTo(v0.x, v0.y + topY); ctx.lineTo(v1.x, v1.y + topY);
        ctx.fill();

        // Top
        ctx.save();
        ctx.translate(0, topY);
        ctx.fillStyle = '#000';
        HexGeometry.traceHex(ctx, 0, 0, r, true);
        ctx.fill();
        ctx.restore();
    },

    drawIsoTree(ctx: CanvasRenderingContext2D, style: any) {
        // --- Redesigned: Stylized Pine Tree ---
        
        // 1. Trunk
        const trunkW = 14;
        const trunkH = 20;
        
        ctx.fillStyle = '#3f2e1e'; // Darker Wood
        ctx.beginPath();
        ctx.fillRect(-trunkW/2, -trunkH, trunkW, trunkH + 5); 
        
        // 2. Foliage Stack (Cones)
        const layers = 3;
        const baseWidth = 48;
        const layerHeight = 35;
        const overlap = 15;
        let currentY = -trunkH + 5;
        
        for (let i = 0; i < layers; i++) {
            const ratio = 1 - (i / layers);
            const width = baseWidth * (0.6 + ratio * 0.4);
            const height = layerHeight;
            
            // Draw Cone Triangle
            ctx.beginPath();
            ctx.moveTo(0, currentY - height); // Top
            ctx.lineTo(width/2, currentY);    // Right
            // Curved bottom for volume
            ctx.quadraticCurveTo(0, currentY + 10, -width/2, currentY); // Bottom Curve
            ctx.closePath();
            
            // Gradient Fill
            const grad = ctx.createLinearGradient(0, currentY - height, 0, currentY);
            grad.addColorStop(0, style.highlight);
            grad.addColorStop(0.5, style.main);
            grad.addColorStop(1, style.dark);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Outline/Shadow
            ctx.strokeStyle = style.dark;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Move up for next layer
            currentY -= (height - overlap);
        }
    },

    drawIsoCrystal(ctx: CanvasRenderingContext2D, style: any, alpha: number = 1.0) {
        const drawShard = (x: number, y: number, w: number, h: number, tilt: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(tilt);
            
            ctx.fillStyle = style.dark;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-w, -h * 0.2);
            ctx.lineTo(0, -h); 
            ctx.lineTo(w, -h * 0.3);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = style.light;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(w, -h * 0.3);
            ctx.lineTo(0, -h);
            ctx.fill();
            
            ctx.strokeStyle = style.highlight;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(0, -h);
            ctx.stroke();

            ctx.restore();
        };

        drawShard(-10, 5, 10, 50, -0.2);
        drawShard(10, 2, 12, 40, 0.2);
        drawShard(0, 8, 18, 70, 0); 
    }
};
