
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../EventVFXMapper";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";

/**
 * 戰鬥視覺處理器 (Juice Edition)
 * Enhances impact feel with trauma scaling, flash frames, and directional debris.
 */
export class CombatVFXHandler {
    
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number) {
        
        // Logic: Calculate "Oomph" Factor based on damage
        const damage = Math.abs(event.value || 0);
        const isCrit = damage > 150; // Simple threshold
        const isMassive = damage > 400; // Ult level

        let intensity = 1.0;
        if (isCrit) intensity = 1.5;
        if (isMassive) intensity = 2.5;

        // 1. Damage Hit (Direct Unit Impact)
        if (event.type === 'DAMAGE') {
            if (!event.skill?.projectileSpeed) {
                // Melee or Instant: Play impact
                if (event.skill?.ccType !== 'DOT') {
                    this.playImpact(event, vfx, target, groundZ, intensity);
                    
                    // Juice: Camera Shake
                    const trauma = isMassive ? 0.4 : (isCrit ? 0.25 : 0.1);
                    camera.addTrauma(trauma);
                } else {
                    // DoT Tick (Minimal visual)
                    vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color);
                }
            }
            return;
        }

        // 2. Projectile Impact
        if (event.type === 'PROJECTILE_HIT') {
            if (event.skill?.type !== 'AOE') {
                // Precise hit on unit body
                this.playImpact(event, vfx, target, groundZ, intensity);
                camera.addTrauma(0.15 * intensity); 
            } else {
                // AOE projectile guide hit
                vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, target.z, event.skill?.color, groundZ);
            }
            return;
        }

        // 3. AOE Blast
        if (event.type === 'IMPACT_AOE') {
            // Force ground alignment
            const impactPoint = { x: event.pos.x, y: event.pos.y, z: groundZ + 5 };
            this.playImpact(event, vfx, impactPoint, groundZ, intensity * 1.2);
            camera.addTrauma(0.3 * intensity);
            return;
        }
    }

    private static playImpact(event: GameEvent, vfx: VFXSystem, target: Point3D, groundZ: number, scale: number = 1.0) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        let effectId = 'FX_HIT_GENERIC';
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            effectId = skill.visualHitEffect;
        }

        // Spawn Primary Effect
        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);

        // Juice: Extra flash for heavy hits
        if (scale > 1.5) {
            const flash = vfx.state.getParticle();
            flash.type = 'GLOW';
            flash.x = target.x; flash.y = target.y; flash.z = target.z;
            flash.size = 100 * scale;
            flash.color = '#ffffff';
            flash.life = 0.1; flash.maxLife = 0.1;
            flash.blendMode = 'screen';
            vfx.state.particles.push(flash);
        }
    }
}
