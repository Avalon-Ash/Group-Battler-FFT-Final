
import { Agent, GameEngine } from "../game";
import { MovementType } from "../../types";
import { HexUtils } from "../utils";
import { PHYSICS, DAMAGE_TEXT_COLORS } from "../../constants";
import { applyDirectDamage, applyLethal } from "../systems/combat/DirectDamage";
import { triggerHitFlash } from "../systems/AnimationSystem";
import { random } from "../math/rng";
import { unitEventPos } from "../events/EventPos";

/** 縮圈墜落的初速占「安全落地速度」的比例（向下）。 */
const VOID_FALL_START_SPEED_FACTOR = 0.6;

/**
 * [OWNER] Agent.physics 的位置與積分（z／vz 的直接改寫只在這裡）。
 * 其他模組只能：① 對速度／偏移做 +=／-=（衝量、牽引、瞬移補償），② 呼叫下列寫入 API。
 */
export class PhysicsEngine {
    /** 失去地面而墜落（縮圈）：從地面高度起往下掉，之後由積分與虛空判定處理。 */
    public static startVoidFall(agent: Agent) {
        agent.physics.z = 0;
        agent.physics.vz = -(PHYSICS.SAFE_FALL_VELOCITY * VOID_FALL_START_SPEED_FACTOR);
    }

    /** 換格造成腳下地面高度改變時，由 physics.z 吸收差值，讓腳底世界高度連續（呼叫端是 MapSystem.updateAgentPosition）。 */
    public static absorbGroundShift(agent: Agent, deltaH: number) {
        agent.physics.z += deltaH;
    }

    public static applyImpulse(target: Agent, origin: {x: number, y: number}, force: number, randomness: number = 0) {
        const dx = target.px - origin.x;
        const dy = target.py - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const effectiveForce = Math.min(PHYSICS.TERMINAL_VELOCITY_IMPULSE, Math.max(50, force));
        let vx = 0, vy = 0;
        if (len <= 0.1) {
            const ang = random() * Math.PI * 2;
            vx = Math.cos(ang) * effectiveForce;
            vy = Math.sin(ang) * effectiveForce;
        } else {
            vx = (dx / len) * effectiveForce;
            vy = (dy / len) * effectiveForce;
        }
        target.physics.vx += vx;
        target.physics.vy += vy;
        
        target.physics.vAngle += (random() - 0.5) * 10.0; 
        
        if (randomness > 0) target.physics.vAngle += (random() - 0.5) * randomness;
    }

    public update(a: Agent, dt: number, engine: GameEngine) {
        if (a.fullyDead || a.outOfBounds || (a.banished && engine.isValid(a.q, a.r))) return;
        
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
        if (a.hp <= 0) {
            const isGroundValid = engine.isValid(a.q, a.r);
            if (isGroundValid) return; // [SSOT] Dead units on valid ground: all physics frozen

            // [SSOT] Dead units that lost ground: allow vertical falling only
            a.physics.vz -= PHYSICS.GRAVITY * dt;
            a.physics.z += a.physics.vz * dt;

            if (a.physics.z < -1000) {
                a.outOfBounds = true; // agentManager.updateDeathState 會在同一 tick 回收（fullyDead 唯一寫入者）
            }
            return;
        }
        
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
        // 模擬層讀狀態計時器而非視覺欄位（FROZEN 必伴隨 stunTimer）。
        const isDisabled = a.stunTimer > 0 || a.polymorphTimer > 0;

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
            // Out of bounds anyone (alive or dead) who falls into the abyss
            if (!a.outOfBounds) {
                if (!isDead) {
                    applyLethal(a);
                    engine.agentManager.handleDeadState(a, engine, '墜落', 'RING_OUT');
                }
                a.outOfBounds = true; // Remove from battlefield rendering and logic; fullyDead 由 updateDeathState 回收
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
                    applyDirectDamage(a, rawDmg, true); // 墜落為真實傷害（無視護盾）
                    engine.events.push({ type: 'DAMAGE', pos: unitEventPos(a, engine), value: -rawDmg, color: DAMAGE_TEXT_COLORS.RECOIL, text: "墜落" });
                    engine.log(a, 'HAZARD', '墜落', '地面', `受到墜落傷害 ${rawDmg}`);
                    
                    engine.bus.emit('CAMERA_SHAKE', { intensity: pct * 0.5 });

                    if (a.hp <= 0) {
                        engine.agentManager.handleDeadState(a, engine);
                    } else {
                        // SSOT: Set visual timer instead of imperative setAnim
                        triggerHitFlash(a, 0.2);
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
