import { BATTLE_RULES } from '../../constants';
import { GameEngine } from "../game";

export class TimeSystem {
    public update(dt: number, engine: GameEngine) {
        const ts = engine.state.time;
        if (Math.abs(ts.targetTimeScale - ts.timeScale) > BATTLE_RULES.TIME_SCALE_SNAP_THRESHOLD) {
            ts.timeScale += (ts.targetTimeScale - ts.timeScale) * BATTLE_RULES.TIME_SCALE_BLEND_RATE * dt; 
        } else {
            ts.timeScale = ts.targetTimeScale;
        }
    }

    public tick(dt: number, engine: GameEngine) {
        engine.state.time.battleTime += dt;
    }
}