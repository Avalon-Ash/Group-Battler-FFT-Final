import { BodyTypeId, BodyTypeProfile } from '../../../types';

/**
 * BODY_TYPE_PROFILE (SSOT)
 * 定義單位體型外觀軸之基礎設定、縮放、偏移與回退鏈。
 * 當前僅 MALE 具備 3D 預渲染精靈素材，FEMALE 登記為 enabled: false，預設回退至 MALE。
 */
export const BODY_TYPE_PROFILE: Record<BodyTypeId, BodyTypeProfile> = {
    MALE: {
        label: '男',
        enabled: true,
        heightScale: 1.0,
        shadowScale: 1.0,
        anchorYOffset: 0,
        fallback: null
    },
    FEMALE: {
        label: '女',
        enabled: false,
        heightScale: 1.0,
        shadowScale: 1.0,
        anchorYOffset: 0,
        fallback: 'MALE'
    }
};

/**
 * 體型生成權重（設計師可調，僅對 enabled: true 的體型生效）
 */
export const BODY_TYPE_SPAWN = {
    weights: {
        MALE: 1,
        FEMALE: 0
    } as Record<BodyTypeId, number>
};

/**
 * pickBodyType(agentId: string, matchSalt: number) -> BodyTypeId
 * 純函式、確定性雜湊（FNV-1a 32-bit）。
 * 不消耗模擬專用的 random() 序列，禁止使用 Math.random()。
 * 支援注入 profiles 與 weights 供單元測試覆蓋多體型分佈。
 */
export function pickBodyType(
    agentId: string,
    matchSalt: number,
    profiles: Record<BodyTypeId, { enabled: boolean }> = BODY_TYPE_PROFILE,
    weights: Record<BodyTypeId, number> = BODY_TYPE_SPAWN.weights
): BodyTypeId {
    const candidates: { id: BodyTypeId; weight: number }[] = [];
    let totalWeight = 0;

    const keys = Object.keys(profiles) as BodyTypeId[];
    for (const key of keys) {
        if (profiles[key]?.enabled && (weights[key] ?? 0) > 0) {
            const w = weights[key];
            candidates.push({ id: key, weight: w });
            totalWeight += w;
        }
    }

    if (candidates.length === 0 || totalWeight <= 0) {
        return 'MALE';
    }

    // FNV-1a 32-bit 雜湊
    const seedStr = `${agentId}:${matchSalt}`;
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        hash ^= seedStr.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const u32 = hash >>> 0;
    const norm = u32 / 4294967296;

    let target = norm * totalWeight;
    for (const c of candidates) {
        if (target < c.weight) {
            return c.id;
        }
        target -= c.weight;
    }
    return candidates[candidates.length - 1].id;
}

/**
 * resolveBodyType(agent) -> BodyTypeId
 * 解析 Agent 當前有效體型。未指定時預設 MALE；若指定之體型未啟用，沿 fallback 鏈退回。
 */
export function resolveBodyType(
    agent: { bodyType?: BodyTypeId } | null | undefined,
    profiles: Record<BodyTypeId, { enabled: boolean; fallback: BodyTypeId | null }> = BODY_TYPE_PROFILE
): BodyTypeId {
    let current: BodyTypeId = agent?.bodyType ?? 'MALE';
    const visited = new Set<BodyTypeId>();

    while (!profiles[current]?.enabled) {
        if (visited.has(current)) {
            return 'MALE';
        }
        visited.add(current);
        const fb = profiles[current]?.fallback;
        if (!fb) {
            return 'MALE';
        }
        current = fb;
    }

    return current;
}
