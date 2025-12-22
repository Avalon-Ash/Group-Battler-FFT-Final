
import { Agent, GameEngine } from "../game";
import { Projectile, Skill, GameEventType, AnimState, Hex } from "../../types";
import { HexUtils, Vector } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";

const UNIT_CHEST_HEIGHT = 40;
const HIT_IMPULSE_MAX = 20;
const HIT_IMPULSE_MIN = 5;

export class CombatSystem {
    public projectiles: Projectile[] = [];

    // =========================================================================================
    // ⚔️ MAIN UPDATE LOOP
    // =========================================================================================

    public update(dt: number, engine: GameEngine) {
        this.updateProjectiles(dt, engine);
        
        // Handle Casting Logic for Agents
        engine.agents.forEach(a => {
            if (a.hp <= 0) return;
            if (a.castingSkillIdx !== -1) {
                this.updateAgentCasting(a, dt, engine);
            }
        });
    }

    private updateAgentCasting(a: Agent, dt: number, engine: GameEngine) {
        // Interrupt Checks
        if (a.stunTimer > 0 || a.banished || a.silenceTimer > 0) {
            const skillName = a.skills[a.castingSkillIdx]?.name || '技能';
            engine.log(a, '中斷', null, `${skillName} 被打斷`);
            
            a.castingSkillIdx = -1;
            a.castTimer = 0;
            a.castingAnimationTimer = 0;
            a.setAnim(AnimState.IDLE); 
            return;
        }

        a.castTimer -= dt;
        if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt; 

        // Cast Completion
        if (a.castTimer <= 0) {
            const s = a.skills[a.castingSkillIdx]!;
            
            // Mana Cost & Gain
            a.mp = Math.min(a.maxMp, Math.max(0, a.mp - s.cost + s.gain));
            a.curCDs[a.castingSkillIdx] = s.cd;
            
            // Execution Branch: Projectile vs Instant
            if (s.projectileSpeed && s.projectileSpeed > 0) {
                 this.spawnProjectile(a, s, engine);
            } else {
                this.executeInstantSkill(a, s, engine);
            }
            
            // Reset State
            a.castingSkillIdx = -1;
            a.castingAnimationTimer = 0;
            a.setAnim(AnimState.COMBAT_IDLE);
        }
    }

    // =========================================================================================
    // 🏹 PROJECTILE LOGIC
    // =========================================================================================

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        // Fallback Visual: Ensure no invisible projectiles
        if (!skill.visual) {
            skill.visual = 'BOLT'; 
        }

        let tx = 0, ty = 0;
        let tid = "";
        let targetPos = {x: 0, y: 0};
        
        if (skill.type === 'AOE') {
             if (source.targetHex) {
                 const p = HexUtils.toPx(source.targetHex.q, source.targetHex.r, engine.mapConfig);
                 tx = p.x; ty = p.y;
                 tid = `ground-${source.targetHex.q},${source.targetHex.r}`;
             } else if (source.target) {
                 tx = source.target.px; ty = source.target.py;
                 tid = source.target.id;
             } else {
                 return; // No target
             }
             targetPos = {x: tx, y: ty};
             this.createProjectile(source, skill, targetPos, tid, engine);
             engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: tid });

        } else {
            // Single Target Projectile
            const targets = (source.target && !source.target.banished && source.target.hp > 0 ? [source.target] : []);
            targets.forEach(t => {
                 targetPos = {x: t.px, y: t.py};
                 this.createProjectile(source, skill, targetPos, t.id, engine);
                 engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: t.id });
            });
        }
    }

    private createProjectile(source: Agent, skill: Skill, targetPos: {x: number, y: number}, targetId: string, engine: GameEngine) {
        this.projectiles.push({
            id: Math.random().toString(),
            x: source.px, 
            y: source.py, 
            startX: source.px, 
            startY: source.py,
            targetId: targetId,
            targetPos: targetPos,
            speed: skill.projectileSpeed || 600, // Safe default
            skill: skill,
            sourceId: source.id,
            team: source.team,
            trail: []
        });
    }

    private updateProjectiles(dt: number, engine: GameEngine) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            const isGroundTarget = p.targetId.startsWith('ground-');
            let target = isGroundTarget ? null : engine.agents.find(a => a.id === p.targetId);
            
            // Homing logic: update target position if unit moves
            if (target && !isGroundTarget) {
                p.targetPos = {x: target.px, y: target.py};
            }

            const dir = Vector.normalize(Vector.sub(p.targetPos, {x: p.x, y: p.y}));
            const dist = Vector.dist({x: p.x, y: p.y}, p.targetPos);
            const moveDist = p.speed * dt;
            
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 20) p.trail.shift();
            
            // Hit Detection
            if (dist <= moveDist || dist < 10) {
                const source = engine.agents.find(a => a.id === p.sourceId) || engine.agents[0]; 
                
                if (p.skill.type === 'AOE') {
                    const hitPos = p.targetPos; 
                    const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                    const radius = p.skill.aoeRadius || 1;
                    const targets = engine.agents.filter(e => e.team !== p.team && e.hp > 0 && !e.banished && HexUtils.dist(hitHex, e) <= radius);
                    targets.forEach(t => { if (source) this.applyDamage(source, t, p.skill, hitPos, engine); });
                    engine.events.push({ type: 'PROJECTILE_HIT', pos: {x: hitPos.x, y: hitPos.y}, skill: p.skill });
                } else {
                    if (target && target.hp > 0 && !target.banished) {
                        if (source) this.applyDamage(source, target, p.skill, undefined, engine);
                    }
                    engine.events.push({ type: 'PROJECTILE_HIT', pos: {x: p.x, y: p.y}, skill: p.skill });
                }
                
                const lastIdx = this.projectiles.length - 1;
                if (i !== lastIdx) {
                    this.projectiles[i] = this.projectiles[lastIdx];
                }
                this.projectiles.pop();
                
            } else {
                p.x += dir.x * moveDist;
                p.y += dir.y * moveDist;
            }
        }
    }

    // =========================================================================================
    // 💥 SKILL EXECUTION (Instant)
    // =========================================================================================

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        const radius = skill.aoeRadius || 1;
        let targets: Agent[] = [];
        let centerHex: Hex | null = null;

        // 1. Identify Targets
        if (skill.type === 'AOE') {
            if (source.targetHex) {
                centerHex = source.targetHex;
            } else if (source.target) {
                centerHex = { q: source.target.q, r: source.target.r };
            } else {
                centerHex = { q: source.q, r: source.r };
            }
            
            if (centerHex) {
                targets = engine.agents.filter(e => 
                    e.team !== source.team && 
                    e.hp > 0 && !e.banished &&
                    HexUtils.dist(centerHex!, e) <= radius
                );
            }
        } else {
            // Single Target - Verify Height-Aware Range
            if (source.target && !source.target.banished && source.target.hp > 0) {
                const effectiveRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                const actualDist = HexUtils.dist(source, source.target);
                
                if (actualDist <= effectiveRange) {
                    targets = [source.target];
                }
            }
        }
        
        const origin = {x: source.px, y: source.py};
        
        // 2. VISUAL ENFORCEMENT: Beam/Tracer for Ranged Instant Attacks
        // If range > 1, we MUST draw a line. If range == 1, it's melee (SMASH/SLASH) handles itself via hit effect.
        targets.forEach(t => {
            const dist = HexUtils.dist(source, t);
            if (dist > 1) {
                engine.events.push({
                    type: 'VISUAL_BEAM',
                    pos: { x: t.px, y: t.py }, // Beam End Point
                    sourceId: source.id,
                    targetId: t.id,
                    skill: skill,
                    color: skill.color
                });
            }
            this.applyDamage(source, t, skill, origin, engine);
        });

        // 3. Melee / Self / Miss Visuals
        if (targets.length === 0 && skill.type === 'AOE' && centerHex) {
             // Missed/Ground Hit logic if needed, but CAST_FINISH handles the ground circle/smash visual
        }

        engine.events.push({ type: 'CAST_FINISH', pos: {x: source.px, y: source.py}, skill: skill });
    }

    public applyDamage(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        let rawDmg = skill.power;
        
        // Execute Logic
        const isExecute1 = skill.effectType === 'EXECUTE';
        const isExecute2 = skill.effectType2 === 'EXECUTE';
        if ((isExecute1 || isExecute2) && target.hp < target.maxHp * 0.3) {
            const multiplier = (isExecute1 ? skill.effectVal : skill.effectVal2) || 1.5;
            rawDmg = Math.floor(rawDmg * multiplier);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "斬殺!", color: "#dc2626" });
        }

        let evtType: GameEventType = 'DAMAGE';
        let val = 0;

        if (rawDmg > 0) {
            target.hp -= rawDmg;
            val = -rawDmg;
            evtType = 'DAMAGE';
            target.setAnim(AnimState.HIT);
            target.hitFlashTimer = 0.2;

            // Physics Impulse
            const originX = origin ? origin.x : source.px;
            const originY = origin ? origin.y : source.py;
            let dx = target.px - originX;
            let dy = target.py - originY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                dx /= len; dy /= len;
                const impactForce = Math.min(HIT_IMPULSE_MAX, Math.max(HIT_IMPULSE_MIN, rawDmg * 0.3));
                target.physics.vx += dx * impactForce;
                target.physics.vy += dy * impactForce;
                target.physics.vAngle += (Math.random() - 0.5) * impactForce * 0.05;
            }

            // Vamp Logic
            const isVamp1 = skill.effectType === 'VAMP';
            const isVamp2 = skill.effectType2 === 'VAMP';
            if ((isVamp1 || isVamp2) && source.hp > 0) {
                const vampPct = (isVamp1 ? skill.effectVal : skill.effectVal2) || 0.5;
                const healAmt = Math.floor(rawDmg * vampPct);
                if (healAmt > 0) {
                    source.hp = Math.min(source.maxHp, source.hp + healAmt);
                    engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: healAmt, color: '#86efac' });
                }
            }

        } else if (rawDmg < 0) {
            const heal = -rawDmg;
            target.hp = Math.min(target.maxHp, target.hp + heal);
            val = heal;
            evtType = 'HEAL';
        }

        // Mana Burn
        const isBurn1 = skill.effectType === 'MANA_BURN';
        const isBurn2 = skill.effectType2 === 'MANA_BURN';
        if (isBurn1 || isBurn2) {
            const burnAmt = (isBurn1 ? skill.effectVal : skill.effectVal2) || 30;
            target.mp = Math.max(0, target.mp - burnAmt);
            source.mp = Math.min(source.maxMp, source.mp + burnAmt);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `-${burnAmt} MP`, color: "#3b82f6" });
        }

        // Mana Restore
        const isRestore1 = skill.effectType === 'MANA_RESTORE';
        const isRestore2 = skill.effectType2 === 'MANA_RESTORE';
        if (isRestore1 || isRestore2) {
             const amt = (isRestore1 ? skill.effectVal : skill.effectVal2) || 30;
             target.mp = Math.min(target.maxMp, target.mp + amt);
             engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `+${amt} MP`, color: "#60a5fa" });
        }

        // EMIT EVENT
        engine.events.push({
            type: evtType,
            pos: { x: target.px, y: target.py },
            value: val,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });
        
        this.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        this.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        engine.log(source, '命中', target.id, `${skill.name} ${rawDmg > 0 ? `-${rawDmg}` : (rawDmg < 0 ? `+${-rawDmg}` : '')}`);
    }

    public applyCC(source: Agent, target: Agent, skill: Skill, type: string | undefined, dur: number | undefined, force: number | undefined, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        if (!type) return;
        const duration = dur || 0;
        const power = force || 0;

        if (type === 'STUN') {
            target.stunTimer = Math.max(target.stunTimer, duration);
            target.isMoving = false;
            target.setAnim(AnimState.STUN);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "暈眩", color: "#facc15" });
            
            const isIce = skill.color.toLowerCase().includes('blue') || 
                          skill.color.includes('#60a5fa') || 
                          skill.color.includes('#e0f2fe') || 
                          skill.name.includes("冰") || 
                          skill.name.includes("凍") || 
                          skill.name.includes("雪");

            if (isIce) {
                target.visualStatus = 'FROZEN';
            }
        } else if (type === 'SILENCE') {
            target.silenceTimer = Math.max(target.silenceTimer, duration);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "沉默", color: "#94a3b8" });
        } else if (type === 'BANISH') {
            target.banishTimer = Math.max(target.banishTimer, duration);
            target.banished = true;
            target.isMoving = false;
            target.setAnim(AnimState.STUN);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "放逐", color: "#c084fc" });
            
            if (skill.name.includes("變形") || skill.name.includes("羊") || skill.name.includes("動物")) {
                target.visualStatus = 'POLYMORPH'; 
            } else {
                target.visualStatus = 'STASIS'; 
            }
        } else if (type === 'KNOCKBACK' || type === 'PULL') {
            const rawForce = Math.max(1, power);
            const resistance = target.weight || 1; 
            const tilesToPush = Math.max(0, rawForce - resistance);
            
            if (tilesToPush === 0) {
                engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "抵抗", color: "#94a3b8" });
                return;
            }

            const originPx = origin ? origin : {x: source.px, y: source.py};
            const dir = Vector.normalize(Vector.sub({x: target.px, y: target.py}, originPx));
            const vector = type === 'KNOCKBACK' ? dir : Vector.mult(dir, -1);
            
            let currentH = {q: target.q, r: target.r};
            let currentHeight = engine.map.getTerrainHeight(currentH.q, currentH.r);
            let finalH = currentH;

            for(let k=0; k<tilesToPush; k++) {
                const neighbors = HexUtils.neighbors(currentH);
                let bestN = null;
                let bestDot = -99;
                
                for(const n of neighbors) {
                    const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                    const cPx = HexUtils.toPx(currentH.q, currentH.r, engine.mapConfig);
                    const nDir = Vector.normalize(Vector.sub(nPx, cPx));
                    const dot = nDir.x * vector.x + nDir.y * vector.y;
                    
                    if (dot > bestDot) {
                        bestDot = dot;
                        bestN = n;
                    }
                }

                if (bestN) {
                    if (!engine.isValid(bestN.q, bestN.r)) break; 
                    if (engine.hasObstacle(bestN.q, bestN.r)) break; 
                    
                    const nextHeight = engine.map.getTerrainHeight(bestN.q, bestN.r);
                    if (nextHeight > currentHeight + BLOCK_HEIGHT) break; 
                    if (nextHeight < currentHeight - BLOCK_HEIGHT * 2) break; 

                    currentH = bestN;
                    currentHeight = nextHeight;
                    finalH = bestN;
                } else {
                    break;
                }
            }
            
            if (finalH.q !== target.q || finalH.r !== target.r) {
                engine.updateAgentPosition(target, finalH.q, finalH.r);
                target.isMoving = false; 
                engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: type === 'PULL' ? "牽引" : "擊退", color: "#fff" });
                target.setAnim(AnimState.HIT);
                target.physics.vz += 200;
            }
        } else if (type === 'DOT') {
            target.dotDmg = power || 5;
            target.dotTimer = duration || 3;
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "中毒", color: "#10b981" });
        } else if (type === 'HOT') {
            target.hotVal = power || 5;
            target.hotTimer = duration || 3;
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "再生", color: "#86efac" });
        }
    }
}
