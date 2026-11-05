import type { EffectKind, StatusOrigin } from '../../types';
import type { STATUS_DISPLAY, StatusDisplayKey } from '../../data/status/status_display';

export type StatusAvailability = 'ACTIVE' | 'BANISHED' | 'OUT_OF_BOUNDS' | 'DEAD';
interface StatusSourceView extends Readonly<StatusOrigin> {
    readonly availability: StatusAvailability | 'UNKNOWN' | 'LEFT';
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
}
export interface UnitStatusView {
    readonly agentId: string;
    readonly side: number;
    readonly referenceSide: number | null;
    readonly relation: 'ALLY' | 'ENEMY' | 'UNALIGNED';
    readonly availability: StatusAvailability;
    readonly effects: readonly StatusRowView[];
}
