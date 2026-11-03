// ╔══════════════════════════════════════════════════════════╗
// ║  SkillActions — 技能動作清單的執行者                      ║
// ║  職責：每種動作一個 handler，依四個時機執行：              ║
// ║        onCast 出手（突進）、onImpact 落點（危害區）、      ║
// ║        onHit 打中每個目標、onEnd 結束（施法者自己的狀態）。║
// ║  上游：SkillExecutor、ProjectileSystem                    ║
// ║  [ARCH] 新增動作：types.ts 加型別，這裡加 handler（表的    ║
// ║  型別會要求補上），engine/core/SkillQueries.ts 視需要加    ║
// ║  查詢，並在 tests/SkillEffectContract.test.ts 加對照組。   ║
// ║  [ARCH] VAMP、MANA_*、EXECUTE 是傷害結算的一部分，由       ║
// ║  DamageCalculator 讀，這裡不重複處理。                     ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent, GameEngine } from "../../game";
import type { CastAction, EndAction, HitAction, ImpactAction, Skill, StatusAction } from "../../../types";
import type { HitOptions } from "./SkillExecutor";
import { CCManager } from "./CCManager";
import { planDashPath, resolveForcedMove } from "./ForcedMove";
import { HazardManager } from "./HazardManager";
import { applyDirectDamage } from "./DirectDamage";
import { dashTo, lungeToward } from "../movement/MotionCommands";
import { unitEventPos } from "../../events/EventPos";
import { CC_RULES, DAMAGE_TEXT_COLORS, PHYSICS, VFX_PARAM } from "../../../constants";

type Handlers<A extends { action: string }, C> = { [K in A['action']]: (ctx: C, action: Extract<A, { action: K }>) => void };

function run<A extends { action: string }, C>(handlers: Handlers<A, C>, actions: readonly A[] | undefined, ctx: C): void {
    if (!actions) return;
    for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        (handlers[a.action as A['action']] as (c: C, x: A) => void)(ctx, a);
    }
}

// ── onCast ──

interface CastContext {
    source: Agent;
    targetHex: { q: number; r: number };
    origin: { x: number; y: number };
    engine: GameEngine;
}

const CAST_HANDLERS: Handlers<CastAction, CastContext> = {
    // 高度／障礙／單位由 ForcedMove 裁決
    DASH: ({ source, targetHex, origin, engine }) => {
        const dashPath = planDashPath(source, targetHex, engine);
        const dash = resolveForcedMove(source, dashPath, dashPath.length, 'DASH', engine);
        const bestH = dash.stepsTaken > 0 ? dash.finalHex : null;
        if (!bestH) {
            lungeToward(source, origin, PHYSICS.LUNGE_SPEED_ACTIVE);
            return;
        }
        // dashTo 把位移量存進 physics 偏移並注入順向初速與跳躍弧度，
        // 衝刺因此帶著速度前傾與殘影
        dashTo(source, bestH.q, bestH.r, engine);
        engine.bus.emit('CAMERA_IMPACT', { kind: 'DASH', intensity: VFX_PARAM.SHAKE_INTENSITY_DASH, targetId: source.id });
        engine.events.push({
            type: 'CC_APPLIED',
            pos: unitEventPos(source, engine),
            text: "突進",
            color: DAMAGE_TEXT_COLORS.DASH,
            sourceId: source.id,
            targetId: source.id,
        });
    },
};

export function runCastActions(source: Agent, skill: Skill, targetHex: { q: number; r: number }, origin: { x: number; y: number }, engine: GameEngine): void {
    run(CAST_HANDLERS, skill.onCast, { source, targetHex, origin, engine });
}

// ── onImpact ──

interface ImpactContext {
    source: Agent;
    skill: Skill;
    cells: { q: number; r: number }[];
    center: { q: number; r: number };
    engine: GameEngine;
}

const IMPACT_HANDLERS: Handlers<ImpactAction, ImpactContext> = {
    HAZARD: ({ source, skill, cells, center, engine }, a) => {
        HazardManager.spawnHazard(source, cells, skill, engine, center, a.kind, a.duration);
    },
};

export function runImpactActions(source: Agent, skill: Skill, cells: { q: number; r: number }[], center: { q: number; r: number }, engine: GameEngine): void {
    run(IMPACT_HANDLERS, skill.onImpact, { source, skill, cells, center, engine });
}

// ── onHit ──

interface HitContext {
    source: Agent;
    target: Agent;
    skill: Skill;
    origin: { x: number; y: number } | undefined;
    engine: GameEngine;
    opts: HitOptions;
}

/** 每段重複套用的控制：位移（每段都拉／推）與緩速（每段刷新）。其餘狀態一次施放只套一次 */
function isRepeatableStatus(status: StatusAction['status']): boolean {
    return status === 'KNOCKBACK' || status === 'PULL' || status === 'SLOW';
}

const settledInDamage = () => { /* DamageCalculator 已算進這一擊的結果 */ };

const HIT_HANDLERS: Handlers<HitAction, HitContext> = {
    VAMP: settledInDamage,
    MANA_BURN: settledInDamage,
    MANA_RESTORE: settledInDamage,
    EXECUTE: settledInDamage,
    // 反噬無視護盾；無歸屬來源，沿用先前的擊殺者
    SELF_DAMAGE: ({ source, engine, opts }, a) => {
        if (source.hp <= 0) return;
        const value = (a.value || 0) * (opts.powerScale ?? 1);
        if (value <= 0) return;
        applyDirectDamage(source, value, true);
        engine.events.push({
            type: 'DAMAGE',
            pos: unitEventPos(source, engine),
            value,
            color: DAMAGE_TEXT_COLORS.RECOIL,
            text: "RECOIL",
            sourceId: source.id,
            targetId: source.id,
        });
        engine.log(source, 'HIT', '反噬', source.id, `受到 ${value} 反噬傷害`);
        if (source.hp <= 0) engine.agentManager.handleDeadState(source, engine);
    },
    // 多段命中：硬控等狀態一次施放對每個目標只套一次（第一次打中時）；位移與 SLOW 每段都套，護盾依段數分攤
    STATUS: ({ source, target, skill, origin, engine, opts }, a) => {
        if (opts.statusesApplied && !isRepeatableStatus(a.status) && a.status !== 'SHIELD') return;
        const force = a.status === 'SHIELD' ? (a.force || CC_RULES.DEFAULT_SHIELD_AMOUNT) * (opts.powerScale ?? 1) : a.force;
        CCManager.applyCC(source, target, skill, a.status, a.duration, force, origin, engine, (opts.hitIndex ?? 0) > 0);
    },
};

export function runHitActions(source: Agent, target: Agent, skill: Skill, origin: { x: number; y: number } | undefined, engine: GameEngine, opts: HitOptions): void {
    run(HIT_HANDLERS, skill.onHit, { source, target, skill, origin, engine, opts });
}

// ── onEnd ──

interface EndContext {
    source: Agent;
    skill: Skill;
    engine: GameEngine;
}

const END_HANDLERS: Handlers<EndAction, EndContext> = {
    STATUS: ({ source, skill, engine }, a) => {
        CCManager.applyCC(source, source, skill, a.status, a.duration, a.force, undefined, engine);
    },
};

/** 每次施放只跑一次（無論打中幾個、有沒有打中） */
export function runEndActions(source: Agent, skill: Skill, engine: GameEngine): void {
    if (source.hp <= 0 || source.banished || source.outOfBounds) return;
    run(END_HANDLERS, skill.onEnd, { source, skill, engine });
}
