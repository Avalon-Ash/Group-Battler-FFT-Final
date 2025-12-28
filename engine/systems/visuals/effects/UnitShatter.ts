
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
        // Ensure assets are generated
        const assets = SpriteManager.getUnitImages(role, team);
        const factionConfig = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        
        // 1. Base Token (Falls backward like a heavy coin/ragdoll)
        const base = system.state.getParticle();
        base.x = x; base.y = y; base.z = z + 10;
        base.vx = impulseX * 0.8; 
        base.vy = impulseY * 0.8; 
        base.vz = 250 + Math.random() * 100; // Jump up slightly before falling
        base.life = 3.0; base.maxLife = 3.0;
        base.color = '#fff'; base.size = 50; 
        base.type = 'SPRITE'; 
        base.image = assets.base; // Assign Pre-rendered Base
        base.vRotation = (Math.random() - 0.5) * 20;
        base.gravity = 1800; // Ensure it falls
        system.state.particles.push(base);

        // 2. Class Icon (Pops off separately)
        const icon = system.state.getParticle();
        icon.x = x; icon.y = y; icon.z = z + 40; 
        icon.vx = impulseX * 1.2 + (Math.random()-0.5)*100; 
        icon.vy = impulseY * 1.2 + (Math.random()-0.5)*100; 
        icon.vz = 350 + Math.random() * 200;
        icon.life = 2.5; icon.maxLife = 2.5;
        icon.color = '#fff'; icon.size = 64; 
        icon.type = 'SPRITE'; 
        icon.image = assets.icon; // Assign Pre-rendered Icon
        icon.vRotation = (Math.random() - 0.5) * 30; 
        icon.gravity = 1500;
        system.state.particles.push(icon);

        // 3. Faction Debris (Shatter particles)
        const shardCount = 12; // Increased count
        const colors = factionConfig.deathShatterColors;
        for(let i=0; i<shardCount; i++) {
            const p = system.state.getParticle();
            p.x = x + (Math.random()-0.5)*20; p.y = y + (Math.random()-0.5)*20; p.z = z + 30;
            const a = Math.random() * Math.PI * 2;
            const s = 150 + Math.random() * 300;
            
            p.vx = Math.cos(a)*s + impulseX*0.5; 
            p.vy = Math.sin(a)*s + impulseY*0.5; 
            p.vz = 200 + Math.random()*300; 
            
            p.life = 1.5; p.maxLife = 1.5;
            p.type = 'SHARD'; 
            p.color = colors[Math.floor(Math.random() * colors.length)];
            p.size = 8 + Math.random()*12; 
            p.vRotation = (Math.random()-0.5)*30; 
            p.gravity = 2000; // Heavy pieces
            system.state.particles.push(p);
        }
        
        // 4. Soul Release (Rising Light)
        const soul = system.state.getParticle();
        soul.x = x; soul.y = y; soul.z = z + 20;
        soul.vx = 0; soul.vy = 0; 
        soul.vz = 80; // Slow rise
        soul.life = 2.0; soul.maxLife = 2.0;
        soul.color = factionConfig.deathSpiritColor;
        soul.size = 80;
        soul.type = 'GLOW';
        soul.blendMode = 'screen';
        system.state.particles.push(soul);
    }
};
