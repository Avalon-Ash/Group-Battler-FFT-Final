
import { VFXStateManager } from "./state";

export class VFXAmbience {
    private timer: number = 0;

    public update(dt: number, type: string, state: VFXStateManager) {
        if (type === 'NONE') return;
        
        this.timer += dt;
        
        // Rate Control:
        // Snow/Ash/Sand: Frequent spawn (Dense atmosphere)
        // Others: Sparse spawn
        let rate = 0.15;
        if (type === 'SNOW' || type === 'ASH') rate = 0.03;
        if (type === 'SAND') rate = 0.005; // Extremely fast spawn for dense sand
        
        if (this.timer > rate) {
            this.timer = 0;
            
            const p = state.getParticle();
            p.type = 'ATMOSPHERE'; 
            
            // Default random spawn logic (overridden for Sand)
            let x = Math.random() * 1600 - 200;
            const y = Math.random() * 1000 - 200;
            
            // Randomize Z for parallax feeling
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
                p.color = Math.random() > 0.5 ? '#1c1917' : '#451a03'; // Dark Ash
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
                p.vy = -40 - Math.random() * 30; // Rise
                p.life = 2.5; p.maxLife = 2.5;
                p.blendMode = 'screen'; 
            } else if (type === 'SPORES') {
                p.x = x; p.y = y;
                // Mystic floaty particles
                p.color = Math.random() > 0.5 ? '#bef264' : '#a855f7';
                p.size = Math.random() * 2.5 + 0.5;
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.5) * 15;
                p.life = 6.0; p.maxLife = 6.0;
                p.blendMode = 'screen';
            } else if (type === 'SAND') {
                // Directional High Speed Sandstorm
                // Spawn off-screen left, fly right
                p.x = -100; 
                p.y = Math.random() * 1200 - 200; // Full vertical coverage
                
                // Amber/Tan colors
                p.color = Math.random() > 0.6 ? '#fcd34d' : '#d97706'; 
                p.size = Math.random() * 2 + 1; // Slightly larger chunks
                
                // High horizontal velocity
                p.vx = 1200 + Math.random() * 600; // Extremely Fast
                p.vy = 50 + Math.random() * 30; // Slight fall/drift
                
                p.life = 1.5; p.maxLife = 1.5; // Short life (moves fast)
                p.blendMode = 'source-over';
            }
            
            state.particles.push(p);
        }
    }
}
