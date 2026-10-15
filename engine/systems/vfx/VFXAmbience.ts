import { VFXStateManager, Particle } from "./state";
import { GameEngine } from "../../game";
import { VFX_BUDGET } from "../../../constants";
import { getWeatherAmbience, WEATHER_BOUNDS } from "../../../data/vfx/terrainAmbience";
import { getQualityTier } from "../../renderers/RenderQuality";

/** 天氣（地圖氛圍）粒子生成。所有參數在 data/vfx/terrainAmbience.ts；品質階層與上限在此套用。 */
export class VFXAmbience {
    private timer: number = 0;

    private static countAtmosphere(particles: readonly Particle[]): number {
        let n = 0;
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type === 'ATMOSPHERE') n++;
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

        if (VFXAmbience.countAtmosphere(state.particles) >= Math.floor(cfg.maxActive * ratio)) return;

        const b = WEATHER_BOUNDS;
        let boundsW = b.fallbackW;
        let boundsH = b.fallbackH;
        if (engine) {
            const mapCfg = engine.mapConfig;
            boundsW = mapCfg.w * b.pxPerTile + b.padding;
            boundsH = mapCfg.h * b.pxPerTile + b.padding;
        }

        const p = state.getParticle();
        p.type = 'ATMOSPHERE';
        p.x = cfg.spawn === 'LEFT_EDGE' ? b.offsetX : Math.random() * boundsW + b.offsetX;
        p.y = Math.random() * boundsH + b.offsetY;
        p.z = Math.random() * b.zSpread + b.zMin;
        p.color = cfg.colors.length > 1 && Math.random() >= cfg.primaryChance ? cfg.colors[1] : cfg.colors[0];
        p.size = cfg.size.min + Math.random() * cfg.size.spread;
        p.vx = cfg.vx.min + Math.random() * cfg.vx.spread;
        p.vy = cfg.vy.min + Math.random() * cfg.vy.spread;
        const life = cfg.life ?? boundsW / p.vx;
        p.life = life;
        p.maxLife = life;
        p.blendMode = cfg.blendMode;

        state.particles.push(p);
    }
}
