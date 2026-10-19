
export interface CameraTarget {
    px: number;
    py: number;
    weight: number;
    radius: number;
}

export class CameraTargetGroup {
    private targets: CameraTarget[] = [];

    public clear() { this.targets = []; }

    public add(px: number, py: number, weight: number, radius: number) {
        this.targets.push({ px, py, weight, radius });
    }

    public solve(screenW: number, screenH: number, paddingFactor: number = 1.25):
        { x: number, y: number, zoom: number } {

        if (this.targets.length === 0) return { x: 0, y: 0, zoom: 0.9 };

        // 1. 加權重心
        let totalWeight = 0, cx = 0, cy = 0;
        for (const t of this.targets) {
            cx += t.px * t.weight;
            cy += t.py * t.weight;
            totalWeight += t.weight;
        }

        if (totalWeight > 0) {
            cx /= totalWeight;
            cy /= totalWeight;
        } else {
            // 所有 weight 為 0 則取算術平均
            for (const t of this.targets) {
                cx += t.px;
                cy += t.py;
            }
            cx /= this.targets.length;
            cy /= this.targets.length;
        }

        // 2. 包圍框半徑（每個目標的邊緣距離重心）
        let maxRadius = 0;
        for (const t of this.targets) {
            const dx = t.px - cx;
            const dy = t.py - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            maxRadius = Math.max(maxRadius, dist + t.radius);
        }

        // 3. 換算 zoom：讓 maxRadius 剛好填滿畫面較短邊的一半
        const minDim = Math.min(screenW, screenH);
        // paddingFactor 越大，鏡頭拉越遠 (縮放倍率越小)
        const zoom = maxRadius > 0
            ? (minDim * 0.5) / (maxRadius * paddingFactor)
            : 0.9;

        return { x: cx, y: cy, zoom: Math.max(0.45, Math.min(2.0, zoom)) };
    }
}
