
import { Team, Role } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { SpriteManager } from "../../../sprites";
import { Agent } from "../../../core/Agent";

export const UnitShatter = {
    /**
     * 高階解體系統：將單位模型拆解為多個物理碎片
     * 使用 SpriteManager.getUnitLayers 獲取分層模型的單獨 Canvas
     */
    spawn(system: VFXSystem | undefined, agent: Agent, groundZ: number) {
        if (!system) return;
        const layers = SpriteManager.getUnitLayersFull(agent.role, agent.team);
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        
        const ox = agent.px;
        const oy = agent.py;
        const oz = agent.physics.z;
        const impulseX = agent.physics.vx;
        const impulseY = agent.physics.vy;
        const floorLvl = groundZ;

        // 0. Initial Burst Feedback
        system.playEffect('FX_HIT_GENERIC', ox, oy, oz + 20, faction.primaryColor, floorLvl);

        // 1. [base] 本體圓盤 (Heavy, sliding)
        {
            const p = system.state.getParticle();
            p.type = 'SPRITE';
            p.image = layers.base;
            p.x = ox; p.y = oy; p.z = oz + 10;
            p.vx = (impulseX * 0.2) + (Math.random() - 0.5) * 50;
            p.vy = (impulseY * 0.2) + (Math.random() - 0.5) * 50;
            p.vz = 100 + Math.random() * 150;
            p.size = 72;
            p.color = '#fff';
            p.gravity = 4000;
            p.drag = 1.5;
            p.vRotation = (Math.random() - 0.5) * 5;
            p.life = 4.0 + Math.random(); p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 2. [rim] 金邊圓環 (Medium, high rotation)
        {
            const p = system.state.getParticle();
            p.type = 'SPRITE';
            p.image = layers.rim;
            p.x = ox; p.y = oy; p.z = oz + 15;
            p.vx = (impulseX * 0.3) + (Math.random() - 0.5) * 100;
            p.vy = (impulseY * 0.3) + (Math.random() - 0.5) * 100;
            p.vz = 200 + Math.random() * 200;
            p.size = 64;
            p.color = '#fff';
            p.gravity = 3000;
            p.vRotation = (Math.random() - 0.5) * 20;
            p.life = 3.5 + Math.random(); p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 3. [core] 核心符號 (Light, high bounce)
        {
            const p = system.state.getParticle();
            p.type = 'SPRITE';
            p.image = layers.core;
            p.x = ox; p.y = oy; p.z = oz + 20;
            p.vx = (impulseX * 0.1) + (Math.random() - 0.5) * 80;
            p.vy = (impulseY * 0.1) + (Math.random() - 0.5) * 80;
            p.vz = 500 + Math.random() * 200;
            p.size = 48;
            p.color = '#fff';
            p.gravity = 1500;
            p.drag = 0.05;
            p.vRotation = (Math.random() - 0.5) * 10;
            p.life = 5.0 + Math.random(); p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 4. [icon] role 圖示碎片 (Lightest, far throw)
        {
            const p = system.state.getParticle();
            p.type = 'SPRITE';
            p.image = layers.icon;
            p.x = ox; p.y = oy; p.z = oz + 25;
            p.vx = (impulseX * 0.4) + (Math.random() - 0.5) * 150;
            p.vy = (impulseY * 0.4) + (Math.random() - 0.5) * 150;
            p.vz = 300 + Math.random() * 300;
            p.size = 36;
            p.color = '#fff';
            p.gravity = 2000;
            p.vRotation = (Math.random() - 0.5) * 30;
            p.life = 4.0 + Math.random(); p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 5. 金屬碎屑 (Pure Shards) - Reduced size for background fill
        const shardCount = 10;
        const shardColor = agent.team === Team.BLUE ? '#fcd34d' : '#f87171';
        for (let i = 0; i < shardCount; i++) {
            const p = system.state.getParticle();
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            p.type = 'SHARD';
            p.x = ox; p.y = oy; p.z = oz + 5;
            p.vx = Math.cos(angle) * speed + (impulseX * 0.3);
            p.vy = Math.sin(angle) * speed + (impulseY * 0.3);
            p.vz = 200 + Math.random() * 400;
            p.size = 4 + Math.random() * 4;
            p.color = shardColor;
            p.gravity = 3000;
            p.vRotation = (Math.random() - 0.5) * 25;
            p.life = 2.0 + Math.random() * 1.5;
            p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 6. 靈魂飛升 (Atmosphere)
        const soul = system.state.getParticle();
        soul.x = ox; soul.y = oy; soul.z = oz;
        soul.type = 'ATMOSPHERE';
        soul.size = 80;
        soul.color = faction.deathSpiritColor;
        soul.vx = 0; soul.vy = 0; soul.vz = 100;
        soul.life = 2.5; soul.maxLife = 2.5;
        soul.blendMode = 'screen';
        system.state.particles.push(soul);
    }
};
