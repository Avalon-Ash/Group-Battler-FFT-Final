/**
 * AgentDerived — 由 Agent 狀態欄位推導的唯讀值（STATE_OWNERSHIP_DESIGN P7b）
 * -----------------------------------------------------------------------------
 *  職責：施法中的 AI 狀態（CASTING_ULT／ACTIVE／BASIC）不再存進 aiState，改由施法域欄位
 *        （castingSkillIdx＋該技能的 tag）推導。aiState 只剩 BT 一個寫入者。
 *  上游：StatusActivity（CAST_ULT／CAST_ACTIVE 狀態圖示）、UI 選擇器與檢視器標籤。
 *  [ARCH] Agent 是純資料，這裡只放純函式；不寫入任何欄位。
 */

import { AIState } from '../types/Enums';
import type { Agent } from './Agent';

/** 施法中回傳對應的 CASTING_* 狀態，否則 null */
export function castingAiState(a: Pick<Agent, 'castingSkillIdx' | 'skills'>): AIState | null {
    if (a.castingSkillIdx < 0) return null;
    const tag = a.skills[a.castingSkillIdx]?.tag;
    if (tag === 'ULT') return AIState.CASTING_ULT;
    if (tag === 'ACTIVE') return AIState.CASTING_ACTIVE;
    return AIState.CASTING_BASIC;
}

/** 顯示用的 AI 狀態：施法中以施法狀態為準，其餘照 BT 寫的 aiState */
export function displayAiState(a: Pick<Agent, 'castingSkillIdx' | 'skills' | 'aiState'>): AIState {
    return castingAiState(a) ?? a.aiState;
}
