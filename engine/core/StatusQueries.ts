// ╔══════════════════════════════════════════════════════════╗
// ║ StatusQueries — live slots 的唯讀正規化，零配置。        ║
// ║ [ARCH] 不依賴 presentation / renderer；receipt 只供顯示。║
// ╚══════════════════════════════════════════════════════════╝
import type { Agent } from './Agent';
import type { EffectKind, SpecialVisualStatus } from '../../types';
import { STATUS_DISPLAY, type StatusDisplayKey } from '../../data/status/status_display';

export function statusDisplayKey(kind: EffectKind, agent: Agent, bodyStatus: SpecialVisualStatus = agent.ccVisual): StatusDisplayKey | null {
    if (agent.effects[kind].remaining <= 0) return null;
    if (kind === 'STUN') return bodyStatus === 'FROZEN' ? 'FROZEN' : 'STUN';
    if (kind === 'BANISH' && agent.effects.STASIS.remaining > 0) return null;
    if (kind === 'HOT') return 'REGEN';
    if (kind === 'DOT') {
        const origin = agent.view.statusPresentation.effects.DOT.variant;
        if (origin.recorded) {
            if (origin.element === 'FIRE') return 'BURN';
            if (origin.element === 'POISON') return 'POISON';
            if (origin.element === 'BLOOD' || origin.element === 'PHYSICAL') return 'BLEED';
        }
        return agent.effects.DOT.tag === 'BURN' ? 'BURN' : 'DOT';
    }
    return kind;
}

/** 舊零件仍按原 DOT tag 畫；BLEED / generic DOT 新圖示屬 P3/P4。 */
export function isPersistentStatusActive(key: StatusDisplayKey, agent: Agent, bodyStatus: SpecialVisualStatus = agent.ccVisual): boolean {
    if (key === 'SHIELD') return agent.shield > 0;
    if (key === 'POISON' || key === 'BURN') {
        const dot = agent.effects.DOT;
        return dot.remaining > 0 && dot.value > 0 && dot.tag === key;
    }
    return statusDisplayKey(STATUS_DISPLAY[key].kind as EffectKind, agent, bodyStatus) === key;
}

export function statusProgress(key: StatusDisplayKey, agent: Agent): number {
    const kind = STATUS_DISPLAY[key].kind;
    const max = kind === 'SHIELD' ? agent.maxShield : agent.effects[kind].max;
    const remaining = kind === 'SHIELD' ? agent.shield : agent.effects[kind].remaining;
    return max > 0 ? Math.max(0, Math.min(1, remaining / max)) : 1;
}

export function statusAvailability(agent: Agent): 'ACTIVE' | 'BANISHED' | 'OUT_OF_BOUNDS' | 'DEAD' {
    if (agent.hp <= 0 || agent.fullyDead) return 'DEAD';
    if (agent.outOfBounds) return 'OUT_OF_BOUNDS';
    return agent.banished ? 'BANISHED' : 'ACTIVE';
}
