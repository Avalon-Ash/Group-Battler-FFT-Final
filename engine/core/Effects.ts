// ╔══════════════════════════════════════════════════════════╗
// ║  [CORE] 狀態效果純函式與槽位管理（ECS-lite S1）             ║
// ║  職責：17 種持續／控制效果固定槽位建構、重設與查詢 API。    ║
// ║  無狀態純函式，零每幀記憶體配置。                           ║
// ╚══════════════════════════════════════════════════════════╝

import type { EffectKind, EffectSlot, EffectSlots } from '../../types';

export const EFFECT_KINDS: readonly EffectKind[] = [
    'STUN',
    'SILENCE',
    'ROOT',
    'FEAR',
    'TAUNT',
    'BLIND',
    'BANISH',
    'STASIS',
    'POLYMORPH',
    'INVINCIBLE',
    'VULNERABLE',
    'HASTE',
    'REFLECT',
    'LIFESTEAL',
    'SLOW',
    'DOT',
    'HOT',
] as const;

function createEffectSlot(): EffectSlot {
    return {
        remaining: 0,
        max: 0,
        value: 0,
        tag: null,
        sourceId: null,
    };
}

export function createEffectSlots(): EffectSlots {
    return {
        STUN: createEffectSlot(),
        SILENCE: createEffectSlot(),
        ROOT: createEffectSlot(),
        FEAR: createEffectSlot(),
        TAUNT: createEffectSlot(),
        BLIND: createEffectSlot(),
        BANISH: createEffectSlot(),
        STASIS: createEffectSlot(),
        POLYMORPH: createEffectSlot(),
        INVINCIBLE: createEffectSlot(),
        VULNERABLE: createEffectSlot(),
        HASTE: createEffectSlot(),
        REFLECT: createEffectSlot(),
        LIFESTEAL: createEffectSlot(),
        SLOW: createEffectSlot(),
        DOT: createEffectSlot(),
        HOT: createEffectSlot(),
    };
}

export function resetEffectSlots(slots: EffectSlots): void {
    for (let i = 0; i < EFFECT_KINDS.length; i++) {
        const slot = slots[EFFECT_KINDS[i]];
        slot.remaining = 0;
        slot.max = 0;
        slot.value = 0;
        slot.tag = null;
        slot.sourceId = null;
    }
}

export function isEffectActive(agent: { effects: EffectSlots }, kind: EffectKind): boolean {
    return agent.effects[kind].remaining > 0;
}

export function effectRemaining(agent: { effects: EffectSlots }, kind: EffectKind): number {
    return agent.effects[kind].remaining;
}

/**
 * 緩速造成的移動速度倍率（1 = 不減速）。SLOW.value 是減速比例（0.65＝慢 65%），
 * 與敵方危害倍率、AI 要求的倍率取 min 由 MovementSystem／MotionEngine 負責（不寫進 Agent）。
 */
export function slowSpeedMult(agent: { effects: EffectSlots }): number {
    const slow = agent.effects.SLOW;
    return slow.remaining > 0 ? Math.max(0, 1 - slow.value) : 1;
}

export interface ApplyEffectOptions {
    max?: number;
    value?: number;
    tag?: string | null;
    sourceId?: string | null;
}

export function applyEffect(
    slots: EffectSlots,
    kind: EffectKind,
    duration: number,
    opts?: ApplyEffectOptions
): void {
    const slot = slots[kind];
    if (duration > slot.remaining) {
        slot.remaining = duration;
        slot.max = opts?.max !== undefined ? opts.max : duration;
    }
    if (opts?.value !== undefined) {
        slot.value = opts.value;
    }
    if (opts?.tag !== undefined) {
        slot.tag = opts.tag;
    }
    if (opts?.sourceId !== undefined) {
        slot.sourceId = opts.sourceId;
    }
}
