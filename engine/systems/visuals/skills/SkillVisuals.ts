
import { UltScriptFn } from "../ultimates/UltTypes";
import { UltSequencer } from "../ultimates/UltSequencer";

// Reusing UltScriptFn type as the signature is identical (Context -> Void)
// Using UltSequencer as "VisualSequencer"

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

    // Ranger: Napalm (Fire AOE)
    'rr_a1': (ctx) => {
        const seq = new UltSequencer(ctx);
        seq.heavenFall(600, '#ea580c', 'ROCK', 'FX_HIT_RED_MAGMA', '#ea580c');
        seq.shake(0.3, 400); // Shake on impact
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
    }
};
