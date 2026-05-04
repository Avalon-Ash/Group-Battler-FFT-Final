// ╔══════════════════════════════════════════════════════════╗
// ║  UnitDeathPainter — 死亡演出渲染插槽                    ║
// ║                                                          ║
// ║  目前實作：空插槽（hp <= 0 的演出目前由 UnitBodyPainter early return 處理）║
// ║                                                          ║
// ║  架構缺口預留：                                          ║
// ║  [TODO: RAGDOLL] 未來在此插入布娃娃骨架動畫              ║
// ║  → 建議走獨立 RenderOpType.CORPSE，subLayer 在 UNIT 之後  ║
// ║  → deathTimer 由 AgentManager 在 hp<=0 時開始計時         ║
// ║  → fullyDead=true 時停止更新並從 agents 陣列移除          ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, MapConfig } from "../../../../types";
import { RagdollPhysics } from "../RagdollPhysics";
import { ISO_SCALE_Y, BLOCK_HEIGHT } from "../../../../constants";

export class UnitDeathPainter {

    /**
     * 繪製死亡中的單位（hp <= 0 且尚未 fullyDead）
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        agent: Agent,
        visX: number,  // 這裡傳入的是平移後的中心 X (0)
        visY: number,  // 這裡傳入的是平移後的中心 Y (0)
        alpha: number,
        t: number,     // 這裡傳入的是 battleTime
        cfg: MapConfig,
        terrainHeight: number,
        simDt: number = 0.016 // 預設 60fps，若外部能傳更好
    ): void {
        if (agent.fullyDead) return;
        if (!agent.ragdoll || agent.ragdoll.length === 0) return;

        const progress = UnitDeathPainter.getDeathProgress(agent);
        // 使用傳入的地形高度計算地面 Z
        const groundZ = terrainHeight * BLOCK_HEIGHT;

        // [ARCH] 物理更新就地發生在 Draw 階段
        RagdollPhysics.update(agent.ragdoll, simDt, groundZ);
        RagdollPhysics.applyFade(agent.ragdoll, progress);

        // 繪製骨骼
        for (const bone of agent.ragdoll) {
            if (bone.alpha <= 0) continue;

            // 骨骼座標是世界空間，但 px/py 已經平移到 agent 位置
            // 由於 drawAssembly 已經 ctx.translate(drawX, drawY)
            // 而 drawX, drawY 是 agent 的螢幕座標。
            // 骨骼的 x, y 是相對於大地原點。
            // 所以我們需要計算骨骼相對於 agent 的偏移。
            
            const dx = bone.x - agent.px;
            const dy = bone.y - agent.py;

            // 等角投影轉換
            const screenBoneX = dx; 
            const screenBoneY = dy * ISO_SCALE_Y - (bone.z - groundZ) * ISO_SCALE_Y;

            ctx.save();
            ctx.globalAlpha = bone.alpha * alpha;
            ctx.translate(screenBoneX, screenBoneY);
            ctx.rotate(bone.angle);
            
            // 影子 (簡單圓形)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(0, (bone.z - groundZ) * ISO_SCALE_Y, bone.radius, bone.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 主體
            ctx.fillStyle = bone.color;
            ctx.beginPath();
            ctx.arc(0, 0, bone.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 高光
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(-bone.radius * 0.3, -bone.radius * 0.3, bone.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    /**
     * 計算死亡進度（0.0 = 剛死，1.0 = 完全消失）
     * [TODO: RAGDOLL] 未來可拆分為 collapse phase / settle phase
     */
    public static getDeathProgress(agent: Agent): number {
        if (!agent.deathTimer || agent.deathTimer <= 0) return 0;
        // [ARCH] SSOT: 與 AgentManager.updateDeathState 使用同一個 DEATH_ANIM_DURATION
        const duration = agent.DEATH_ANIM_DURATION; 
        return Math.min(1.0, agent.deathTimer / duration);
    }
}
