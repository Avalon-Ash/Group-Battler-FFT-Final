
import React, { useState } from 'react';
import { ToolType, Role } from '../../types';
import { SCENE_DB } from '../../data/scenes';
import { OBSTACLE_DB } from '../../data/obstacles';

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

    // Actions
    onRandomBattlefield: () => void;
    onReset: () => void;
}

export const MapEditorToolbar: React.FC<MapEditorToolbarProps> = (props) => {
    const { 
        tool, setTool, 
        mapW, setMapW, mapH, setMapH, currentSceneId, onSetScene,
        spawnMode, setSpawnMode, draftRole, setDraftRole, hpInput, setHpInput,
        selectedObstacle, setSelectedObstacle,
        onRandomBattlefield, onReset
    } = props;

    const [showConfig, setShowConfig] = useState(false);

    // Contextual Sub-bar content
    const renderContextBar = () => {
        if (tool === ToolType.ADD_BLUE || tool === ToolType.ADD_RED) {
            return (
                <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-t-lg border-x border-t border-slate-700 mx-auto w-fit animate-slide-up">
                    <div className="flex bg-slate-950 rounded p-0.5 border border-slate-700">
                        <button onClick={() => setSpawnMode('RANDOM')} className={`px-2 py-1 text-[10px] rounded ${spawnMode === 'RANDOM' ? 'bg-cyan-900 text-cyan-300' : 'text-slate-500'}`}>隨機</button>
                        <button onClick={() => setSpawnMode('DRAFT')} className={`px-2 py-1 text-[10px] rounded ${spawnMode === 'DRAFT' ? 'bg-amber-900 text-amber-300' : 'text-slate-500'}`}>自選</button>
                    </div>
                    
                    {spawnMode === 'DRAFT' && (
                        <select 
                            value={draftRole} 
                            onChange={(e) => setDraftRole(e.target.value as Role)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded outline-none"
                        >
                            {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}

                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold">HP</span>
                        <input 
                            type="number" 
                            value={hpInput} 
                            onChange={(e) => setHpInput(parseInt(e.target.value))} 
                            className="w-12 bg-slate-950 border border-slate-700 text-center text-xs text-green-400 rounded py-1 outline-none focus:border-green-500"
                        />
                    </div>
                </div>
            );
        }
        if (tool === ToolType.OBSTACLE) {
            return (
                <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-t-lg border-x border-t border-slate-700 mx-auto w-fit animate-slide-up">
                    <span className="text-[10px] text-slate-500 font-bold">類型</span>
                    <select 
                        value={selectedObstacle} 
                        onChange={(e) => setSelectedObstacle(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded outline-none w-32"
                    >
                        {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none flex flex-col items-center pb-[env(safe-area-inset-bottom)]">
            
            {/* 1. Contextual Sub-bar (Floating above main bar) */}
            <div className="pointer-events-auto mb-[-1px] z-0 relative">
                {renderContextBar()}
            </div>

            {/* 2. Main Toolbar */}
            <div className="pointer-events-auto bg-slate-950/95 backdrop-blur border-t border-slate-800 shadow-2xl w-full flex flex-col sm:flex-row items-center justify-between px-2 py-2 sm:px-4 gap-2 sm:gap-0 z-10">
                
                {/* Left: Map Config Toggle */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className={`flex items-center gap-2 px-3 py-2 rounded border transition-all ${showConfig ? 'bg-slate-800 border-cyan-500 text-cyan-400' : 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-200'}`}
                    >
                        <span className="text-lg">⚙️</span>
                        <span className="text-xs font-bold hidden sm:inline">地圖設定</span>
                    </button>

                    {/* Quick Scene Selector (Mobile optimized) */}
                    <select 
                        value={currentSceneId} 
                        onChange={(e) => onSetScene(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2 py-2 rounded outline-none sm:w-32"
                    >
                        {SCENE_DB.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* Center: Tools */}
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setTool(ToolType.SELECT)} className={`w-10 h-10 rounded flex items-center justify-center text-lg transition-all ${tool === ToolType.SELECT ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`} title="選取">↖</button>
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>
                    <button onClick={() => setTool(ToolType.ADD_BLUE)} className={`w-10 h-10 rounded flex items-center justify-center text-xl transition-all ${tool === ToolType.ADD_BLUE ? 'bg-blue-900/50 border border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-slate-500 hover:text-blue-400'}`} title="部署藍軍">🔵</button>
                    <button onClick={() => setTool(ToolType.ADD_RED)} className={`w-10 h-10 rounded flex items-center justify-center text-xl transition-all ${tool === ToolType.ADD_RED ? 'bg-red-900/50 border border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-slate-500 hover:text-red-400'}`} title="部署紅軍">🔴</button>
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>
                    <button onClick={() => setTool(ToolType.OBSTACLE)} className={`w-10 h-10 rounded flex items-center justify-center text-xl transition-all ${tool === ToolType.OBSTACLE ? 'bg-amber-900/30 border border-amber-500 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} title="放置障礙">🧱</button>
                    <button onClick={() => setTool(ToolType.DELETE)} className={`w-10 h-10 rounded flex items-center justify-center text-xl transition-all ${tool === ToolType.DELETE ? 'bg-slate-800 border border-red-500 text-red-500' : 'text-slate-500 hover:text-red-500'}`} title="移除">❌</button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button 
                        onClick={onRandomBattlefield}
                        className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 hover:border-purple-400 text-purple-300 rounded text-xs font-bold tracking-wider flex items-center gap-2 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
                    >
                        <span>🎲</span> 隨機戰場
                    </button>
                    <button 
                        onClick={onReset}
                        className="w-10 h-10 flex items-center justify-center rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all bg-slate-900"
                        title="重置單位狀態"
                    >
                        ↺
                    </button>
                </div>
            </div>

            {/* 3. Slide-up Config Panel */}
            {showConfig && (
                <div className="pointer-events-auto absolute bottom-full left-0 mb-2 ml-2 p-4 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl animate-slide-up w-64 backdrop-blur">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">地圖參數</div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">寬度</label>
                            <input type="number" value={mapW} onChange={e => setMapW(Math.max(4, Math.min(30, parseInt(e.target.value))))} className="tactical-input w-full text-center"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">高度</label>
                            <input type="number" value={mapH} onChange={e => setMapH(Math.max(4, Math.min(30, parseInt(e.target.value))))} className="tactical-input w-full text-center"/>
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-500">
                        * 調整尺寸將會清空當前地圖
                    </div>
                </div>
            )}
        </div>
    );
};
