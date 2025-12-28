
import { VFXStateManager } from "./state";

export class VFXAmbience {
    private timer: number = 0;

    public update(dt: number, type: string, state: VFXStateManager) {
        if (type === 'NONE') return;
        
        this.timer += dt;
        const rate = type === 'SNOW' || type === 'ASH' ? 0.05 : 0.2; 
        
        if (this.timer > rate) {
            this.timer = 0;
            const x = Math.random() * 1200 - 100;
            const y = Math.random() * 800 - 100;
            
            const p = state.getParticle();
            p.x = x; p.y = y; p.z = Math.random() * 200 + 50;
            p.type = 'ATMOSPHERE'; // Replaces generic GLOW
            
            if (type === 'SNOW') {
                p.color = '#fff';
                p.size = Math.random() * 3 + 1;
                p.vx = 20 + Math.random() * 20;
                p.vy = 50 + Math.random() * 30;
                p.life = 3.0; p.maxLife = 3.0;
                p.blendMode = 'source-over'; // Opaque flakes
            } else if (type === 'ASH') {
                p.color = '#78350f';
                p.size = Math.random() * 4 + 1;
                p.vx = 30 + Math.random() * 30;
                p.vy = 20 + Math.random() * 20;
                p.life = 4.0; p.maxLife = 4.0;
                p.blendMode = 'source-over';
            } else if (type === 'EMBER') {
                p.color = '#fbbf24';
                p.size = Math.random() * 2 + 1;
                p.vx = (Math.random() - 0.5) * 20;
                p.vy = -30 - Math.random() * 20;
                p.life = 2.0; p.maxLife = 2.0;
                p.blendMode = 'screen'; // Glowing but not additive blowout
            } else if (type === 'SPORES') {
                p.color = Math.random() > 0.5 ? '#bef264' : '#a855f7';
                p.size = Math.random() * 2 + 1;
                p.vx = (Math.random() - 0.5) * 10;
                p.vy = (Math.random() - 0.5) * 10;
                p.life = 5.0; p.maxLife = 5.0;
                p.blendMode = 'screen';
            }
            state.particles.push(p);
        }
    }
}
