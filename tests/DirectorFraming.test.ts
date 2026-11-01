import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';

/** 導播目標（主角）永遠是取景群組成員：同樣的場面，換主角鏡頭重心就往主角偏 */
function cameraXFor(focus: 'blue' | 'red'): { x: number; blueX: number; redX: number } {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const blue = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 200, Role.WARRIOR)!;
    const red = engine.agentManager.addAgent(engine, Team.RED, 4, 0, 200, Role.WARRIOR)!;
    expect(blue).toBeTruthy();
    expect(red).toBeTruthy();

    const ds = engine.state.director;
    ds.targetId = focus === 'blue' ? blue.id : red.id;
    ds.focusTimer = 10; // 不讓評分在這一幀換人

    let x = NaN;
    engine.bus.on('CAMERA_MOVE', d => { x = d.x; });
    engine.director.update(engine, 0.016);
    return { x, blueX: blue.px, redX: red.px };
}

describe('DirectorSystem framing follows the director target', () => {
    it('panorama centre leans toward whichever unit is the director target', () => {
        const onBlue = cameraXFor('blue');
        const onRed = cameraXFor('red');
        const mid = (onBlue.blueX + onBlue.redX) / 2;
        expect(Number.isFinite(onBlue.x)).toBe(true);
        expect(Math.abs(onBlue.x - onBlue.blueX)).toBeLessThan(Math.abs(mid - onBlue.blueX));
        expect(Math.abs(onRed.x - onRed.redX)).toBeLessThan(Math.abs(mid - onRed.redX));
    });
});
