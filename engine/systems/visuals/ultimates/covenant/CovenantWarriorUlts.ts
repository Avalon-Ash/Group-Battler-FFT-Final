
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const CovenantWarriorUlts: Record<string, UltScriptFn> = {
    // 諸神黃昏 (Ragnarok)
    'wr_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_ULT_RED_RAGNAROK_ERUPTION', ctx.target, '#ea580c', 0);
        
        const cracks = ctx.vfx.state.getParticle();
        cracks.x = ctx.target.x; cracks.y = ctx.target.y; cracks.z = ctx.target.z;
        cracks.life = 3.0; cracks.maxLife = 3.0;
        cracks.color = '#ea580c'; cracks.size = 150;
        cracks.type = 'GRID_FIELD'; cracks.style = 'GRID_RED_RITUAL';
        ctx.vfx.state.particles.push(cracks);
        
        seq.shake(0.3, 0);
    },

    // 血腥旋風 (Blood Storm)
    'wr_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<20; i++) {
            const r = 50 + Math.random() * 150;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            const p = ctx.vfx.state.getParticle();
            p.x = px; p.y = py; p.z = ctx.target.z + Math.random()*100;
            p.vz = 50 + Math.random()*100;
            p.life = 1.0; p.maxLife = 1.0;
            p.color = '#dc2626'; p.size = 20; p.type = 'SMOKE';
            p.delay = i * 0.05;
            ctx.vfx.state.particles.push(p);
        }
        seq.shake(0.1, 0);
    },

    // 惡魔變身 (Demon Form)
    'wr_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_HIT_RED_SHADOW', ctx.target, '#000', 0);
        
        const burst = ctx.vfx.state.getParticle();
        burst.x = ctx.target.x; burst.y = ctx.target.y; burst.z = ctx.target.z + 50;
        burst.life = 2.0; burst.maxLife = 2.0;
        burst.color = '#7f1d1d'; burst.size = 100;
        burst.type = 'GLOW';
        ctx.vfx.state.particles.push(burst);
    },

    // 無限劍制 (Unlimited)
    'wr_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<12; i++) {
            const r = Math.random() * 200;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            // Swords spawning and striking
            seq.beam('SLASH_CONNECT', 
                {x: px, y: py, z: ctx.target.z + 100},
                {x: px + (Math.random()-0.5)*20, y: py + (Math.random()-0.5)*20, z: ctx.target.z + 20},
                '#ef4444', 0.2, i*50
            );
        }
        seq.shake(0.2, 0);
    },

    // 毀滅重擊 (Devastate)
    'wr_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_HIT_RED_HEAVY', ctx.target, '#450a0a', 0);
        seq.shake(0.4, 0);
    }
};
