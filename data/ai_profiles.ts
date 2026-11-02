
import { AIState, AIMode } from "../types";

/** 行為樹節點參數。鍵集合由 BTRegistry 實際使用者決定，新增鍵請同步擴充此型別。 */
export interface BTArgs {
    slot?: number;
    state?: AIState;
    threshold?: number;
    amount?: number;
}

export interface BTDef {
    type: 'SELECTOR' | 'SEQUENCE' | 'CONDITION' | 'ACTION';
    name: string;
    children?: BTDef[];
    key?: string; // Maps to Registry Key
    args?: BTArgs;
}

/** 狀態拓樸的一條邊：when 成立（或 unless 不成立）就轉移；同一時間依陣列順序取第一條，順序就是優先序。 */
export interface AIModeEdgeDef {
    from: readonly AIMode[] | '*';
    to: AIMode;
    when?: string;
    unless?: string;
}

export interface AIModeDef {
    tree: BTDef;
    /** 小樹回 FAILURE 時，同一次決策內改走這個模式 */
    onFailure?: AIMode;
}

const LAST_STAND_PUSH: BTDef = {
    type: 'SEQUENCE',
    name: 'Last Stand',
    children: [
        { type: 'CONDITION', name: 'Has Push/Pull?', key: 'HasPushPullSkill' },
        { type: 'ACTION', name: 'Push Away!', key: 'CastPushPull' }
    ]
};

const SKILL_PRIORITY: BTDef = {
    type: 'SELECTOR',
    name: 'Skill Priority',
    children: [
        // Slot 0 (Ult), Slot 1 (Active), Slot 2 (Basic)
        createSkillRoutine(0, "Ultimate"),
        createSkillRoutine(1, "Active"),
        createSkillRoutine(2, "Basic")
    ]
};

// 目標在普攻射程外：順手打得到別人就打；否則技能 → 追擊 → 走位 → 前進，全失敗轉 UNSTICK
const ENGAGE_TREE: BTDef = {
    type: 'SELECTOR',
    name: 'Engage Actions',
    children: [
        { type: 'ACTION', name: 'Strike Nearby', key: 'StrikeNearby' },
        SKILL_PRIORITY,
        // 追擊只拒絕「停下來的格子會塌陷」；被拒絕時走位，往目標挪但不踩塌陷格
        { type: 'ACTION', name: 'Stick To Target', key: 'ChaseTarget', args: { slot: 2 } },
        { type: 'ACTION', name: 'Reposition', key: 'Reposition' },
        { type: 'ACTION', name: 'Advance', key: 'Advance' }
    ]
};

// 目標在普攻射程內：只管出手；技能都在冷卻時追擊節點回 SUCCESS（就位等冷卻），不找路
const FIGHT_TREE: BTDef = {
    type: 'SELECTOR',
    name: 'Fight Actions',
    children: [
        SKILL_PRIORITY,
        { type: 'ACTION', name: 'Stick To Target', key: 'ChaseTarget', args: { slot: 2 } }
    ]
};

/**
 * AI 狀態拓樸：節點是模式，每個模式一棵小樹；模式之間只能走這裡列出的邊。
 *   DEAD／CONTROLLED —— 不能行動（全域，任何模式都會切過來）
 *   ACQUIRE          —— 沒有目標（場上沒有敵人）：等
 *   ENGAGE           —— 目標在普攻射程外：接敵
 *   FIGHT            —— 目標在普攻射程內：出手
 *   RETREAT          —— 站在塌陷格／敵方 hazard 上：逃；逃不掉轉 TRAPPED
 *   TRAPPED          —— 逃不掉：有推拉技能就用，否則原地戰鬥（SkillReady 不再因塌陷拒絕）
 *   UNSTICK          —— 打不到也走不到更近的地方：短暫等待後強制跳上鄰格
 *   FINALE           —— 背水一戰：地圖不再縮小，不逃，打到剩一方
 * 任何「移動」節點在 CanMove 為假（root/stun/放逐/恐懼）時必須失敗，不能回 RUNNING。
 */
export const AI_MODE_GRAPH: {
    initial: AIMode;
    modes: Record<AIMode, AIModeDef>;
    edges: readonly AIModeEdgeDef[];
} = {
    initial: 'ACQUIRE',
    modes: {
        DEAD: { tree: { type: 'ACTION', name: 'Dead Wait', key: 'Wait', args: { state: AIState.DEAD } } },
        CONTROLLED: { tree: { type: 'ACTION', name: 'CC Wait', key: 'Wait', args: { state: AIState.CC_INTERRUPTED } } },
        ACQUIRE: { tree: { type: 'ACTION', name: 'No Enemy', key: 'Wait', args: { state: AIState.IDLE } } },
        ENGAGE: { tree: ENGAGE_TREE, onFailure: 'UNSTICK' },
        FIGHT: { tree: FIGHT_TREE, onFailure: 'ENGAGE' },
        RETREAT: { tree: { type: 'ACTION', name: 'Run!', key: 'EscapeWarning' }, onFailure: 'TRAPPED' },
        TRAPPED: {
            tree: {
                type: 'SELECTOR',
                name: 'Trapped Tactics',
                children: [
                    LAST_STAND_PUSH,
                    {
                        type: 'SEQUENCE',
                        name: 'Fight Back',
                        children: [{ type: 'CONDITION', name: 'Scan Target', key: 'HasTarget' }, ENGAGE_TREE]
                    }
                ]
            }
        },
        UNSTICK: { tree: { type: 'ACTION', name: 'Force Jump', key: 'ForceJump' } },
        FINALE: {
            tree: {
                type: 'SEQUENCE',
                name: 'Finale',
                children: [{ type: 'CONDITION', name: 'Scan Target', key: 'HasTarget' }, ENGAGE_TREE]
            },
            onFailure: 'UNSTICK'
        },
    },
    edges: [
        { from: '*', to: 'DEAD', when: 'IsDead' },
        { from: ['ACQUIRE', 'ENGAGE', 'FIGHT', 'RETREAT', 'TRAPPED', 'UNSTICK', 'FINALE'], to: 'CONTROLLED', when: 'IsControlled' },
        { from: ['DEAD'], to: 'ACQUIRE', when: 'IsAlive' },
        { from: ['CONTROLLED'], to: 'ACQUIRE', unless: 'IsControlled' },
        { from: ['ACQUIRE', 'ENGAGE', 'FIGHT', 'RETREAT', 'TRAPPED'], to: 'FINALE', when: 'IsLastStand' },
        { from: ['FINALE'], to: 'ACQUIRE', unless: 'IsLastStand' },
        { from: ['ACQUIRE', 'ENGAGE', 'FIGHT', 'UNSTICK'], to: 'RETREAT', when: 'WantsRetreat' },
        { from: ['TRAPPED'], to: 'RETREAT', when: 'CanTryRetreat' },
        { from: ['RETREAT', 'TRAPPED'], to: 'ACQUIRE', unless: 'WantsRetreat' },
        { from: ['UNSTICK'], to: 'ACQUIRE', unless: 'IsBoxedIn' },
        { from: ['ENGAGE', 'FIGHT'], to: 'ACQUIRE', unless: 'HasTarget' },
        { from: ['ACQUIRE'], to: 'ENGAGE', when: 'HasTarget' },
        { from: ['ENGAGE'], to: 'FIGHT', when: 'TargetInBasicRange' },
        { from: ['FIGHT'], to: 'ENGAGE', unless: 'TargetInBasicRange' },
    ],
};

// Helper to generate the repetitive skill check logic structure
function createSkillRoutine(slot: number, label: string): BTDef {
    return {
        type: 'SEQUENCE',
        name: `Try ${label}`,
        children: [
            { type: 'CONDITION', name: 'Ready?', key: 'SkillReady', args: { slot } },
            {
                type: 'SELECTOR',
                name: 'Tactics',
                children: [
                    // A. Calculated Optimal Attack
                    {
                        type: 'SEQUENCE',
                        name: 'Smart Cast',
                        children: [
                            { type: 'CONDITION', name: 'Find Spot', key: 'FindOptimalTarget', args: { slot } },
                            {
                                type: 'SELECTOR',
                                name: 'Execute',
                                children: [
                                    {
                                        type: 'SEQUENCE',
                                        name: 'Cast Now',
                                        children: [
                                            { type: 'CONDITION', name: 'In Range?', key: 'IsTargetInRange', args: { slot } },
                                            { type: 'ACTION', name: 'Cast', key: 'CastSkill', args: { slot } }
                                        ]
                                    },
                                    { type: 'ACTION', name: 'Move To Spot', key: 'MoveToOptimal', args: { slot } }
                                ]
                            }
                        ]
                    },
                    // B. Fallback Chase (If optimal spot calculation fails, e.g. blocked)
                    { type: 'ACTION', name: 'Chase', key: 'ChaseTarget', args: { slot } }
                ]
            }
        ]
    };
}