
import React from 'react';
import { ToolType, Role } from '../../types';
import { OBSTACLE_DB } from '../../data/obstacles';

interface ControlDockProps {
    hidden: boolean;
    tool: ToolType;
    setTool: (t: ToolType) => void;
    
    // Spawn Config
    spawnMode: 'RANDOM' | 'DRAFT';
    setSpawnMode: (m: 'RANDOM' | 'DRAFT') => void;
    draftRole: Role;
    setDraftRole: (r: Role) => void;
    
    // Obstacle Config
    selectedObstacle: string;
    setSelectedObstacle: (s: string) => void;
    
    // Map Stats/Config
    hpInput: number;
    setHpInput: (v: number) => void;
    mapW: number;
    setMapW: (v: number) => void;
    mapH: number;
    setMapH: (v: number) => void;
    unitCount: number;
    onUpdateMap: () => void;
    onClearMap: () => void;
    
    // UI Toggles
    showMapSettings: boolean;
    setShowMapSettings: (b: boolean) => void;
    showMobileInspector: boolean;
    setShowMobileInspector: (b: boolean) => void;
    hasSelectedAgent: boolean;
}

const roleIcons: Record<Role, string> = {
    [Role.TANK]: '🛡️',
    [Role.WARRIOR]: '⚔️',
    [Role.RANGER]: '🏹',
    [Role.MAGE]: '🔮',
    [Role.SUPPORT]: '⚕️'
};

export const ControlDock: React.FC<ControlDockProps> = (props) => {
    const { 
        hidden, tool, setTool, 
        spawnMode, setSpawnMode, draftRole, setDraftRole,
        selectedObstacle, setSelectedObstacle,
        hpInput, setHpInput, mapW, setMapW, mapH, setMapH,
        unitCount, onUpdateMap, onClearMap,
        showMapSettings, setShowMapSettings,
        showMobileInspector, setShowMobileInspector, hasSelectedAgent
    } = props;

    const toggleTool = (t: ToolType) => {
        if (tool === t) setTool(ToolType.SELECT);
        else setTool(t);
    };

    return (
        <div className={`bg-slate-950 border-t border-slate-800 shrink-0 z-30 transition-all duration-500 w-full pb-[env(safe-area-inset-bottom)] ${hidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
            
            {/* MOBILE GRID LAYOUT (< md) - 4x2 GRID */}
            <div className="md:hidden grid grid-cols-4 gap-2 p-2 h-auto">
                
                {/* ROW 1: PRIMARY ACTIONS */}
                <button onClick={() => toggleTool(ToolType.ADD_BLUE)} className={`h-12 tactical-btn btn-blue ${tool === ToolType.ADD_BLUE ? 'active' : 'opacity-70'}`}>
                    <span className="text-2xl">🔵</span>
                </button>
                
                <button onClick={() => toggleTool(ToolType.ADD_RED)} className={`h-12 tactical-btn btn-red ${tool === ToolType.ADD_RED ? 'active' : 'opacity-70'}`}>
                    <span className="text-2xl">🔴</span>
                </button>

                <div className={`relative h-12 tactical-btn p-0 ${tool === ToolType.OBSTACLE ? 'active border-cyan-500' : ''}`}>
                    <button onClick={() => toggleTool(ToolType.OBSTACLE)} className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🧱</span>
                        <span className="text-[8px] absolute bottom-0.5 right-1 opacity-50">▼</span>
                    </button>
                    <select 
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={selectedObstacle} 
                        onChange={e => { setSelectedObstacle(e.target.value); setTool(ToolType.OBSTACLE); }}
                    >
                        {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                
                <button onClick={() => toggleTool(ToolType.DELETE)} className={`h-12 tactical-btn text-red-400 border-red-900/50 ${tool === ToolType.DELETE ? 'active bg-red-950/50 border-red-500' : ''}`}>
                    <span className="text-2xl">❌</span>
                </button>

                {/* ROW 2: CONFIG & INSPECT */}
                <div className="h-12 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-sm relative">
                    <span className="text-[8px] text-slate-500 absolute -top-1.5 left-1 bg-slate-900 px-0.5">HP</span>
                    <input 
                        type="number" 
                        value={hpInput} 
                        onChange={e => setHpInput(parseInt(e.target.value))} 
                        className="w-full h-full bg-transparent text-center text-sm font-mono text-slate-200 outline-none"
                    />
                </div>

                <button 
                    onClick={() => setShowMapSettings(!showMapSettings)}
                    className={`h-12 tactical-btn ${showMapSettings ? 'border-cyan-500 text-cyan-400' : ''}`}
                >
                    <span className="text-xl">🗺️</span>
                </button>

                <button 
                    onClick={() => hasSelectedAgent && setShowMobileInspector(!showMobileInspector)}
                    disabled={!hasSelectedAgent}
                    className={`col-span-2 h-12 tactical-btn ${showMobileInspector ? 'active' : ''} ${hasSelectedAgent ? 'border-blue-500/50 text-blue-300 animate-pulse-glow' : 'opacity-30'}`}
                >
                    <span className="text-lg mr-2">👁️</span>
                    <span className="text-xs">單位資訊</span>
                </button>
            </div>

            {/* DESKTOP FLEX LAYOUT (>= md) */}
            <div className="hidden md:flex h-40 overflow-x-auto overflow-y-hidden">
                
                {/* ZONE 1: COMMAND TOOLS (Expanded to fill space) */}
                <div className="w-48 border-r border-slate-800 p-3 flex flex-col gap-2 shrink-0">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">地圖編輯</div>
                    <div className="flex gap-2 flex-1">
                        <div className={`flex-1 relative flex flex-col tactical-btn p-0 ${tool === ToolType.OBSTACLE ? 'active' : ''}`}>
                            <button onClick={() => toggleTool(ToolType.OBSTACLE)} className="w-full flex-1 flex flex-col items-center justify-center gap-1">
                                <span className="text-2xl">🧱</span>
                                <span className="text-[10px]">地形</span>
                            </button>
                            <div className="h-6 w-full border-t border-slate-700 relative bg-black/20">
                                <select 
                                    className="w-full h-full bg-transparent text-[10px] text-center appearance-none cursor-pointer text-slate-400 outline-none"
                                    value={selectedObstacle} 
                                    onChange={e => { setSelectedObstacle(e.target.value); setTool(ToolType.OBSTACLE); }}
                                >
                                    {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <span className="absolute right-1 top-1.5 text-[8px] opacity-50 pointer-events-none">▼</span>
                            </div>
                        </div>
                        
                        <button onClick={() => toggleTool(ToolType.DELETE)} className={`flex-1 tactical-btn flex-col text-red-400 border-red-900/50 hover:border-red-500 ${tool === ToolType.DELETE ? 'active border-red-500 bg-red-950/30' : ''}`}>
                            <span className="text-2xl">❌</span>
                            <span className="text-[10px]">移除</span>
                        </button>
                    </div>
                </div>

                {/* ZONE 2: DEPLOYMENT (Flexible Width) */}
                <div className="flex-1 p-3 flex flex-col gap-2 relative min-w-[300px]">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex justify-between">
                        <span>單位部署</span>
                        <span className="text-slate-700 font-mono">單位數: {unitCount}</span>
                    </div>
                    
                    <div className="flex gap-4 h-full">
                        {/* Team Selectors (Sets Tool) */}
                        <div className="flex flex-col gap-2 w-28 shrink-0">
                            <button onClick={() => toggleTool(ToolType.ADD_BLUE)} className={`flex-1 tactical-btn btn-blue flex items-center justify-between px-3 ${tool === ToolType.ADD_BLUE ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                <span className="font-bold text-xs">藍隊</span>
                                <span className="text-lg">🔵</span>
                            </button>
                            <button onClick={() => toggleTool(ToolType.ADD_RED)} className={`flex-1 tactical-btn btn-red flex items-center justify-between px-3 ${tool === ToolType.ADD_RED ? 'active' : 'opacity-60 hover:opacity-100'}`}>
                                <span className="font-bold text-xs">紅隊</span>
                                <span className="text-lg">🔴</span>
                            </button>
                        </div>

                        {/* Mode & Draft Config */}
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 flex flex-col gap-2 min-w-[200px]">
                            <div className="flex bg-slate-950 rounded p-1 gap-1 shrink-0">
                                <button onClick={() => setSpawnMode('RANDOM')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'RANDOM' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    🎲 隨機
                                </button>
                                <button onClick={() => setSpawnMode('DRAFT')} className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${spawnMode === 'DRAFT' ? 'bg-slate-700 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    📝 自選
                                </button>
                            </div>

                            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                                {spawnMode === 'RANDOM' ? (
                                    <div className="text-slate-600 font-mono text-xs flex flex-col items-center animate-pulse">
                                        <span className="text-2xl mb-1">🎲</span>
                                        <span>隨機職階</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-1.5 w-full justify-center">
                                        {Object.values(Role).map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => setDraftRole(role)}
                                                className={`w-10 h-10 rounded border flex flex-col items-center justify-center transition-all ${draftRole === role ? 'bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-110' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                                title={role}
                                            >
                                                <span className="text-lg -mt-1 filter drop-shadow-md">{roleIcons[role]}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* HP Pool */}
                        <div className="flex flex-col justify-center gap-1 w-16 shrink-0">
                            <label className="text-[9px] text-slate-500 font-bold uppercase text-center">生命值</label>
                            <input 
                                type="number" 
                                value={hpInput} 
                                onChange={e => setHpInput(parseInt(e.target.value))} 
                                className="tactical-input text-center text-lg h-10 border-slate-700 focus:border-cyan-500 px-0"
                            />
                        </div>
                    </div>
                </div>

                {/* ZONE 3: MAP OPS */}
                <div className="w-36 border-l border-slate-800 p-3 flex flex-col gap-2 shrink-0 bg-slate-950/50">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">地圖操作</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                            <label className="text-[8px] text-slate-500">寬度</label>
                            <input type="number" className="tactical-input p-1 text-center" value={mapW} onChange={e=>setMapW(Number(e.target.value))}/>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] text-slate-500">高度</label>
                            <input type="number" className="tactical-input p-1 text-center" value={mapH} onChange={e=>setMapH(Number(e.target.value))}/>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                        <button onClick={onUpdateMap} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center border-slate-600 hover:bg-slate-800">重建</button>
                        <button onClick={onClearMap} className="flex-1 tactical-btn text-[9px] px-1 py-2 justify-center text-red-400 border-red-900 hover:bg-red-950">清空單位</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
