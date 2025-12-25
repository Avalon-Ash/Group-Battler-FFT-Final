
import React, { useRef } from 'react';
import { ToolType, Role } from '../../types';
import { SCENE_DB } from '../../data/scenes';
import { OBSTACLE_DB } from '../../data/obstacles';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';

interface MapEditorToolbarProps {
    tool: ToolType;
    setTool: (t: ToolType) => void;
    
    // Configs
    mapW: number;
    setMapW: (v: number) => void;
    mapH: number;
    setMapH: (v: number) => void;
    currentSceneId: string;
    onSetScene: (id: string) => void;
    
    // Spawn Settings
    spawnMode: 'RANDOM' | 'DRAFT';
    setSpawnMode: (m: 'RANDOM' | 'DRAFT') => void;
    draftRole: Role;
    setDraftRole: (r: Role) => void;
    hpInput: number;
    setHpInput: (v: number) => void;
    
    // Obstacle Settings
    selectedObstacle: string;
    setSelectedObstacle: (v: string) => void;
}

export const MapEditorToolbar: React.FC<MapEditorToolbarProps> = (props) => {
    const { 
        tool, setTool, 
        currentSceneId, onSetScene,
        spawnMode, setSpawnMode, draftRole, setDraftRole, hpInput, setHpInput,
        selectedObstacle, setSelectedObstacle
    } = props;

    // Draggable Hook
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'top-center',
        margin: 40
    });

    const isUnitTool = tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED;
    const isObstacleTool = tool === ToolType.OBSTACLE;

    return (
        <div 
            ref={ref}
            className={`z-40 flex flex-col items-center gap-2`}
            style={style}
            {...dragHandlers}
        >
            {/* MAIN TOOLBAR */}
            <div className={`liquid-card !bg-slate-900/90 !backdrop-blur-3xl !rounded-full p-2 flex items-center gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] cursor-grab ${isDragging ? 'cursor-grabbing ring-2 ring-cyan-500/30' : ''}`}>
                
                {/* Drag Handle */}
                <div className="w-6 flex flex-col gap-1 items-center justify-center opacity-30 hover:opacity-100 transition-opacity px-2 border-r border-white/10" onPointerDown={dragHandlers.onPointerDown}>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>

                {/* 1. SELECT */}
                <button 
                    onClick={() => setTool(ToolType.SELECT)} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`liquid-icon-btn ${tool === ToolType.SELECT ? 'bg-white/20 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-400 border-transparent bg-transparent hover:bg-white/10'}`}
                    title="選取 / 移動"
                >
                    <Icons.Select className="w-5 h-5" />
                </button>
                
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                
                {/* 2. BLUE TEAM */}
                <button 
                    onClick={() => setTool(ToolType.ADD_BLUE)} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`liquid-icon-btn ${tool === ToolType.ADD_BLUE ? 'bg-blue-500/20 text-blue-400 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-slate-500 border-transparent bg-transparent hover:text-blue-400 hover:bg-blue-500/10'}`}
                    title="部署藍軍"
                >
                    <Icons.Deploy className="w-5 h-5" />
                </button>

                {/* 3. RED TEAM */}
                <button 
                    onClick={() => setTool(ToolType.ADD_RED)} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`liquid-icon-btn ${tool === ToolType.ADD_RED ? 'bg-red-500/20 text-red-400 border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-slate-500 border-transparent bg-transparent hover:text-red-400 hover:bg-red-500/10'}`}
                    title="部署紅軍"
                >
                    <Icons.Deploy className="w-5 h-5" />
                </button>
                
                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* 4. OBSTACLE */}
                <button 
                    onClick={() => setTool(ToolType.OBSTACLE)} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`liquid-icon-btn ${tool === ToolType.OBSTACLE ? 'bg-amber-500/20 text-amber-400 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'text-slate-500 border-transparent bg-transparent hover:text-amber-400 hover:bg-amber-500/10'}`}
                    title="地形編輯"
                >
                    <Icons.Obstacle className="w-5 h-5" />
                </button>

                {/* 5. DELETE */}
                <button 
                    onClick={() => setTool(ToolType.DELETE)} 
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`liquid-icon-btn ${tool === ToolType.DELETE ? 'bg-red-900/50 text-red-500 border-red-800 shadow-inner' : 'text-slate-500 border-transparent bg-transparent hover:text-red-500 hover:bg-red-900/20'}`}
                    title="移除"
                >
                    <Icons.Delete className="w-5 h-5" />
                </button>
            </div>

            {/* SUB MENU: UNIT SETTINGS */}
            {isUnitTool && (
                <div className="liquid-card !rounded-2xl p-2 flex items-center gap-3 animate-slide-down origin-top shadow-xl border-t-0" onPointerDown={e => e.stopPropagation()}>
                    {/* HP Input */}
                    <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 border border-white/5">
                        <span className="text-[11px] font-bold text-green-500">HP</span>
                        <input 
                            type="number" 
                            value={hpInput} 
                            onChange={(e) => setHpInput(Math.max(1, parseInt(e.target.value)))} 
                            className="w-12 bg-transparent text-white text-xs font-mono text-center outline-none"
                        />
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                        <button onClick={() => setSpawnMode('RANDOM')} className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${spawnMode === 'RANDOM' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}>RND</button>
                        <button onClick={() => setSpawnMode('DRAFT')} className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${spawnMode === 'DRAFT' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>FIX</button>
                    </div>

                    {/* Role Select (Only in Draft) */}
                    {spawnMode === 'DRAFT' && (
                        <select 
                            value={draftRole} 
                            onChange={(e) => setDraftRole(e.target.value as Role)} 
                            className="bg-black/40 text-xs text-white rounded-lg px-2 py-1 border border-white/5 outline-none cursor-pointer hover:border-cyan-500/30"
                        >
                            {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                </div>
            )}

            {/* SUB MENU: OBSTACLE SETTINGS */}
            {isObstacleTool && (
                <div className="liquid-card !rounded-2xl p-2 flex items-center gap-3 animate-slide-down origin-top shadow-xl border-t-0" onPointerDown={e => e.stopPropagation()}>
                    <select 
                        value={selectedObstacle} 
                        onChange={(e) => setSelectedObstacle(e.target.value)} 
                        className="bg-black/40 text-xs text-white rounded-lg px-3 py-1.5 border border-white/5 outline-none cursor-pointer hover:border-amber-500/30 w-32"
                    >
                        {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    
                    {/* Scene Select Shortcut */}
                    <select value={currentSceneId} onChange={(e) => onSetScene(e.target.value)} className="bg-black/40 text-xs text-slate-400 rounded-lg px-2 py-1.5 border border-white/5 outline-none cursor-pointer hover:text-white w-24">
                        {SCENE_DB.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
};
