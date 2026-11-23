// ╔══════════════════════════════════════════════════════════╗
// ║  StatusOrchestrator — 單位狀態特效渲染分發                  ║
// ║  職責：分發六角零件版狀態層（StatusPartPainter，表在        ║
// ║        data/vfx/status_parts.ts）與護盾稜柱（ShieldPainter），║
// ║        並經 StatusDirection 算出有方向狀態層的方向角傳給     ║
// ║        StatusPartPainter。                                  ║
// ║  上游：RenderPipeline（UnitFrameStore、mapConfig）。         ║
// ║  [ARCH] 座標一律讀 UnitFrame（RenderSpec §3、§4），本檔不取  ║
// ║  地形高度；方向 context 與方向表建一次重用，每幀不配置物件。 ║
// ╚══════════════════════════════════════════════════════════╝

import { ShieldPainter } from "./painters/ShieldPainter";
import { StatusPartPainter } from "./painters/StatusPartPainter";
import { UnitFrameStore } from "../frame/UnitFrame";
import { HexLayout } from "../../../types";
import { unitFallProgress } from "../../../data/units/appearance/fallMotion";
import { HexUtils, type MapConfig } from "../../utils";
import { statusAngle } from "./StatusDirection";
import type { StatusOrient } from "../../../data/vfx/status_parts";

const ZERO_POINT = { x: 0, y: 0 };

export class StatusOrchestrator {
    private _mapConfig: MapConfig | null = null;
    private readonly _hexToPx = (q: number, r: number): { x: number; y: number } =>
        this._mapConfig ? HexUtils.toPx(q, r, this._mapConfig) : ZERO_POINT;
    private readonly _dirCtx = { hexToPx: this._hexToPx };
    private readonly _dirs: Record<StatusOrient, number | null> = { MOVE: null };

    public draw(
        ctx: CanvasRenderingContext2D,
        frames: UnitFrameStore,
        globalTime: number,
        layout: HexLayout = 'FLAT',
        isTileValid?: (q: number, r: number) => boolean,
        mapConfig?: MapConfig
    ) {
        const list = frames.list;
        this._mapConfig = mapConfig ?? null;
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
            // 沒有地圖設定就沒有格心座標：不給方向（沿用零件原本的 rotation），不拿原點當目標
            this._dirs.MOVE = agent.effects.HASTE.remaining > 0 && this._mapConfig
                ? statusAngle('MOVE', frame, this._dirCtx)
                : null;
            StatusPartPainter.draw(ctx, frame, globalTime, layout, this._dirs);

            // 2. 護盾 (Volumetric Shell)：貼合頭頂高度的稜柱，跟隨 bodyCenterY；放逐中不畫
            if (!agent.banished) {
                ShieldPainter.draw(ctx, agent, frame.footX, frame.bodyCenterY, globalTime, layout);
            }
        }
    }
}
