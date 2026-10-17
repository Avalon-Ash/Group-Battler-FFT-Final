// ╔══════════════════════════════════════════════════════════╗
// ║  Afterimage — 衝刺／高速移動殘影的位置換算（純函式）       ║
// ║  職責：把 Agent.trailHistory 的世界座標點，換算成「相對於    ║
// ║        單位目前腳底繪製點」的局部偏移與不透明度              ║
// ║  上游：UnitFrame.fill（呼叫，傳入繪製用高度）、             ║
// ║        UnitAfterimagePainter（消費偏移並畫殘影）            ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §10。      ║
// ║  局部座標原點＝單位目前腳底繪製點（UnitSystem.drawAssembly   ║
// ║  的 translate）：dx＝殘影腳點 x − footX；dy＝殘影腳底繪製 Y  ║
// ║  − 單位 floorY。殘影腳下高度由呼叫端傳入的繪製用高度函式    ║
// ║  取得（已含漂浮位移），所以本檔不呼叫任何地形函式。          ║
// ║  這裡沒有狀態、沒有分配（輸出寫進呼叫端預先配置的槽位）。   ║
// ╚══════════════════════════════════════════════════════════╝

import { AFTERIMAGE, VFX_PARAM } from "../../../constants";

/** Agent.trailHistory 的一點（世界座標；z＝physics.z；h＝記錄當下的模擬地形高度，殘影不用） */
export interface TrailPoint { x: number; y: number; z: number; h: number }

/** 一個殘影：相對單位目前腳底繪製點的偏移 */
export interface AfterimageGhost {
    /** 殘影腳點 x − 單位腳點 x */
    dx: number;
    /** 殘影腳底繪製 Y − 單位腳底繪製 Y（floorY）；尚未扣 physics.z */
    dy: number;
    /** 殘影當時的 physics.z */
    z: number;
    alpha: number;
}

export function createGhostSlots(): AfterimageGhost[] {
    const slots: AfterimageGhost[] = [];
    for (let i = 0; i < AFTERIMAGE.MAX_GHOSTS; i++) slots.push({ dx: 0, dy: 0, z: 0, alpha: 0 });
    return slots;
}

/**
 * 把軌跡換算成殘影，由近到遠寫進 out，回傳殘影個數（0＝不畫）。
 * @param speedSq   單位目前的物理速度平方（低於 VFX_PARAM.SPEED_TILT_THRESHOLD 不產生殘影）
 * @param groundAt  世界座標 (x, y) → 繪製用地面高度（腳下格的 renderHeightAt；含漂浮位移）
 */
export function computeAfterimageGhosts(
    out: AfterimageGhost[],
    trail: readonly TrailPoint[],
    speedSq: number,
    footX: number,
    footY: number,
    groundH: number,
    groundAt: (x: number, y: number) => number
): number {
    if (speedSq <= VFX_PARAM.SPEED_TILT_THRESHOLD * VFX_PARAM.SPEED_TILT_THRESHOLD) return 0;
    const floorY = footY - groundH;
    const minSepSq = AFTERIMAGE.MIN_SEPARATION_PX * AFTERIMAGE.MIN_SEPARATION_PX;
    let n = 0;
    // 與本體、與前一個殘影都要隔開（懸停的飛行單位軌跡全擠在同一點，不能疊成一團）
    let lastX = footX, lastY = footY;
    for (let k = 1; n < out.length; k++) {
        const i = trail.length - 1 - k * AFTERIMAGE.STRIDE;
        if (i < 0) break;
        const p = trail[i];
        const ex = p.x - lastX;
        const ey = p.y - lastY;
        if (ex * ex + ey * ey < minSepSq) continue;
        const sx = p.x - footX;
        const sy = p.y - footY;
        const g = out[n];
        g.dx = sx;
        g.dy = (p.y - groundAt(p.x, p.y)) - floorY;
        g.z = p.z;
        g.alpha = AFTERIMAGE.ALPHA_NEAREST * (1 - n / AFTERIMAGE.MAX_GHOSTS);
        lastX = p.x; lastY = p.y;
        n++;
    }
    return n;
}
