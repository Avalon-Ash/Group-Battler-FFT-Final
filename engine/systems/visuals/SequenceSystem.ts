
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "../../math/VisualMath";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { VisualMath } from "../../math/VisualMath";
import { PHYSICS } from "../../../constants";
import { Team } from "../../../types";
import { Particle } from "../vfx/state";
import { vfxPartStore } from "../../renderers/vfxparts/VFXPartStore";
import { METEOR_PARTS, METEOR_NEUTRAL, METEOR_SIZE } from "../../../data/vfx/registry/shared_parts";

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
            if (agent) sourcePos = VisualMath.getCoreAnchor(agent, engine);
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
                        liveSource = VisualMath.getCoreAnchor(agent, engine);
                    }
                }
                this.dispatch(item.action, item.target, liveSource, vfx, engine, item.sourceId);
                this.actionQueue.splice(i, 1);
            }
        }
    }

    private teamOf(sourceId: string | undefined, engine: GameEngine): Team | undefined {
        return sourceId ? engine.agents.find(a => a.id === sourceId)?.team : undefined;
    }

    private dispatch(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine, sourceId?: string) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        
        const groundZ = target.z - VisualMath.Z_LAYERS.DECAL; 

        switch (action.type) {
            case 'PARTICLE':
                vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ);
                break;
            case 'BEAM':
                if (source) {
                    vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4, action.scale ?? 1, this.teamOf(sourceId, engine));
                }
                break;
            case 'SHAKE':
                engine.bus.emit('CAMERA_SHAKE', { intensity: action.shakeIntensity || 0.3 });
                break;
            case 'GRID_PULSE':
                // 依施法者陣營選格子脈衝；曾用 action.color 是否含 '#3b' 判斷，29 個藍方技能播成紅色（docs/VFX_PIPELINE_MAP.md §2.3）
                vfx.playEffect(this.teamOf(sourceId, engine) === Team.BLUE ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED', target.x, target.y, groundZ + VisualMath.Z_LAYERS.HAZARD, action.color, groundZ);
                break;
            case 'HEAVEN_FALL': {
                const h = action.height || 1200;
                const life = Math.sqrt((2 * h) / PHYSICS.GRAVITY) + 0.1;
                const size = (action.scale || 1.8) * 80;
                const spawn = (): Particle => {
                    const p = vfx.state.getParticle();
                    p.x = target.x; p.y = target.y; p.z = target.z + h;
                    p.vz = 0;
                    p.life = life; p.maxLife = life;
                    p.color = action.color || '#fff';
                    p.size = size;
                    p.locked = false;
                    p.pIsUlt = true;
                    p.ultSourceId = sourceId;
                    vfx.state.particles.push(p);
                    return p;
                };
                // 隕石零件（data/vfx/registry/shared_parts.ts）：岩塊＋光暈兩顆 PART_DEBRIS 同步自由落體。
                // 序列只產生 METEOR 樣式；查不到施法者陣營時用中性色階。
                const team = this.teamOf(sourceId, engine);
                const m = team !== undefined ? METEOR_PARTS[team] : METEOR_NEUTRAL;
                const rock = spawn();
                rock.type = 'PART_DEBRIS';
                rock.part = vfxPartStore.get({ kind: 'shard', size: size * METEOR_SIZE.ROCK, shape: 'rock', ramp: m.rockRamp, seed: METEOR_SIZE.SEED });
                rock.vRotation = METEOR_SIZE.SPIN[0] + Math.random() * (METEOR_SIZE.SPIN[1] - METEOR_SIZE.SPIN[0]);
                const glow = spawn();
                glow.type = 'PART_DEBRIS';
                glow.part = vfxPartStore.get({ kind: 'glow', radius: size * METEOR_SIZE.GLOW, ramp: m.glowRamp });
                break;
            }
        }
    }
}
