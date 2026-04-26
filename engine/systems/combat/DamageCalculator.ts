
import { Agent } from "../../game";
import { Skill, Role } from "../../../types";
import { COMBAT_PARAM } from "../../../constants";

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
}

export class DamageCalculator {

    /**
     * The Core Damage Pipeline:
     * Hit Check (Blind) -> Base -> Multipliers -> Crit/Execute -> Mitigation (Shield/Def/Block) -> Final
     */
    public static calculate(source: Agent, target: Agent, skill: Skill, battleTime: number = 0, preRollCrit: boolean | null = null): DamageResult {
        const isHeal = skill.power < 0;
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
                healMultiplier = Math.max(0.1, 1.0 - (overtime * 0.05));
            } else {
                // Damage increases by 5% per second
                dmgMultiplier = 1.0 + (overtime * 0.05);
            }
        }

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
            overkill: 0
        };

        // 0. Miss Logic (Blind)
        if (!isHeal && source.blindTimer > 0) {
            // 50% Chance to miss if blinded
            if (Math.random() < 0.5) {
                result.isMiss = true;
                return result; // Early exit on miss
            }
        }

        // 1. Role Multipliers & Base Logic
        if (!isHeal) {
            // Ranger: Bonus dmg at max range? (Placeholder logic)
            // Mage: Bonus vs High Armor? 
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
                base += missingHP * (scalingFactor / 5); // Normalized scaling
                result.isExecute = true;
            }
        }

        // Apply Sudden Death Multipliers to the final base (including execute)
        if (isHeal) {
            base *= healMultiplier;
        } else {
            base *= dmgMultiplier;
        }

        // 3. Crit Logic
        const isCrit = preRollCrit !== null ? preRollCrit : Math.random() < 0.1;
        if (!isHeal && isCrit) {
            base *= 1.5;
            result.isCrit = true;
        }

        // 4. Mitigation (Tank Block Logic)
        if (!isHeal && target.role === Role.TANK && target.hp > 0) {
            base *= 0.85; 
            result.isBlock = true;
        }

        // 5. Shield Absorption (NEW)
        let absorbed = 0;
        if (!isHeal && target.shield > 0) {
            absorbed = Math.min(target.shield, base);
            base -= absorbed;
            target.shield -= absorbed;
            result.shieldAbsorb = absorbed;
        }

        // 6. Final Calculation
        let final = Math.floor(base);
        
        // 7. Secondary Effects (Vamp, Mana)
        const isVamp1 = skill.effectType === 'VAMP';
        const isVamp2 = skill.effectType2 === 'VAMP';
        if (!isHeal && (isVamp1 || isVamp2)) {
            const vampPct = (isVamp1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_VAMP_PCT;
            // Vamp based on unmitigated damage or actual HP damage? Usually actual.
            result.vampAmount = Math.floor(final * vampPct);
        }

        // Mana Burn
        let mb = 0;
        if (skill.effectType === 'MANA_BURN') mb += (skill.effectVal || COMBAT_PARAM.MANA_BURN_DEFAULT);
        if (skill.effectType2 === 'MANA_BURN') mb += (skill.effectVal2 || COMBAT_PARAM.MANA_BURN_DEFAULT);
        result.manaBurn = mb;

        // Mana Restore
        let mr = 0;
        if (skill.effectType === 'MANA_RESTORE') mr += (skill.effectVal || COMBAT_PARAM.MANA_RESTORE_DEFAULT);
        if (skill.effectType2 === 'MANA_RESTORE') mr += (skill.effectVal2 || COMBAT_PARAM.MANA_RESTORE_DEFAULT);
        result.manaRestore = mr;

        // 8. Apply Direction (Damage is negative)
        result.finalValue = isHeal ? final : -final;
        
        // 9. Overkill Calc
        if (!isHeal && final > target.hp) {
            result.overkill = final - target.hp;
        }

        return result;
    }
}
