// ╔══════════════════════════════════════════════════════════╗
// ║  UnitDeathPainter — 死亡演出渲染插槽                    ║
// ║                                                          ║
// ║  目前實作：Ragdoll 骨骼物理散落 + alpha fade（v1 完成）         ║
// ║                                                          ║
// ║  架構缺口預留：                                          ║
// ║  [NEXT] 未來可拆分 collapse phase / settle phase 兩段動畫 ║
// ║  → 建議走獨立 RenderOpType.CORPSE，subLayer 在 UNIT 之後  ║
// ║  → deathTimer 由 AgentManager 在 hp<=0 時開始計時         ║
// ║  → fullyDead=true 時停止更新並從 agents 陣列移除          ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, MapConfig } from "../../../../types";
import { RagdollPhysics, getDeathPhase } from "../RagdollPhysics";
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
        const phase = getDeathPhase(progress);
        RagdollPhysics.update(agent.ragdoll, simDt, groundZ, phase);
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
            // [FIX BUG-2] dy (bone.y - agent.py) 已經是螢幕座標系（由 RagdollFactory 初始化時取得已 squashed 的 py）
            // 因此不應再乘以 ISO_SCALE_Y，否則會發生 double-squashing。
            const screenBoneX = dx; 
            const screenBoneY = dy - (bone.z - groundZ) * ISO_SCALE_Y;

            ctx.save();
            ctx.globalAlpha = bone.alpha * alpha;
            ctx.translate(screenBoneX, screenBoneY);
            ctx.rotate(bone.angle);
            
            // 影子 (簡單圓形)
            // [FIX BUG-1] 由於 ctx 已 translate 到骨骼視覺中心，且 screenBoneY 已扣除高度，
            // 此處 shadowOffsetY 應為「補回高度後的地面位置」
            const shadowOffsetY = (bone.z - groundZ) * ISO_SCALE_Y;

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(0, shadowOffsetY, bone.radius, bone.radius * 0.5, 0, 0, Math.PI * 2);
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
     * [NEXT] 未來可拆分為 collapse phase / settle phase 兩段動畫
     */
    public static getDeathProgress(agent: Agent): number {
        if (!agent.deathTimer || agent.deathTimer <= 0) return 0;
        // [ARCH] SSOT: 與 AgentManager.updateDeathState 使用同一個 DEATH_ANIM_DURATION
        const duration = agent.DEATH_ANIM_DURATION; 
        return Math.min(1.0, agent.deathTimer / duration);
    }
}
