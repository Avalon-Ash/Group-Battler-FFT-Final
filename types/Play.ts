// [契約 P1／P5] PLAY 模式的資料形狀（docs/plans/play-mode.md、ADR 0025）。
// PLAY＝一隻主角由玩家操控、其他單位 AI；選主角 → 自動佈陣 → 開戰 → 結算 → 再來一場。

import type { Role, SkillTeams } from '../types';

/**
 * 玩家選的主角。
 * skillIds：四個技能槽（0 奧義、1 主動、2 普攻、3 機動，和 AgentManager 生成時同一個順序）；
 * 省略、或某一槽是 undefined＝照一般生成的隨機抽；null＝那一槽空著。
 */
export interface PlayHero {
    readonly role: Role;
    readonly skillIds?: readonly (string | null | undefined)[];
}

/**
 * 一個技能槽怎麼選目標：
 *  - SELF：射程 0，按下就對自己放，不用選目標。
 *  - UNIT：點一個單位（敵友看 teams）。
 *  - UNIT_OR_GROUND：範圍技，可以點單位或地面格。
 */
type CastTargetMode = 'SELF' | 'UNIT' | 'UNIT_OR_GROUND';

/** 主角某一槽現在的選目標規則：HUD 的瞄準狀態與戰場高亮共用，判斷只在 queryCastTargeting。 */
export interface CastTargeting {
    readonly slot: number;
    readonly mode: CastTargetMode;
    /** 對誰有效（engine/core/SkillQueries.ts 的 skillTeams） */
    readonly teams: SkillTeams;
    /** 射程（格），畫射程圈用；點射程外的目標照樣成立，單位會先靠近（ORDER_CAST 的規則） */
    readonly range: number;
    /** 現在點得下去的單位：活著、陣營符合 teams；ALLY 與 ANY 含自己。依 engine.agents 的順序 */
    readonly unitIds: readonly string[];
}
