
import { Team, Role } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { SpriteManager } from "../../../sprites";
import { UNIT_SCALE } from "../../../../../constants";

export const UnitShatter = {
    /**
     * 高階解體系統：將單位模型拆解為多個物理碎片
     * SSOT: Requires explicit groundZ to prevent floor clipping guessing
     */
    spawn(
        system: VFXSystem, 
        x: number, y: number, z: number, 
        team: Team, 
        role: Role, 
        impulseX: number, impulseY: number,
        groundZ: number 
    ) {
        const faction = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        const assets = SpriteManager.getUnitImages(role, team);
        
        // 核心參數：爆炸強度 (隨機化讓死亡不重複)
        const explodeForce = 250 + Math.random() * 200;
        const floorLvl = groundZ - 45; // Logic floor for physics bounds (approx)

        // 1. 核心衝擊波 (地面)
        system.playEffect('FX_HIT_GENERIC', x, y, floorLvl, faction.primaryColor, floorLvl);

        // 2. 底座破碎 (Heavy Ragdoll Part)
        const pBase = system.state.getParticle();
        pBase.x = x; pBase.y = y; pBase.z = floorLvl + 5;
        pBase.image = assets.base;
        pBase.type = 'SPRITE';
        pBase.size = 64 * UNIT_SCALE;
        pBase.color = '#fff';
        pBase.vx = (Math.random() - 0.5) * 100 + (impulseX * 0.2);
        pBase.vy = (Math.random() - 0.5) * 100 + (impulseY * 0.2);
        pBase.vz = 150 + Math.random() * 100; // 低彈跳
        pBase.gravity = 3500; // 沉重感
        pBase.drag = 0.6;     // 地面摩擦大
        pBase.vRotation = (Math.random() - 0.5) * 2;
        pBase.life = 5.0; pBase.maxLife = 5.0;
        system.state.particles.push(pBase);

        // 3. 職業標誌彈飛 (Light Ragdoll Part)
        const pIcon = system.state.getParticle();
        pIcon.x = x; pIcon.y = y; pIcon.z = z; // 從胸口彈出
        pIcon.image = assets.icon;
        pIcon.type = 'SPRITE';
        pIcon.size = 48 * UNIT_SCALE;
        pIcon.color = '#fff';
        pIcon.vx = (Math.random() - 0.5) * 300 + (impulseX * 0.5);
        pIcon.vy = (Math.random() - 0.5) * 300 + (impulseY * 0.5);
        pIcon.vz = 400 + Math.random() * 300; // 飛得高
        pIcon.gravity = 2000; // 輕盈
        pIcon.drag = 0.1;
        pIcon.vRotation = (Math.random() - 0.5) * 20; // 劇烈旋轉
        pIcon.life = 4.0; pIcon.maxLife = 4.0;
        pIcon.blendMode = 'screen';
        system.state.particles.push(pIcon);

        // 4. 護甲崩裂碎片 (The Splatter)
        const shardCount = 12;
        for (let i = 0; i < shardCount; i++) {
            const p = system.state.getParticle();
            const ang = (i / shardCount) * Math.PI * 2 + (Math.random() * 0.5);
            const speed = 200 + Math.random() * 400;
            
            p.x = x; p.y = y; p.z = z + (Math.random() - 0.5) * 20;
            p.vx = Math.cos(ang) * speed + (impulseX * 0.3);
            p.vy = Math.sin(ang) * speed + (impulseY * 0.3);
            p.vz = 300 + Math.random() * 500;
            p.type = i % 3 === 0 ? 'SHARD' : 'RUBBLE';
            p.color = i % 2 === 0 ? faction.primaryColor : faction.darkColor;
            p.size = 4 + Math.random() * 10;
            p.gravity = 2500;
            p.life = 0.8 + Math.random() * 1.5;
            p.maxLife = p.life;
            p.vRotation = (Math.random() - 0.5) * 30;
            system.state.particles.push(p);
        }

        // 5. 靈魂飛升 (Ghostly Aura)
        const soul = system.state.getParticle();
        soul.x = x; soul.y = y; soul.z = z;
        soul.type = 'ATMOSPHERE';
        soul.size = 80;
        soul.color = faction.deathSpiritColor;
        soul.vx = 0; soul.vy = 0; soul.vz = 80; // 緩緩上升
        soul.drag = 0.05;
        soul.life = 2.5; soul.maxLife = 2.5;
        soul.blendMode = 'screen';
        system.state.particles.push(soul);
    }
};
