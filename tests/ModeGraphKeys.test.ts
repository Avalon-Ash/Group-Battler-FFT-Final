import { describe, it, expect } from 'vitest';
import { AI_MODE_GRAPH, PLAYER_MODE_GRAPH, AI_PROFILE_BY_ROLE, type BTDefOf, type AIModeGraph } from '../data/ai_profiles';
import type { BTNodeKey } from '../engine/ai/BTRegistry';
import { validateModeGraph } from '../engine/ai/ModeGraphValidation';
import { Role } from '../engine/types/Enums';

describe('G4 節點鍵型別與模式圖驗證', () => {
    it('手寫定義打錯鍵是編譯錯誤（npm run lint 會擋）', () => {
        const ok: BTDefOf<BTNodeKey> = { type: 'ACTION', name: 'ok', key: 'Wait' };
        // @ts-expect-error 登錄表沒有這個鍵
        const bad: BTDefOf<BTNodeKey> = { type: 'ACTION', name: 'bad', key: 'NoSuchAction' };
        expect(ok.key).toBe('Wait');
        expect(bad.key).toBe('NoSuchAction');
    });

    it('兩張出廠圖與每個職業的 profile 都合格', () => {
        expect(validateModeGraph(AI_MODE_GRAPH)).toEqual([]);
        expect(validateModeGraph(PLAYER_MODE_GRAPH)).toEqual([]);
        for (const role of Object.values(Role)) expect(validateModeGraph(AI_PROFILE_BY_ROLE[role])).toEqual([]);
    });

    it('壞掉的圖會被回報（執行期形狀的圖，例如編輯器載入的資料）', () => {
        const g = JSON.parse(JSON.stringify(PLAYER_MODE_GRAPH)) as AIModeGraph;
        g.modes.HOLD!.tree = { type: 'ACTION', name: 'Typo', key: 'HoldGrund' };
        const problems = validateModeGraph(g);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('HoldGrund');
    });
});
