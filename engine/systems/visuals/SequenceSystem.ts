
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "./EventVFXMapper";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { UNIT_BODY_OFFSET } from "../../../constants";
import { VisualMath } from "../../math/VisualMath";

/**
 * ECS VFX Sequence Runner v10.0
 * Unified cinematic performance layer.
 */
export class SequenceSystem {
    
    public static run(
        sequence: VFXSequence,
        target: Point3D,
        engine: GameEngine,
        vfx: VFXSystem,
        sourceId?: string
    ) {
        let sourcePos: Point3D | undefined;
        
        // Resolve Source for Beams
        if (sourceId) {
            const agent = engine.agents.find(a => a.id === sourceId);
            if (agent) {
                sourcePos = VisualMath.getUnitAnchor(agent, engine);
            }
        }

        const startTime = Date.now();

        sequence.actions.forEach(action => {
            const execute = () => {
                // Ensure target is still relatively valid (or use static snapshot)
                this.dispatch(action, target, sourcePos, vfx, engine);
            };

            if (action.delay && action.delay > 0) {
                // For sequences, we use standard timeout but we could use a frame-based queue
                setTimeout(execute, action.delay * 1000);
            } else {
                execute();
            }
        });
    }

    private static dispatch(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        
        // Ground Z Ref (Source of Truth for collisions)
        const groundZ = target.z - 2; 

        switch (action.type) {
            case 'PARTICLE':
                vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ);
                break;
            
            case 'BEAM':
                if (source) {
                    vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4);
                }
                break;

            case 'SHAKE':
                if (engine.renderer) engine.renderer.camera.addTrauma(action.shakeIntensity || 0.2);
                break;

            case 'GRID_PULSE':
                // Dynamic selection of pulse type based on color/faction
                const pulseId = action.color?.includes('#3b') || action.color?.includes('#60') ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED';
                vfx.playEffect(pulseId, target.x, target.y, groundZ + 2, action.color, groundZ);
                break;

            case 'HEAVEN_FALL':
                const h = action.height || 1000;
                const p = vfx.state.getParticle();
                p.x = target.x; p.y = target.y; p.z = target.z + h;
                p.vz = -2500; // Increased fall speed for impact
                p.life = (h / 2500) + 0.1; 
                p.maxLife = p.life;
                p.color = action.color || '#fff';
                p.size = (action.scale || 1.5) * 80;
                p.type = action.style === 'METEOR' ? 'ROCK' : 'GIANT_HEX';
                p.targetX = target.x; p.targetY = target.y;
                p.gravity = 5000; // Hard gravity
                p.locked = false;
                vfx.state.particles.push(p);
                break;
        }
    }
}
