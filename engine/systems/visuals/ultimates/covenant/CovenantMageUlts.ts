
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const CovenantMageUlts: Record<string, UltScriptFn> = {
    // 毀滅隕石 (Meteor)
    'mr_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(1500, '#f97316', 'METEOR', 'FX_ULT_RED_METEOR_IMPACT', '#7c2d12');
        seq.shake(0.5, 1200);
    },

    // 死亡一指 (Death Finger)
    'mr_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        if(!ctx.sourcePos) return;
        
        seq.beam('DEATH_RAY', ctx.sourcePos, ctx.target, '#be123c', 1.0, 0);
        seq.effect('FX_HIT_RED_BLOOD', ctx.target, '#be123c', 0);
    },

    // 混亂之雨 (Chaos Rain)
    'mr_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<12; i++) {
            const r = Math.random() * 250;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            const ball = ctx.vfx.state.getParticle();
            ball.x = px; ball.y = py; ball.z = ctx.target.z + 800;
            ball.vz = -1200;
            ball.life = 0.8; ball.maxLife = 0.8;
            ball.color = '#22c55e'; ball.size = 20;
            ball.type = 'SPARK'; ball.delay = i * 0.1;
            ctx.vfx.state.particles.push(ball);

            seq.effect('FX_HIT_RED_FEL', {x:px, y:py, z:ctx.target.z}, '#16a34a', i*100 + 600);
        }
    },

    // 虛空傳送門 (Void Portal)
    'mr_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 20;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#581c87'; p.size = 150;
        p.type = 'GIANT_HEX'; p.vRotation = 20;
        ctx.vfx.state.particles.push(p);
        
        seq.effect('FX_HIT_RED_SHADOW', ctx.target, '#581c87', 0);
    },

    // 靈魂燃燒 (Soul Burn)
    'mr_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<15; i++) {
            const r = Math.random() * 300;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            seq.effect('FX_HIT_RED_SHADOW', {x:px, y:py, z:ctx.target.z}, '#9333ea', i*50);
        }
    }
};
