
import { Agent } from "../../game";
import { Skill, Role, DamageChannel } from "../../../types";
import { COMBAT_PARAM, EFFECT_LIMITS, DAMAGE_RULES } from "../../../constants";
import { random } from "../../math/rng";
import { absorbWithShield } from "./DirectDamage";

export interface DamageResult {
    finalValue: number;     // Final HP delta (negative for damage, positive for heal)
    shieldAbsorb: number;   // Amount absorbed by shield
    isCrit: boolean;        // Critical hit?
    isExecute: boolean;     // Execute trigger?
    isBlock: boolean;       // Tank block?
    isMiss: boolean;        // Blind miss?
    vampAmount: number;     // Lifesteal value
    manaBurn: number;       // MP burned
    manaRestore: number;    // MP restored
    overkill: number;       // Damage exceeding remaining HP
    channel: DamageChannel; // 傷害通道（目前只記錄，公式尚未依通道分流）
}

export interface DamageOptions {
    /** 傷害通道；resolveHit 是 DIRECT（預設） */
    channel?: DamageChannel;
    /** 本段威力占整個技能的比例（多段命中 1/N；預設 1）。平坦的法力、護盾量也依此比例分攤。 */
    powerScale?: number;
}

export class DamageCalculator {

    /**
     * The Core Damage Pipeline:
     * Hit Check (Blind) -> Base -> Multipliers -> Crit/Execute -> Mitigation (Shield/Def/Block) -> Final
     */
    public static calculate(source: Agent, target: Agent, skill: Skill, battleTime: number = 0, preRollCrit: boolean | undefined = undefined, isLastStand: boolean = false, options: DamageOptions = {}): DamageResult {
        const channel = options.channel ?? 'DIRECT';
        const powerScale = options.powerScale ?? 1;
        const isHeal = skill.power < 0;
        const isAlly = source.team === target.team;
        
        // Support skills (Heals or Buffs cast on allies) should bypass evasion and shields
        const isBuffCC = (skill.ccType === 'SHIELD' || skill.ccType === 'HOT' || skill.ccType2 === 'SHIELD' || skill.ccType2 === 'HOT');
        const isSupport = isHeal || (isAlly && (skill.power === 0 || isBuffCC));

        const result: DamageResult = {
            finalValue: 0,
            shieldAbsorb: 0,
            isCrit: false,
            isExecute: false,
            isBlock: false,
            isMiss: false,
            vampAmount: 0,
            manaBurn: 0,
            manaRestore: 0,
            overkill: 0,
            channel
        };

        // Banishment Immunity: Banished targets cannot take damage or be healed
        if (target.banished) {
            return result;
        }

        // --- INVINCIBLE: NO DAMAGE ---
        if (target.effects.INVINCIBLE.remaining > 0 && !isHeal && !isSupport) {
            return result;
        }

        // --- LAST STAND: HEAL EMBARGO ---
        if (isLastStand && isHeal) {
            return result; // Explicitly return empty result (0 heal)
        }

        let base = Math.abs(skill.power);
        
        let dmgMultiplier = 1.0;
        let healMultiplier = 1.0;
        
        // --- SUDDEN DEATH MECHANIC ---
        // After 60 seconds, damage ramps up and healing ramps down to prevent stalemates
        const SUDDEN_DEATH_START = 60;
        if (battleTime > SUDDEN_DEATH_START) {
            const overtime = battleTime - SUDDEN_DEATH_START;
            if (isHeal) {
                // Healing decays by 5% per second, down to 10%
                healMultiplier = Math.max(DAMAGE_RULES.MIN_HEAL_MULTIPLIER, 1.0 - (overtime * DAMAGE_RULES.OVERTIME_HEAL_DECAY));
            } else {
                // Damage increases by 5% per second
                dmgMultiplier = 1.0 + (overtime * DAMAGE_RULES.OVERTIME_DAMAGE_GAIN);
            }
        }

        // --- LAST STAND: ABSOLUTE PENETRATION (SKIP MISS) ---
        // 0. Miss Logic (Blind)
        if (!isSupport && source.effects.BLIND.remaining > 0 && !isLastStand) {
            // 50% Chance to miss if blinded 
            if (random() < 0.5) {
                result.isMiss = true;
                return result; // Early exit on miss
            }
        }

        // 1. Role Multipliers & Base Logic
        if (!isHeal) {
            // Vulnerable check
            if (target.effects.VULNERABLE.remaining > 0) {
                base *= DAMAGE_RULES.VULNERABLE_MULTIPLIER; // 35% bonus damage
            }
        }

        // 2. Execute Logic (斩殺)
        const isExec1 = skill.effectType === 'EXECUTE';
        const isExec2 = skill.effectType2 === 'EXECUTE';
        
        if (!isHeal && (isExec1 || isExec2)) {
            const threshold = COMBAT_PARAM.EXECUTE_THRESHOLD;
            if (target.hp < target.maxHp * threshold) {
                // [REFACTOR] Instead of flat multiplier, use missing HP scaling
                // Damage = Base + (MissingHP * ScalingFactor)
                const scalingFactor = (isExec1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_EXECUTE_MULTIPLIER;
                const missingHP = target.maxHp - target.hp;
                base += missingHP * (scalingFactor / DAMAGE_RULES.EXECUTE_SCALING_DIVISOR); // Normalized scaling
                result.isExecute = true;
            }
        }

        // Apply Sudden Death Multipliers to the final base (including execute)
        if (isHeal) {
            base *= healMultiplier;
        } else {
            base *= dmgMultiplier;
            // --- LAST STAND: 3X DAMAGE ---
            if (isLastStand) {
                base *= 3.0;
            }
        }

        // 多段命中：每段只拿整個技能的 1/N（含斬殺加成），總量不變
        base *= powerScale;

        // 3. Crit Logic
        const isCrit = preRollCrit !== undefined ? preRollCrit : random() < COMBAT_PARAM.CRIT_CHANCE;
        if (!isHeal && isCrit) {
            base *= DAMAGE_RULES.CRIT_MULTIPLIER;
            result.isCrit = true;
        }

        // 4. Mitigation (Tank Block Logic)
        if (!isHeal && target.role === Role.TANK && target.hp > 0 && !isLastStand) {
            base *= DAMAGE_RULES.TANK_DAMAGE_MULTIPLIER; 
            result.isBlock = true;
        }

        // 5. Shield Absorption (SKIP IF LAST STAND)
        if (!isSupport && !isLastStand) {
            const absorbed = absorbWithShield(target, base);
            base -= absorbed;
            result.shieldAbsorb = absorbed;
        }

        // 6. Final Calculation
        let final = Math.floor(base);
        
        // 7. Secondary Effects (Vamp, Mana)
        const isVamp1 = skill.effectType === 'VAMP';
        const isVamp2 = skill.effectType2 === 'VAMP';
        const lsPct = source.effects.LIFESTEAL.remaining > 0
            ? Math.min(source.effects.LIFESTEAL.value, EFFECT_LIMITS.LIFESTEAL_MAX_PCT) / 100
            : 0;
        if (!isHeal && (isVamp1 || isVamp2 || lsPct > 0)) {
            const skillVampPct = (isVamp1 ? skill.effectVal : (isVamp2 ? skill.effectVal2 : 0)) || (isVamp1 || isVamp2 ? COMBAT_PARAM.BASE_VAMP_PCT : 0);
            const totalVampPct = skillVampPct + lsPct;
            result.vampAmount = Math.floor(final * totalVampPct);
        }

        // Mana Burn
        let mb = 0;
        if (skill.effectType === 'MANA_BURN') mb += (skill.effectVal || COMBAT_PARAM.MANA_BURN_DEFAULT);
        if (skill.effectType2 === 'MANA_BURN') mb += (skill.effectVal2 || COMBAT_PARAM.MANA_BURN_DEFAULT);
        result.manaBurn = mb * powerScale;

        // Mana Restore
        let mr = 0;
        if (skill.effectType === 'MANA_RESTORE') mr += (skill.effectVal || COMBAT_PARAM.MANA_RESTORE_DEFAULT);
        if (skill.effectType2 === 'MANA_RESTORE') mr += (skill.effectVal2 || COMBAT_PARAM.MANA_RESTORE_DEFAULT);
        result.manaRestore = mr * powerScale;

        // 8. Apply Direction (Damage is negative)
        result.finalValue = isHeal ? final : -final;
        
        // 9. Overkill Calc
        if (!isHeal && final > target.hp) {
            result.overkill = final - target.hp;
        }

        return result;
    }
}
