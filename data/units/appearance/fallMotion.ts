import { UNIT_BODY_MOTION } from "../../../constants";

/**
 * 墜落進度 0..1（縮圈塌陷時活著的單位往下掉，physics.z < 0）。純函式，只供繪製端使用（UnitBodyPainter、UnitRenderSystem.drawAssembly）。
 * 模擬端（PhysicsEngine）在地面消失時才讓 z 變負；站在有效地面上 z 一律 ≥ 0。
 */
export function unitFallProgress(z: number): number {
    if (!(z < 0)) return 0;
    return Math.min(1, -z / UNIT_BODY_MOTION.fallFadeDepth);
}

/** 墜落時整組（影子、本體、核心）的不透明度倍率 */
export function unitFallAlpha(progress: number): number {
    return 1 - Math.pow(progress, UNIT_BODY_MOTION.fallFadePow);
}
