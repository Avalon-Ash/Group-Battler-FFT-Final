
import { Team, Role } from "../../../../types";
import { VFXSystem } from "../../vfx";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { SpriteManager } from "../../../sprites";

export const UnitShatter = {
    spawn(
        system: VFXSystem, 
        x: number, y: number, z: number, 
        team: Team, 
        role: Role, 
        impulseX: number, impulseY: number
    ) {
        const faction = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        const assets = SpriteManager.getUnitImages(role, team);

        // 1. SHOCKWAVE (The Burst)
        const shock = system.state.getParticle();
        shock.x = x; shock.y = y; shock.z = z;
        shock.life = 0.4; shock.maxLife = 0.4;
        shock.size = 100; shock.color = faction.primaryColor;
        shock.type = 'SHOCKWAVE';
        shock.blendMode = 'screen';
        system.state.particles.push(shock);

        // 2. SOUL ASCENSION (The "Ghost" rising)
        const soul = system.state.getParticle();
        soul.x = x; soul.y = y; soul.z = z + 30;
        soul.life = 2.0; soul.maxLife = 2.0;
        soul.size = 64; 
        soul.color = faction.deathSpiritColor;
        soul.type = 'GLOW'; // Simple glow, slowly rising
        soul.vz = 50;
        soul.image = assets.icon; // Reuse icon for soul
        soul.blendMode = 'screen';
        system.state.particles.push(soul);

        // 3. RAGDOLL PARTS (Base & Icon as Physical Objects)
        
        // A. The Base (Heavy, falls fast)
        const pBase = system.state.getParticle();
        pBase.x = x; pBase.y = y; pBase.z = z + 10;
        pBase.image = assets.base;
        pBase.type = 'SPRITE';
        pBase.size = 64; // Visual radius roughly
        pBase.color = '#fff';
        
        // Physics for Base
        pBase.vx = impulseX * 0.5 + (Math.random()-0.5)*100;
        pBase.vy = impulseY * 0.5 + (Math.random()-0.5)*100;
        pBase.vz = 200 + Math.random() * 100; // Hop up
        pBase.gravity = 2500; // Heavy
        pBase.drag = 0.5; // Slide a bit
        pBase.life = 4.0; pBase.maxLife = 4.0; // Persist on ground
        pBase.rotation = 0;
        pBase.vRotation = (Math.random()-0.5) * 5; // Spin slowly
        system.state.particles.push(pBase);

        // B. The Icon (Lighter, flies further)
        const pIcon = system.state.getParticle();
        pIcon.x = x; pIcon.y = y; pIcon.z = z + 40;
        pIcon.image = assets.icon;
        pIcon.type = 'SPRITE';
        pIcon.size = 48;
        pIcon.color = '#fff';
        
        // Physics for Icon
        pIcon.vx = impulseX * 0.8 + (Math.random()-0.5)*200;
        pIcon.vy = impulseY * 0.8 + (Math.random()-0.5)*200;
        pIcon.vz = 400 + Math.random() * 200; // Fly high
        pIcon.gravity = 1800;
        pIcon.drag = 0.1; // Fly far
        pIcon.life = 3.0; pIcon.maxLife = 3.0;
        pIcon.rotation = 0;
        pIcon.vRotation = (Math.random()-0.5) * 15; // Spin fast
        system.state.particles.push(pIcon);

        // 4. Physical Debris (Sparks/Chunks)
        const count = 8;
        for(let i=0; i<count; i++) {
            const p = system.state.getParticle();
            p.x = x; p.y = y; p.z = z + 20;
            p.vx = (Math.random()-0.5) * 400 + impulseX * 0.3;
            p.vy = (Math.random()-0.5) * 400 + impulseY * 0.3;
            p.vz = 200 + Math.random() * 300;
            p.life = 0.6 + Math.random() * 0.4; p.maxLife = p.life;
            p.type = 'RUBBLE'; // Solid chunks
            p.color = i % 2 === 0 ? faction.primaryColor : '#333';
            p.size = 5 + Math.random() * 8;
            p.gravity = 2000;
            p.blendMode = 'source-over';
            system.state.particles.push(p);
        }
    }
};
