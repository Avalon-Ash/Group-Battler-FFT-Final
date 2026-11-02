
import { Agent, GameEngine } from "../game";
import { BTNode, Selector, Sequence, Condition, Action } from "../behaviorTree";
import { AI_MODE_GRAPH, BTDef } from "../../data/ai_profiles";
import { ModeMachine, type ModeEdge } from "../ai/ModeMachine";
import { BTConditions, BTActions } from "../ai/BTRegistry";
import { NodeState, AIMode } from "../../types";

export class AISystem {
    
    // 單位的 AI 是一台狀態機（ModeMachine）；每個模式一棵小樹，圖是資料（AI_MODE_GRAPH）
    public buildAI(_a: Agent, engine: GameEngine): BTNode {
        const modes = (Object.keys(AI_MODE_GRAPH.modes) as AIMode[]).map(mode => ({
            mode,
            tree: this.parseNode(AI_MODE_GRAPH.modes[mode].tree, engine),
            onFailure: AI_MODE_GRAPH.modes[mode].onFailure,
        }));
        const edges = AI_MODE_GRAPH.edges.map((e): ModeEdge => {
            const key = (e.when ?? e.unless) as string;
            const cond = BTConditions[key];
            return {
                from: e.from,
                to: e.to,
                why: e.when ? key : `!${key}`,
                test: e.when ? (agent) => cond(agent, engine, {}) : (agent) => !cond(agent, engine, {}),
            };
        });
        return new ModeMachine(AI_MODE_GRAPH.initial, modes, edges, () => engine.battleTime);
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