import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { GameEngine } from '../../engine/game';

interface SystemMenuProps {
    onToggleLogs: () => void;
    onToggleDB: () => void;
    onToggleVFXMap?: () => void;
    onToggleMonitor?: () => void; // 新增
    onDownloadSpec: () => void;
    engine?: GameEngine;
    monitorEnabled?: boolean; // 新增
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ onToggleLogs, onToggleDB, onToggleVFXMap, onToggleMonitor, onDownloadSpec, engine, monitorEnabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showDirectorModal, setShowDirectorModal] = useState(false);
    const [showZoneModal, setShowZoneModal] = useState(false);
    
    const [cameraStiffness, setCameraStiffness] = useState(0.8);
    const [zoomStiffness, setZoomStiffness] = useState(1.5);
    const [directorEnabled, setDirectorEnabled] = useState(true);
    
    // Zone Config State
    const [zoneEnabled, setZoneEnabled] = useState(true);
    const [zoneInitialRadius, setZoneInitialRadius] = useState(8);
    const [zoneShrinkInterval, setZoneShrinkInterval] = useState(15);
    const [zoneMinRadius, setZoneMinRadius] = useState(1);

    useEffect(() => {
        if (engine) {
            if (engine.renderer) {
                setCameraStiffness(engine.renderer.camera.followStiffness);
                setZoomStiffness(engine.renderer.camera.zoomStiffness);
            }
            setDirectorEnabled(engine.director.enabled);
            
            // Sync Zone Config
            setZoneEnabled(engine.zoneConfig.enabled);
            setZoneInitialRadius(engine.zoneConfig.initialRadius);
            setZoneShrinkInterval(engine.zoneConfig.shrinkInterval);
            setZoneMinRadius(engine.zoneConfig.minRadius);
        }
    }, [engine, isOpen, showDirectorModal, showZoneModal]);

    const updateStiffness = (val: number) => {
        setCameraStiffness(val);
        if (engine && engine.renderer) engine.renderer.camera.followStiffness = val;
    };

    const updateZoomStiffness = (val: number) => {
        setZoomStiffness(val);
        if (engine && engine.renderer) engine.renderer.camera.zoomStiffness = val;
    };

    const toggleDirector = (val: boolean) => {
        setDirectorEnabled(val);
        if (engine) engine.director.enabled = val;
    };

    const updateZoneConfig = (key: string, val: any) => {
        if (!engine) return;
        engine.zoneConfig[key] = val;
        if (key === 'enabled') setZoneEnabled(val);
        if (key === 'initialRadius') setZoneInitialRadius(val);
        if (key === 'shrinkInterval') setZoneShrinkInterval(val);
        if (key === 'minRadius') setZoneMinRadius(val);
    };

    return (
        <>
            {showDirectorModal && engine && (
                <div className="absolute top-24 right-24 z-[70] w-64 liquid-card p-5 rounded-3xl border border-white/10 bg-black/80 animate-slide-left shadow-2xl backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <Icons.TV className="w-4 h-4 text-cyan-400" />
                            <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Director AI</span>
                        </div>
                        <button onClick={() => setShowDirectorModal(false)} className="text-slate-500 hover:text-white transition-colors">
                            <Icons.Close className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">自動運鏡狀態</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={directorEnabled} onChange={(e) => toggleDirector(e.target.checked)}/>
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                            </label>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>追蹤力度 (Damping)</span>
                                <span className="text-cyan-400 font-mono">{cameraStiffness.toFixed(1)}</span>
                            </div>
                            <input type="range" min="0.1" max="5.0" step="0.1" value={cameraStiffness} onChange={(e) => updateStiffness(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>縮放阻尼 (Zoom)</span>
                                <span className="text-cyan-400 font-mono">{zoomStiffness.toFixed(1)}</span>
                            </div>
                            <input type="range" min="0.1" max="5.0" step="0.1" value={zoomStiffness} onChange={(e) => updateZoomStiffness(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>
                    </div>
                </div>
            )}

            {showZoneModal && engine && (
                <div className="absolute top-24 right-24 z-[70] w-64 liquid-card p-5 rounded-3xl border border-white/10 bg-black/80 animate-slide-left shadow-2xl backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🗺️</span>
                            <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Battle Royale</span>
                        </div>
                        <button onClick={() => setShowZoneModal(false)} className="text-slate-500 hover:text-white transition-colors">
                            <Icons.Close className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center bg-orange-500/5 p-3 rounded-xl border border-orange-500/20">
                            <span className="text-[10px] font-bold text-orange-300 uppercase">大逃殺模式</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={zoneEnabled} onChange={(e) => updateZoneConfig('enabled', e.target.checked)}/>
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>初始安全半徑</span>
                                <span className="text-cyan-400 font-mono">{zoneInitialRadius}</span>
                            </div>
                            <input type="range" min="3" max="20" step="1" value={zoneInitialRadius} onChange={(e) => updateZoneConfig('initialRadius', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>縮圈間隔 (秒)</span>
                                <span className="text-cyan-400 font-mono">{zoneShrinkInterval}</span>
                            </div>
                            <input type="range" min="1" max="60" step="1" value={zoneShrinkInterval} onChange={(e) => updateZoneConfig('shrinkInterval', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>極限圈半徑</span>
                                <span className="text-cyan-400 font-mono">{zoneMinRadius}</span>
                            </div>
                            <input type="range" min="0" max="10" step="1" value={zoneMinRadius} onChange={(e) => updateZoneConfig('minRadius', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-auto">
                <button onClick={() => setIsOpen(!isOpen)} className={`w-12 h-12 rounded-full liquid-card flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-white/10 text-white border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-white'}`}>
                    {isOpen ? <Icons.Close className="w-6 h-6" /> : <Icons.Menu className="w-6 h-6" />}
                </button>

                {isOpen && (
                    <div className="flex flex-col gap-2 animate-slide-down origin-top-right">
                        <button onClick={() => { setShowDirectorModal(true); setIsOpen(false); }} className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-cyan-400 hover:bg-black/60 hover:border-cyan-500/30 transition-all group min-w-[180px]">
                            <Icons.TV className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-cyan-300">AUTO DIRECTOR</span>
                                <span className="text-[10px] text-slate-500 uppercase">自動導播設定</span>
                            </div>
                        </button>

                        <button onClick={() => { setShowZoneModal(true); setIsOpen(false); }} className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-orange-400 hover:bg-black/60 hover:border-orange-500/30 transition-all group min-w-[180px]">
                            <span className="text-2xl group-hover:scale-110 transition-transform filter drop-shadow-md">🗺️</span>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-orange-300">BATTLE ROYALE</span>
                                <span className="text-[10px] text-slate-500 uppercase">大逃殺模式設定</span>
                            </div>
                        </button>

                        {onToggleMonitor && (
                            <button onClick={() => { onToggleMonitor(); setIsOpen(false); }} className={`liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 transition-all group min-w-[180px] ${monitorEnabled ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-300'}`}>
                                <Icons.Expand className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold tracking-widest text-white group-hover:text-cyan-300">MONITOR HUD</span>
                                    <span className="text-[10px] text-slate-500 uppercase">{monitorEnabled ? '關閉監測面板' : '開啟監測面板'}</span>
                                </div>
                            </button>
                        )}

                        <button onClick={() => { onToggleLogs(); setIsOpen(false); }} className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-cyan-400 hover:bg-black/60 hover:border-cyan-500/30 transition-all group min-w-[180px]">
                            <Icons.Log className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-cyan-300">BATTLE LOGS</span>
                                <span className="text-[10px] text-slate-500 uppercase">戰鬥記錄數據</span>
                            </div>
                        </button>

                        <button onClick={() => { onToggleDB(); setIsOpen(false); }} className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-amber-400 hover:bg-black/60 hover:border-amber-500/30 transition-all group min-w-[180px]">
                            <Icons.Database className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-amber-300">DATABASE</span>
                                <span className="text-[10px] text-slate-500 uppercase">技能數據圖鑑</span>
                            </div>
                        </button>

                        <button onClick={() => { onDownloadSpec(); setIsOpen(false); }} className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-emerald-400 hover:bg-black/60 hover:border-emerald-500/30 transition-all group min-w-[180px]">
                            <Icons.Save className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-emerald-300">EXPORT SPEC</span>
                                <span className="text-[10px] text-slate-500 uppercase">導出設計規格文檔</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};