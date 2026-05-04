
import { Skill } from "../../types";
import { VFX_REGISTRY } from "../../data/vfx/VFXRegistry";
import { PROJECTILE_VISUALS } from "../../data/vfx/projectile_visuals";

let lastFingerprint = "";

/**
 * Validates that all skills have correct VFX/Projectile bindings at startup.
 * Prevents silent failures where a skill spawns but shows nothing.
 */
export function validateAllVFXBindings(skills: Skill[]) {
    // [ARCH] Use a simple fingerprint to prevent log spam if this is called repeatedly in hot paths
    const currentFingerprint = skills.map(s => s.id).sort().join('|');
    const isNewSet = currentFingerprint !== lastFingerprint;

    const errors: string[] = [];
    const REGISTRY_KEYS = new Set(Object.keys(VFX_REGISTRY));
    const PROJ_KEYS = new Set(Object.keys(PROJECTILE_VISUALS));

    for (const skill of skills) {
        const hit = skill.visualHitEffect;
        const proj = skill.visualProjectileEffect;
        const aoe = skill.visualAoeEffect;
        const cast = skill.visualCastEffect;

        if (hit && !REGISTRY_KEYS.has(hit)) {
            errors.push(`❌ [${skill.id}] visualHitEffect 未登錄 in VFX_REGISTRY: "${hit}"`);
        }

        if (proj && !PROJ_KEYS.has(proj)) {
            errors.push(`❌ [${skill.id}] visualProjectileEffect 未登錄 in PROJECTILE_VISUALS: "${proj}"`);
        }

        if (aoe && !REGISTRY_KEYS.has(aoe)) {
            errors.push(`❌ [${skill.id}] visualAoeEffect 未登錄 in VFX_REGISTRY: "${aoe}"`);
        }

        if (cast && !REGISTRY_KEYS.has(cast)) {
            errors.push(`❌ [${skill.id}] visualCastEffect 未登錄 in VFX_REGISTRY: "${cast}"`);
        }
    }

    if (errors.length > 0) {
        // [ARCH] Errors should always be logged to ensure visibility of broken bindings
        console.error('=== 🚨 VFX BINDING VALIDATION FAILED ===\n' + errors.join('\n'));
        lastFingerprint = currentFingerprint; // Still update to avoid spamming the same error if it doesn't change? 
        // No, maybe errors SHOULD repeat if they are fatal. 
        // But the user specifically asked about the success log.
        return false;
    } else {
        if (isNewSet) {
            console.log('✅ VFX Binding: All skills successfully validated.');
            lastFingerprint = currentFingerprint;
        }
        return true;
    }
}
