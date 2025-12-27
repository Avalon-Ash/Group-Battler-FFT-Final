
import { Agent } from "../../game";
import { Skill, Role } from "../../../types";
import { COMBAT_PARAM } from "../../../constants";

export interface DamageResult {
    finalValue: number;     // Final HP delta (negative for damage, positive for heal)
    isCrit: boolean;        // Critical hit?
    isExecute: boolean;     // Execute trigger?
    isBlock: boolean;       // Tank block?
    vampAmount: number;     // Lifesteal value
    manaBurn: number;       // MP burned
    manaRestore: number;    // MP restored
    overkill: number;       // Damage exceeding remaining HP
}

export class DamageCalculator {

    /**
     * The Core Damage Pipeline:
     * Base -> Multipliers (Role/Buffs) -> Crit/Execute -> Mitigation (Def/Block) -> Final
     */
    public static calculate(source: Agent, target: Agent, skill: Skill): DamageResult {
        const isHeal = skill.power < 0;
        let base = Math.abs(skill.power);
        
        const result: DamageResult = {
            finalValue: 0,
            isCrit: false,
            isExecute: false,
            isBlock: false,
            vampAmount: 0,
            manaBurn: 0,
            manaRestore: 0,
            overkill: 0
        };

        // 1. Role Multipliers & Base Logic
        if (!isHeal) {
            // Ranger: Bonus dmg at max range? (Placeholder logic)
            // Mage: Bonus vs High Armor? 
        }

        // 2. Execute Logic (斩杀)
        const isExec1 = skill.effectType === 'EXECUTE';
        const isExec2 = skill.effectType2 === 'EXECUTE';
        
        if (!isHeal && (isExec1 || isExec2)) {
            const threshold = COMBAT_PARAM.EXECUTE_THRESHOLD;
            if (target.hp < target.maxHp * threshold) {
                const multiplier = (isExec1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_EXECUTE_MULTIPLIER;
                base *= multiplier;
                result.isExecute = true;
            }
        }

        // 3. Crit Logic (Simplified: Random 10% chance for non-DoT/Structures)
        // Future: Read from Agent stats
        if (!isHeal && Math.random() < 0.1) {
            base *= 1.5;
            result.isCrit = true;
        }

        // 4. Mitigation (Tank Block Logic)
        if (!isHeal && target.role === Role.TANK && target.hp > 0) {
            // Chance to block based on facing? 
            // If facing attacker: 20% reduction
            // Simplified: Flat small reduction for Tanks
            base *= 0.85; 
            result.isBlock = true;
        }

        // 5. Final Calculation
        let final = Math.floor(base);
        
        // 6. Secondary Effects (Vamp, Mana)
        const isVamp1 = skill.effectType === 'VAMP';
        const isVamp2 = skill.effectType2 === 'VAMP';
        if (!isHeal && (isVamp1 || isVamp2)) {
            const vampPct = (isVamp1 ? skill.effectVal : skill.effectVal2) || COMBAT_PARAM.BASE_VAMP_PCT;
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

        // 7. Apply Direction (Damage is negative)
        result.finalValue = isHeal ? final : -final;
        
        // 8. Overkill Calc
        if (!isHeal && final > target.hp) {
            result.overkill = final - target.hp;
        }

        return result;
    }
}
