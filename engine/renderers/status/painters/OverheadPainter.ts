
import { Agent } from "../../../../game";
import { AssetManager } from "../../../assets";
import { STATUS_VISUALS } from "../../../../../data/vfx/status_visuals";
import { VISUAL_ANCHORS } from "../../../../../constants";

export const OverheadPainter = {
    /**
     * 繪製頭頂狀態圖標
     * @param y 單位視覺中心 Y 軸
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        // 優先權檢查
        let type = '';
        if (agent.stunTimer > 0) type = 'STUN';
        else if (agent.fearTimer > 0) type = 'FEAR';
        else if (agent.tauntTimer > 0) type = 'TAUNT';
        else if (agent.silenceTimer > 0) type = 'SILENCE';
        else if (agent.blindTimer > 0) type = 'BLIND';

        if (!type) return;

        const icon = AssetManager.getStatusIcon(type);
        if (!icon) return;

        // 數學波形：平滑垂直震盪
        const bob = Math.sin(t * 8) * 4;
        
        // 錨點：從身體中心向上偏移固定量
        const anchorY = y - VISUAL_ANCHORS.HEAD_OFFSET_Y - 15 + bob; 

        ctx.save();
        ctx.translate(x, anchorY);
        
        const def = STATUS_VISUALS[type];
        const color = def?.primaryColor || '#fff';
        
        // 渲染發光層
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.9;
        
        ctx.drawImage(icon, -20, -20, 40, 40);
        
        // 暈眩星光特效
        if (type === 'STUN') {
            ctx.rotate(t * 4);
            ctx.fillStyle = '#fff';
            for(let i=0; i<3; i++) {
                const a = i * (Math.PI*2/3);
                const starDist = 22;
                ctx.beginPath(); 
                ctx.arc(Math.cos(a)*starDist, Math.sin(a)*starDist, 2.5, 0, Math.PI*2); 
                ctx.fill();
            }
        }

        ctx.restore();
    }
};
