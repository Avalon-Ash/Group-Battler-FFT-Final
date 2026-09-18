
import { OBSTACLE_STYLES, HEX_SIZE, BASE_HEIGHT, BLOCK_HEIGHT, ISO_SCALE_Y, ENV_SPRITE } from "../../constants";
import { createCanvas } from "./CanvasUtils";
import { HexGeometry } from "./utils/HexGeometry";
import { MaterialPainter } from "./materials/MaterialPainter";
import { HexLayout } from "../../types";

export const EnvironmentFactory = {
    
    generateObstacle(styleKey: string, layout: HexLayout): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ENV_SPRITE.CANVAS_W, ENV_SPRITE.CANVAS_H);
        
        // Setup Anchor: (0,0) is the CENTER of the hexagonal SURFACE on the ground
        ctx.translate(ENV_SPRITE.ANCHOR_X, ENV_SPRITE.ANCHOR_Y);
        
        const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

        // 1. Draw Base Shadow (Strict Hexagon Footprint)
        this.drawHexShadow(ctx, layout);

        // 2. Draw Object based on Type (Growing Upwards y < 0)
        if (styleKey === 'TREE') {
            this.drawIsoTree(ctx, style, layout);
        } else if (styleKey === 'ICE_CRYSTAL') {
            this.drawIsoCrystal(ctx, style, layout);
        } else if (styleKey === 'OBSIDIAN_PILLAR') {
            this.drawIsoPillar(ctx, style, layout);
        } else if (styleKey === 'SANDSTONE') {
            // New Organic Rock Cluster for Desert
            this.drawIsoRockCluster(ctx, style, layout);
        } else {
            this.drawIsoWall(ctx, style, layout); // Default Wall
        }

        // 風化層：烘焙期一次性套用，執行期零成本
        MaterialPainter.weatherSprite(canvas);

        return canvas;
    },

    generateIceBlock(layout: HexLayout): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(ENV_SPRITE.CANVAS_W, ENV_SPRITE.CANVAS_H);
        ctx.translate(ENV_SPRITE.ANCHOR_X, ENV_SPRITE.ANCHOR_Y);
        const style = OBSTACLE_STYLES['ICE_CRYSTAL'];
        this.drawIsoCrystal(ctx, style, layout, 0.7);
        MaterialPainter.weatherSprite(canvas);
        return canvas;
    },

    // =========================================================================================
    // 🏗️ GEOMETRY BUILDERS (Layout Aware)
    // =========================================================================================

    drawHexShadow(ctx: CanvasRenderingContext2D, layout: HexLayout) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.filter = 'blur(4px)';
        const r = HEX_SIZE * ENV_SPRITE.HEX_RADIUS_FULL;
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.fill();
        ctx.restore();
    },

    drawIsoWall(ctx: CanvasRenderingContext2D, style: any, layout: HexLayout) {
        // Dynamic Height: Multiplier increased to 3.0 to keep walls feeling tall with small blocks
        const height = BLOCK_HEIGHT * ENV_SPRITE.WALL_HEIGHT_MULT; 
        const r = HEX_SIZE * ENV_SPRITE.HEX_RADIUS_FULL; 
        const topY = -height;
        
        const verts = HexGeometry.getVertices(r, true, layout);
        
        // --- WALL FACES ---
        if (layout === 'FLAT') {
            // Left Face (v3 -> v2)
            this.drawQuad(ctx, verts[3], verts[2], topY, style.dark);
            this.drawEdge(ctx, verts[3], verts[2], topY, style.highlight);

            // Front Face (v2 -> v1)
            this.drawQuad(ctx, verts[2], verts[1], topY, style.main);
            
            // Right Face (v1 -> v0)
            this.drawQuad(ctx, verts[1], verts[0], topY, style.light);
            this.drawEdge(ctx, verts[1], verts[0], topY, style.highlight);

        } else {
            // Left Face (v2 -> v1)
            this.drawQuad(ctx, verts[2], verts[1], topY, style.sideDark || style.dark); 
            this.drawEdge(ctx, verts[2], verts[1], topY, style.highlight);

            // Right Face (v1 -> v0)
            this.drawQuad(ctx, verts[1], verts[0], topY, style.sideLight || style.main);
            this.drawEdge(ctx, verts[1], verts[0], topY, style.highlight);
            
            // Center Seam Highlight
            ctx.beginPath();
            ctx.moveTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[1].x, verts[1].y + topY);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.stroke();
        }

        // --- TOP CAP ---
        ctx.save();
        ctx.translate(0, topY);
        
        ctx.fillStyle = style.light;
        ctx.globalAlpha = 0.9;
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.fill();
        
        // Inner Detail
        ctx.fillStyle = style.detail;
        ctx.beginPath(); ctx.arc(0, 0, r*0.4, 0, Math.PI*2); ctx.fill();
        
        // Rim
        ctx.strokeStyle = style.highlight;
        ctx.lineWidth = 1;
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.stroke();
        
        ctx.restore();
    },

    // New: Organic Rock Cluster
    drawIsoRockCluster(ctx: CanvasRenderingContext2D, style: any, layout: HexLayout) {
        
        const drawRock = (x: number, y: number, r: number, h: number, seed: number) => {
            ctx.save();
            ctx.translate(x, y);
            
            // Generate jagged polygon
            const points = [];
            const segments = 7;
            for(let i=0; i<segments; i++) {
                const angle = (i / segments) * Math.PI * 2 + seed;
                const dist = r * (0.8 + Math.sin(angle * 3 + seed) * 0.2);
                points.push({
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist * ISO_SCALE_Y
                });
            }

            // Draw Side Faces (Simulated by drawing simplified quads down)
            const topY = -h;
            ctx.fillStyle = style.dark;
            ctx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill(); // Base

            // Extrude sides
            points.forEach((p, i) => {
                const next = points[(i + 1) % segments];
                // Simple lighting based on angle
                const midAngle = (i / segments) * Math.PI * 2;
                const isLit = midAngle > Math.PI && midAngle < Math.PI * 2; // Right/Bottom lit? No, usually Top/Left lit.
                
                // Let's use a simpler heuristic: Front faces are lit, Back are dark
                // But here we draw all because of Painter's algo order issues inside the shape.
                // Actually, just drawing a solid block with a top cap is easier.
                
                ctx.fillStyle = isLit ? style.main : style.dark;
                if (p.y > 0 || next.y > 0) { // Only draw front-ish faces
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(next.x, next.y);
                    ctx.lineTo(next.x, next.y + topY);
                    ctx.lineTo(p.x, p.y + topY);
                    ctx.fill();
                }
            });

            // Draw Top Cap (Irregular)
            ctx.translate(0, topY);
            ctx.fillStyle = style.light;
            ctx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            
            // Highlight Edge
            ctx.strokeStyle = style.highlight;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Detail cracks
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(r*0.5, r*0.2);
            ctx.strokeStyle = style.dark;
            ctx.stroke();

            ctx.restore();
        };

        // Draw 3 Rocks clustered
        // Big one
        drawRock(5, 5, 22, 25, 0.5);
        // Medium
        drawRock(-15, 0, 16, 18, 2.1);
        // Small
        drawRock(10, 15, 12, 12, 4.3);
    },

    drawIsoPillar(ctx: CanvasRenderingContext2D, style: any, layout: HexLayout) {
        // Dynamic Height: Increased to 4.5 to be imposing
        const height = BLOCK_HEIGHT * ENV_SPRITE.PILLAR_HEIGHT_MULT;
        const r = HEX_SIZE * ENV_SPRITE.HEX_RADIUS_PILLAR; // Thinner than tile
        const topY = -height;
        
        const verts = HexGeometry.getVertices(r, true, layout);

        if (layout === 'FLAT') {
            this.drawQuad(ctx, verts[3], verts[2], topY, style.dark);  // Left
            this.drawQuad(ctx, verts[2], verts[1], topY, style.main);  // Front
            this.drawQuad(ctx, verts[1], verts[0], topY, style.light); // Right
        } else {
            // Pointy Pillar (Diamond facing front)
            this.drawQuad(ctx, verts[2], verts[1], topY, style.dark); // Left Face
            this.drawQuad(ctx, verts[1], verts[0], topY, style.main); // Right Face
        }

        // Rune / Sigil
        ctx.save();
        ctx.translate(0, topY / 2); // Center of pillar height
        ctx.strokeStyle = style.detail;
        ctx.lineWidth = 2;
        ctx.shadowColor = style.detail;
        ctx.shadowBlur = 5;
        
        if (layout === 'FLAT') {
            ctx.beginPath();
            ctx.moveTo(0, -15); ctx.lineTo(0, 15);
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(0, 20);
            ctx.moveTo(0, -10); ctx.lineTo(verts[0].x * 0.3, -5); 
            ctx.stroke();
        }
        ctx.restore();

        // Top Cap
        ctx.save();
        ctx.translate(0, topY);
        ctx.fillStyle = '#000';
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.fill();
        ctx.restore();
    },

    drawIsoTree(ctx: CanvasRenderingContext2D, style: any, layout: HexLayout) {
        const trunkW = 14;
        const trunkH = BLOCK_HEIGHT * 1.0;
        
        ctx.fillStyle = '#3f2e1e';
        ctx.beginPath();
        // Simple trunk
        ctx.fillRect(-trunkW/2, -trunkH, trunkW, trunkH + 5); 
        
        const layers = 3;
        const baseWidth = layout === 'FLAT' ? HEX_SIZE : HEX_SIZE * 0.9;
        // Layers scale boosted to 2.0 to avoid stubby trees
        const layerHeight = BLOCK_HEIGHT * ENV_SPRITE.TREE_LAYER_HEIGHT_MULT; 
        let currentY = -trunkH + 5;
        
        for (let i = 0; i < layers; i++) {
            const ratio = 1 - (i / layers);
            const width = baseWidth * (ENV_SPRITE.TREE_BASE_RATIO + ratio * ENV_SPRITE.TREE_RATIO_RANGE);
            const height = layerHeight;
            
            ctx.beginPath();
            ctx.moveTo(0, currentY - height); // Top tip
            
            if (layout === 'FLAT') {
                // Wide Triangle
                ctx.lineTo(width/2, currentY);
                ctx.quadraticCurveTo(0, currentY + 8, -width/2, currentY);
            } else {
                // Sharper Triangle
                ctx.lineTo(width/2, currentY);
                ctx.lineTo(0, currentY + 5); // Pointy dip
                ctx.lineTo(-width/2, currentY);
            }
            
            ctx.closePath();
            
            if (Number.isFinite(currentY) && Number.isFinite(height)) {
                const grad = ctx.createLinearGradient(0, currentY - height, 0, currentY);
                grad.addColorStop(0, style.highlight);
                grad.addColorStop(0.5, style.main);
                grad.addColorStop(1, style.dark);
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = style.main;
            }
            ctx.fill();
            
            ctx.strokeStyle = style.dark;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            currentY -= (height * ENV_SPRITE.TREE_LAYER_OVERLAP); // Overlap
        }
    },

    drawIsoCrystal(ctx: CanvasRenderingContext2D, style: any, layout: HexLayout, alpha: number = 1.0) {
        // Boosted base height for crystals
        const baseH = BLOCK_HEIGHT * ENV_SPRITE.CRYSTAL_HEIGHT_MULT;
        
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

        if (layout === 'FLAT') {
            drawShard(-10, 5, 10, baseH * 0.8, -0.2);
            drawShard(10, 2, 12, baseH * 0.6, 0.2);
            drawShard(0, 8, 18, baseH * 1.1, 0); 
        } else {
            drawShard(0, 5, 15, baseH * 1.0, 0); 
            drawShard(-8, 0, 8, baseH * 0.6, -0.15);
            drawShard(8, 0, 8, baseH * 0.6, 0.15);
        }
    },

    // --- Helpers ---
    drawQuad(ctx: CanvasRenderingContext2D, vBottom: {x:number, y:number}, vNextBottom: {x:number, y:number}, topY: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(vBottom.x, vBottom.y);
        ctx.lineTo(vNextBottom.x, vNextBottom.y);
        ctx.lineTo(vNextBottom.x, vNextBottom.y + topY);
        ctx.lineTo(vBottom.x, vBottom.y + topY);
        ctx.closePath();
        ctx.fill();
    },

    drawEdge(ctx: CanvasRenderingContext2D, vBottom: {x:number, y:number}, vNextBottom: {x:number, y:number}, topY: number, color: string) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; // Subtle edge
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vBottom.x, vBottom.y);
        ctx.lineTo(vBottom.x, vBottom.y + topY);
        ctx.stroke();
    }
};
