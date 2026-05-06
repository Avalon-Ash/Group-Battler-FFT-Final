
import { Agent } from "../../../game";
import { AssetManager } from "../../../assets";

export const StateModelPainter = {
    /**
     * 繪製包裹單位的放逐/凝滯幾何體
     * @param centerY 單位視覺中心 Y 軸
     */
    drawBanishment(ctx: CanvasRenderingContext2D, agent: Agent, x: number, centerY: number, t: number) {
        const isBanishActive = agent.banished && agent.banishTimer > 0;
        const isStasisActive = agent.visualStatus === 'STASIS';
        if (!isBanishActive && !isStasisActive) return;

        const isStasis = isStasisActive;
        const color = isStasis ? '#facc15' : '#c084fc'; 
        const shadowColor = isStasis ? '#eab308' : '#7e22ce';
        
        ctx.save();
        ctx.translate(x, centerY);
        
        // 核心幾何參數
        const size = 50;
        const halfH = 70;
        const rot = t * 1.2;
        
        // 解算 4 個旋轉頂點 (ISO 平面)
        const pts = [];
        for(let i=0; i<4; i++) {
            const angle = rot + (i * Math.PI / 2);
            pts.push({
                x: Math.cos(angle) * size,
                y: Math.sin(angle) * size * 0.4 // ISO 透視壓縮
            });
        }

        // 幾何繪製函數
        const drawShard = (p1: any, p2: any, tipY: number, alpha: number) => {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(0, tipY);
            ctx.closePath();
            
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
        };

        // 浮動動畫
        const bob = Math.sin(t * 3) * 6;
        ctx.translate(0, bob);

        // 繪製稜鏡面
        for(let i=0; i<4; i++) {
            const next = (i+1)%4;
            drawShard(pts[i], pts[next], -halfH, 0.3); // 上半部
            drawShard(pts[i], pts[next], halfH, 0.15); // 下半部
        }
        
        // 核心狀態圖標
        ctx.globalCompositeOperation = 'screen';
        const pulse = 0.8 + Math.sin(t * 6) * 0.2;
        ctx.globalAlpha = pulse;
        const icon = AssetManager.getStatusIcon(isStasis ? 'STASIS' : 'BANISH');
        if (icon) ctx.drawImage(icon, -24, -24, 48, 48);

        ctx.restore();
    }
};
