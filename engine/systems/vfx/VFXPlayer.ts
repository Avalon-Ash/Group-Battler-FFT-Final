
import { VFXSystem } from "../vfx";
import { VFX_REGISTRY } from "../../../data/vfx/VFXRegistry";
import { EmitterConfig, Range } from "../../../types/VFXSchema";
import { VFXFactory } from "../../graphics/VFXFactory";

// Helper: Get random number from Range [min, max] or number
const rnd = (r: Range | number): number => {
    if (typeof r === 'number') return r;
    return r[0] + Math.random() * (r[1] - r[0]);
};

// Helper: Pick random color
const pickColor = (colors: string[]): string => {
    if (!colors || colors.length === 0) return '#ffffff';
    return colors[Math.floor(Math.random() * colors.length)];
};

// List of particles that MUST snap to ground Z
const GROUND_PARTICLES = new Set([
    'SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'MAGIC_CIRCLE', 
    'HEX_GLOW', 'PILLAR', 'DOMAIN'
]);

export class VFXPlayer {

    public static play(system: VFXSystem, effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number) {
        const asset = VFX_REGISTRY[effectId];
        
        if (!asset) {
            return;
        }

        for (const emitter of asset.emitters) {
            this.processEmitter(system, emitter, x, y, z, colorOverride, groundZ);
        }
    }

    private static processEmitter(system: VFXSystem, config: EmitterConfig, cx: number, cy: number, cz: number, colorOverride?: string, groundZ?: number) {
        const count = Math.floor(rnd(config.count));
        
        // Determine effective Z for this emitter
        // If the particle type is a ground effect and we know where the ground is, snap it.
        // Otherwise use the target Z (which might be body height).
        const isGroundType = GROUND_PARTICLES.has(config.particleType);
        const effectiveZ = (isGroundType && groundZ !== undefined) ? groundZ : cz;

        for (let i = 0; i < count; i++) {
            const p = system.state.getParticle();
            
            // 1. Position & Velocity Calculation based on Shape
            let vx = 0, vy = 0, vz = 0;
            let px = cx, py = cy, pz = effectiveZ;
            const speed = rnd(config.speed);

            if (config.shape === 'POINT') {
                // No offset
            } 
            else if (config.shape === 'BURST_DIR') {
                // Omnidirectional Sphere Burst
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.random() - 0.5) * Math.PI; 
                const cosPhi = Math.cos(phi);
                
                vx = Math.cos(theta) * cosPhi * speed;
                vy = Math.sin(theta) * cosPhi * speed;
                vz = Math.sin(phi) * speed + (speed * 0.5); // Bias upwards slightly
            }
            else if (config.shape === 'CIRCLE') {
                // Flat ring burst
                const angle = Math.random() * Math.PI * 2;
                const r = config.shapeRadius || 10;
                px += Math.cos(angle) * r;
                py += Math.sin(angle) * r;
                
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
            }

            // 2. Properties
            p.x = px; p.y = py; p.z = pz;
            p.vx = vx; p.vy = vy; p.vz = vz;
            
            p.life = rnd(config.lifetime); 
            p.maxLife = p.life;
            p.delay = rnd(config.delay);
            
            p.size = rnd(config.size);
            if (config.height !== undefined) p.height = rnd(config.height);
            
            // Color priority: Override > Config
            p.color = colorOverride || pickColor(config.colors);
            
            // Type Casting (Ensure string matches Particle internal type)
            p.type = config.particleType as any;
            
            // Apply Visual Style if defined
            if (config.visualStyle) p.style = config.visualStyle;
            
            // Optional Physics Overrides
            if (config.drag !== undefined) p.drag = config.drag;
            if (config.locked) p.locked = true;
            if (config.vRotation) p.vRotation = rnd(config.vRotation);
            else p.vRotation = (Math.random() - 0.5) * 10; // Default gentle rotation

            if (config.blendMode) p.blendMode = config.blendMode;

            // --- CRITICAL FIX: HYDRATE TEXTURE ---
            // Force load the high-quality Hexagon texture immediately.
            if (!p.image && !['PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN'].includes(p.type)) {
                // We cast p.type to any because the Factory accepts specific string literals
                p.image = VFXFactory.getTexture(p.type as any, p.color);
            }

            // Push to System
            system.state.particles.push(p);
        }
    }
}
