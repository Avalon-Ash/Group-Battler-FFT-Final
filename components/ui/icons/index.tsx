import { Gamepad2,
    ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Box, Check, ChevronDown, ChevronRight, Crosshair, Database, Diamond, Dices, Flag, FolderOpen, GitBranch, GitFork, HeartPulse, ListOrdered, Map as MapIcon, Maximize2, Menu, Minimize2, MousePointer2, Pause, Play, RotateCcw, Save, ScrollText, Search, Settings, Shield, SkipBack, Sparkles, Swords, Trash2, TriangleAlert, Tv, Volume2, WandSparkles, X, Zap,
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
    /** 主畫面入口在「模擬／PLAY」之間切換 */
    Swap: ArrowLeftRight,
    Rewind: SkipBack,
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
    Open: FolderOpen,
    Warning: TriangleAlert,

    // --- 之後換掉 emoji 用 ---
    ChevronDown,
    ChevronRight,
    Crosshair,
    BtSelector: GitFork,
    BtSequence: ListOrdered,
    BtCondition: Diamond,
    BtAction: Zap,
    Check,
    Search,
    Volume: Volume2,
    Map: MapIcon,
    Tree: GitBranch,
    Control: Gamepad2,
    DirectionUp: ArrowUp,
    DirectionDown: ArrowDown,
    DirectionLeft: ArrowLeft,
    DirectionRight: ArrowRight,
};
