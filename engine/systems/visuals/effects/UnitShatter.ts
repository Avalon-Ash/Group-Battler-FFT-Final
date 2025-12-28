
import { Team, Role } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { SpriteManager } from "../../../sprites";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";

export const UnitShatter = {
    spawn(
        system: VFXSystem, 
        x: number, y: number, z: number, 
        team: Team, 
        role: Role, 
        impulseX: number, impulseY: number
    ) {
        const assets = SpriteManager.getUnitImages(role, team);
        const factionConfig = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        
        // 1. Base Token (Falls backward)
        const base = system.state.getParticle();
        base.x = x; base.y = y; base.z = z + 10;
        base.vx = impulseX * 0.8; base.vy = impulseY * 0.8; base.vz = 150 + Math.random() * 100;
        base.life = 2.0; base.maxLife = 2.0;
        base.color = '#fff'; base.size = 50; 
        base.type = 'SPRITE'; base.image = assets.base;
        base.vRotation = (Math.random() - 0.5) * 10;
        system.state.particles.push(base);

        // 2. Class Icon (Pops off)
        const icon = system.state.getParticle();
        icon.x = x; icon.y = y; icon.z = z + 40; 
        icon.vx = impulseX * 1.2; icon.vy = impulseY * 1.2; icon.vz = 300 + Math.random() * 200;
        icon.life = 2.0; icon.maxLife = 2.0;
        icon.color = '#fff'; icon.size = 64; 
        icon.type = 'SPRITE'; icon.image = assets.icon;
        icon.vRotation = (Math.random() - 0.5) * 20; 
        system.state.particles.push(icon);

        // 3. Faction Debris (Shatter)
        const shardCount = 8;
        const colors = factionConfig.deathShatterColors;
        for(let i=0; i<shardCount; i++) {
            const p = system.state.getParticle();
            p.x = x + (Math.random()-0.5)*20; p.y = y + (Math.random()-0.5)*20; p.z = z + 30;
            const a = Math.random() * Math.PI * 2;
            const s = 150 + Math.random() * 250;
            p.vx = Math.cos(a)*s + impulseX*0.5; p.vy = Math.sin(a)*s + impulseY*0.5; p.vz = 250 + Math.random()*250; 
            p.life = 1.5; p.maxLife = 1.5;
            p.type = 'SHARD'; p.color = colors[Math.floor(Math.random() * colors.length)];
            p.size = 6 + Math.random()*8; 
            p.vRotation = (Math.random()-0.5)*30; 
            system.state.particles.push(p);
        }
        
        // 4. Soul Release (Rising Light)
        const soul = system.state.getParticle();
        soul.x = x; soul.y = y; soul.z = z + 20;
        soul.vx = 0; soul.vy = 0; soul.vz = 100; // Rise up
        soul.life = 1.5; soul.maxLife = 1.5;
        soul.color = factionConfig.deathSpiritColor;
        soul.size = 60;
        soul.type = 'GLOW';
        soul.blendMode = 'screen';
        system.state.particles.push(soul);
    }
};
