
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
        const layers = SpriteManager.getUnitLayers(agent.role, agent.team);
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        
        const ox = agent.px;
        const oy = agent.py;
        const oz = agent.physics.z;
        const impulseX = agent.physics.vx;
        const impulseY = agent.physics.vy;
        const floorLvl = groundZ;

        // 0. Initial Burst Feedback
        system.playEffect('FX_HIT_GENERIC', ox, oy, oz + 20, faction.primaryColor, floorLvl);

        // 1. 底座核心零件 (Base Layer) - 裂成三份
        for (let i = 0; i < 3; i++) {
            const p = system.state.getParticle();
            const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
            p.type = 'SPRITE';
            p.image = layers.base;
            p.x = ox; p.y = oy; p.z = oz + 10;
            p.vx = Math.cos(angle) * (100 + Math.random() * 150) + (impulseX * 0.2);
            p.vy = Math.sin(angle) * (100 + Math.random() * 150) * 0.5 + (impulseY * 0.2);
            p.vz = 200 + Math.random() * 300;
            p.size = 40;
            p.color = '#fff';
            p.gravity = 3000;
            p.drag = 0.5;
            p.vRotation = (Math.random() - 0.5) * 10;
            p.life = 3.0 + Math.random() * 2; p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 2. 標誌碎片 (Icon/Core)
        const pIcon = system.state.getParticle();
        pIcon.type = 'SPRITE';
        pIcon.image = layers.icon;
        pIcon.x = ox; pIcon.y = oy; pIcon.z = oz + 20;
        pIcon.vx = (Math.random() - 0.5) * 150 + (impulseX * 0.4);
        pIcon.vy = (Math.random() - 0.5) * 150 + (impulseY * 0.4);
        pIcon.vz = 400 + Math.random() * 250;
        pIcon.size = 32;
        pIcon.color = '#fff';
        pIcon.gravity = 2000;
        pIcon.drag = 0.1;
        pIcon.vRotation = (Math.random() - 0.5) * 20;
        pIcon.life = 4.5; pIcon.maxLife = pIcon.life;
        system.state.particles.push(pIcon);
        
        // 3. 金屬飾邊 (Rim Layer)
        const pRim = system.state.getParticle();
        pRim.type = 'SPRITE';
        pRim.image = layers.rim;
        pRim.x = ox; pRim.y = oy; pRim.z = oz + 15;
        pRim.vx = (Math.random() - 0.5) * 200 + (impulseX * 0.3);
        pRim.vy = (Math.random() - 0.5) * 200 + (impulseY * 0.3);
        pRim.vz = 300 + Math.random() * 300;
        pRim.size = 48;
        pRim.color = '#fff';
        pRim.gravity = 3000;
        pRim.vRotation = (Math.random() - 0.5) * 15;
        pRim.life = 3.5; pRim.maxLife = pRim.life;
        system.state.particles.push(pRim);

        // 4. 金屬碎屑 (Pure Shards)
        const shardCount = 10;
        const shardColor = agent.team === Team.BLUE ? '#fcd34d' : '#f87171';
        for (let i = 0; i < shardCount; i++) {
            const p = system.state.getParticle();
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 250;
            p.type = 'SHARD';
            p.x = ox; p.y = oy; p.z = oz + 5;
            p.vx = Math.cos(angle) * speed + (impulseX * 0.3);
            p.vy = Math.sin(angle) * speed + (impulseY * 0.3);
            p.vz = 150 + Math.random() * 450;
            p.size = 6 + Math.random() * 10;
            p.color = shardColor;
            p.gravity = 3000;
            p.vRotation = (Math.random() - 0.5) * 25;
            p.life = 2.0 + Math.random() * 1.5;
            p.maxLife = p.life;
            system.state.particles.push(p);
        }

        // 5. 靈魂飛升
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
