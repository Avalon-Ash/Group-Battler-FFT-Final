
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "../../math/VisualMath";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { VisualMath } from "../../math/VisualMath";

interface QueuedAction {
    executeAt: number;
    action: VFXAction;
    target: Point3D;
    source?: Point3D;
}

export class SequenceSystem {
    private static actionQueue: QueuedAction[] = [];

    public static clear() {
        this.actionQueue = [];
    }

    public static run(
        sequence: VFXSequence,
        target: Point3D,
        engine: GameEngine,
        vfx: VFXSystem,
        sourceId?: string
    ) {
        let sourcePos: Point3D | undefined;
        if (sourceId) {
            const agent = engine.agents.find(a => a.id === sourceId);
            if (agent) sourcePos = VisualMath.getUnitAnchor(agent, engine);
        }

        const baseTime = engine.battleTime;
        sequence.actions.forEach(action => {
            const executeAt = baseTime + (action.delay || 0);
            if (executeAt <= baseTime) {
                this.dispatch(action, target, sourcePos, vfx, engine);
            } else {
                this.actionQueue.push({ executeAt, action, target, source: sourcePos });
            }
        });
    }

    public static update(engine: GameEngine, vfx: VFXSystem) {
        const now = engine.battleTime;
        for (let i = this.actionQueue.length - 1; i >= 0; i--) {
            const item = this.actionQueue[i];
            if (now >= item.executeAt) {
                this.dispatch(item.action, item.target, item.source, vfx, engine);
                this.actionQueue.splice(i, 1);
            }
        }
    }

    private static dispatch(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        const groundZ = target.z - 2; 

        switch (action.type) {
            case 'PARTICLE':
                vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ);
                break;
            case 'BEAM':
                if (source) vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4);
                break;
            case 'SHAKE':
                if (engine.renderer) engine.renderer.camera.addTrauma(action.shakeIntensity || 0.3);
                break;
            case 'GRID_PULSE':
                vfx.playEffect(action.color?.includes('#3b') ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED', target.x, target.y, groundZ + 4, action.color, groundZ);
                break;
            case 'HEAVEN_FALL':
                const h = action.height || 1200;
                const p = vfx.state.getParticle();
                p.x = target.x; p.y = target.y; p.z = target.z + h;
                p.vz = -3500;
                p.life = (h / 3500) + 0.1; 
                p.maxLife = p.life;
                p.color = action.color || '#fff';
                p.size = (action.scale || 1.8) * 80;
                p.type = action.style === 'METEOR' ? 'ROCK' : 'GIANT_HEX';
                p.locked = false;
                (p as any).pIsUlt = true; 
                vfx.state.particles.push(p);
                break;
        }
    }
}
