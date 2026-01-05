
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
        // --- 1. 計算物理動態參數 (Juice Math) ---
        const vx = agent.physics.vx;
        const vy = agent.physics.vy;
        const speedSq = vx*vx + vy*vy;
        
        // 傾斜邏輯：
        // 如果是突進 (主動移動)，身體向前傾 (Tilt Forward)
        // 如果是擊退 (受力且無主動意圖)，身體向後仰 (Tilt Backward)
        // Facing: 1 (Right), -1 (Left)
        
        let tiltAngle = 0;
        let isHighSpeed = false;

        if (speedSq > 1000) { // 顯著移動
            const speed = Math.sqrt(speedSq);
            isHighSpeed = speed > 300;

            // 計算移動方向與面向的點積，判斷是前進還是後退
            const dirX = vx / speed;
            const dot = dirX * agent.facing; 
            
            // 基礎傾斜量 (最大 30度)
            const maxTilt = 0.5; 
            let tiltFactor = Math.min(1.0, speed / 800) * maxTilt;
            
            // 突進(同向): 前傾 (+)
            // 擊退(反向): 後仰 (-)
            // 注意：Canvas 旋轉是順時針為正。
            // 面向右 (Facing=1): 前傾是順時針 (+), 後仰是逆時針 (-)
            // 面向左 (Facing=-1): 前傾是逆時針 (-), 後仰是順時針 (+)
            
            if (dot > 0) {
                // Moving Forward -> Lean Forward
                tiltAngle = tiltFactor * agent.facing;
            } else {
                // Moving Backward -> Lean Backward (Get knocked back)
                // 擊退時增加更多旋轉，製造失衡感
                tiltAngle = -tiltFactor * agent.facing * 1.5; 
            }
        }

        // 疊加物理引擎的隨機旋轉 (Impact Trauma)
        const finalRotation = agent.physics.angle + tiltAngle;

        // --- 2. 殘影繪製 (Ghosting) ---
        // 僅在高速移動且非剪影模式下繪製
        if (isHighSpeed && !isSilhouette && agent.hp > 0) {
            const history = agent.trailHistory;
            // 每隔 2 幀畫一個殘影，最多畫 2 個，避免過於雜亂
            const step = 2;
            const maxGhosts = 2;
            
            for (let i = Math.max(0, history.length - 1 - (maxGhosts*step)); i < history.length - 1; i += step) {
                const pos = history[i];
                // 透明度隨時間遞減
                const opacity = (i / history.length) * 0.3; 
                
                ctx.save();
                // 使用殘影位置進行變換
                // 注意：這裡需要重新計算殘影的 Visual Y (包含 Z 軸)
                const ghostY = VisualMath.getVisualBodyCenterY(pos.y, pos.z);
                
                ctx.translate(pos.x, ghostY);
                ctx.scale(UNIT_SCALE, UNIT_SCALE);
                ctx.rotate(finalRotation * 0.5); // 殘影旋轉稍微滯後
                ctx.scale(agent.facing > 0 ? 1 : -1, 1);
                
                ctx.globalAlpha = opacity;
                ctx.globalCompositeOperation = 'screen'; // 殘影使用濾色模式，像能量留存
                
                // 根據陣營繪製單色剪影
                const color = agent.team === Team.BLUE ? '#60a5fa' : '#ef4444';
                
                // 這裡簡化繪製：只畫通用形狀或調用 faction renderer 但強制單色
                // 為了效能，我們畫一個簡單的 Unit Shape 填充
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(-10, -40); ctx.lineTo(10, -40);
                ctx.lineTo(5, 10); ctx.lineTo(-5, 10);
                ctx.fill();
                
                ctx.restore();
            }
        }

        // --- 3. 主體渲染 ---
        ctx.save(); 
        
        // 獲取身體中心視覺 Y 軸 (SSOT)
        const pz = agent.physics.z;
        const bodyY = VisualMath.getVisualBodyCenterY(py, pz);
        ctx.translate(px, bodyY); 
        
        // 核心受擊幾何處理 (Juice Math)
        let hitBrightness = 0;
        let squashX = 1.0;
        let squashY = 1.0;

        if (agent.hitFlashTimer > 0 && !isSilhouette) {
            const trauma = agent.hitFlashTimer / 0.2; 
            squashY = 1.0 - (trauma * 0.25);
            squashX = 1.0 + (trauma * 0.15);
            hitBrightness = 100 + Math.sin(t * 40) * 50;
        }

        ctx.scale(UNIT_SCALE * squashX, UNIT_SCALE * squashY);
        ctx.rotate(finalRotation); // 應用計算出的動態傾斜

        // 基礎呼吸與浮動
        let bodyFloat = 0; 
        if (agent.hp > 0 && agent.movementType !== MovementType.FLYING) {
             bodyFloat = Math.sin(t * 2) * 3; 
        } else if (agent.movementType === MovementType.FLYING) {
             bodyFloat = Math.sin(t * 4) * 2;
        }
        ctx.translate(0, bodyFloat);

        // 進場縮放動畫
        if (agent.spawnTimer > 0) {
            const SPAWN_DURATION = 0.5; 
            const progress = 1 - (agent.spawnTimer / SPAWN_DURATION); 
            const eased = 1 - Math.pow(1 - progress, 3); 
            ctx.scale(1, 2.0 - eased); 
            ctx.globalAlpha *= eased;
        }

        // 狀態濾鏡應用
        if (agent.hp <= 0 && !isSilhouette) {
            ctx.filter = 'grayscale(100%) opacity(70%)'; 
        } else if (hitBrightness > 0) {
             ctx.filter = `brightness(${hitBrightness}%) contrast(120%)`;
        }

        // 飛行與拖尾渲染 (包含地面的滑行痕跡)
        // 只要有速度或是在飛，就嘗試畫軌跡
        if (agent.hp > 0 && !isSilhouette && agent.visualStatus === 'NONE') {
            if (agent.movementType === MovementType.FLYING || speedSq > 5000) {
                UnitFlightPainter.drawRibbonTrail(ctx, agent, t);
            }
            if (agent.movementType === MovementType.FLYING) {
                UnitFlightPainter.drawFlightVFX(ctx, agent, t);
            }
        }

        ctx.scale(agent.facing > 0 ? 1 : -1, 1);

        if (agent.visualStatus === 'POLYMORPH' && !isSilhouette) {
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
