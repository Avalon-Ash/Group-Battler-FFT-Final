
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const ImperialWarriorUlts: Record<string, UltScriptFn> = {
    // 雷霆跳斬 (Thunder)
    'wb_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.gridImpact('#3b82f6', 0);
        
        // Lightning Bolt from Sky
        seq.beam('TELEPORT_PILLAR', 
            { x: ctx.target.x, y: ctx.target.y, z: ctx.target.z + 1000 },
            ctx.target,
            '#3b82f6', 0.3, 0
        );
        
        seq.effect('FX_ULT_BLUE_THUNDER_SLAM', ctx.target, '#fff', 100);
        seq.shake(0.3, 100);
    },

    // 破曉 (Daybreak)
    'wb_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Rising Sun
        const sun = ctx.vfx.state.getParticle();
        sun.x = ctx.target.x; sun.y = ctx.target.y; sun.z = ctx.target.z;
        sun.vz = 50; 
        sun.life = 1.5; sun.maxLife = 1.5;
        sun.color = '#f59e0b'; sun.size = 10; 
        sun.type = 'GLOW';
        ctx.vfx.state.particles.push(sun);

        // Explosion
        seq.effect('FX_HIT_BLUE_HOLY', {x: ctx.target.x, y: ctx.target.y, z: ctx.target.z + 100}, '#fffbeb', 800);
        seq.shake(0.2, 800);
    },

    // 王者之劍 (Excalibur)
    'wb_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Vertical Slash
        const start = { x: ctx.target.x, y: ctx.target.y, z: ctx.target.z + 300 };
        seq.beam('SLASH_CONNECT', start, ctx.target, '#facc15', 0.4, 0);
        seq.effect('FX_HIT_BLUE_HOLY', ctx.target, '#facc15', 100);
        seq.shake(0.2, 100);
    },

    // 劍刃風暴 (Bladestorm)
    'wb_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        for(let i=0; i<12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 100;
            const px = ctx.target.x + Math.cos(angle) * r;
            const py = ctx.target.y + Math.sin(angle) * r;
            
            seq.beam('SLASH_CONNECT', 
                { x: px, y: py, z: ctx.target.z + 50 },
                { x: px + (Math.random()-0.5)*50, y: py + (Math.random()-0.5)*50, z: ctx.target.z + 50 },
                '#60a5fa', 0.2, i * 50
            );
        }
    },

    // 光速衝擊 (Lightspeed)
    'wb_u5': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            seq.beam('DEATH_RAY', ctx.sourcePos, ctx.target, '#e0f2fe', 0.5, 0);
        }
        seq.effect('FX_HIT_BLUE_TECH', ctx.target, '#fff', 0);
        seq.shake(0.1, 0);
    }
};
