// ╔══════════════════════════════════════════════════════════╗
// ║  SkillActions — 技能動作清單的執行者                      ║
// ║  職責：每種動作一個 handler，依四個時機執行：              ║
// ║        onCast 出手（突進）、onImpact 落點（危害區）、      ║
// ║        onHit 打中每個目標、onEnd 結束（施法者自己的狀態）。║
// ║  [ARCH] DISPEL 以回傳 mask 送純量 receipt，不改清除判斷。║
// ║  上游：SkillExecutor、ProjectileSystem                    ║
// ║  [ARCH] 新增動作：types.ts 加型別，這裡加 handler（表的    ║
// ║  型別會要求補上），engine/core/SkillQueries.ts 視需要加    ║
// ║  查詢，並在 tests/SkillEffectContract.test.ts 加對照組。   ║
// ║  [ARCH] VAMP、MANA_*、EXECUTE 是傷害結算的一部分，由       ║
// ║  DamageCalculator 讀，這裡不重複處理。                     ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent, GameEngine } from "../../game";
import type { CastAction, EndAction, HitAction, ImpactAction, Skill, StatusAction, Hex } from "../../../types";
import type { HitOptions, SkillExecutor } from "./SkillExecutor";
import { isSkillTarget } from "../../core/SkillQueries";
import { CCManager } from "./CCManager";
import { planDashPath, planRetreatPath, resolveForcedMove } from "./ForcedMove";
import { HazardManager } from "./HazardManager";
import { applyDirectDamage, breakShield } from "./DirectDamage";
import { dashTo, lungeToward, stopMovement, teleportTo } from "../movement/MotionCommands";
import { unitEventPos } from "../../events/EventPos";
import { CC_RULES, DAMAGE_TEXT_COLORS, PHYSICS, VFX_PARAM } from "../../../constants";
import { random } from "../../math/rng";
import { HexMath } from "../../math/HexMath";
import { HexUtils } from "../../utils";

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
    BLINK: ({ source, targetHex, engine }) => {
        let best: Hex | null = null;
        let bestDist = -Infinity;
        for (const n of HexUtils.neighbors(targetHex)) {
            if (!engine.isValid(n.q, n.r) || engine.hasObstacle(n.q, n.r) || engine.getAgentAt(n.q, n.r)) continue;
            const d = HexUtils.dist(source, n);
            if (d > bestDist) {
                bestDist = d;
                best = { q: n.q || 0, r: n.r || 0 };
            }
        }
        if (!best) return;
        dashTo(source, best.q, best.r, engine);
        engine.bus.emit('CAMERA_IMPACT', { kind: 'DASH', intensity: VFX_PARAM.SHAKE_INTENSITY_DASH, targetId: source.id });
        engine.events.push({
            type: 'CC_APPLIED',
            pos: unitEventPos(source, engine),
            text: "瞬移",
            color: DAMAGE_TEXT_COLORS.DASH,
            sourceId: source.id,
            targetId: source.id,
        });
    },
    RETREAT: ({ source, targetHex, engine }, a) => {
        const path = planRetreatPath(source, targetHex, a.tiles, engine);
        const dash = resolveForcedMove(source, path, path.length, 'DASH', engine);
        if (dash.stepsTaken > 0) {
            dashTo(source, dash.finalHex.q, dash.finalHex.r, engine);
        }
    },
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
        HazardManager.spawnHazard(source, cells, skill, engine, center, a.kind, a.duration, a.onEnter);
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
    executor: SkillExecutor;
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
    PIERCE: settledInDamage,
    RAGE: settledInDamage,
    TRUE_STRIKE: settledInDamage,
    RANDOM_POWER: settledInDamage,
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
    BREAK_SHIELD: ({ target }) => {
        breakShield(target);
    },
    DISPEL: ({ source, target, skill, engine }, a) => {
        const removedKindMask = CCManager.dispelEffects(target, a.polarity);
        if (removedKindMask !== 0) engine.pushEvent('STATUS_OBSERVATION', unitEventPos(target, engine), {
            sourceId: source.id, targetId: target.id, sourceSide: source.side,
            skillId: skill.id, skillName: skill.name, element: skill.element,
            removedKindMask, feedbackKind: 'CLEANSED',
        });
    },
    CHANCE: (ctx, a) => {
        if (random() < a.chance) {
            run(HIT_HANDLERS, a.then, ctx);
        }
    },
    RANDOM_OF: (ctx, a) => {
        if (!a.options || a.options.length === 0) return;
        const picked = a.options[Math.floor(random() * a.options.length)];
        if (picked) {
            run(HIT_HANDLERS, [picked], ctx);
        }
    },

    CHAIN: ({ source, target, skill, engine, opts, executor }, a) => {
        if (opts.chained || (opts.hitIndex ?? 0) > 0) return;
        let current: Agent = target;
        const hitSet = new Set<Agent>([target]);
        for (let n = 1; n <= a.jumps; n++) {
            let best: Agent | null = null;
            let bestDist = Infinity;
            for (const u of engine.agents) {
                if (u.hp <= 0 || u.banished || u.outOfBounds) continue;
                if (hitSet.has(u)) continue;
                if (!isSkillTarget(skill, source, u)) continue;
                const d = HexUtils.dist(current, u);
                if (d <= a.radius && d < bestDist) {
                    bestDist = d;
                    best = u;
                }
            }
            if (!best) break;
            hitSet.add(best);
            const powerScale = (opts.powerScale ?? 1) * (a.falloff ** n);
            executor.resolveHit(source, best, skill, undefined, engine, undefined, { powerScale, chained: true });
            current = best;
        }
    },
    LINE_THROUGH: ({ source, target, skill, engine, opts, executor }, a) => {
        if (opts.chained || (opts.hitIndex ?? 0) > 0) return;
        const distST = HexUtils.dist(source, target);
        if (distST === 0) return;
        const totalDist = distST + a.tiles;
        const sc = HexMath.axialToCube(source);
        const tc = HexMath.axialToCube(target);
        const dx = tc.x - sc.x;
        const dy = tc.y - sc.y;
        const dz = tc.z - sc.z;
        const endCube = {
            x: sc.x + dx * (totalDist / distST),
            y: sc.y + dy * (totalDist / distST),
            z: sc.z + dz * (totalDist / distST),
        };
        const endHex = HexMath.cubeToAxial(HexMath.cubeRound(endCube));
        const fullLine = HexUtils.line(source, endHex);
        const tilesAfter = fullLine.slice(distST + 1);
        let hitCount = 0;
        for (const cell of tilesAfter) {
            const u = engine.getAgentAt(cell.q, cell.r);
            if (!u || u === target) continue;
            if (u.hp <= 0 || u.banished || u.outOfBounds) continue;
            if (!isSkillTarget(skill, source, u)) continue;
            hitCount++;
            const powerScale = (opts.powerScale ?? 1) * (a.falloff ** hitCount);
            executor.resolveHit(source, u, skill, undefined, engine, undefined, { powerScale, chained: true });
        }
    },
    SWAP: ({ source, target, engine, opts }) => {
        if (opts.chained || (opts.hitIndex ?? 0) > 0) return;
        if (source.hp <= 0 || source.banished || source.outOfBounds) return;
        if (target.hp <= 0 || target.banished || target.outOfBounds) return;

        const sQ = source.q;
        const sR = source.r;
        const tQ = target.q;
        const tR = target.r;

        teleportTo(source, tQ, tR, engine);
        teleportTo(target, sQ, sR, engine);
        engine.map.registerAgent(source);
        engine.map.registerAgent(target);

        if (source.isMoving) stopMovement(source);
        if (target.isMoving) stopMovement(target);
    },
};

export function runHitActions(source: Agent, target: Agent, skill: Skill, origin: { x: number; y: number } | undefined, engine: GameEngine, opts: HitOptions, executor: SkillExecutor): void {
    run(HIT_HANDLERS, skill.onHit, { source, target, skill, origin, engine, opts, executor });
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
