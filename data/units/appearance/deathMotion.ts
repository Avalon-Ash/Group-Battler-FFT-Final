/**
 * 死亡擊飛位移（純函式）。
 * 渲染器無狀態：位移完全由「死亡後經過時間 t」與 Ragdoll 軀幹的初速（impact 方向）決定，
 * 不需任何額外的狀態或物理積分。
 *  - 水平：指數衰減滑行（先快後慢，距離有上限）
 *  - 垂直：拋物線彈跳，每次彈跳高度依恢復係數遞減，彈跳次數用盡後貼地
 */
import { DEATH_KNOCKBACK } from '../../../constants';

export interface DeathOffset {
    /** 水平位移（世界座標單位） */
    x: number;
    y: number;
    /** 離地高度（螢幕上為往上；>= 0） */
    lift: number;
}

export function computeDeathOffset(vx: number, vy: number, vz: number, t: number): DeathOffset {
    if (!(t > 0)) return { x: 0, y: 0, lift: 0 };
    const k = DEATH_KNOCKBACK.SLIDE_DECAY;

    // 水平：s(t) = v/k * (1 - e^{-kt})，總位移（長度）限制於 MAX_SLIDE
    const slide = (1 - Math.exp(-k * t)) / k;
    let x = vx * DEATH_KNOCKBACK.SPEED_SCALE * slide;
    let y = vy * DEATH_KNOCKBACK.SPEED_SCALE * slide;
    const len = Math.hypot(x, y);
    if (len > DEATH_KNOCKBACK.MAX_SLIDE) {
        const s = DEATH_KNOCKBACK.MAX_SLIDE / len;
        x *= s;
        y *= s;
    }

    // 垂直：連續彈跳
    const g = DEATH_KNOCKBACK.GRAVITY;
    let v = Math.max(0, vz) * DEATH_KNOCKBACK.VZ_SCALE;
    let remaining = t;
    let lift = 0;
    for (let i = 0; i <= DEATH_KNOCKBACK.BOUNCES && v > 0; i++) {
        const airTime = (2 * v) / g;
        if (remaining < airTime) {
            lift = v * remaining - 0.5 * g * remaining * remaining;
            break;
        }
        remaining -= airTime;
        v *= DEATH_KNOCKBACK.RESTITUTION;
    }

    return { x, y, lift: Math.max(0, lift) };
}
