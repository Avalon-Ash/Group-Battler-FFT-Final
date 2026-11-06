// ╔══════════════════════════════════════════════════════════╗
// ║ StatusPresentationSystem — 固定 receipt 的執行期唯一寫者。║
// ║ [ARCH] VisualSystem 先派發；只複製純量，不保存池事件。    ║
// ║ live remaining 失效即隱藏；初始化／重設由 ViewCommands。 ║
// ╚══════════════════════════════════════════════════════════╝
import { STATUS_CHANGE, type GameEvent, type StatusOrigin } from '../../types';
import type { Agent } from '../core/Agent';
import { EFFECT_KINDS } from '../core/Effects';

function clear(origin: StatusOrigin): void {
    origin.recorded = false;
    origin.sourceId = null;
    origin.sourceSide = null;
    origin.skillId = null;
    origin.skillName = null;
    origin.element = null;
}
function copy(origin: StatusOrigin, event: GameEvent): void {
    origin.recorded = true;
    origin.sourceId = event.sourceId ?? null;
    origin.sourceSide = event.sourceSide ?? null;
    origin.skillId = event.skillId ?? null;
    origin.skillName = event.skillName ?? null;
    origin.element = event.element ?? null;
}

export class StatusPresentationSystem {
    static process(event: GameEvent, agents: readonly Agent[]): void {
        const agentId = event.type === 'CAST_BREAK' ? event.sourceId : event.targetId;
        if (!agentId) return;
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;
        const state = agent.view.statusPresentation;
        if (event.type === 'CAST_BREAK') state.feedback.kind = 'INTERRUPTED';
        if (event.removedKindMask !== undefined) {
            state.feedback.removedMask = event.removedKindMask;
            for (let i = 0; i < EFFECT_KINDS.length; i++) {
                if ((event.removedKindMask & (1 << i)) === 0) continue;
                const receipt = state.effects[EFFECT_KINDS[i]];
                clear(receipt.duration);
                clear(receipt.value);
                clear(receipt.variant);
            }
        }
        if (event.feedbackKind) state.feedback.kind = event.feedbackKind;
        if (event.grantedAmount !== undefined) {
            copy(state.shieldGrant.origin, event);
            state.shieldGrant.grantedAmount = event.grantedAmount;
        }
        if (!event.effectKind || event.statusChanges === undefined || event.statusResult === 'IMMUNE') return;
        const receipt = state.effects[event.effectKind];
        if (event.statusNew) {
            clear(receipt.duration);
            clear(receipt.value);
            clear(receipt.variant);
        }
        if (event.statusChanges & STATUS_CHANGE.DURATION) copy(receipt.duration, event);
        if (event.statusChanges & STATUS_CHANGE.VALUE) copy(receipt.value, event);
        if (event.statusChanges & STATUS_CHANGE.VARIANT) copy(receipt.variant, event);
    }
}
