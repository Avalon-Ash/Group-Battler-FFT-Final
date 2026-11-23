// ╔══════════════════════════════════════════════════════════╗
// ║  play — PLAY 模式給 UI 的投影（選主角畫面）                ║
// ║  職責：某個職業的主角四個技能槽各有哪些技能可選；戰鬥 HUD   ║
// ║        的技能列（selectHeroBar）。（勝負判斷                 ║
// ║        在 session.ts 的 playOutcome，避免把標籤表拉進進入點）。║
// ║  上游：components/ui/play/PlaySetup.tsx（P4，docs/plans/   ║
// ║        play-mode.md）。                                     ║
// ║  [ARCH] 能帶哪些技能只看 SkillQueries.roleSkills（和生成   ║
// ║  單位同一個判斷）；主角的隊伍讀 Deployment.PLAY_HERO_TEAM。 ║
// ╚══════════════════════════════════════════════════════════╝

import type { CastTargeting, Role, Skill } from '../../../../types';
import type { GameEngine } from '../../../game';
import { activationBlock, type ActivationBlock } from '../../combat/SkillStateMachine';
import { queryCastTargeting } from '../castTargeting';
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


/** PLAY 戰鬥 HUD（P5）的一個技能槽 */
export interface HeroSkillSlotView {
    readonly slot: number;
    readonly name: string;
    readonly tag: Skill['tag'];
    /** 選目標方式（castTargeting） */
    readonly mode: CastTargeting['mode'];
    /** 現在放不放得出來；不能放時的原因（SkillStateMachine.activationBlock，和 AI 同一個判斷） */
    readonly block: ActivationBlock | null;
    /** 冷卻剩幾成（0＝好了、1＝剛放） */
    readonly cooldownFrac: number;
    readonly cost: number;
}

/** PLAY 戰鬥 HUD 的投影：主角的技能槽、血量魔力、瞄準中的槽、是否在跑。不在 PLAY 是 null。 */
export interface HeroBarView {
    readonly heroId: string;
    readonly alive: boolean;
    readonly hpFrac: number;
    readonly mpFrac: number;
    readonly mp: number;
    readonly slots: readonly HeroSkillSlotView[];
    readonly aimSlot: number | null;
    readonly isRunning: boolean;
    readonly timeScale: number;
}

/** 數值變化小於這個量就當沒變（HUD 不用每個 tick 重繪；冷卻條與血條的解析度） */
const BAR_RESOLUTION = 0.02;
const quantize = (x: number) => Math.round(x / BAR_RESOLUTION) * BAR_RESOLUTION;
const heroBarCache = new WeakMap<GameEngine, { key: string; view: HeroBarView }>();

export function selectHeroBar(engine: GameEngine): HeroBarView | null {
    const heroId = engine.matchFlow?.isPlay ? engine.matchFlow.playHeroId : null;
    const hero = heroId ? engine.agents.find((a) => a.id === heroId) : undefined;
    if (!hero) return null;
    const alive = hero.hp > 0;
    const slots: HeroSkillSlotView[] = [];
    hero.skillIds.forEach((id, slot) => {
        const skill = id ? engine.skillDB.find((s) => s.id === id) : undefined;
        const targeting = queryCastTargeting(engine, hero, slot);
        if (!skill || !targeting) return;
        // 開戰前 skills 還是空的：activationBlock 讀 skills，開戰後才有意義
        const block = engine.battleStarted ? activationBlock(hero, slot) : null;
        const cooldownFrac = skill.cd > 0 ? quantize(Math.min(1, Math.max(0, (hero.curCDs[slot] || 0) / skill.cd))) : 0;
        slots.push({ slot, name: skill.name, tag: skill.tag, mode: targeting.mode, block, cooldownFrac, cost: skill.cost });
    });
    const aim = engine.state.aim;
    const view: HeroBarView = {
        heroId: hero.id,
        alive,
        hpFrac: quantize(hero.maxHp > 0 ? Math.max(0, hero.hp) / hero.maxHp : 0),
        mpFrac: quantize(hero.maxMp > 0 ? hero.mp / hero.maxMp : 0),
        mp: Math.floor(hero.mp),
        slots,
        aimSlot: aim && aim.agentId === hero.id ? aim.slot : null,
        isRunning: engine.isRunning,
        timeScale: engine.state.time.targetTimeScale,
    };
    const key = JSON.stringify(view);
    const prev = heroBarCache.get(engine);
    if (prev && prev.key === key) return prev.view;
    heroBarCache.set(engine, { key, view });
    return view;
}
