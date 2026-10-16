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
import { HUD_COLORS, PALETTE, THEME_IMPERIAL, THEME_COVENANT } from '../../constants';
import { FACTION_VISUALS } from '../vfx/faction_visuals';
import { UNIT_APPEARANCE } from './appearance';
import { BODY_TYPE_PROFILE } from './appearance/bodyTypes';

/** Manifest 與檔案路徑使用的陣營鍵（與單位圖集 manifestKey 前綴一致） */
export type FactionKey = 'BLUE' | 'RED';

export const FACTION_KEY: Record<Team, FactionKey> = {
    [Team.BLUE]: 'BLUE',
    [Team.RED]: 'RED',
};

/** 棋座程序化畫法（貼圖缺席時的退路），由 UnitFactory 對應到 Token 工廠 */
export type PedestalStyle = 'LIONHEART_HEX' | 'ASHEN_BROKEN_HEX';

/** 角色投影的常駐光效畫法（UnitAmbientPainter） */
export type ProjectionStyle = 'LIONHEART_SEAMS' | 'ASHEN_EMBERS';

/** 死亡氛圍粒子：靈魂飛升（Lionheart）／血噴（Ashen），UnitShatter 使用 */
export type DeathStyle = 'SPIRIT_RISE' | 'BLOOD_SPRAY';

/**
 * 可由手繪貼圖覆蓋的槽位。
 *  - pedestalTexture：棋座頂面材質（俯視正方形，內切棋座外接圓；引擎負責等距壓扁）
 *  - pedestalRim：棋座邊框（同上座標，中央透明）
 *  - emblem：棋座中央陣營徽記（俯視正方形，邊長 = 2 × radius × emblemScale）
 *  - classIcon：職業圖示（直立看板，ICON 尺寸，見 FACTION_TEXTURE_SPEC）
 */
export const FACTION_TEXTURE_SLOTS = ['pedestalTexture', 'pedestalRim', 'emblem', 'classIcon'] as const;
export type FactionTextureSlot = typeof FACTION_TEXTURE_SLOTS[number];

/** 貼圖規格（文件與測試共用；素材尺寸建議值，引擎會縮放到繪製矩形） */
export const FACTION_TEXTURE_SPEC: Record<FactionTextureSlot, { sizePx: number; projection: 'TOP_DOWN' | 'BILLBOARD' }> = {
    pedestalTexture: { sizePx: 256, projection: 'TOP_DOWN' },
    pedestalRim: { sizePx: 256, projection: 'TOP_DOWN' },
    emblem: { sizePx: 128, projection: 'TOP_DOWN' },
    classIcon: { sizePx: 128, projection: 'BILLBOARD' },
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
}

export interface SpriteSkin {
    /** 精靈圖集鍵（public/assets/units/manifest.json 的 units 鍵） */
    atlasKey: string;
    /** 烘焙期染色；null = 不染色（目前兩陣營皆為 null，保持原圖） */
    tint: { color: string; strength: number } | null;
}

export interface ProjectionSkin {
    style: ProjectionStyle;
    glowColor: string;
    glowRadius: number;
    particleColor: string;
    trailColor: string;
}

export interface FactionSkin {
    team: Team;
    key: FactionKey;
    name: string;
    pedestal: PedestalSkin;
    classIcon: ClassIconSkin;
    sprite: SpriteSkin;
    projection: ProjectionSkin;
    shield: { strokeColor: string };
    hud: { top: string; bottom: string; glow: string; border: string };
    death: { style: DeathStyle; burstColor: string; shatterColors: string[]; spiritColor: string; bloodColor: string };
    /** 精靈尚未載入時的退路圓盤色 */
    fallbackBodyColor: string;
}

// ─────────────────────────────────────────────────────────────
// 陣營層級設定（Placeholder：只用程序化與既有色票）
// ─────────────────────────────────────────────────────────────

interface FactionStyleDef {
    name: string;
    pedestalStyle: PedestalStyle;
    projectionStyle: ProjectionStyle;
    deathStyle: DeathStyle;
    thickness: number;
    sideColor: string;
    sideShadow: string;
    topEdge: string;
    emblem: string;
    emblemAlpha: number;
    emblemScale: number;
    ember: string;
    shieldStroke: string;
}

const FACTION_STYLE: Record<FactionKey, FactionStyleDef> = {
    // Lionheart：乾淨的金邊六角棋座、皇家藍琺瑯頂面
    BLUE: {
        name: 'Lionheart',
        pedestalStyle: 'LIONHEART_HEX',
        projectionStyle: 'LIONHEART_SEAMS',
        deathStyle: 'SPIRIT_RISE',
        thickness: 7,
        sideColor: '#1e3a8a',
        sideShadow: '#0b1640',
        topEdge: '#172554',
        emblem: '#fde68a',
        emblemAlpha: 0.55,
        emblemScale: 0.38,
        ember: '#fcd34d',
        shieldStroke: THEME_IMPERIAL.energy,
    },
    // Ashen：碎裂焦黑的六角棋座、裂縫透出餘燼
    RED: {
        name: 'Ashen',
        pedestalStyle: 'ASHEN_BROKEN_HEX',
        projectionStyle: 'ASHEN_EMBERS',
        deathStyle: 'BLOOD_SPRAY',
        thickness: 7,
        sideColor: '#1c1917',
        sideShadow: '#0c0a09',
        topEdge: '#0c0a09',
        emblem: '#000000',
        emblemAlpha: 0.55,
        emblemScale: 0.3,
        ember: '#f97316',
        shieldStroke: THEME_COVENANT.primary,
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
        classIcon: { color: ap.iconColor, glow: ap.iconGlow },
        sprite: { atlasKey: `${key}:${role}:${body}`, tint: null },
        projection: {
            style: style.projectionStyle,
            glowColor: fv.ambientGlowColor ?? fv.primaryColor,
            glowRadius: fv.ambientGlowRadius ?? 0,
            particleColor: fv.ambientParticleColor ?? fv.secondaryColor,
            trailColor: fv.flightTrailColor,
        },
        shield: { strokeColor: style.shieldStroke },
        hud: HUD_COLORS.HP[team],
        death: {
            style: style.deathStyle,
            burstColor: fv.primaryColor,
            shatterColors: fv.deathShatterColors,
            spiritColor: fv.deathSpiritColor,
            bloodColor: fv.ambientGlowColor ?? fv.deathSpiritColor,
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
