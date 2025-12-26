
import { Agent, GameEngine } from "../game";
import { Hex, Skill } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";

export class TargetingSystem {

    // =========================================================================================
    // 🏹 RANGE CALCULATION (High Ground Bonus)
    // =========================================================================================

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        const h1 = engine.map.getTerrainHeight(a.q, a.r);
        const h2 = engine.map.getTerrainHeight(targetQ, targetR);
        
        // Bonus: +1 Range per Block Height advantage
        // Only applies if attacker is higher. No penalty for low ground (to avoid frustration).
        const deltaH = h1 - h2;
        const heightBonus = Math.max(0, Math.floor(deltaH / BLOCK_HEIGHT));
        
        return baseRange + heightBonus;
    }

    // =========================================================================================
    // 🎯 TARGET ACQUISITION
    // =========================================================================================

    public updateTarget(a: Agent, engine: GameEngine) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        let minD = 999;
        let t: Agent | null = null;
        
        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const d = HexUtils.dist(a, o);
                if (d < minD) { minD = d; t = o; }
            }
        }
        a.target = t;
    }

    public calculateOptimalTarget(source: Agent, skill: Skill, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        // 1. Special Case: Silence Logic (Prioritize Casters/Ults)
        if (skill.ccType === 'SILENCE' || skill.ccType2 === 'SILENCE') {
            const enemies = engine.agents.filter(a => 
                a.team !== source.team && a.hp > 0 && !a.banished && 
                HexUtils.dist(source, a) <= this.getEffectiveRange(source, a.q, a.r, skill.range, engine)
            );
            
            if (enemies.length > 0) {
                enemies.sort((a, b) => {
                    const score = (u: Agent) => {
                        if (u.castingSkillIdx === -1) return 0;
                        const s = u.skills[u.castingSkillIdx];
                        if (s?.tag === 'ULT') return 3;
                        if (s?.tag === 'ACTIVE') return 2;
                        return 1;
                    };
                    const sA = score(a);
                    const sB = score(b);
                    if (sA !== sB) return sB - sA;
                    return HexUtils.dist(source, a) - HexUtils.dist(source, b);
                });
                return { targetAgent: enemies[0], targetHex: null };
            }
        }

        // 2. AOE Logic (Find Best Cluster)
        if (skill.type === 'AOE') {
            const candidateHexes = new Set<number>();
            const radius = skill.aoeRadius || 1;
            // Rough search: Range + Radius + small buffer.
            const searchDist = skill.range + 5; 

            engine.agents.forEach(enemy => {
                if (enemy.team !== source.team && enemy.hp > 0 && !enemy.banished) {
                    if (HexUtils.dist(source, enemy) <= searchDist) {
                        candidateHexes.add(HexUtils.hash(enemy.q, enemy.r));
                        HexUtils.neighbors(enemy).forEach(n => candidateHexes.add(HexUtils.hash(n.q, n.r)));
                    }
                }
            });

            let bestHex: Hex | null = null;
            let bestScore = -1;

            candidateHexes.forEach(hHash => {
                const h = HexUtils.unhash(hHash);
                if (!engine.map.isValid(h.q, h.r)) return;

                // Range Check: Can source cast to this ground position?
                const effRange = this.getEffectiveRange(source, h.q, h.r, skill.range, engine);
                if (HexUtils.dist(source, h) > effRange) return;

                let score = 0;
                let hitCount = 0;
                
                for (const target of engine.agents) {
                    if (target.hp <= 0 || target.banished) continue;
                    
                    if (HexUtils.dist(h, target) <= radius) {
                        if (skill.power >= 0) {
                            if (target.team !== source.team) {
                                hitCount++;
                                score += 10;
                                if (target.castingSkillIdx !== -1) score += 5;
                            }
                        } else {
                            if (target.team === source.team) {
                                hitCount++;
                                score += 10;
                                if (target.hp < target.maxHp * 0.5) score += 5;
                            }
                        }
                    }
                }

                if (hitCount > 0 && score > bestScore) {
                    bestScore = score;
                    bestHex = h;
                }
            });

            if (bestHex) {
                return { targetAgent: null, targetHex: bestHex };
            }
        }

        // 3. Default Single Target Logic (Nearest)
        let minD = 999;
        let t: Agent | null = null;
        for (const o of engine.agents) {
            if (o.team !== source.team && o.hp > 0 && !o.banished) {
                const d = HexUtils.dist(source, o);
                // Check against Height-Aware Range
                const effRange = this.getEffectiveRange(source, o.q, o.r, skill.range, engine);
                if (d <= effRange && d < minD) { minD = d; t = o; }
            }
        }
        return { targetAgent: t, targetHex: null };
    }
}
