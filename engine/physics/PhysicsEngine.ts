
import { Agent, GameEngine } from "../game";
import { MovementType, AnimState } from "../../types";
import { HexUtils } from "../utils";
import { PHYSICS } from "../../constants";

// Physics Constants
const PHYSICS_STIFFNESS_ALIVE = 150;
const PHYSICS_DAMPING_ALIVE = 25; 

export class PhysicsEngine {

    public update(a: Agent, dt: number, engine: GameEngine) {
        // PERF: Skip physics for units that are fully removed from visual play
        if (a.fullyDead) return;

        const isDead = a.hp <= 0;
        
        // 1. Spring Forces (Return to 0,0 relative local space)
        // Only apply stiffness if alive. Dead units go limp (no spring back).
        const stiffness = isDead ? 0 : PHYSICS_STIFFNESS_ALIVE;
        const damping = PHYSICS_DAMPING_ALIVE; // Keep damping to prevent oscillation

        const fx = -stiffness * a.physics.x;
        const fy = -stiffness * a.physics.y;
        const fRot = -stiffness * a.physics.angle * 0.1; 
        
        // 2. Acceleration (Force - Damping)
        const ax = fx - damping * a.physics.vx;
        const ay = fy - damping * a.physics.vy;
        const aRot = fRot - damping * a.physics.vAngle;
        
        // 3. Integrate Velocity
        a.physics.vx += ax * dt;
        a.physics.vy += ay * dt;
        a.physics.vAngle += aRot * dt;
        
        // 4. Vertical Dynamics (Gravity vs Flight)
        const isAirborne = a.physics.z > 0;
        const isFlying = a.movementType === MovementType.FLYING && !isDead;
        const isDisabled = a.stunTimer > 0 || a.visualStatus === 'FROZEN' || a.visualStatus === 'POLYMORPH';

        if (isFlying && !isDisabled) {
            // HOVER STATE: Bob around a target altitude
            // Adjusted: Lowered from 90 to 55 to be closer to action but still visually flying
            const hoverHeight = 55; 
            const hoverFreq = 2.5; 
            const targetZ = hoverHeight + Math.sin(engine.battleTime * hoverFreq) * 5;
            
            // Soft spring to maintain height
            const dz = targetZ - a.physics.z;
            a.physics.vz += dz * 5 * dt;
            a.physics.vz *= 0.92; // Increased drag to stop oscillation
        } else {
            // Gravity applies if airborne OR if grounded-but-dead (to prevent float glitches) OR if flying unit crashed
            if (isAirborne || a.physics.z > 0.1) {
                a.physics.vz -= PHYSICS.GRAVITY * dt;
            }
        }

        // 5. Integrate Position
        a.physics.x += a.physics.vx * dt;
        a.physics.y += a.physics.vy * dt;
        a.physics.z += a.physics.vz * dt;
        a.physics.angle += a.physics.vAngle * dt;
        
        // 6. Ground Collision & FALL DAMAGE
        if (a.physics.z < 0) {
            // Snap to ground
            a.physics.z = 0;
            
            // --- IMPACT CALCULATION ---
            // Only check if moving downwards fast
            if (a.physics.vz < -PHYSICS.SAFE_FALL_VELOCITY) {
                const impactSpeed = Math.abs(a.physics.vz);
                
                // Fall Damage Logic
                // Only alive units take fall damage.
                // Flying units crash if disabled, so they DO take damage here.
                if (!isDead) {
                    const velocityOverhead = impactSpeed - PHYSICS.SAFE_FALL_VELOCITY;
                    const scaling = PHYSICS.FATAL_FALL_VELOCITY - PHYSICS.SAFE_FALL_VELOCITY;
                    
                    // Damage % = Linear interpolation between Safe and Fatal velocity
                    const pct = Math.min(1.0, velocityOverhead / scaling);
                    const rawDmg = Math.floor(a.maxHp * pct) + PHYSICS.FALL_DAMAGE_MIN;
                    
                    // Apply Damage
                    a.hp = Math.max(0, a.hp - rawDmg);
                    
                    // Feedback
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: {x: a.px, y: a.py}, 
                        value: -rawDmg, 
                        color: '#ef4444',
                        text: "墜落"
                    });
                    engine.log(a, 'HAZARD', '墜落', '地面', `受到墜落傷害 ${rawDmg} (速度: ${Math.round(impactSpeed)})`);
                    
                    // Camera Shake based on impact
                    if (engine.renderer) engine.renderer.camera.addTrauma(pct * 0.5);
                    
                    // Visuals
                    engine.events.push({ 
                        type: 'IMPACT_AOE', 
                        pos: {x: a.px, y: a.py}, 
                        color: '#9ca3af',
                        skill: { aoeRadius: 1 } as any // Mock skill for size
                    });

                    // Death Check
                    if (a.hp <= 0) {
                        engine.log(a, 'DEATH', '墜落', null, '死於重力');
                        engine.agentManager.handleDeadState(a, engine);
                    } else {
                        a.setAnim(AnimState.HIT);
                    }
                }

                // Bounce Physics
                a.physics.vz = -a.physics.vz * 0.3; // Dampened bounce
                a.physics.vx *= 0.5; // Friction
                a.physics.vy *= 0.5;
                a.physics.vAngle *= 0.5;

            } else {
                // Soft Landing
                a.physics.vz = 0;
            }
        }

        // 7. World Position Drift (Slide effect for knockback correction)
        if (!isDead && !a.isMoving) {
            const targetPos = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const dx = targetPos.x - a.px;
            const dy = targetPos.y - a.py;
            const distSq = dx*dx + dy*dy;
            
            // Increased snap threshold to stop jitter
            if (distSq > 0.5) {
                const driftSpeed = 12.0 * dt; // Exp decay
                a.px += dx * driftSpeed;
                a.py += dy * driftSpeed;
                if (distSq < 2) {
                    a.px = targetPos.x;
                    a.py = targetPos.y;
                }
            } else {
                a.px = targetPos.x;
                a.py = targetPos.y;
            }
        }
    }
}
