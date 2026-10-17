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
    /** 只准累加（+=／-=）的模組：衝量、牽引、瞬移補償等；其他寫法（=、*=、…）算違規。 */
    accumulators?: readonly string[];
    /** 生成／死亡重設／編輯器命令等生命週期寫入者。 */
    lifecycle?: readonly string[];
    note?: string;
}

export const AGENT_FIELD_OWNERS: Partial<Record<AgentField, AgentFieldOwnership>> = {
    physics: {
        group: 'physics',
        kind: 'domain',
        owners: ['engine/physics/PhysicsEngine.ts', 'engine/systems/movement/MotionEngine.ts'],
        accumulators: [
            'engine/systems/HazardSystem.ts',
            'engine/systems/combat/CCManager.ts',
            'engine/systems/combat/SkillExecutor.ts',
            'engine/systems/movement/MotionCommands.ts',
            'engine/systems/movement/MovementSystem.ts',
            'engine/systems/movement/StackingResolver.ts',
        ],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '積分與 z／vz 的直接改寫只在 PhysicsEngine（startVoidFall、absorbGroundShift 是給別人呼叫的 API）；MotionEngine 只在抵達時阻尼速度；其餘模組只准對速度／偏移 +=。',
    },
    isMoving: {
        group: 'locomotion',
        kind: 'domain',
        owners: [
            'engine/systems/movement/MotionCommands.ts',
            'engine/systems/movement/MovementSystem.ts',
            'engine/systems/movement/MotionEngine.ts',
        ],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '移動域：起步在 MovementSystem、推進與抵達在 MotionEngine、其他系統一律呼叫 MotionCommands.stopMovement。',
    },
    path: {
        group: 'locomotion',
        kind: 'domain',
        owners: [
            'engine/systems/movement/MotionCommands.ts',
            'engine/systems/movement/MovementSystem.ts',
            'engine/systems/movement/MotionEngine.ts',
        ],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '與 isMoving 同域。停止一律以新陣列重設（stopMovement）：path 與 trajectory 起步時是同一個陣列，不可用 length = 0 清空。',
    },
    trajectory: {
        group: 'locomotion',
        kind: 'domain',
        owners: ['engine/systems/movement/MovementSystem.ts', 'engine/systems/movement/MotionEngine.ts'],
        note: '落點預覽與投射物讀它；stopMovement 不動它。',
    },
    moveSpeedMult: {
        group: 'locomotion',
        kind: 'single',
        owners: ['engine/systems/movement/MovementSystem.ts'],
        note: '只代表 AI 要求的速度倍率。敵方危害的減速由 MovementSystem 每 tick 呼叫 HazardSystem.getHazardSpeedMult 算出，交給 MotionEngine 取 min。',
    },
    shield: {
        group: 'vitals',
        kind: 'domain',
        owners: ['engine/systems/combat/DirectDamage.ts', 'engine/systems/combat/CCManager.ts'],
        note: '戰鬥域：扣盾只在 DirectDamage.absorbWithShield（DamageCalculator 與 applyDirectDamage 共用），加盾在 CCManager 的 SHIELD 施加。',
    },
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
