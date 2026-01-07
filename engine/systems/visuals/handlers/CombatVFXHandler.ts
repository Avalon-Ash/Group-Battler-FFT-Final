
import { GameEvent } from "../../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../../../math/VisualMath";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";

export class CombatVFXHandler {
    
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number) {
        const damage = Math.abs(event.value || 0);
        const isCrit = damage > 150;
        const isMassive = damage > 400;

        let intensity = 1.0;
        if (isCrit) intensity = 1.6;
        if (isMassive) intensity = 2.5;

        if (event.type === 'DAMAGE') {
            if (!event.skill?.projectileSpeed) {
                if (event.skill?.ccType !== 'DOT') {
                    // 核心受擊：播放命中特效
                    this.playImpact(event, vfx, target, groundZ, intensity);
                    camera.addTrauma(isMassive ? 0.45 : (isCrit ? 0.3 : 0.12));
                } else {
                    vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color);
                }
            }
            return;
        }

        if (event.type === 'PROJECTILE_HIT') {
            if (event.skill?.type !== 'AOE') {
                this.playImpact(event, vfx, target, groundZ, intensity);
                camera.addTrauma(0.2 * intensity); 
            } else {
                vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, target.z, event.skill?.color, groundZ);
            }
            return;
        }

        if (event.type === 'IMPACT_AOE') {
            // 強制對齊地面 + 4px 抬升解決 Z-fighting
            const impactPoint = { x: event.pos.x, y: event.pos.y, z: groundZ + 4 };
            this.playImpact(event, vfx, impactPoint, groundZ, intensity * 1.2);
            camera.addTrauma(0.35 * intensity);
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

        // 1. 基礎命中粒子
        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);

        // 2. TA 額外加成：重擊閃光
        if (scale > 1.8) {
            const flash = vfx.state.getParticle();
            flash.type = 'GLOW';
            flash.x = target.x; flash.y = target.y; flash.z = target.z;
            flash.size = 120 * scale;
            flash.color = '#ffffff';
            flash.life = 0.08; flash.maxLife = 0.08;
            flash.blendMode = 'lighter';
            vfx.state.particles.push(flash);
        }

        // 3. 散射碎片 (如果非持續性傷害)
        if (event.skill?.ccType !== 'DOT') {
            const count = Math.floor(3 * scale);
            for(let i=0; i<count; i++) {
                const p = vfx.state.getParticle();
                p.x = target.x; p.y = target.y; p.z = target.z;
                p.type = 'CHIP';
                p.color = color;
                p.size = 2 + Math.random() * 4;
                const angle = Math.random() * Math.PI * 2;
                const force = 150 + Math.random() * 300;
                p.vx = Math.cos(angle) * force;
                p.vy = Math.sin(angle) * force;
                p.vz = 200 + Math.random() * 400;
                p.gravity = 3000;
                p.life = 0.4 + Math.random() * 0.4;
                p.maxLife = p.life;
                vfx.state.particles.push(p);
            }
        }
    }
}
