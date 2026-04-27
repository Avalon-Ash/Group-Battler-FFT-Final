import { GameEngine } from "../game";
import { Team } from "../../types";
import { VICTORY_PHASE_DURATION } from "../game";

export class VictorySystem {
    public reset(engine: GameEngine) {
        const vs = engine.state.victory;
        vs.isFinishing = false;
        vs.victoryTimer = 0;
        vs.winningTeam = null;
    }

    public check(engine: GameEngine): boolean {
        const vs = engine.state.victory;
        if (vs.isFinishing) return true;

        let blue = 0, red = 0;
        for (const a of engine.agents) {
            if (a.hp > 0) a.team === Team.BLUE ? blue++ : red++;
        }

        if (blue === 0 && red === 0) {
            vs.isFinishing = true;
            vs.winningTeam = null; 
            vs.victoryTimer = VICTORY_PHASE_DURATION; 
            engine.state.time.targetTimeScale = 0.4; 
            return true;
        }

        if ((blue === 0 && red > 0) || (red === 0 && blue > 0)) { 
            vs.isFinishing = true;
            vs.winningTeam = blue === 0 ? Team.RED : Team.BLUE;
            vs.victoryTimer = VICTORY_PHASE_DURATION; 
            engine.state.time.targetTimeScale = 0.4; 
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
                engine.bus.emit('GAME_OVER', { winner: vs.winningTeam });
            }
        }
    }
}