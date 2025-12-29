import { GameEngine } from "../game";

export class TimeSystem {
    public update(dt: number, engine: GameEngine) {
        const ts = engine.state.time;
        if (Math.abs(ts.targetTimeScale - ts.timeScale) > 0.01) {
            ts.timeScale += (ts.targetTimeScale - ts.timeScale) * 5.0 * dt; 
        } else {
            ts.timeScale = ts.targetTimeScale;
        }
    }

    public tick(dt: number, engine: GameEngine) {
        engine.state.time.battleTime += dt;
    }
}