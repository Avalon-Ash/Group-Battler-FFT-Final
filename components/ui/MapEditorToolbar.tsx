
import React, { useState, useRef } from 'react';
import { ToolType, Role } from '../../types';
import { SCENE_DB } from '../../data/scenes';
import { OBSTACLE_DB } from '../../data/obstacles';
import { useDraggable } from '../../hooks/useDraggable';

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

type ConfigModalType = 'UNIT' | 'OBSTACLE' | null;

export const MapEditorToolbar: React.FC<MapEditorToolbarProps> = (props) => {
    const { 
        tool, setTool, 
        mapW, setMapW, mapH, setMapH, currentSceneId, onSetScene,
        spawnMode, setSpawnMode, draftRole, setDraftRole, hpInput, setHpInput,
        selectedObstacle, setSelectedObstacle
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [configModal, setConfigModal] = useState<ConfigModalType>(null);
    const [pendingTool, setPendingTool] = useState<ToolType | null>(null);

    // Draggable Hook
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-center',
        margin: 20
    });

    const handleToolClick = (targetTool: ToolType) => {
        if (targetTool === ToolType.ADD_BLUE || targetTool === ToolType.ADD_RED) {
            setPendingTool(targetTool);
            setConfigModal('UNIT');
        } else if (targetTool === ToolType.OBSTACLE) {
            setPendingTool(targetTool);
            setConfigModal('OBSTACLE');
        } else {
            setTool(targetTool);
        }
    };

    const confirmConfig = () => {
        if (pendingTool) setTool(pendingTool);
        setConfigModal(null);
        setPendingTool(null);
    };

    return (
        <>
            {/* CONFIG MODALS (Glassmorphic) - Fixed Center (Not draggable part of toolbar) */}
            {configModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfigModal(null)}>
                    <div className="liquid-glass rounded-3xl p-6 w-80 animate-bounce-in bg-black/60" onClick={e => e.stopPropagation()}>
                        <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                            {configModal === 'UNIT' ? '部署參數' : '障礙物類型'}
                        </div>
                        
                        {configModal === 'UNIT' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 block mb-1">生命值 (HP)</label>
                                    <input type="number" value={hpInput} onChange={(e) => setHpInput(parseInt(e.target.value))} className="tactical-input w-full" />
                                </div>
                                <div className="flex bg-black/30 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => setSpawnMode('RANDOM')} className={`flex-1 py-2 text-xs rounded-md transition-all ${spawnMode === 'RANDOM' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-500'}`}>隨機職階</button>
                                    <button onClick={() => setSpawnMode('DRAFT')} className={`flex-1 py-2 text-xs rounded-md transition-all ${spawnMode === 'DRAFT' ? 'bg-amber-500/20 text-amber-300 shadow-sm' : 'text-slate-500'}`}>指定職階</button>
                                </div>
                                {spawnMode === 'DRAFT' && (
                                    <select value={draftRole} onChange={(e) => setDraftRole(e.target.value as Role)} className="tactical-input w-full h-10">
                                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                )}
                            </div>
                        )}

                        {configModal === 'OBSTACLE' && (
                            <select value={selectedObstacle} onChange={(e) => setSelectedObstacle(e.target.value)} className="tactical-input w-full h-10">
                                {Object.values(OBSTACLE_DB).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        )}

                        <button onClick={confirmConfig} className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-900/20">
                            確認並切換
                        </button>
                    </div>
                </div>
            )}

            {/* DRAGGABLE CONTAINER */}
            <div 
                ref={ref}
                className="z-40"
                style={style}
                {...dragHandlers}
            >
                {/* DOCK TRIGGER (Closed State) */}
                {!isOpen && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                        onPointerDown={e => e.stopPropagation()} // Prevent drag on click
                        className="liquid-glass rounded-full px-8 py-4 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all font-bold tracking-widest flex items-center gap-3 group shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-black/40 cursor-pointer"
                    >
                        <span className="text-xl">🛠️</span>
                        <span>戰場編輯</span>
                        {/* Handle for dragging when closed (Small dots) */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-50 transition-opacity" onPointerDown={dragHandlers.onPointerDown}>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                        </div>
                    </button>
                )}

                {/* MAIN DOCK (Open State) */}
                {isOpen && (
                    <div className={`liquid-glass rounded-3xl p-3 flex flex-col md:flex-row items-center gap-4 relative pr-10 bg-black/60 shadow-2xl cursor-grab ${isDragging ? 'cursor-grabbing ring-2 ring-cyan-500/30' : ''}`}>
                        
                        {/* Drag Handle Visual */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 flex gap-1 justify-center opacity-30">
                            <div className="w-8 h-1 bg-white rounded-full"></div>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            onPointerDown={e => e.stopPropagation()}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-50 backdrop-blur-sm"
                        >
                            ✕
                        </button>

                        {/* 1. Map Settings Group */}
                        <div className="flex flex-col gap-2 p-2 px-3 bg-white/5 rounded-2xl border border-white/5" onPointerDown={e => e.stopPropagation()}>
                            <div className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider">MAP SIZE</div>
                            <div className="flex gap-2 items-center">
                                <input type="number" value={mapW} onChange={e => setMapW(Math.max(4, parseInt(e.target.value)))} className="w-12 h-8 bg-black/30 rounded-lg text-center text-xs text-slate-300 border border-white/10 outline-none focus:border-cyan-500/50" />
                                <span className="text-slate-600">×</span>
                                <input type="number" value={mapH} onChange={e => setMapH(Math.max(4, parseInt(e.target.value)))} className="w-12 h-8 bg-black/30 rounded-lg text-center text-xs text-slate-300 border border-white/10 outline-none focus:border-cyan-500/50" />
                            </div>
                            <select value={currentSceneId} onChange={(e) => onSetScene(e.target.value)} className="h-8 bg-black/30 rounded-lg text-xs text-slate-300 border border-white/10 outline-none px-2 cursor-pointer hover:bg-white/10">
                                {SCENE_DB.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-px h-16 bg-white/10"></div>

                        {/* 2. Tools Group */}
                        <div className="flex gap-2 p-1" onPointerDown={e => e.stopPropagation()}>
                            <button onClick={() => setTool(ToolType.SELECT)} className={`liquid-icon-btn ${tool === ToolType.SELECT ? 'bg-white/20 text-white border-white/40 shadow-lg' : ''}`} title="選取">↖</button>
                            <button onClick={() => handleToolClick(ToolType.ADD_BLUE)} className={`liquid-icon-btn ${tool === ToolType.ADD_BLUE ? 'bg-blue-500/30 text-blue-300 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'hover:text-blue-300'}`} title="部署藍軍">🔵</button>
                            <button onClick={() => handleToolClick(ToolType.ADD_RED)} className={`liquid-icon-btn ${tool === ToolType.ADD_RED ? 'bg-red-500/30 text-red-300 border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'hover:text-red-300'}`} title="部署紅軍">🔴</button>
                            <button onClick={() => handleToolClick(ToolType.OBSTACLE)} className={`liquid-icon-btn ${tool === ToolType.OBSTACLE ? 'bg-amber-500/30 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'hover:text-amber-300'}`} title="放置障礙">🧱</button>
                            <button onClick={() => setTool(ToolType.DELETE)} className={`liquid-icon-btn ${tool === ToolType.DELETE ? 'bg-red-900/50 text-red-500 border-red-800' : 'hover:text-red-500'}`} title="移除">❌</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
