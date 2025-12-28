
import { GameEngine } from "../game";
import { Team } from "../../types";
import { VICTORY_PHASE_DURATION } from "../game";

export class VictorySystem {
    public isFinishing: boolean = false;
    public victoryTimer: number = 0;
    public winningTeam: Team | null = null;

    public reset() {
        this.isFinishing = false;
        this.victoryTimer = 0;
        this.winningTeam = null;
    }

    public check(engine: GameEngine): boolean {
        // If already decided, return true to stop regular updates if finishing
        if (this.isFinishing) return true;

        let blue = 0, red = 0;
        for (const a of engine.agents) {
            if (a.hp > 0) a.team === Team.BLUE ? blue++ : red++;
        }

        if ((blue === 0 && red > 0) || (red === 0 && blue > 0)) { 
            this.isFinishing = true;
            this.winningTeam = blue === 0 ? Team.RED : Team.BLUE;
            this.victoryTimer = VICTORY_PHASE_DURATION; 
            
            // Trigger slow mo via TimeSystem
            engine.time.targetTimeScale = 0.4; 
            return true;
        }
        
        return false;
    }

    public updateFinishing(dt: number, engine: GameEngine) {
        if (this.isFinishing) {
            this.victoryTimer -= dt;
            if (this.victoryTimer <= 0) {
                engine.stop();
                engine.time.targetTimeScale = 1.0;
                engine.time.timeScale = 1.0;
                engine.bus.emit('GAME_OVER', { winner: this.winningTeam });
            }
        }
    }
}
