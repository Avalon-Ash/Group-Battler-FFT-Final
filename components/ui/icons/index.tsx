import {
    ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Check, ChevronDown, Crosshair, Database, Dices, Flag,
    GitBranch, HeartPulse, Map as MapIcon, Maximize2, Menu, Minimize2, MousePointer2, Pause, Play, RotateCcw,
    Save, ScrollText, Search, Settings, Shield, Sparkles, Swords, Trash2, TriangleAlert, Tv, Volume2,
    WandSparkles, X,
} from 'lucide-react';

/** 全專案透過鍵名使用圖示；鍵名不可改，換圖只改右邊。 */
export const Icons = {
    // --- TOOLS ---
    Select: MousePointer2,
    Deploy: Flag,
    Obstacle: Box,
    Delete: Trash2,
    Settings,

    // --- ROLES ---
    RoleTank: Shield,
    RoleWarrior: Swords,
    RoleRanger: Crosshair,
    RoleMage: WandSparkles,
    RoleSupport: HeartPulse,

    // --- PLAYBACK ---
    Play,
    Pause,
    Restart: RotateCcw,
    Dice: Dices,
    TV: Tv,
    VFX: Sparkles,

    // --- SYSTEM ---
    Close: X,
    Menu,
    Expand: Maximize2,
    Minimize: Minimize2,
    Log: ScrollText,
    Database,
    Save,
    Warning: TriangleAlert,

    // --- 之後換掉 emoji 用 ---
    ChevronDown,
    Check,
    Search,
    Volume: Volume2,
    Map: MapIcon,
    Tree: GitBranch,
    DirectionUp: ArrowUp,
    DirectionDown: ArrowDown,
    DirectionLeft: ArrowLeft,
    DirectionRight: ArrowRight,
};
