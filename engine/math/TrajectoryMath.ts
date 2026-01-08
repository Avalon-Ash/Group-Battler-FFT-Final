
import { Point3D } from "./VisualMath";

export { Point3D };

export interface TrajectoryConfig {
    type: 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT';
    arcHeight?: number;
    wobbleFreq?: number;
    wobbleAmp?: number;
}

/**
 * 飛行幾何真理庫 v16.0 - Pure 3D Kinematics
 * 只負責計算 3D 空間中的點 (x, y, z)，絕不處理螢幕投影。
 */
export const TrajectoryMath = {
    
    linear: (start: Point3D, end: Point3D, t: number): Point3D => {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t
        };
    },

    parabolic: (start: Point3D, end: Point3D, t: number, h: number): Point3D => {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        const linearZ = start.z * (1 - t) + end.z * t;
        // 拋物線高度公式: 4h * t * (1-t)
        const arcZ = 4 * h * t * (1 - t);
        return { x, y, z: linearZ + arcZ };
    },

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
     * SSOT: 唯一軌跡計算入口
     */
    evaluate: (config: TrajectoryConfig, start: Point3D, end: Point3D, t: number): Point3D => {
        if (config.type === 'ARC') {
            return TrajectoryMath.parabolic(start, end, t, config.arcHeight || 150);
        }
        if (config.type === 'WOBBLE') {
            return TrajectoryMath.wobble(start, end, t, config.wobbleAmp || 15, config.wobbleFreq || 2);
        }
        return TrajectoryMath.linear(start, end, t);
    }
};
