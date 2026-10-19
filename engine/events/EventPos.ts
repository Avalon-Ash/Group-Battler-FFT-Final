// ╔══════════════════════════════════════════════════════════╗
// ║  EventPos — GameEvent.pos 的唯一建構點（純函式、無狀態）  ║
// ║  規則：pos.z 若存在，一律是「世界高度」（模擬高度，        ║
// ║        engine.getTerrainHeight 的尺度，含空中高度）。     ║
// ║        沒有 z＝地面上某處，由消費端查該格高度。           ║
// ║  [ARCH] 發射端不得再手寫 pos 物件字面量                   ║
// ║  （tests/CoordinateProtocol.test.ts 的 event.inlinePos）。║
// ║  規格見 engine/renderers/RenderSpec.ts §3 事件座標。      ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from "../game";
import type { Agent } from "../core/Agent";
import type { Point } from "../../types";
import { HexUtils } from "../utils";
import { VisualMath } from "../math/VisualMath";

type HeightEngine = Pick<GameEngine, 'getTerrainHeight' | 'mapConfig'>;

/** 單位事件：含 physics 位移的 xy；z＝腳下世界高度（getUnitGroundHeight）＋空中高度 physics.z。 */
export function unitEventPos(agent: Agent, engine: HeightEngine): Point {
    const ground = VisualMath.getUnitGroundHeight(agent, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig);
    return {
        x: agent.px + agent.physics.x,
        y: agent.py + agent.physics.y,
        z: ground + agent.physics.z,
    };
}

/** 格子事件：六角格中心；z＝該格頂面的世界高度。 */
export function hexEventPos(q: number, r: number, engine: HeightEngine): Point {
    const c = HexUtils.toPx(q, r, engine.mapConfig);
    return { x: c.x, y: c.y, z: engine.getTerrainHeight(q, r) };
}

/** 純 2D 點：沒有 z，代表「地面上某處」，消費端自己查該格高度。 */
export function pointEventPos(x: number, y: number): Point {
    return { x, y };
}
