// ╔══════════════════════════════════════════════════════════╗
// ║  ViewCommands — 表現層視覺指令                            ║
// ║  職責：提供模擬端安全的視覺指令（受擊閃白、受擊震動）    ║
// ║  [ARCH] statusPresentation 固定槽只在此初始化／重設。    ║
// ║  [ARCH] 模擬端不得直連 AnimationSystem，透過此指令通道    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "./Agent";
import type { AgentView, StatusOrigin, StatusReceipt } from "../../types";
import { EFFECT_KINDS } from './Effects';

function createOrigin(): StatusOrigin {
    return { recorded: false, sourceId: null, sourceSide: null, skillId: null, skillName: null, element: null };
}
function createReceipt(): StatusReceipt {
    return { duration: createOrigin(), value: createOrigin(), variant: createOrigin() };
}
function resetOrigin(origin: StatusOrigin): void {
    origin.recorded = false;
    origin.sourceId = null;
    origin.sourceSide = null;
    origin.skillId = null;
    origin.skillName = null;
    origin.element = null;
}

export function createAgentView(): AgentView {
    return {
        visualStatus: 'NONE',
        hitFlashTimer: 0,
        visualOffset: { x: 0, y: 0 },
        statusPresentation: {
            effects: {
                STUN: createReceipt(),
                SILENCE: createReceipt(),
                ROOT: createReceipt(),
                FEAR: createReceipt(),
                TAUNT: createReceipt(),
                BLIND: createReceipt(),
                BANISH: createReceipt(),
                STASIS: createReceipt(),
                POLYMORPH: createReceipt(),
                INVINCIBLE: createReceipt(),
                VULNERABLE: createReceipt(),
                HASTE: createReceipt(),
                REFLECT: createReceipt(),
                LIFESTEAL: createReceipt(),
                SLOW: createReceipt(),
                DOT: createReceipt(),
                HOT: createReceipt(),
            },
            shieldGrant: { origin: createOrigin(), grantedAmount: 0 },
            feedback: { kind: null, removedMask: 0 },
        },
    };
}

export function resetAgentView(view: AgentView): void {
    view.visualStatus = 'NONE';
    view.hitFlashTimer = 0;
    view.visualOffset.x = 0;
    view.visualOffset.y = 0;
    for (const kind of EFFECT_KINDS) {
        const receipt = view.statusPresentation.effects[kind];
        resetOrigin(receipt.duration);
        resetOrigin(receipt.value);
        resetOrigin(receipt.variant);
    }
    resetOrigin(view.statusPresentation.shieldGrant.origin);
    view.statusPresentation.shieldGrant.grantedAmount = 0;
    view.statusPresentation.feedback.kind = null;
    view.statusPresentation.feedback.removedMask = 0;
}

// [ARCH] hitFlashTimer / visualOffset 的寫入入口（STATE_OWNERSHIP_DESIGN P2）。
// 模擬層在受擊當下呼叫；由 AnimationSystem 負責衰減。
export function triggerHitFlash(agent: Agent, duration: number): void {
    agent.view.hitFlashTimer = duration;
}

export function triggerHitShake(agent: Agent, power: number): void {
    agent.view.visualOffset.x = (Math.random() - 0.5) * power;
    agent.view.visualOffset.y = (Math.random() - 0.5) * power;
}
