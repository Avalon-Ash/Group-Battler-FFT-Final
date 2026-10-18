// data/units/factionSkin.ts
// ╔══════════════════════════════════════════════════════════════════╗
// ║  FACTION_SKIN — 陣營外觀皮膚表（SSOT）                            ║
// ║                                                                  ║
// ║  單位身上所有「隨陣營改變」的視覺都從這張表解析：棋座（底座、      ║
// ║  邊框、徽記）、職業圖示、精靈染色、投影常駐光、護盾描邊、血條、    ║
// ║  死亡碎片。渲染器只讀 getFactionSkin()，不再自己判斷 Team。         ║
// ║                                                                  ║
// ║  貼圖槽（FactionTextureSlot）：先查                               ║
// ║    public/assets/factions/manifest.json                          ║
// ║  有登記且載入成功就用貼圖，否則退回程序化繪製（今日外觀）。         ║
// ║  換手繪素材只需放檔＋改 manifest，不必改程式（docs/FACTION_SLOTS.md）║
// ╚══════════════════════════════════════════════════════════════════╝

import { Team, Role, BodyTypeId } from '../../types';
import { HUD_COLORS, PALETTE, THEME_IMPERIAL, THEME_COVENANT, CLASS_GLYPH } from '../../constants';
import { FACTION_VISUALS } from '../vfx/faction_visuals';
import { UNIT_APPEARANCE } from './appearance';
import { BODY_TYPE_PROFILE } from './appearance/bodyTypes';
import type { GlyphStyleId } from './classGlyphs';
import type { VFXRampId, VFXNeutralId } from '../vfx/parts/vfxPalette';

/** 死亡碎裂的零件色階（UnitShatter）：火花、靈魂光（SPIRIT_RISE）、血滴（BLOOD_SPRAY）、塵煙 */
export interface DeathPartRamps { spark: VFXRampId; spirit: VFXRampId; blood: VFXRampId; puff: VFXNeutralId }

/** Manifest 與檔案路徑使用的陣營鍵（與單位圖集 manifestKey 前綴一致） */
export type FactionKey = 'BLUE' | 'RED';

export const FACTION_KEY: Record<Team, FactionKey> = {
    [Team.BLUE]: 'BLUE',
    [Team.RED]: 'RED',
};

/** 棋座程序化畫法（貼圖缺席時的退路），由 UnitFactory 對應到 Token 工廠 */
export type PedestalStyle = 'LIONHEART_HEX' | 'ASHEN_BROKEN_HEX';

/** 棋座核心（懸浮六角晶體）畫法：Lionheart 乾淨稜晶／Ashen 裂紋碎晶 */
export type CoreStyle = 'LIONHEART_PRISM' | 'ASHEN_SHARD';

/** 死亡氛圍粒子：靈魂飛升（Lionheart）／血噴（Ashen），UnitShatter 使用 */
export type DeathStyle = 'SPIRIT_RISE' | 'BLOOD_SPRAY';

/**
 * 可由手繪貼圖覆蓋的槽位。
 *  - pedestalTexture：棋座頂面材質（俯視正方形，內切棋座外接圓；引擎負責等距壓扁）
 *  - pedestalRim：棋座邊框（同上座標，中央透明）
 *  - emblem：棋座中央陣營徽記（俯視正方形，邊長 = 2 × radius × emblemScale）
 *  - classIcon：職業圖示（俯視，刻在棋座頂面；邊長 = 2 × radius × classGlyphScale）
 *  - core：棋座核心晶體（直立看板，CORE_VISUAL.canvasSize 畫布，自帶發光；只影響晶體本體）
 */
export const FACTION_TEXTURE_SLOTS = ['pedestalTexture', 'pedestalRim', 'emblem', 'classIcon', 'core'] as const;
export type FactionTextureSlot = typeof FACTION_TEXTURE_SLOTS[number];

/** 貼圖規格（文件與測試共用；素材尺寸建議值，引擎會縮放到繪製矩形） */
export const FACTION_TEXTURE_SPEC: Record<FactionTextureSlot, { sizePx: number; projection: 'TOP_DOWN' | 'BILLBOARD' }> = {
    pedestalTexture: { sizePx: 256, projection: 'TOP_DOWN' },
    pedestalRim: { sizePx: 256, projection: 'TOP_DOWN' },
    emblem: { sizePx: 128, projection: 'TOP_DOWN' },
    classIcon: { sizePx: 128, projection: 'TOP_DOWN' },
    core: { sizePx: 128, projection: 'BILLBOARD' },
};

/** 貼圖資產的根目錄（相對於 BASE_URL） */
export const FACTION_ASSET_ROOT = 'assets/factions/';
export const FACTION_MANIFEST_PATH = `${FACTION_ASSET_ROOT}manifest.json`;

export interface FactionAssetManifest {
    version: number;
    /** 每個陣營：槽位鍵 → 相對於 FACTION_ASSET_ROOT 的檔名 */
    factions: Partial<Record<FactionKey, Record<string, string>>>;
}

export interface PedestalSkin {
    style: PedestalStyle;
    /** 棋座外接圓半徑（Token 畫布單位，烘焙後隨 UNIT_SCALE 縮放） */
    radius: number;
    /** 棋座側面厚度（等距前的單位，越大越像實體棋子） */
    thickness: number;
    topHighlight: string;
    topBase: string;
    topDeep: string;
    /** 頂面漸層最外圈（Ashen 焦黑） */
    topEdge: string;
    sideColor: string;
    sideShadow: string;
    dropShadow: string;
    rim: string;
    rimShadow: string;
    innerRim: string;
    /** 內環（Lionheart 儀表環／Ashen 魔紋環） */
    ring: string;
    /** 程序化徽記主色與透明度 */
    emblem: string;
    emblemAlpha: number;
    /** 徽記相對 radius 的比例（貼圖徽記同樣使用） */
    emblemScale: number;
    /** Ashen 裂縫餘燼；Lionheart 不使用（設為 rim 以保持欄位完整） */
    ember: string;
    /** 頂面貼圖混合模式與透明度（手繪貼圖通常用 source-over／1） */
    textureBlend: GlobalCompositeOperation;
    textureAlpha: number;
    /** 烘焙期風化（MaterialPainter.weatherToken）的高光色 */
    weatherHighlight: string;
}

export interface ClassIconSkin {
    color: string;
    glow: string;
    /** 刻在棋座頂面的字形：相對 radius 的比例（貼圖同樣使用）與不透明度 */
    scale: number;
    alpha: number;
    /** 程序化字形風格（classGlyphs.ts）：獅心乾淨、灰燼鋸齒 */
    glyph: GlyphStyleId;
}

/** 棋座核心：把角色投影出來的懸浮六角晶體（尺寸與位置見 constants.ts 的 CORE_VISUAL） */
export interface CoreSkin {
    style: CoreStyle;
    /** 晶面：左半（受光）、右半（背光）、頂面高光、輪廓 */
    light: string;
    dark: string;
    highlight: string;
    edge: string;
    /** 裂紋／內芯色（Lionheart 為內芯金光，Ashen 為裂縫餘燼） */
    inner: string;
    /** 光暈色（待機與施法時疊加，強度見 CORE_VISUAL） */
    glow: string;
    /** 相對 CORE_VISUAL 尺寸的縮放 */
    sizeScale: number;
}

export interface SpriteSkin {
    /** 精靈圖集鍵（public/assets/units/manifest.json 的 units 鍵） */
    atlasKey: string;
    /** 烘焙期染色；null = 不染色（目前兩陣營皆為 null，保持原圖） */
    tint: { color: string; strength: number } | null;
}

/** 角色投影的陣營色：衝刺殘影的染色（UnitAfterimagePainter） */
export interface ProjectionSkin {
    trailColor: string;
}

export interface FactionSkin {
    team: Team;
    key: FactionKey;
    name: string;
    pedestal: PedestalSkin;
    classIcon: ClassIconSkin;
    core: CoreSkin;
    sprite: SpriteSkin;
    projection: ProjectionSkin;
    shield: { strokeColor: string };
    hud: { top: string; bottom: string; glow: string; border: string };
    death: { style: DeathStyle; burstColor: string; shatterColors: string[]; spiritColor: string; bloodColor: string; ramps: DeathPartRamps };
    /** 精靈尚未載入時的退路圓盤色 */
    fallbackBodyColor: string;
}

// ─────────────────────────────────────────────────────────────
// 陣營層級設定（Placeholder：只用程序化與既有色票）
// ─────────────────────────────────────────────────────────────

interface FactionStyleDef {
    name: string;
    pedestalStyle: PedestalStyle;
    deathStyle: DeathStyle;
    deathRamps: DeathPartRamps;
    thickness: number;
    sideColor: string;
    sideShadow: string;
    topEdge: string;
    emblem: string;
    emblemAlpha: number;
    emblemScale: number;
    ember: string;
    shieldStroke: string;
    core: CoreSkin;
    glyph: GlyphStyleId;
}

const FACTION_STYLE: Record<FactionKey, FactionStyleDef> = {
    // Lionheart：乾淨的金邊六角棋座、皇家藍琺瑯頂面
    BLUE: {
        name: 'Lionheart',
        pedestalStyle: 'LIONHEART_HEX',
        deathStyle: 'SPIRIT_RISE',
        deathRamps: { spark: 'LION_HOLY', spirit: 'LION_HOLY', blood: 'ASH_BLOOD', puff: 'DUST' },
        thickness: 7,
        sideColor: '#1e3a8a',
        sideShadow: '#0b1640',
        topEdge: '#172554',
        emblem: '#fde68a',
        emblemAlpha: 0.55,
        emblemScale: 0.38,
        ember: '#fcd34d',
        shieldStroke: THEME_IMPERIAL.energy,
        core: {
            style: 'LIONHEART_PRISM',
            light: '#fffbeb',
            dark: '#e7c873',
            highlight: '#ffffff',
            edge: '#f5b82e',
            inner: '#fde68a',
            glow: '#fde68a',
            sizeScale: 1,
        },
        glyph: 'CLEAN',
    },
    // Ashen：碎裂焦黑的六角棋座、裂縫透出餘燼
    RED: {
        name: 'Ashen',
        pedestalStyle: 'ASHEN_BROKEN_HEX',
        deathStyle: 'BLOOD_SPRAY',
        deathRamps: { spark: 'ASH_FIRE', spirit: 'ASH_VOID', blood: 'ASH_BLOOD', puff: 'ASH' },
        thickness: 7,
        sideColor: '#1c1917',
        sideShadow: '#0c0a09',
        topEdge: '#0c0a09',
        emblem: '#000000',
        emblemAlpha: 0.55,
        emblemScale: 0.3,
        ember: '#f97316',
        shieldStroke: THEME_COVENANT.primary,
        core: {
            style: 'ASHEN_SHARD',
            light: '#dc2626',
            dark: '#4a0d0d',
            highlight: '#fca5a5',
            edge: '#1c1917',
            inner: '#f97316',
            glow: '#ef4444',
            sizeScale: 1,
        },
        glyph: 'JAGGED',
    },
};

const ALL_ROLES: Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
const ALL_TEAMS: Team[] = [Team.BLUE, Team.RED];
const ALL_BODY_TYPES = Object.keys(BODY_TYPE_PROFILE) as BodyTypeId[];

function buildSkin(team: Team, role: Role, body: BodyTypeId): FactionSkin {
    const key = FACTION_KEY[team];
    const style = FACTION_STYLE[key];
    const roles = UNIT_APPEARANCE[team].roles;
    const ap = roles[role] ?? roles[Role.WARRIOR];
    const fv = FACTION_VISUALS[team];
    const palette = PALETTE.TEAMS[team];

    return {
        team,
        key,
        name: style.name,
        pedestal: {
            style: style.pedestalStyle,
            radius: ap.tokenRadius,
            thickness: style.thickness,
            topHighlight: ap.highlightColor ?? palette.light,
            topBase: ap.primaryColor,
            topDeep: ap.deepColor,
            topEdge: ap.centerCoreColor ?? style.topEdge,
            sideColor: style.sideColor,
            sideShadow: style.sideShadow,
            dropShadow: PALETTE.SHADOW,
            rim: ap.rimColor,
            rimShadow: ap.rimShadowColor,
            innerRim: ap.innerRimColor ?? ap.rimColor,
            ring: ap.techRingColor ?? ap.runeGlowColor ?? ap.rimColor,
            emblem: style.emblem,
            emblemAlpha: style.emblemAlpha,
            emblemScale: style.emblemScale,
            ember: style.ember,
            textureBlend: 'source-over',
            textureAlpha: 1,
            weatherHighlight: ap.highlightColor ?? palette.light,
        },
        classIcon: { color: ap.iconColor, glow: ap.iconGlow, glyph: style.glyph, scale: CLASS_GLYPH.scale, alpha: CLASS_GLYPH.alpha },
        core: style.core,
        sprite: { atlasKey: `${key}:${role}:${body}`, tint: null },
        projection: {
            trailColor: fv.flightTrailColor,
        },
        shield: { strokeColor: style.shieldStroke },
        hud: HUD_COLORS.HP[team],
        death: {
            style: style.deathStyle,
            burstColor: fv.primaryColor,
            shatterColors: fv.deathShatterColors,
            spiritColor: fv.deathSpiritColor,
            bloodColor: fv.deathBloodColor,
            ramps: style.deathRamps,
        },
        fallbackBodyColor: palette.main,
    };
}

type SkinTable = Record<FactionKey, Record<Role, Record<BodyTypeId, FactionSkin>>>;

function buildSkinTable(): SkinTable {
    const table = {} as SkinTable;
    for (const team of ALL_TEAMS) {
        const byRole = {} as Record<Role, Record<BodyTypeId, FactionSkin>>;
        for (const role of ALL_ROLES) {
            const byBody = {} as Record<BodyTypeId, FactionSkin>;
            for (const body of ALL_BODY_TYPES) byBody[body] = buildSkin(team, role, body);
            byRole[role] = byBody;
        }
        table[FACTION_KEY[team]] = byRole;
    }
    return table;
}

/** 預先解析好的 Team × Role × BodyType 皮膚（模組載入時建一次，查詢零配置） */
export const FACTION_SKINS: SkinTable = buildSkinTable();

/**
 * 查詢單位的陣營皮膚。查無（未知陣營／職業／體型）時依序退回預設，不會丟例外。
 * 只需要陣營層級欄位（護盾、血條、投影）時可省略 role／body。
 */
export function getFactionSkin(team: Team, role: Role = Role.WARRIOR, body: BodyTypeId = 'MALE'): FactionSkin {
    const byRole = FACTION_SKINS[FACTION_KEY[team]] ?? FACTION_SKINS.BLUE;
    const byBody = byRole[role] ?? byRole[Role.WARRIOR];
    return byBody[body] ?? byBody.MALE;
}

// ─────────────────────────────────────────────────────────────
// 貼圖槽解析（純函式；載入與快取在 engine/renderers/units/FactionTextureStore）
// ─────────────────────────────────────────────────────────────

/**
 * 槽位查找順序：最具體者優先。
 *   `${slot}:${ROLE}:${BODY}` → `${slot}:${ROLE}` → `${slot}`
 */
export function textureSlotKeys(slot: FactionTextureSlot, role: Role, body: BodyTypeId): string[] {
    return [`${slot}:${role}:${body}`, `${slot}:${role}`, slot];
}

export type ResolvedTextureSlot =
    | { kind: 'asset'; key: string; path: string }
    | { kind: 'procedural' };

/** 依 manifest 解析貼圖槽：回傳資產相對路徑（相對 BASE_URL），或程序化退路 */
export function resolveTextureSlot(
    manifest: FactionAssetManifest | null,
    team: Team,
    slot: FactionTextureSlot,
    role: Role,
    body: BodyTypeId
): ResolvedTextureSlot {
    const entries = manifest?.factions?.[FACTION_KEY[team]];
    if (entries) {
        for (const key of textureSlotKeys(slot, role, body)) {
            const file = entries[key];
            if (typeof file === 'string' && file.length > 0) {
                return { kind: 'asset', key, path: `${FACTION_ASSET_ROOT}${file}` };
            }
        }
    }
    return { kind: 'procedural' };
}

/** manifest 槽位鍵是否合法（測試與載入器共用） */
export function isValidTextureSlotKey(key: string): boolean {
    const [slot, role, body, ...rest] = key.split(':');
    if (rest.length > 0) return false;
    if (!(FACTION_TEXTURE_SLOTS as readonly string[]).includes(slot)) return false;
    if (role !== undefined && !(ALL_ROLES as string[]).includes(role)) return false;
    if (body !== undefined && !(ALL_BODY_TYPES as string[]).includes(body)) return false;
    return true;
}

/** 依單位圖集鍵（例如 `BLUE:MAGE:MALE`）反查皮膚；SpriteAtlasStore 烘焙染色時使用。格式不符回傳 null */
export function getFactionSkinByAtlasKey(atlasKey: string): FactionSkin | null {
    const [teamKey, role, body] = atlasKey.split(':');
    const byRole = FACTION_SKINS[teamKey as FactionKey];
    return byRole?.[role as Role]?.[body as BodyTypeId] ?? null;
}
