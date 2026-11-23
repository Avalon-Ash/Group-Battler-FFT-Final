// ╔══════════════════════════════════════════════════════════╗
// ║  pickAgentAt — 輸入層「點到哪個單位」的唯一入口           ║
// ║  職責：先用表現層的身體框命中（UnitPick，含裝置別容差、    ║
// ║        重疊選最前面）；都沒點到才退回格子判定（queryAgentAt）。║
// ║        按下、拖曳、點擊選取、下指令都呼叫這一個。           ║
// ║  上游：hooks/useGameInput.ts。規則見                         ║
// ║  engine/renderers/frame/UnitPick.ts 與 RenderSpec（單位點擊命中）。║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine, Agent } from '../engine/game';
import type { Hex, Point } from '../types';
import { GAME_INPUT_PARAM } from '../constants';
import { queryAgentAt } from '../engine/systems/ui/editorQueries';

/** 表現層提供的身體框命中（UnitRenderSystem 實作） */
export interface UnitPicker {
    pickAgent(worldX: number, worldY: number, padWorld: number): Agent | null;
}

/** 容差（螢幕像素）：觸控用手指粗的值，滑鼠與手寫筆用準的值 */
function pickPadPx(pointerType: string): number {
    return pointerType === 'touch' ? GAME_INPUT_PARAM.PICK_PAD_TOUCH_PX : GAME_INPUT_PARAM.PICK_PAD_MOUSE_PX;
}

/**
 * @param world 指標的世界座標（拿不到是 null）
 * @param zoom 鏡頭縮放：容差是螢幕像素，除以它換成世界單位
 * @param hex 指標所在的格子（地圖外是 null）：身體框都沒命中時的退路
 */
export function pickAgentAt(
    engine: GameEngine,
    picker: UnitPicker | null | undefined,
    world: Point | null,
    zoom: number,
    pointerType: string,
    hex: Hex | null
): Agent | undefined {
    if (picker && world && zoom > 0) {
        const body = picker.pickAgent(world.x, world.y, pickPadPx(pointerType) / zoom);
        if (body) return body;
    }
    return hex ? queryAgentAt(engine, hex.q, hex.r) : undefined;
}
