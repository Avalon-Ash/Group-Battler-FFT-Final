
import { GameEvent } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { CameraSystem } from "../../CameraSystem";
import { Point3D } from "../EventVFXMapper";
import { VFX_REGISTRY } from "../../../../data/vfx/VFXRegistry";

/**
 * 戰鬥視覺處理器 (TA 優化版)
 * 解決「受擊特效貼地」的問題，實現空間噴濺
 */
export class CombatVFXHandler {
    
    public static handle(event: GameEvent, vfx: VFXSystem, camera: CameraSystem, target: Point3D, groundZ: number) {
        
        // 1. 直接傷害特效 (胸口噴濺)
        if (event.type === 'DAMAGE') {
            if (!event.skill?.projectileSpeed) {
                // 如果是直接傷害且不是持續傷害，播放受擊
                if (event.skill?.ccType !== 'DOT') {
                    this.playImpact(event, vfx, target, groundZ);
                } else {
                    // 持續傷害僅播放微弱火花，不觸發強震動
                    vfx.playEffect('FX_STATUS_BURN_LOOP', target.x, target.y, target.z, event.color);
                }
            }
            return;
        }

        // 2. 投射物命中心 (空間接觸點)
        if (event.type === 'PROJECTILE_HIT') {
            if (event.skill?.type !== 'AOE') {
                // 單體投射物：精確在 target.z 噴濺
                this.playImpact(event, vfx, target, groundZ);
                camera.addTrauma(0.12); 
            } else {
                // AOE 接觸點播放一個引導性的火花
                vfx.playEffect('FX_HIT_GENERIC', event.pos.x, event.pos.y, target.z, event.skill?.color, groundZ);
            }
            return;
        }

        // 3. AOE 範圍爆發 (地面為準，但粒子向上噴)
        if (event.type === 'IMPACT_AOE') {
            // AOE 中心點強制在地面，確保地面波形正確
            const impactPoint = { x: event.pos.x, y: event.pos.y, z: groundZ + 2 };
            this.playImpact(event, vfx, impactPoint, groundZ);
            camera.addTrauma(0.3);
            return;
        }
    }

    private static playImpact(event: GameEvent, vfx: VFXSystem, target: Point3D, groundZ: number) {
        const skill = event.skill;
        const color = event.color || '#fff';
        
        let effectId = 'FX_HIT_GENERIC';
        if (skill && skill.visualHitEffect && VFX_REGISTRY[skill.visualHitEffect]) {
            effectId = skill.visualHitEffect;
        }

        // TA 重點：傳入 target.z 作為發射點，groundZ 作為碰撞平面
        // 這樣粒子會從胸口/受擊點噴出，然後受重力掉落到地面彈跳
        vfx.playEffect(effectId, target.x, target.y, target.z, color, groundZ);
    }
}
