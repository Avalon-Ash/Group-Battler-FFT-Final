
import { Agent } from "../core/Agent";
import { Hex, Skill, SpatialProvider, MovementType } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";
import { Pathfinder } from "./Pathfinder";

export class TargetingSystem {
    /**
     * 檢查目標地塊是否處於大逃殺警告狀態
     */
    public isWarningTile(key: string, spatial: SpatialProvider): boolean {
        return spatial.isWarningTile(key);
    }

    /**
     * 計算有效射程（考慮高地加成）
     * High Ground Bonus: 每高一層 Block，射程微量增加
     */
    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, spatial: SpatialProvider): number {
        const h1 = spatial.getTerrainHeight(a.q, a.r);
        const h2 = spatial.getTerrainHeight(targetQ, targetR);
        const deltaH = h1 - h2;
        
        // [FIX] 高低差增減機制 (Height Advantage/Penalty)
        // 每一層 (BLOCK_HEIGHT = 24px) 產生 +/- 1 射程的影響
        
        let bonus = 0;
        let penalty = 0;
        
        if (deltaH > 4) { // 有明顯高度優勢 (高打低)
            // 每 24px +1 射程，上限 +2
            bonus = Math.min(2, Math.floor(deltaH / BLOCK_HEIGHT));
        } else if (deltaH < -4) { // 有明顯高度劣勢 (低打高)
            // 每 24px -1 射程，上限 -2，且確保不影響基本近戰攻擊
            penalty = Math.min(2, Math.floor(Math.abs(deltaH) / BLOCK_HEIGHT));
        }

        // 最終射程計算：確保普攻以外的技能不受過度懲罰。
        // [FIX] 如果 baseRange 是 0 (用於精確移動/逃生)，則不應強制 +1，否則會導致提早停止移動。
        const result = baseRange + bonus - penalty;
        if (baseRange === 0) return Math.max(0, result);
        return Math.max(1, result);
    }

    /**
     * RTS 等級目標選取評分
     */
    public updateTarget(a: Agent, spatial: SpatialProvider, pathfinder?: Pathfinder, skipEscapeLogic: boolean = false) {
        // [FIX] 即使正在詠唱，也應該允許判定危險並尋找逃生路徑 (只是不一定會立即執行行動)
        const myKey = HexUtils.key(a);
        const hazardOnTile = spatial.getHazard(myKey);
        const inDanger = spatial.isWarningTile(myKey) || (!!hazardOnTile && hazardOnTile.team !== a.team);

        // 如果不在危險中，且正在詠唱非普攻技能，則鎖定目標不更新
        if (!inDanger && a.castingSkillIdx !== -1) {
            const s = a.skills[a.castingSkillIdx];
            if (s && s.tag !== 'BASIC') return; 
        }
        
        // 0. 大逃殺求生邏輯 (Zero-Trust 介入)
        if (!skipEscapeLogic && inDanger && a.escapeCooldown <= 0) {
            // [FIX] 如果正在詠唱非普攻技能，不應隨意清除 target，避免技能失效
            const isCastingSpecial = a.castingSkillIdx !== -1 && a.skills[a.castingSkillIdx]?.tag !== 'BASIC';

            // 被位移或在危險中時，若未在發動特殊技能，優先清理攻擊目標以轉入逃生狀態
            if (!isCastingSpecial) {
                if (!a.targetHex || spatial.isWarningTile(HexUtils.key(a.targetHex))) {
                    a.target = null;
                }
            }
            
            // 如果已經有目標地塊且該地塊依然安全，則不需要重新搜尋
            if (a.targetHex && !spatial.isWarningTile(HexUtils.key(a.targetHex))) {
                a.visualStatus = 'DANGER';
                // [FIX] 不可 early return，必須繼續往下執行以鎖定敵人，供背水一戰使用
            } else {
                // 尋找距離自己最近、且不在 WARNING 清單內的安全地塊
                let bestSafeHex: Hex | null = null;

                if (pathfinder) {
                    // [OPTIMIZATION] 使用 Pathfinder 尋找保證可到達的安全地塊
                    const path = pathfinder.findPathToSafety(a, a, spatial, this);
                    if (path.length > 0) {
                        bestSafeHex = path[path.length - 1];
                    }
                } else {
                    // Fallback: 舊版環狀掃描 (不保證可到達)
                    let minSafeDist = Infinity;
                    const mapConfig = spatial.getMapConfig();
                    const centerQ = Math.floor((mapConfig.w - 1) / 2);
                    const centerR = Math.floor((mapConfig.h - 1) / 2);

                    for (let radius = 1; radius <= 12; radius++) {
                        const ring = HexUtils.range(a, radius);
                        for (const hex of ring) {
                            if (spatial.isValid(hex.q, hex.r)) {
                                const hexKey = HexUtils.key(hex);
                                if (!spatial.isWarningTile(hexKey)) {
                                    // [FIX] 飛行單位無視高度限制，地面單位使用動態跳躍高度
                                    if (a.movementType !== MovementType.FLYING) {
                                        const h1 = spatial.getTerrainHeight(a.q, a.r);
                                        const h2 = spatial.getTerrainHeight(hex.q, hex.r);
                                        const jumpLimit = Math.max(1, a.jump) * BLOCK_HEIGHT; 
                                        if (h2 - h1 > jumpLimit) continue;
                                    }

                                    const distToCenter = HexUtils.dist(hex, {q: centerQ, r: centerR});
                                    if (distToCenter < minSafeDist) {
                                        minSafeDist = distToCenter;
                                        bestSafeHex = hex;
                                    }
                                }
                            }
                        }
                        if (bestSafeHex) break; 
                    }
                }

                if (bestSafeHex) {
                    a.targetHex = bestSafeHex;
                    a.visualStatus = 'DANGER';
                } else {
                    // [FIX] 如果找不到安全地塊，必須清空 targetHex，讓後續能觸發背水一戰
                    a.targetHex = null;
                    a.visualStatus = 'DANGER'; // Keep visual status even if no safe hex
                }
            }
        } else if (!inDanger) {
            // 如果不在危險區，且當前目標地塊是為了逃生而設的（沒有 target），則清空它
            // [FIX] 但如果單位正在詠唱非目標指向性的技能 (以 targetHex 為主)，就絕對不能清空！
            if (!a.target && a.targetHex && a.castingSkillIdx === -1) {
                a.targetHex = null;
            }
            if (a.visualStatus === 'DANGER') {
                a.visualStatus = 'NONE';
            }
        }

        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        
        // [FIX] 即使在危險區且有逃生目標，也同時鎖定最近的敵人
        // 這樣當逃生路線被堵死時，AI 才能立刻切換到戰鬥邏輯 (背水一戰)
        // 移除原本的 early return: if (spatial.isWarningTile(myKey) && a.targetHex) return;

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

                // [NEW] 斬殺優先加分
                const killShotBonus = (o.hp / o.maxHp < 0.25) ? 400 : 0;

                // 5. [NEW] 背水一戰加分: 如果自己在危險區，優先攻擊也在危險區或邊緣的敵人
                let survivalBonus = 0;
                if (spatial.isWarningTile(myKey)) {
                    survivalBonus += 500;
                    // 如果對方也在危險區，優先解決他
                    if (spatial.isWarningTile(HexUtils.key(o))) survivalBonus += 200;
                } else {
                    // 如果自己安全，盡量不要鎖定危險區內的敵人 (避免主動走入危險區)
                    if (spatial.isWarningTile(HexUtils.key(o))) {
                        let effRange = 1;
                        const basicSkill = a.skills.find(s => s && s.tag === 'BASIC');
                        if (basicSkill) effRange = this.getEffectiveRange(a, o.q, o.r, basicSkill.range, spatial);
                        const needToEnterZone = HexUtils.dist(a, o) > effRange;
                        if (needToEnterZone) survivalBonus -= 800;
                    }
                }

                const score = distScore + hpScore + threatScore + stickyBonus + killShotBonus + survivalBonus;

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
        // [NEW] 背水一戰技能優先級：在危險區時，優先使用推拉技能
        const isInDanger = spatial.isWarningTile(HexUtils.key(source));
        
        // 1. 自身爆發 (PBAOE) - Range 0 強制鎖定腳下
        if (skill.range === 0) {
            return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
        }

        // 2. 遠程 AOE - 執行密度掃描
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, spatial);
        }
        
        const isBuffCC = (skill.ccType === 'SHIELD' || skill.ccType === 'HOT' || skill.ccType2 === 'SHIELD' || skill.ccType2 === 'HOT');
        const targetIsAlly = skill.power < 0 || (skill.power === 0 && isBuffCC);
        
        let validStickyTarget = false;
        if (source.target && source.target.hp > 0 && !source.target.banished) {
            validStickyTarget = targetIsAlly ? source.target.team === source.team : source.target.team !== source.team;
        }

        // 3. 單體技能 - 包含盟友智能選取
        if (targetIsAlly && skill.type === 'SINGLE') {
            if (validStickyTarget && source.target) {
                const effRange = this.getEffectiveRange(source, source.target.q, source.target.r, skill.range, spatial);
                if (HexUtils.dist(source, source.target) <= effRange) {
                    return { targetAgent: source.target, targetHex: null };
                }
            }
            // 尋找最佳隊友 (根據失血量)
            let bestAlly: Agent | null = null;
            let maxAllyScore = -Infinity;
            for (const ally of spatial.getAgents()) {
                if (ally.team === source.team && ally.hp > 0 && !ally.banished) {
                    const dist = Math.max(0.5, HexUtils.dist(source, ally));
                    const missingHpPct = 1 - (ally.hp / ally.maxHp);
                    let score = missingHpPct * 1000 - dist * 10;
                    if (ally === source) score -= 100; // 優先救別人
                    if (score > maxAllyScore) {
                        maxAllyScore = score;
                        bestAlly = ally;
                    }
                }
            }
            if (bestAlly) {
                return { targetAgent: bestAlly, targetHex: null };
            }
        } else if (skill.type === 'SINGLE') {
            // 普通敵方目標黏著邏輯
            if (validStickyTarget && source.target) {
                const effRange = this.getEffectiveRange(source, source.target.q, source.target.r, skill.range, spatial);
                if (HexUtils.dist(source, source.target) <= effRange) {
                    return { targetAgent: source.target, targetHex: null };
                }
            }
        }

        // 若當前無合適目標，重新搜尋
        // calculateOptimalTarget 裡的 fallback 只應更新「攻擊目標」，不觸發逃生邏輯
        this.updateTarget(source, spatial, undefined, true);
        
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

        // 生成候選點：所有敵人的位置 + 敵人的擴散格 (以涵蓋多人圓心)
        const candidates = new Set<string>();
        enemies.forEach(e => {
            candidates.add(HexUtils.key(e));
            // 如果 AOE 半徑夠大，擴散候選點至半徑範圍
            if (radius >= 1) {
                HexUtils.range(e, radius).forEach(n => candidates.add(HexUtils.key(n)));
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
