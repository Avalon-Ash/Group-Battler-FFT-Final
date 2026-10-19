// ╔══════════════════════════════════════════════════════════╗
// ║  StatusActivity — 「這個狀態現在成立嗎」的純判斷           ║
// ║  職責：Agent 欄位 → STATUS_PARTS 鍵是否成立（唯讀、零配置） ║
// ║  上游：Agent 狀態欄位（計時器、visualStatus、aiState）      ║
// ║  下游：StatusPartPainter                                    ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import { AIState } from "../../../types";
import { castingAiState } from "../../core/AgentDerived";
import type { StatusPartKey } from "../../../data/vfx/status_parts";

/** 易傷（VULNERABLE）的視覺門檻：血量比例低於此值才顯示（沿用 AgentVFXSystem 原條件） */
export const VULNERABLE_VISUAL_HP_RATIO = 0.25;

export function isStatusActive(key: StatusPartKey, a: Agent): boolean {
    switch (key) {
        case 'BANISH': return a.banished && a.effects.BANISH.remaining > 0;
        case 'STASIS': return a.effects.STASIS.remaining > 0;
        case 'FROZEN': return a.visualStatus === 'FROZEN';
        // 冰凍的暈眩由 FROZEN 的冰晶表達，不再疊暈眩星
        case 'STUN': return a.effects.STUN.remaining > 0 && a.visualStatus !== 'FROZEN';
        case 'CC_INTERRUPT': return a.aiState === AIState.CC_INTERRUPTED && a.effects.STUN.remaining <= 0;
        case 'SILENCE': return a.effects.SILENCE.remaining > 0;
        case 'ROOT': return a.effects.ROOT.remaining > 0;
        case 'FEAR': return a.effects.FEAR.remaining > 0;
        case 'TAUNT': return a.effects.TAUNT.remaining > 0;
        case 'BLIND': return a.effects.BLIND.remaining > 0;
        case 'POLYMORPH': return a.visualStatus === 'POLYMORPH';
        case 'INVINCIBLE': return a.visualStatus === 'INVINCIBLE';
        case 'POISON': return a.effects.DOT.remaining > 0 && a.effects.DOT.value > 0 && a.effects.DOT.tag === 'POISON';
        case 'BURN': return a.effects.DOT.remaining > 0 && a.effects.DOT.value > 0 && a.effects.DOT.tag === 'BURN';
        case 'REGEN': return a.effects.HOT.remaining > 0;
        case 'VULNERABLE': return a.maxHp > 0 && a.hp / a.maxHp < VULNERABLE_VISUAL_HP_RATIO;
        case 'CAST_ULT': return castingAiState(a) === AIState.CASTING_ULT;
        case 'CAST_ACTIVE': return castingAiState(a) === AIState.CASTING_ACTIVE;
        case 'EVADING': return a.aiState === AIState.EVADING_URGENT;
        default: return false;
    }
}
