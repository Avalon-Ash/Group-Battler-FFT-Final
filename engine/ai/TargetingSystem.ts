import { Agent, GameEngine } from "../game";
import { Hex, Skill } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";
export class TargetingSystem {
    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        const h1 = engine.map.getTerrainHeight(a.q, a.r);
        const h2 = engine.map.getTerrainHeight(targetQ, targetR);
        const deltaH = h1 - h2;
        const heightBonus = Math.max(0, Math.floor((deltaH + 5) / BLOCK_HEIGHT));
        return baseRange + heightBonus;
    }
    public getImpactArea(origin: Hex, target: Hex, skill: Skill, engine: GameEngine): Hex[] {
        const radius = skill.aoeRadius || 1;
        if (!skill.visual || skill.visual === 'BOMB' || skill.visual === 'SMASH' || skill.visual === 'FIREBALL') {
            return HexUtils.range(target, radius);
        }
        if (skill.visual === 'BEAM' || skill.visual === 'BOLT') {
            return HexUtils.line(origin, target);
        }
        if (skill.visual === 'SLASH') {
            return HexUtils.range(target, 1); 
        }
        return [target];
    }
    public updateTarget(a: Agent, engine: GameEngine) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        let minScore = Infinity;
        let t: Agent | null = null;
        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const dist = HexUtils.dist(a, o);
                if (dist < minScore) { 
                    minScore = dist; 
                    t = o; 
                }
            }
        }
        a.target = t;
    }
    public calculateOptimalTarget(source: Agent, skill: Skill, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, engine);
        }
        return this.findBestSingleTarget(source, skill, engine);
    }
    private findBestAOELocation(source: Agent, skill: Skill, engine: GameEngine) {
        const candidateHexes = new Set<string>();
        const range = skill.range;
        const radius = skill.aoeRadius || 1;
        const enemies = engine.agents.filter(e => e.team !== source.team && e.hp > 0 && !e.banished);
        if (enemies.length === 0) return { targetAgent: null, targetHex: null };
        enemies.forEach(e => {
            const dist = HexUtils.dist(source, e);
            if (dist <= range + radius + 2) { 
                candidateHexes.add(HexUtils.key(e));
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
            if (!engine.map.isValid(q, r)) return;
            const effRange = this.getEffectiveRange(source, q, r, range, engine);
            if (HexUtils.dist(source, targetHex) > effRange) return;
            const impactCells = this.getImpactArea(source, targetHex, skill, engine);
            let score = 0;
            let hitCount = 0;
            for (const cell of impactCells) {
                const unit = engine.getAgentAt(cell.q, cell.r);
                if (unit && unit.hp > 0 && !unit.banished) {
                    if (skill.power >= 0) {
                        if (unit.team !== source.team) {
                            hitCount++;
                            score += 10;
                            if (unit.hp < unit.maxHp * 0.3) score += 5; 
                        } else {
                            score -= 20; 
                        }
                    } else {
                        if (unit.team === source.team) {
                            hitCount++;
                            score += 10;
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
            if (skill.power >= 0) {
                if (o.team === source.team) continue; 
            } else {
                if (o.team !== source.team) continue; 
            }
            if (o.hp <= 0 || o.banished) continue;
            const dist = HexUtils.dist(source, o);
            const effRange = this.getEffectiveRange(source, o.q, o.r, skill.range, engine);
            if (dist <= effRange) {
                let score = 100 - dist; 
                if (skill.power >= 0) {
                    if (o.hp < o.maxHp * 0.3) score += 50; 
                    if (o.castingSkillIdx !== -1) score += 30; 
                } else {
                    score += (1 - o.hp/o.maxHp) * 100; 
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