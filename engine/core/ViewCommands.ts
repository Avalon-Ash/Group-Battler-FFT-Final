// ╔══════════════════════════════════════════════════════════╗
// ║  ViewCommands — 表現層視覺指令                            ║
// ║  職責：提供模擬端安全的視覺指令（受擊閃白、受擊震動）    ║
// ║  [ARCH] 模擬端不得直連 AnimationSystem，透過此指令通道    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "./Agent";
import type { AgentView } from "../../types";

export function createAgentView(): AgentView {
    return {
        visualStatus: 'NONE',
        hitFlashTimer: 0,
        visualOffset: { x: 0, y: 0 },
    };
}

export function resetAgentView(view: AgentView): void {
    view.visualStatus = 'NONE';
    view.hitFlashTimer = 0;
    view.visualOffset.x = 0;
    view.visualOffset.y = 0;
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
