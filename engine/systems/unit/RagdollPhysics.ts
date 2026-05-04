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
const FADE_START = 0.65;    // deathProgress 超過此值開始 alpha fade
const ANGULAR_DAMP = 0.94;  // 每幀角速度衰減

export class RagdollPhysics {
    static update(bones: RagdollBone[], dt: number, groundZ: number): void {
        for (const b of bones) {
            if (b.alpha <= 0) continue;

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
    }

    static applyFade(bones: RagdollBone[], deathProgress: number): void {
        if (deathProgress < FADE_START) return;
        const fadeT = (deathProgress - FADE_START) / (1.0 - FADE_START);
        for (const b of bones) {
            b.alpha = Math.max(0, 1.0 - fadeT);
        }
    }
}
