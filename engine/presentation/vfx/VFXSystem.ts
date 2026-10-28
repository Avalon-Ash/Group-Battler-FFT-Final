// ╔══════════════════════════════════════════════════════════╗
// ║  VFXSystem — 特效系統 Orchestrator                      ║
// ║  職責：EventBus 訂閱 / 主更新循環 / 子系統串接          ║
// ╚══════════════════════════════════════════════════════════╝

import { VFXStateManager } from "./state";
import { VFXPlayer } from "./VFXPlayer";
import { VFXPhysics, SpatialInfo } from "./VFXPhysics";
import { VFXAmbience } from "./VFXAmbience";
import { AgentVFXSystem } from "./AgentVFXSystem";
import { Point3D } from "../../math/VisualMath";
import { GameEngine } from "../../game";
import { HexMath } from "../../math/HexMath";
import { HEX_SIZE, ISO_SCALE_Y, DEFAULT_HEX_LAYOUT, VFX_RUNTIME } from "../../../constants";
import type { HexLayout } from "../../../types";
import type { Team } from "../../types/Enums";
import { BEAM_STYLES, FACTION_BEAM_RAMP_ID, NEUTRAL_BEAM_RAMP_ID, type BeamStyleId } from "../../../data/vfx/beam_styles";
import { VFX_RAMPS } from "../../../data/vfx/parts/vfxPalette";
import { VFX_PARTS } from "../../../data/vfx/parts/partConfig";
import { vfxPartStore } from "../../renderers/vfxparts/VFXPartStore";
import { ultFeelStore } from "./UltFeelStore";

export class VFXSystem {
    public state: VFXStateManager = new VFXStateManager();
    private ambience: VFXAmbience = new VFXAmbience();
    public agentVFX: AgentVFXSystem = new AgentVFXSystem();
    private boundEngine: GameEngine | null = null;
    private collapsedHexKeys: Set<string> = new Set();
    
    public reset() { 
        this.state.reset(); 
        this.collapsedHexKeys.clear();
        ultFeelStore.reset();
    }

    /** 目前地圖的六角版面（生成貼地零件時決定是否需要正向圖騰版本）；未綁定引擎時為預設版面。 */
    public get hexLayout(): HexLayout {
        return this.boundEngine?.mapConfig.layout ?? DEFAULT_HEX_LAYOUT;
    }

    public bind(engine: GameEngine) {
        this.boundEngine = engine;
        engine.bus.on('TILE_COLLAPSED', this.handleTileCollapsed);
    }

    public unbind() {
        if (this.boundEngine) {
            this.boundEngine.bus.off('TILE_COLLAPSED', this.handleTileCollapsed);
            this.boundEngine = null;
        }
    }

    private handleTileCollapsed = (data: { q: number, r: number, worldX?: number, worldY?: number }) => {
        if (!this.boundEngine) return;

        // Use pre-calculated world coordinates if available, otherwise fallback
        let targetX: number;
        let targetRawY: number;

        if (data.worldX !== undefined && data.worldY !== undefined) {
            targetX = data.worldX;
            targetRawY = data.worldY;
        } else {
            const config = this.boundEngine.mapConfig;
            const pos = HexMath.hexToPixel(data.q, data.r, config.offsetX, config.offsetY, config.layout);
            targetX = pos.x;
            targetRawY = pos.y / ISO_SCALE_Y;
        }
        
        // [FIX] 根據常數 HEX_SIZE (48) 確定清除半徑。
        // 使用 1.25 倍半徑確保覆蓋邊角 (48 * 1.25 = 60)，HEX_SIZE^2 = 2304, 60^2 = 3600
        const HEX_R = HEX_SIZE * VFX_RUNTIME.COLLAPSE_RADIUS_MULT;
        const rSq = HEX_R * HEX_R;
        
        // 1. Kill Particles (Simulation space)
        const particles = this.state.particles;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            // [ARCH] BEAM 類不納入清除範圍，其餘 (含 locked Pillars) 若在區域內則清除
            if (p.locked && p.lockReason === 'BEAM') continue; 
            
            const dx = p.x - targetX;
            const dy = p.y - targetRawY;
            
            // 優先檢查 hexKey 匹配，其次檢查 2D 圓形區域
            const hexMatch = p.hexKey && p.hexKey === `${data.q},${data.r}`;
            if (hexMatch || (dx*dx + dy*dy < rSq)) {
                p.life = -1; // 標記為死亡，下個 update 迴圈回收
            }
        }

        // 2. Mark for same-frame/next-frame blacklist
        this.collapsedHexKeys.add(`${data.q},${data.r}`);
    };
    
    public playEffect(effectId: string, x: number, y: number, z: number, colorOverride?: string, groundZ?: number, ownerId?: string, hexKey?: string, scale: number = 1) {
        VFXPlayer.play(this, effectId, x, y, z, colorOverride, groundZ, ownerId, hexKey, scale);
    }
    
    public playBeam(styleId: string, start: Point3D, end: Point3D, colorOverride?: string, duration: number = VFX_RUNTIME.BEAM_DURATION, scale: number = 1, team?: Team) {
        const p = this.state.getParticle();
        const style = BEAM_STYLES[styleId as BeamStyleId] ?? BEAM_STYLES.GENERIC_BEAM;
        p.size = style.width * scale;
        p.sx = start.x; p.sy = start.y; p.sz = start.z;
        p.tx = end.x; p.ty = end.y; p.tz = end.z;
        // p.y 是粒子的「未投影 Y」（螢幕 Y / ISO_SCALE_Y，VFXRenderer 提交時乘回，RenderSpec §3）；
        // sx/sy/tx/ty 留螢幕座標給 PartPainter.drawBeam。曾直接存螢幕 Y，光束整條畫在 0.5 倍 Y 的位置。
        p.x = start.x; p.y = start.y / ISO_SCALE_Y; p.z = start.z;
        p.life = duration; p.maxLife = duration; 
        // 光束零件：烘焙一段可平鋪的光管磚，PartPainter.drawBeam 沿起點→終點鋪滿（docs/VFX_PIPELINE_MAP.md §5-3）。
        // 色階取施法者陣營；沒有陣營的後備光束用中性色階（零件不吃 colorOverride）。種子只給鋸齒（閃電）挑折線變體。
        const rampId = team !== undefined ? (style.teamRamp?.[team] ?? FACTION_BEAM_RAMP_ID[team]) : NEUTRAL_BEAM_RAMP_ID;
        const ramp = VFX_RAMPS[rampId];
        p.color = colorOverride || ramp.main;
        p.beamEnd = vfxPartStore.get({ kind: 'glow', radius: p.size * VFX_PARTS.BEAM.END_GLOW_RATIO, ramp: rampId, hard: true });
        p.part = vfxPartStore.get({ kind: 'beam', width: p.size, ramp: rampId, edge: style.edge, seed: Math.floor(Math.abs(start.x * VFX_RUNTIME.BEAM_SEED_START + end.x * VFX_RUNTIME.BEAM_SEED_END)) });
        p.type = 'BEAM'; p.style = styleId; p.locked = true; p.lockReason = 'BEAM';
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
        // [RACE CONDITION GUARD] Clear newly spawned particles on collapsed tiles
        if (this.collapsedHexKeys.size > 0) {
            for (const p of this.state.particles) {
                if (p.life >= p.maxLife * VFX_RUNTIME.COLLAPSE_FRESH_LIFE && p.hexKey && this.collapsedHexKeys.has(p.hexKey)) {
                    p.life = -1;
                }
            }
            // [ARCH] 用完立即清，避免 ZoneSystem/VFX 執行順序改變時 guard 失效
            this.collapsedHexKeys.clear();
        }

        const particles = this.state.particles;
        let count = particles.length;
        
        // Optimization: Pre-cache agents for owner lookup
        const agentMap = engine ? new Map(engine.agents.map(a => [a.id, a])) : null;

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

            if (p.ownerId && agentMap) {
                const owner = agentMap.get(p.ownerId);
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
        
        // Pass engine for dynamic map bounds
        this.ambience.update(dt, ambientType, this.state, engine);

        // Update Agent-based Continuous VFX (Dust, Status)
        if (engine) {
            this.agentVFX.update(dt, engine, this);
        }
    }
}
