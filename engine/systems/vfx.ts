
import { VFXStateManager } from "./vfx/state";
import { VFXPlayer } from "./vfx/VFXPlayer";
import { VFXPhysics, SpatialInfo } from "./vfx/VFXPhysics";
import { VFXAmbience } from "./vfx/VFXAmbience";
import { AgentVFXSystem } from "./vfx/AgentVFXSystem";
import { Point3D } from "../math/VisualMath";
import { GameEngine } from "../game";
import { HexMath } from "../math/HexMath";
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

export class VFXSystem {
    public state: VFXStateManager = new VFXStateManager();
    private ambience: VFXAmbience = new VFXAmbience();
    public agentVFX: AgentVFXSystem = new AgentVFXSystem();
    private boundEngine: GameEngine | null = null;
    
    public reset() { this.state.reset(); }

    public bind(engine: GameEngine) {
        this.boundEngine = engine;
        engine.bus.on('TILE_COLLAPSED', this.handleTileCollapsed);
    }

    public unbind(engine: GameEngine) {
        if (this.boundEngine) {
            this.boundEngine.bus.off('TILE_COLLAPSED', this.handleTileCollapsed);
        }
        this.boundEngine = null;
    }

    private handleTileCollapsed = (data: { q: number, r: number }) => {
        if (!this.boundEngine) return;

        // SSOT: Calculate raw world center vs projected screen center
        const config = this.boundEngine.mapConfig;
        const pos = HexMath.hexToPixel(data.q, data.r, config.offsetX, config.offsetY, config.layout);
        const targetX = pos.x;
        const targetRawY = pos.y / ISO_SCALE_Y;
        
        const HEX_R = HEX_SIZE * 1.2; // Raw space radius
        const rSq = HEX_R * HEX_R;
        const HEX_R_PROJ_Y = HEX_R * ISO_SCALE_Y; // Radius in projected Y (usually half)
        
        // 1. Kill Particles (Simulation space)
        const particles = this.state.particles;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (p.locked) continue; // Skip persistent bridge/structure effects
            
            const dx = p.x - targetX;
            const dy = p.y - targetRawY;
            if (dx*dx + dy*dy < rSq) {
                p.life = -1; 
            }
        }

        // 2. Clear Decals (Projected screen space)
        this.state.decals = this.state.decals.filter(d => {
            const dx = d.x - targetX;
            const dy = d.y - pos.y;
            // Elliptical check to match raw circle cleanup area
            const nx = dx / HEX_R;
            const ny = dy / HEX_R_PROJ_Y;
            return (nx * nx + ny * ny) >= 1.0;
        });
    };
    
    public playEffect(effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number, ownerId?: string) {
        VFXPlayer.play(this, effectId, x, y, z, colorOverride, groundZ, ownerId);
    }
    
    public playBeam(styleId: string, start: Point3D, end: Point3D, colorOverride?: string, duration: number = 0.4) {
        const p = this.state.getParticle();
        p.sx = start.x; p.sy = start.y; p.sz = start.z;
        p.tx = end.x; p.ty = end.y; p.tz = end.z;
        p.x = start.x; p.y = start.y; p.z = start.z;
        p.life = duration; p.maxLife = duration; 
        p.color = colorOverride || '#fff'; 
        p.type = 'BEAM'; p.style = styleId; p.locked = true;
        this.state.particles.push(p);
    }

    /**
     * SSOT Update:
     * @param dt - Scaled Simulation Delta Time (0 if paused)
     * @param battleTime - Current Battle Time (for procedural shaders)
     * @param engine - Reference to game engine for reading Agent state
     */
    update(
        dt: number, 
        battleTime: number, 
        ambientType: string, 
        getSpatialInfo: (x: number, y: number) => SpatialInfo,
        engine?: GameEngine 
    ) {
        const particles = this.state.particles;
        let count = particles.length;
        
        for (let i = count - 1; i >= 0; i--) {
            const p = particles[i];
            
            // Apply Time Dilation to Delays
            if (p.delay && p.delay > 0) { 
                p.delay -= dt; 
                continue; 
            }
            
            p.life -= dt;
            
            if (p.life <= 0) {
                this.state.releaseParticle(p);
                particles[i] = particles[count - 1];
                particles.pop(); count--; continue;
            }
            
            if (p.locked) { 
                p.rotation += p.vRotation * dt; 
                continue; 
            }

            if (p.ownerId) {
                const owner = engine?.agents.find(a => a.id === p.ownerId);
                if (!owner || owner.hp <= 0) {
                    p.life = -1;
                }
            }
            
            if (p.killAtTarget !== undefined && p.targetX !== undefined && p.targetY !== undefined) {
                const dx = p.x - p.targetX, dy = p.y - p.targetY;
                if (dx*dx + dy*dy < p.killAtTarget) p.life = 0; 
            }
            
            VFXPhysics.update(p, dt, getSpatialInfo);
        }
        
        // Decals also respect time scale
        for (let i = this.state.decals.length - 1; i >= 0; i--) {
            this.state.decals[i].life -= dt * 0.5;
            if (this.state.decals[i].life <= 0) this.state.decals.splice(i, 1);
        }
        
        // Pass engine for dynamic map bounds
        this.ambience.update(dt, ambientType, this.state, engine);

        // Update Agent-based Continuous VFX (Dust, Status)
        if (engine) {
            this.agentVFX.update(dt, engine, this);
        }
    }
}
