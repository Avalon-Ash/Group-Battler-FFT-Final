
import { GameEvent } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D, VisualMath } from "../../../math/VisualMath";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";

export class CombatVFXHandler {
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number) {
        const damage = Math.abs(event.value || 0);
        const isCrit = damage > 150;
        const isMassive = damage > 400;
        let intensity = isMassive ? 2.5 : (isCrit ? 1.6 : 1.0);

        if (event.type === 'DAMAGE') {
            if (!event.skill?.projectileSpeed && event.skill?.ccType !== 'DOT') {
                this.playImpact(event, vfx, target, groundZ, intensity);
                camera.addTrauma(isMassive ? 0.45 : (isCrit ? 0.3 : 0.12));
            } else if (event.skill?.ccType === 'DOT') {
                vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color);
            }
            return;
        }

        // Standardize generic impact height to Hazard/Floor layer
        const impactZ = groundZ + VisualMath.Z_LAYERS.HAZARD;

        if (event.type === 'PROJECTILE_HIT') {
            const pos = event.skill?.type === 'AOE' ? { x: event.pos.x, y: event.pos.y, z: impactZ } : target;
            this.playImpact(event, vfx, pos, groundZ, intensity);
            camera.addTrauma(0.2 * intensity);
            return;
        }

        if (event.type === 'IMPACT_AOE') {
            const impactPoint = { x: event.pos.x, y: event.pos.y, z: impactZ };
            this.playImpact(event, vfx, impactPoint, groundZ, intensity * 1.2);
            camera.addTrauma(0.35 * intensity);
        }
    }

    private static playImpact(event: GameEvent, vfx: VFXSystem, target: Point3D, groundZ: number, scale: number = 1.0) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        let effectId = skill?.visualHitEffect || this.getFallbackByElement(skill?.element);

        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);

        if (scale > 1.8) {
            vfx.playEffect('FX_HIT_GENERIC', target.x, target.y, target.z, '#ffffff');
        }
    }

    private static getFallbackByElement(element?: string): string {
        switch(element) {
            case 'FIRE': return 'FX_HIT_FIRE';
            case 'ICE': return 'FX_HIT_BLUE_ICE';
            case 'LIGHTNING': return 'FX_HIT_BLUE_TECH';
            case 'BLOOD': return 'FX_HIT_RED_BLOOD';
            default: return 'FX_HIT_GENERIC';
        }
    }
}
