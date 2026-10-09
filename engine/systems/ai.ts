
import { Agent, GameEngine } from "../game";
import { BTNode, Selector, Sequence, Condition, Action } from "../behaviorTree";
import { STANDARD_AI_PROFILE, BTDef } from "../../data/ai_profiles";
import { BTConditions, BTActions } from "../ai/BTRegistry";
import { NodeState } from "../../types";

export class AISystem {
    
    // The new entry point using the Data-Driven Builder
    public buildAI(a: Agent, engine: GameEngine): BTNode {
        // In the future, we can load different profiles based on Agent Role
        // e.g. const profile = AI_DB[a.role] || STANDARD_AI_PROFILE;
        return this.parseNode(STANDARD_AI_PROFILE, engine);
    }

    private parseNode(def: BTDef, engine: GameEngine): BTNode {
        let node: BTNode;

        switch (def.type) {
            case 'SELECTOR':
                node = new Selector(def.name);
                if (def.children) {
                    def.children.forEach(childDef => {
                        node.add(this.parseNode(childDef, engine));
                    });
                }
                break;

            case 'SEQUENCE':
                node = new Sequence(def.name);
                if (def.children) {
                    def.children.forEach(childDef => {
                        node.add(this.parseNode(childDef, engine));
                    });
                }
                break;

            case 'CONDITION':
                const condFn = def.key ? BTConditions[def.key] : null;
                if (!condFn) {
                    console.warn(`AI Builder: Missing Condition Key '${def.key}'`);
                    // Fallback to avoid crash
                    node = new Condition(def.name, () => false); 
                } else {
                    node = new Condition(def.name, (agent: Agent) => condFn(agent, engine, def.args ?? {}));
                }
                break;

            case 'ACTION':
                const actFn = def.key ? BTActions[def.key] : null;
                if (!actFn) {
                    console.warn(`AI Builder: Missing Action Key '${def.key}'`);
                    // Fallback
                    node = new Action(def.name, () => NodeState.FAILURE); // Failure
                } else {
                    node = new Action(def.name, (agent: Agent) => actFn(agent, engine, def.args ?? {}));
                }
                break;
                
            default: {
                const unknownDef: never = def.type;
                throw new Error(`Unknown BT Node Type: ${String(unknownDef)}`);
            }
        }

        return node;
    }
}