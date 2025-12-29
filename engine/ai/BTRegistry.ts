
import { Agent, GameEngine } from "../game";
import { NodeState } from "../../types";
import { HexUtils } from "../utils";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => a.stunTimer > 0,
    "IsBanished": (a) => a.banishTimer > 0,
    "IsSilenced": (a) => a.silenceTimer > 0,
    "HasTarget": (a, engine) => {
        // RTS 頻率：每 0.5 秒強制掃描一次威脅最高目標，或在沒有目標時掃描
        if (engine.battleTime % 0.5 < 0.02 || !a.target) {
            engine.updateTarget(a);
        }
        return a.target !== null;
    },
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s) return false;
        // 數學容差 CD 檢查
        return a.curCDs[idx] <= 0.01 && a.mp >= s.cost && a.stunTimer <= 0 && !a.banished;
    },
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        // 執行數學權重搜索
        const res = engine.calculateOptimalTarget(a, skill);
        if (res.targetAgent) {
            a.target = res.targetAgent;
            a.targetHex = null;
        } else if (res.targetHex) {
            a.target = null;
            a.targetHex = res.targetHex;
        }
        return (a.target !== null || a.targetHex !== null);
    },
    "IsTargetInRange": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        const targetPos = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        if (!targetPos) return false;
        
        // 使用動態射程判定 (考慮地勢)
        const effRange = engine.getEffectiveRange(a, targetPos.q, targetPos.r, skill.range);
        return HexUtils.dist(a, targetPos) <= effRange;
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.btStatus = args.status || "等待";
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.btStatus = "待機中";
        return NodeState.SUCCESS;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        return engine.initiateCast(a, idx);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        const targetPos = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        if (!skill || !targetPos) return NodeState.FAILURE;
        
        const speedMult = (skill.tag === 'ULT') ? 1.3 : 1.0;
        return engine.moveAgentToHex(a, targetPos, skill.range, speedMult);
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill || !a.target) return NodeState.FAILURE;

        // RTS 優化：攔截預判
        // 只有當目標距離我「預定路徑終點」超過容差時才重新計算 A*
        const currentGoal = a.path.length > 0 ? a.path[a.path.length - 1] : null;
        const tolerance = (a.target.isMoving) ? 1.5 : 0.5;
        const needsNewPath = !currentGoal || HexUtils.dist(currentGoal, a.target) > tolerance;

        if (needsNewPath) {
            const speedMult = (skill.tag === 'ULT') ? 1.4 : 1.1;
            a.btStatus = `截擊 ${a.target.id}`;
            return engine.moveAgentToHex(a, {q: a.target.q, r: a.target.r}, skill.range, speedMult);
        }
        
        return NodeState.RUNNING;
    }
};
