// [SSOT] Agent 欄位所有權表（docs/STATE_OWNERSHIP_DESIGN.md §3.3 方案 C）。
// 純資料、零執行期成本：只由 tests/AgentOwnership.test.ts 讀取，掃描原始碼中對每個欄位的寫入，
// 不在 owners ∪ lifecycle 內的寫入點記為違規，違規清單以 tests/agent-ownership.baseline.json 棘輪往下收斂。
// 目前只涵蓋 P0～P2 處理的欄位；後續各期把負責的欄位加進來，全部填完後改為 Record<AgentField, …>。
// 路徑一律以 repo 根目錄為基準、使用 `/`。Agent.ts 本身（建構／reset／saveState）不掃描。

import type { Agent } from './Agent';

export type AgentField = Exclude<keyof Agent, 'saveState' | 'reset'>;

export type AgentGroup =
    | 'identity' | 'stats' | 'vitals' | 'casting' | 'ai' | 'locomotion'
    | 'physics' | 'status' | 'death' | 'visual' | 'editor';

export interface AgentFieldOwnership {
    group: AgentGroup;
    /** single：只有一個模組寫；domain：同一 tick 階段、互相知道對方的一組模組視為同一擁有者。 */
    kind: 'single' | 'domain';
    owners: readonly string[];
    /** 生成／死亡重設／編輯器命令等生命週期寫入者。 */
    lifecycle?: readonly string[];
    note?: string;
}

export const AGENT_FIELD_OWNERS: Partial<Record<AgentField, AgentFieldOwnership>> = {
    hp: {
        group: 'vitals',
        kind: 'single',
        owners: ['engine/systems/combat/DirectDamage.ts'],
        lifecycle: ['engine/systems/agentManager.ts', 'engine/systems/ui/UICommandSystem.ts'],
        note: '寫入 API：applyDirectDamage／applyHeal／applyLethal。死亡流程仍由呼叫端交給 agentManager.handleDeadState。',
    },
    trailHistory: {
        group: 'locomotion',
        kind: 'single',
        owners: ['engine/systems/PhysicsSystem.ts'],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '繪製位置（px + physics）的最近軌跡，衝刺殘影與飛行緞帶讀它。MotionEngine 曾經也寫（飛行單位會重複推入），已移除。',
    },
    ccVisual: {
        group: 'status',
        kind: 'domain',
        owners: ['engine/systems/combat/CCManager.ts', 'engine/systems/status/ControlSystem.ts'],
        note: '狀態域：CCManager 施加、ControlSystem 到期清除。',
    },
    visualStatus: {
        group: 'visual',
        kind: 'single',
        owners: ['engine/systems/AnimationSystem.ts'],
        note: '每 tick 由 ccVisual 與 actionState 推導；模擬層不得讀寫（PhysicsEngine 改讀 polymorphTimer）。',
    },
    hitFlashTimer: {
        group: 'visual',
        kind: 'single',
        owners: ['engine/systems/AnimationSystem.ts'],
        note: '模擬層透過 AnimationSystem 匯出的 triggerHitFlash 觸發；DirectorSystem 唯讀。',
    },
    visualOffset: {
        group: 'visual',
        kind: 'single',
        owners: ['engine/systems/AnimationSystem.ts'],
        note: '受擊抖動；經 AnimationSystem 匯出的 triggerHitShake 寫入。',
    },
};
