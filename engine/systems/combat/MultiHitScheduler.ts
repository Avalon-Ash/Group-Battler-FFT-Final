// ╔══════════════════════════════════════════════════════════╗
// ║  MultiHitScheduler — 多段命中排程（docs/MULTI_HIT_DESIGN.md）║
// ║  職責：skill.hits 的技能結算後，第 i 段在施放時刻＋hitOffset(i)  ║
// ║        （節奏見 engine/math/HitCadence.ts）呼叫一次 resolveHit  ║
// ║        （威力 1/N）；AOE 每段重新判定範圍內                     ║
// ║        的單位，單體鎖定原目標；硬控等一次性狀態每個目標只套一次 ║
// ║  上游：SkillExecutor.deliverHits（技能結算、投射物抵達）；      ║
// ║        CombatSystem.update 每 tick 呼叫 update                  ║
// ║  [ARCH] 本檔是排程清單的唯一寫入者，只決定「何時呼叫 resolveHit」；║
// ║         扣血、護盾、吸血、反傷全在 resolveHit／DamageCalculator。 ║
// ║         時間讀 engine.battleTime（確定性，沒有亂數）；施法者陣亡 ║
// ║         不取消已出手的段數，被放逐則取消；battleTime 倒退（重開 ║
// ║         戰鬥）時丟棄舊排程。不改任何座標／排序規則。            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent, GameEngine } from "../../game";
import type { Hex, Skill, SkillHits } from "../../../types";
import { hitOffset } from "../../math/HitCadence";
import { COMBAT_PARAM } from "../../../constants";
import type { SkillExecutor } from "./SkillExecutor";

interface PendingCast {
    source: Agent;
    skill: Skill;
    hits: SkillHits;
    /** 施放（第 0 段）的引擎時間 */
    startTime: number;
    /** 下一個要打的段序號 */
    nextIndex: number;
    origin: { x: number; y: number } | undefined;
    /** AOE：影響範圍格（每段重新判定範圍內的單位）；單體為 null */
    area: readonly Hex[] | null;
    /** 單體：鎖定的原目標 */
    locked: Agent | null;
    /** 已經套過一次性狀態（硬控等）的目標 id */
    statusApplied: Set<string>;
}

export class MultiHitScheduler {
    private pending: PendingCast[] = [];

    constructor(private readonly executor: SkillExecutor) {}

    public reset() {
        this.pending.length = 0;
    }

    /**
     * 排入一次多段施放並立刻打第 0 段。`area` 非 null＝AOE（第 1 段起重新判定範圍內的單位）；
     * 否則鎖定 `targets[0]`。
     */
    public start(
        source: Agent,
        skill: Skill,
        targets: readonly Agent[],
        origin: { x: number; y: number } | undefined,
        area: readonly Hex[] | null,
        engine: GameEngine
    ) {
        const hits = skill.hits;
        if (!hits || hits.count < 1) return;
        const cast: PendingCast = {
            source,
            skill,
            hits,
            startTime: engine.battleTime,
            nextIndex: 0,
            origin,
            area,
            locked: area ? null : (targets[0] ?? null),
            statusApplied: new Set<string>(),
        };
        this.strike(cast, targets, engine);
        if (cast.nextIndex < cast.hits.count) this.pending.push(cast);
    }

    public update(engine: GameEngine) {
        const list = this.pending;
        let keep = 0;
        for (let i = 0; i < list.length; i++) {
            const cast = list[i];
            // 重開戰鬥後 battleTime 倒退：舊排程作廢
            let alive = engine.battleTime >= cast.startTime;
            while (alive && cast.nextIndex < cast.hits.count && engine.battleTime >= cast.startTime + hitOffset(cast.hits, cast.nextIndex) - COMBAT_PARAM.HIT_TIME_EPSILON_S) {
                if (cast.source.banished) { alive = false; break; }
                this.strike(cast, this.targetsFor(cast, engine), engine);
            }
            if (alive && cast.nextIndex < cast.hits.count) list[keep++] = cast;
        }
        list.length = keep;
    }

    private targetsFor(cast: PendingCast, engine: GameEngine): readonly Agent[] {
        if (cast.area) return this.executor.areaTargets(cast.source, cast.area, cast.skill, engine);
        return cast.locked ? [cast.locked] : [];
    }

    /** 打出第 nextIndex 段：每個目標各走一次完整的 resolveHit。 */
    private strike(cast: PendingCast, targets: readonly Agent[], engine: GameEngine) {
        const index = cast.nextIndex;
        cast.nextIndex++;
        for (const target of targets) {
            const outcome = this.executor.resolveHit(cast.source, target, cast.skill, cast.origin, engine, undefined, {
                powerScale: 1 / cast.hits.count,
                hitIndex: index,
                hitCount: cast.hits.count,
                statusesApplied: cast.statusApplied.has(target.id),
            });
            if (outcome?.landed) cast.statusApplied.add(target.id);
        }
    }
}
