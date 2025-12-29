
import { Point } from "../../types";

export interface Point3D { x: number; y: number; z: number; }

/**
 * 飛行幾何真理庫 v14.0 - Analytic Ballistics
 */
export const TrajectoryMath = {
    
    /**
     * 線性插值座標 (解析解)
     */
    linear: (start: Point3D, end: Point3D, t: number): Point3D => {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t
        };
    },

    /**
     * 解析拋物線 (Parabolic Arc)
     * 計算在進度 t 時的 3D 座標，h 為頂點拱高
     */
    parabolic: (start: Point3D, end: Point3D, t: number, h: number): Point3D => {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        const linearZ = start.z * (1 - t) + end.z * t;
        // 拋物線高度公式: 4h * t * (1-t)
        const arcZ = 4 * h * t * (1 - t);
        return { x, y, z: linearZ + arcZ };
    },

    /**
     * 螺旋擺動軌跡 (Wobble Path)
     */
    wobble: (start: Point3D, end: Point3D, t: number, amp: number, freq: number): Point3D => {
        const base = TrajectoryMath.linear(start, end, t);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return base;

        // 計算垂直於運動方向的法線向量
        const nx = -dy / dist;
        const ny = dx / dist;
        const wave = Math.sin(t * Math.PI * 2 * freq) * amp;

        return {
            x: base.x + nx * wave,
            y: base.y + ny * wave,
            z: base.z + Math.cos(t * Math.PI * 2 * freq) * amp * 0.5
        };
    },

    /**
     * 計算解析解在一階導數下的切向角
     * 會考慮 Z 軸變化對等角投影 (Y 軸壓縮) 的視覺影響
     */
    getProjectedAngle: (func: (t: number) => Point3D, t: number, isoScaleY: number): number => {
        const eps = 0.01;
        const p1 = func(t);
        const p2 = func(Math.min(1.0, t + eps));
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;

        // 視覺 Y 變化量 = (物理 Y * ISO 壓縮) - 高度變化 Z
        const vy = dy * isoScaleY - dz;
        return Math.atan2(vy, dx);
    }
};
