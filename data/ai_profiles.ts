
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

const COMBAT_TREE: BTDef = {
    type: 'SEQUENCE',
    name: 'Combat',
    children: [
        { type: 'CONDITION', name: 'Scan Target', key: 'HasTarget' },
        {
            type: 'SELECTOR',
            name: 'Combat Actions',
            children: [
                {
                    type: 'SELECTOR',
                    name: 'Skill Priority',
                    children: [
                        // Slot 0 (Ult), Slot 1 (Active), Slot 2 (Basic)
                        createSkillRoutine(0, "Ultimate"),
                        createSkillRoutine(1, "Active"),
                        createSkillRoutine(2, "Basic")
                    ]
                },
                // [FIX] Gap Close Fallback: If skills are on CD, ensure we stay close to target
                {
                    type: 'SEQUENCE',
                    name: 'Gap Close',
                    children: [
                        // Try to chase using Basic Attack range as reference (Slot 2)
                        { type: 'ACTION', name: 'Stick To Target', key: 'ChaseTarget', args: { slot: 2 } }
                    ]
                },
                // Reposition: chase refused (e.g. the only approach ends on a collapsing tile) -> edge toward the
                // target over safe ground instead of standing still.
                { type: 'ACTION', name: 'Reposition', key: 'Reposition' },
                // 以上都不行：走到走得到的格子裡離敵人最近的地方；連這個都不行就整棵樹失敗，轉 UNSTICK。
                { type: 'ACTION', name: 'Advance', key: 'Advance' }
            ]
        }
    ]
};

/**
 * AI 狀態拓樸：節點是模式，每個模式一棵小樹；模式之間只能走這裡列出的邊。
 *   DEAD／CONTROLLED —— 不能行動（全域，任何模式都會切過來）
 *   RETREAT          —— 站在塌陷格／敵方 hazard 上：逃；逃不掉轉 TRAPPED
 *   TRAPPED          —— 逃不掉：有推拉技能就用，否則原地戰鬥（SkillReady 不再因塌陷格拒絕出手）
 *   COMBAT           —— 技能 Ult > Active > Basic → 追擊（只拒絕「停下來的格子會塌陷」）→ 走位 → 前進；全失敗轉 UNSTICK
 *   UNSTICK          —— 打不到也走不到更近的地方：短暫等待後強制跳上鄰格
 * 任何「移動」節點在 CanMove 為假（root/stun/放逐/恐懼）時必須失敗，不能回 RUNNING。
 */
export const AI_MODE_GRAPH: {
    initial: AIMode;
    modes: Record<AIMode, AIModeDef>;
    edges: readonly AIModeEdgeDef[];
} = {
    initial: 'COMBAT',
    modes: {
        DEAD: { tree: { type: 'ACTION', name: 'Dead Wait', key: 'Wait', args: { state: AIState.DEAD } } },
        CONTROLLED: { tree: { type: 'ACTION', name: 'CC Wait', key: 'Wait', args: { state: AIState.CC_INTERRUPTED } } },
        RETREAT: { tree: { type: 'ACTION', name: 'Run!', key: 'EscapeWarning' }, onFailure: 'TRAPPED' },
        TRAPPED: { tree: { type: 'SELECTOR', name: 'Trapped Tactics', children: [LAST_STAND_PUSH, COMBAT_TREE] } },
        COMBAT: { tree: COMBAT_TREE, onFailure: 'UNSTICK' },
        UNSTICK: { tree: { type: 'ACTION', name: 'Force Jump', key: 'ForceJump' } },
    },
    edges: [
        { from: '*', to: 'DEAD', when: 'IsDead' },
        { from: ['COMBAT', 'RETREAT', 'TRAPPED', 'UNSTICK'], to: 'CONTROLLED', when: 'IsControlled' },
        { from: ['DEAD'], to: 'COMBAT', when: 'IsAlive' },
        { from: ['CONTROLLED'], to: 'COMBAT', unless: 'IsControlled' },
        { from: ['COMBAT', 'TRAPPED', 'UNSTICK'], to: 'RETREAT', when: 'WantsRetreat' },
        { from: ['UNSTICK'], to: 'COMBAT', unless: 'IsBoxedIn' },
        { from: ['RETREAT', 'TRAPPED'], to: 'COMBAT', unless: 'WantsRetreat' },
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