import { VFXStateManager, Particle } from "./state";
import { GameEngine } from "../../game";
import { VFX_BUDGET } from "../../../constants";
import type { WeatherAmbienceConfig } from "../../../types";
import { getWeatherAmbience, WEATHER_BOUNDS, WEATHER_PART_ANIM, BIOME_ATMOSPHERE } from "../../../data/vfx/terrainAmbience";
import { getQualityTier } from "../../renderers/RenderQuality";
import { vfxPartStore } from "../../renderers/vfxparts/VFXPartStore";
import { HexUtils } from "../../utils";

/**
 * 天氣（地圖氛圍）粒子生成。所有參數在 data/vfx/terrainAmbience.ts；品質階層與上限在此套用。
 * 粒子是零件（PART，PartPainter 繪製），以 Particle.weather（層編號，1＝場景天氣，2 起＝地圖氛圍層 BIOME_ATMOSPHERE）標記。
 */
export class VFXAmbience {
    private timers: number[] = [];
    /** 地圖格子範圍（ISLAND 生成用）；mapVersion 變了才重算 */
    private island = { version: -1, x0: 0, y0: 0, x1: 0, y1: 0 };

    private static countLayer(particles: readonly Particle[], layer: number): number {
        let n = 0;
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].weather === layer) n++;
        }
        return n;
    }

    public update(dt: number, type: string, state: VFXStateManager, engine?: GameEngine) {
        const weather = getWeatherAmbience(type);
        if (weather) this.updateLayer(1, weather, dt, state, engine);
        const biome = engine?.currentScene?.id as keyof typeof BIOME_ATMOSPHERE | undefined;
        const layers = biome ? BIOME_ATMOSPHERE[biome] : undefined;
        if (layers) for (let i = 0; i < layers.length; i++) this.updateLayer(i + 2, layers[i], dt, state, engine);
    }

    private updateLayer(layer: number, cfg: WeatherAmbienceConfig, dt: number, state: VFXStateManager, engine?: GameEngine) {
        // 品質階層：與其他非關鍵特效一致，低階層降低發射率與同時存在上限
        const ratio = VFX_BUDGET.enabled ? VFX_BUDGET.TIER_EMISSION_RATIOS[getQualityTier()] : 1;

        this.timers[layer] = (this.timers[layer] ?? 0) + dt;
        if (this.timers[layer] <= cfg.interval / ratio) return;
        this.timers[layer] = 0;

        if (VFXAmbience.countLayer(state.particles, layer) >= Math.floor(cfg.maxActive * ratio)) return;

        const b = WEATHER_BOUNDS;
        let boundsW = b.fallbackW;
        let boundsH = b.fallbackH;
        if (engine) {
            const mapCfg = engine.mapConfig;
            boundsW = mapCfg.w * b.pxPerTile + b.padding;
            boundsH = mapCfg.h * b.pxPerTile + b.padding;
        }

        const p = state.getParticle();
        p.type = 'PART';
        p.weather = layer;
        if (cfg.spawn === 'ISLAND' && engine) {
            const isl = this.islandBounds(engine);
            p.x = isl.x0 + Math.random() * (isl.x1 - isl.x0);
            p.y = isl.y0 + Math.random() * (isl.y1 - isl.y0);
        } else {
            p.x = cfg.spawn === 'LEFT_EDGE' ? b.offsetX : Math.random() * boundsW + b.offsetX;
            p.y = Math.random() * boundsH + b.offsetY;
        }
        p.z = cfg.z ? cfg.z.min + Math.random() * cfg.z.spread : Math.random() * b.zSpread + b.zMin;
        const spec = cfg.parts.length > 1 && Math.random() >= cfg.primaryChance ? cfg.parts[1] : cfg.parts[0];
        p.part = vfxPartStore.get(spec);
        p.partAnim = cfg.anim ?? WEATHER_PART_ANIM;
        p.size = cfg.size.min + Math.random() * cfg.size.spread;
        p.fxScale = p.size / cfg.partRadius;
        p.vx = cfg.vx.min + Math.random() * cfg.vx.spread;
        p.vy = cfg.vy.min + Math.random() * cfg.vy.spread;
        if (cfg.vz) p.vz = cfg.vz.min + Math.random() * cfg.vz.spread;
        p.rotation = cfg.alignToVelocity ? Math.atan2(p.vy, p.vx) : (cfg.rotation ?? 0);
        const life = cfg.life ?? boundsW / p.vx;
        p.life = life;
        p.maxLife = life;
        p.blendMode = cfg.blendMode;

        state.particles.push(p);
    }

    /** 地圖格子的世界座標範圍：四個角的格心 */
    private islandBounds(engine: GameEngine) {
        const isl = this.island;
        const version = engine.mapVersion ?? 0;
        if (isl.version === version) return isl;
        const cfg = engine.mapConfig;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [c, r] of [[0, 0], [cfg.w - 1, 0], [0, cfg.h - 1], [cfg.w - 1, cfg.h - 1]]) {
            const h = HexUtils.offsetToAxial(c, r, cfg);
            const p = HexUtils.toPx(h.q, h.r, cfg);
            x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        }
        isl.version = version; isl.x0 = x0; isl.y0 = y0; isl.x1 = x1; isl.y1 = y1;
        return isl;
    }
}
