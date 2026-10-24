// ╔══════════════════════════════════════════════════════════╗
// ║  [DATA] 狀態效果定義表（ECS-lite S1）                     ║
// ║  職責：16 種持續效果規則資料（極性、是否硬控制、施加清洗） ║
// ║  對齊 CCManager.applyCC 既有邏輯。                         ║
// ╚══════════════════════════════════════════════════════════╝

import type { EffectKind } from '../../types';

export interface EffectDef {
    polarity: 'BUFF' | 'DEBUFF';     // 取代 CCManager 內 isBuff／isDebuff 陣列
    hardCC: boolean;                 // 取代 isHardCC 陣列（DR 只套用在這些）
    clearsOnApply: readonly EffectKind[]; // BANISH 清 ROOT、FEAR
}

export const EFFECT_DEFS: Readonly<Record<EffectKind, EffectDef>> = {
    STUN: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: [],
    },
    SILENCE: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: [],
    },
    ROOT: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: [],
    },
    FEAR: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: [],
    },
    TAUNT: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: [],
    },
    BLIND: {
        polarity: 'DEBUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    BANISH: {
        polarity: 'DEBUFF',
        hardCC: true,
        clearsOnApply: ['ROOT', 'FEAR'],
    },
    STASIS: {
        polarity: 'DEBUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    POLYMORPH: {
        polarity: 'DEBUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    INVINCIBLE: {
        polarity: 'BUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    VULNERABLE: {
        polarity: 'DEBUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    HASTE: {
        polarity: 'BUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    REFLECT: {
        polarity: 'BUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    LIFESTEAL: {
        polarity: 'BUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    DOT: {
        polarity: 'DEBUFF',
        hardCC: false,
        clearsOnApply: [],
    },
    HOT: {
        polarity: 'BUFF',
        hardCC: false,
        clearsOnApply: [],
    },
};
