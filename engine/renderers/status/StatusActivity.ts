// ╔══════════════════════════════════════════════════════════╗
// ║  StatusActivity — 「這個狀態現在成立嗎」的純判斷           ║
// ║  職責：Agent 欄位 → STATUS_PARTS 鍵是否成立、剩餘時間比例    ║
// ║        （唯讀、零配置；單位身上的零件層與 HUD 圖示列共用）    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import { AIState, type EffectSlot } from "../../../types";
import { castingAiState } from "../../core/AgentDerived";
import type { StatusPartKey } from "../../../data/vfx/status_parts";

/** 狀態對應的效果槽（有計時的狀態）；沒有計時（護盾、施法／AI 提示）回傳 null。不配置物件。 */
function statusSlot(key: StatusPartKey, a: Agent): EffectSlot | null {
    switch (key) {
        case 'STUN': case 'FROZEN': case 'CC_INTERRUPT': return a.effects.STUN;
        case 'SILENCE': return a.effects.SILENCE;
        case 'ROOT': return a.effects.ROOT;
        case 'FEAR': return a.effects.FEAR;
        case 'TAUNT': return a.effects.TAUNT;
        case 'BLIND': return a.effects.BLIND;
        case 'BANISH': return a.effects.BANISH;
        case 'STASIS': return a.effects.STASIS;
        case 'POLYMORPH': return a.effects.POLYMORPH;
        case 'INVINCIBLE': return a.effects.INVINCIBLE;
        case 'VULNERABLE': return a.effects.VULNERABLE;
        case 'SLOW': return a.effects.SLOW;
        case 'HASTE': return a.effects.HASTE;
        case 'REFLECT': return a.effects.REFLECT;
        case 'LIFESTEAL': return a.effects.LIFESTEAL;
        case 'POISON': case 'BURN': return a.effects.DOT;
        case 'REGEN': return a.effects.HOT;
        default: return null;
    }
}

/**
 * 剩餘時間比例 0..1（圖示列的扇形遮罩）：有計時的狀態＝remaining／max（沒有記錄最大值時視為滿）；
 * 護盾＝shield／maxShield；沒有時間概念的回傳 1。
 */
export function statusFraction(key: StatusPartKey, a: Agent): number {
    if (key === 'SHIELD') return a.maxShield > 0 ? Math.max(0, Math.min(1, a.shield / a.maxShield)) : 1;
    const slot = statusSlot(key, a);
    if (!slot || slot.max <= 0) return 1;
    return Math.max(0, Math.min(1, slot.remaining / slot.max));
}

export function isStatusActive(key: StatusPartKey, a: Agent): boolean {
    switch (key) {
        // 凝滯用同一個放逐槽位表達，由 STASIS 本身畫（和冰凍蓋過暈眩同理）
        case 'BANISH': return a.banished && a.effects.BANISH.remaining > 0 && a.effects.STASIS.remaining <= 0;
        case 'STASIS': return a.effects.STASIS.remaining > 0;
        case 'FROZEN': return a.view.visualStatus === 'FROZEN';
        // 冰凍的暈眩由 FROZEN 的冰晶表達，不再疊暈眩星
        case 'STUN': return a.effects.STUN.remaining > 0 && a.view.visualStatus !== 'FROZEN';
        case 'CC_INTERRUPT': return a.aiState === AIState.CC_INTERRUPTED && a.effects.STUN.remaining <= 0;
        case 'SILENCE': return a.effects.SILENCE.remaining > 0;
        case 'ROOT': return a.effects.ROOT.remaining > 0;
        case 'FEAR': return a.effects.FEAR.remaining > 0;
        case 'TAUNT': return a.effects.TAUNT.remaining > 0;
        case 'BLIND': return a.effects.BLIND.remaining > 0;
        case 'POLYMORPH': return a.view.visualStatus === 'POLYMORPH';
        case 'INVINCIBLE': return a.view.visualStatus === 'INVINCIBLE';
        case 'SLOW': return a.effects.SLOW.remaining > 0;
        case 'POISON': return a.effects.DOT.remaining > 0 && a.effects.DOT.value > 0 && a.effects.DOT.tag === 'POISON';
        case 'BURN': return a.effects.DOT.remaining > 0 && a.effects.DOT.value > 0 && a.effects.DOT.tag === 'BURN';
        case 'REGEN': return a.effects.HOT.remaining > 0;
        case 'VULNERABLE': return a.effects.VULNERABLE.remaining > 0;
        case 'HASTE': return a.effects.HASTE.remaining > 0;
        case 'REFLECT': return a.effects.REFLECT.remaining > 0;
        case 'LIFESTEAL': return a.effects.LIFESTEAL.remaining > 0;
        case 'SHIELD': return a.shield > 0;
        case 'CAST_ULT': return castingAiState(a) === AIState.CASTING_ULT;
        case 'CAST_ACTIVE': return castingAiState(a) === AIState.CASTING_ACTIVE;
        case 'EVADING': return a.aiState === AIState.EVADING_URGENT;
        default: return false;
    }
}
