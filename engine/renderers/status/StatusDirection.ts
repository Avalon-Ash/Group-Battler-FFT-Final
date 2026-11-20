// ╔══════════════════════════════════════════════════════════╗
// ║  StatusDirection — 狀態零件的方向輸入（契約 R4）           ║
// ║  職責：算出有方向的狀態零件要朝哪裡（螢幕角度，弧度，      ║
// ║        0＝右、π/2＝下）。嘲諷＝從單位指向嘲諷者，          ║
// ║        加速＝移動方向（靜止時依 facing 左右）。             ║
// ║  上游：UnitFrame（footX／floorY，RenderSpec §3）、           ║
// ║        Agent.effects.TAUNT.sourceId、Agent.path／facing。    ║
// ║  [ARCH] 只讀 UnitFrame 的座標，不取地形高度；每幀不配置物件。║
// ║  StatusOrchestrator 算好角度傳給 StatusPartPainter。         ║
// ╚══════════════════════════════════════════════════════════╝

import type { UnitFrame } from "../frame/UnitFrame";
import type { StatusOrient } from "../../../data/vfx/status_parts";

/** 方向計算只需要的 UnitFrame 欄位 */
export type StatusFrameRef = Pick<UnitFrame, 'agent' | 'footX' | 'floorY'>;

export interface StatusDirectionContext {
    /** 這一幀所有單位的 frame（找嘲諷者用；單位數很少，線性搜尋） */
    readonly frames: readonly StatusFrameRef[];
    /** 格心的世界座標（HexUtils.toPx，和 Agent.px／py 同一座標系） */
    readonly hexToPx: (q: number, r: number) => { x: number; y: number };
}

/**
 * 有方向的狀態零件該朝哪裡；null＝沒有方向可用（沒有嘲諷者、嘲諷者不在場上），維持零件原本的 rotation。
 * TOWARD_SOURCE：從 frame 的腳點指向嘲諷者 frame 的腳點（atan2(dy, dx)）。
 * MOVE：移動中＝從 (agent.px, agent.py) 指向 path[0] 的格心；靜止或沒有路徑＝facing > 0 時 0，否則 π。
 */
export function statusAngle(_orient: StatusOrient, _frame: StatusFrameRef, _ctx: StatusDirectionContext): number | null {
    return null; // [契約 R4] 空殼：由實作者補上
}
