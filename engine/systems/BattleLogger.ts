
import { Agent } from "../core/Agent";
import { LogEntry, LogActionType, Team } from "../../types";
import { LOG_COLORS } from "../../constants";

export class BattleLogger {
    public logs: LogEntry[] = [];
    private maxLogs: number = 5000;

    public clear() {
        this.logs = [];
    }

    public log(
        time: number,
        turn: number,
        agent: Agent | null, 
        type: LogActionType, 
        actionName: string, 
        targetInfo: string | null, 
        detail: string = ''
    ) {
        let color = LOG_COLORS.SYSTEM;

        switch(type) {
            case 'MOVE': color = LOG_COLORS.MOVE; break;
            case 'CAST': color = LOG_COLORS.CAST; break;
            case 'HIT': color = LOG_COLORS.HIT; break;
            case 'HEAL': color = LOG_COLORS.HEAL; break;
            case 'DECISION': color = LOG_COLORS.DECISION; break;
            case 'DEATH': color = LOG_COLORS.DEATH; break;
            case 'CC': color = LOG_COLORS.CC; break;
            case 'HAZARD': color = LOG_COLORS.HAZARD; break;
            default: color = LOG_COLORS.SYSTEM; break;
        }

        const entry: LogEntry = {
            id: Math.random().toString(36),
            time: time.toFixed(1),
            turn: Math.floor(turn),
            agentId: agent?.id || 'SYSTEM',
            team: agent?.team,
            location: agent ? `(${agent.q},${agent.r})` : 'global',
            actionType: type,
            actionName: actionName,
            targetInfo: targetInfo || '',
            detail: detail,
            visualColor: color,
            action: actionName,
            target: targetInfo || '',
            loc: agent ? `@(${agent.q},${agent.r})` : ''
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) this.logs.shift(); 
    }
}
