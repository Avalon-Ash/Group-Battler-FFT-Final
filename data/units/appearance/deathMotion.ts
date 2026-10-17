/**
 * 死亡擊飛位移（純函式）。
 * 渲染器無狀態：位移完全由「死亡後經過時間 t」與 Ragdoll 軀幹的初速（impact 方向）決定，
 * 不需任何額外的狀態或物理積分。
 *  - 水平：指數衰減滑行（先快後慢，距離有上限）
 *  - 垂直：拋物線彈跳，每次彈跳高度依恢復係數遞減，彈跳次數用盡後貼地
 */
import { DEATH_KNOCKBACK, PHYSICS } from '../../../constants';

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

export interface DeathGroundQuery {
    /** 世界座標所在的格子 */
    hexAt(x: number, y: number): { q: number; r: number };
    /** 該格是否仍有地面（存在或正在墜落的地塊） */
    hasGround(q: number, r: number): boolean;
    /** 該格地面高度（SSOT：VisualMath.getUnitGroundHeight 的格高度來源） */
    heightAt(q: number, r: number): number;
}

/**
 * 屍體腳下的地面高度（純函式，渲染層無狀態）。
 * 擊飛滑行的終點是繪製位移，物理不知道屍體移動了。屍體滑到的格子：
 *  - 有地面：高度跟著該格地面（較高／較低都一樣）
 *  - 已塌陷（虛空）：從滑出地塊的那一刻起以重力墜落（`PHYSICS.GRAVITY`），回收仍走原本的死亡計時
 * 滑出地塊的時間用滑行軌跡以固定間隔取樣求得；只要軌跡曾經過虛空就視為已掉落。
 */
export function computeDeathGround(
    baseX: number, baseY: number,
    vx: number, vy: number, vz: number,
    t: number,
    q: DeathGroundQuery
): { height: number; fellAt: number | null } {
    const end = Math.min(t, DEATH_KNOCKBACK.GROUND_SCAN_END);
    let lastGround = 0;
    let haveGround = false;
    for (let ti = 0; ti <= end; ti += DEATH_KNOCKBACK.GROUND_SCAN_STEP) {
        const o = computeDeathOffset(vx, vy, vz, ti);
        const hex = q.hexAt(baseX + o.x, baseY + o.y);
        if (q.hasGround(hex.q, hex.r)) {
            lastGround = q.heightAt(hex.q, hex.r);
            haveGround = true;
        } else if (haveGround) {
            const fall = t - ti;
            return { height: lastGround - 0.5 * PHYSICS.GRAVITY * fall * fall, fellAt: ti };
        } else {
            // 死亡當下腳下就沒有地面（物理已讓它自由落體）：維持原樣，不另外處理
            return { height: 0, fellAt: null };
        }
    }
    const o = computeDeathOffset(vx, vy, vz, t);
    const hex = q.hexAt(baseX + o.x, baseY + o.y);
    if (q.hasGround(hex.q, hex.r)) return { height: q.heightAt(hex.q, hex.r), fellAt: null };
    const fall = Math.max(0, t - end);
    return { height: lastGround - 0.5 * PHYSICS.GRAVITY * fall * fall, fellAt: end };
}
