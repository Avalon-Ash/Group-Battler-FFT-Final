
import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";
import { createUnitGradientCache } from "./UnitGradientCache";

// [PERF5] 單位漸層快取：繪製時以 translate/rotate/scale 對映到實際端點，
// 像素結果與每幀 createLinearGradient/createRadialGradient 相同，但零配置。
const imperialTrailGradients = createUnitGradientCache((ctx, color) => {
    const g = ctx.createLinearGradient(0, 0, 1, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.2, color);
    g.addColorStop(1, 'transparent');
    return g;
});
const covenantFlareGradients = createUnitGradientCache((ctx, color) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, color);
    g.addColorStop(1, 'transparent');
    return g;
});
const imperialFlareGradients = createUnitGradientCache((ctx, color) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, color);
    g.addColorStop(1, 'transparent');
    return g;
});

/**
 * 飛行物視覺呈現器 v16.0 - Faction Distinct Styles
 */
export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        const { pVisX: x, pVisY: y, pColor: color, pAngle: angle, pTrail: trail } = op;

        // Detect Style based on Color (Heuristic)
        // Blue/Cyan/White = Imperial (Tech/Energy)
        // Red/Orange/Purple = Covenant (Chaos/Blood)
        const isCovenant = color.includes('#ef') || color.includes('#dc') || color.includes('#b9') || color.includes('#7f') || color.includes('#ea') || color.includes('#58');

        // 1. 渲染能量尾跡 (Faction Specific Trails)
        if (trail && trail.length > 1) {
            ctx.save();
            
            if (isCovenant) {
                // --- COVENANT TRAIL (Smoky, Tapered, Heavy) ---
                ctx.globalCompositeOperation = 'source-over'; // Opaque/Darker feel
                const len = trail.length;
                
                // Draw multiple segments with varying width for "smoke" effect
                for (let i = 0; i < len - 1; i++) {
                    const p1 = trail[i];
                    const p2 = trail[i+1];
                    const progress = i / len; // 0.0 (Head) -> 1.0 (Tail)
                    
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Tapering Width: Thick at head, very thin at tail
                    const width = (op.pIsUlt ? 16 : 8) * (1 - progress) * op.pScale;
                    
                    ctx.lineWidth = width;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = (1 - progress) * 0.6; // Fade out
                    ctx.stroke();
                }
                
                // Inner Core (Hot)
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 0; i < len; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }
                ctx.strokeStyle = '#fca5a5'; // Pale Red Core
                ctx.lineWidth = (op.pIsUlt ? 4 : 2) * op.pScale;
                ctx.globalAlpha = 0.4;
                ctx.stroke();

            } else {
                // --- IMPERIAL TRAIL (Clean, Electric, Additive) ---
                ctx.globalCompositeOperation = 'screen';
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 0; i < trail.length; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }

                const endX = trail[trail.length-1].x;
                const endY = trail[trail.length-1].y;

                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(endX) && Number.isFinite(endY)) {
                    const gdx = endX - x;
                    const gdy = endY - y;
                    const gLen = Math.sqrt(gdx * gdx + gdy * gdy);
                    // 起訖點重合時 createLinearGradient 依規範不繪製任何東西，因此直接略過
                    if (gLen > 0) {
                        // [PERF5] 路徑已在原座標系建立；此處只換 CTM 讓單位漸層 (0,0)→(1,0) 對映到 (x,y)→(endX,endY)。
                        // 等比縮放 gLen，因此 lineWidth 除以 gLen 以維持原寬度與 miter 外形。
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(Math.atan2(gdy, gdx));
                        ctx.scale(gLen, gLen);
                        ctx.strokeStyle = imperialTrailGradients.get(ctx, color);
                        // Constant Width "Laser" look
                        ctx.lineWidth = (op.pIsUlt ? 10 : 5) * op.pScale / gLen;
                        ctx.lineCap = 'butt'; // Sharp ends
                        ctx.lineJoin = 'miter';
                        ctx.globalAlpha = 0.8;
                        ctx.stroke();
                        ctx.restore();
                    }
                    ctx.lineCap = 'butt';
                    ctx.lineJoin = 'miter';
                }

                // Core bright line (The "Filament")
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = (op.pIsUlt ? 3 : 1.5) * op.pScale;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
            }

            ctx.restore();
        }

        // 2. 主體精靈渲染
        ctx.save();
        ctx.translate(x, y);
        
        // Stretch: Imperial projects are physically longer natively.
        // Dynamic Stretch: Map physical speed to motion blur length.
        const baseStretch = isCovenant ? 1.05 : 1.3; 
        const velocityStretch = 1.0 + Math.max(0, (op.pSpeed - 800) / 2500); 
        const stretch = baseStretch * velocityStretch;
        
        // Squish resistance to prevent the projectile from becoming a 0-width line at extreme speeds
        const squishResist = Math.max(0.4, 1.0 / stretch);
        
        if (op.pSpin !== 0) {
            ctx.rotate(op.pSpin);
        } else {
            ctx.rotate(angle);
            ctx.scale(stretch, squishResist); 
        }

        const img = AssetManager.getProjectile(op.pSkillVis, color);
        const baseScale = op.pScale;
        const finalScale = (op.pIsUlt ? 1.5 : 1.0) * baseScale;

        if (img) {
            // Glow pass
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = isCovenant ? 0.8 : 1.0; // Imperial is brighter
            const bloomScale = isCovenant ? 1.2 : 1.5; // Imperial blooms more
            ctx.drawImage(img, -36 * finalScale * bloomScale, -36 * finalScale * bloomScale, 72 * finalScale * bloomScale, 72 * finalScale * bloomScale);
            
            // Core pass
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            ctx.drawImage(img, -32 * finalScale, -32 * finalScale, 64 * finalScale, 64 * finalScale);
        } else {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0,0, 10 * finalScale, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore();

        // 3. 頭部光暈 (Head Flare)
        ctx.save();
        ctx.translate(x, y);
        ctx.globalCompositeOperation = 'lighter';
        
        const flareR = (isCovenant ? 20 : 30) * op.pScale;

        // [PERF5] 單位徑向漸層（半徑 1），以 scale(flareR) 對映；Red Core / Blue-White Star
        if (flareR > 0) {
            ctx.scale(flareR, flareR);
            ctx.fillStyle = isCovenant ? covenantFlareGradients.get(ctx, color) : imperialFlareGradients.get(ctx, color);
            ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(0,0, 1, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
};
