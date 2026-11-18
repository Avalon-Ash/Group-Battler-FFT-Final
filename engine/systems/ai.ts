
import { Agent, GameEngine } from "../game";
import { BTNode, Selector, Sequence, Condition, Action } from "../behaviorTree";
import { AI_MODE_GRAPH, PLAYER_MODE_GRAPH, type AIModeDef, type BTDef } from "../../data/ai_profiles";
import { ModeMachine, type ModeEdge } from "../ai/ModeMachine";
import { BTConditions, BTActions } from "../ai/BTRegistry";
import { NodeState, AIMode } from "../../types";

export class AISystem {
    
    // 單位的 AI 是一台狀態機（ModeMachine）；每個模式一棵小樹，圖是資料。
    // 控制者決定用哪一張圖（契約 G3）：AI 用 AI_MODE_GRAPH，玩家用 PLAYER_MODE_GRAPH。
    public buildAI(a: Agent, engine: GameEngine): BTNode {
        const graph = a.controller === 'PLAYER' ? PLAYER_MODE_GRAPH : AI_MODE_GRAPH;
        const modes = (Object.entries(graph.modes) as [AIMode, AIModeDef][]).map(([mode, def]) => ({
            mode,
            tree: this.parseNode(def.tree, engine),
            onFailure: def.onFailure,
        }));
        const edges = graph.edges.map((e): ModeEdge => {
            const key = (e.when ?? e.unless) as string;
            const cond = BTConditions[key];
            return {
                from: e.from,
                to: e.to,
                why: e.when ? key : `!${key}`,
                test: e.when ? (agent) => cond(agent, engine, {}) : (agent) => !cond(agent, engine, {}),
            };
        });
        return new ModeMachine(graph.initial, modes, edges, () => engine.battleTime);
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