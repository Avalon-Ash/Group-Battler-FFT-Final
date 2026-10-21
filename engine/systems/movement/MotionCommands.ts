// ╔══════════════════════════════════════════════════════════════╗
// ║  MotionCommands — 單位「停下／瞬移／衝刺／前衝」寫入 API     ║
// ║  職責：isMoving／path／px／py 與位移時 physics 速度與偏移的   ║
// ║        單一寫入處（其他模組一律呼叫，不直接寫這幾個欄位）。  ║
// ║  [ARCH] stopMovement 以新陣列重設 path、不動 trajectory：    ║
// ║         path 與 trajectory 在 MovementSystem 起步時是同一個  ║
// ║         陣列，絕不可用 length = 0 清空（會連帶抹掉落點預覽）。║
// ║  [ARCH] teleportTo 不決定能不能去（那是 ForcedMove 的事）；  ║
// ║         只套用結果：換格、貼齊像素、physics 偏移補償，讓畫面 ║
// ║         位置（px + physics）連續，由 PhysicsEngine 彈簧補回。║
// ║  [ARCH] dashTo 用於突進技能：在 teleportTo 基礎上注入順向    ║
// ║         爆發速度與上坡跳躍拋物線初速，觸發速度前傾與殘影。   ║
// ║  [ARCH] lungeToward 用於近戰攻擊與貼身突進的前衝打擊感：向   ║
// ║         目標方向注入封頂初速，由彈簧自動拉回，不跨出當前格。 ║
// ╚══════════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import type { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { PHYSICS } from "../../../constants";

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

/**
 * 衝刺到 (q, r)：換格、貼齊像素、physics 偏移補償，並注入順向爆發初速與上坡跳躍拋物線初速。
 * 若 agent 原本在走動則停止移動。
 */
export function dashTo(agent: Agent, q: number, r: number, engine: GameEngine): void {
    const fromX = agent.px;
    const fromY = agent.py;
    teleportTo(agent, q, r, engine);
    if (agent.isMoving) {
        stopMovement(agent);
    }
    const dx = agent.px - fromX;
    const dy = agent.py - fromY;
    if (Math.abs(dx) > 1.5) {
        agent.facing = dx > 0 ? 1 : -1;
    }
    agent.physics.vx += dx * PHYSICS.DASH_BURST_FACTOR;
    agent.physics.vy += dy * PHYSICS.DASH_BURST_FACTOR;

    const uphill = Math.max(0, -agent.physics.z);
    const targetVz = Math.max(
        PHYSICS.VISUAL_JUMP_DASH,
        Math.sqrt(2 * PHYSICS.GRAVITY * (uphill + PHYSICS.DASH_ARC_HEIGHT))
    );
    if (targetVz > agent.physics.vz) {
        agent.physics.vz += targetVz - agent.physics.vz;
    }
}

/**
 * 向目標點前衝（近戰普攻／技能打擊感）：
 * 向目標方向注入速度，由彈簧自動拉回，全過程不跨出當前格。
 * 順向速度超過 speed 時不追加速度，避免連續施法疊爆。
 */
export function lungeToward(agent: Agent, targetPos: { x: number; y: number }, speed: number): void {
    const dx = targetPos.x - agent.px;
    const dy = targetPos.y - agent.py;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1.5) return;

    if (Math.abs(dx) > 1.5) {
        agent.facing = dx > 0 ? 1 : -1;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;
    const projV = agent.physics.vx * dirX + agent.physics.vy * dirY;
    const boost = Math.max(0, speed - projV);
    agent.physics.vx += dirX * boost;
    agent.physics.vy += dirY * boost;
}

