// ╔══════════════════════════════════════════════════════════╗
// ║  ViewCommands — 表現層視覺指令                            ║
// ║  職責：提供模擬端安全的視覺指令（受擊閃白、受擊震動）    ║
// ║  上游：PhysicsEngine、SkillExecutor、CCManager、Hazard     ║
// ║  下游：Agent.view、AnimationSystem                        ║
// ║  [ARCH] 模擬端不得直連 AnimationSystem，透過此指令通道    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "./Agent";

// [ARCH] hitFlashTimer / visualOffset 的寫入入口（STATE_OWNERSHIP_DESIGN P2）。
// 模擬層在受擊當下呼叫；由 AnimationSystem 負責衰減。
export function triggerHitFlash(agent: Agent, duration: number): void {
    agent.hitFlashTimer = duration;
}

export function triggerHitShake(agent: Agent, power: number): void {
    agent.visualOffset.x = (Math.random() - 0.5) * power;
    agent.visualOffset.y = (Math.random() - 0.5) * power;
}
