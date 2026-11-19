
import { Agent, GameEngine } from "../game";
import { BTNode, Selector, Sequence, Condition, Action } from "../behaviorTree";
import { AI_PROFILE_BY_ROLE, PLAYER_MODE_GRAPH, type AIModeDef, type BTDef } from "../../data/ai_profiles";
import { validateModeGraph } from "../ai/ModeGraphValidation";
import { ModeMachine, type ModeEdge } from "../ai/ModeMachine";
import { BTConditions, BTActions, type BTConditionKey, type BTActionKey } from "../ai/BTRegistry";
import { AIMode } from "../../types";

export class AISystem {
    
    // 單位的 AI 是一台狀態機（ModeMachine）；每個模式一棵小樹，圖是資料。
    // 控制者決定用哪一張圖（契約 G3）：玩家用 PLAYER_MODE_GRAPH，AI 依職業查 AI_PROFILE_BY_ROLE（契約 G4）。
    // 建樹前驗證，圖有問題就丟錯，不塞假節點帶過。
    public buildAI(a: Agent, engine: GameEngine): BTNode {
        const graph = a.controller === 'PLAYER' ? PLAYER_MODE_GRAPH : AI_PROFILE_BY_ROLE[a.role];
        const problems = validateModeGraph(graph);
        if (problems.length > 0) throw new Error(`AI 模式圖不合格：\n${problems.join('\n')}`);
        const modes = (Object.entries(graph.modes) as [AIMode, AIModeDef][]).map(([mode, def]) => ({
            mode,
            tree: this.parseNode(def.tree, engine),
            onFailure: def.onFailure,
        }));
        const edges = graph.edges.map((e): ModeEdge => {
            const key = (e.when ?? e.unless) as string;
            const cond = BTConditions[key as BTConditionKey];
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
                // 鍵已由 validateModeGraph 保證存在
                const condFn = BTConditions[def.key as BTConditionKey];
                node = new Condition(def.name, (agent: Agent) => condFn(agent, engine, def.args ?? {}));
                break;

            case 'ACTION':
                const actFn = BTActions[def.key as BTActionKey];
                node = new Action(def.name, (agent: Agent) => actFn(agent, engine, def.args ?? {}));
                break;
                
            default: {
                const unknownDef: never = def.type;
                throw new Error(`Unknown BT Node Type: ${String(unknownDef)}`);
            }
        }

        return node;
    }
}