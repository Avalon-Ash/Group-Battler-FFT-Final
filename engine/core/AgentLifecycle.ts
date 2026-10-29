// ╔══════════════════════════════════════════════════════════╗
// ║  AgentLifecycle — Agent 生命週期（存檔／重置）           ║
// ║  職責：saveAgentState 記錄開局快照；resetAgent 還原為快照 ║
// ║        並清掉所有執行期欄位                              ║
// ║  上游：engine/game.ts（開戰存檔、重置）、                ║
// ║        UICommandSystem（手動加人後存檔）                 ║
// ║  [ARCH] Agent 是純資料、不放方法；生命週期寫入集中在此。 ║
// ║        新增 Agent 欄位時，重置預設值要與宣告處一致。     ║
// ╚══════════════════════════════════════════════════════════╝

import { ActionState, AIState, AnimState } from "../types/Enums";
import { HexUtils, MapConfig } from "../utils";
import type { Agent } from "./Agent";
import { resetEffectSlots } from "./Effects";
import { resetAgentView } from "./ViewCommands";

export function saveAgentState(agent: Agent): void {
    agent.initialState = {
        q: agent.q,
        r: agent.r,
        maxHp: agent.maxHp,
        skillIds: [...agent.skillIds],
        role: agent.role,
        bodyType: agent.bodyType
    };
    agent.ragdoll = null;
}

export function resetAgent(agent: Agent, config: MapConfig): void {
    agent.q = agent.initialState.q;
    agent.r = agent.initialState.r;
    const p = HexUtils.toPx(agent.q, agent.r, config);
    agent.px = p.x;
    agent.py = p.y;

    agent.maxHp = agent.initialState.maxHp;
    agent.hp = agent.maxHp;
    agent.shield = 0;
    agent.maxShield = 0;
    agent.mp = 0;

    agent.skillIds = [...agent.initialState.skillIds];
    agent.role = agent.initialState.role;
    agent.bodyType = agent.initialState.bodyType;

    agent.castingSkillIdx = -1;
    agent.castTimer = 0;
    agent.castingAnimationTimer = 0;
    agent.curCDs = [0, 0, 0];
    agent.currentTelegraph = null;

    agent.isMoving = false;
    agent.moveSpeedMult = 1.0;
    agent.path = [];
    agent.moveProgress = 0;
    agent.stuckTicks = 0;

    resetEffectSlots(agent.effects);

    agent.banished = false;
    agent.outOfBounds = false;
    resetAgentView(agent.view);
    agent.ccVisual = 'NONE';

    agent.drStacks = {};
    agent.drTimers = {};
    agent.lastHitSourceId = null;
    agent.lastHitDamage = 0;
    agent.actionState = ActionState.IDLE;
    agent.fearMoveTimer = 0;
    agent.deathTimer = 0;
    agent.deadLogged = false;
    agent.fullyDead = false;
    agent.ragdoll = null;
    agent.animState = AnimState.IDLE;
    agent.spawnTimer = 0.5;
    agent._interruptCooldown = 0;
    agent._castCompleteCooldown = 0;

    agent.target = null;
    agent.targetHex = null;
    // §1.12（STATE_OWNERSHIP_DESIGN）漏清的欄位：宣告預設值與這裡一致
    agent.trajectory = [];
    agent.facing = 1;
    agent._savedCombatTarget = null;
    agent.aiState = AIState.IDLE;
    agent.aiUpdateTimer = 0;
    agent.forceAiUpdate = false;
    agent.escapeCooldown = 0;
    agent.hasLandedLastStand = false;
    agent.dragOverQ = null;
    agent.dragOverR = null;

    agent.physics = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, vAngle: 0 };
    agent.trailHistory = [];
}
