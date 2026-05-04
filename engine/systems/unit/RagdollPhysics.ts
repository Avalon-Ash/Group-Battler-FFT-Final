// ╔══════════════════════════════════════════════════════════╗
// ║  RagdollPhysics — 布娃娃骨骼物理逐幀更新                  ║
// ║  職責：重力 / 地板碰撞 / 角速度衰減 / alpha fade-out      ║
// ║  上游：UnitDeathPainter.draw() 每幀呼叫                  ║
// ║  下游：RagdollBone[] 狀態（就地修改，無回傳值）           ║
// ╚══════════════════════════════════════════════════════════╝
import { RagdollBone } from "../../types/ragdoll";

const GRAVITY = -1200;      // world-space px/s²（向下為負 z）
const FLOOR_BOUNCE = 0.35;  // 彈跳係數
const FRICTION  = 0.82;     // 落地後 xy 摩擦
const FADE_START = 0.6;    // [ARCH] FADE_START 對應 DeathPhase.SETTLE 起點，兩者須保持一致
const ANGULAR_DAMP = 0.94;  // 每幀角速度衰減

export enum DeathPhase {
    COLLAPSE = 'COLLAPSE',  // 0.0 → 0.6：高能量飛散
    SETTLE   = 'SETTLE',    // 0.6 → 1.0：減速著地 + fade
}

export function getDeathPhase(progress: number): DeathPhase {
    return progress < 0.6 ? DeathPhase.COLLAPSE : DeathPhase.SETTLE;
}

export class RagdollPhysics {
    private static readonly CONSTRAINTS: Array<{
        a: string; b: string; restLength: number;
    }> = [
        { a: 'torso', b: 'head',  restLength: 18 },
        { a: 'torso', b: 'arm_l', restLength: 14 },
        { a: 'torso', b: 'arm_r', restLength: 14 },
        { a: 'torso', b: 'leg_l', restLength: 16 },
        { a: 'torso', b: 'leg_r', restLength: 16 },
    ];

    static update(bones: RagdollBone[], dt: number, groundZ: number, phase: DeathPhase = DeathPhase.COLLAPSE): void {
        for (const b of bones) {
            if (b.alpha <= 0) continue;

            // SETTLE phase 額外阻尼
            if (phase === DeathPhase.SETTLE) {
                b.vx *= 0.92;
                b.vy *= 0.92;
                b.vz *= 0.92;
            }

            // 重力
            b.vz += GRAVITY * dt;

            // 積分
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;

            // 地板碰撞
            if (b.z <= groundZ + b.radius) {
                b.z = groundZ + b.radius;
                // 撞擊地板時產生隨機角速度
                if (Math.abs(b.vz) > 50) {
                    b.angularVel = (Math.random() - 0.5) * 15 + b.vx * 0.1;
                }
                
                b.vz = -b.vz * FLOOR_BOUNCE;
                b.vx *= FRICTION;
                b.vy *= FRICTION;
                
                // 停止微小抖動
                if (Math.abs(b.vz) < 10) b.vz = 0;
            }

            // 角速度
            b.angle += b.angularVel * dt;
            b.angularVel *= ANGULAR_DAMP;
        }

        // [ARCH] 關節約束迭代次數依 phase 調整：SETTLE 需更強約束以呈現靜止感
        const constraintIter = phase === DeathPhase.SETTLE ? 4 : 2;
        RagdollPhysics.applyConstraints(bones, constraintIter);
    }

    // iterations: 迭代次數。越高約束越強但計算越重。
    // COLLAPSE=2（骨骼可大幅飛散），SETTLE=4（骨骼趨於靜止）
    static applyConstraints(bones: RagdollBone[], iterations: number = 3): void {
        const boneMap = new Map(bones.map(b => [b.id, b]));
        for (let iter = 0; iter < iterations; iter++) {
            for (const c of RagdollPhysics.CONSTRAINTS) {
                const a = boneMap.get(c.a);
                const b = boneMap.get(c.b);
                if (!a || !b) continue;
                
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const diff = (dist - c.restLength) / dist * 0.3; // stiffness 0.3
                
                const offsetX = dx * diff * 0.5;
                const offsetY = dy * diff * 0.5;
                
                a.x += offsetX;
                a.y += offsetY;
                b.x -= offsetX;
                b.y -= offsetY;
            }
        }
    }

    // [ARCH] FADE_START 對應 DeathPhase.SETTLE 起點，兩者須保持一致
    static applyFade(bones: RagdollBone[], deathProgress: number): void {
        if (deathProgress < FADE_START) return;
        const fadeT = (deathProgress - FADE_START) / (1.0 - FADE_START);
        for (const b of bones) {
            b.alpha = Math.max(0, 1.0 - fadeT);
        }
    }
}
