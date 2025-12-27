
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const CovenantRangerUlts: Record<string, UltScriptFn> = {
    // 終極爆破 (Railgun)
    'rr_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (!ctx.sourcePos) return;
        
        // Charge up
        seq.effect('FX_HIT_RED_HEAVY', ctx.sourcePos, '#ef4444', 0);
        
        // Fire
        seq.beam('DEATH_RAY', ctx.sourcePos, ctx.target, '#000', 0.8, 200);
        seq.effect('FX_HIT_RED_HEAVY', ctx.target, '#ef4444', 200);
        seq.shake(0.2, 200);
    },

    // 戰術核彈 (Nuke)
    'rr_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        
        // 1. Flash
        seq.effect('FX_ULT_RED_NUKE_FLASH', { ...ctx.target, z: ctx.target.z + 100 }, '#fff', 0);
        
        // 2. Mushroom Stem
        const stem = ctx.vfx.state.getParticle();
        stem.x = ctx.target.x; stem.y = ctx.target.y; stem.z = ctx.target.z;
        stem.life = 2.5; stem.maxLife = 2.5;
        stem.color = '#1c1917'; stem.size = 100;
        stem.type = 'PILLAR'; stem.style = 'PILLAR_VOID';
        ctx.vfx.state.particles.push(stem);

        // 3. Cap
        seq.wait(100, () => {
            seq.effect('FX_ULT_RED_NUKE_CLOUD', { ...ctx.target, z: ctx.target.z + 400 }, '#fca5a5', 0);
            seq.shake(0.6, 0);
        });

        // 4. Wave
        const wave = ctx.vfx.state.getParticle();
        wave.x = ctx.target.x; wave.y = ctx.target.y; wave.z = ctx.target.z + 10;
        wave.life = 1.0; wave.maxLife = 1.0;
        wave.color = '#ef4444'; wave.size = 400; wave.type = 'SHOCKWAVE';
        ctx.vfx.state.particles.push(wave);
    },

    // 彈幕時間 (Bullet Time)
    'rr_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (!ctx.sourcePos) return;
        
        for(let i=0; i<30; i++) {
            seq.beam('GENERIC_BEAM', 
                ctx.sourcePos,
                { x: ctx.target.x + (Math.random()-0.5)*400, y: ctx.target.y + (Math.random()-0.5)*400, z: ctx.target.z },
                '#f87171', 0.1, i*20
            );
        }
    },

    // 煉獄手雷 (Inferno)
    'rr_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(600, '#ea580c', 'ROCK', 'FX_HIT_RED_MAGMA', '#ea580c');
        // Extra fire
        for(let i=0; i<5; i++) {
            seq.effect('FX_HIT_RED_MAGMA', 
                {x: ctx.target.x + (Math.random()-0.5)*100, y: ctx.target.y + (Math.random()-0.5)*100, z: ctx.target.z}, 
                '#f97316', 300 + i*100
            );
        }
    },

    // 獵頭者 (Headhunter)
    'rr_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (!ctx.sourcePos) return;
        // Crosshair
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 50;
        p.life = 0.5; p.maxLife = 0.5;
        p.color = '#ef4444'; p.size = 50; p.type = 'HEX_LOCK';
        ctx.vfx.state.particles.push(p);

        seq.beam('DEATH_RAY', ctx.sourcePos, ctx.target, '#7f1d1d', 0.2, 500);
        seq.shake(0.2, 500);
    }
};
