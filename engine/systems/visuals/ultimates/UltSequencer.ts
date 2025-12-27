
import { UltContext, Point3D } from "./UltTypes";
import { THEME_IMPERIAL, THEME_COVENANT } from "../../../../constants";

export class UltSequencer {
    private ctx: UltContext;

    constructor(ctx: UltContext) {
        this.ctx = ctx;
    }

    public get target(): Point3D { return this.ctx.target; }
    public get source(): Point3D | undefined { return this.ctx.sourcePos; }

    // --- TIMING ---
    public wait(ms: number, fn: () => void) {
        setTimeout(() => {
            // Safety check: Don't play if game stopped? 
            // For visuals, we usually let them finish, but could check engine state.
            fn();
        }, ms);
    }

    // --- CAMERA ---
    public shake(amount: number, delay: number = 0) {
        this.wait(delay, () => {
            this.ctx.camera.addTrauma(amount);
        });
    }

    // --- VFX SPAWNERS ---
    public effect(id: string, pos: Point3D, color?: string, delay: number = 0) {
        this.wait(delay, () => {
            this.ctx.vfx.playEffect(id, pos.x, pos.y, pos.z, color);
        });
    }

    public beam(style: string, start: Point3D, end: Point3D, color: string, duration: number = 0.5, delay: number = 0) {
        this.wait(delay, () => {
            this.ctx.vfx.playBeam(style, start, end, color, duration);
        });
    }

    public gridImpact(teamColor: string, delay: number = 0) {
        const id = teamColor === THEME_IMPERIAL.primary ? 'FX_GRID_IMPACT_BLUE' : 'FX_GRID_IMPACT_RED';
        this.effect(id, this.target, teamColor, delay);
    }

    public heavenFall(height: number, color: string, style: 'GIANT_HEX' | 'ROCK' | 'METEOR', impactVfx: string, impactColor: string) {
        // 1. Projectile falls
        const p = this.ctx.vfx.state.getParticle();
        p.x = this.target.x;
        p.y = this.target.y;
        p.z = this.target.z + height;
        p.color = color;
        p.size = 120;
        
        const speed = 2500; // pixels per sec
        const duration = height / speed;
        
        p.vz = -speed;
        p.life = duration;
        p.maxLife = duration;
        p.type = style === 'METEOR' ? 'ROCK' : style as any;
        p.vRotation = 5;
        
        this.ctx.vfx.state.particles.push(p);

        // 2. Impact
        this.wait(duration * 1000, () => {
            this.ctx.vfx.playEffect(impactVfx, this.target.x, this.target.y, this.target.z, impactColor);
            this.ctx.camera.addTrauma(0.4);
        });
    }
}
