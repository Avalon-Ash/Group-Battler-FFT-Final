
import { Agent } from "../../game";
import { ShieldPainter } from "./painters/ShieldPainter";
import { OverheadPainter } from "./painters/OverheadPainter";
import { GroundEffectPainter } from "./painters/GroundEffectPainter";
import { StateModelPainter } from "./painters/StateModelPainter";
import { UnitFrameStore } from "../frame/UnitFrame";
import { HexLayout } from "../../../types";

/**
 * ECS Status Orchestrator v11.6
 * 負責所有單位狀態特效的渲染分發
 * [ARCH] 座標一律讀 UnitFrame（engine/renderers/frame/UnitFrame.ts；RenderSpec §3、§4），本檔不取得地形高度。
 */
export class StatusOrchestrator {

    public draw(
        ctx: CanvasRenderingContext2D,
        frames: UnitFrameStore,
        globalTime: number,
        layout: HexLayout = 'FLAT',
        isTileValid?: (q: number, r: number) => boolean
    ) {
        const list = frames.list;
        for (let i = 0; i < list.length; i++) {
            const frame = list[i];
            const agent = frame.agent;
            // 跳過已徹底消失、已死亡或出界的單位
            if (agent.hp <= 0 || agent.fullyDead || agent.outOfBounds) continue;

            // 已被放逐且地塊已消失的單位不繪製狀態
            if (agent.banished && isTileValid && !isTileValid(agent.q, agent.r)) continue;

            // 基礎幾何解算 (SSOT：UnitFrame)
            const px = frame.footX;
            const pz = isNaN(agent.physics?.z) ? 0 : agent.physics.z;
            const visualFloorY = frame.floorY;

            // 身體中心點（用於護盾與包裹類特效）
            const bodyCenterY = frame.bodyCenterY;

            // 1. 放逐/凝滯 (最高級狀態覆蓋)
            if (agent.banished) {
                StateModelPainter.drawBanishment(ctx, agent, px, bodyCenterY, globalTime);
                // 放逐狀態下仍允許地面 CC 效果（Root/DoT）繼續渲染，僅跳過 Shield 和 Overhead
                GroundEffectPainter.draw(ctx, agent, px, visualFloorY - pz, globalTime, layout);
                continue; 
            }

            // 2. 地面鎖定效果 (Root/Burning)
            // 強制腳底偏置：-5px 確保在地板之上且在 Token 之下
            GroundEffectPainter.draw(ctx, agent, px, visualFloorY - pz, globalTime, layout);
            
            // 3. 護盾 (Volumetric Shell)
            // 護盾必須跟隨 bodyCenterY
            ShieldPainter.draw(ctx, agent, px, bodyCenterY, globalTime, layout);
            
            // 4. 頭頂狀態圖標 (Floating HUD)
            // 圖標高度 = 血條錨點（UnitFrame.hudAnchorY，投影頭頂 + 間距）+ HUD_ANCHOR.overheadBelowBar
            OverheadPainter.draw(ctx, agent, px, frame.hudAnchorY, globalTime);
        }
    }
}
