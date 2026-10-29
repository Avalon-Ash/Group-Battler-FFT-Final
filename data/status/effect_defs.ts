// ╔══════════════════════════════════════════════════════════╗
// ║  [DATA] 狀態效果定義表（ECS-lite S1）                     ║
// ║  職責：17 種持續效果規則資料（極性、硬控制與遞減類別、施加清洗）║
// ║  對齊 CCManager.applyCC 既有邏輯。                         ║
// ╚══════════════════════════════════════════════════════════╝

import type { EffectKind } from '../../types';

/** 遞減類別：迷惑＝恐懼＋變形。位移與緩速不吃遞減。 */
export type DRCategory = 'stun' | 'silence' | 'disorient' | 'root' | 'banish' | 'taunt';

export interface EffectDef {
    polarity: 'BUFF' | 'DEBUFF';     // 取代 CCManager 內 isBuff／isDebuff 陣列
    hardCC: boolean;                 // 硬控制：多段技能一次施放只套一次，且吃遞減（DR）
    drCategory: DRCategory | null;   // 遞減類別（WoW 式）：同類別共用遞減層數；非硬控為 null
    clearsOnApply: readonly EffectKind[]; // BANISH 清 ROOT、FEAR
}

export const EFFECT_DEFS: Readonly<Record<EffectKind, EffectDef>> = {
    STUN: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'stun',
        clearsOnApply: [],
    },
    SILENCE: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'silence',
        clearsOnApply: [],
    },
    ROOT: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'root',
        clearsOnApply: [],
    },
    FEAR: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'disorient',
        clearsOnApply: [],
    },
    TAUNT: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'taunt',
        clearsOnApply: [],
    },
    BLIND: {
        polarity: 'DEBUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    BANISH: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'banish',
        clearsOnApply: ['ROOT', 'FEAR'],
    },
    STASIS: {
        polarity: 'DEBUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    POLYMORPH: {
        polarity: 'DEBUFF',
        hardCC: true,
        drCategory: 'disorient',
        clearsOnApply: [],
    },
    INVINCIBLE: {
        polarity: 'BUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    VULNERABLE: {
        polarity: 'DEBUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    HASTE: {
        polarity: 'BUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    REFLECT: {
        polarity: 'BUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    LIFESTEAL: {
        polarity: 'BUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    SLOW: {
        polarity: 'DEBUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    DOT: {
        polarity: 'DEBUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
    HOT: {
        polarity: 'BUFF',
        hardCC: false,
        drCategory: null,
        clearsOnApply: [],
    },
};

/** 每個遞減類別包含哪些效果（由 EFFECT_DEFS.drCategory 反推；ControlSystem 用它判斷「該類別的控制是否還在生效」）。 */
export const DR_CATEGORY_KINDS: Readonly<Record<DRCategory, readonly EffectKind[]>> = (() => {
    const out: Record<DRCategory, EffectKind[]> = { stun: [], silence: [], disorient: [], root: [], banish: [], taunt: [] };
    for (const kind of Object.keys(EFFECT_DEFS) as EffectKind[]) {
        const category = EFFECT_DEFS[kind].drCategory;
        if (category) out[category].push(kind);
    }
    return out;
})();
