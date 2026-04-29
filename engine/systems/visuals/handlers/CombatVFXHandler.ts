
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

        if (event.type === 'HEAL') {
            if (event.text === 'VAMP') {
                vfx.playEffect('FX_VAMP_BURST', target.x, target.y, target.z, event.color || '#be123c');
            } else if (event.text === 'MP') {
                vfx.playEffect('FX_MANA_RESTORE', target.x, target.y, target.z, event.color || '#60a5fa');
            } else {
                vfx.playEffect('FX_HEAL_BURST', target.x, target.y, target.z, event.color || '#86efac');
            }
            return;
        }

        if (event.type === 'DAMAGE') {
            if (event.text === 'SACRIFICE') {
                vfx.playEffect('FX_SELF_DAMAGE', target.x, target.y, target.z, event.color);
                camera.addTrauma(0.2);
            } else if (event.text === 'BURN') {
                vfx.playEffect('FX_MANA_BURN', target.x, target.y, target.z, event.color || '#8b5cf6');
            } else if (!event.skill?.projectileSpeed && event.skill?.ccType !== 'DOT') {
                // Impact VFX now handled in SkillExecutor.resolveHit
                camera.addTrauma(isMassive ? 0.45 : (isCrit ? 0.3 : 0.12));
            } else if (event.skill?.ccType === 'DOT') {
                vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color);
            }
            return;
        }

        // Standardize generic impact height to Hazard/Floor layer
        const impactZ = groundZ + VisualMath.Z_LAYERS.HAZARD;

        if (event.type === 'PROJECTILE_HIT') {
            // Impact VFX now handled in SkillExecutor.resolveHit
            camera.addTrauma(0.2 * intensity);
            return;
        }

        if (event.type === 'IMPACT_AOE') {
            // Impact VFX now handled in SkillExecutor.resolveHit for each target
            camera.addTrauma(0.35 * intensity);
        }
    }
}
