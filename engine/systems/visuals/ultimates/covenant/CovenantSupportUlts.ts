
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const CovenantSupportUlts: Record<string, UltScriptFn> = {
    // 靈魂連結 (Soul Link)
    'sr_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_ULT_RED_SOUL_WEB', ctx.target, '#581c87', 0);
        
        // Chains
        for(let i=0; i<6; i++) {
            const angle = (i/6) * Math.PI * 2;
            const r = 200;
            const px = ctx.target.x + Math.cos(angle) * r;
            const py = ctx.target.y + Math.sin(angle) * r;
            
            seq.beam('BEAM_RED_LINK', ctx.target, {x:px, y:py, z:ctx.target.z}, '#581c87', 2.0, i*50);
        }
    },

    // 先祖之魂 (Ancestors)
    'sr_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        const zone = ctx.vfx.state.getParticle();
        zone.x = ctx.target.x; zone.y = ctx.target.y; zone.z = ctx.target.z;
        zone.life = 3.0; zone.maxLife = 3.0;
        zone.color = '#ef4444'; zone.size = 300;
        zone.type = 'DOMAIN'; zone.style = 'DOMAIN_STANDARD';
        ctx.vfx.state.particles.push(zone);
        
        seq.effect('FX_HIT_RED_BLOOD', ctx.target, '#bef264', 0);
    },

    // 巫毒大陣 (Voodoo)
    'sr_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<10; i++) {
            const r = 50 + Math.random() * 150;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            const p = ctx.vfx.state.getParticle();
            p.x = px; p.y = py; p.z = ctx.target.z;
            p.life = 2.0; p.maxLife = 2.0;
            p.color = '#84cc16'; p.size = 20; p.type = 'SMOKE';
            ctx.vfx.state.particles.push(p);
        }
    },

    // 鮮血契約 (Blood Pact)
    'sr_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        const wave = ctx.vfx.state.getParticle();
        wave.x = ctx.target.x; wave.y = ctx.target.y; wave.z = ctx.target.z;
        wave.life = 1.0; wave.maxLife = 1.0;
        wave.color = '#dc2626'; wave.size = 300; wave.type = 'SHOCKWAVE';
        ctx.vfx.state.particles.push(wave);
        
        seq.effect('FX_HIT_RED_BLOOD', ctx.target, '#f87171', 0);
    },

    // 夢魘降臨 (Nightmare)
    'sr_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        const fog = ctx.vfx.state.getParticle();
        fog.x = ctx.target.x; fog.y = ctx.target.y; fog.z = ctx.target.z;
        fog.life = 3.0; fog.maxLife = 3.0;
        fog.color = '#4c1d95'; fog.size = 300; fog.type = 'GRID_FIELD'; fog.style = 'GRID_RED_RITUAL';
        ctx.vfx.state.particles.push(fog);
    }
};
