// data/units/factionTint.ts
// ╔══════════════════════════════════════════════════════════════════╗
// ║  FACTION_TINT — 三個以上陣營時的外觀分配與換色規則（SSOT）         ║
// ║                                                                  ║
// ║  只有陣營數 ≥ FACTION_TINT.MIN_FACTIONS 才啟用；兩個陣營時每個單位  ║
// ║  的 look 就是 { skinTeam: team, hue: null }，畫面與舊版完全相同。   ║
// ║  色票池＝藍原色、紅原色、HUES 各一；每局洗牌後依陣營序號分配，      ║
// ║  陣營多過色票時重複（已知限制）。                                  ║
// ║  換色規則：藍色範圍內（色相 SOURCE_HUE、飽和度 ≥ MIN_SATURATION）   ║
// ║  的像素／色碼把色相換成目標色相，其餘（皮膚、頭髮、金屬、金邊）不動。║
// ║  圖集像素在 SpriteAtlasStore.bakeAtlas 烘焙期做一次；皮膚色碼由      ║
// ║  deriveTintedSkin 派生。陣營外觀唯一入口是 getAgentSkin(agent)。    ║
// ╚══════════════════════════════════════════════════════════════════╝

import { Team } from '../../types';
import type { Role, BodyTypeId, FactionLook } from '../../types';
import { mulberry32, fnv1a32 } from '../../engine/math/hash';
import { getFactionSkin } from './factionSkin';
import type { FactionSkin } from './factionSkin';

export type { FactionLook };

export const FACTION_TINT = {
    /** 啟用換色的最少陣營數（與大逃殺規則的最少陣營數一致） */
    MIN_FACTIONS: 3,
    /** 目標色相（度）：綠、金、紫、青、洋紅、橘紅 */
    HUES: [135, 42, 285, 175, 325, 15],
    /** 被換色的來源色相範圍（度，含端點） */
    SOURCE_HUE_MIN: 190,
    SOURCE_HUE_MAX: 262,
    /** 被換色的最低飽和度（HSV）。低於它的灰藍、白、金屬不動 */
    MIN_SATURATION: 0.18,
    /** 圖集變體鍵的分隔字元：`BLUE:MAGE:MALE@135` */
    VARIANT_SEPARATOR: '@',
} as const;

const DEGREES = 360;
const HUE_SECTORS = 6;
const SECTOR_DEGREES = 60;
const BYTE_MAX = 255;
const HEX_RADIX = 16;
const HEX_PAIR = 2;
const SHORT_HEX_LENGTH = 3;
const LONG_HEX_LENGTH = 6;
const EPSILON = 1e-5;
const ALPHA_HEX_LENGTH = 8;
const COLOR_FN_PATTERN = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/** 不換色的外觀（兩個陣營、或沒指定時） */
export function plainLook(team: Team): FactionLook {
    return { skinTeam: team, hue: null };
}

/** 色票池：藍原色、紅原色，再加每個目標色相的藍色系換色版 */
function lookPool(): FactionLook[] {
    return [
        { skinTeam: Team.BLUE, hue: null },
        { skinTeam: Team.RED, hue: null },
        ...FACTION_TINT.HUES.map(hue => ({ skinTeam: Team.BLUE, hue })),
    ];
}

/**
 * 分配每個陣營的外觀。陣營數 < MIN_FACTIONS 回傳 null（呼叫端用 plainLook(team)）。
 * 洗牌只用 saltKey 雜湊出的亂數（不消耗模擬亂數 random()，不會讓之後的地圖亂數位移）；
 * 同一個 saltKey 得到同一組，換局換 saltKey 就換色。
 */
export function pickFactionLooks(factionCount: number, saltKey: string): FactionLook[] | null {
    if (factionCount < FACTION_TINT.MIN_FACTIONS) return null;
    const pool = lookPool();
    const rand = mulberry32(fnv1a32(`FACTION-LOOK|${saltKey}`));
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return Array.from({ length: factionCount }, (_, side) => pool[side % pool.length]);
}

// ─────────────────────────────────────────────────────────────
// 換色（HSV：只換色相，保留飽和度與明度）
// ─────────────────────────────────────────────────────────────

/** 圖集變體鍵：基底鍵加上色相（hue 為 null 時原樣） */
export function variantKey(baseKey: string, hue: number | null): string {
    return hue === null ? baseKey : `${baseKey}${FACTION_TINT.VARIANT_SEPARATOR}${hue}`;
}

/** 拆開圖集變體鍵 */
export function splitVariantKey(key: string): { baseKey: string; hue: number | null } {
    const at = key.indexOf(FACTION_TINT.VARIANT_SEPARATOR);
    if (at < 0) return { baseKey: key, hue: null };
    return { baseKey: key.slice(0, at), hue: Number(key.slice(at + 1)) };
}

/** 單一像素：藍色範圍內就把色相換成 targetHue（度），回傳新的 [r, g, b]（0～255）；不在範圍內回傳原值 */
export function retintRgb(r: number, g: number, b: number, targetHue: number): [number, number, number] {
    const rn = r / BYTE_MAX, gn = g / BYTE_MAX, bn = b / BYTE_MAX;
    const mx = Math.max(rn, gn, bn);
    const d = mx - Math.min(rn, gn, bn);
    if (d < EPSILON) return [r, g, b];
    let sector: number;
    if (mx === rn) sector = ((gn - bn) / d) % HUE_SECTORS;
    else if (mx === gn) sector = (bn - rn) / d + 2;
    else sector = (rn - gn) / d + 4;
    const deg = ((sector * SECTOR_DEGREES) + DEGREES) % DEGREES;
    const sat = d / mx;
    if (deg < FACTION_TINT.SOURCE_HUE_MIN || deg > FACTION_TINT.SOURCE_HUE_MAX || sat < FACTION_TINT.MIN_SATURATION) return [r, g, b];
    const k = (((targetHue % DEGREES) + DEGREES) % DEGREES) / SECTOR_DEGREES;
    const j = Math.floor(k) % HUE_SECTORS;
    const f = k - Math.floor(k);
    const p = mx * (1 - sat), q = mx * (1 - f * sat), t = mx * (1 - (1 - f) * sat);
    const rgb: [number, number, number][] = [[mx, t, p], [q, mx, p], [p, mx, t], [p, q, mx], [t, p, mx], [mx, p, q]];
    const [or, og, ob] = rgb[j];
    return [Math.round(or * BYTE_MAX), Math.round(og * BYTE_MAX), Math.round(ob * BYTE_MAX)];
}

const hexByte = (n: number): string => n.toString(HEX_RADIX).padStart(HEX_PAIR, '0');

/** 色碼字串換色：支援 #rgb／#rrggbb／#rrggbbaa 與 rgb()／rgba()；不是色碼或不在藍色範圍回傳原字串 */
export function retintCss(css: string, targetHue: number): string {
    if (css.startsWith('#')) {
        let hex = css.slice(1);
        if (!/^[0-9a-f]+$/i.test(hex)) return css;
        if (hex.length === SHORT_HEX_LENGTH) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== LONG_HEX_LENGTH && hex.length !== ALPHA_HEX_LENGTH) return css;
        const r = parseInt(hex.slice(0, 2), HEX_RADIX), g = parseInt(hex.slice(2, 4), HEX_RADIX), b = parseInt(hex.slice(4, 6), HEX_RADIX);
        const [nr, ng, nb] = retintRgb(r, g, b, targetHue);
        if (nr === r && ng === g && nb === b) return css;
        return `#${hexByte(nr)}${hexByte(ng)}${hexByte(nb)}${hex.slice(6)}`;
    }
    const m = COLOR_FN_PATTERN.exec(css);
    if (!m) return css;
    const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
    const [nr, ng, nb] = retintRgb(r, g, b, targetHue);
    if (nr === r && ng === g && nb === b) return css;
    return m[4] === undefined ? `rgb(${nr}, ${ng}, ${nb})` : `rgba(${nr}, ${ng}, ${nb}, ${m[4]})`;
}

function retintDeep<T>(value: T, hue: number): T {
    if (typeof value === 'string') return retintCss(value, hue) as unknown as T;
    if (Array.isArray(value)) return value.map(v => retintDeep(v, hue)) as unknown as T;
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = retintDeep(v, hue);
        return out as T;
    }
    return value;
}

// ─────────────────────────────────────────────────────────────
// 單位的陣營外觀入口
// ─────────────────────────────────────────────────────────────

const tintedSkinCache = new Map<string, FactionSkin>();

/** 單位身上需要陣營外觀的欄位（Agent 的子集，方便測試） */
export interface HasFactionLook {
    team: Team;
    role: Role;
    bodyType?: BodyTypeId;
    look?: FactionLook;
}

/**
 * 查詢單位的陣營皮膚：沒有 look 或 hue 為 null 時就是 getFactionSkin(team, role, body) 原物件；
 * 有 hue 時回傳派生並快取的換色版（色碼欄位換色，樣式 id、名稱、圖集鍵不動）。
 */
export function getLookSkin(look: FactionLook, role: Role, body: BodyTypeId): FactionSkin {
    const base = getFactionSkin(look.skinTeam, role, body);
    if (look.hue === null) return base;
    const key = `${look.skinTeam}|${role}|${body}|${look.hue}`;
    let skin = tintedSkinCache.get(key);
    if (!skin) {
        skin = retintDeep(base, look.hue);
        tintedSkinCache.set(key, skin);
    }
    return skin;
}

/** 陣營外觀的唯一入口：渲染端不再用 getFactionSkin(agent.team) */
export function getAgentSkin(agent: HasFactionLook): FactionSkin {
    return getLookSkin(agent.look ?? plainLook(agent.team), agent.role, agent.bodyType ?? 'MALE');
}
