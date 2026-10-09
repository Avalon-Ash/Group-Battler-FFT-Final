import { WindowDef, WindowId } from '../../types';
import { windowStore } from '../../components/ui/window/windowStore';

export const WINDOW_DEFINITIONS: WindowDef[] = [
    {
        id: 'logs',
        title: '戰鬥日誌 (Combat Logs)',
        icon: 'scroll',
        defaultRect: { x: 40, y: 80, width: 640, height: 420 },
        minSize: { width: 360, height: 240 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'db',
        title: '技能資料庫 (Skill DB)',
        icon: 'book',
        defaultRect: { x: 80, y: 80, width: 700, height: 500 },
        minSize: { width: 400, height: 300 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'vfxmap',
        title: '特效展示庫 (VFX Library)',
        icon: 'sparkles',
        defaultRect: { x: 100, y: 80, width: 720, height: 520 },
        minSize: { width: 400, height: 300 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'inspector',
        title: '單位檢查器 (Unit Inspector)',
        icon: 'user',
        defaultRect: { x: 24, y: 80, width: 340, height: 520 },
        minSize: { width: 300, height: 240 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'monitor',
        title: '導演監控儀表 (Director Monitor)',
        icon: 'activity',
        defaultRect: { x: 840, y: 80, width: 320, height: 240 },
        minSize: { width: 260, height: 180 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'directorSettings',
        title: '導演 AI 設定 (Director Settings)',
        icon: 'cpu',
        defaultRect: { x: 780, y: 120, width: 300, height: 380 },
        minSize: { width: 280, height: 260 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'zoneSettings',
        title: '縮圈系統設定 (Zone Collapse)',
        icon: 'shield',
        defaultRect: { x: 780, y: 140, width: 300, height: 360 },
        minSize: { width: 280, height: 240 },
        kind: 'window',
        visibleInShowcase: false,
    },
    {
        id: 'showcaseSettings',
        title: '展示矩陣設定 (Showcase Settings)',
        icon: 'sliders',
        defaultRect: { x: 24, y: 80, width: 340, height: 460 },
        minSize: { width: 280, height: 300 },
        kind: 'window',
        visibleInShowcase: true,
    },
];

export const WINDOW_DEF_MAP: Record<WindowId, WindowDef> = Object.fromEntries(
    WINDOW_DEFINITIONS.map((def) => [def.id, def])
) as Record<WindowId, WindowDef>;

// Register standard definitions in the global store instance
windowStore.registerDefs(WINDOW_DEFINITIONS);
