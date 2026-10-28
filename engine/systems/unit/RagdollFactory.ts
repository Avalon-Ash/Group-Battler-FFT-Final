// ╔══════════════════════════════════════════════════════════╗
// ║  RagdollFactory — Ragdoll 骨骼快照產生器                 ║
// ║  職責：依 Agent 死亡瞬間狀態建立 RagdollBone[] 初始快照  ║
// ║  [ARCH] 初始速度由 impactX/Y 決定，供 deathMotion 推導   ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../core/Agent";
import { RagdollBone } from "../../types/ragdoll";
import { AGENT_CONSTANTS, PHYSICS } from "../../../constants";

export class RagdollFactory {
    static createFromAgent(agent: Agent, impactX: number, impactY: number): RagdollBone[] {
        // 以 agent.px / agent.py / groundZ 為中心，建立 6 個骨骼的初始位置
        // 速度初始值：全部帶一個 impactX/Y 的縮放分量
        // 擊飛位移由 deathMotion 依 deathTimer 推導，此處僅建立初始快照
        const baseColor = AGENT_CONSTANTS.RAGDOLL_BONE_PLACEHOLDER_COLOR;
        const bones: RagdollBone[] = [
            { id: 'torso',  x: agent.px,       y: agent.py,       z: agent.physics.z + PHYSICS.RAGDOLL_TORSO_HEIGHT, vx: impactX * 0.5, vy: impactY * 0.5, vz: PHYSICS.RAGDOLL_TORSO_VERTICAL_SPEED, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: 10 },
            { id: 'head',   x: agent.px,       y: agent.py - 10,  z: agent.physics.z + PHYSICS.RAGDOLL_HEAD_HEIGHT, vx: impactX * PHYSICS.RAGDOLL_HEAD_IMPACT_FACTOR, vy: impactY * PHYSICS.RAGDOLL_HEAD_IMPACT_FACTOR, vz: PHYSICS.RAGDOLL_HEAD_VERTICAL_SPEED, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: PHYSICS.RAGDOLL_HEAD_RADIUS  },
            { id: 'arm_l',  x: agent.px - 10,  y: agent.py,       z: agent.physics.z + PHYSICS.RAGDOLL_ARM_HEIGHT, vx: impactX * PHYSICS.RAGDOLL_LEFT_ARM_IMPACT_FACTOR, vy: impactY * PHYSICS.RAGDOLL_LEFT_ARM_IMPACT_FACTOR, vz: PHYSICS.RAGDOLL_LEFT_ARM_VERTICAL_SPEED, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: PHYSICS.RAGDOLL_LIMB_RADIUS  },
            { id: 'arm_r',  x: agent.px + 10,  y: agent.py,       z: agent.physics.z + PHYSICS.RAGDOLL_ARM_HEIGHT, vx: impactX * PHYSICS.RAGDOLL_RIGHT_ARM_IMPACT_FACTOR, vy: impactY * PHYSICS.RAGDOLL_RIGHT_ARM_IMPACT_FACTOR, vz: PHYSICS.RAGDOLL_RIGHT_ARM_VERTICAL_SPEED, angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: PHYSICS.RAGDOLL_LIMB_RADIUS  },
            { id: 'leg_l',  x: agent.px - PHYSICS.RAGDOLL_LEG_X_OFFSET,   y: agent.py + PHYSICS.RAGDOLL_LEG_Y_OFFSET,   z: agent.physics.z + PHYSICS.RAGDOLL_LEG_HEIGHT,  vx: impactX * PHYSICS.RAGDOLL_LEFT_LEG_IMPACT_FACTOR, vy: impactY * PHYSICS.RAGDOLL_LEFT_LEG_IMPACT_FACTOR, vz: PHYSICS.RAGDOLL_LEFT_LEG_VERTICAL_SPEED,  angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: PHYSICS.RAGDOLL_LIMB_RADIUS  },
            { id: 'leg_r',  x: agent.px + PHYSICS.RAGDOLL_LEG_X_OFFSET,   y: agent.py + PHYSICS.RAGDOLL_LEG_Y_OFFSET,   z: agent.physics.z + PHYSICS.RAGDOLL_LEG_HEIGHT,  vx: impactX * PHYSICS.RAGDOLL_RIGHT_LEG_IMPACT_FACTOR, vy: impactY * PHYSICS.RAGDOLL_RIGHT_LEG_IMPACT_FACTOR, vz: 90,  angle: 0, angularVel: 0, color: baseColor, alpha: 1, radius: PHYSICS.RAGDOLL_LIMB_RADIUS  },
        ];
        return bones;
    }
}
