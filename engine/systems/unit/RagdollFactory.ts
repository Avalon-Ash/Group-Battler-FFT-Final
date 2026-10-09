// ╔══════════════════════════════════════════════════════════╗
// ║  RagdollFactory — Ragdoll 骨骼快照產生器                 ║
// ║  職責：依 Agent 死亡瞬間狀態建立 RagdollBone[] 初始快照  ║
// ║  上游：AgentManager.handleDeadState（死亡瞬間呼叫一次）  ║
// ║  下游：UnitDeathPainter.draw() 消費骨骼資料              ║
// ║  [ARCH] 初始速度由 impactX/Y 決定，物理由 RagdollPhysics 接管║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../core/Agent";
import { RagdollBone } from "../../types/ragdoll";
import { AGENT_CONSTANTS } from "../../../constants";

export class RagdollFactory {
    static createFromAgent(agent: Agent, impactX: number, impactY: number): RagdollBone[] {
        // 以 agent.px / agent.py / groundZ 為中心，建立 6 個骨骼的初始位置
        // 速度初始值：全部帶一個 impactX/Y 的縮放分量
        // 物理演算由 RagdollPhysics.update() 接管，此處僅建立初始快照
        const baseColor = AGENT_CONSTANTS.RAGDOLL_BONE_PLACEHOLDER_COLOR;
        const bones: RagdollBone[] = [
            { id: 'torso',  x: agent.px,       y: agent.py,       z: agent.physics.z + 20, vx: impactX * 0.5, vy: impactY * 0.5, vz: 150, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 10 },
            { id: 'head',   x: agent.px,       y: agent.py - 10,  z: agent.physics.z + 35, vx: impactX * 0.4, vy: impactY * 0.4, vz: 200, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 7  },
            { id: 'arm_l',  x: agent.px - 10,  y: agent.py,       z: agent.physics.z + 18, vx: impactX * 0.7, vy: impactY * 0.7, vz: 120, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 5  },
            { id: 'arm_r',  x: agent.px + 10,  y: agent.py,       z: agent.physics.z + 18, vx: impactX * 0.3, vy: impactY * 0.3, vz: 130, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 5  },
            { id: 'leg_l',  x: agent.px - 6,   y: agent.py + 8,   z: agent.physics.z + 8,  vx: impactX * 0.6, vy: impactY * 0.6, vz: 80,  angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 5  },
            { id: 'leg_r',  x: agent.px + 6,   y: agent.py + 8,   z: agent.physics.z + 8,  vx: impactX * 0.4, vy: impactY * 0.4, vz: 90,  angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 5  },
        ];
        return bones;
    }
}
