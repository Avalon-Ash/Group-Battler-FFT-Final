
import { Agent, GameEngine } from "../game";
import { NodeState, Skill } from "../../types";
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
        engine.movement.updateTarget(a, engine);
        return a.target !== null;
    },
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        const s = a.skills[idx];
        if (!s || a.curCDs[idx] > 0 || a.mp < s.cost || a.castingSkillIdx !== -1) return false;
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;

        const result = engine.movement.calculateOptimalTarget(a, skill, engine);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            const effRange = engine.movement.getEffectiveRange(a, a.target.q, a.target.r, skill.range, engine);
            return HexUtils.dist(a, result.targetAgent) <= effRange;
        } 
        else if (result.targetHex) {
            a.target = null;
            a.targetHex = result.targetHex;
            return true;
        }
        return false;
    },
    
    "IsTargetInRange": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;

        let tQ = 0, tR = 0;
        if (a.targetHex) { tQ = a.targetHex.q; tR = a.targetHex.r; }
        else if (a.target) { tQ = a.target.q; tR = a.target.r; }
        else return false;

        const effRange = engine.movement.getEffectiveRange(a, tQ, tR, skill.range, engine);
        const dist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        return dist <= effRange;
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.btStatus = args.status || "等待";
        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        // If we reached here, AI failed all offensive checks
        a.btStatus = a.silenceTimer > 0 ? "沉默" : "掃描中...";
        return NodeState.SUCCESS;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        if (!a.skills[idx]) return NodeState.FAILURE;
        return engine.combat.initiateCast(a, idx, engine);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;

        const speedMult = skill.range <= 2 ? 2.0 : 1.0;

        if (a.targetHex) {
            return engine.movement.moveAgentToHex(a, a.targetHex, skill.range, engine, speedMult);
        }
        if (a.target) {
             return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;

        // Ensure we actually have a logical target before moving
        if (!a.target) engine.movement.updateTarget(a, engine); 
        if (!a.target) return NodeState.FAILURE;
        
        const speedMult = skill.range <= 2 ? 2.0 : 1.0;
        a.btStatus = `追擊 ${a.target.id}`;
        
        const result = engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
        // If pathfinding says Failure, unit stays still - this is where "Idle" used to happen.
        // We log it so user knows why.
        if (result === NodeState.FAILURE) a.btStatus = "無法抵達";
        return result;
    }
};
