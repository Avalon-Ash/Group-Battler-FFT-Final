// ╔══════════════════════════════════════════════════════════╗
// ║  castTargeting — 主角某一槽技能怎麼選目標（契約 P5）       ║
// ║  職責：給 PLAY 的戰鬥 HUD（瞄準狀態）與戰場高亮同一份答案： ║
// ║        自身／點單位／點單位或地面、對誰有效、射程、現在點得  ║
// ║        下去的單位。純函式，只讀引擎、不送指令。              ║
// ║  上游：PLAY 的技能列與戰場疊層（docs/plans/play-mode.md P5）。║
// ║  [ARCH] 「這招能點誰」只在這裡判斷（ADR 0025），HUD 與疊層   ║
// ║  不各自判斷；敵友沿用 SkillQueries 的 skillTeams。           ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import type { Agent } from '../../core/Agent';
import type { CastTargeting } from '../../../types';
import { ContractPending } from '../../core/ContractPending';

/**
 * 主角第 slot 槽現在的選目標規則；那一槽沒有技能（或 slot 超出範圍）是 null。
 *  - 射程 0 的技能：SELF；範圍技（type AOE）：UNIT_OR_GROUND；其他：UNIT。
 *  - unitIds：活著、還在場上、陣營符合 teams 的單位（ENEMY 不含自己；ALLY、ANY 含自己），依 engine.agents 的順序。
 */
export function queryCastTargeting(engine: GameEngine, hero: Agent, slot: number): CastTargeting | null {
    void engine; void hero; void slot;
    throw new ContractPending('P5', 'queryCastTargeting');
}
