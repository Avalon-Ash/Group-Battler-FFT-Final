import { BATTLE_RULES } from '../../constants';
import { GameEngine } from "../game";
import type { Agent } from "../core/Agent";
import { sameSide } from "../core/Allegiance";
import { VICTORY_PHASE_DURATION } from "../game";

export class VictorySystem {
    public reset(engine: GameEngine) {
        const vs = engine.state.victory;
        vs.isFinishing = false;
        vs.victoryTimer = 0;
        vs.winningTeam = null;
        vs.winnerId = null;
    }

    public check(engine: GameEngine): boolean {
        const vs = engine.state.victory;
        if (vs.isFinishing) return true;

        // 勝負看陣營（Allegiance）：一般模式 side＝team；大逃殺每人一個 side，最後剩一個 side 就結束
        let survivor: Agent | null = null;
        let contested = false;
        for (const a of engine.agents) {
            if (a.hp <= 0) continue;
            if (!survivor) survivor = a;
            else if (!sameSide(a, survivor)) { contested = true; break; }
        }

        if (!survivor) {
            vs.isFinishing = true;
            vs.winningTeam = null;
            vs.winnerId = null; 
            vs.victoryTimer = VICTORY_PHASE_DURATION; 
            engine.state.time.targetTimeScale = BATTLE_RULES.FINISH_TIME_SCALE; 
            return true;
        }

        if (!contested) {
            vs.isFinishing = true;
            vs.winningTeam = survivor.team;
            vs.winnerId = survivor.id;
            vs.victoryTimer = VICTORY_PHASE_DURATION; 
            engine.state.time.targetTimeScale = BATTLE_RULES.FINISH_TIME_SCALE; 
            return true;
        }
        
        return false;
    }

    public updateFinishing(dt: number, engine: GameEngine) {
        const vs = engine.state.victory;
        if (vs.isFinishing) {
            vs.victoryTimer -= dt;
            if (vs.victoryTimer <= 0) {
                engine.stop();
                engine.state.time.targetTimeScale = 1.0;
                engine.state.time.timeScale = 1.0;
                engine.bus.emit('GAME_OVER', { winner: vs.winningTeam, winnerId: vs.winnerId ?? undefined });
            }
        }
    }
}