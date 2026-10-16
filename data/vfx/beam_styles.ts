// =========================================================================================
// 光束樣式表（SSOT）
// SkillSequences 的 BEAM 動作只能引用這裡的鍵（tests/ReferenceIntegrity.test.ts 檢查）。
// 光束本體是程序化繪製（ProceduralPainter.drawBeam），樣式決定寬度與邊緣；顏色由序列動作帶入。
// =========================================================================================

export interface BeamStyleDef {
    /** 起始寬度（canvas 單位）；隨生命週期收窄 */
    width: number;
    /** 兩側滾動虛線（聚能光束） */
    dashedEdges?: boolean;
}

const DEFS = {
    GENERIC_BEAM: { width: 6 },
    SLASH_CONNECT: { width: 10 },
    DEATH_RAY: { width: 14, dashedEdges: true },
    /** 獅心：聖光射線（粗、乾淨） */
    HOLY_RAY: { width: 9 },
    /** 閃電束：細而亮 */
    LIGHTNING_BEAM: { width: 5 },
    /** 灰燼：血鏈／吸取連線（細） */
    BLOOD_LINK: { width: 4 },
} as const satisfies Record<string, BeamStyleDef>;

export type BeamStyleId = keyof typeof DEFS;
export const BEAM_STYLES: Record<BeamStyleId, BeamStyleDef> = DEFS;
