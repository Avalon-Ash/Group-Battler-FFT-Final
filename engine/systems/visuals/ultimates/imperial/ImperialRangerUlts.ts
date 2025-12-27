
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const ImperialRangerUlts: Record<string, UltScriptFn> = {
    // 水晶巨箭 (Crystal Arrow)
    'rb_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            seq.beam('GENERIC_BEAM', ctx.sourcePos, ctx.target, '#60a5fa', 0.5, 0);
        }
        seq.effect('FX_ULT_BLUE_GLACIAL_BURST', ctx.target, '#bae6fd', 0);
        seq.shake(0.2, 0);
    },

    // 星隕箭雨 (Starfall)
    'rb_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<8; i++) {
            const r = Math.random() * 200;
            const a = Math.random() * Math.PI * 2;
            const px = ctx.target.x + Math.cos(a)*r;
            const py = ctx.target.y + Math.sin(a)*r;
            
            // Falling Stars
            const star = ctx.vfx.state.getParticle();
            star.x = px; star.y = py; star.z = ctx.target.z + 600;
            star.vz = -1000;
            star.life = 0.6; star.maxLife = 0.6;
            star.color = '#fcd34d'; star.size = 8;
            star.type = 'SPARK';
            star.delay = i * 0.1;
            ctx.vfx.state.particles.push(star);

            seq.effect('FX_HIT_BLUE_HOLY', {x:px, y:py, z:ctx.target.z}, '#fff', i*100 + 600);
        }
    },

    // 軌道轟炸 (Orbital)
    'rb_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        
        // Reticle
        const reticle = ctx.vfx.state.getParticle();
        reticle.x = ctx.target.x; reticle.y = ctx.target.y; reticle.z = ctx.target.z;
        reticle.life = 1.0; reticle.maxLife = 1.0;
        reticle.color = '#22d3ee'; reticle.size = 150;
        reticle.type = 'HEX_BEAM'; reticle.vRotation = 5;
        ctx.vfx.state.particles.push(reticle);

        // Laser
        seq.beam('DEATH_RAY', 
            { x: ctx.target.x, y: ctx.target.y, z: ctx.target.z + 2000 },
            ctx.target,
            '#06b6d4', 1.5, 800
        );
        
        seq.effect('FX_ULT_BLUE_ORBITAL_BEAM', ctx.target, '#fff', 800);
        seq.shake(0.3, 800);
    },

    // 絕對封鎖 (Lockdown)
    'rb_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z;
        p.life = 3.0; p.maxLife = 3.0;
        p.color = '#8b5cf6'; p.size = 200;
        p.type = 'GRID_FIELD'; p.style = 'GRID_TECH_BLUE';
        ctx.vfx.state.particles.push(p);
        
        seq.shake(0.1, 0);
    },

    // 超載連射 (Overload)
    'rb_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (!ctx.sourcePos) return;
        
        for(let i=0; i<10; i++) {
            // Machine Gun Effect
            seq.beam('GENERIC_BEAM', 
                { x: ctx.sourcePos.x + (Math.random()-0.5)*10, y: ctx.sourcePos.y, z: ctx.sourcePos.z },
                { x: ctx.target.x + (Math.random()-0.5)*20, y: ctx.target.y, z: ctx.target.z + (Math.random()-0.5)*20 },
                '#fff', 0.1, i * 50
            );
        }
        seq.shake(0.1, 0);
    }
};
