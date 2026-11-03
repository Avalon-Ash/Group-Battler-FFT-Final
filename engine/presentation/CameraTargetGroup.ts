// ╔══════════════════════════════════════════════════════════╗
// ║  CameraTargetGroup — 導播的取景群組                      ║
// ║  職責：成員依鍵值保存；權重緩升緩降，離開後多留一段時間，  ║
// ║        再由權重算出重心與縮放。                           ║
// ║  [ARCH] 成員不會瞬間出現或消失，權重也決定它能把鏡頭拉多  ║
// ║  遠，所以施法者收招時目標縮放不會跳。低權重的遠方成員不能  ║
// ║  單獨決定縮放。                                           ║
// ╚══════════════════════════════════════════════════════════╝

import { UI_SETTINGS, CAMERA_PARAM, DIRECTOR_PARAM } from "../../constants";

interface Member {
    px: number;
    py: number;
    radius: number;
    /** 目前權重（緩動中） */
    weight: number;
    /** 想要的權重（本 tick 沒人要時保留，直到 linger 用完） */
    desired: number;
    linger: number;
    wanted: boolean;
}

export class CameraTargetGroup {
    private members = new Map<string, Member>();

    public get size(): number { return this.members.size; }

    public clear() { this.members.clear(); }

    /** 這個 tick 要這個成員；同一個鍵要多次時取最高權重 */
    public want(key: string, px: number, py: number, weight: number, radius: number) {
        const m = this.members.get(key);
        if (!m) {
            // 群組是空的時第一個成員直接到位：沒有別人可以緩過來
            const start = this.members.size === 0 ? weight : 0;
            this.members.set(key, { px, py, radius, weight: start, desired: weight, linger: DIRECTOR_PARAM.LINGER_S, wanted: true });
            return;
        }
        m.px = px;
        m.py = py;
        if (m.wanted) {
            if (weight >= m.desired) { m.desired = weight; m.radius = radius; }
            return;
        }
        m.radius = radius;
        m.desired = weight;
        m.linger = DIRECTOR_PARAM.LINGER_S;
        m.wanted = true;
    }

    /** 推進權重；want 全部呼叫完才呼叫 */
    public advance(dt: number) {
        const up = dt / DIRECTOR_PARAM.WEIGHT_IN_S;
        const down = dt / DIRECTOR_PARAM.WEIGHT_OUT_S;
        for (const [key, m] of this.members) {
            if (!m.wanted) {
                m.linger -= dt;
                if (m.linger <= 0) m.desired = 0;
            }
            m.wanted = false;
            m.weight = m.weight < m.desired
                ? Math.min(m.desired, m.weight + up)
                : Math.max(m.desired, m.weight - down);
            if (m.desired === 0 && m.weight <= 0) this.members.delete(key);
        }
    }

    public solve(screenW: number, screenH: number, paddingFactor: number = CAMERA_PARAM.GROUP_PADDING_FACTOR):
        { x: number, y: number, zoom: number } {

        // 1. 加權重心
        let totalWeight = 0, maxWeight = 0, cx = 0, cy = 0;
        for (const m of this.members.values()) {
            cx += m.px * m.weight;
            cy += m.py * m.weight;
            totalWeight += m.weight;
            maxWeight = Math.max(maxWeight, m.weight);
        }
        if (totalWeight <= 0) return { x: 0, y: 0, zoom: CAMERA_PARAM.GROUP_DEFAULT_ZOOM };
        cx /= totalWeight;
        cy /= totalWeight;

        // 2. 包圍半徑：每個成員的邊緣距離重心，依權重打折
        const fullInfluence = Math.min(DIRECTOR_PARAM.FULL_INFLUENCE_WEIGHT, maxWeight);
        let maxRadius = 0;
        for (const m of this.members.values()) {
            const influence = Math.min(1, m.weight / fullInfluence);
            maxRadius = Math.max(maxRadius, (Math.hypot(m.px - cx, m.py - cy) + m.radius) * influence);
        }

        // 3. 換算 zoom：讓 maxRadius 剛好填滿畫面較短邊的一半；paddingFactor 越大鏡頭拉越遠
        const minDim = Math.min(screenW, screenH);
        const zoom = maxRadius > 0
            ? (minDim * 0.5) / (maxRadius * paddingFactor)
            : CAMERA_PARAM.GROUP_DEFAULT_ZOOM;

        return { x: cx, y: cy, zoom: Math.max(UI_SETTINGS.CAMERA_ZOOM.directorMin, Math.min(UI_SETTINGS.CAMERA_ZOOM.directorMax, zoom)) };
    }
}
