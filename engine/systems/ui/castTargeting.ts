// ╔══════════════════════════════════════════════════════════╗
// ║  castTargeting — 主角某一槽技能怎麼選目標（契約 P5）       ║
// ║  職責：給 PLAY 的戰鬥 HUD（瞄準狀態）與戰場高亮同一份答案： ║
// ║        自身／點單位／點單位或地面、對誰有效、射程、現在點得  ║
// ║        下去的單位。純函式，只讀引擎、不送指令。              ║
// ║  上游：PLAY 的技能列與戰場疊層（docs/plans/play-mode.md P5）。║
// ║  [ARCH] 「這招能點誰」只在這裡判斷（ADR 0025）：HUD、疊層、 ║
// ║  tapIntent 與 UICommandSystem 的 ORDER_CAST 驗證都用        ║
// ║  isCastTarget；敵友沿用 SkillQueries 的 skillTeams。        ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { Agent } from '../../core/Agent';
import type { CastTargeting, Skill } from '../../../types';
import { skillTeams, isSkillTarget } from '../../core/SkillQueries';

/** 主角第 slot 槽的技能；槽位不合法或空著是 null */
function slotSkill(engine: GameEngine, hero: Agent, slot: number): Skill | null {
    if (!Number.isInteger(slot) || slot < 0 || slot >= hero.skillIds.length) return null;
    const id = hero.skillIds[slot];
    return id ? engine.skillDB.find((s) => s.id === id) ?? null : null;
}

/**
 * 選目標的方式：射程 0 對自己（按一下就放）；機動技可點地面（往那裡位移）；範圍技可點地面；其他點單位。
 * 射程 0 要先判斷：機動技裡射程 0 的是以自身為中心的擊退（tb_m2、mb_m2 等），沒有位移；
 * 若給它點地面，施放指令要站上那一格（射程 0）才放，走不到就一直卡著。
 */
function targetModeOf(skill: Skill): CastTargeting['mode'] {
    if (skill.range === 0) return 'SELF';
    if (skill.tag === 'MOBILITY') return 'UNIT_OR_GROUND';
    return skill.type === 'AOE' ? 'UNIT_OR_GROUND' : 'UNIT';
}

/**
 * 主角第 slot 槽現在的選目標規則；那一槽沒有技能（或 slot 超出範圍）是 null。
 *  - 射程 0 的技能（含機動技）：SELF；其餘的範圍技（type AOE）與機動技（tag MOBILITY）：UNIT_OR_GROUND；其他：UNIT。
 *  - unitIds：活著、還在場上、陣營符合 teams 的單位（ENEMY 不含自己；ALLY、ANY 含自己），依 engine.agents 的順序。
 */
export function queryCastTargeting(engine: GameEngine, hero: Agent, slot: number): CastTargeting | null {
    const skill = slotSkill(engine, hero, slot);
    if (!skill) return null;
    return {
        slot,
        mode: targetModeOf(skill),
        teams: skillTeams(skill),
        range: skill.range,
        unitIds: engine.agents.filter((a) => isCastTarget(engine, hero, slot, a)).map((a) => a.id),
    };
}

/**
 * 這個單位能不能當主角第 slot 槽的目標：活著、還在場上、陣營符合那一招的 teams。
 * queryCastTargeting 的 unitIds 就是 engine.agents 裡這個判斷為真的單位；ORDER_CAST 帶 targetId 時也用它驗證。
 */
export function isCastTarget(engine: GameEngine, hero: Agent, slot: number, unit: Agent): boolean {
    const skill = slotSkill(engine, hero, slot);
    if (!skill) return false;
    return unit.hp > 0 && !unit.fullyDead && !unit.outOfBounds && engine.agents.includes(unit) && isSkillTarget(skill, hero, unit);
}
