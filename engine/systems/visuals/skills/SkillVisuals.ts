
import { UltScriptFn } from "../ultimates/UltTypes";
import { UltSequencer } from "../ultimates/UltSequencer";

export const SKILL_SCRIPTS: Record<string, UltScriptFn> = {
    // ================= BLUE SKILLS =================
    
    // Ranger: Rail Shot (Fast Beam)
    'rb_b1': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            seq.beam('DEATH_RAY', ctx.sourcePos, ctx.target, '#38bdf8', 0.2); // Fast fade
        }
        seq.effect('FX_HIT_BLUE_TECH', ctx.target, '#e0f2fe', 0);
        seq.shake(0.1);
    },

    // Tank: Tech Bash (Shield Slam)
    'tb_b1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.effect('FX_HIT_BLUE_PHYSICAL', ctx.target, '#60a5fa', 0);
        seq.gridImpact('#3b82f6', 0); // Small grid ripple
    },

    // Tank: Magnet Pull (Blue Active)
    'tb_a4': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            seq.beam('GENERIC_BEAM', ctx.sourcePos, ctx.target, '#60a5fa', 0.6);
        }
        seq.effect('FX_HIT_BLUE_TECH', ctx.target, '#60a5fa', 0);
        // Visual pull indication
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z;
        p.life = 0.5; p.maxLife = 0.5;
        p.color = '#60a5fa'; p.size = 80;
        p.type = 'SHOCKWAVE'; // Implosion look
        ctx.vfx.state.particles.push(p);
    },

    // Warrior: Light Dash (Blue Active)
    'wb_a2': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            // Dash trail
            seq.beam('SLASH_CONNECT', ctx.sourcePos, ctx.target, '#e0f2fe', 0.3);
        }
        seq.effect('FX_HIT_BLUE_PHYSICAL', ctx.target, '#fff', 0);
        seq.shake(0.2);
    },

    // Mage: Gravity Well (AOE Pull)
    'mb_a1': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Spawn a black hole visual
        const p = ctx.vfx.state.getParticle();
        p.x = ctx.target.x; p.y = ctx.target.y; p.z = ctx.target.z + 10;
        p.life = 1.0; p.maxLife = 1.0;
        p.color = '#000'; p.size = 80;
        p.type = 'SHOCKWAVE';
        p.locked = true;
        ctx.vfx.state.particles.push(p);
        
        seq.effect('FX_HIT_BLUE_ARCANE', ctx.target, '#8b5cf6', 0);
        seq.shake(0.1);
    },

    // Mage: Phase Shift (Swap/Teleport)
    'mb_a3': (ctx) => {
        const seq = new UltSequencer(ctx);
        // VFX on Target
        seq.effect('FX_TELEPORT', ctx.target, '#8b5cf6', 0);
        // VFX on Source (if available)
        if (ctx.sourcePos) {
            seq.effect('FX_TELEPORT', ctx.sourcePos, '#8b5cf6', 100);
        }
    },

    // ================= RED SKILLS =================

    // Tank: Hook (Chain)
    'tr_a1': (ctx) => {
        const seq = new UltSequencer(ctx);
        if (ctx.sourcePos) {
            // Draw Chain (Using Helix beam style for now, visualized as chain)
            seq.beam('BEAM_RED_LINK', ctx.sourcePos, ctx.target, '#7f1d1d', 0.5);
        }
        seq.effect('FX_HIT_RED_BLOOD', ctx.target, '#991b1b', 0);
        seq.shake(0.2);
    },

    // Warrior: Whirlwind (AOE Slash)
    'wr_a1': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Create 3 slashes around the user
        const center = ctx.sourcePos || ctx.target; // Use source if available (self-centered AOE)
        
        for(let i=0; i<3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const r = 50;
            const px = center.x + Math.cos(angle) * r;
            const py = center.y + Math.sin(angle) * r;
            const pz = center.z + 30;
            
            // Fake slash with beam
            seq.beam('SLASH_CONNECT', 
                { x: center.x, y: center.y, z: center.z + 30 },
                { x: px, y: py, z: pz },
                '#ef4444', 0.2, i * 50
            );
        }
        seq.effect('FX_HIT_RED_HEAVY', center, '#7f1d1d', 0);
    },

    // Warrior: Devastating Jump (Red Active)
    'wr_a3': (ctx) => {
        const seq = new UltSequencer(ctx);
        // Jump Impact
        seq.effect('FX_HIT_RED_HEAVY', ctx.target, '#450a0a', 0);
        seq.gridImpact('#7f1d1d', 0);
        
        // Cracks
        const cracks = ctx.vfx.state.getParticle();
        cracks.x = ctx.target.x; cracks.y = ctx.target.y; cracks.z = ctx.target.z;
        cracks.life = 1.5; cracks.maxLife = 1.5;
        cracks.color = '#7f1d1d'; cracks.size = 100;
        cracks.type = 'CRACKS';
        ctx.vfx.state.particles.push(cracks);
        
        seq.shake(0.3);
    },

    // Ranger: Napalm (Fire AOE)
    'rr_a1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(600, '#ea580c', 'ROCK', 'FX_HIT_RED_MAGMA', '#ea580c');
        seq.shake(0.3, 400); // Shake on impact
    },

    // Support: Life Transfer (Red Active)
    'sr_a1': (ctx) => {
        if(ctx.sourcePos) {
             const seq = new UltSequencer(ctx);
             // Drain beam from Source to Target
             seq.beam('BEAM_RED_DRAIN', ctx.sourcePos, ctx.target, '#be123c', 0.8);
             
             // Blood loss at source
             seq.effect('FX_HIT_RED_BLOOD', ctx.sourcePos, '#be123c', 0); 
             // Healing glow at target
             seq.effect('FX_STATUS_REGEN_LOOP', ctx.target, '#be123c', 200); 
        }
    }
};
