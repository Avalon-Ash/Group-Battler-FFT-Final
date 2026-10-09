// data/units/appearance/types.ts
import { Team } from '../../../types';

export interface RoleAppearance {
  bodyWidth: number;      // 身體最大寬度（canvas unit）
  bodyHeight: number;     // 身體高度（canvas unit）
  headRadius: number;     // 頭部半徑
  primaryColor: string;   // 主色（裝甲/主體）
  secondaryColor: string; // 次色（武器/邊框）
  accentColor: string;    // 強調色（眼睛/發光）
  highlightColor?: string; // 程序化甲胄邊緣高光 / Token 頂點高光
  weaponType: 'sword' | 'spear' | 'bow' | 'staff' | 'shield_mace' | 'tome';
  capeColor: string | null; // null = 無披風
  tokenRadius:    number;       // Token 圓形半徑（canvas unit）
  deepColor:      string;       // 深色調：陰影面/內層
  rimColor:       string;       // 外框高光色
  rimShadowColor: string;       // 外框陰影色
  iconColor:      string;       // Role Icon 主色
  iconGlow:       string;       // Role Icon 發光色

  // Token Procedural & Core Layer SSOT Colors
  innerRimColor?:     string;   // 內環高光色 (Imperial 亮白內邊, Covenant 齒尖金屬光)
  techRingColor?:     string;   // 輔助環/科技環色 (Imperial 儀表環)
  symbolColor?:       string;   // 戰術符號色 (Imperial Ω 符號)
  coreGlowColor?:     string;   // 核心底光暈起始色
  coreGlowMidColor?:  string;   // 核心底光暈過渡色
  coreGlowFadeColor?: string;   // 核心底光暈消失色
  coreShadowColor?:   string;   // 圖示懸浮投影陰影色
  runeGlowColor?:     string;   // 符文/核心光暈發光色
  runeColor?:         string;   // 符文本體色
  centerCoreColor?:   string;   // 核心中央深核色 (Covenant 黑核)
}

export interface FactionAppearanceProfile {
  factionId: Team | string;
  roles: Record<string, RoleAppearance>; // key = Role enum string
}
