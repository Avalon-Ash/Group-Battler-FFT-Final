
import { VFXSystem } from "../../vfx";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { Agent } from "../../../core/Agent";
import { VFX_BUDGET, DEATH_VFX } from "../../../../constants";
import { getQualityTier } from "../../../renderers/RenderQuality";
import { vfxPartStore } from "../../../renderers/vfxparts/VFXPartStore";
import { DEATH_PARTS } from "../../../../data/vfx/registry/shared_parts";

export const UnitShatter = {
    /**
     * 單位死亡特效：新精靈的 death 動畫由 UnitDeathPainter 播放，這裡只補輕量粒子——
     * 塵煙團＋向外飛散的火花，以及陣營專屬的靈魂飛升 / 血噴。粒子外形全是零件（PART／PART_DEBRIS，
     * 色階 death.ramps、動畫 DEATH_PARTS）；逐顆生成是為了保留受擊方向的噴濺與預算降階。
     * （舊版以程序化 token 圖層炸成碎片，已隨舊管線移除。）
     */
    spawn(system: VFXSystem | undefined, agent: Agent, groundZ: number, impactX: number = 0, impactY: number = 0) {
        if (!system) return;
        const death = getFactionSkin(agent.team).death;
        const ramps = death.ramps;

        const ox = agent.px;
        const oy = agent.py;
        const oz = agent.physics.z;
        const floorLvl = groundZ;

        // [VFX_BUDGET] 高壓/降階狀態檢測
        const isUnderPressure = VFX_BUDGET.enabled && (
            system.state.particles.length >= VFX_BUDGET.SOFT_PARTICLE_BUDGET || getQualityTier() > 0
        );
        const lifeScale = isUnderPressure ? (VFX_BUDGET.SHATTER_LIFETIME_REDUCED / VFX_BUDGET.SHATTER_LIFETIME_NORMAL) : 1.0;

        // 0. Initial Burst Feedback
        system.playEffect('FX_HIT_GENERIC', ox, oy, oz + 20, death.burstColor, floorLvl);

        // 1. 塵煙團：緩慢向外擴散並上升
        const puffCount = isUnderPressure ? DEATH_VFX.PUFF_REDUCED : DEATH_VFX.PUFF_NORMAL;
        for (let i = 0; i < puffCount; i++) {
            const p = system.state.getParticle();
            const angle = Math.random() * Math.PI * 2;
            p.type = 'PART';
            p.x = ox; p.y = oy; p.z = oz + 10;
            p.vx = Math.cos(angle) * DEATH_VFX.PUFF_SPEED + impactX * 0.1;
            p.vy = Math.sin(angle) * DEATH_VFX.PUFF_SPEED + impactY * 0.1;
            p.vz = DEATH_VFX.PUFF_RISE;
            p.size = DEATH_VFX.PUFF_SIZE_MIN + Math.random() * DEATH_VFX.PUFF_SIZE_RANGE;
            p.color = DEATH_VFX.PUFF_COLOR;
            p.part = vfxPartStore.get({ kind: 'smoke', radius: p.size * DEATH_PARTS.PUFF_RADIUS, color: ramps.puff, roughness: 1, seed: i % DEATH_PARTS.PUFF_SEEDS });
            p.partAnim = DEATH_PARTS.PUFF_ANIM;
            p.gravity = 0;
            p.drag = DEATH_VFX.PUFF_DRAG;
            p.life = DEATH_VFX.PUFF_LIFE * (0.8 + Math.random() * 0.4) * lifeScale;
            p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 2. 火花：以陣營主色向外噴濺，受重力落下
        const sparkCount = isUnderPressure ? DEATH_VFX.SPARK_REDUCED : DEATH_VFX.SPARK_NORMAL;
        for (let i = 0; i < sparkCount; i++) {
            const p = system.state.getParticle();
            const angle = Math.random() * Math.PI * 2;
            const speed = DEATH_VFX.SPARK_SPEED_MIN + Math.random() * DEATH_VFX.SPARK_SPEED_RANGE;
            p.type = 'PART_DEBRIS';
            p.x = ox; p.y = oy; p.z = oz + 15;
            p.vx = Math.cos(angle) * speed + impactX * 0.4;
            p.vy = Math.sin(angle) * speed + impactY * 0.4;
            p.vz = DEATH_VFX.SPARK_RISE_MIN + Math.random() * DEATH_VFX.SPARK_RISE_RANGE;
            p.size = DEATH_VFX.SPARK_SIZE_MIN + Math.random() * DEATH_VFX.SPARK_SIZE_RANGE;
            p.color = death.burstColor;
            p.part = vfxPartStore.get({ kind: 'glow', radius: p.size, ramp: ramps.spark, hard: true });
            p.partAnim = DEATH_PARTS.SPARK_ANIM;
            p.gravity = DEATH_VFX.SPARK_GRAVITY;
            p.life = DEATH_VFX.SPARK_LIFE * (0.8 + Math.random() * 0.4) * lifeScale;
            p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 3. 靈魂飛升 / 血噴 (Atmosphere/Spray)
        if (death.style === 'SPIRIT_RISE') {
            const soul = system.state.getParticle();
            soul.x = ox; soul.y = oy; soul.z = oz;
            soul.type = 'PART';
            soul.size = 80;
            soul.color = death.spiritColor;
            soul.vx = 0; soul.vy = 0; soul.vz = 100;
            soul.life = 2.5 * lifeScale; soul.maxLife = soul.life;
            soul.part = vfxPartStore.get({ kind: 'glow', radius: DEATH_PARTS.SOUL_RADIUS, ramp: ramps.spirit });
            soul.partAnim = DEATH_PARTS.SOUL_ANIM;
            system.state.particles.push(soul);
        } else {
            // 公約 (RED): 血噴放射粒子 (替代上升靈魂)
            const bloodCount = isUnderPressure ? VFX_BUDGET.SHATTER_BLOOD_REDUCED : VFX_BUDGET.SHATTER_BLOOD_NORMAL;
            const bloodColor = death.bloodColor;
            
            for (let i = 0; i < bloodCount; i++) {
                const p = system.state.getParticle();
                const angle = Math.random() * Math.PI * 2;
                const speed = 300 + Math.random() * 400; // 較快速度
                p.type = 'PART_DEBRIS';
                p.x = ox; p.y = oy; p.z = oz + 10;
                p.vx = Math.cos(angle) * speed + (impactX * 0.3);
                p.vy = Math.sin(angle) * speed + (impactY * 0.3);
                p.vz = 100 + Math.random() * 200;
                p.size = 3 + Math.random() * 5;
                p.color = bloodColor;
                p.part = vfxPartStore.get({ kind: 'droplet', size: p.size, ramp: ramps.blood });
                p.partAnim = DEATH_PARTS.BLOOD_ANIM;
                p.gravity = 2500;
                p.vRotation = (Math.random() - 0.5) * 50;
                p.life = (1.0 + Math.random() * 1.0) * lifeScale;
                p.maxLife = p.life;
                system.state.particles.push(p);
            }
        }
    }
};
