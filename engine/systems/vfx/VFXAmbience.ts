
import { VFXStateManager } from "./state";
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";

export class VFXAmbience {
    private timer: number = 0;

    public update(dt: number, type: string, state: VFXStateManager, engine?: GameEngine) {
        if (type === 'NONE') return;
        
        this.timer += dt;
        
        let rate = 0.15;
        if (type === 'SNOW' || type === 'ASH') rate = 0.03;
        if (type === 'SAND') rate = 0.005; 
        
        if (this.timer > rate) {
            this.timer = 0;
            
            const p = state.getParticle();
            p.type = 'ATMOSPHERE'; 
            
            // Dynamic bounds based on map size if engine is available
            let boundsW = 2000;
            let boundsH = 1400;
            let offsetX = -400;
            let offsetY = -400;

            if (engine) {
                const cfg = engine.mapConfig;
                // Approximate pixel bounds based on hex grid size
                // Width ~ 1.5 * size * cols, Height ~ 1.7 * size * rows
                boundsW = cfg.w * 80 + 800; // Extra padding
                boundsH = cfg.h * 80 + 800;
                // Center roughly around map center 
                // We assume map starts at 0,0 but we want coverage beyond edges
                offsetX = -400; 
                offsetY = -400;
            }

            let x = Math.random() * boundsW + offsetX;
            const y = Math.random() * boundsH + offsetY;
            
            p.z = Math.random() * 400 + 50; 
            
            if (type === 'SNOW') {
                p.x = x; p.y = y;
                p.color = '#fff';
                p.size = Math.random() * 2.5 + 1.5;
                p.vx = 40 + Math.random() * 30; // Wind
                p.vy = 80 + Math.random() * 40; // Fall
                p.life = 4.0; p.maxLife = 4.0;
                p.blendMode = 'source-over';
            } else if (type === 'ASH') {
                p.x = x; p.y = y;
                p.color = Math.random() > 0.5 ? '#1c1917' : '#451a03'; 
                p.size = Math.random() * 3 + 1;
                p.vx = 20 + Math.random() * 20;
                p.vy = 30 + Math.random() * 20;
                p.life = 5.0; p.maxLife = 5.0;
                p.blendMode = 'source-over';
            } else if (type === 'EMBER') {
                p.x = x; p.y = y;
                p.color = Math.random() > 0.5 ? '#f59e0b' : '#ef4444';
                p.size = Math.random() * 2 + 1;
                p.vx = (Math.random() - 0.5) * 40;
                p.vy = -40 - Math.random() * 30; 
                p.life = 2.5; p.maxLife = 2.5;
                p.blendMode = 'screen'; 
            } else if (type === 'SPORES') {
                p.x = x; p.y = y;
                p.color = Math.random() > 0.5 ? '#bef264' : '#a855f7';
                p.size = Math.random() * 2.5 + 0.5;
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.5) * 15;
                p.life = 6.0; p.maxLife = 6.0;
                p.blendMode = 'screen';
            } else if (type === 'SAND') {
                // Spawn off-screen left
                p.x = offsetX; // Start from left edge
                p.y = Math.random() * boundsH + offsetY; 
                
                p.color = Math.random() > 0.6 ? '#fcd34d' : '#d97706'; 
                p.size = Math.random() * 2 + 1; 
                
                p.vx = 1200 + Math.random() * 600; 
                p.vy = 50 + Math.random() * 30; 
                
                p.life = 1.8; p.maxLife = 1.8; 
                p.blendMode = 'source-over';
            } else if (type === 'VOID') {
                p.x = x; p.y = y;
                p.color = Math.random() > 0.5 ? '#581c87' : '#000000';
                p.size = Math.random() * 4 + 2;
                p.vx = (Math.random() - 0.5) * 20;
                p.vy = (Math.random() - 0.5) * 20;
                p.life = 3.0; p.maxLife = 3.0;
                p.blendMode = 'screen';
            }
            
            state.particles.push(p);
        }
    }
}
