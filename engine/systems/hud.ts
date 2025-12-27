
// --- Constants ---
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;

export interface FloatingText {
    active: boolean;
    x: number; 
    y: number;
    vx: number; 
    vy: number;
    text: string; 
    color: string;
    life: number; 
    maxLife: number;
    size: number;
    type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK';
    isUlt: boolean; 
}

export class HUDSystem {
    // Active Texts
    public damageNumbers: FloatingText[] = [];
    
    // Memory Pool
    private pool: FloatingText[] = [];

    constructor() {
        for(let i=0; i<50; i++) this.pool.push(this.createEmpty());
    }

    public reset() {
        for (const d of this.damageNumbers) {
            this.release(d);
        }
        this.damageNumbers.length = 0;
    }

    private createEmpty(): FloatingText {
        return {
            active: false,
            x: 0, y: 0, vx: 0, vy: 0,
            text: '', color: '#fff', life: 0, maxLife: 0, size: 0,
            type: 'DAMAGE', isUlt: false
        };
    }

    public addFloatingText(x: number, y: number, text: string, color: string, size: number, type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK' = 'DAMAGE', isUlt: boolean = false) {
        if (type === 'KILL_STREAK') {
            for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
                if (this.damageNumbers[i].type === 'KILL_STREAK') {
                    this.release(this.damageNumbers[i]);
                    this.damageNumbers.splice(i, 1);
                }
            }
        }

        let vx = 0;
        let vy = 0;
        let life = TEXT_LIFESPAN;

        if (type === 'SHOUT') {
            if (isUlt) {
                vy = -5; 
                life = 2.5; 
                size = 24; 
            } else {
                vy = -20; 
                life = 1.2;
                size = 14; 
            }
        } else if (type === 'CC') {
            vy = -20; 
            life = 1.5;
        } else if (type === 'KILL_STREAK') {
            vx = 0;
            vy = -30;
            life = 3.5; 
            size = 32; 
        } else {
            vx = (Math.random() - 0.5) * 60; 
            vy = -100; 
        }

        let ft: FloatingText;
        if (this.pool.length > 0) {
            ft = this.pool.pop()!;
        } else {
            ft = this.createEmpty();
        }

        ft.active = true;
        ft.x = x; ft.y = y;
        ft.vx = vx; ft.vy = vy;
        ft.text = text; ft.color = color;
        ft.life = life; ft.maxLife = life;
        ft.size = size; ft.type = type;
        ft.isUlt = isUlt;

        this.damageNumbers.push(ft);
    }

    private release(ft: FloatingText) {
        ft.active = false;
        this.pool.push(ft);
    }

    public update(dt: number) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) { 
            const d = this.damageNumbers[i]; 
            d.life -= dt; 
            
            d.x += d.vx * dt;
            d.y += d.vy * dt; 
            
            if (d.type === 'DAMAGE' || d.type === 'HEAL') {
                d.vy += GRAVITY * dt;
            } else if (d.type === 'SHOUT' || d.type === 'CC') {
                d.vy *= 0.95; 
            } else if (d.type === 'KILL_STREAK') {
                d.vy *= 0.92; 
            }

            if (d.life <= 0) {
                this.release(d);
                this.damageNumbers.splice(i, 1); 
            }
        }
    }
}
