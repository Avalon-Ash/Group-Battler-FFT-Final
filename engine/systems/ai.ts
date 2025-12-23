
import { Agent, GameEngine } from "../game";
import { BTNode, Selector, Sequence, Condition, Action } from "../behaviorTree";
import { NodeState } from "../../types";
import { HexUtils } from "../utils";

export class AISystem {
    
    public buildAI(a: Agent, engine: GameEngine): BTNode {
        const root = new Selector("Root");
        
        root.add(new Sequence("Dead")
            .add(new Condition("IsDead", (ctx: Agent) => ctx.hp <= 0))
            .add(new Action("Wait", (ctx: Agent) => { ctx.btStatus = "死亡"; return NodeState.RUNNING; }))
        );

        const cc = new Selector("CC");
        cc.add(new Sequence("Stunned")
            .add(new Condition("IsStun", (ctx: Agent) => ctx.stunTimer > 0))
            .add(new Action("Wait", (ctx: Agent) => { ctx.btStatus = "暈眩"; return NodeState.RUNNING; }))
        );
        cc.add(new Sequence("Banished")
            .add(new Condition("IsBanish", (ctx: Agent) => ctx.banishTimer > 0))
            .add(new Action("Wait", (ctx: Agent) => { ctx.btStatus = "放逐"; return NodeState.RUNNING; }))
        );
        root.add(cc);

        const combat = new Sequence("Combat");
        
        combat.add(new Condition("Target", (ctx: Agent) => {
            engine.movement.updateTarget(ctx, engine);
            return ctx.target !== null;
        }));

        const skillSelector = new Selector("Skills");
        [0, 1, 2].forEach(i => {
            const seq = new Sequence(`Slot${i}`);
            seq.add(new Condition("Ready", (ctx: Agent) => 
                !!ctx.skills[i] && 
                ctx.curCDs[i] <= 0 && 
                ctx.mp >= ctx.skills[i]!.cost && 
                ctx.castingSkillIdx === -1 &&
                ctx.silenceTimer <= 0
            ));
            
            const act = new Selector("Act");
            
            // Priority: Calculate Best Spot, Move There, Then Cast
            act.add(new Sequence("CastOptimal")
                .add(new Condition("FindOpt", (ctx: Agent) => {
                    const result = engine.movement.calculateOptimalTarget(ctx, ctx.skills[i]!, engine);
                    
                    if (result.targetAgent) {
                        ctx.target = result.targetAgent;
                        ctx.targetHex = null;
                        // Range check with Height Bonus using the shared MovementSystem
                        const effRange = engine.movement.getEffectiveRange(ctx, ctx.target.q, ctx.target.r, ctx.skills[i]!.range, engine);
                        return HexUtils.dist(ctx, result.targetAgent) <= effRange;
                    } 
                    else if (result.targetHex) {
                        ctx.target = null;
                        ctx.targetHex = result.targetHex;
                        // Valid ground target found, proceed to execution flow
                        return true; 
                    }
                    return false;
                }))
                .add(new Selector("ExecuteOrMove")
                    // Sub-Selector: Try Cast -> Fail -> Move to Spot
                    .add(new Sequence("TryCast")
                        .add(new Condition("InRange", (ctx: Agent) => {
                            // Re-verify range just before casting (targets move)
                            let tQ = 0, tR = 0;
                            if (ctx.targetHex) { tQ = ctx.targetHex.q; tR = ctx.targetHex.r; }
                            else if (ctx.target) { tQ = ctx.target.q; tR = ctx.target.r; }
                            else return false;

                            const effRange = engine.movement.getEffectiveRange(ctx, tQ, tR, ctx.skills[i]!.range, engine);
                            const dist = ctx.targetHex ? HexUtils.dist(ctx, ctx.targetHex) : HexUtils.dist(ctx, ctx.target!);
                            
                            return dist <= effRange;
                        }))
                        .add(new Action("Do", (ctx: Agent) => {
                            engine.log(ctx, 'DECISION', 'AI決策', '施放技能', `決定使用 ${ctx.skills[i]!.name}`);
                            return engine.performCast(ctx, i);
                        }))
                    )
                    .add(new Action("MoveToSpot", (ctx: Agent) => {
                        const skill = ctx.skills[i]!;
                        // Charge Logic: If skill is melee/short-range (<= 2), burst speed to close gap
                        const speedMult = skill.range <= 2 ? 2.5 : 1.0;
                        if (ctx.targetHex) {
                            if (!ctx.isMoving) engine.log(ctx, 'DECISION', 'AI決策', '戰術移動', `前往最佳施法位置 (${ctx.targetHex.q},${ctx.targetHex.r})`);
                            return engine.movement.moveAgentToHex(ctx, ctx.targetHex, skill.range, engine, speedMult);
                        }
                        // Fallback for moving towards agent if targetHex wasn't set but targetAgent was
                        if (ctx.target) {
                             if (!ctx.isMoving) engine.log(ctx, 'DECISION', 'AI決策', '戰術移動', `接近目標 ${ctx.target.id}`);
                             return engine.movement.moveAgent(ctx, ctx.target, skill.range, engine, speedMult);
                        }
                        return NodeState.FAILURE;
                    }))
                )
            );

            // Default Fallback: Just chase nearest enemy if no optimal move found
            act.add(new Action("MoveGeneral", (ctx: Agent) => {
                engine.movement.updateTarget(ctx, engine); 
                if (!ctx.target) return NodeState.FAILURE;
                
                const skill = ctx.skills[i]!;
                const speedMult = skill.range <= 2 ? 2.5 : 1.0;
                
                // Stickiness check: If we are already moving towards a valid target, don't switch unless much closer
                if (!ctx.isMoving) engine.log(ctx, 'DECISION', 'AI決策', '追擊', `追擊最近目標 ${ctx.target.id}`);
                return engine.movement.moveAgent(ctx, ctx.target, skill.range, engine, speedMult);
            }));
            
            skillSelector.add(seq.add(act));
        });
        
        combat.add(skillSelector);
        
        combat.add(new Action("Idle", (ctx: Agent) => { 
            ctx.btStatus = ctx.silenceTimer > 0 ? "沉默" : "待機"; 
            return NodeState.SUCCESS; 
        }));
        
        return root.add(combat);
    }
}
