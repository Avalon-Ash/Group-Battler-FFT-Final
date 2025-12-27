
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const CovenantTankUlts: Record<string, UltScriptFn> = {
    // 斷頭台 (Guillotine)
    'tr_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.gridImpact('#7f1d1d', 0);
        
        // The Blade
        const blade = ctx.vfx.state.getParticle();
        blade.x = ctx.target.x; blade.y = ctx.target.y; blade.z = ctx.target.z + 800;
        blade.vx = 0; blade.vy = 0; blade.vz = -2000;
        blade.life = 0.4; blade.maxLife = 0.4;
        blade.color = '#7f1d1d'; blade.size = 150;
        blade.type = 'SHARD'; blade.locked = true;
        blade.rotation = Math.PI / 2;
        ctx.vfx.state.particles.push(blade);

        seq.effect('FX_ULT_RED_GUILLOTINE_IMPACT', ctx.target, '#fff', 400);
        seq.shake(0.3, 400);
    },

    // 亡靈大軍 (Undead Army)
    'tr_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        const zone = ctx.vfx.state.getParticle();
        zone.x = ctx.target.x; zone.y = ctx.target.y; zone.z = ctx.target.z;
        zone.life = 4.0; zone.maxLife = 4.0;
        zone.color = '#3f6212'; zone.size = 300;
        zone.type = 'GRID_FIELD'; zone.style = 'GRID_RED_POISON'; zone.locked = true;
        ctx.vfx.state.particles.push(zone);

        for(let i=0; i<15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 200;
            const p = ctx.vfx.state.getParticle();
            p.x = ctx.target.x + Math.cos(angle) * r; 
            p.y = ctx.target.y + Math.sin(angle) * r; 
            p.z = ctx.target.z;
            p.vz = 50 + Math.random() * 50;
            p.life = 2.0; p.maxLife = 2.0; 
            p.type = 'GLOW'; p.color = '#bef264'; p.size = 20; p.delay = i * 0.1;
            ctx.vfx.state.particles.push(p);
        }
    },

    // 血魔之擁 (Blood Embrace)
    'tr_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Reverse Shockwave (Implosion)
        // Hard to do strictly reverse physics, so we fake it with delay
        seq.effect('FX_HIT_RED_BLOOD', ctx.target, '#be123c', 0);
        seq.shake(0.2, 0);
    },

    // 不朽屍王 (Undying)
    'tr_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_HIT_RED_FEL', ctx.target, '#16a34a', 0);
        // Big Green Glow
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 50;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#16a34a'; p.size = 100;
        p.type = 'GLOW';
        p.locked = true; // Attach to unit if possible, but here it's static target
        ctx.vfx.state.particles.push(p);
    },

    // 腐爛爆發 (Rot)
    'tr_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<10; i++) {
            const r = Math.random() * 200;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            seq.effect('FX_HIT_RED_FEL', {x:px, y:py, z:ctx.target.z}, '#3f6212', i*50);
        }
    }
};
