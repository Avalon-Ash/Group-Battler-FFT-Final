
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "../../math/VisualMath";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { VisualMath } from "../../math/VisualMath";
import { PHYSICS } from "../../../constants";

interface QueuedAction {
    executeAt: number;
    action: VFXAction;
    target: Point3D;
    source?: Point3D;
    sourceId?: string; // Track who started this sequence
}

export class SequenceSystem {
    private actionQueue: QueuedAction[] = [];

    public clear() {
        this.actionQueue = [];
    }

    /**
     * Cancel all pending actions from a specific source (usually because of an interrupt)
     */
    public cancel(sourceId: string, vfx?: VFXSystem) {
        if (!sourceId) return;
        this.actionQueue = this.actionQueue.filter(item => item.sourceId !== sourceId);
        if (vfx) {
            vfx.state.cancelUltBySource(sourceId);
        }
    }

    public run(
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
                this.dispatch(action, target, sourcePos, vfx, engine, sourceId);
            } else {
                this.actionQueue.push({ executeAt, action, target, source: sourcePos, sourceId });
            }
        });
    }

    public update(engine: GameEngine, vfx: VFXSystem) {
        const now = engine.battleTime;
        for (let i = this.actionQueue.length - 1; i >= 0; i--) {
            const item = this.actionQueue[i];
            if (now >= item.executeAt) {
                let liveSource = item.source;
                if (item.sourceId) {
                    const agent = engine.agents.find(a => a.id === item.sourceId);
                    if (agent && agent.hp > 0) {
                        liveSource = VisualMath.getUnitAnchor(agent, engine);
                    }
                }
                this.dispatch(item.action, item.target, liveSource, vfx, engine, item.sourceId);
                this.actionQueue.splice(i, 1);
            }
        }
    }

    private dispatch(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine, sourceId?: string) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        
        const groundZ = target.z - VisualMath.Z_LAYERS.DECAL; 

        switch (action.type) {
            case 'PARTICLE':
                vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ);
                break;
            case 'BEAM':
                if (source) vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4);
                break;
            case 'SHAKE':
                engine.bus.emit('CAMERA_SHAKE', { intensity: action.shakeIntensity || 0.3 });
                break;
            case 'GRID_PULSE':
                vfx.playEffect(action.color?.includes('#3b') ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED', target.x, target.y, groundZ + VisualMath.Z_LAYERS.HAZARD, action.color, groundZ);
                break;
            case 'HEAVEN_FALL':
                const h = action.height || 1200;
                const p = vfx.state.getParticle();
                p.x = target.x; p.y = target.y; p.z = target.z + h;
                p.vz = 0; 
                p.life = Math.sqrt((2 * h) / PHYSICS.GRAVITY) + 0.1; 
                p.maxLife = p.life;
                p.color = action.color || '#fff';
                p.size = (action.scale || 1.8) * 80;
                p.type = action.style === 'METEOR' ? 'ROCK' : 'GIANT_HEX';
                p.locked = false;
                p.pIsUlt = true; 
                p.ultSourceId = sourceId;
                vfx.state.particles.push(p);
                break;
        }
    }
}
