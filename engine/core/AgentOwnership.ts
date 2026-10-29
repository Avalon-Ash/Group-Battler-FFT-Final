// [SSOT] Agent 欄位所有權表（docs/STATE_OWNERSHIP_DESIGN.md §3.3 方案 C）。
// 純資料、零執行期成本：只由 tests/AgentOwnership.test.ts 讀取，掃描原始碼中對每個欄位的寫入，
// 不在 owners ∪ lifecycle 內的寫入點記為違規，違規清單以 tests/agent-ownership.baseline.json 棘輪往下收斂。
// 目前只涵蓋 P0～P2 處理的欄位；後續各期把負責的欄位加進來，全部填完後改為 Record<AgentField, …>。
// 路徑一律以 repo 根目錄為基準、使用 `/`。Agent.ts 本身（建構）與 AgentLifecycle.ts（saveAgentState／resetAgent）不掃描。

import type { Agent } from './Agent';

export type AgentField = keyof Agent;

type AgentGroup =
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
        note: '只代表 AI 要求的速度倍率。敵方危害（HazardSystem.getHazardSpeedMult）與 SLOW 狀態（Effects.slowSpeedMult）的減速由 MovementSystem 每 tick 算出、取較慢者，交給 MotionEngine 取 min。',
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
    lastHitSourceId: {
        group: 'vitals',
        kind: 'single',
        owners: ['engine/systems/combat/DirectDamage.ts'],
        note: '擊殺歸屬：一律經 applyDirectDamage／applyLethal 的 sourceId 參數寫入（撞擊、地形危害也是）。護盾完全吸收、未扣到 HP 的傷害不更新歸屬。',
    },
    banished: {
        group: 'status',
        kind: 'single',
        owners: ['engine/systems/status/ControlSystem.ts'],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '放逐旗標只在 ControlSystem（syncBanished／clearBanishedFlag）寫入；CCManager、ZoneSystem 呼叫這兩個 API。PhysicsEngine 只讀。',
    },
    effects: {
        group: 'status',
        kind: 'domain',
        owners: [
            'engine/systems/combat/CCManager.ts',
            'engine/systems/status/ControlSystem.ts',
            'engine/systems/status/EffectSystem.ts',
            'engine/physics/PhysicsEngine.ts',
        ],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '狀態域：CCManager 施加、ControlSystem 遞減控制類、EffectSystem 遞減持續傷害與治療。PhysicsEngine 失去地面時強加 0.1s STUN（既有行為）。',
    },
    aiState: {
        group: 'ai',
        kind: 'single',
        owners: ['engine/ai/BTRegistry.ts'],
        note: 'AI 行為狀態只由 BT 節點寫入。施法中的 CASTING_* 不再存進來，改由 castingSkillIdx 推導（engine/core/AgentDerived.ts，P7b）。',
    },
    escapeCooldown: {
        group: 'ai',
        kind: 'domain',
        owners: ['engine/ai/BTRegistry.ts', 'engine/systems/status/CooldownSystem.ts'],
        note: '逃生冷卻：BT（EscapeWarning）設定、CooldownSystem 遞減（P10 自 game.ts 移入），TargetingSystem 只讀。',
    },
    _interruptCooldown: {
        group: 'casting',
        kind: 'domain',
        owners: [
            'engine/systems/combat/CastingEngine.ts',
            'engine/systems/combat/CombatSystem.ts',
            'engine/systems/status/CooldownSystem.ts',
        ],
        lifecycle: ['engine/systems/agentManager.ts'],
        note: '施法域：中斷時由 CastingEngine 設定、breakCast(lockout) 延長（BT 不再直寫）、CooldownSystem 遞減。秒數在 CAST_LOCKOUT。',
    },
    ccVisual: {
        group: 'status',
        kind: 'domain',
        owners: ['engine/systems/combat/CCManager.ts', 'engine/systems/status/ControlSystem.ts'],
        note: '狀態域：CCManager 施加、ControlSystem 到期清除。',
    },
    view: {
        group: 'visual',
        kind: 'domain',
        owners: ['engine/presentation/AnimationSystem.ts', 'engine/core/ViewCommands.ts'],
        note: '視覺狀態容器（AgentView）；模擬層透過 ViewCommands 匯出的純函式寫入；AnimationSystem 推導與衰減。',
    },
};
