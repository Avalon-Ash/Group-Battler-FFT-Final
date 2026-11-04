import type { Skill, LogEntry } from '../../types';

export interface SkillDbView {
    readonly skills: readonly Skill[];
    readonly totalCount: number;
}

interface L4LogView {
    readonly logs: readonly LogEntry[];
    readonly totalCount: number;
}
