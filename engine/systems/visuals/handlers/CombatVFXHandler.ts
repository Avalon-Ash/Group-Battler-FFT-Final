
import { GameEvent } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D, VisualMath } from "../../../math/VisualMath";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";
import { COMBAT_PARAM } from "../../../../constants";

export class CombatVFXHandler {
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number, hexKey?: string) {
        if (event.type === 'HIT_FX') {
            const hitFX = event.text || 'FX_HIT_BLUE_TECH';
            const hitDamage = event.value || 0;
            const shieldAbsorb = event.absorbed || 0;
            const hitX = target.x;
            const hitY = target.y;
            const hitZ = groundZ;

            if (shieldAbsorb > 0) {
                vfx.playEffect('FX_HIT_SHIELD_SPARK', hitX, hitY, hitZ, undefined, undefined, undefined, hexKey);
            } else {
                vfx.playEffect(hitFX, hitX, hitY, hitZ, undefined, undefined, undefined, hexKey);
                if (hitDamage >= COMBAT_PARAM.HIT_MEDIUM_THRESHOLD) {
                    vfx.playEffect(hitFX, hitX + COMBAT_PARAM.HIT_FX_OFFSET, hitY - COMBAT_PARAM.HIT_FX_OFFSET, hitZ, undefined, undefined, undefined, hexKey);
                }
            }

            if (hitDamage >= COMBAT_PARAM.HIT_HEAVY_THRESHOLD) {
                vfx.playEffect('EASING_SHOCKWAVE', hitX, hitY, hitZ, undefined, undefined, undefined, hexKey);
            }
            return;
        }

        const damage = Math.abs(event.value || 0);
        const isCrit = damage > 150;
        const isMassive = damage > 400;
        let intensity = isMassive ? 2.5 : (isCrit ? 1.6 : 1.0);

        if (event.type === 'HEAL') {
            if (event.text === 'VAMP') {
                vfx.playEffect('FX_VAMP_BURST', target.x, target.y, target.z, event.color || '#be123c', undefined, undefined, hexKey);
            } else if (event.text === 'MP') {
                vfx.playEffect('FX_MANA_RESTORE', target.x, target.y, target.z, event.color || '#60a5fa', undefined, undefined, hexKey);
            } else {
                vfx.playEffect('FX_HEAL_BURST', target.x, target.y, target.z, event.color || '#86efac', undefined, undefined, hexKey);
            }
            return;
        }

        if (event.type === 'DAMAGE') {
            if (event.text === 'SACRIFICE') {
                vfx.playEffect('FX_SELF_DAMAGE', target.x, target.y, target.z, event.color, undefined, undefined, hexKey);
                camera.addTrauma(0.2);
            } else if (event.text === 'BURN') {
                vfx.playEffect('FX_MANA_BURN', target.x, target.y, target.z, event.color || '#8b5cf6', undefined, undefined, hexKey);
            } else if (!event.skill?.projectileSpeed && event.skill?.ccType !== 'DOT') {
                // Impact VFX now handled in SkillExecutor.resolveHit
                camera.addTrauma(isMassive ? 0.45 : (isCrit ? 0.3 : 0.12));
            } else if (event.skill?.ccType === 'DOT') {
                vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color, undefined, undefined, hexKey);
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
