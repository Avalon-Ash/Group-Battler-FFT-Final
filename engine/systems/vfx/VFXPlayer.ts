
// ╔══════════════════════════════════════════════════════════╗
// ║  VFXPlayer — 特效配方播放器                              ║
// ║  職責：依 effectId 查表，產生對應 Particle 批次          ║
// ║  [ARCH] hexKey 在此寫入 particle，供 TILE_COLLAPSED 清除 ║
// ║  上游：VFXSystem.playEffect() / HazardSystem / combat    ║
// ╚══════════════════════════════════════════════════════════╝

import { VFXSystem } from "../vfx";
import { VFX_REGISTRY } from "../../../data/vfx/VFXRegistry";
import { EmitterConfig, Range } from "../../../types/VFXSchema";
import { VFXFactory } from "../../graphics/VFXFactory";
import { ISO_SCALE_Y, VFX_GROUND_TYPES, VFX_PARAM } from "../../../constants";

const rnd = (r: Range | number | undefined): number => {
    if (r === undefined) return 0;
    if (typeof r === 'number') return r;
    return r[0] + Math.random() * (r[1] - r[0]);
};
const pickColor = (colors: string[]): string => {
    if (!colors || colors.length === 0) return '#ffffff';
    return colors[Math.floor(Math.random() * colors.length)];
};

const FIXED_ORIENTATION_PARTICLES = new Set([
    'GRID_FIELD', 'PILLAR', 'DOMAIN', 'HEX_BEAM', 'GIANT_HEX', 'BLACK_HOLE'
]);
const PROCEDURAL_TYPES = new Set([
    'PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE', 
    'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'BLACK_HOLE', 'GIANT_HEX'
]);
export class VFXPlayer {
    public static play(system: VFXSystem, effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number, ownerId?: string, hexKey?: string) {
        const asset = VFX_REGISTRY[effectId];
        if (!asset) return;
        for (const emitter of asset.emitters) {
            this.processEmitter(system, emitter, x, y, z, colorOverride, groundZ, ownerId, hexKey);
        }
    }
    private static processEmitter(system: VFXSystem, config: EmitterConfig, cx: number, cy: number, cz: number, colorOverride?: string, groundZ?: number, ownerId?: string, hexKey?: string) {
        // ── [PERF] 全域粒子上限 guard ────────────────────────────────────
        if (system.state.particles.length >= VFX_PARAM.MAX_PARTICLES) return;

        // ── [PERF] Hazard Field locked 粒子：每格上限 HAZARD_FIELD_MAX_PER_CELL ──
        if (config.locked && config.lockReason === 'HAZARD_FIELD' && hexKey) {
            const existing = system.state.particles.filter(
                p => p.locked && p.lockReason === 'HAZARD_FIELD' && p.hexKey === hexKey
            ).length;
            if (existing >= VFX_PARAM.HAZARD_FIELD_MAX_PER_CELL) return;
        }

        const count = Math.floor(rnd(config.count));
        const isGroundType = VFX_GROUND_TYPES.has(config.particleType);
        const effectiveZ = (isGroundType && groundZ !== undefined) ? groundZ : cz;

        // [SSOT] Unscale incoming isometric Y to raw 3D Y for pure physics simulation
        const rawCY = cy / ISO_SCALE_Y;
        const rawGroundZ = groundZ !== undefined ? groundZ / ISO_SCALE_Y : undefined; 

        for (let i = 0; i < count; i++) {
            const p = system.state.getParticle();
            p.ownerId = ownerId;
            p.hexKey = hexKey;
            let vx = 0, vy = 0, vz = 0;
            let px = cx, py = rawCY, pz = effectiveZ;
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
            else if (config.shape === 'RING') {
                const theta = (i / count) * Math.PI * 2; // 均勻分布
                const r = config.shapeRadius || 10;
                px += Math.cos(theta) * r;
                py += Math.sin(theta) * r;
                vx = Math.cos(theta) * speed;
                vy = Math.sin(theta) * speed;
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
            p.type = config.particleType;
            if (config.visualStyle) {
                p.style = config.visualStyle;
                p.visualStyle = config.visualStyle; // Ensure visualStyle is also set
            }
            if (config.drag !== undefined) p.drag = config.drag;
            if (config.locked) p.locked = true;
            if (config.lockReason) p.lockReason = config.lockReason;
            if (config.gravity !== undefined) p.gravity = config.gravity;
            if (config.vRotation) {
                p.vRotation = rnd(config.vRotation);
            } else {
                p.vRotation = FIXED_ORIENTATION_PARTICLES.has(config.particleType) ? 0 : (Math.random() - 0.5) * 10;
            }
            if (config.blendMode) p.blendMode = config.blendMode;
            if (!p.image && !PROCEDURAL_TYPES.has(p.type)) {
                p.image = VFXFactory.getTexture(p.type, p.color);
            }
            system.state.particles.push(p);
        }
    }
}
