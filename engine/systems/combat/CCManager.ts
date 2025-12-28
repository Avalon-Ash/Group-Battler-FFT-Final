
import { Agent, GameEngine } from "../../game";
import { Skill, AnimState } from "../../../types";
import { Vector, HexUtils } from "../../utils";

export const CCManager = {
    
    // Unified Entry Point
    applyCC(
        source: Agent, 
        target: Agent, 
        skill: Skill, 
        type: string | undefined, 
        dur: number | undefined, 
        force: number | undefined, 
        origin: {x: number, y: number} | undefined, 
        engine: GameEngine
    ) {
        if (!type || type === 'NONE') return;
        
        // 1. DR Check
        const { effectiveDuration, isImmune } = this.checkDR(target, type, dur || 0);
        
        if (isImmune) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: "免疫", color: "#9ca3af" });
            return;
        }

        let statusText = "";
        let statusColor = "#fff";

        // 2. Application Logic
        switch (type) {
            case 'STUN':
                // Extend duration logic
                if (effectiveDuration > target.stunTimer) {
                    target.stunTimer = effectiveDuration;
                    target.stunMax = effectiveDuration;
                }
                target.isMoving = false;
                // Don't override DEATH animation
                if (target.hp > 0) target.setAnim(AnimState.STUN);
                statusText = "暈眩"; statusColor = "#facc15";
                
                // Special Visuals
                if (skill.element === 'ICE') target.visualStatus = 'FROZEN';
                break;

            case 'SILENCE':
                if (effectiveDuration > target.silenceTimer) {
                    target.silenceTimer = effectiveDuration;
                    target.silenceMax = effectiveDuration;
                }
                statusText = "沉默"; statusColor = "#94a3b8";
                break;

            case 'BANISH':
                if (effectiveDuration > target.banishTimer) {
                    target.banishTimer = effectiveDuration;
                    target.banishMax = effectiveDuration;
                }
                target.banished = true;
                target.isMoving = false;
                if (target.hp > 0) target.setAnim(AnimState.STUN);
                
                statusText = "放逐"; statusColor = "#c084fc";
                
                // Model Swap
                if (skill.specialVisualStatus) target.visualStatus = skill.specialVisualStatus;
                break;

            case 'ROOT':
                if (effectiveDuration > target.rootTimer) target.rootTimer = effectiveDuration;
                target.isMoving = false;
                statusText = "禁錮"; statusColor = "#fbbf24";
                break;

            case 'FEAR':
                if (effectiveDuration > target.fearTimer) target.fearTimer = effectiveDuration;
                statusText = "恐懼"; statusColor = "#a855f7";
                break;

            case 'TAUNT':
                if (effectiveDuration > target.tauntTimer) {
                    target.tauntTimer = effectiveDuration;
                    target.tauntTargetId = source.id; 
                }
                statusText = "嘲諷"; statusColor = "#ef4444";
                break;

            case 'BLIND':
                if (effectiveDuration > target.blindTimer) target.blindTimer = effectiveDuration;
                statusText = "致盲"; statusColor = "#cbd5e1";
                break;

            case 'SHIELD':
                // Force = Shield Amount
                const amount = force || 50;
                target.shield += amount;
                target.maxShield = Math.max(target.maxShield, target.shield);
                statusText = "護盾"; statusColor = "#bae6fd";
                break;

            case 'KNOCKBACK':
            case 'PULL':
                const result = this.calculateKnockback(target, force || 0, source, origin, type, engine);
                if (result.applied) {
                    statusText = type === 'PULL' ? "牽引" : "擊退";
                    if (target.hp > 0) target.setAnim(AnimState.HIT);
                    target.physics.vz += 150; // Pop up slightly
                }
                break;

            case 'DOT':
                target.dotDmg = force || 10;
                target.dotTimer = effectiveDuration;
                statusText = "中毒"; statusColor = "#10b981";
                break;

            case 'HOT':
                target.hotVal = force || 10;
                target.hotTimer = effectiveDuration;
                statusText = "再生"; statusColor = "#86efac";
                break;
        }

        if (statusText) {
            engine.events.push({ type: 'CC_APPLIED', pos: {x: target.px, y: target.py}, text: statusText, color: statusColor });
            engine.log(source, 'CC', type, target.id, `施加 ${statusText} (${effectiveDuration.toFixed(1)}s)`);
        }
    },

    checkDR(target: Agent, type: string, baseDuration: number) {
        const isHardCC = ['STUN', 'SILENCE', 'BANISH', 'FEAR', 'TAUNT', 'ROOT'].includes(type);
        if (!isHardCC) return { effectiveDuration: baseDuration, isImmune: false };
        
        const stacks = target.drStacks[type] || 0;
        // Standard exponential decay: 100% -> 50% -> 25% -> 12.5% (Immune)
        const multiplier = Math.pow(0.5, stacks); 
        
        if (multiplier < 0.2) return { effectiveDuration: 0, isImmune: true };
        
        // Apply stack
        target.drStacks[type] = stacks + 1;
        target.drTimers[type] = 10.0; // Reset 10s window
        
        return { effectiveDuration: baseDuration * multiplier, isImmune: false };
    },

    calculateKnockback(target: Agent, force: number, source: Agent, origin: {x: number, y: number} | undefined, type: string, engine: GameEngine) {
        // Force = Number of tiles to push
        const rawForce = Math.max(1, force);
        const resistance = target.weight || 1; 
        
        const tilesToPush = Math.max(0, rawForce - resistance);
        if (tilesToPush === 0) return { applied: false };

        const originPx = origin ? origin : {x: source.px, y: source.py};
        
        // Vector from Origin to Target
        const dir = Vector.normalize(Vector.sub({x: target.px, y: target.py}, originPx));
        
        // PULL inverts direction
        const vector = type === 'KNOCKBACK' ? dir : Vector.mult(dir, -1); 
        
        let currentH = {q: target.q, r: target.r};
        let finalH = currentH;

        // Iterative Step-Checking (To handle collisions per tile)
        for(let k=0; k<tilesToPush; k++) {
            const neighbors = HexUtils.neighbors(currentH);
            let bestN: any = null;
            let bestDot = -2.0; // Dot product range is -1 to 1
            
            // Find neighbor that best aligns with force vector
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
                // Collision Logic
                // 1. Map Valid
                if (!engine.map.isValid(bestN.q, bestN.r) || engine.map.hasObstacle(bestN.q, bestN.r)) break; 
                
                // 2. Unit Collision
                if (engine.getAgentAt(bestN.q, bestN.r)) break; 
                
                // 3. Cliff Check (Can't be knocked up a huge wall)
                const curHeight = engine.map.getTerrainHeight(currentH.q, currentH.r);
                const nextHeight = engine.map.getTerrainHeight(bestN.q, bestN.r);
                if (nextHeight > curHeight + 24) break; 
                
                // Success
                currentH = bestN;
                finalH = bestN;
            } else {
                break;
            }
        }
        
        if (finalH.q !== target.q || finalH.r !== target.r) {
            engine.updateAgentPosition(target, finalH.q, finalH.r);
            // Break any current move
            if (target.isMoving) {
                target.isMoving = false;
                target.path = [];
            }
            return { applied: true };
        }
        return { applied: false };
    }
};
