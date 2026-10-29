// ╔══════════════════════════════════════════════════════════╗
// ║  HitCadence — 多段命中的時間偏移（docs/MULTI_HIT_DESIGN.md）║
// ║  職責：skill.hits 第 i 段相對第 0 段的秒數，純函式、無狀態   ║
// ║  上游：MultiHitScheduler（何時呼叫 resolveHit）、SkillSequences ║
// ║        與 ult_visuals（畫面落點何時播）都只讀這裡             ║
// ║  [ARCH] 傷害時間與畫面落點的唯一來源：節奏參數在               ║
// ║         COMBAT_PARAM.HIT_CLUSTER_*，各招的節奏選擇在技能資料   ║
// ║         skill.hits.cadence；不改任何座標／排序規則。           ║
// ╚══════════════════════════════════════════════════════════╝

import { COMBAT_PARAM } from '../../constants';
import type { SkillHits } from '../../types';

/**
 * 第 index 段（0 起算）距第 0 段的秒數。
 * - EVEN：index × interval。
 * - ACCEL：總長維持 (count−1) × interval，間隔由大到小（ease-out，越打越密）。
 * - CLUSTER：每 HIT_CLUSTER_SIZE 段一組，組間隔 interval × GAP_MULT、組內 interval × INTRA_MULT。
 */
export function hitOffset(hits: SkillHits, index: number): number {
    switch (hits.cadence) {
        case 'ACCEL': {
            const span = (hits.count - 1) * hits.interval;
            const u = hits.count > 1 ? index / (hits.count - 1) : 0;
            return (1 - (1 - u) * (1 - u)) * span;
        }
        case 'CLUSTER': {
            const group = Math.floor(index / COMBAT_PARAM.HIT_CLUSTER_SIZE);
            const intra = index % COMBAT_PARAM.HIT_CLUSTER_SIZE;
            return group * hits.interval * COMBAT_PARAM.HIT_CLUSTER_GAP_MULT + intra * hits.interval * COMBAT_PARAM.HIT_CLUSTER_INTRA_MULT;
        }
        default:
            return index * hits.interval;
    }
}

/** 全部 count 段的時間偏移（秒，第 0 段為 0）。 */
export function hitOffsets(hits: SkillHits): number[] {
    const out: number[] = [];
    for (let i = 0; i < hits.count; i++) out.push(hitOffset(hits, i));
    return out;
}
