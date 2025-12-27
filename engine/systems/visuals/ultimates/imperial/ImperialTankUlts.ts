
import { UltScriptFn } from "../UltTypes";
import { UltSequencer } from "../UltSequencer";

export const ImperialTankUlts: Record<string, UltScriptFn> = {
    // 神聖領域 (Sanctuary) - Pillars of Light
    'tb_u1': (ctx) => {
        const seq = new UltSequencer(ctx);
        const center = ctx.target;
        
        // 1. Center Beacon
        const beacon = ctx.vfx.state.getParticle();
        beacon.x = center.x; beacon.y = center.y; beacon.z = center.z;
        beacon.life = 3.5; beacon.maxLife = 3.5;
        beacon.color = '#fbbf24'; beacon.size = 120;
        beacon.type = 'PILLAR'; beacon.style = 'PILLAR_HOLY';
        ctx.vfx.state.particles.push(beacon);

        // 2. Domain Ring
        const ring = ctx.vfx.state.getParticle();
        ring.x = center.x; ring.y = center.y; ring.z = center.z;
        ring.life = 3.5; ring.maxLife = 3.5;
        ring.color = '#fffbeb'; ring.size = 350;
        ring.type = 'DOMAIN'; ring.style = 'DOMAIN_STANDARD';
        ctx.vfx.state.particles.push(ring);

        // 3. Falling Beams
        for(let i=0; i<6; i++) {
            const angle = i * (Math.PI / 3);
            const r = 250;
            const px = center.x + Math.cos(angle) * r;
            const py = center.y + Math.sin(angle) * r;
            
            seq.beam('TELEPORT_PILLAR', 
                { x: px, y: py, z: center.z + 800 }, 
                { x: px, y: py, z: center.z }, 
                '#f59e0b', 0.5, i * 100
            );
        }

        seq.effect('FX_ULT_BLUE_SANCTUARY_IMPACT', center, '#fbbf24', 500);
        seq.shake(0.2, 500);
    },

    // 王者祝福 (Kings Blessing) - Ascension
    'tb_u2': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_TELEPORT', ctx.target, '#fcd34d', 0);
        
        // Rising Light
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z;
        p.life = 2.0; p.maxLife = 2.0;
        p.color = '#fff'; p.size = 150;
        p.type = 'PILLAR'; p.style = 'PILLAR_HOLY';
        ctx.vfx.state.particles.push(p);
        
        seq.shake(0.1, 0);
    },

    // 神盾降臨 (Aegis Fall) - Giant Hex Drop
    'tb_u3': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(1200, '#60a5fa', 'GIANT_HEX', 'FX_HIT_BLUE_TECH', '#3b82f6');
    },

    // 泰坦重擊 (Titan Smash) - Physical Shock
    'tb_u4': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_HIT_BLUE_PHYSICAL', ctx.target, '#fcd34d', 0);
        seq.gridImpact('#fcd34d', 0);
        seq.shake(0.3, 0);
    },

    // 最終防線 (Final Defense) - Shield Dome
    'tb_u5': (ctx) => {
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z;
        p.life = 4.0; p.maxLife = 4.0;
        p.color = '#60a5fa'; p.size = 300;
        p.type = 'DOMAIN'; p.style = 'DOMAIN_SHIELD';
        p.locked = true;
        ctx.vfx.state.particles.push(p);
    }
};
