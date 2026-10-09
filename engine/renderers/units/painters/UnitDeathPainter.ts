// engine/renderers/units/painters/UnitDeathPainter.ts
import { Agent, MapConfig, Team } from "../../../../types";
import { RagdollPhysics, getDeathPhase } from "../../../systems/unit/RagdollPhysics";
import { ISO_SCALE_Y, BLOCK_HEIGHT } from "../../../../constants";
import { UNIT_APPEARANCE } from "../../../../data/units/appearance";

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
        cfg: Partial<MapConfig> = {},
        terrainHeight: number,
        simDt: number = 0.016 // 預設 60fps，若外部能傳更好
    ): void {
        if (agent.fullyDead) return;
        if (!agent.ragdoll || agent.ragdoll.length === 0) return;

        // [ARCH] 讀取外觀 Profile
        const factionId = agent.team === Team.BLUE ? Team.BLUE : Team.RED;
        const profile = UNIT_APPEARANCE[factionId].roles[agent.role];

        const progress = UnitDeathPainter.getDeathProgress(agent);
        // 使用傳入的地形高度計算地面 Z
        const groundZ = terrainHeight * BLOCK_HEIGHT;

        // [ARCH] 物理更新就地發生在 Draw 階段
        const phase = getDeathPhase(progress);
        RagdollPhysics.update(agent.ragdoll, simDt, groundZ, phase);
        RagdollPhysics.applyFade(agent.ragdoll, progress);

        // 繪製骨骼
        for (const bone of agent.ragdoll) {
            if (bone.alpha <= 0) continue;

            // 骨骼座標是世界空間，但 px/py 已經平移到 agent 位置
            const dx = bone.x - agent.px;
            const dy = bone.y - agent.py;

            const screenBoneX = dx; 
            const screenBoneY = dy - (bone.z - groundZ) * ISO_SCALE_Y;

            ctx.save();
            ctx.globalAlpha = bone.alpha * alpha;
            ctx.translate(screenBoneX, screenBoneY);
            ctx.rotate(bone.angle);
            
            // 影子 (簡單圓形)
            const shadowOffsetY = (bone.z - groundZ) * ISO_SCALE_Y;

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(0, shadowOffsetY, bone.radius, bone.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 主體 - 從 Profile 讀取顏色
            // 依據骨骼類型或簡單分配，目前 bone.color 是由 RagdollFactory 寫入。
            // 為了對齊 Profile，我們在渲染時強制覆蓋或優先使用 Profile 顏色。
            // 死亡碎塊通常使用 primaryColor。
            ctx.fillStyle = profile.primaryColor;
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
     */
    public static getDeathProgress(agent: Agent): number {
        if (!agent.deathTimer || agent.deathTimer <= 0) return 0;
        const duration = agent.DEATH_ANIM_DURATION; 
        return Math.min(1.0, agent.deathTimer / duration);
    }
}
