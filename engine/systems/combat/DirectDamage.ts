import type { Agent } from "../../core/Agent";

export interface DirectDamageResult {
    /** 被護盾吸收的量。 */
    absorbed: number;
    /** 實際扣到 HP 的量（護盾吸收後）。 */
    dealt: number;
}

/**
 * 環境 / 狀態類傷害（無來源技能：墜落、地面危害、DoT）的單一 HP 寫入入口。
 * - 預設先扣護盾，再扣 HP；HP 下限為 0。
 * - bypassShield = true 為真實傷害（例：墜落傷害）。
 * 技能傷害仍走 DamageCalculator → SkillExecutor 管線，不經此處。
 */
export function applyDirectDamage(agent: Agent, amount: number, bypassShield: boolean = false): DirectDamageResult {
    let remaining = amount;
    let absorbed = 0;

    if (!bypassShield && agent.shield > 0) {
        absorbed = Math.min(agent.shield, remaining);
        agent.shield -= absorbed;
        remaining -= absorbed;
    }

    if (remaining > 0) {
        agent.hp = Math.max(0, agent.hp - remaining);
        return { absorbed, dealt: remaining };
    }
    return { absorbed, dealt: 0 };
}
