// ╔══════════════════════════════════════════════════════════╗
// ║  Deployment — 開戰前的陣容與佈陣（契約 R2）               ║
// ║  職責：排下一批陣容（陣營、職業、體型、外觀）、抽展示地圖  ║
// ║        的大小與佈局、把陣容放上戰場。                      ║
// ║  上游：MatchFlowSystem（展示模式每一局、手動的隨機戰場）。 ║
// ║  [ARCH] 純函式，不存狀態；亂數由呼叫端傳入（展示回合用     ║
// ║  這一局的序列，手動擲骰用全域佈陣流）。寫入引擎一律送      ║
// ║  UI_COMMAND，不直接改引擎狀態。                            ║
// ║  體型與外觀用確定性雜湊（pickBodyType、pickFactionLooks），║
// ║  不消耗傳入的序列：陣容在單位生成前就定案，表現層才能      ║
// ║  趁轉場預載圖集。                                          ║
// ╚══════════════════════════════════════════════════════════╝

import type { GameEngine } from '../../game';
import { Team, Role } from '../../../types';
import type { BattleSetup, BodyTypeId, FactionLook, HexLayout } from '../../../types';
import { GAME_APP_PARAM } from '../../../constants';
import { querySpawnableHexes, layoutFactionHexes, factionRoleIndex, type HexCoord } from '../ui/editorQueries';
import { pickBodyType } from '../../../data/units/appearance/bodyTypes';
import { pickFactionLooks, plainLook } from '../../../data/units/factionTint';

/** 陣容的一個位置：陣營、職業、體型、外觀在生成前就決定 */
export interface RosterSlot {
    side: number;
    team: Team;
    role: Role;
    bodyType: BodyTypeId;
    look: FactionLook;
}

/** 開局陣容輪流排的職業 */
const DEPLOY_ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

/** 陣營用的外觀：只有藍、紅兩套皮膚，雙數陣營藍、單數紅（陣營 0／1 和 Team 數值相同） */
const factionTeam = (side: number): Team => (side % 2 === 0 ? Team.BLUE : Team.RED);

/**
 * 排一批陣容。round 是第幾次排（體型雜湊的鹽、外觀分配的種子之一），lookSalt 是這顆流程的外觀鹽。
 * 三個以上陣營每局重新分配外觀色；兩個陣營用原色。
 */
export function planRoster(setup: BattleSetup, round: number, lookSalt: number): RosterSlot[] {
    const plan: RosterSlot[] = [];
    const looks = pickFactionLooks(setup.factions, `${lookSalt}-${round}`);
    for (let side = 0; side < setup.factions; side++) {
        const team = factionTeam(side);
        const look = looks?.[side] ?? plainLook(team);
        for (let i = 0; i < setup.unitsPerFaction; i++) {
            plan.push({
                side,
                team,
                role: DEPLOY_ROLES[factionRoleIndex(side, i, setup.unitsPerFaction, DEPLOY_ROLES.length)],
                bodyType: pickBodyType(`SHOWCASE-${side}-${i}`, round),
                look,
            });
        }
    }
    return plan;
}

/** 展示模式這一局的地圖大小與佈局（依序抽寬、高、佈局）。 */
export function rollShowcaseMap(rand: () => number): { w: number; h: number; layout: HexLayout } {
    const w = Math.floor(GAME_APP_PARAM.SHOWCASE_MIN_W + rand() * GAME_APP_PARAM.SHOWCASE_SIZE_RANGE);
    const h = Math.floor(GAME_APP_PARAM.SHOWCASE_MIN_H + rand() * GAME_APP_PARAM.SHOWCASE_SIZE_RANGE);
    const layout: HexLayout = rand() > GAME_APP_PARAM.SHOWCASE_FLAT_CHANCE ? 'FLAT' : 'POINTY';
    return { w, h, layout };
}

function shuffle<T>(array: T[], rand: () => number): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 把陣容放上目前的地圖（送 PLACE_AGENT）。
 * 兩個陣營：左右對分（地圖是以 (0,0) 為中心的大六角，q<0 偏左、q>0 偏右），先洗左邊再洗右邊。
 * 三個以上：洗一次全部的出生格，各陣營一個據點，輪流取離自己據點最近的空格。
 */
export function deployRoster(engine: GameEngine, roster: readonly RosterSlot[], setup: BattleSetup, rand: () => number): void {
    // 可出生格：不含障礙物與最外圈（與面板總池同一份判定）
    const validHexes: HexCoord[] = querySpawnableHexes(engine);
    const slotsOf = (side: number) => roster.filter((s) => s.side === side);
    const place = (slot: RosterSlot, hex: HexCoord, side?: number) => {
        engine.bus.emit('UI_COMMAND', {
            type: 'PLACE_AGENT',
            team: slot.team,
            q: hex.q,
            r: hex.r,
            role: slot.role,
            bodyType: slot.bodyType,
            side,
            look: slot.look,
        });
    };

    if (setup.factions === 2) {
        // side 省略＝等於 team
        const gap = GAME_APP_PARAM.TEAMS_SPLIT_GAP_Q;
        const leftHexes = validHexes.filter((hex) => hex.q < -gap);
        const rightHexes = validHexes.filter((hex) => hex.q > gap);
        shuffle(leftHexes, rand);
        shuffle(rightHexes, rand);
        [leftHexes, rightHexes].forEach((hexes, side) => {
            const slots = slotsOf(side);
            for (let i = 0; i < slots.length && i < hexes.length; i++) place(slots[i], hexes[i]);
        });
        return;
    }

    shuffle(validHexes, rand);
    const layout = layoutFactionHexes(validHexes, setup.factions, setup.unitsPerFaction);
    const slots = layout.map((_, side) => slotsOf(side));
    for (let i = 0; i < setup.unitsPerFaction; i++) {
        for (let side = 0; side < layout.length; side++) {
            const slot = slots[side][i];
            const hex = layout[side][i];
            if (slot && hex) place(slot, hex, side);
        }
    }
}
