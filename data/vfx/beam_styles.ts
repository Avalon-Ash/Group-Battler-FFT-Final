// =========================================================================================
// 光束樣式表（SSOT）
// SkillSequences 的 BEAM 動作只能引用這裡的鍵（tests/ReferenceIntegrity.test.ts 檢查）。
// 有陣營的光束（序列動作都帶施法者陣營）畫成可平鋪的光束零件（PartPainter.drawBeam，part kind 'beam'），
// 樣式決定寬度與邊緣、色階取陣營（可依樣式覆寫）；沒有陣營的後備光束仍由 ProceduralPainter.drawBeam 程序化繪製。
// =========================================================================================

import { Team } from '../../types';
import { VFX_RAMPS, type VFXRamp, type VFXRampId } from './parts/vfxPalette';
import type { BeamEdge } from '../../engine/renderers/vfxparts/PartSpec';

export interface BeamStyleDef {
    /** 起始寬度（canvas 單位）；隨生命週期收窄 */
    width: number;
    /** 兩側滾動虛線（聚能光束）；也讓寬度以 1.5→0.5 收窄（舊版死光曲線） */
    dashedEdges?: boolean;
    /** 光束零件的邊緣樣式 */
    edge: BeamEdge;
    /** 依陣營覆寫色階（未列的陣營用 FACTION_BEAM_RAMP_ID） */
    teamRamp?: Partial<Record<Team, VFXRampId>>;
}

const DEFS = {
    GENERIC_BEAM: { width: 6, edge: 'clean' },
    SLASH_CONNECT: { width: 10, edge: 'clean' },
    DEATH_RAY: { width: 14, dashedEdges: true, edge: 'dashed' },
    /** 獅心：聖光射線（粗、乾淨） */
    HOLY_RAY: { width: 9, edge: 'clean' },
    /** 閃電束：細而亮 */
    LIGHTNING_BEAM: { width: 5, edge: 'zigzag', teamRamp: { [Team.BLUE]: 'LION_LIGHTNING' } },
    /** 灰燼：血鏈／吸取連線（細） */
    BLOOD_LINK: { width: 4, edge: 'beads' },
} as const satisfies Record<string, BeamStyleDef>;

/** 光束的陣營色：管身取 ramp.main、最內芯取 ramp.core（獅心＝金白、灰燼＝緋紅） */
export const FACTION_BEAM_RAMP_ID: Record<Team, VFXRampId> = {
    [Team.BLUE]: 'LION_HOLY',
    [Team.RED]: 'ASH_BLOOD',
};
export const FACTION_BEAM_RAMP: Record<Team, VFXRamp> = {
    [Team.BLUE]: VFX_RAMPS[FACTION_BEAM_RAMP_ID[Team.BLUE]],
    [Team.RED]: VFX_RAMPS[FACTION_BEAM_RAMP_ID[Team.RED]],
};

export type BeamStyleId = keyof typeof DEFS;
export const BEAM_STYLES: Record<BeamStyleId, BeamStyleDef> = DEFS;
