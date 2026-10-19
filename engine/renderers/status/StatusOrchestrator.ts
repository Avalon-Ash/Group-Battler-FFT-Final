import { ShieldPainter } from "./painters/ShieldPainter";
import { StatusPartPainter } from "./painters/StatusPartPainter";
import { UnitFrameStore } from "../frame/UnitFrame";
import { HexLayout } from "../../../types";
import { unitFallProgress } from "../../../data/units/appearance/fallMotion";

/**
 * ECS Status Orchestrator v12
 * 負責所有單位狀態特效的渲染分發：六角零件版狀態層（StatusPartPainter，表在 data/vfx/status_parts.ts）＋護盾稜柱（ShieldPainter）。
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
            // 墜落中（縮圈塌陷）不畫狀態與護盾：本體翻滾淡出時它們不該留在原處
            if (unitFallProgress(agent.physics.z) > 0) continue;

            // 已被放逐且地塊已消失的單位不繪製狀態
            if (agent.banished && isTileValid && !isTileValid(agent.q, agent.r)) continue;

            // 1. 零件版狀態層（腳下 → 投影中心 → 頭頂；放逐中只留放逐／凝滯與腳下層）
            StatusPartPainter.draw(ctx, frame, globalTime, layout);

            // 2. 護盾 (Volumetric Shell)：貼合頭頂高度的稜柱，跟隨 bodyCenterY；放逐中不畫
            if (!agent.banished) {
                ShieldPainter.draw(ctx, agent, frame.footX, frame.bodyCenterY, globalTime, layout);
            }
        }
    }
}
