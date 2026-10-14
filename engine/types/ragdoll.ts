// ╔══════════════════════════════════════════════════════════╗
// ║  ragdoll.ts — Ragdoll 型別定義                           ║
// ║  [ARCH] RagdollBone 為骨骼初始快照之資料契約            ║
// ║  消費者：RagdollFactory / UnitDeathPainter.getKnockOffset ║
// ╚══════════════════════════════════════════════════════════╝

/** 骨骼快照節點，提供死亡初速以推導擊飛位移 */
export interface RagdollBone {
    id: string;           // 'torso' | 'head' | 'arm_l' | 'arm_r' | 'leg_l' | 'leg_r'
    x: number;            // 世界空間 X
    y: number;            // 世界空間 Y
    z: number;            // 世界空間 Z（高度）
    vx: number;           // 速度 X
    vy: number;           // 速度 Y
    vz: number;           // 速度 Z（飛出速度）
    angle: number;        // 旋轉角度（rad）
    angularVel: number;   // 角速度
    color: string;        // 繼承自 agent faction color
    alpha: number;        // 0.0 ~ 1.0
    radius: number;       // 繪製半徑（像素）
}
