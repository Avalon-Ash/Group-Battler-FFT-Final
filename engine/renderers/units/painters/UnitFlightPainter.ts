
import { Agent } from "../../../game";
import { Team, MovementType } from "../../../../types";
import { UNIT_SCALE, VISUAL_ANCHORS } from "../../../../constants";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { VisualMath } from "../../../math/VisualMath";

export const UnitFlightPainter = {
    
    drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
        // Deprecated
    },

    drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        // This is called within the UnitBodyPainter's transformed context (Body Center)
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor;

        ctx.save();
        ctx.translate(0, VISUAL_ANCHORS.ENGINE_OFFSET_Y); // Use Standard Constant
        
        // Engine Glows (Oscillating)
        const pulse = 0.8 + Math.sin(t * 20) * 0.2;
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // Left Engine
        ctx.beginPath(); ctx.arc(-12, 0, 4 * pulse, 0, Math.PI*2); ctx.fill();
        // Right Engine
        ctx.beginPath(); ctx.arc(12, 0, 4 * pulse, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    },

    /**
     * 通用軌跡繪製：支持飛行緞帶 (Ribbon) 與地面滑痕 (Skid Marks)
     * SSOT: Now uses stored 'h' in trail history to accurately project past positions.
     */
    drawRibbonTrail(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        if (agent.trailHistory.length < 2) return;

        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor;
        const isFlying = agent.movementType === MovementType.FLYING;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // We need to transform from "Unit Body Center" local space back to "Screen Space" relative to current pos
        
        const currentPx = agent.px + agent.physics.x;
        
        // HACK/FIX: We must assume the last point in trailHistory is close to current, or use 0 delta if unknown.
        // Better: We can just draw the trail relative to the *World* position and assume H doesn't change wildly between frames?
        // No, that causes jitter.
        
        // Let's calculate purely relative to the *current* frame of reference.
        // We need to pass `terrainHeight` to `UnitBodyPainter` and then to here.
        // Since we cannot change method signatures easily across too many files in one shot,
        // we will infer `currentH` from the last trail point if available, or 0.
        // This is a safe approximation for trails.
        
        const currentWorldY = agent.py + agent.physics.y;
        const currentH = agent.trailHistory.length > 0 ? agent.trailHistory[agent.trailHistory.length-1].h : 0;
        const currVy = VisualMath.getVisualBodyCenterY(currentWorldY - currentH, agent.physics.z);
        
        const points: {x: number, y: number}[] = [];
        
        for (const p of agent.trailHistory) {
            // SSOT Projection for Trail Point
            // SurfaceY = p.y - p.h
            const pVy = VisualMath.getVisualBodyCenterY(p.y - p.h, p.z);
            points.push({ x: p.x, y: pVy });
        }
        points.push({ x: currentPx, y: currVy });

        if (points.length < 2) { ctx.restore(); return; }

        ctx.beginPath();
        
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const dx = p.x - currentPx;
            const dy = p.y - currVy;
            
            // Add engine offset visual adjust
            const engOffset = VISUAL_ANCHORS.ENGINE_OFFSET_Y;
            
            if (i === 0) ctx.moveTo(dx, dy + engOffset);
            else ctx.lineTo(dx, dy + engOffset);
        }
        
        if (isFlying) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4 * UNIT_SCALE;
            ctx.globalAlpha = 0.4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 * UNIT_SCALE;
            ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 0;
            ctx.stroke();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3 * UNIT_SCALE;
            ctx.globalAlpha = 0.3; 
            ctx.globalCompositeOperation = 'screen';
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]); 
            ctx.globalAlpha = 0.5;
            ctx.stroke();
        }

        ctx.restore();
    }
};
