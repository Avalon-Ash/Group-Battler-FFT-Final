
import { Agent, GameEngine } from "../../game";
import { Skill, GameEventType, AnimState } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { BLOCK_HEIGHT, COMBAT_PARAM } from "../../../constants";

export class SkillResolutionSystem {

    // =================================================================================
    // 🧠 LOGIC LAYER: ORCHESTRATION
    // =================================================================================

    public updateCasting(a: Agent, dt: number, engine: GameEngine) {
        // Interrupt Checks (Stun / Silence / Banish / Death)
        if (a.stunTimer > 0 || a.banished || a.silenceTimer > 0 || a.hp <= 0) {
            this.handleInterruption(a, engine);
            return;
        }

        a.castTimer -= dt;
        if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt; 

        // Cast Completion
        if (a.castTimer <= 0) {
            this.completeCast(a, engine);
        }
    }

    private handleInterruption(a: Agent, engine: GameEngine) {
        const skillIdx = a.castingSkillIdx;
        
        if (skillIdx !== -1 && a.castTimer > 0 && a.skills[skillIdx]) {
            const s = a.skills[skillIdx]!;
            const skillName = s.name;
            engine.log(a, 'CC', '中斷', skillName, '詠唱被打斷');
            
            // Determine Visual Center for Break Effect
            let centerPos = { x: a.px, y: a.py };
            if (s.type === 'AOE') {
                const centerHex = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : {q: a.q, r: a.r});
                centerPos = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
                const h = engine.map.getTerrainHeight(centerHex.q, centerHex.r);
                centerPos.y -= h;
            } else {
                centerPos.y -= engine.map.getTerrainHeight(a.q, a.r);
            }
            
            engine.events.push({
                type: 'CAST_BREAK',
                pos: centerPos,
                value: s.aoeRadius || 1, 
                color: s.color,
                skill: s
            });
        }
        
        // Reset State
        a.castingSkillIdx = -1;
        a.castTimer = 0;
        a.castingAnimationTimer = 0;
        a.setAnim(AnimState.IDLE); 
    }

    private completeCast(a: Agent, engine: GameEngine) {
        const s = a.skills[a.castingSkillIdx]!;
        
        // Resource & CD
        a.mp = Math.min(a.maxMp, Math.max(0, a.mp - s.cost + s.gain));
        a.curCDs[a.castingSkillIdx] = s.cd;
        
        // Branch: Projectile vs Instant
        if (s.projectileSpeed && s.projectileSpeed > 0) {
             engine.combat.spawnProjectile(a, s, engine);
        } else {
            this.executeInstantSkill(a, s, engine);
        }
        
        // Reset State
        a.castingSkillIdx = -1;
        a.castingAnimationTimer = 0;
        a.setAnim(AnimState.COMBAT_IDLE);
    }

    public executeInstantSkill(source: Agent, skill: Skill, engine: GameEngine) {
        const radius = skill.aoeRadius || 1;
        let targets: Agent[] = [];
        let origin = {x: source.px, y: source.py}; // Default to caster

        // Target Acquisition (Logic)
        if (skill.type === 'AOE') {
            const centerHex = source.targetHex || (source.target ? { q: source.target.q, r: source.target.r } : { q: source.q, r: source.r });
            targets = engine.agents.filter(e => 
                e.team !== source.team && e.hp > 0 && !e.banished && HexUtils.dist(centerHex!, e) <= radius
            );
            
            // For AOE, the impulse origin should be the CENTER of the blast, not the caster
            const p = HexUtils.toPx(centerHex!.q, centerHex!.r, engine.mapConfig);
            origin = { x: p.x, y: p.y };

            // NEW: Spawn Persistent Field if CC Type is DOT (e.g. Poison Cloud, Blizzard)
            if (skill.ccType === 'DOT' || skill.name.includes("霧") || skill.name.includes("雨")) {
                engine.combat.spawnField(source, skill, origin, engine);
            }

            // AOE Impact Event
            engine.events.push({ type: 'IMPACT_AOE', pos: origin, skill, color: skill.color });

        } else {
            if (source.target && !source.target.banished && source.target.hp > 0) {
                const effectiveRange = engine.movement.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
                if (HexUtils.dist(source, source.target) <= effectiveRange) targets = [source.target];
            }
        }
        
        // Apply Hits
        targets.forEach(t => {
            // Visuals
            const dist = HexUtils.dist(source, t);
            if (dist > 2) engine.events.push({ type: 'VISUAL_BEAM', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });
            else if (dist === 2) engine.events.push({ type: 'VISUAL_SLASH', pos: { x: t.px, y: t.py }, sourceId: source.id, targetId: t.id, skill, color: skill.color });

            this.resolveHit(source, t, skill, origin, engine);
        });

        engine.events.push({ type: 'CAST_FINISH', pos: {x: source.px, y: source.py}, skill: skill });
    }

    public resolveHit(source: Agent, target: Agent, skill: Skill, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        // 1. Math: Calculate final damage and effects
        const calc = this.calculateDamageValues(source, target, skill);
        const oldHp = Math.ceil(target.hp);
        
        // --- MATRIX SLOW MOTION CHECK ---
        if (calc.finalDamage >= target.hp && !engine.isFinishing) {
            // Check if this is the LAST unit of the team
            const alliesAlive = engine.agents.filter(a => a.team === target.team && a.hp > 0 && a.id !== target.id).length;
            
            if (alliesAlive === 0) {
                // THE FINAL BLOW!
                engine.timeScale = 0.1; // Snap to instant slow-mo
                engine.targetTimeScale = 0.1; // Hold it
                // We don't set isFinishing here, Engine.tick will detect the death next frame and handle the victory sequence.
                // This just ensures the hit itself is felt.
            }
        }

        // 2. State Mutation: Apply Damage/Heal
        target.hp = Math.min(target.maxHp, target.hp - calc.finalDamage);
        
        // 3. State Mutation: Vamp
        if (calc.vampAmount > 0 && source.hp > 0) {
            source.hp = Math.min(source.maxHp, source.hp + calc.vampAmount);
            engine.events.push({ type: 'HEAL', pos: {x: source.px, y: source.py}, value: calc.vampAmount, color: '#86efac' });
        }

        // 4. State Mutation: Mana Burn
        if (calc.manaBurn > 0) {
            target.mp = Math.max(0, target.mp - calc.manaBurn);
            source.mp = Math.min(source.maxMp, source.mp + calc.manaBurn);
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `-${calc.manaBurn} MP`, color: "#3b82f6" });
        }

        // 5. State Mutation: Mana Restore
        if (calc.manaRestore > 0) {
             target.mp = Math.min(target.maxMp, target.mp + calc.manaRestore);
             engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: `+${calc.manaRestore} MP`, color: "#60a5fa" });
        }

        // 6. Visuals & Physics
        if (calc.finalDamage > 0) {
            target.setAnim(AnimState.HIT);
            target.hitFlashTimer = 0.2;
            
            // Physics Impulse
            // Force origin to be what was passed (explosion center), fall back to source if undefined (e.g. projectile)
            const originPx = origin ? origin : {x: source.px, y: source.py};
            const impulse = this.calculateImpulseVector(originPx, {x: target.px, y: target.py}, calc.finalDamage);
            target.physics.vx += impulse.x;
            target.physics.vy += impulse.y;
            target.physics.vAngle += (Math.random() - 0.5) * 0.5;
        }

        // 7. Events & Logging
        if (calc.isExecute) engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "斬殺!", color: "#dc2626" });
        
        engine.events.push({
            type: calc.finalDamage > 0 ? 'DAMAGE' : 'HEAL',
            pos: { x: target.px, y: target.py },
            value: -calc.finalDamage,
            sourceId: source.id,
            targetId: target.id,
            skill: skill,
            color: skill.color
        });

        // Apply CC
        this.applyCC(source, target, skill, skill.ccType, skill.ccDur, skill.ccForce, origin, engine);
        this.applyCC(source, target, skill, skill.ccType2, skill.ccDur2, skill.ccForce2, origin, engine);

        const newHp = Math.ceil(target.hp);
        engine.log(source, calc.finalDamage > 0 ? 'HIT' : 'HEAL', skill.name, target.id, `${calc.finalDamage > 0 ? '造成傷害' : '回復生命'} ${Math.abs(calc.finalDamage)} (HP: ${oldHp} -> ${newHp})`);

        if (oldHp > 0 && newHp <= 0) {
            engine.log(source, 'DEATH', '擊殺', target.id, `${target.id} 已陣亡`);
            engine.events.push({ type: 'KILL', pos: { x: target.px, y: target.py }, sourceId: source.id, targetId: target.id });
        }
    }

    public applyCC(source: Agent, target: Agent, skill: Skill, type: string | undefined, dur: number | undefined, force: number | undefined, origin: {x: number, y: number} | undefined, engine: GameEngine) {
        if (!type || type === 'NONE') return;
        
        // 1. Math: Diminishing Returns Calculation
        const { effectiveDuration, isImmune, isReduced } = this.calculateControlDuration(target, type, dur || 0);
        
        if (isImmune) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "免疫!", color: "#9ca3af" });
            return;
        }
        if (isReduced) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py - 20}, text: "抵抗", color: "#9ca3af" });
        }

        // Apply DR Stack (State Mutation)
        if (['STUN', 'SILENCE', 'BANISH'].includes(type)) {
            target.drStacks[type] = (target.drStacks[type] || 0) + 1;
            target.drTimers[type] = COMBAT_PARAM.DR_RESET_TIME;
        }

        // 2. Logic: Apply Effect
        let statusText = "";
        let statusColor = "#fff";

        if (type === 'STUN') {
            if (effectiveDuration > target.stunTimer) {
                target.stunTimer = effectiveDuration;
                target.stunMax = effectiveDuration;
            }
            target.isMoving = false;
            target.setAnim(AnimState.STUN);
            statusText = "暈眩";
            statusColor = "#facc15"; 
            if (this.isIceSkill(skill)) target.visualStatus = 'FROZEN';

        } else if (type === 'SILENCE') {
            if (effectiveDuration > target.silenceTimer) {
                target.silenceTimer = effectiveDuration;
                target.silenceMax = effectiveDuration;
            }
            statusText = "沉默";
            statusColor = "#94a3b8"; 

        } else if (type === 'BANISH') {
            if (effectiveDuration > target.banishTimer) {
                target.banishTimer = effectiveDuration;
                target.banishMax = effectiveDuration;
            }
            target.banished = true;
            target.isMoving = false;
            target.setAnim(AnimState.STUN);
            statusText = "放逐";
            statusColor = "#c084fc"; 
            
            // Visual Sub-types
            if (skill.name.includes("變形") || skill.name.includes("羊") || skill.name.includes("動物")) {
                target.visualStatus = 'POLYMORPH'; statusText = "變形";
            } else if (skill.name.includes("無敵") || skill.name.includes("金身") || skill.name.includes("干涉")) {
                target.visualStatus = 'STASIS'; statusText = "凝滯";
            } else {
                target.visualStatus = 'NONE';
            }

        } else if (type === 'KNOCKBACK' || type === 'PULL') {
            const result = this.calculateKnockback(target, force || 0, source, origin, type, engine);
            if (result.applied) {
                statusText = type === 'PULL' ? "牽引" : "擊退";
                statusColor = "#fff";
                target.setAnim(AnimState.HIT);
                // Visual pop-up when knocked
                target.physics.vz += 200;
            } else {
                engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "抵抗", color: "#94a3b8" });
            }

        } else if (type === 'DOT') {
            target.dotDmg = force || 5;
            target.dotTimer = effectiveDuration || 3;
            statusText = "中毒";
            statusColor = "#10b981";

        } else if (type === 'HOT') {
            target.hotVal = force || 5;
            target.hotTimer = effectiveDuration || 3;
            statusText = "再生";
            statusColor = "#86efac";
        }

        if (statusText) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: statusText, color: statusColor });
        }
    }

    // =================================================================================
    // 🧮 MATH LAYER: PURE CALCULATIONS
    // =================================================================================

    private calculateDamageValues(source: Agent, target: Agent, skill: Skill) {
        let rawDmg = skill.power;
        let isExecute = false;
        
        // Execute Logic
        const isExec1 = skill.effectType === 'EXECUTE';
        const isExec2 = skill.effectType2 === 'EXECUTE';
        if ((isExec1 || isExec2) && target.hp < target.maxHp * COMBAT_PARAM.EXECUTE_THRESHOLD) {
            const multiplier = (isExec1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_EXECUTE_MULTIPLIER;
            rawDmg = Math.floor(rawDmg * multiplier);
            isExecute = true;
        }

        // Vamp Logic
        let vampAmount = 0;
        const isVamp1 = skill.effectType === 'VAMP';
        const isVamp2 = skill.effectType2 === 'VAMP';
        if (rawDmg > 0 && (isVamp1 || isVamp2)) {
            const vampPct = (isVamp1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_VAMP_PCT;
            vampAmount = Math.floor(rawDmg * vampPct);
        }

        // Mana Calculations
        let manaBurn = 0;
        let manaRestore = 0;
        const e1 = skill.effectType; const e2 = skill.effectType2;
        const v1 = skill.effectVal; const v2 = skill.effectVal2;

        if (e1 === 'MANA_BURN') manaBurn += (v1 || COMBAT_PARAM.MANA_BURN_DEFAULT);
        if (e2 === 'MANA_BURN') manaBurn += (v2 || COMBAT_PARAM.MANA_BURN_DEFAULT);
        
        if (e1 === 'MANA_RESTORE') manaRestore += (v1 || COMBAT_PARAM.MANA_RESTORE_DEFAULT);
        if (e2 === 'MANA_RESTORE') manaRestore += (v2 || COMBAT_PARAM.MANA_RESTORE_DEFAULT);

        return { finalDamage: rawDmg, isExecute, vampAmount, manaBurn, manaRestore };
    }

    private calculateControlDuration(target: Agent, type: string, baseDuration: number) {
        // Diminishing Returns (DR)
        const isHardCC = ['STUN', 'SILENCE', 'BANISH'].includes(type);
        if (!isHardCC) return { effectiveDuration: baseDuration, isImmune: false, isReduced: false };

        const currentStack = target.drStacks[type] || 0;
        // Formula: 1 / (2 ^ stack)
        let drMultiplier = Math.pow(0.5, currentStack);
        if (drMultiplier < 0.2) drMultiplier = 0;

        return {
            effectiveDuration: baseDuration * drMultiplier,
            isImmune: drMultiplier === 0,
            isReduced: drMultiplier < 1.0 && drMultiplier > 0
        };
    }

    private calculateImpulseVector(origin: {x: number, y: number}, target: {x: number, y: number}, damage: number) {
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        // If center hit, random scatter
        if (len <= 0) {
            const ang = Math.random() * Math.PI * 2;
            return {
                x: Math.cos(ang) * COMBAT_PARAM.HIT_IMPULSE_MIN,
                y: Math.sin(ang) * COMBAT_PARAM.HIT_IMPULSE_MIN
            };
        }
        
        // Dynamic Force Calculation
        // Use a much stronger multiplier to be visible against physics stiffness
        const force = Math.min(COMBAT_PARAM.HIT_IMPULSE_MAX, Math.max(COMBAT_PARAM.HIT_IMPULSE_MIN, damage * 1.5));
        
        return {
            x: (dx / len) * force,
            y: (dy / len) * force
        };
    }

    private calculateKnockback(target: Agent, force: number, source: Agent, origin: {x: number, y: number} | undefined, type: string, engine: GameEngine) {
        const rawForce = Math.max(1, force);
        const resistance = target.weight || 1; 
        
        // --- PHYSICS RULE: Force must exceed resistance to move ---
        const tilesToPush = Math.max(0, rawForce - resistance);
        
        if (tilesToPush === 0) return { applied: false };

        const originPx = origin ? origin : {x: source.px, y: source.py};
        const dir = Vector.normalize(Vector.sub({x: target.px, y: target.py}, originPx));
        const vector = type === 'KNOCKBACK' ? dir : Vector.mult(dir, -1);
        
        let currentH = {q: target.q, r: target.r};
        let currentHeight = engine.map.getTerrainHeight(currentH.q, currentH.r);
        let finalH = currentH;

        // --- KNOCKBACK ITERATION ---
        for(let k=0; k<tilesToPush; k++) {
            const neighbors = HexUtils.neighbors(currentH);
            let bestN = null;
            let bestDot = -99;
            
            // Find direction
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
                // 1. Map Bounds
                if (!engine.isValid(bestN.q, bestN.r)) break; 
                
                // 2. Unit Collision (Block if another unit is there)
                // We pass 'target.id' as ignoreId, because we don't want to collide with ourselves, 
                // but we DO want to collide with everyone else.
                if (engine.isBlocked(bestN.q, bestN.r, target.id, target.movementType)) break;
                
                // 3. PULL Special Rule: Do not pull INTO the source (Stop adjacent)
                // If the next tile is the source tile, and it's a pull, stop here.
                if (type === 'PULL' && bestN.q === source.q && bestN.r === source.r) break;

                // 4. Height Check (Walls/Cliffs)
                // Knockback ignores some height rules but shouldn't push up a 50m wall
                const nextHeight = engine.map.getTerrainHeight(bestN.q, bestN.r);
                if (nextHeight > currentHeight + BLOCK_HEIGHT * 2) break; // Can't push up too high
                if (nextHeight < currentHeight - BLOCK_HEIGHT * 3) break; // Can't push off huge cliff safely

                currentH = bestN;
                currentHeight = nextHeight;
                finalH = bestN;
            } else {
                break;
            }
        }
        
        if (finalH.q !== target.q || finalH.r !== target.r) {
            engine.updateAgentPosition(target, finalH.q, finalH.r);
            // Visual: Reset path interpolation to avoid glitching
            if (target.isMoving) {
                target.isMoving = false;
                target.path = [];
            }
            return { applied: true };
        }
        return { applied: false };
    }

    private isIceSkill(skill: Skill): boolean {
        const c = skill.color.toLowerCase();
        const n = skill.name;
        return c.includes('blue') || c.includes('#60a5fa') || c.includes('#e0f2fe') || 
               n.includes("冰") || n.includes("凍") || n.includes("雪");
    }
}
