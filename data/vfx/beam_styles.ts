// =========================================================================================
// 光束樣式表（SSOT）
// SkillSequences 的 BEAM 動作只能引用這裡的鍵（tests/ReferenceIntegrity.test.ts 檢查）。
// 光束本體是程序化繪製（ProceduralPainter.drawBeam），樣式決定寬度與畫法；顏色由序列動作帶入。
// =========================================================================================

export interface BeamStyleDef {
    /** 起始寬度（canvas 單位）；隨生命週期收窄 */
    width: number;
    /** TUBE＝三層光管；RIBBON＝中點位移雷帶（閃電、鎖鏈這類不規則路徑） */
    render: 'TUBE' | 'RIBBON';
    /** 兩側滾動虛線（DEATH_RAY 類的聚能光束） */
    dashedEdges?: boolean;
}

export const BEAM_STYLES = {
    GENERIC_BEAM: { width: 6, render: 'TUBE' },
    SLASH_CONNECT: { width: 10, render: 'TUBE' },
    DEATH_RAY: { width: 14, render: 'TUBE', dashedEdges: true },
} as const satisfies Record<string, BeamStyleDef>;

export type BeamStyleId = keyof typeof BEAM_STYLES;
