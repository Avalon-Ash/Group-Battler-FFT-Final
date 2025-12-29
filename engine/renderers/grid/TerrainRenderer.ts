
import { ISO_SCALE_Y, BASE_HEIGHT } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";

const WALL_SLOP_EPSILON = 1.0; 

export const TerrainRenderer = {
    
    drawBlock(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number,
        layout: HexLayout
    ) {
        // visualTopY = Vertical displacement (negative)
        const visualTopY = -height;
        
        const vertices = HexGeometry.getVertices(size, true, layout); 

        ctx.save();
        ctx.translate(x, y);

        // --- WALL RENDERING (GEOMETRY AWARE) ---
        if (layout === 'FLAT') {
            // Flat Top Hexagon (0 deg start)
            // Visible faces from standard isometric angle: 
            // Bottom-Right (1-0), Bottom (2-1), Bottom-Left (3-2)
            // Indices: 0=Right, 1=BotRight, 2=BotLeft, 3=Left...
            
            // Draw order: Side to Front to Side (Back-to-Front painter's algo is handled by GridRenderStrategy sorting tiles)
            // Within a single tile, we just draw the visible faces.
            
            // South-East Face (1 -> 0)
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY, theme.sideDark);
            
            // South Face (2 -> 1)
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY, theme.sideLight);
            
            // South-West Face (3 -> 2)
            this.drawVerticalWall(ctx, vertices[3], vertices[2], visualTopY, theme.sideDark);

        } else {
            // Pointy Top Hexagon (30 deg start)
            // Visible faces: Bottom-Right (1-0), Bottom-Left (2-1)
            // Indices: 0=BotRight, 1=BotTip, 2=BotLeft, 3=TopLeft...
            
            // Right-Front Face (1 -> 0)
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY, theme.sideDark);
            
            // Left-Front Face (2 -> 1)
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY, theme.sideLight);
            
            // Front Corner Highlight (The "V" tip)
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(vertices[1].x, vertices[1].y);
            ctx.lineTo(vertices[1].x, vertices[1].y + visualTopY);
            ctx.stroke();
        }

        // --- TOP FACE RENDERING ---
        ctx.translate(0, visualTopY);
        
        const topGrad = ctx.createLinearGradient(-size, -size, size, size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.5, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 

        ctx.fillStyle = topGrad;
        
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.stroke();

        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        }

        ctx.restore();
    },

    /**
     * Draws a vertical wall segment connecting a bottom edge to the top face.
     */
    drawVerticalWall(ctx: CanvasRenderingContext2D, vBottom1: {x:number, y:number}, vBottom2: {x:number, y:number}, topY: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Start at bottom edge
        ctx.moveTo(vBottom1.x, vBottom1.y);
        ctx.lineTo(vBottom2.x, vBottom2.y);
        
        // Go UP to top edge
        ctx.lineTo(vBottom2.x, vBottom2.y + topY);
        ctx.lineTo(vBottom1.x, vBottom1.y + topY);
        
        // Base extension (The "Pedestal" depth below z=0)
        // We actually draw *down* from the "Base Y" (which is y) into the "Base Height"
        // But the arguments passed are (x, y) = Logic Ground.
        // topY is negative. 
        // We need to fill the BASE_HEIGHT area below the logical ground to prevent gaps.
        ctx.lineTo(vBottom1.x, vBottom1.y + BASE_HEIGHT + WALL_SLOP_EPSILON);
        ctx.lineTo(vBottom2.x, vBottom2.y + BASE_HEIGHT + WALL_SLOP_EPSILON);
        ctx.lineTo(vBottom2.x, vBottom2.y); // Close loop back to start
        
        ctx.closePath();
        ctx.fill();
        
        // Edge Definition
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(vBottom1.x, vBottom1.y + topY); // Top corner
        ctx.lineTo(vBottom1.x, vBottom1.y + BASE_HEIGHT); // Bottom corner
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        baseX: number, baseY: number, 
        height: number,
        type: string, 
        detailColor: string,
        q: number, r: number
    ) {
        const visualY = baseY - height;
        if (type === 'FOREST' || type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};
