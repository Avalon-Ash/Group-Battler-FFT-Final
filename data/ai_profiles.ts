
export interface BTDef {
    type: 'SELECTOR' | 'SEQUENCE' | 'CONDITION' | 'ACTION';
    name: string;
    children?: BTDef[];
    key?: string; // Maps to Registry Key
    args?: any;
}

export const STANDARD_AI_PROFILE: BTDef = {
    type: 'SELECTOR',
    name: 'Root',
    children: [
        // 1. High Priority Status Checks
        {
            type: 'SEQUENCE',
            name: 'Dead Check',
            children: [
                { type: 'CONDITION', name: 'Is Dead?', key: 'IsDead' },
                { type: 'ACTION', name: 'Dead Wait', key: 'Wait', args: { status: '死亡' } }
            ]
        },
        {
            type: 'SEQUENCE',
            name: 'CC Check',
            children: [
                {
                    type: 'SELECTOR', name: 'Any CC?',
                    children: [
                        { type: 'CONDITION', name: 'Stunned?', key: 'IsStunned' },
                        { type: 'CONDITION', name: 'Banished?', key: 'IsBanished' },
                        { type: 'CONDITION', name: 'Feared?', key: 'IsFeared' }
                    ]
                },
                { type: 'ACTION', name: 'CC Wait', key: 'Wait', args: { status: '被控' } }
            ]
        },
        // 2. Combat Loop
        {
            type: 'SEQUENCE',
            name: 'Combat',
            children: [
                { type: 'CONDITION', name: 'Scan Target', key: 'HasTarget' },
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
                // [NEW] Gap Close Fallback: If skills are on CD, ensure we stay close to target
                {
                    type: 'SEQUENCE',
                    name: 'Gap Close',
                    children: [
                        // Try to chase using Basic Attack range as reference (Slot 2)
                        { type: 'ACTION', name: 'Stick To Target', key: 'ChaseTarget', args: { slot: 2 } } 
                    ]
                },
                { type: 'ACTION', name: 'Idle', key: 'Idle' }
            ]
        }
    ]
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