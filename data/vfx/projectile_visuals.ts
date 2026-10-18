import type { VFXRampId, VFXNeutralId } from "./parts/vfxPalette";
import type { MissileShape } from "./parts/partConfig";
import { Team } from "../../types";

// =========================================================================================
// 投射物視覺表（SSOT）：飛行軌跡＋外觀（V4，零件版）
// -----------------------------------------------------------------------------------------
// ProjectileSystem 以 skill.visualProjectileEffect || skill.visual 查本表，查不到用 DEFAULT_PROJECTILE_KEY。
// 軌跡參數交給 TrajectoryMath（模擬端，影響命中時間與落點）；look 只給 ProjectilePartPainter（繪製端）。
// 外觀全是預烘焙零件（engine/renderers/vfxparts）：本體 missile、拖尾 beam 磚或 smoke、頭部光暈 glow。
// 零件不吃技能顏色：色階寫在這裡，兩陣營共用的鍵（ARROW／BOLT／FIREBALL／BOMB）依施法者陣營選。
// tests/ReferenceIntegrity.test.ts 檢查每個技能的鍵都查得到、沒有死條目。
// =========================================================================================

export type ProjectileTrajectory = 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT' | 'HOVER_DIP';
/** 拖尾：streak＝光痕（光束磚沿軌跡串接，加法）；smoke＝煙（一般混合，越往後越大越淡）；none＝無 */
export type ProjectileTrailStyle = 'streak' | 'smoke' | 'none';
/** 色階：單一色階，或依施法者陣營選 */
export type ProjectileRamp = VFXRampId | Readonly<Record<Team, VFXRampId>>;

export interface ProjectileLook {
    shape: MissileShape;
    /** 本體長度（canvas 單位，奧義另乘 PROJECTILE_RENDER.ULT_SCALE） */
    size: number;
    ramp: ProjectileRamp;
    trail: ProjectileTrailStyle;
    /** 拖尾頭端寬度（canvas 單位；往尾端收窄到 0） */
    trailWidth: number;
    /** 煙拖尾的顏色（只在 trail 為 smoke 時使用） */
    smoke?: VFXNeutralId;
    /** 頭部光暈半徑（0＝無光暈；加法） */
    glow: number;
}

export interface ProjectileVisualDef {
    trajectory: ProjectileTrajectory;
    arcHeight?: number;
    wobbleFreq?: number;
    wobbleAmp?: number;
    /** 自轉速度（rad/s；0＝沿飛行方向） */
    spinSpeed?: number;
    /** HOVER_DIP 的下沉幅度（世界 z，預設見 TrajectoryMath） */
    dipAmount?: number;
    look: ProjectileLook;
}

const TEAM_PHYSICAL: ProjectileRamp = { [Team.BLUE]: 'LION_PHYSICAL', [Team.RED]: 'ASH_PHYSICAL' };

export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    // ── 兩陣營共用（技能沒指定外觀鍵時的 visual 後備）──
    'ARROW': {
        trajectory: 'ARC', arcHeight: 150,
        look: { shape: 'arrow', size: 48, ramp: TEAM_PHYSICAL, trail: 'streak', trailWidth: 4, glow: 10 },
    },
    'BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 18,
        look: { shape: 'bolt', size: 40, ramp: { [Team.BLUE]: 'LION_ARCANE', [Team.RED]: 'ASH_FIRE' }, trail: 'streak', trailWidth: 5, glow: 12 },
    },
    'FIREBALL': {
        trajectory: 'WOBBLE', wobbleFreq: 0.2, wobbleAmp: 10,
        look: { shape: 'orb', size: 40, ramp: { [Team.BLUE]: 'LION_HOLY', [Team.RED]: 'ASH_FIRE' }, trail: 'streak', trailWidth: 7, glow: 18 },
    },
    'BOMB': {
        trajectory: 'ARC', arcHeight: 200, spinSpeed: 15,
        look: { shape: 'bomb', size: 36, ramp: TEAM_PHYSICAL, trail: 'smoke', trailWidth: 8, smoke: 'ASH', glow: 0 },
    },

    // ── 獅心（BLUE）：快、直、乾淨的光痕 ──
    'PROJ_BLUE_LIGHT_ARROW': {
        trajectory: 'HOVER_DIP', dipAmount: 10,
        look: { shape: 'arrow', size: 52, ramp: 'LION_ARCANE', trail: 'streak', trailWidth: 4, glow: 14 },
    },
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC', arcHeight: 80,
        look: { shape: 'arrow', size: 46, ramp: 'LION_ICE', trail: 'streak', trailWidth: 5, glow: 14 },
    },
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE', wobbleFreq: 1.0, wobbleAmp: 5,
        look: { shape: 'orb', size: 40, ramp: 'LION_VOID', trail: 'streak', trailWidth: 9, glow: 22 },
    },
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 15,
        look: { shape: 'bolt', size: 40, ramp: 'LION_ICE', trail: 'streak', trailWidth: 7, glow: 20 },
    },

    // ── 灰燼（RED）：重、慢、煙與血 ──
    'PROJ_RED_HEAVY_BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 30,
        look: { shape: 'bolt', size: 48, ramp: 'ASH_BLOOD', trail: 'smoke', trailWidth: 10, smoke: 'CHAR', glow: 16 },
    },
    'PROJ_RED_CHAOS_ORB': {
        trajectory: 'WOBBLE', wobbleFreq: 3.5, wobbleAmp: 25,
        look: { shape: 'orb', size: 42, ramp: 'ASH_POISON', trail: 'smoke', trailWidth: 8, smoke: 'MIASMA', glow: 18 },
    },
    'PROJ_RED_AXE': {
        trajectory: 'ARC', arcHeight: 120, spinSpeed: 15,
        look: { shape: 'axe', size: 44, ramp: 'ASH_PHYSICAL', trail: 'smoke', trailWidth: 6, smoke: 'DUST', glow: 0 },
    },
    // rr_a2 爆裂散射：近距離霰彈（短、直、快）
    'PROJ_RED_SCATTER_SHOT': {
        trajectory: 'LINEAR',
        look: { shape: 'bolt', size: 30, ramp: 'ASH_FIRE', trail: 'streak', trailWidth: 4, glow: 10 },
    },
    // tr_a1 奪命血鉤：直線甩出的血色鉤索
    'PROJ_RED_BLOOD_HOOK': {
        trajectory: 'LINEAR',
        look: { shape: 'hook', size: 42, ramp: 'ASH_BLOOD', trail: 'streak', trailWidth: 3, glow: 0 },
    },
    'PROJ_RED_SHADOW': {
        trajectory: 'WOBBLE', wobbleFreq: 0.5, wobbleAmp: 10,
        look: { shape: 'orb', size: 38, ramp: 'ASH_VOID', trail: 'smoke', trailWidth: 9, smoke: 'CHAR', glow: 0 },
    },
};

/** 查不到外觀鍵時用的條目（PROJECTILE_VISUALS 的鍵） */
export const DEFAULT_PROJECTILE_KEY = 'BOLT';

/** 依陣營解析色階 */
export function projectileRamp(look: ProjectileLook, team: Team): VFXRampId {
    return typeof look.ramp === 'string' ? look.ramp : look.ramp[team];
}
