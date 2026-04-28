
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;
const MAX_ACTIVE_TEXTS = 60; // Reduced for performance safety

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
    
    // New Props for Breakable Text & Progress
    ownerId?: string;      // 用於綁定單位
    isShattered?: boolean; // 標記是否已被打斷/完成
    shatterType?: 'SUCCESS' | 'BREAK'; // 新增：決定演出的類型
    rotation: number;      // 物理旋轉角度
    vRot: number;          // 旋轉速度
    
    // Animation Timer
    time: number;          // 存活時間 (累加)
    totalDuration: number; // 預計總詠唱時間 (用於進度條計算)
    cachedWidth?: number;  // Cached width for text measurement optimization
}

export class HUDSystem {
    public damageNumbers: FloatingText[] = [];
    private pool: FloatingText[] = [];

    constructor() {
        for(let i=0; i<50; i++) this.pool.push(this.createEmpty());
    }

    public reset() {
        for (const d of this.damageNumbers) this.release(d);
        this.damageNumbers.length = 0;
    }

    private createEmpty(): FloatingText {
        return {
            active: false,
            x: 0, y: 0, vx: 0, vy: 0,
            text: '', color: '#fff', life: 0, maxLife: 0, size: 0,
            type: 'DAMAGE', isUlt: false,
            ownerId: undefined, isShattered: false, rotation: 0, vRot: 0,
            time: 0, totalDuration: 0, cachedWidth: undefined
        };
    }

    public addFloatingText(
        x: number, y: number, text: string, color: string, size: number, 
        type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK' = 'DAMAGE', 
        isUlt: boolean = false,
        ownerId?: string,
        duration: number = 0
    ) {
        if (this.damageNumbers.length >= MAX_ACTIVE_TEXTS) {
            const old = this.damageNumbers.shift();
            if (old) this.release(old);
        }

        // Kill Streak 清理邏輯
        if (type === 'KILL_STREAK') {
            for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
                if (this.damageNumbers[i].type === 'KILL_STREAK') {
                    this.release(this.damageNumbers[i]);
                    this.damageNumbers.splice(i, 1);
                }
            }
        }

        // 如果該單位已有存在的 SHOUT，先移除舊的 (避免重疊)
        if (type === 'SHOUT' && ownerId) {
            for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
                const t = this.damageNumbers[i];
                if (t.type === 'SHOUT' && t.ownerId === ownerId && !t.isShattered) {
                    this.release(t);
                    this.damageNumbers.splice(i, 1);
                }
            }
        }

        let vx = 0, vy = 0, life = TEXT_LIFESPAN;
        if (type === 'SHOUT') {
            // SHOUT 的生命週期現在由詠唱時間決定
            const safeDuration = Math.min(5.0, duration > 0 ? duration : 1.0);
            life = safeDuration + 0.5;
            if (isUlt) { vy = -5; size = 24; }
            else { vy = -20; size = 14; }
        } else if (type === 'CC') {
            vy = -20; life = 1.5;
        } else if (type === 'KILL_STREAK') {
            vx = 0; vy = -30; life = 3.5; size = 32; 
        } else {
            vx = (Math.random() - 0.5) * 60; vy = -100; 
        }

        let ft = this.pool.length > 0 ? this.pool.pop()! : this.createEmpty();
        ft.active = true;
        ft.x = x; ft.y = y; ft.vx = vx; ft.vy = vy;
        ft.text = text; ft.color = color;
        ft.life = life; ft.maxLife = life;
        ft.size = size; ft.type = type;
        ft.isUlt = isUlt;
        ft.ownerId = ownerId;
        ft.isShattered = false;
        ft.rotation = 0;
        ft.vRot = 0;
        ft.time = 0;
        ft.totalDuration = duration > 0 ? duration : 1.0; 
        ft.cachedWidth = undefined; 

        this.damageNumbers.push(ft);
    }

    /**
     * 成功釋放：文字向上快速升華並消失，帶有白色閃光感
     */
    public completeCastText(ownerId: string) {
        const text = this.damageNumbers.find(t => t.type === 'SHOUT' && t.ownerId === ownerId && !t.isShattered);
        if (text) {
            text.isShattered = true;
            text.shatterType = 'SUCCESS';
            text.vy = -400; // 快速向上升華
            text.vx = 0;    // 保持中心
            text.life = 0.3; // 更短的時間，表現俐落感
            text.maxLife = 0.3;
        }
    }

    /**
     * 強制中斷文字：給予極高的向上速度與旋轉，並縮短壽命
     * 創造出 "文字被打飛/震碎" 的視覺效果
     */
    public breakCastText(ownerId: string) {
        const text = this.damageNumbers.find(t => t.type === 'SHOUT' && t.ownerId === ownerId && !t.isShattered);
        
        if (text) {
            text.isShattered = true;
            text.shatterType = 'BREAK';
            text.color = '#94a3b8'; // 變成灰色廢墟感
            text.vy = -250; // 用力向上炸飛
            text.vx = (Math.random() - 0.5) * 400; // 隨機左右噴飛
            text.vRot = (Math.random() - 0.5) * 30; // 劇烈旋轉
            text.life = 0.4; // 快速消失
            text.maxLife = 0.4;
        }
    }

    private release(ft: FloatingText) {
        ft.active = false;
        ft.ownerId = undefined;
        this.pool.push(ft);
    }

    public update(dt: number) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) { 
            const d = this.damageNumbers[i]; 
            d.life -= dt; 
            d.time += dt;
            
            d.x += d.vx * dt;
            d.y += d.vy * dt; 
            d.rotation += d.vRot * dt; 

            if (d.type === 'DAMAGE' || d.type === 'HEAL' || d.isShattered) {
                const g = d.isShattered ? GRAVITY * 4.0 : GRAVITY; // 碎片重力更強
                d.vy += g * dt;
            }
            else if (d.type === 'SHOUT' || d.type === 'CC') d.vy *= 0.95; 
            else if (d.type === 'KILL_STREAK') d.vy *= 0.92; 
            
            if (d.life <= 0) {
                this.release(d);
                this.damageNumbers.splice(i, 1); 
            }
        }
    }
}
