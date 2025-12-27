
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const ImperialMageUlts: Record<string, UltScriptFn> = {
    // 事件視界 (Black Hole)
    'mb_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 50;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#000'; p.size = 150;
        p.type = 'GIANT_HEX'; p.vRotation = 10;
        ctx.vfx.state.particles.push(p);
        
        seq.effect('FX_HIT_BLUE_ARCANE', ctx.target, '#8b5cf6', 0);
    },

    // 絕對零度 (Frostfall)
    'mb_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        const field = ctx.vfx.state.getParticle();
        field.x = ctx.target.x; field.y = ctx.target.y; field.z = ctx.target.z;
        field.life = 2.0; field.maxLife = 2.0;
        field.color = '#e0f2fe'; field.size = 400;
        field.type = 'DOMAIN'; field.style = 'DOMAIN_STANDARD';
        ctx.vfx.state.particles.push(field);

        seq.effect('FX_ULT_BLUE_GLACIAL_BURST', ctx.target, '#bae6fd', 0);
        
        // Ice Spikes
        for(let i=0; i<8; i++) {
            const angle = i * (Math.PI / 4);
            const r = 150 + Math.random() * 100;
            const px = ctx.target.x + Math.cos(angle) * r;
            const py = ctx.target.y + Math.sin(angle) * r;
            
            const spike = ctx.vfx.state.getParticle();
            spike.x = px; spike.y = py; spike.z = ctx.target.z;
            spike.life = 1.5; spike.maxLife = 1.5;
            spike.color = '#bae6fd'; spike.size = 40;
            spike.type = 'PILLAR'; spike.style = 'PILLAR_HOLY'; 
            spike.delay = i * 0.05;
            ctx.vfx.state.particles.push(spike);
        }
        seq.shake(0.2, 0);
    },

    // 時間停止 (Time Stop)
    'mb_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        const sphere = ctx.vfx.state.getParticle();
        sphere.x = ctx.target.x; sphere.y = ctx.target.y; sphere.z = ctx.target.z;
        sphere.life = 4.0; sphere.maxLife = 4.0;
        sphere.color = '#fef08a'; sphere.size = 800; // Global
        sphere.type = 'SHOCKWAVE'; 
        ctx.vfx.state.particles.push(sphere);
        
        seq.effect('FX_CAST_BREAK', ctx.target, '#fcd34d', 0);
    },

    // 奧術洪流 (Arcane Torrent)
    'mb_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<15; i++) {
            const r = Math.random() * 250;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            seq.effect('FX_HIT_BLUE_ARCANE', {x:px, y:py, z:ctx.target.z}, '#a855f7', i * 100);
        }
    },

    // 聚能光束 (Focus Beam)
    'mb_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        if(ctx.sourcePos) {
            seq.beam('GENERIC_BEAM', ctx.sourcePos, ctx.target, '#60a5fa', 2.0, 0);
        }
    }
};
