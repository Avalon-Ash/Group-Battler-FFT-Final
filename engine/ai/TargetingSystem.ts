
import { Agent } from "../core/Agent";
import { Hex, Skill, SpatialProvider } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";

export class TargetingSystem {
    /**
     * 計算有效射程（考慮高地加成）
     * High Ground Bonus: 每高一層 Block，射程微量增加
     */
    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, spatial: SpatialProvider): number {
        const h1 = spatial.getTerrainHeight(a.q, a.r);
        const h2 = spatial.getTerrainHeight(targetQ, targetR);
        const deltaH = h1 - h2;
        // 高打低：每 48px 高度 (約2層) +1 射程
        const heightBonus = deltaH > 0 ? Math.floor(deltaH / (BLOCK_HEIGHT * 2)) : 0;
        return baseRange + heightBonus;
    }

    /**
     * RTS 等級目標選取評分
     */
    public updateTarget(a: Agent, spatial: SpatialProvider) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        
        let maxScore = -Infinity;
        let bestTarget: Agent | null = null;

        // 嘲諷強制鎖定
        if (a.tauntTimer > 0 && a.tauntTargetId) {
            const taunter = spatial.getAgents().find(ag => ag.id === a.tauntTargetId);
            if (taunter && taunter.hp > 0 && !taunter.banished) {
                a.target = taunter;
                return;
            }
        }

        const isSilenced = a.silenceTimer > 0;

        for (const o of spatial.getAgents()) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const dist = Math.max(0.5, HexUtils.dist(a, o));
                
                // 1. 距離權重: 極大幅度優先攻擊近身單位
                const distScore = 2000 / (dist + 0.5); 
                
                // 2. 血量權重: 殘血優先 (斬殺邏輯)
                const hpScore = (1 - o.hp / o.maxHp) * 50;
                
                // 3. 威脅權重: 優先鎖定正在詠唱大招的敵人
                let threatScore = 0;
                if (!isSilenced && o.castingSkillIdx !== -1) {
                    const castingSkill = o.skills[o.castingSkillIdx];
                    if (castingSkill?.tag === 'ULT') threatScore = 200; 
                    else if (castingSkill?.tag === 'ACTIVE') threatScore = 50; 
                }

                // 4. 黏著加分: 防止頻繁切換目標 (防抖)
                const stickyBonus = (a.target === o) ? 300 : 0;

                const score = distScore + hpScore + threatScore + stickyBonus;

                if (score > maxScore) {
                    maxScore = score;
                    bestTarget = o;
                }
            }
        }
        a.target = bestTarget;
    }

    /**
     * 核心：計算最佳施法目標 (Smart Cast)
     */
    public calculateOptimalTarget(source: Agent, skill: Skill, spatial: SpatialProvider): { targetAgent: Agent | null, targetHex: Hex | null } {
        // 1. 自身爆發 (PBAOE) - Range 0 強制鎖定腳下
        if (skill.range === 0) {
            return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
        }

        // 2. 遠程 AOE - 執行密度掃描
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, spatial);
        }
        
        // 3. 單體技能 - 黏著邏輯
        if (source.target && source.target.hp > 0 && !source.target.banished) {
            const effRange = this.getEffectiveRange(source, source.target.q, source.target.r, skill.range, spatial);
            if (HexUtils.dist(source, source.target) <= effRange) {
                return { targetAgent: source.target, targetHex: null };
            }
        }

        // 若當前無目標，重新搜尋
        this.updateTarget(source, spatial);
        return { targetAgent: source.target, targetHex: null };
    }

    public getImpactArea(source: Agent, targetHex: Hex, skill: Skill, spatial: SpatialProvider): Hex[] {
        if (skill.type === 'AOE') {
            const radius = skill.aoeRadius || 1;
            return HexUtils.range(targetHex, radius).filter(h => spatial.isValid(h.q, h.r));
        }
        return [targetHex];
    }

    /**
     * 密度掃描算法 (Density Scan Algorithm) v2.0
     * 尋找能覆蓋最多高價值目標的座標
     */
    private findBestAOELocation(source: Agent, skill: Skill, spatial: SpatialProvider) {
        const range = skill.range;
        const radius = skill.aoeRadius || 1;
        
        // 取得所有有效敵軍
        const enemies = spatial.getAgents().filter(e => e.team !== source.team && e.hp > 0 && !e.banished);
        if (enemies.length === 0) return { targetAgent: null, targetHex: null };

        let bestHex: Hex | null = null;
        let maxImpact = -1;

        // 生成候選點：所有敵人的位置 + 敵人的相鄰格 (以覆蓋"兩人間隙")
        const candidates = new Set<string>();
        enemies.forEach(e => {
            candidates.add(HexUtils.key(e));
            // 如果 AOE 半徑夠大，嘗試攻擊相鄰格以覆蓋更多人
            if (radius >= 1) {
                HexUtils.neighbors(e).forEach(n => candidates.add(HexUtils.key(n)));
            }
        });

        candidates.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const targetHex = { q, r };
            
            // 1. 地形合法性檢查
            if (!spatial.isValid(q, r)) return;
            
            // 2. 射程檢查 (嚴格遵守 Skill.range)
            const effRange = this.getEffectiveRange(source, q, r, range, spatial);
            if (HexUtils.dist(source, targetHex) > effRange) return;

            // 3. 模擬衝擊評分
            let impactScore = 0;
            let hitCount = 0;

            enemies.forEach(e => {
                if (HexUtils.dist(targetHex, e) <= radius) {
                    hitCount++;
                    // 基礎分 10
                    let score = 10;
                    
                    // 斬殺權重: 殘血加分 (Max +10)
                    score += (1 - e.hp / e.maxHp) * 10;
                    
                    // 打斷權重: 正在詠唱大招 (+50)，普攻/小招 (+10)
                    if (e.castingSkillIdx !== -1) {
                        const s = e.skills[e.castingSkillIdx];
                        if (s?.tag === 'ULT') score += 50;
                        else score += 10;
                    }

                    impactScore += score;
                }
            });

            // 只有當能打到人時才考慮
            if (hitCount > 0 && impactScore > maxImpact) {
                maxImpact = impactScore;
                bestHex = targetHex;
            }
        });

        // 若找不到完美AOE點，退化為攻擊當前單體目標的位置
        if (!bestHex && source.target) {
            const t = source.target;
            const effRange = this.getEffectiveRange(source, t.q, t.r, range, spatial);
            if (HexUtils.dist(source, t) <= effRange) {
                bestHex = { q: t.q, r: t.r };
            }
        }

        return { targetAgent: null, targetHex: bestHex };
    }
}
