import type { Agent } from "../../core/Agent";

export interface DirectDamageResult {
    /** 被護盾吸收的量。 */
    absorbed: number;
    /** 實際扣到 HP 的量（護盾吸收後）。 */
    dealt: number;
}

/**
 * [OWNER] 生命值（hp / lastHitSourceId）的單一寫入入口（docs/STATE_OWNERSHIP_DESIGN.md §3.4 vitals）。
 * 其他模組一律呼叫下列函式，不直接寫 agent.hp。
 * sourceId：擊殺歸屬。傳入 id 就覆寫 lastHitSourceId；null 代表無可歸屬的來源（環境、自傷），沿用先前的歸屬。
 */

/** 護盾扣減的單一入口：最多吸收 amount，回傳實際吸收量。DamageCalculator 與 applyDirectDamage 共用。 */
export function absorbWithShield(agent: Agent, amount: number): number {
    if (agent.shield <= 0 || amount <= 0) return 0;
    const absorbed = Math.min(agent.shield, amount);
    agent.shield -= absorbed;
    return absorbed;
}

/**
 * 傷害（預設先扣護盾，再扣 HP；HP 下限為 0）。環境 / 狀態類傷害（墜落、地面危害、DoT）與技能傷害共用。
 * bypassShield = true 為真實傷害（例：墜落傷害；技能傷害的護盾已在 DamageCalculator 扣過）。
 */
export function applyDirectDamage(agent: Agent, amount: number, bypassShield: boolean = false, sourceId: string | null = null): DirectDamageResult {
    const absorbed = bypassShield ? 0 : absorbWithShield(agent, amount);
    const remaining = amount - absorbed;

    if (remaining > 0) {
        agent.hp = Math.max(0, agent.hp - remaining);
        if (sourceId) agent.lastHitSourceId = sourceId;
        return { absorbed, dealt: remaining };
    }
    return { absorbed, dealt: 0 };
}

/** 治療：HP 上限為 maxHp。回傳實際增加的量。 */
export function applyHeal(agent: Agent, amount: number): number {
    const before = agent.hp;
    agent.hp = Math.max(0, Math.min(agent.maxHp, before + amount));
    return agent.hp - before;
}

/** 致命一擊（斬殺）：HP 直接歸零。死亡流程仍由呼叫端交給 agentManager.handleDeadState。 */
export function applyLethal(agent: Agent, sourceId: string | null = null): void {
    agent.hp = 0;
    if (sourceId) agent.lastHitSourceId = sourceId;
}
