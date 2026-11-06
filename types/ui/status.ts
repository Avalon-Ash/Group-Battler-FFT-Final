import type { EffectKind, StatusOrigin } from '../../types';
import type { STATUS_DISPLAY, StatusDisplayKey } from '../../data/status/status_display';

export type StatusAvailability = 'ACTIVE' | 'BANISHED' | 'OUT_OF_BOUNDS' | 'DEAD';
interface StatusSourceView extends Readonly<StatusOrigin> {
    readonly availability: StatusAvailability | 'UNKNOWN' | 'LEFT';
    readonly canSelect: boolean;
    readonly summary: string;
    readonly detail: string;
}
export interface StatusRowView {
    readonly id: string;
    readonly kind: EffectKind | 'SHIELD';
    readonly displayKey: StatusDisplayKey;
    readonly label: string;
    readonly category: (typeof STATUS_DISPLAY)[StatusDisplayKey]['category'];
    readonly remainingSeconds: number | null;
    readonly maxSeconds: number | null;
    readonly progress: number;
    readonly valueText: string;
    readonly stacks: null;
    readonly sourceSummary: string;
    readonly durationSource: StatusSourceView;
    readonly valueSource: StatusSourceView;
    readonly sourceSkill: { readonly id: string; readonly name: string | null } | null;
    readonly sourceAvailability: StatusSourceView['availability'];
    readonly detailLines: readonly string[];
    readonly timeText: string;
    readonly timeDetail: string;
    readonly group: 'CONTROL' | 'DAMAGE & WEAKEN' | 'RECOVERY & PROTECT';
    readonly primarySource: StatusSourceView;
}
export interface UnitStatusView {
    readonly agentId: string;
    readonly side: number;
    readonly referenceSide: number | null;
    readonly relation: 'ALLY' | 'ENEMY' | 'UNALIGNED';
    readonly availability: StatusAvailability;
    readonly effects: readonly StatusRowView[];
    readonly availabilityText: string;
    readonly relationLabel: 'ALLY' | 'ENEMY' | null;
    readonly noticeText: string | null;
    readonly resistance: readonly string[];
}
