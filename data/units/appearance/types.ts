// data/units/appearance/types.ts
export interface RoleAppearance {
  bodyWidth: number;      // 身體最大寬度（canvas unit）
  bodyHeight: number;     // 身體高度（canvas unit）
  headRadius: number;     // 頭部半徑
  primaryColor: string;   // 主色（裝甲/主體）
  secondaryColor: string; // 次色（武器/邊框）
  accentColor: string;    // 強調色（眼睛/發光）
  weaponType: 'sword' | 'spear' | 'bow' | 'staff' | 'shield_mace' | 'tome';
  capeColor: string | null; // null = 無披風
}

export interface FactionAppearanceProfile {
  factionId: string;
  roles: Record<string, RoleAppearance>; // key = Role enum string
}
