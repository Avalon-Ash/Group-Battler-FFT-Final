
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const ImperialSupportUlts: Record<string, UltScriptFn> = {
    // 神聖干涉 (Intervention)
    'sb_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z;
        p.life = 4.0; p.maxLife = 4.0;
        p.color = '#fef3c7'; p.size = 150;
        p.type = 'PILLAR'; p.style = 'PILLAR_HOLY';
        ctx.vfx.state.particles.push(p);
    },

    // 復活之光 (Resurrection)
    'sb_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_ULT_BLUE_RESURRECTION', ctx.target, '#86efac', 0);
        
        for(let i=0; i<10; i++) {
            const p = ctx.vfx.state.getParticle();
            p.x = ctx.target.x + (Math.random()-0.5)*100; 
            p.y = ctx.target.y + (Math.random()-0.5)*100; 
            p.z = ctx.target.z;
            p.vz = 100 + Math.random() * 200; 
            p.life = 2.0; p.maxLife = 2.0; 
            p.color = '#86efac'; p.size = 8; p.type = 'GLOW';
            ctx.vfx.state.particles.push(p);
        }
    },

    // 英勇讚美詩 (Hymn)
    'sb_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<3; i++) {
            const p = ctx.vfx.state.getParticle();
            p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 10;
            p.life = 2.0; p.maxLife = 2.0;
            p.color = '#3b82f6'; p.size = 100 + i*100;
            p.type = 'SHOCKWAVE';
            p.delay = i * 0.5;
            ctx.vfx.state.particles.push(p);
        }
    },

    // 神之怒 (Wrath)
    'sb_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(800, '#fcd34d', 'METEOR', 'FX_HIT_BLUE_HOLY', '#f59e0b');
    },

    // 寧靜之雨 (Rain)
    'sb_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<20; i++) {
            const r = Math.random() * 300;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            const drop = ctx.vfx.state.getParticle();
            drop.x = px; drop.y = py; drop.z = ctx.target.z + 500;
            drop.vz = -1000;
            drop.life = 0.5; drop.maxLife = 0.5;
            drop.color = '#86efac'; drop.size = 3; drop.type = 'BEAM';
            // Vertical beam trick
            drop.style = 'GENERIC_BEAM';
            drop.sx = px; drop.sy = py; drop.sz = drop.z;
            drop.tx = px; drop.ty = py; drop.tz = drop.z - 20; 
            
            drop.delay = i * 0.1;
            ctx.vfx.state.particles.push(drop);
        }
    }
};
