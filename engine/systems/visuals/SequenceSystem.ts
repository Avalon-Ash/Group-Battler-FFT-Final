
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { Point3D } from "./EventVFXMapper";
import { VFXSequence, VFXAction } from "../../../types/VFXSchema";
import { VisualMath } from "../../math/VisualMath";

/**
 * ECS VFX Sequence Runner v10.5
 * 強化奧義演出之座標精確度與物理模擬
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
        
        if (sourceId) {
            const agent = engine.agents.find(a => a.id === sourceId);
            if (agent) sourcePos = VisualMath.getUnitAnchor(agent, engine);
        }

        sequence.actions.forEach(action => {
            const execute = () => {
                this.dispatch(action, target, sourcePos, vfx, engine);
            };

            if (action.delay && action.delay > 0) {
                setTimeout(execute, action.delay * 1000);
            } else {
                execute();
            }
        });
    }

    private static dispatch(action: VFXAction, target: Point3D, source: Point3D | undefined, vfx: VFXSystem, engine: GameEngine) {
        const effectId = action.id || 'FX_HIT_GENERIC';
        
        // 數學修正：獲取精確地面高度，並套用微小 Bias 解決穿插
        const groundZ = target.z - 2; 

        switch (action.type) {
            case 'PARTICLE':
                // 奧義粒子強制帶入 pIsUlt 標記（透過 ID 判定或 action 配置）
                vfx.playEffect(effectId, target.x, target.y, target.z, action.color, groundZ);
                break;
            
            case 'BEAM':
                if (source) {
                    vfx.playBeam(action.style || 'GENERIC_BEAM', source, target, action.color, action.duration || 0.4);
                }
                break;

            case 'SHAKE':
                if (engine.renderer) engine.renderer.camera.addTrauma(action.shakeIntensity || 0.3);
                break;

            case 'GRID_PULSE':
                // 強制網格中心對齊
                vfx.playEffect(
                    action.color?.includes('#3b') ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED', 
                    target.x, target.y, groundZ + 4, 
                    action.color, groundZ
                );
                break;

            case 'HEAVEN_FALL':
                const h = action.height || 1200;
                const p = vfx.state.getParticle();
                p.x = target.x; p.y = target.y; p.z = target.z + h;
                p.vz = -3500; // 奧義掉落物應有更高初速
                p.life = (h / 3500) + 0.1; 
                p.maxLife = p.life;
                p.color = action.color || '#fff';
                p.size = (action.scale || 1.8) * 80;
                p.type = action.style === 'METEOR' ? 'ROCK' : 'GIANT_HEX';
                p.locked = false;
                // 標記為奧義組件，影響渲染排序
                (p as any).pIsUlt = true; 
                vfx.state.particles.push(p);
                break;
        }
    }
}
