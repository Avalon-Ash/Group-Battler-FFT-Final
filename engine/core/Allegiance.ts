// ╔══════════════════════════════════════════════════════════╗
// ║  Allegiance — 敵我判斷的唯一入口                          ║
// ║  職責：比較兩個單位／危害區／投射物是不是同一陣營（side）    ║
// ║  上游：Agent.side（建立時等於 team；大逃殺時每人一個）       ║
// ║  [ARCH] team 只管外觀與技能組；敵我、勝負一律看 side         ║
// ╚══════════════════════════════════════════════════════════╝

/** 有陣營的東西：Agent、SpatialHazard、Projectile */
export interface HasSide {
    side: number;
}

export function sameSide(a: HasSide, b: HasSide): boolean {
    return a.side === b.side;
}
