// ╔══════════════════════════════════════════════════════════╗
// ║  headlessBattle — 無畫面工具的佈陣入口（ADR 0027）        ║
// ║  職責：建引擎、設種子、設陣營、換圖、排陣容、放上戰場、    ║
// ║        檢查人數。回傳佈陣完成、尚未開戰的引擎。            ║
// ║  上游：engine/systems/match/Deployment.ts（planRoster、    ║
// ║        deployRoster）。                                    ║
// ║  下游：tools/balance/、tools/replay/ 的無畫面工具。        ║
// ║  [ARCH] 出生格怎麼挑、陣營怎麼配、放置順序全部讀            ║
// ║  Deployment.ts，本檔不自己挑格子、不洗牌、不決定 team 與   ║
// ║  side。工具之間的差異只能是 HeadlessBattleSpec 的欄位。    ║
// ║  開戰不在這裡（play() 與 START_GAME 兩種，由工具自己送）。 ║
// ║  放在 tools/ 而不是 engine/：它要 new GameEngine，模擬層   ║
// ║  不得反過來 import 組合根 engine/game.ts。                 ║
// ╚══════════════════════════════════════════════════════════╝
import { GameEngine } from '../../engine/game';
import type { BattleSetup, Role } from '../../types';
import { planRoster, deployRoster, type RosterSlot } from '../../engine/systems/match/Deployment';
import { random } from '../../engine/math/rng';

/** 工具陣容的外觀鹽（只影響三陣營以上的外觀分配，不進模擬）。 */
const TOOL_LOOK_SALT = 0;
/** 工具預設排的是第幾批陣容（planRoster 的 round：體型雜湊的鹽）。 */
const DEFAULT_ROUND = 0;
/** mirrorSides 只對兩個陣營有意義。 */
const MIRROR_FACTIONS = 2;

export interface HeadlessBattleSpec {
    /** 模擬種子：各工具自己的種子公式算好傳進來 */
    seed: number;
    setup: BattleSetup;
    /** 固定場景與尺寸；省略＝隨機場景（RANDOMIZE_MAP randomizeScene:true） */
    map?: { sceneId: string; w: number; h: number };
    /** 指定職業；省略＝planRoster 的排法。只換職業，體型與外觀沿用那一格 */
    roleOf?: (side: number, index: number) => Role;
    /** 兩個陣營對調隊伍與外觀（站位不變）：分離站位與陣營的影響。只允許兩個陣營 */
    mirrorSides?: boolean;
    /** 有傳就在放人之前設給 agentManager */
    matchSalt?: number;
    /** 傳給 planRoster，預設 DEFAULT_ROUND */
    round?: number;
}

export interface HeadlessBattle {
    engine: GameEngine;
    roster: readonly RosterSlot[];
    /** 每個位置生成的單位 id（deployRoster 的回傳） */
    placed: ReadonlyMap<RosterSlot, string>;
}

/** 只換職業：同一陣營裡第幾個由陣容的順序決定。 */
function withRoles(roster: readonly RosterSlot[], roleOf: (side: number, index: number) => Role): RosterSlot[] {
    const seen = new Map<number, number>();
    return roster.map((slot) => {
        const index = seen.get(slot.side) ?? 0;
        seen.set(slot.side, index + 1);
        return { ...slot, role: roleOf(slot.side, index) };
    });
}

/** 兩個陣營互換隊伍與外觀；side（站哪一邊）不動。 */
function mirrored(roster: readonly RosterSlot[]): RosterSlot[] {
    const other = (side: number) => roster.find((s) => s.side !== side);
    return roster.map((slot) => {
        const from = other(slot.side);
        return from ? { ...slot, team: from.team, look: from.look } : slot;
    });
}

/** 佈陣完成、尚未開戰的引擎。出生格不夠放完整個陣容就丟錯。 */
export function buildHeadlessBattle(spec: HeadlessBattleSpec): HeadlessBattle {
    const { setup } = spec;
    if (spec.mirrorSides && setup.factions !== MIRROR_FACTIONS) {
        throw new Error(`mirrorSides 只支援 ${MIRROR_FACTIONS} 個陣營（現在是 ${setup.factions}）`);
    }
    const engine = new GameEngine({ audio: false });
    if (spec.matchSalt !== undefined) engine.agentManager.matchSalt = spec.matchSalt;
    engine.seedSimulation(spec.seed);
    engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup });
    if (spec.map) {
        engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: spec.map.w, h: spec.map.h, sceneId: spec.map.sceneId, randomizeScene: false });
        if (engine.currentScene.id !== spec.map.sceneId) {
            throw new Error(`場景 ${spec.map.sceneId} 不存在（現在是 ${engine.currentScene.id}）`);
        }
    } else {
        engine.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
    }

    let roster: readonly RosterSlot[] = planRoster(setup, spec.round ?? DEFAULT_ROUND, TOOL_LOOK_SALT);
    if (spec.roleOf) roster = withRoles(roster, spec.roleOf);
    if (spec.mirrorSides) roster = mirrored(roster);

    const placed = deployRoster(engine, roster, setup, random);
    if (placed.size !== roster.length || engine.agents.length !== roster.length) {
        const { w, h } = engine.mapConfig;
        throw new Error(`出生格不夠：陣容 ${roster.length} 人，只放了 ${placed.size} 人（地圖 ${w}x${h}，種子 ${spec.seed}）`);
    }
    return { engine, roster, placed };
}
