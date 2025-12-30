
import { VFXSystem } from "../vfx";
import { VFX_REGISTRY } from "../../../data/vfx/VFXRegistry";
import { EmitterConfig, Range } from "../../../types/VFXSchema";
import { VFXFactory } from "../../graphics/VFXFactory";
const rnd = (r: Range | number): number => {
    if (typeof r === 'number') return r;
    return r[0] + Math.random() * (r[1] - r[0]);
};
const pickColor = (colors: string[]): string => {
    if (!colors || colors.length === 0) return '#ffffff';
    return colors[Math.floor(Math.random() * colors.length)];
};
const GROUND_PARTICLES = new Set([
    'SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'MAGIC_CIRCLE', 
    'HEX_GLOW', 'PILLAR', 'DOMAIN', 'BLACK_HOLE'
]);
const FIXED_ORIENTATION_PARTICLES = new Set([
    'GRID_FIELD', 'PILLAR', 'DOMAIN', 'HEX_BEAM', 'GIANT_HEX', 'BLACK_HOLE'
]);
const PROCEDURAL_TYPES = new Set([
    'PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE', 
    'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'BLACK_HOLE'
]);
export class VFXPlayer {
    public static play(system: VFXSystem, effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number) {
        const asset = VFX_REGISTRY[effectId];
        if (!asset) return;
        for (const emitter of asset.emitters) {
            this.processEmitter(system, emitter, x, y, z, colorOverride, groundZ);
        }
    }
    private static processEmitter(system: VFXSystem, config: EmitterConfig, cx: number, cy: number, cz: number, colorOverride?: string, groundZ?: number) {
        const count = Math.floor(rnd(config.count));
        const isGroundType = GROUND_PARTICLES.has(config.particleType);
        const effectiveZ = (isGroundType && groundZ !== undefined) ? groundZ : cz;
        for (let i = 0; i < count; i++) {
            const p = system.state.getParticle();
            let vx = 0, vy = 0, vz = 0;
            let px = cx, py = cy, pz = effectiveZ;
            const speed = rnd(config.speed);
            if (config.shape === 'POINT') {} 
            else if (config.shape === 'BURST_DIR') {
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.random() - 0.5) * Math.PI; 
                const cosPhi = Math.cos(phi);
                vx = Math.cos(theta) * cosPhi * speed;
                vy = Math.sin(theta) * cosPhi * speed;
                vz = Math.sin(phi) * speed + (speed * 0.5); 
            }
            else if (config.shape === 'CIRCLE') {
                const angle = Math.random() * Math.PI * 2;
                const r = config.shapeRadius || 10;
                px += Math.cos(angle) * r;
                py += Math.sin(angle) * r;
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
            }
            if (config.vz !== undefined) {
                vz = rnd(config.vz);
            }
            p.x = px; p.y = py; p.z = pz;
            p.vx = vx; p.vy = vy; p.vz = vz;
            p.life = rnd(config.lifetime); 
            p.maxLife = p.life;
            p.delay = rnd(config.delay);
            p.size = rnd(config.size);
            if (config.height !== undefined) p.height = rnd(config.height);
            p.color = colorOverride || pickColor(config.colors);
            p.type = config.particleType as any;
            if (config.visualStyle) p.style = config.visualStyle;
            if (config.drag !== undefined) p.drag = config.drag;
            if (config.locked) p.locked = true;
            if (config.gravity !== undefined) p.gravity = config.gravity;
            if (config.vRotation) {
                p.vRotation = rnd(config.vRotation);
            } else {
                p.vRotation = FIXED_ORIENTATION_PARTICLES.has(config.particleType) ? 0 : (Math.random() - 0.5) * 10;
            }
            if (config.blendMode) p.blendMode = config.blendMode;
            if (!p.image && !PROCEDURAL_TYPES.has(p.type)) {
                p.image = VFXFactory.getTexture(p.type as any, p.color);
            }
            system.state.particles.push(p);
        }
    }
}
