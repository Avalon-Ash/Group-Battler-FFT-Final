
import { Team, Role } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { SpriteManager } from "../../../sprites";
import { UNIT_SCALE } from "../../../../constants";

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
        
        if (!assets || !assets.base || !assets.icon) {
            console.warn(`[UnitShatter] Asset not ready for ${role}/${team}, skip.`);
            return;
        }

        if (assets.base.width === 0 || assets.icon.width === 0) {
             console.warn(`[UnitShatter] Zero-sized canvas for ${role}/${team}`);
             return;
        }
        
        // 核心參數：爆炸強度 (隨機化讓死亡不重複)
        const explodeForce = 250 + Math.random() * 200;
        const floorLvl = groundZ; 

        // 0. [NEW] Initial Burst Visual Feedback
        system.playEffect('FX_HIT_GENERIC', x, y, z + 20, faction.primaryColor, floorLvl);

        // 1. 核心衝擊波 (地面)
        system.playEffect('FX_HIT_GENERIC', x, y, floorLvl, faction.primaryColor, floorLvl);

        // 2. 底座破碎 (Heavy Ragdoll Part)
        const pBase = system.state.getParticle();
        pBase.x = x; pBase.y = y; pBase.z = floorLvl + 24;
        pBase.image = assets.base;
        pBase.type = 'SPRITE';
        pBase.size = 48; // Fixed size for visibility
        pBase.color = faction.primaryColor; // Faction identified shards
        pBase.vx = (Math.random() - 0.5) * 120 + (impulseX * 0.25);
        pBase.vy = (Math.random() - 0.5) * 120 + (impulseY * 0.25);
        pBase.vz = 180 + Math.random() * 120;
        pBase.gravity = 3500;
        pBase.drag = 0.6;
        pBase.vRotation = (Math.random() - 0.5) * 3;
        pBase.life = 5.0; pBase.maxLife = 5.0;
        system.state.particles.push(pBase);

        // 3. 職業標誌彈飛 (Light Ragdoll Part)
        const pIcon = system.state.getParticle();
        pIcon.x = x; pIcon.y = y; pIcon.z = z;
        pIcon.image = assets.icon;
        pIcon.type = 'SPRITE';
        pIcon.size = 36;
        pIcon.color = '#fff';
        pIcon.vx = (Math.random() - 0.5) * 350 + (impulseX * 0.5);
        pIcon.vy = (Math.random() - 0.5) * 350 + (impulseY * 0.5);
        pIcon.vz = 450 + Math.random() * 350;
        pIcon.gravity = 2000;
        pIcon.drag = 0.1;
        pIcon.vRotation = (Math.random() - 0.5) * 25;
        pIcon.life = 4.0; pIcon.maxLife = 4.0;
        pIcon.blendMode = 'source-over'; // More visible on light backgrounds
        system.state.particles.push(pIcon);

        // 4. 護甲崩裂碎片 (The Splatter)
        const shardCount = 18; // Increased density
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

        // 6. [NEW] Faction Specific Death Burst
        if (team === 1) { // RED
            system.playEffect('FX_HIT_RED_BLOOD', x, y, z, faction.primaryColor, groundZ);
        } else { // BLUE
            system.playEffect('FX_HIT_BLUE_TECH', x, y, z, faction.primaryColor, groundZ);
        }
    }
};
