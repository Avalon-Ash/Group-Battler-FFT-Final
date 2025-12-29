
import { Agent } from "../../../game";
import { HEX_SIZE } from "../../../../constants";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

// 唯一數學常數：詠唱法陣標準抬升量，徹底解決 Z-fighting
const AURA_FLOOR_LIFT = -1.5; 

export const UnitAuraPainter = {
    
    /**
     * 繪製標準技能詠唱特效 (Vector Geometry)
     */
    drawCastingVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT); 

        // 核心數學：法陣半徑隨律動震盪
        const baseSize = HEX_SIZE * 0.95;
        const pulse = Math.sin(t * 12) * 0.05;
        const currentSize = baseSize * (1.0 + pulse);
        
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        
        // 1. 旋轉能量環 (外環：順時針)
        const rotA = t * 3;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize, rotA, true);
        ctx.stroke();
        
        // 2. 幾何核心 (內環：逆時針，高頻旋轉)
        const rotB = -t * 6;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        HexGeometry.traceRotatedHex(ctx, 0, 0, currentSize * 0.7, rotB, true);
        ctx.stroke();

        // 3. 能量溢出點 (Procedural)
        this.drawRisingParticles(ctx, color, progress, t);

        ctx.restore();

        // 4. 若為 AOE，繪製精確的邊界指示器
        if (skill.type === 'AOE') {
            this.drawAoeExpansion(ctx, x, y, color, progress, skill.aoeRadius || 1);
        }
    },

    /**
     * 繪製奧義詠唱聖域 (Epic Geometry)
     */
    drawUltimateChantVFX(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        
        const progress = 1 - (agent.castTimer / skill.cast);
        const color = skill.color;
        
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT);

        // 奧義法陣規模較大
        const ultSize = HEX_SIZE * 2.5; 
        const rot = t * 1.5;

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;

        // Layer 1: 外部神聖格線
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize, rot, true);
        ctx.stroke();

        // Layer 2: 內部符文環 (虛線幾何)
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([12, 8]);
        ctx.globalAlpha = 0.5;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize * 0.85, -rot * 0.8, true);
        ctx.stroke();
        ctx.restore();

        // Layer 3: 中心匯聚點
        ctx.globalAlpha = 0.3 + Math.sin(t * 15) * 0.2;
        ctx.fillStyle = color;
        HexGeometry.traceRotatedHex(ctx, 0, 0, ultSize * 0.4, rot * 4, true);
        ctx.fill();

        // 4. 垂直能量柱投影
        const pillarH = 150 * progress;
        if (pillarH > 5) {
            ctx.fillStyle = color;
            const points = HexGeometry.getVertices(ultSize * 0.7, true);
            points.forEach((p, i) => {
                if (i % 2 === 0) {
                    const alpha = (0.2 + 0.3 * Math.sin(t * 8 + i)) * progress;
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(p.x - 1, p.y - pillarH, 2, pillarH);
                }
            });
        }

        ctx.restore();
    },

    /**
     * 繪製 AOE 擴張波紋 (Vector Ripple)
     */
    drawAoeExpansion(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, progress: number, rangeInTiles: number) {
        ctx.save();
        ctx.translate(x, y + AURA_FLOOR_LIFT - 0.5); // 稍微再高一點避免與法陣重疊
        
        // 數學半徑：根據網格尺寸精確映射
        const maxPixelRadius = rangeInTiles * HEX_SIZE;
        const easedRadius = maxPixelRadius * (1 - Math.pow(1 - progress, 4));

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        
        // 1. 波導前端
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (1 - progress) * 0.7;
        HexGeometry.traceHex(ctx, 0, 0, easedRadius, true);
        ctx.stroke();
        
        // 2. 內部漫反射
        ctx.globalAlpha = (1 - progress) * 0.08;
        ctx.fill();

        ctx.restore();
    },

    drawRisingParticles(ctx: CanvasRenderingContext2D, color: string, progress: number, t: number) {
        ctx.fillStyle = color;
        const count = 3;
        for(let i=0; i<count; i++) {
            const offset = i * (Math.PI * 2 / count);
            const cycle = (t * 2.5 + offset) % 1; 
            
            const h = cycle * 70;
            const r = (1 - cycle) * 35;
            const angle = t * 5 + offset;
            
            const px = Math.cos(angle) * r;
            const py = (Math.sin(angle) * r * 0.5) - h; 
            
            const alpha = Math.sin(cycle * Math.PI) * 0.8;
            ctx.globalAlpha = alpha;
            
            ctx.beginPath(); 
            ctx.arc(px, py, 1.5, 0, Math.PI*2); 
            ctx.fill();
        }
    }
};
