// data/units/appearance/types.ts
import { Team } from '../../../types';

interface RoleAppearance {
  primaryColor: string;   // 主色（棋座頂面、量表／圖示主色）
  secondaryColor: string; // 次色（棋座邊框）
  highlightColor?: string; // 棋座 Token 烘焙期高光（MaterialPainter.weatherToken）
  tokenRadius:    number;       // Token 圓形半徑（canvas unit）
  deepColor:      string;       // 深色調：陰影面/內層
  rimColor:       string;       // 外框高光色
  rimShadowColor: string;       // 外框陰影色
  iconColor:      string;       // Role Icon 主色
  iconGlow:       string;       // Role Icon 發光色

  // Token Procedural & Core Layer SSOT Colors
  innerRimColor?:     string;   // 內環高光色 (Imperial 亮白內邊, Covenant 齒尖金屬光)
  techRingColor?:     string;   // 輔助環/科技環色 (Imperial 儀表環)
  runeGlowColor?:     string;   // 符文/核心光暈發光色
  centerCoreColor?:   string;   // 核心中央深核色 (Covenant 黑核)
}

export interface FactionAppearanceProfile {
  factionId: Team | string;
  roles: Record<string, RoleAppearance>; // key = Role enum string
}
