
import { Agent } from "../../../game";
import { Team } from "../../../../types";
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
     * Called from UnitShadowPainter or a dedicated pass to draw World Space trails.
     * Uses the agent's trailHistory.
     */
    drawRibbonTrail(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        if (agent.trailHistory.length < 2) return;

        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const currentPx = agent.px;
        const currentPy = agent.py; // Ground Y
        
        const points: {x: number, y: number}[] = [];
        
        for (const p of agent.trailHistory) {
            // Reconstruct visual Y using SSOT Math
            const vy = VisualMath.getVisualBodyCenterY(p.y, p.z) + VISUAL_ANCHORS.ENGINE_OFFSET_Y;
            points.push({ x: p.x, y: vy });
        }
        
        // Add current pos
        const currVy = VisualMath.getVisualBodyCenterY(currentPy, agent.physics.z) + VISUAL_ANCHORS.ENGINE_OFFSET_Y;
        points.push({ x: currentPx, y: currVy });

        if (points.length < 2) { ctx.restore(); return; }

        ctx.beginPath();
        
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            // Render relative to current position (assuming ctx is translated to current Visual Y by caller logic, OR calculate absolute if cleaner)
            // Note: UnitShadowPainter calls this but its context is translated to SurfaceY.
            // But we calculated absolute visual Ys in points[].
            // To draw correctly relative to UnitBodyPainter's context, we need deviations.
            // Actually, `UnitShadowPainter` doesn't call this anymore? 
            // If it did, it would be weird. 
            // Assuming this is called via `UnitBodyPainter` which is centered on Body.
            // If centered on Body, current pos is (0, ENGINE_OFFSET).
            // We need to inverse project history points.
            
            const dx = p.x - currentPx;
            const dy = p.y - currVy;
            
            // Draw relative to Engine Offset
            const engineY = VISUAL_ANCHORS.ENGINE_OFFSET_Y;
            
            if (i === 0) ctx.moveTo(dx, engineY + dy);
            else ctx.lineTo(dx, engineY + dy);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * UNIT_SCALE;
        ctx.globalAlpha = 0.4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        // Inner Core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 * UNIT_SCALE;
        ctx.globalAlpha = 0.8;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    }
};
