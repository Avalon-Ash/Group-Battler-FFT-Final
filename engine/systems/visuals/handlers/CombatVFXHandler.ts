
import { GameEvent } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../EventVFXMapper";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";

export class CombatVFXHandler {
    
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number) {
        
        if (event.type === 'DAMAGE') {
            // Damage triggers Hit VFX only if not part of a projectile (proj handled separately)
            if (!event.skill?.projectileSpeed) {
                this.playHitVFX(event, vfx, target, groundZ);
            }
            return;
        }

        if (event.type === 'PROJECTILE_HIT') {
            if (event.skill?.type !== 'AOE') {
                this.playHitVFX(event, vfx, target, groundZ);
                camera.addTrauma(0.05); 
            } else {
                // Direct hit for AOE projectile contact (spark only, AOE impact handled by IMPACT_AOE)
                vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, groundZ + 5, event.skill?.color, groundZ);
            }
            return;
        }

        if (event.type === 'IMPACT_AOE') {
            // Fallback for AOE if no specific script ran in Cinematic Handler (Router handles script priority?)
            // Actually EventVFXMapper routes IMPACT_AOE to here.
            // But usually AOE has a script. We should check script here or let CinematicHandler handle it?
            // Re-design: IMPACT_AOE is often triggered by scripts. 
            // If it's a generic AOE impact:
            this.playHitVFX(event, vfx, {x: event.pos.x, y: event.pos.y, z: groundZ}, groundZ);
            camera.addTrauma(0.2);
            return;
        }
    }

    private static playHitVFX(event: GameEvent, vfx: VFXSystem, target: Point3D, groundZ: number) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        let effectId = 'FX_HIT_GENERIC';
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            effectId = skill.visualHitEffect;
        }

        // Pass groundZ separately so the player knows where the floor is for shockwaves
        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);
    }
}
