import type { ActionState, AIState, BodyTypeId, Role, Skill, Team } from '../../types';

/** 隊伍色語意：元件只用它挑 Tag／Meter 的 tone 與文字 class，不自己比對 Team。 */
export type TeamTone = 'blue' | 'red';

/** 單位檢查器要顯示的控制狀態；哪些狀態算「顯示中」由 selector 判斷。 */
export type InspectorStatusKind = 'STUN' | 'SILENCE';

/** 單位檢查器的唯讀快照（engine/systems/ui/views/l3.ts selectInspectorView）。 */
export interface InspectorView {
    readonly id: string;
    readonly role: Role;
    readonly team: Team;
    readonly teamTone: TeamTone;
    readonly bodyType: BodyTypeId;
    readonly hp: number;
    readonly maxHp: number;
    readonly mp: number;
    readonly maxMp: number;
    readonly shield: number;
    readonly q: number;
    readonly r: number;
    /** 血量歸零、放逐或已完全消失：檢查器改顯示「單位已陣亡」。 */
    readonly isDead: boolean;
    readonly statusTags: InspectorStatusKind[];
    readonly aiState: AIState;
    readonly actionState: ActionState;
}

interface SkillOptionView {
    readonly value: string;
    readonly label: string;
}

/** 一個職業的技能選項群組；label 是職業代號（共用 Select 以英文全大寫標題顯示）。 */
interface SkillGroupView {
    readonly label: string;
    options: SkillOptionView[];
}

interface SkillSlotView {
    readonly slot: number;
    readonly tag: Skill['tag'];
    readonly skillId: string | null;
    readonly skill: Skill | null;
    /** 這一格可選的技能（只含同 tag），依職業分組。 */
    groups: SkillGroupView[];
}

/** 單位的技能配置快照（engine/systems/ui/views/l3.ts selectSkillLoadoutView）。 */
export interface SkillLoadoutView {
    readonly agentId: string;
    slots: SkillSlotView[];
}
