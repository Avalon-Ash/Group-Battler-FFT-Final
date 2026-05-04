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

export class UnitDeathPainter {

    /**
     * 繪製死亡中的單位（hp <= 0 且尚未 fullyDead）
     * 目前行為：空插槽，死亡單位由 UnitBodyPainter early return 不渲染
     * [TODO: RAGDOLL] 未來替換為物理驅動的布娃娃分解動畫
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        agent: Agent,
        visX: number,
        visY: number,
        alpha: number,
        t: number,
        cfg: MapConfig
    ): void {
        if (agent.fullyDead) return;

        // [TODO: RAGDOLL] 在此判斷 agent.deathTimer，切換到布娃娃模式
        // 目前直接回傳，讓 UnitBodyPainter 的 alpha 機制處理 fade-out
        // 本插槽存在的意義是確保未來擴充有明確的落點
        return;
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
