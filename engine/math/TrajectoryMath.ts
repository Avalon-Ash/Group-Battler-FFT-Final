
import { Point3D } from "./VisualMath";
import { MAX_ARC_HEIGHT } from "../../constants";

export type { Point3D };

export interface TrajectoryConfig {
    type: 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT' | 'HOVER_DIP';
    arcHeight?: number;
    wobbleFreq?: number;
    wobbleAmp?: number;
    dipAmount?: number;
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

    /**
     * 根據水平距離自動計算合適的弧高：越近飛越低
     * 以 300 像素(約 3 格) 為基準距離達到 baseH
     */
    adaptiveArcHeight(start: Point3D, end: Point3D, baseH: number): number {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 確保最近距離也有一點點弧度 (例如 baseH * 0.15)
        const minH = baseH * 0.15;
        // 每個距離單位等比例放大弧高
        const ratio = dist / 300;
        const targetH = minH + baseH * ratio;
        
        return Math.min(targetH, MAX_ARC_HEIGHT);
    },

    parabolic: (start: Point3D, end: Point3D, t: number, h: number): Point3D => {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        const linearZ = start.z * (1 - t) + end.z * t;
        // 拋物線高度公式: 4h * t * (1-t)
        const arcZ = 4 * h * t * (1 - t);
        return { x, y, z: linearZ + arcZ };
    },

    /**
     * 直線飛行但帶有微弱重力感：飛行前 40% 微微下沉，後 60% 拉平
     * 下沉幅度 = dipAmount（預設 20px Z軸）
     * 模擬初速大、重力小的輕型投射物感
     */
    hoverDip: (start: Point3D, end: Point3D, t: number, dip: number = 20): Point3D => {
        const base = TrajectoryMath.linear(start, end, t);
        // 前段下沉曲線：在 t=0.2 時達到最低點
        const dipZ = t < 0.4
            ? -dip * 4 * (t / 0.4) * (1 - t / 0.4)
            : 0;
        return { x: base.x, y: base.y, z: base.z + dipZ };
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
            const adaptedH = TrajectoryMath.adaptiveArcHeight(
                start, end, config.arcHeight || 150
            );
            return TrajectoryMath.parabolic(start, end, t, adaptedH);
        }
        if (config.type === 'HOVER_DIP') {
            return TrajectoryMath.hoverDip(
                start, end, t, config.dipAmount || 20
            );
        }
        if (config.type === 'WOBBLE') {
            return TrajectoryMath.wobble(start, end, t, config.wobbleAmp || 15, config.wobbleFreq || 2);
        }
        return TrajectoryMath.linear(start, end, t);
    }
};
