
import { Skill } from "../../types";
import { VFX_REGISTRY } from "../../data/vfx/VFXRegistry";
import { PROJECTILE_VISUALS } from "../../data/vfx/projectile_visuals";

/**
 * Validates that all skills have correct VFX/Projectile bindings at startup.
 * Prevents silent failures where a skill spawns but shows nothing.
 */
export function validateAllVFXBindings(skills: Skill[]) {
    const errors: string[] = [];
    const REGISTRY_KEYS = new Set(Object.keys(VFX_REGISTRY));
    const PROJ_KEYS = new Set(Object.keys(PROJECTILE_VISUALS));

    for (const skill of skills) {
        const hit = skill.visualHitEffect;
        const proj = skill.visualProjectileEffect;

        if (hit && !REGISTRY_KEYS.has(hit)) {
            errors.push(`❌ [${skill.id}] visualHitEffect 未登錄 in VFX_REGISTRY: "${hit}"`);
        }

        if (proj && !PROJ_KEYS.has(proj)) {
            errors.push(`❌ [${skill.id}] visualProjectileEffect 未登錄 in PROJECTILE_VISUALS: "${proj}"`);
        }
    }

    if (errors.length > 0) {
        console.error('=== 🚨 VFX BINDING VALIDATION FAILED ===\n' + errors.join('\n'));
        return false;
    } else {
        console.log('✅ VFX Binding: All skills successfully validated.');
        return true;
    }
}
