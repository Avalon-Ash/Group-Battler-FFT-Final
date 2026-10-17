// ╔══════════════════════════════════════════════════════════════╗
// ║  MotionCommands — 單位「停下／瞬移」的寫入 API（純函式）       ║
// ║  職責：isMoving／path／px／py 與瞬移時 physics.x／y 補償的     ║
// ║        單一寫入處（其他模組一律呼叫，不直接寫這幾個欄位）。    ║
// ║  上游：CCManager（CC 停步、擊退／拉扯）、SkillExecutor（突進）、║
// ║        ControlSystem／BTRegistry／StackingResolver（停步）。   ║
// ║  [ARCH] stopMovement 以新陣列重設 path、不動 trajectory：      ║
// ║         path 與 trajectory 在 MovementSystem 起步時是同一個    ║
// ║         陣列，絕不可用 length = 0 清空（會連帶抹掉落點預覽）。 ║
// ║  [ARCH] teleportTo 不決定能不能去（那是 ForcedMove 的事）；    ║
// ║         只套用結果：換格、貼齊像素、physics 偏移補償，讓畫面   ║
// ║         位置（px + physics）連續，由 PhysicsEngine 彈簧補回。  ║
// ╚══════════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import type { GameEngine } from "../../game";
import { HexUtils } from "../../utils";

/** 停止移動：isMoving = false，path 換成新的空陣列；trajectory 保留給預覽與投射物。 */
export function stopMovement(agent: Agent): void {
    agent.isMoving = false;
    agent.path = [];
}

/**
 * 瞬移到 (q, r)：換格、px/py 貼齊新格中心，並把位移量寫進 physics.x/y，
 * 讓繪製位置（px + physics）不跳變，由 PhysicsEngine 自然彈回。
 * 呼叫端若同時要停步，須在本函式「之後」呼叫 stopMovement
 * （換格時的腳下高度補償會讀取目前的 path／isMoving）。
 */
export function teleportTo(agent: Agent, q: number, r: number, engine: GameEngine): void {
    const fromX = agent.px;
    const fromY = agent.py;
    engine.updateAgentPosition(agent, q, r);
    const to = HexUtils.toPx(q, r, engine.mapConfig);
    agent.px = to.x;
    agent.py = to.y;
    agent.physics.x += fromX - to.x;
    agent.physics.y += fromY - to.y;
}
