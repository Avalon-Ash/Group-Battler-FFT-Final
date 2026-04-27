
import { Agent, GameEngine } from "../game";
import { MovementType } from "../../types";
import { HexUtils } from "../utils";
import { PHYSICS } from "../../constants";

export class PhysicsEngine {
    public static applyImpulse(target: Agent, origin: {x: number, y: number}, force: number, randomness: number = 0) {
        const dx = target.px - origin.x;
        const dy = target.py - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const effectiveForce = Math.min(PHYSICS.TERMINAL_VELOCITY_IMPULSE, Math.max(50, force));
        let vx = 0, vy = 0;
        if (len <= 0.1) {
            const ang = Math.random() * Math.PI * 2;
            vx = Math.cos(ang) * effectiveForce;
            vy = Math.sin(ang) * effectiveForce;
        } else {
            vx = (dx / len) * effectiveForce;
            vy = (dy / len) * effectiveForce;
        }
        target.physics.vx += vx;
        target.physics.vy += vy;
        
        target.physics.vAngle += (Math.random() - 0.5) * 10.0; 
        
        if (randomness > 0) target.physics.vAngle += (Math.random() - 0.5) * randomness;
    }

    public update(a: Agent, dt: number, engine: GameEngine) {
        if (a.fullyDead || a.banished) return;
        
        // Sub-step physics to guarantee stability at high time scales
        const maxStep = 0.016; // ~60fps step
        let remainingDt = dt;
        
        while (remainingDt > 0) {
            const stepDt = Math.min(remainingDt, maxStep);
            remainingDt -= stepDt;
            this.stepPhysics(a, stepDt, engine);
        }
    }

    private stepPhysics(a: Agent, dt: number, engine: GameEngine) {
        if (a.hp <= 0) return; // [FIX] Dead units: all physics frozen, no damping decay
        
        const isDead = a.hp <= 0;
        
        const stiffness = isDead ? 0 : PHYSICS.STIFFNESS_ALIVE * 1.2;
        const damping = PHYSICS.DAMPING_ALIVE * 1.1; 
        
        const fx = -stiffness * a.physics.x;
        const fy = -stiffness * a.physics.y;
        const fRot = -stiffness * a.physics.angle * 0.1; 

        // Analytical damping to prevent instability at high dt
        const dampFactor = Math.exp(-damping * dt);
        a.physics.vx *= dampFactor;
        a.physics.vy *= dampFactor;
        a.physics.vAngle *= dampFactor;

        a.physics.vx += fx * dt;
        a.physics.vy += fy * dt;
        a.physics.vAngle += fRot * dt;

        const isAirborne = a.physics.z > 0;
        const isFlying = a.movementType === MovementType.FLYING && !isDead;
        const isDisabled = a.stunTimer > 0 || a.visualStatus === 'FROZEN' || a.visualStatus === 'POLYMORPH';

        // Check if standing on valid ground
        const isGroundValid = engine.isValid(a.q, a.r);

        if (!isGroundValid) {
            // Free fall logic for everyone if ground is gone
            a.stunTimer = Math.max(a.stunTimer, 0.1); // Force out of control
            a.physics.vz -= PHYSICS.GRAVITY * dt;
        } else if (isFlying && !isDisabled) {
            const hoverHeight = 55, hoverFreq = 2.5; 
            const targetZ = hoverHeight + Math.sin(engine.battleTime * hoverFreq) * 5;
            const dz = targetZ - a.physics.z;
            a.physics.vz += dz * 5 * dt;
            a.physics.vz *= 0.92;
        } else if (isAirborne || a.physics.z > 0.1) {
            a.physics.vz -= PHYSICS.GRAVITY * dt;
        }

        a.physics.x += a.physics.vx * dt;
        a.physics.y += a.physics.vy * dt;
        a.physics.z += a.physics.vz * dt;
        a.physics.angle += a.physics.vAngle * dt;

        // Note: Trail Logic moved to PhysicsSystem.ts to centralize history management

        if (a.physics.z < -1000) {
            // Banish anyone (alive or dead) who falls into the abyss
            if (!a.banished) {
                if (!isDead) {
                    a.hp = 0;
                    a.deadLogged = true;
                    engine.log(a, 'DEATH', '墜落', '深淵', '跌落至虛空');
                    engine.pushEvent('DEATH', {x: a.px, y: a.py}, { sourceId: a.id, text: "RING_OUT" });
                    engine.agentManager.handleDeadState(a, engine);
                }
                a.banished = true; // Remove from battlefield rendering and logic
            }
        } else if (isGroundValid && a.physics.z < 0) {
            a.physics.z = 0;
            if (a.physics.vz < -PHYSICS.SAFE_FALL_VELOCITY) {
                const impactSpeed = Math.abs(a.physics.vz);
                if (!isDead) {
                    const velocityOverhead = impactSpeed - PHYSICS.SAFE_FALL_VELOCITY;
                    const scaling = PHYSICS.FATAL_FALL_VELOCITY - PHYSICS.SAFE_FALL_VELOCITY;
                    const pct = Math.min(1.0, velocityOverhead / scaling);
                    const rawDmg = Math.floor(a.maxHp * pct) + PHYSICS.FALL_DAMAGE_MIN;
                    a.hp = Math.max(0, a.hp - rawDmg);
                    engine.events.push({ type: 'DAMAGE', pos: {x: a.px, y: a.py}, value: -rawDmg, color: '#ef4444', text: "墜落" });
                    engine.log(a, 'HAZARD', '墜落', '地面', `受到墜落傷害 ${rawDmg}`);
                    
                    engine.bus.emit('CAMERA_SHAKE', { intensity: pct * 0.5 });

                    if (a.hp <= 0) {
                        a.deadLogged = true;
                        engine.agentManager.handleDeadState(a, engine);
                    } else {
                        // SSOT: Set visual timer instead of imperative setAnim
                        a.hitFlashTimer = 0.2; 
                    }
                }
                a.physics.vz = -a.physics.vz * 0.3;
                a.physics.vx *= 0.5; a.physics.vy *= 0.5; a.physics.vAngle *= 0.5;
            } else {
                a.physics.vz = 0;
            }
        }

        if (!isDead && !a.isMoving) {
            const targetPos = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const dx = targetPos.x - a.px, dy = targetPos.y - a.py;
            const distSq = dx*dx + dy*dy;
            const speedSq = a.physics.vx * a.physics.vx + a.physics.vy * a.physics.vy;
            
            if (speedSq < 5000) {
                if (distSq > 0.5) {
                    const driftSpeed = Math.min(1.0, PHYSICS.DRIFT_SPEED * dt); 
                    a.px += dx * driftSpeed; a.py += dy * driftSpeed;
                    if (distSq < 2) { a.px = targetPos.x; a.py = targetPos.y; }
                } else {
                    a.px = targetPos.x; a.py = targetPos.y;
                }
            }
        }
    }
}
