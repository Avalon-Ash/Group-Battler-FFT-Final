
import { Agent, GameEngine } from "../game";
import { NodeState, Skill } from "../../types";
import { HexUtils } from "../utils";

// Types needed for the Builder
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
    
    // Skill Checks
    "SkillReady": (a, _, args) => {
        const idx = args.slot; // 0=Ult, 1=Active, 2=Basic
        const s = a.skills[idx];
        return !!s && a.curCDs[idx] <= 0 && a.mp >= s.cost && a.castingSkillIdx === -1 && a.silenceTimer <= 0;
    },
    
    // Tactical Checks
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

        // Re-verify target existence
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
        a.btStatus = a.silenceTimer > 0 ? "沉默" : "待機";
        return NodeState.SUCCESS;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        if (!a.skills[idx]) return NodeState.FAILURE;
        engine.log(a, 'DECISION', 'AI決策', '施放技能', `決定使用 ${a.skills[idx]!.name}`);
        return engine.performCast(a, idx);
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;

        // Charge logic
        const speedMult = skill.range <= 2 ? 2.5 : 1.0;

        if (a.targetHex) {
            if (!a.isMoving) engine.log(a, 'DECISION', 'AI決策', '戰術移動', `前往最佳施法位置`);
            return engine.movement.moveAgentToHex(a, a.targetHex, skill.range, engine, speedMult);
        }
        if (a.target) {
             if (!a.isMoving) engine.log(a, 'DECISION', 'AI決策', '戰術移動', `接近目標 ${a.target.id}`);
             return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;

        engine.movement.updateTarget(a, engine); 
        if (!a.target) return NodeState.FAILURE;
        
        const speedMult = skill.range <= 2 ? 2.5 : 1.0;
        if (!a.isMoving) engine.log(a, 'DECISION', 'AI決策', '追擊', `追擊最近目標 ${a.target.id}`);
        
        return engine.movement.moveAgent(a, a.target, skill.range, engine, speedMult);
    }
};
