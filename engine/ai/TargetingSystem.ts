
import { Agent } from "../core/Agent";
import type { SkillIntent, SkillStatus } from "../../types";
import { appliesStatusOnHit, hasHitAction, hasIntentIn, hasStatusIn } from "../core/SkillQueries";
import { Hex, Skill, SpatialProvider, MovementType, Role } from "../../types";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT, COMBAT_PARAM, TARGET_RULES } from "../../constants";
import { Pathfinder } from "./Pathfinder";
import { OBSTACLE_DB } from "../../data/obstacles";
import { canStepUp, jumpLayers } from "../math/ClimbRule";
import { isGroundMeleeRange } from "./MeleeAttack";
import { sameSide } from '../core/Allegiance';

export type ImpactAreaContext = Pick<SpatialProvider, 'isValid'>;

const HOSTILE_CC: ReadonlySet<SkillStatus> = new Set<SkillStatus>([
    'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'POLYMORPH', 'VULNERABLE'
]);

const FRIENDLY_BUFF_CC: ReadonlySet<SkillStatus> = new Set<SkillStatus>([
    'SHIELD', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'
]);

const HOT_ONLY: ReadonlySet<SkillStatus> = new Set<SkillStatus>(['HOT']);
const GAP_CLOSING: ReadonlySet<SkillIntent> = new Set<SkillIntent>(['GAP_CLOSE', 'HOOK']);

export function isHostileSkill(skill: Skill): boolean {
    return skill.power > 0 || appliesStatusOnHit(skill, HOSTILE_CC);
}

export class TargetingSystem {
    /** 每個單位上次掉血的血量與時間：判斷「剛被打」用（只在這裡讀寫，不進 Agent）。 */
    private hpWatch = new WeakMap<Agent, { lastHp: number; hitAt: number }>();

    private readonly attackPathfinder = new Pathfinder();
    /**
     * 檢查目標是否為合法選取對象
     */
    public isValidTarget(target: Agent, spatial?: SpatialProvider): boolean {
        if (!target) return false;
        if (target.hp <= 0) return false;
        if (target.banished || target.outOfBounds) return false;
        if (spatial && !spatial.isValid(target.q, target.r)) return false;
        return true;
    }

    /**
     * 檢查目標地塊是否處於大逃殺警告狀態
     */
    public isWarningTile(key: string, spatial: SpatialProvider): boolean {
        return spatial.isWarningTile(key);
    }

    /**
     * 射程 SSOT：近戰在跳躍力以內的高低差照常打，超過才把層數扣出水平射程（可為負）；遠程保留高地加成。
     * a 帶 jump 時用它判斷（單位，或代單位試算的格子）；只傳格子就照每層扣一格。
     */
    public getEffectiveRange(a: Hex & { jump?: number }, targetQ: number, targetR: number, baseRange: number, spatial: SpatialProvider): number {
        // baseRange 0 = 「精確抵達該格」（逃生、自身 PBAOE）：高低差加成不得讓 dist 1 的鄰格算成已抵達，
        // 否則 moveAgentToHex 會對相鄰的逃生格直接回 SUCCESS 而原地不動（大逃殺發呆成因 A，tests/AIIdlePriority.test.ts）。
        if (baseRange === 0) return 0;

        const h1 = spatial.getTerrainHeight(a.q, a.r);
        const h2 = spatial.getTerrainHeight(targetQ, targetR);
        const deltaH = h1 - h2;
        if (baseRange <= COMBAT_PARAM.MELEE_RANGE) {
            const layers = Math.round(Math.abs(deltaH) / BLOCK_HEIGHT);
            return a.jump !== undefined && layers <= jumpLayers({ jump: a.jump }) ? baseRange : baseRange - layers;
        }
        
        // [FIX] 高低差增減機制 (Height Advantage/Penalty)
        // 每一層 (BLOCK_HEIGHT = 24px) 產生 +/- 1 射程的影響
        
        let bonus = 0;
        let penalty = 0;
        
        if (deltaH > 4) { // 有明顯高度優勢 (高打低)
            // 每 24px +1 射程，上限 +2
            bonus = Math.min(2, Math.floor(deltaH / BLOCK_HEIGHT));
        } else if (deltaH < TARGET_RULES.LOW_GROUND_THRESHOLD) { // 有明顯高度劣勢 (低打高)
            // 每 24px -1 射程，上限 -2，且確保不影響基本近戰攻擊
            penalty = Math.min(2, Math.floor(Math.abs(deltaH) / BLOCK_HEIGHT));
        }

        // 最終射程計算：確保普攻以外的技能不受過度懲罰。
        return Math.max(1, baseRange + bonus - penalty);
    }

    /**
     * RTS 等級目標選取評分
     */
    public updateTarget(a: Agent, spatial: SpatialProvider) {
        // [FIX] 即使正在詠唱，也應該允許判定危險並尋找逃生路徑 (只是不一定會立即執行行動)
        const myKey = HexUtils.key(a);
        const hazardsOnTile = spatial.getSpatialHazardsAt(a.q, a.r);
        const inDanger = spatial.isCollapsingSoon(myKey) || hazardsOnTile.some(h => !sameSide(h, a));

        // 如果不在危險中，且正在詠唱非普攻技能，則鎖定目標不更新
        if (!inDanger && a.castingSkillIdx !== -1) {
            const s = a.skills[a.castingSkillIdx];
            if (s && s.tag !== 'BASIC') return; 
        }
        
        // 不在危險區且沒有目標時，上一招留下的地面落點已無意義（詠唱中除外，施法還要用它）
        if (!inDanger && !a.target && a.targetHex && a.castingSkillIdx === -1) {
            a.targetHex = null;
        }

        if (a.target && !this.isValidTarget(a.target, spatial)) a.target = null;
        
        // 逃生目的地由 RETREAT 模式的 EscapeWarning 管（escapeHex）；這裡只選戰鬥目標，
        // 逃生路線被堵死時才能立刻接戰。

        let maxScore = -Infinity;
        let bestTarget: Agent | null = null;

        // 嘲諷強制鎖定
        if (a.effects.TAUNT.remaining > 0 && a.effects.TAUNT.sourceId) {
            const taunter = spatial.getAgents().find(ag => ag.id === a.effects.TAUNT.sourceId);
            if (taunter && taunter.hp > 0 && !taunter.banished && !taunter.outOfBounds) {
                a.target = taunter;
                // 嘲諷鎖定期間不追逐殘留的地塊目標（逃生中的除外）
                if (!inDanger && a.castingSkillIdx === -1) a.targetHex = null;
                return;
            }
        }

        // 被打回頭（使用者 2026-11-03，只限近戰普攻）：剛被敵人打到、而現有目標還在射程外時，改鎖定攻擊者（嘲諷優先，上面已 return）。
        const watch = this.hpWatch.get(a);
        if (!watch) this.hpWatch.set(a, { lastHp: a.hp, hitAt: -Infinity });
        else {
            if (a.hp < watch.lastHp) watch.hitAt = spatial.battleTime;
            watch.lastHp = a.hp;
        }
        if (!inDanger && a.lastHitSourceId && spatial.battleTime - (watch?.hitAt ?? -Infinity) <= TARGET_RULES.RETALIATE_WINDOW_S) {
            const attacker = spatial.getAgents().find(o => o.id === a.lastHitSourceId);
            const basic = a.skills.find(s => s?.tag === 'BASIC');
            if (a.role !== Role.TANK && attacker && attacker !== a.target && !sameSide(attacker, a) && this.isValidTarget(attacker, spatial) && basic && basic.range > 0 && basic.range <= COMBAT_PARAM.MELEE_RANGE) {
                const outOfReach = (o: Agent) => HexUtils.dist(a, o) > this.getEffectiveRange(a, o.q, o.r, basic.range, spatial);
                if (!a.target || outOfReach(a.target)) {
                    a.target = attacker;
                    a.targetLockUntil = spatial.battleTime + TARGET_RULES.LOCK_S;
                    return;
                }
            }
        }

        // 剛選定的目標鎖一小段時間：不然站在射程外時每次決策都重新評分，A* 成本一變就換人，路徑跟著抖
        if (a.target && !inDanger && spatial.battleTime < a.targetLockUntil) return;

        const isSilenced = a.effects.SILENCE.remaining > 0;
        // 可用的突進（DASH）或拉取（PULL）技能：近戰打不到的目標交給它們，不扣分
        const hasGapCloser = !isSilenced && a.skills.some((s, i) => !!s && s.range > COMBAT_PARAM.MELEE_RANGE &&
            hasIntentIn(s, GAP_CLOSING) &&
            (a.curCDs[i] || 0) <= COMBAT_PARAM.READY_CD_TOLERANCE && a.mp >= s.cost);

        for (const o of spatial.getAgents()) {
            if (!sameSide(o, a) && this.isValidTarget(o, spatial)) {
                // 近戰普攻打不到的目標（高低差超過跳躍力）只扣分、不排除：追擊尋路會找同層攻擊格，
                // 突進／拉取技能可用時完全不扣分，留給行為樹的 ACTIVE／ULT 槽先出手（使用者 2026-10-28）。
                const basic = a.skills.find(s => s?.tag === 'BASIC');
                const meleeBasic = !!basic && basic.range > 0 && basic.range <= COMBAT_PARAM.MELEE_RANGE && !hasGapCloser;
                const noAttackTile = meleeBasic && !HexUtils.neighbors(o).some(n => {
                        if (!spatial.isValid(n.q, n.r)) return false;
                        if (HexUtils.dist(n, o) > this.getEffectiveRange({ ...n, jump: a.jump }, o.q, o.r, basic.range, spatial)) return false;
                        const hash = HexUtils.hash(n.q, n.r);
                        if (!spatial.hasObstacleHash(hash)) return true;
                        const def = OBSTACLE_DB[spatial.getObstacleTypeHash(hash) || 'WALL'];
                        return !(a.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement);
                    });
                const dist = Math.max(0.5, HexUtils.dist(a, o));
                
                // 1. 距離權重: 極大幅度優先攻擊近身單位
                const distScore = TARGET_RULES.DISTANCE_SCORE_WEIGHT / (dist + 0.5); 
                
                // 2. 血量權重: 殘血優先 (斬殺邏輯)
                const hpScore = (1 - o.hp / o.maxHp) * TARGET_RULES.MISSING_HP_SCORE_WEIGHT;
                
                // 3. 威脅權重: 優先鎖定正在詠唱大招的敵人
                let threatScore = 0;
                if (!isSilenced && o.castingSkillIdx !== -1) {
                    const castingSkill = o.skills[o.castingSkillIdx];
                    if (castingSkill?.tag === 'ULT') threatScore = TARGET_RULES.ULT_CAST_THREAT_SCORE; 
                    else if (castingSkill?.tag === 'ACTIVE') threatScore = TARGET_RULES.ACTIVE_CAST_THREAT_SCORE; 
                }

                // 4. 黏著加分: 防止頻繁切換目標 (防抖)
                const stickyBonus = (a.target === o) ? TARGET_RULES.STICKY_TARGET_BONUS : 0;

                // [NEW] 斬殺優先加分
                const killShotBonus = (o.hp / o.maxHp < TARGET_RULES.KILL_SHOT_HP_THRESHOLD) ? TARGET_RULES.KILL_SHOT_BONUS : 0;

                // 5. [NEW] 背水一戰加分: 如果自己在危險區，優先攻擊也在危險區或邊緣的敵人
                let survivalBonus = 0;
                if (spatial.isCollapsingSoon(myKey)) {
                    survivalBonus += TARGET_RULES.SELF_WARNING_BONUS;
                    // 如果對方也在危險區，優先解決他
                    if (spatial.isCollapsingSoon(HexUtils.key(o))) survivalBonus += TARGET_RULES.TARGET_WARNING_BONUS;
                } else {
                    // 如果自己安全，盡量不要鎖定快塌的格上的敵人 (避免主動走進去)
                    if (spatial.isCollapsingSoon(HexUtils.key(o))) {
                        let effRange = 1;
                        const basicSkill = a.skills.find(s => s && s.tag === 'BASIC');
                        if (basicSkill) effRange = this.getEffectiveRange(a, o.q, o.r, basicSkill.range, spatial);
                        const needToEnterZone = HexUtils.dist(a, o) > effRange;
                        if (needToEnterZone) survivalBonus -= TARGET_RULES.ENTER_WARNING_PENALTY;
                    }
                }

                let score = distScore + hpScore + threatScore + stickyBonus + killShotBonus + survivalBonus;
                if (noAttackTile) score -= COMBAT_PARAM.MELEE_UNREACHABLE_PENALTY;

                if (score > maxScore) {
                    // 鄰格存在不代表爬得到：只對暫列第一的候選跑 A*（沿用 canStepUp，忽略暫時單位阻擋）。
                    if (meleeBasic && !noAttackTile &&
                        HexUtils.dist(a, o) > this.getEffectiveRange(a, o.q, o.r, basic!.range, spatial)) {
                        const path = this.attackPathfinder.findPath(a, o.q, o.r, basic!.range, true, spatial, this);
                        if (path.length === 0) {
                            score -= COMBAT_PARAM.MELEE_UNREACHABLE_PENALTY;
                        } else if (isGroundMeleeRange(a, basic!.range)) {
                            // 走得到但要繞路／爬坡：依路徑成本比直線多出的部分扣分（有上限，飛行單位不扣）
                            const detour = Math.max(0, this.attackPathfinder.lastCost - Math.max(0, HexUtils.dist(a, o) - 1));
                            score -= Math.min(TARGET_RULES.MELEE_DETOUR_PENALTY_CAP, detour * TARGET_RULES.MELEE_DETOUR_PENALTY_PER_COST);
                        }
                        if (score <= maxScore) continue;
                    }
                    maxScore = score;
                    bestTarget = o;
                }
            }
        }
        if (bestTarget !== a.target) a.targetLockUntil = spatial.battleTime + TARGET_RULES.LOCK_S;
        a.target = bestTarget;
    }

    /**
     * 核心：計算最佳施法目標 (Smart Cast)
     */
    public calculateOptimalTarget(source: Agent, skill: Skill, spatial: SpatialProvider): { targetAgent: Agent | null, targetHex: Hex | null } {
        const allAgents = spatial.getAgents();
        const enemies = allAgents.filter(e => !sameSide(e, source) && this.isValidTarget(e, spatial));
        const allies = allAgents.filter(a => sameSide(a, source) && this.isValidTarget(a, spatial));

        // 1. PBAOE 或自身技能 (Range 0)
        if (skill.range === 0) {
            const aoeRadius = Math.max(1, skill.aoeRadius || 1);
            const hasFriendlyBuff = hasStatusIn(skill, FRIENDLY_BUFF_CC);

            // A. 對敵傷害或對敵控制 PBAOE (power > 0 或含有敵方 CC)
            if (skill.type === 'AOE' && isHostileSkill(skill)) {
                const hasEnemyInRange = enemies.some(e => HexUtils.dist(source, e) <= aoeRadius);
                if (hasEnemyInRange) {
                    return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
                }
                return { targetAgent: null, targetHex: null };
            }

            // B. 純友軍群體治療／持續回血 (AOE 且 power < 0 且無主動防護／加速增益)
            if (skill.type === 'AOE' && skill.power < 0 && !hasFriendlyBuff) {
                const isSelfDmg = hasHitAction(skill, 'SELF_DAMAGE');
                const hasInjuredAlly = allies.some(a =>
                    HexUtils.dist(source, a) <= aoeRadius &&
                    (!isSelfDmg || a.id !== source.id || a.hp < a.maxHp * TARGET_RULES.SELF_DAMAGE_HEAL_HP_THRESHOLD) &&
                    a.hp < a.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD
                );
                if (hasInjuredAlly) {
                    return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
                }
                return { targetAgent: null, targetHex: null };
            }

            // C. 友軍群體增益／護盾 (AOE 且 power <= 0 且含友軍增益)
            if (skill.type === 'AOE' && skill.power <= 0) {
                const alliesInRange = allies.filter(a => HexUtils.dist(source, a) <= aoeRadius);
                if (alliesInRange.length > 0) {
                    const hasInjuredAlly = alliesInRange.some(a => a.hp < a.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD);
                    const minEnemyDist = enemies.length > 0
                        ? Math.min(...enemies.map(e => HexUtils.dist(source, e)))
                        : Infinity;
                    if (hasInjuredAlly || minEnemyDist <= COMBAT_PARAM.AI_SELF_BUFF_ENGAGE_DIST) {
                        return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
                    }
                }
                return { targetAgent: null, targetHex: null };
            }

            // D. 自身單體增益／護盾 (SINGLE 且 power === 0 且無敵方控制)
            if (skill.type === 'SINGLE' && skill.power === 0) {
                const isInjured = source.hp < source.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD;
                const minEnemyDist = enemies.length > 0
                    ? Math.min(...enemies.map(e => HexUtils.dist(source, e)))
                    : Infinity;
                if (isInjured || minEnemyDist <= COMBAT_PARAM.AI_SELF_BUFF_ENGAGE_DIST) {
                    return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
                }
                return { targetAgent: null, targetHex: null };
            }

            return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
        }

        // 2. 遠程 AOE - 執行密度掃描
        if (skill.type === 'AOE') {
            return this.findBestAOELocation(source, skill, spatial);
        }

        // 3. 單體技能
        const isBuffCC = hasStatusIn(skill, FRIENDLY_BUFF_CC) || hasStatusIn(skill, HOT_ONLY);
        const targetIsAlly = skill.power < 0 || (skill.power === 0 && isBuffCC);

        const isPureHeal = skill.power < 0 && !hasStatusIn(skill, FRIENDLY_BUFF_CC);
        const isSelfDamageHeal = hasHitAction(skill, 'SELF_DAMAGE');

        let validStickyTarget = false;
        if (source.target && source.target.hp > 0 && !source.target.banished) {
            if (targetIsAlly) {
                if (sameSide(source.target, source)) {
                    validStickyTarget = true;
                    // 純治療不可黏著滿血友軍
                    if (isPureHeal && source.target.hp >= source.target.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD) {
                        validStickyTarget = false;
                    }
                    // 自殘治療不可選自己
                    if (isSelfDamageHeal && source.target.id === source.id) {
                        validStickyTarget = false;
                    }
                }
            } else {
                validStickyTarget = !sameSide(source.target, source);
            }
        }

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
            for (const ally of allies) {
                // 自殘治療排除自身
                if (isSelfDamageHeal && ally.id === source.id) continue;
                // 純治療略過滿血/近滿血友軍
                if (isPureHeal && ally.hp >= ally.maxHp * COMBAT_PARAM.AI_HEAL_HP_THRESHOLD) continue;

                const dist = Math.max(0.5, HexUtils.dist(source, ally));
                const missingHpPct = 1 - (ally.hp / ally.maxHp);
                let score = missingHpPct * 1000 - dist * 10;
                if (ally === source) score -= 100; // 優先救別人
                if (score > maxAllyScore) {
                    maxAllyScore = score;
                    bestAlly = ally;
                }
            }
            if (bestAlly) {
                return { targetAgent: bestAlly, targetHex: null };
            }
            // 友軍目標技能無合法友軍時，回傳 null（不可回傳敵軍，亦不可空放）
            return { targetAgent: null, targetHex: null };
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
        this.updateTarget(source, spatial);
        
        return { targetAgent: source.target, targetHex: null };
    }

    public getImpactArea(_source: Agent, targetHex: Hex, skill: Skill, spatial: ImpactAreaContext): Hex[] {
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
        const enemies = spatial.getAgents().filter(e => !sameSide(e, source) && this.isValidTarget(e));
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
                        if (s?.tag === 'ULT') score += TARGET_RULES.AOE_ULT_INTERRUPT_BONUS;
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
