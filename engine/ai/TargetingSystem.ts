
import { Agent, GameEngine } from "../game";
import { Hex, Skill } from "../../types";
import { HexUtils } from "../utils";
import { HexMath } from "../math/HexMath";
import { BLOCK_HEIGHT } from "../../constants";

export class TargetingSystem {

    // =========================================================================================
    // 🏹 RANGE & VISIBILITY
    // =========================================================================================

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        const h1 = engine.map.getTerrainHeight(a.q, a.r);
        const h2 = engine.map.getTerrainHeight(targetQ, targetR);
        
        // Height Advantage: +1 Range per tier advantage
        const deltaH = h1 - h2;
        const heightBonus = Math.max(0, Math.floor(deltaH / BLOCK_HEIGHT));
        
        return baseRange + heightBonus;
    }

    /**
     * Get all hexes affected by a skill based on its shape
     */
    public getImpactArea(origin: Hex, target: Hex, skill: Skill, engine: GameEngine): Hex[] {
        const radius = skill.aoeRadius || 1;
        
        // 1. Point / Circle AOE
        if (!skill.visual || skill.visual === 'BOMB' || skill.visual === 'SMASH' || skill.visual === 'FIREBALL') {
            return HexMath.range(target, radius);
        }

        // 2. Line / Beam (Piercing)
        if (skill.visual === 'BEAM' || skill.visual === 'BOLT') {
            return HexMath.line(origin, target);
        }

        // 3. Cone / Slash (Directional)
        if (skill.visual === 'SLASH') {
            // Simplified Cone: Get neighbors in general direction
            // Better implementation would utilize vector dot products in Cube space
            // For now, return target + neighbors (Small frontal AOE)
            return HexMath.range(target, 1); 
        }

        // Default: Single Target (Just the hex)
        return [target];
    }

    // =========================================================================================
    // 🎯 TARGET ACQUISITION
    // =========================================================================================

    public updateTarget(a: Agent, engine: GameEngine) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        
        // Heuristic: Find nearest valid target
        // Optimization: Use squared distance to avoid Sqrt
        let minScore = Infinity;
        let t: Agent | null = null;
        
        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const dist = HexMath.distance(a, o);
                // Prefer closer, but weight low HP slightly higher?
                // For basic targeting, strict distance is most predictable.
                if (dist < minScore) { 
                    minScore = dist; 
                    t = o; 
                }
            }
        }
        a.target = t;
    }

    public calculateOptimalTarget(source: Agent, skill: Skill, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        
        // 1. AOE Logic (Cluster Finding)
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, engine);
        }

        // 2. Single Target Logic
        return this.findBestSingleTarget(source, skill, engine);
    }

    private findBestAOELocation(source: Agent, skill: Skill, engine: GameEngine) {
        const candidateHexes = new Set<string>();
        const range = skill.range;
        const radius = skill.aoeRadius || 1;
        
        // Identify "Points of Interest" (Enemy locations)
        const enemies = engine.agents.filter(e => e.team !== source.team && e.hp > 0 && !e.banished);
        
        if (enemies.length === 0) return { targetAgent: null, targetHex: null };

        // Optimization: Only check hexes occupied by enemies and their immediate neighbors as center-points
        enemies.forEach(e => {
            const dist = HexMath.distance(source, e);
            // Rough pre-check (Range + Radius)
            if (dist <= range + radius + 2) { 
                candidateHexes.add(HexUtils.key(e));
                // If radius is large, checking neighbors helps find "between" spots
                if (radius > 1) {
                    HexUtils.neighbors(e).forEach(n => candidateHexes.add(HexUtils.key(n)));
                }
            }
        });

        let bestHex: Hex | null = null;
        let bestScore = -1000;

        candidateHexes.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const targetHex = { q, r };
            
            // 1. Validity Check
            if (!engine.map.isValid(q, r)) return;
            
            // 2. Range Check (Height Aware)
            const effRange = this.getEffectiveRange(source, q, r, range, engine);
            if (HexMath.distance(source, targetHex) > effRange) return;

            // 3. Simulate Impact
            // Get all cells in the shape
            const impactCells = this.getImpactArea(source, targetHex, skill, engine);
            let score = 0;
            let hitCount = 0;

            // Map impact cells to units
            // Perf: O(Cells * Units) - Acceptable for TBS
            for (const cell of impactCells) {
                const unit = engine.getAgentAt(cell.q, cell.r);
                if (unit && unit.hp > 0 && !unit.banished) {
                    if (skill.power >= 0) {
                        // Damage Skill
                        if (unit.team !== source.team) {
                            hitCount++;
                            score += 10;
                            if (unit.hp < unit.maxHp * 0.3) score += 5; // Execute bonus
                            if (unit.role === 'SUPPORT' || unit.role === 'MAGE') score += 3; // Priority targets
                        } else {
                            score -= 20; // Friendly fire penalty
                        }
                    } else {
                        // Heal Skill
                        if (unit.team === source.team) {
                            hitCount++;
                            score += 10;
                            if (unit.hp < unit.maxHp * 0.5) score += 10; // Critical heal bonus
                        }
                    }
                }
            }

            if (hitCount > 0 && score > bestScore) {
                bestScore = score;
                bestHex = targetHex;
            }
        });

        if (bestHex) return { targetAgent: null, targetHex: bestHex };
        return { targetAgent: null, targetHex: null };
    }

    private findBestSingleTarget(source: Agent, skill: Skill, engine: GameEngine) {
        let bestTarget: Agent | null = null;
        let bestScore = -1000;

        for (const o of engine.agents) {
            // Basic validity
            if (skill.power >= 0) {
                if (o.team === source.team) continue; // Enemy only
            } else {
                if (o.team !== source.team) continue; // Ally only
            }
            if (o.hp <= 0 || o.banished) continue;

            // Range Check
            const dist = HexMath.distance(source, o);
            const effRange = this.getEffectiveRange(source, o.q, o.r, skill.range, engine);
            
            if (dist <= effRange) {
                let score = 0;
                
                // Distance Score (Closer is slightly better to secure hit? Or Further for kiting?)
                // General AI: Hit closest effective target usually safer
                score += (100 - dist); 

                // Value Score
                if (skill.power >= 0) {
                    if (o.hp < o.maxHp * 0.3) score += 50; // Kill confirm
                    if (o.castingSkillIdx !== -1) score += 30; // Interrupt priority
                } else {
                    score += (1 - o.hp/o.maxHp) * 100; // Heal most injured
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = o;
                }
            }
        }
        
        return { targetAgent: bestTarget, targetHex: null };
    }
}
