import type { PartSpec } from '../engine/renderers/vfxparts/PartSpec';

/**
 * 粒子型別（後端與特性見 constants/vfx.ts PARTICLE_TRAITS）：
 *  - PART／PART_GROUND／PART_DEBRIS：特效零件（PartSprite）的看板／貼地／受重力碎片——所有登記特效都是這三種
 *  - BEAM：光束（一律掛光束零件，PartPainter.drawBeam）
 *  - ATMOSPHERE：天氣粒子（看板，VFXAmbience 生成；地形 T4 會改零件）
 *  - GENERIC_DEBUG：除錯點
 */
export type ParticleType = 'PART' | 'PART_GROUND' | 'PART_DEBRIS' | 'BEAM' | 'GENERIC_DEBUG';

// Define the "Verbs" of our visual language
type VFXActionType = 
    | 'PARTICLE'    // Spawn an emitter
    | 'BEAM'        // Draw a line/laser
    | 'SHAKE'       // Camera trauma
    | 'GRID_PULSE'  // Floor ripple
    | 'HEAVEN_FALL' // High-altitude impact object
    | 'WAIT';       // Delay next action

export interface VFXAction {
    type: VFXActionType;
    delay?: number;        // Start time relative to sequence start
    id?: string;           // Asset/VFX Registry ID
    style?: string;        // Procedural Style Key
    color?: string;        // Optional override
    scale?: number;        
    duration?: number;
    height?: number;       // For HeavenFall or Pillars
    shakeIntensity?: number;
}

/**
 * The core ECS Component for Skill Visuals
 */
export interface VFXSequence {
    id: string;
    actions: VFXAction[];
    /**
     * 序列開始後幾秒「打中」（命中特效的爆發、震動、格子脈衝）。有詠唱的技能在 CAST_START 排程，
     * 延後 max(0, 詠唱時間 − hitAt) 才開始，讓命中落在傷害結算（詠唱結束）那一刻；未設＝0。
     */
    hitAt?: number;
}

/**
 * 零件粒子的生命週期包絡（progress 0→1）。外形與色階由 part 規格在烘焙時決定。
 */
export interface PartAnim {
    scaleFrom?: number;
    scaleTo?: number;
    /** 縮放曲線：out＝快起慢收（預設），in＝慢起快收 */
    ease?: 'out' | 'in' | 'linear';
    /** 淡入佔生命的比例 */
    fadeIn?: number;
    /** 淡出佔生命的比例（結尾） */
    fadeOut?: number;
    alpha?: number;
    /** 初始旋轉（弧度）；持續旋轉用 EmitterConfig.vRotation */
    rotation?: number;
}

// Add Range type
export type Range = [number, number];

// Add EmitterConfig type
export interface EmitterConfig {
    particleType: ParticleType;
    count: Range | number;
    speed: Range | number;
    lifetime: Range | number;
    delay: Range | number;
    size: Range | number;
    height?: Range | number;
    colors: string[];
    /** RING：count 個粒子均勻分布在 shapeRadius 圓周上（例：六根光柱＝六角頂點） */
    shape: 'POINT' | 'BURST_DIR' | 'CIRCLE' | 'RING';
    shapeRadius?: number;
    visualStyle?: string;
    /** 每 1/60 秒損失的速度比例，必須在 [0,1)（≥1 會讓 VFXPhysics 的 pow(1 - drag, dt * 60) 變 NaN） */
    drag?: number;
    locked?: boolean;
    lockReason?: 'BEAM' | 'HAZARD_FIELD';
    gravity?: number;
    vRotation?: Range | number;
    // Added vz property to support explicit vertical velocity in registry definitions
    vz?: Range | number;
    blendMode?: GlobalCompositeOperation;
    /** particleType 為 PART／PART_GROUND／PART_DEBRIS 時的零件規格 */
    part?: PartSpec;
    partAnim?: PartAnim;
    /** 看板粒子貼著地面高度（光柱、火柱這類底部錨點的零件），不在命中點的身體高度 */
    groundAnchored?: boolean;
}

// Add VFXAsset type
export interface VFXAsset {
    id: string;
    description?: string;
    emitters: EmitterConfig[];
}
