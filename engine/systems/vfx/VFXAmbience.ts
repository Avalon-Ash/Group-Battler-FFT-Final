import { VFXStateManager, Particle } from "./state";
import { GameEngine } from "../../game";
import { VFX_BUDGET } from "../../../constants";
import { getWeatherAmbience, WEATHER_BOUNDS, WEATHER_PART_ANIM } from "../../../data/vfx/terrainAmbience";
import { getQualityTier } from "../../renderers/RenderQuality";
import { vfxPartStore } from "../../renderers/vfxparts/VFXPartStore";

/**
 * 天氣（地圖氛圍）粒子生成。所有參數在 data/vfx/terrainAmbience.ts；品質階層與上限在此套用。
 * 粒子是零件（PART，PartPainter 繪製），以 Particle.weather 標記。
 */
export class VFXAmbience {
    private timer: number = 0;

    private static countWeather(particles: readonly Particle[]): number {
        let n = 0;
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].weather) n++;
        }
        return n;
    }

    public update(dt: number, type: string, state: VFXStateManager, engine?: GameEngine) {
        const cfg = getWeatherAmbience(type);
        if (!cfg) return;

        // 品質階層：與其他非關鍵特效一致，低階層降低發射率與同時存在上限
        const ratio = VFX_BUDGET.enabled ? VFX_BUDGET.TIER_EMISSION_RATIOS[getQualityTier()] : 1;

        this.timer += dt;
        if (this.timer <= cfg.interval / ratio) return;
        this.timer = 0;

        if (VFXAmbience.countWeather(state.particles) >= Math.floor(cfg.maxActive * ratio)) return;

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
        p.weather = true;
        p.x = cfg.spawn === 'LEFT_EDGE' ? b.offsetX : Math.random() * boundsW + b.offsetX;
        p.y = Math.random() * boundsH + b.offsetY;
        p.z = Math.random() * b.zSpread + b.zMin;
        const spec = cfg.parts.length > 1 && Math.random() >= cfg.primaryChance ? cfg.parts[1] : cfg.parts[0];
        p.part = vfxPartStore.get(spec);
        p.partAnim = WEATHER_PART_ANIM;
        p.size = cfg.size.min + Math.random() * cfg.size.spread;
        p.fxScale = p.size / cfg.partRadius;
        p.vx = cfg.vx.min + Math.random() * cfg.vx.spread;
        p.vy = cfg.vy.min + Math.random() * cfg.vy.spread;
        p.rotation = cfg.alignToVelocity ? Math.atan2(p.vy, p.vx) : 0;
        const life = cfg.life ?? boundsW / p.vx;
        p.life = life;
        p.maxLife = life;
        p.blendMode = cfg.blendMode;

        state.particles.push(p);
    }
}
