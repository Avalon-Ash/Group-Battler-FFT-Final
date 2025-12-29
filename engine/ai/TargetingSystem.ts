
import { Agent, GameEngine } from "../game";
import { Hex, Skill } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";

export class TargetingSystem {
    /**
     * 計算有效射程（考慮高地加成）
     */
    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        const h1 = engine.map.getTerrainHeight(a.q, a.r);
        const h2 = engine.map.getTerrainHeight(targetQ, targetR);
        const deltaH = h1 - h2;
        const heightBonus = deltaH > 0 ? Math.floor(deltaH / BLOCK_HEIGHT * 0.5) : 0;
        return baseRange + heightBonus;
    }

    /**
     * RTS 等級目標選取評分
     * 考慮距離、殘血程度、以及最重要的「威脅度」（是否正在詠唱奧義）
     */
    public updateTarget(a: Agent, engine: GameEngine) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        
        let maxScore = -Infinity;
        let bestTarget: Agent | null = null;

        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const dist = Math.max(1, HexUtils.dist(a, o));
                
                // 1. 基礎距離權重 (反比平方，極度優先近處)
                const distScore = 50 / (dist * dist);
                
                // 2. 血量權重 (優先擊殺殘血)
                const hpScore = (1 - o.hp / o.maxHp) * 15;
                
                // 3. 威脅權重 (重點修復：優先沉默/打斷奧義)
                let threatScore = 0;
                if (o.castingSkillIdx !== -1) {
                    const castingSkill = o.skills[o.castingSkillIdx];
                    if (castingSkill?.tag === 'ULT') {
                        threatScore = 100; // 絕對優先級：正在放大的敵人
                    } else if (castingSkill?.tag === 'ACTIVE') {
                        threatScore = 30;  // 高優先級：正在放技能的敵人
                    }
                }

                // 總分計算
                const score = distScore + hpScore + threatScore;

                if (score > maxScore) {
                    maxScore = score;
                    bestTarget = o;
                }
            }
        }
        a.target = bestTarget;
    }

    public calculateOptimalTarget(source: Agent, skill: Skill, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, engine);
        }
        if (!source.target) this.updateTarget(source, engine);
        return { targetAgent: source.target, targetHex: null };
    }

    public getImpactArea(source: Agent, targetHex: Hex, skill: Skill, engine: GameEngine): Hex[] {
        if (skill.type === 'AOE') {
            const radius = skill.aoeRadius || 1;
            return HexUtils.range(targetHex, radius).filter(h => engine.map.isValid(h.q, h.r));
        }
        return [targetHex];
    }

    private findBestAOELocation(source: Agent, skill: Skill, engine: GameEngine) {
        const range = skill.range;
        const radius = skill.aoeRadius || 1;
        const enemies = engine.agents.filter(e => e.team !== source.team && e.hp > 0 && !e.banished);
        
        if (enemies.length === 0) return { targetAgent: null, targetHex: null };

        let bestHex: Hex | null = null;
        let maxImpact = -1;

        const candidates = new Set<string>();
        enemies.forEach(e => {
            candidates.add(HexUtils.key(e));
            HexUtils.neighbors(e).forEach(n => candidates.add(HexUtils.key(n)));
        });

        candidates.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const targetHex = { q, r };
            if (!engine.map.isValid(q, r)) return;
            if (HexUtils.dist(source, targetHex) > this.getEffectiveRange(source, q, r, range, engine)) return;

            let impact = 0;
            enemies.forEach(e => {
                if (HexUtils.dist(targetHex, e) <= radius) {
                    // AOE 權重同樣計入正在詠唱的目標
                    const weight = (e.castingSkillIdx !== -1 && e.skills[e.castingSkillIdx]?.tag === 'ULT') ? 5.0 : 1.0;
                    impact += weight * (1.0 + (1 - e.hp/e.maxHp));
                }
            });

            if (impact > maxImpact) {
                maxImpact = impact;
                bestHex = targetHex;
            }
        });

        return { targetAgent: null, targetHex: bestHex };
    }
}
