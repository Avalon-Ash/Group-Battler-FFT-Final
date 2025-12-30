
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
     * RTS 等級目標選取評分 - V2.0 修正版
     * 解決「近身不打、跑去打遠處法師」的問題
     */
    public updateTarget(a: Agent, engine: GameEngine) {
        // 如果當前目標已經死亡或無效，先清除
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        
        let maxScore = -Infinity;
        let bestTarget: Agent | null = null;

        // 如果被嘲諷，強制鎖定嘲諷來源
        if (a.tauntTimer > 0 && a.tauntTargetId) {
            const taunter = engine.agents.find(ag => ag.id === a.tauntTargetId);
            if (taunter && taunter.hp > 0 && !taunter.banished) {
                a.target = taunter;
                return;
            }
        }

        const isSilenced = a.silenceTimer > 0;

        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const dist = Math.max(0.5, HexUtils.dist(a, o));
                
                // 1. 距離權重 (Exponential Falloff)
                // 修正：極大幅度提高近距離權重
                const distScore = 2000 / (dist + 0.5); 
                
                // 2. 血量權重 (殘血優先)
                const hpScore = (1 - o.hp / o.maxHp) * 50;
                
                // 3. 威脅權重 (Threat)
                let threatScore = 0;
                if (!isSilenced && o.castingSkillIdx !== -1) {
                    const castingSkill = o.skills[o.castingSkillIdx];
                    if (castingSkill?.tag === 'ULT') {
                        threatScore = 200; 
                    } else if (castingSkill?.tag === 'ACTIVE') {
                        threatScore = 50; 
                    }
                }

                // 4. 黏著加分 (Hysteresis)
                // 如果是當前目標，給予加分以避免頻繁切換 (防抖)
                const stickyBonus = (a.target === o) ? 300 : 0;

                // 總分計算
                const score = distScore + hpScore + threatScore + stickyBonus;

                if (score > maxScore) {
                    maxScore = score;
                    bestTarget = o;
                }
            }
        }
        a.target = bestTarget;
    }

    public calculateOptimalTarget(source: Agent, skill: Skill, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        // AOE 邏輯保持不變
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, engine);
        }
        
        // 單體技能優化：黏著邏輯
        // 如果當前目標有效且在射程內，直接鎖定，不要嘗試移動尋找「更好」的位置
        if (source.target && source.target.hp > 0 && !source.target.banished) {
            const effRange = this.getEffectiveRange(source, source.target.q, source.target.r, skill.range, engine);
            if (HexUtils.dist(source, source.target) <= effRange) {
                return { targetAgent: source.target, targetHex: null };
            }
        }

        // 如果沒有目標，或目標無效，或目標超出射程，才刷新
        this.updateTarget(source, engine);
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
            if (radius > 1) {
                HexUtils.neighbors(e).forEach(n => candidates.add(HexUtils.key(n)));
            }
        });

        candidates.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const targetHex = { q, r };
            if (!engine.map.isValid(q, r)) return;
            
            if (HexUtils.dist(source, targetHex) > this.getEffectiveRange(source, q, r, range, engine)) return;

            let impact = 0;
            enemies.forEach(e => {
                if (HexUtils.dist(targetHex, e) <= radius) {
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
