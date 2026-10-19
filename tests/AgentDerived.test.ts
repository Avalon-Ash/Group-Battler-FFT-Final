import { describe, it, expect } from 'vitest';
import { castingAiState, displayAiState } from '../engine/core/AgentDerived';
import { AIState } from '../types';

const skill = (tag: 'ULT' | 'ACTIVE' | 'BASIC') => ({ tag }) as never;

describe('施法中的 AI 狀態由施法域推導（STATE_OWNERSHIP_DESIGN P7b）', () => {
    it('castingSkillIdx 指到的技能 tag 決定 CASTING_*', () => {
        const a = { castingSkillIdx: 0, skills: [skill('ULT'), skill('ACTIVE'), skill('BASIC')], aiState: AIState.TRACKING };
        expect(castingAiState(a)).toBe(AIState.CASTING_ULT);
        a.castingSkillIdx = 1;
        expect(castingAiState(a)).toBe(AIState.CASTING_ACTIVE);
        a.castingSkillIdx = 2;
        expect(castingAiState(a)).toBe(AIState.CASTING_BASIC);
    });

    it('施法中 BT 改寫 aiState 不影響顯示；結束施法就回到 BT 的狀態', () => {
        const a = { castingSkillIdx: 0, skills: [skill('ULT')], aiState: AIState.EVADING_URGENT };
        expect(displayAiState(a)).toBe(AIState.CASTING_ULT);
        a.castingSkillIdx = -1;
        expect(castingAiState(a)).toBeNull();
        expect(displayAiState(a)).toBe(AIState.EVADING_URGENT);
    });
});
