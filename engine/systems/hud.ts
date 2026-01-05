
const GRAVITY = 200;
const TEXT_LIFESPAN = 1.0;
const MAX_ACTIVE_TEXTS = 100;

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
    
    // New Props for Breakable Text
    ownerId?: string;      // 用於綁定單位
    isShattered?: boolean; // 標記是否已被打斷
    rotation: number;      // 物理旋轉角度
    vRot: number;          // 旋轉速度
    
    // Animation Timer
    time: number;          // 存活時間 (累加)
    totalDuration: number; // 預計總詠唱時間 (用於進度條計算)
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
            time: 0, totalDuration: 0
        };
    }

    public addFloatingText(
        x: number, y: number, text: string, color: string, size: number, 
        type: 'DAMAGE' | 'HEAL' | 'SHOUT' | 'CC' | 'KILL_STREAK' = 'DAMAGE', 
        isUlt: boolean = false,
        ownerId?: string,
        duration: number = 0 // 新增參數
    ) {
        if (this.damageNumbers.length > MAX_ACTIVE_TEXTS) {
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
                    // 如果是舊的喊招，直接淡出或移除
                    t.life = 0; 
                }
            }
        }

        let vx = 0, vy = 0, life = TEXT_LIFESPAN;
        if (type === 'SHOUT') {
            // SHOUT 的生命週期現在由詠唱時間決定，但至少保留 1秒以免太快消失
            // 我們給予一點緩衝時間讓它在詠唱完後還能稍微顯示一下 (fadeOut)
            life = Math.max(duration, 1.0) + 0.3;
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
        ft.totalDuration = duration > 0 ? duration : 1.0; // 防止除以零

        this.damageNumbers.push(ft);
    }

    /**
     * 核心功能：擊碎指定單位的詠唱文字
     */
    public breakCastText(ownerId: string) {
        // 尋找該單位目前正在活躍的 SHOUT
        const text = this.damageNumbers.find(t => t.type === 'SHOUT' && t.ownerId === ownerId && !t.isShattered);
        
        if (text) {
            text.isShattered = true;
            
            // 視覺崩壞物理效果
            text.color = '#94a3b8'; // 變成失效的灰色
            text.vy = -180; // 向上彈飛力度增加
            text.vx = (Math.random() - 0.5) * 250; // 增加水平飛散速度
            text.vRot = (Math.random() - 0.5) * 20; // 增加旋轉速度
            text.life = 0.5; // 壽命大幅縮短 (快速消失)
            text.maxLife = 0.5;
        }
    }

    private release(ft: FloatingText) {
        ft.active = false;
        ft.ownerId = undefined; // Clear Ref
        this.pool.push(ft);
    }

    public update(dt: number) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) { 
            const d = this.damageNumbers[i]; 
            d.life -= dt; 
            d.time += dt;
            
            d.x += d.vx * dt;
            d.y += d.vy * dt; 
            d.rotation += d.vRot * dt; // Apply Rotation

            // Gravity Logic
            if (d.type === 'DAMAGE' || d.type === 'HEAL' || d.isShattered) {
                // Shattered text falls faster
                const g = d.isShattered ? GRAVITY * 3.0 : GRAVITY;
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
