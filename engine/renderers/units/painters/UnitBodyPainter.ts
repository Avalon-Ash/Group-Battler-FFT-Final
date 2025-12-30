
import { Agent } from "../../../../game";
import { Team, AnimState, MovementType } from "../../../../../types";
import { UNIT_SCALE } from "../../../../../constants";
import { ImperialRenderer } from "../factions/ImperialRenderer";
import { CovenantRenderer } from "../factions/CovenantRenderer";
import { UnitFlightPainter } from "./UnitFlightPainter";
import { SpriteManager } from "../../../sprites";
import { VisualMath } from "../../../math/VisualMath";

export const UnitBodyPainter = {
    draw(
        ctx: CanvasRenderingContext2D, 
        agent: Agent, 
        px: number, py: number, 
        t: number, 
        isSilhouette: boolean, 
        isSelected: boolean,
        scaleFactor: number
    ) {
        ctx.save(); 
        
        // 1. 獲取身體中心視覺 Y 軸 (SSOT)
        // 直接讀取 Agent 物理狀態，避免外部傳遞錯誤
        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
        ctx.translate(px, bodyY); 
        
        // 2. 核心受擊幾何處理 (Juice Math)
        let hitBrightness = 0;
        let squashX = 1.0;
        let squashY = 1.0;

        if (agent.hitFlashTimer > 0 && !isSilhouette) {
            const trauma = agent.hitFlashTimer / 0.2; // 歸一化進度
            // 數學擠壓：受擊時垂直縮短，水平伸長
            squashY = 1.0 - (trauma * 0.25);
            squashX = 1.0 + (trauma * 0.15);
            // 亮度震盪函數 (高頻率 40Hz)
            hitBrightness = 100 + Math.sin(t * 40) * 50;
        }

        ctx.scale(UNIT_SCALE * squashX, UNIT_SCALE * squashY);
        ctx.rotate(agent.physics.angle); 

        // 3. 基礎呼吸與浮動 (Silhouette needs float but not breath scale usually, 
        //    but keeping sync is safer for outline matching)
        let bodyFloat = 0; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat = Math.sin(t * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat = Math.sin(t * 4) * 2;
        }
        ctx.translate(0, bodyFloat);

        // 4. 進場縮放動畫
        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; 
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            ctx.scale(1, 2.0 - eased); 
            ctx.globalAlpha *= eased;
        }

        // 5. 狀態濾鏡應用
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(70%)'; 
        } else if (hitBrightness > 0) {
             ctx.filter = `brightness(${hitBrightness}%) contrast(120%)`;
        }

        // 6. 飛行與特殊模型渲染
        if (agent.movementType === MovementType.FLYING && agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            UnitFlightPainter.drawFlightVFX(ctx, agent, t);
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        if (agent.visualStatus === 'POLYMORPH' && !isSilhouette) {
            // Polymorph usually doesn't have an x-ray outline since it's a joke state, 
            // but we skip it here for simplicity or could add simple circle.
            const sheep = SpriteManager.getSpecialModel('SHEEP');
            const bounce = Math.abs(Math.sin(t * 5) * 5);
            ctx.drawImage(sheep, -32, -32 - bounce, 64, 64);
        } else {
            if (agent.team === Team.BLUE) {
                ImperialRenderer.draw(ctx, agent, t, isSilhouette);
            } else {
                CovenantRenderer.draw(ctx, agent, t, isSilhouette);
            }
            
            if (agent.visualStatus === 'FROZEN' && !isSilhouette) {
                const ice = SpriteManager.getSpecialModel('ICE');
                ctx.save();
                ctx.globalCompositeOperation = 'hard-light';
                ctx.drawImage(ice, -48, -64, 96, 128);
                ctx.restore();
            }
        }
        
        ctx.restore(); 
    }
};
