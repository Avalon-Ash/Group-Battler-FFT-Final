
import { Particle } from "./state";
import { PHYSICS } from "../../../constants";

const DEFAULT_GRAVITY = 2500; 

/**
 * 高階美術 TA 物理引擎 - 地形感應版
 * 解決粒子掉落「怪怪的」問題，確保與地圖標高完美互動
 */
export class VFXPhysics {

    public static update(p: Particle, dt: number, getTerrainHeight?: (x: number, y: number) => number) {
        // 1. 基本位移運算
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRotation * dt;

        // 2. 地形感應 logic
        const isPhysical = ['DEBRIS', 'SHARD', 'SPRITE', 'ROCK', 'CHIP', 'RUBBLE'].includes(p.type);
        
        // 獲取當前粒子下方的「邏輯地面高度」
        const currentGroundH = getTerrainHeight ? getTerrainHeight(p.x, p.y) : 0;

        if (isPhysical) {
            // 應用重力 (Z 軸下墜)
            const g = p.gravity !== undefined ? p.gravity : DEFAULT_GRAVITY;
            p.vz -= g * dt;
            p.z += p.vz * dt;

            // 3. 碰撞檢測 (精確到地塊表面)
            // 我們允許粒子稍微滲透 1-2px 以避免 z-fighting
            const floorLevel = currentGroundH + 2;

            if (p.z < floorLevel) {
                // 粒子撞擊地面
                p.z = floorLevel;

                // 彈跳係數
                if (Math.abs(p.vz) > 120) {
                    p.vz = -p.vz * 0.45; // 吸收一半能量反彈
                    p.vx *= 0.7;         // 水平摩擦
                    p.vy *= 0.7;
                    p.vRotation *= 0.6;
                } else {
                    // 停止狀態 (Resting)
                    p.vz = 0;
                    p.vx *= 0.2;
                    p.vy *= 0.2;
                    p.vRotation = 0;
                }
            }
        } else {
            // 大氣粒子 (煙霧、火花、光塵)
            p.z += p.vz * dt;
            
            // 阻力與隨機漂浮感
            if (p.drag !== undefined) {
                const f = 1 - p.drag;
                p.vx *= f; p.vy *= f; p.vz *= f;
            } else {
                // 預設漂浮阻力
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.vz *= 0.94;
            }

            // 非物理粒子不需要嚴格碰撞，但在地面下時應緩緩浮起
            if (p.z < currentGroundH) {
                p.z += (currentGroundH - p.z) * 0.1;
            }
        }

        // 4. 更新歷史標高，防止跨越邊緣時產生瞬間位移抖動
        p.lastGroundHeight = currentGroundH;
    }
}
