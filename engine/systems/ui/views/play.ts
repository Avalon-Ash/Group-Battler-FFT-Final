// ╔══════════════════════════════════════════════════════════╗
// ║  play — PLAY 模式給 UI 的投影（選主角畫面）                ║
// ║  職責：某個職業的主角四個技能槽各有哪些技能可選（勝負判斷   ║
// ║        在 session.ts 的 playOutcome，避免把標籤表拉進進入點）。║
// ║  上游：components/ui/play/PlaySetup.tsx（P4，docs/plans/   ║
// ║        play-mode.md）。                                     ║
// ║  [ARCH] 能帶哪些技能只看 SkillQueries.roleSkills（和生成   ║
// ║  單位同一個判斷）；主角的隊伍讀 Deployment.PLAY_HERO_TEAM。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { Role, Skill } from '../../../../types';
import { roleSkills } from '../../../core/SkillQueries';
import { PLAY_HERO_TEAM } from '../../match/Deployment';
import { SKILL_SLOT_TAGS } from '../../../../data/ui/labels/l3';

export interface PlayLoadoutSlot {
    readonly slot: number;
    readonly tag: Skill['tag'];
    readonly skills: readonly { readonly id: string; readonly name: string }[];
}

/** 主角這個職業每一槽可選的技能（依 SKILL_SLOT_TAGS 的槽位順序；資料庫順序）。 */
export function playLoadoutOptions(db: readonly Skill[], role: Role): readonly PlayLoadoutSlot[] {
    const own = roleSkills(db, role, PLAY_HERO_TEAM);
    return SKILL_SLOT_TAGS.map((tag, slot) => ({
        slot,
        tag,
        skills: own.filter((s) => s.tag === tag).map((s) => ({ id: s.id, name: s.name })),
    }));
}

