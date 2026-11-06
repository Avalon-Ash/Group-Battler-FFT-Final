// ╔══════════════════════════════════════════════════════════╗
// ║ views/status — 選取單位的 10Hz 純資料快照。              ║
// ║ [ARCH] 無變更回傳原參考，不對 React 暴露 live slot。     ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import type { StatusOrigin } from '../../../../types';
import type { StatusRowView, UnitStatusView } from '../../../../types/ui/status';
import { STATUS_DISPLAY, STATUS_TIME_STEPS } from '../../../../data/status/status_display';
import { EFFECT_KINDS } from '../../../core/Effects';
import { statusAvailability, statusDisplayKey, statusProgress } from '../../../core/StatusQueries';

const caches = new WeakMap<GameEngine, WeakMap<object, { signature: string; view: UnitStatusView }>>();
const unknown: Readonly<StatusOrigin> = { recorded: false, sourceId: null, sourceSide: null, skillId: null, skillName: null, element: null };
const seconds = (value: number): number => Math.ceil(value * STATUS_TIME_STEPS) / STATUS_TIME_STEPS;

function sourceView(origin: Readonly<StatusOrigin>, engine: GameEngine): StatusRowView['durationSource'] {
    const source = origin.sourceId === null ? undefined : engine.agents.find(a => a.id === origin.sourceId);
    const availability = origin.sourceId === null ? 'UNKNOWN' : source ? statusAvailability(source) : 'LEFT';
    const summary = origin.sourceId === null ? '來源未記錄' : origin.sourceId + (availability === 'ACTIVE' ? '' : '（已離場）');
    return { ...origin, availability, canSelect: availability === 'ACTIVE', summary,
        detail: summary + ' / SIDE ' + (origin.sourceSide ?? '?') + ' / ' + (origin.skillName ?? origin.skillId ?? '技能未記錄') };
}

export function selectUnitStatusView(engine: GameEngine, agentId: string | null | undefined, referenceSide: number | null = engine.director.getWatchSide(engine)): UnitStatusView | null {
    if (!agentId) return null;
    const agent = engine.agents.find(a => a.id === agentId);
    if (!agent) return null;
    let signature = `${agent.side}|${referenceSide}|${statusAvailability(agent)}|${agent.ccVisual}|${agent.shield}|${agent.maxShield}`;
    for (const kind of EFFECT_KINDS) {
        const slot = agent.effects[kind];
        if (slot.remaining <= 0) continue;
        signature += `|${kind}:${seconds(slot.remaining)}:${seconds(slot.max)}:${slot.value}:${slot.tag}:${slot.sourceId}`;
        const receipt = agent.view.statusPresentation.effects[kind];
        for (const origin of [receipt.duration, receipt.value, receipt.variant]) {
            const source = origin.sourceId === null ? undefined : engine.agents.find(a => a.id === origin.sourceId);
            signature += JSON.stringify(origin) + (source ? statusAvailability(source) : 'LEFT');
        }
        if (slot.sourceId !== null) {
            const source = engine.agents.find(a => a.id === slot.sourceId);
            signature += source ? statusAvailability(source) : 'LEFT';
        }
    }
    if (agent.shield > 0) {
        const shield = agent.view.statusPresentation.shieldGrant;
        const source = engine.agents.find(a => a.id === shield.origin.sourceId);
        signature += JSON.stringify(shield) + (source ? statusAvailability(source) : 'LEFT');
    }
    let cache = caches.get(engine);
    if (!cache) { cache = new WeakMap(); caches.set(engine, cache); }
    signature += JSON.stringify(agent.drStacks) + JSON.stringify(Object.fromEntries(Object.entries(agent.drTimers).map(([key, value]) => [key, seconds(value)])));
    const prev = cache.get(agent);
    if (prev && prev.signature === signature) return prev.view;
    const effects: StatusRowView[] = [];
    for (const kind of [...EFFECT_KINDS, 'SHIELD'] as const) {
        const key = kind === 'SHIELD' ? (agent.shield > 0 ? 'SHIELD' : null) : statusDisplayKey(kind, agent);
        if (key === null) continue;
        const descriptor = STATUS_DISPLAY[key];
        const slot = kind === 'SHIELD' ? null : agent.effects[kind];
        const receipt = kind === 'SHIELD' ? null : agent.view.statusPresentation.effects[kind];
        // Only TAUNT/DOT sourceId is an actual known source without observations (SLOW rewrites it even on ignored applications).
        const legacy = slot && (kind === 'TAUNT' || kind === 'DOT') && slot.sourceId !== null
            ? { ...unknown, sourceId: slot.sourceId } : unknown;
        let durationOrigin: Readonly<StatusOrigin> = receipt?.duration.recorded ? receipt.duration : legacy;
        const valueOrigin = kind === 'SHIELD' ? agent.view.statusPresentation.shieldGrant.origin
            : receipt?.value.recorded ? receipt.value : legacy;
        // TAUNT's actual combat target always wins over an old receipt.
        if (kind === 'TAUNT' && slot && durationOrigin.sourceId !== slot.sourceId) durationOrigin = legacy;
        const durationSource = sourceView(durationOrigin, engine);
        const valueSource = sourceView(valueOrigin, engine);
        const primary = kind === 'SHIELD' ? valueSource : durationSource;
        const remainingSeconds = slot ? seconds(slot.remaining) : null;
        const maxSeconds = slot ? seconds(slot.max) : null;
        const rawProgress = maxSeconds > 0 ? remainingSeconds / maxSeconds : statusProgress(key, agent);
        const progress = Math.max(0, Math.min(1, rawProgress));
        const valueText = kind === 'SHIELD' ? `${Math.round(agent.shield)}` : slot && (kind === 'DOT' || kind === 'HOT') ? `${slot.value}/s`
            : slot && ['SLOW', 'HASTE', 'REFLECT', 'LIFESTEAL'].includes(kind) ? `${slot.value}` : '';
        const sourceSummary = primary.summary;
        effects.push({
            id: `${agent.id}:${kind}`, kind, displayKey: key, label: descriptor.label, category: descriptor.category,
            remainingSeconds, maxSeconds, progress, valueText, stacks: null, sourceSummary, durationSource, valueSource,
            sourceSkill: primary.skillId === null ? null : { id: primary.skillId, name: primary.skillName },
            sourceAvailability: primary.availability,
            primarySource: primary,
            group: descriptor.category === 'HARD_CC' ? 'CONTROL' : descriptor.category === 'BUFF' || descriptor.category === 'HOT' ? 'RECOVERY & PROTECT' : 'DAMAGE & WEAKEN',
            timeText: remainingSeconds === null ? valueText : (remainingSeconds >= 10 ? Math.ceil(remainingSeconds).toFixed(0) : remainingSeconds.toFixed(1)) + 's',
            timeDetail: remainingSeconds === null ? '消耗型；無固定期限' : remainingSeconds.toFixed(1) + ' / ' + maxSeconds.toFixed(1) + 's' + (valueText ? ' / ' + valueText : ''),
            detailLines: kind === 'SHIELD' && valueSource.recorded ? [descriptor.description, `最近 +${agent.view.statusPresentation.shieldGrant.grantedAmount}；${sourceSummary}`] : [descriptor.description],
        });
    }
    effects.sort((a, b) => STATUS_DISPLAY[a.displayKey].priority - STATUS_DISPLAY[b.displayKey].priority);
    const view: UnitStatusView = {
        agentId: agent.id, side: agent.side, referenceSide,
        relation: referenceSide === null ? 'UNALIGNED' : referenceSide === agent.side ? 'ALLY' : 'ENEMY',
        availability: statusAvailability(agent), effects,
        availabilityText: { ACTIVE: '在場', BANISHED: '暫時離場', OUT_OF_BOUNDS: '已出界', DEAD: '單位已陣亡' }[statusAvailability(agent)],
        relationLabel: referenceSide === null ? null : referenceSide === agent.side ? 'ALLY' : 'ENEMY',
        noticeText: statusAvailability(agent) === 'ACTIVE' ? null : { BANISHED: '暫時離場', OUT_OF_BOUNDS: '已出界', DEAD: '單位已陣亡' }[statusAvailability(agent)],
        resistance: Object.entries(agent.drStacks).filter(([key, stacks]) => stacks > 0 && agent.drTimers[key] > 0)
            .map(([key, stacks]) => key.toUpperCase() + ' / DR ' + stacks + ' / ' + seconds(agent.drTimers[key]).toFixed(1) + 's'),
    };
    cache.set(agent, { signature, view });
    return view;
}
