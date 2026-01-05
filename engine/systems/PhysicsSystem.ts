
import { Agent, GameEngine } from "../game";
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { MovementType } from "../../types";

export class PhysicsSystem {
    private engine: PhysicsEngine;
    private dustTimer: number = 0;

    constructor() {
        this.engine = new PhysicsEngine();
    }

    public update(dt: number, engine: GameEngine) {
        this.dustTimer += dt;
        const canSpawnDust = this.dustTimer > 0.05; // Limit dust rate (20fps)

        for (const a of engine.agents) {
            // Apply Physics Integration
            this.engine.update(a, dt, engine);

            // VFX: Automatic Friction Dust / Sparks
            // 如果單位在地面且速度極快 (擊退或突進)
            if (canSpawnDust && engine.renderer && a.hp > 0) {
                const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
                const isGrounded = a.physics.z < 5;
                const isFlyingUnit = a.movementType === MovementType.FLYING;

                // 速度門檻：300px/s (約正常移動速度的 3 倍，或受擊時)
                if (speedSq > 90000 && isGrounded && !isFlyingUnit) {
                    
                    // 根據速度決定粒子類型
                    const type = speedSq > 250000 ? 'SPARK' : 'DUST'; // 極快時出火花
                    const color = type === 'SPARK' ? '#fbbf24' : '#78716c';
                    
                    // 在腳底生成粒子
                    const terrainH = engine.map.getTerrainHeight(a.q, a.r);
                    engine.renderer.vfx.playEffect(
                        type === 'SPARK' ? 'FX_STATUS_STUN_LOOP' : 'FX_STATUS_ROOT_LOOP', // 重用現有的小型粒子
                        a.px + a.physics.x, 
                        a.py + a.physics.y, 
                        terrainH + 5
                    );
                }
            }
        }

        if (canSpawnDust) this.dustTimer = 0;
    }
}
