
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
                        // Range check with Height Bonus
                        const effRange = engine.movement.getEffectiveRange(ctx, ctx.target.q, ctx.target.r, ctx.skills[i]!.range, engine);
                        return HexUtils.dist(ctx, result.targetAgent) <= effRange;
                    } 
                    else if (result.targetHex) {
                        ctx.target = null;
                        ctx.targetHex = result.targetHex;
                        // Always return TRUE here to allow "Action: Move" to handle the approach!
                        // The next Action "Do" will fail if out of range, falling through to "Move"
                        return true; 
                    }
                    return false;
                }))
                .add(new Selector("ExecuteOrMove")
                    // Sub-Selector: Try Cast -> Fail -> Move to Spot
                    .add(new Sequence("TryCast")
                        .add(new Condition("InRange", (ctx: Agent) => {
                            let targetQ = 0, targetR = 0;
                            if (ctx.targetHex) { targetQ = ctx.targetHex.q; targetR = ctx.targetHex.r; }
                            else if (ctx.target) { targetQ = ctx.target.q; targetR = ctx.target.r; }
                            else return false;

                            const effRange = engine.movement.getEffectiveRange(ctx, targetQ, targetR, ctx.skills[i]!.range, engine);
                            
                            if (ctx.targetHex) return HexUtils.dist(ctx, ctx.targetHex) <= effRange;
                            if (ctx.target) return HexUtils.dist(ctx, ctx.target) <= effRange;
                            return false;
                        }))
                        .add(new Action("Do", (ctx: Agent) => engine.performCast(ctx, i)))
                    )
                    .add(new Action("MoveToSpot", (ctx: Agent) => {
                        const skill = ctx.skills[i]!;
                        // Charge Logic: If skill is melee/short-range (<= 2), burst speed to close gap
                        const speedMult = skill.range <= 2 ? 2.5 : 1.0;
                        if (ctx.targetHex) {
                            return engine.movement.moveAgentToHex(ctx, ctx.targetHex, skill.range, engine, speedMult);
                        }
                        return NodeState.FAILURE;
                    }))
                )
            );

            // Default Fallback: Just chase nearest enemy if no optimal move found
            act.add(new Action("MoveGeneral", (ctx: Agent) => {
                engine.movement.updateTarget(ctx, engine); 
                const skill = ctx.skills[i]!;
                const speedMult = skill.range <= 2 ? 2.5 : 1.0;
                return ctx.target ? engine.movement.moveAgent(ctx, ctx.target, skill.range, engine, speedMult) : NodeState.FAILURE;
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
