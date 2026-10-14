import { Team, Role, BodyTypeId, SpriteAppearanceConfig } from '../../../types';
import { UNIT_SPRITE } from '../../../constants';
import { BODY_TYPE_PROFILE } from './bodyTypes';

/**
 * 將陣營列舉或字串標準化為 Manifest 前綴（"BLUE" 或 "RED"）
 */
export function formatTeamName(team: Team | string | number): string {
    if (team === Team.BLUE || team === 0 || team === 'BLUE') return 'BLUE';
    if (team === Team.RED || team === 1 || team === 'RED') return 'RED';
    return String(team).toUpperCase();
}

/**
 * 將職業列舉或字串標準化為 Manifest 職業名
 */
export function formatRoleName(role: Role | string): string {
    const s = String(role).toUpperCase();
    switch (s) {
        case 'TANK': return 'TANK';
        case 'WARRIOR': return 'WARRIOR';
        case 'RANGER': return 'RANGER';
        case 'MAGE': return 'MAGE';
        case 'SUPPORT': return 'SUPPORT';
        default: return 'WARRIOR';
    }
}

export const DEFAULT_SPRITE_APPEARANCE: Omit<SpriteAppearanceConfig, 'manifestKey'> = {
    targetHeight: UNIT_SPRITE.targetHeightCanvasUnits,
    shadowRadius: 20,
    flashStrength: 1.0,
};

export type SpriteAppearanceTable = Record<string, Record<string, Partial<Record<BodyTypeId, SpriteAppearanceConfig>>>>;

function buildSpriteAppearanceTable(): SpriteAppearanceTable {
    const table: SpriteAppearanceTable = {};
    const teams = ['BLUE', 'RED'];
    const roles = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT'];
    const bodyTypes: BodyTypeId[] = ['MALE', 'FEMALE'];

    for (const team of teams) {
        table[team] = {};
        for (const role of roles) {
            table[team][role] = {};
            for (const body of bodyTypes) {
                const manifestKey = `${team}:${role}:${body}`;
                table[team][role][body] = {
                    manifestKey,
                    targetHeight: DEFAULT_SPRITE_APPEARANCE.targetHeight,
                    shadowRadius: role === 'TANK' ? 24 : 18,
                    flashStrength: DEFAULT_SPRITE_APPEARANCE.flashStrength,
                };
            }
        }
    }
    return table;
}

/**
 * SPRITE_APPEARANCE (SSOT)
 * 單位圖集外觀設定對照表
 */
export const SPRITE_APPEARANCE: SpriteAppearanceTable = buildSpriteAppearanceTable();

/**
 * lookupSpriteAppearance
 * 依據 (Team, Role, BodyTypeId) 查詢圖集外觀設定。
 * 若指定之體型未啟用或缺圖，沿 BODY_TYPE_PROFILE 的 fallback 鏈退回（例如 FEMALE -> MALE）。
 * 若退回仍找不到則回傳 null（指示渲染器退回程序化繪製）。
 * 渲染器呼叫此函式即可獲取設定，不需在渲染器中出現任何體型字面值。
 */
export function lookupSpriteAppearance(
    team: Team | string | number,
    role: Role | string,
    body: BodyTypeId
): SpriteAppearanceConfig | null {
    const t = formatTeamName(team);
    const r = formatRoleName(role);
    const teamRoles = SPRITE_APPEARANCE[t];
    if (!teamRoles) return null;
    const roleBodies = teamRoles[r];
    if (!roleBodies) return null;

    let current: BodyTypeId | null = body;
    const visited = new Set<BodyTypeId>();

    while (current) {
        if (visited.has(current)) break;
        visited.add(current);

        if (BODY_TYPE_PROFILE[current]?.enabled && roleBodies[current]) {
            return roleBodies[current]!;
        }

        current = BODY_TYPE_PROFILE[current]?.fallback ?? null;
    }

    return null;
}
