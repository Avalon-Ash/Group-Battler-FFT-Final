import { SHARED_VFX } from './data/vfx/registry/shared';
import { IMPERIAL_VFX } from './data/vfx/registry/imperial';
import { COVENANT_VFX } from './data/vfx/registry/covenant';

const registries = [
    { name: 'shared', reg: SHARED_VFX },
    { name: 'imperial', reg: IMPERIAL_VFX },
    { name: 'covenant', reg: COVENANT_VFX },
];

let issues = 0;
for (const repo of registries) {
    if (!repo.reg) continue;
    for (const [id, def] of Object.entries(repo.reg)) {
        if (!def.emitters) continue;
        for (let i = 0; i < def.emitters.length; i++) {
            const em = def.emitters[i];
            if (em.lifetime === undefined || em.lifetime === null || (Array.isArray(em.lifetime) && (em.lifetime[0] === undefined || isNaN(em.lifetime[0])))) {
                console.log(`[!] ISSUE: ${repo.name} -> ${id} -> emitter[${i}] has missing/invalid lifetime! obj:`, em.lifetime);
                issues++;
            }
        }
    }
}

if (issues === 0) {
    console.log("No lifetime issues found. All emitters have a valid lifetime.");
}
