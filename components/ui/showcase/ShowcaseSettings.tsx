import React, { useState, useEffect } from 'react';
import { MatrixConfig, LayoutPreset, StreamDirection } from './types';
import { PRESET_PALETTES } from './defaults';
import { GameEngine } from '../../../engine/game';

interface ShowcaseSettingsProps {
    show: boolean;
    onClose: () => void;
    config: MatrixConfig;
    setConfig: (c: MatrixConfig) => void;
    timeScale: number;
    setTimeScale: (v: number) => void;
    layout: LayoutPreset;
    setLayout: (l: LayoutPreset) => void;
    engine?: GameEngine;
    monitorEnabled?: boolean; // 新增
    onToggleMonitor?: (v: boolean) => void; // 新增
}

type TabKey = 'SYSTEM' | 'CAMERA' | 'MATRIX';

export const ShowcaseSettings: React.FC<ShowcaseSettingsProps> = ({
    show, onClose, config, setConfig, timeScale, setTimeScale, layout, setLayout, engine, monitorEnabled, onToggleMonitor
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('SYSTEM');
    const [cameraStiffness, setCameraStiffness] = useState(0.8);
    const [zoomStiffness, setZoomStiffness] = useState(1.5);
    const [directorEnabled, setDirectorEnabled] = useState(true);

    useEffect(() => {
        if (engine && engine.renderer) {
            setCameraStiffness(engine.renderer.camera.followStiffness);
            setZoomStiffness(engine.renderer.camera.zoomStiffness);
            setDirectorEnabled(engine.director.enabled);
        }
    }, [engine, show]);

    if (!show) return null;

    const updateConfig = (key: keyof MatrixConfig, value: any) => {
        setConfig({ ...config, [key]: value });
    };

    const updateCameraStiffness = (val: number) => {
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

    const isMasterOn = config.enabled && directorEnabled;
    const toggleMaster = (val: boolean) => {
        updateConfig('enabled', val);
        toggleDirector(val);
    };

    const TabButton = ({ id, label, icon }: { id: TabKey, label: string, icon: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 text-xs font-bold transition-all relative ${activeTab === id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <span className="mr-1">{icon}</span> {label}
            {activeTab === id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 shadow-[0_0_8px_cyan]"></div>}
        </button>
    );

    return (
        <div className="absolute top-20 left-4 md:left-6 z-[60] w-[min(22rem,calc(100vw-2rem))] liquid-glass rounded-3xl animate-slide-up pointer-events-auto select-none max-h-[80vh] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-black/80 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">系統主控台</span>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex px-2 border-b border-white/5 bg-black/20">
                <TabButton id="SYSTEM" label="系統" icon="🖥️" />
                <TabButton id="CAMERA" label="鏡頭" icon="🎥" />
                <TabButton id="MATRIX" label="視覺" icon="🔮" />
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {activeTab === 'SYSTEM' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/20 flex justify-between items-center shadow-inner">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold text-white tracking-wide">展示模式總開關</span>
                                <span className="text-[9px] text-cyan-400/70 font-mono">ALL SYSTEMS ONLINE</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isMasterOn} onChange={(e) => toggleMaster(e.target.checked)}/>
                                <div className="w-12 h-7 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                            </label>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                                <span>模擬時流 (Time Scale)</span>
                                <span className="font-mono text-cyan-300">{timeScale.toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.1" max="4.0" step="0.1" value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">導播監測面板</span>
                                <span className="text-[9px] text-slate-500 font-mono">DIRECTOR MONITOR HUD</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={monitorEnabled} onChange={(e) => onToggleMonitor?.(e.target.checked)}/>
                                <div className="w-10 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                        
                        <div className="space-y-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase block">介面佈局預設</span>
                            <div className="grid grid-cols-2 gap-2">
                                {(['CENTER', 'BOTTOM_CENTER', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as LayoutPreset[]).map(l => (
                                    <button key={l} onClick={() => setLayout(l)} className={`text-[10px] py-2.5 rounded-xl border font-bold transition-all ${layout === l ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                                        {l === 'CENTER' ? '中央對齊' : l === 'BOTTOM_CENTER' ? '底部中央' : l === 'BOTTOM_LEFT' ? '左下側' : '右下側'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CAMERA' && engine && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                            <span className="text-xs font-bold text-cyan-300">自動導播單獨開關</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={directorEnabled} onChange={(e) => toggleDirector(e.target.checked)}/>
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                                    <span>追蹤力度 (Stiffness)</span>
                                    <span className="font-mono text-cyan-300">{cameraStiffness.toFixed(1)}</span>
                                </div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={cameraStiffness} onChange={(e) => updateCameraStiffness(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                                    <span>縮放平滑度 (Zoom)</span>
                                    <span className="font-mono text-cyan-300">{zoomStiffness.toFixed(1)}</span>
                                </div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={zoomStiffness} onChange={(e) => updateZoomStiffness(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'MATRIX' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="bg-purple-500/5 p-3 rounded-xl border border-purple-500/20 flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-purple-300">代碼雨視覺單獨開關</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.enabled} onChange={(e) => updateConfig('enabled', e.target.checked)}/>
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 block">流向設定</span>
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                                {(['DOWN', 'UP', 'LEFT', 'RIGHT'] as StreamDirection[]).map(d => (
                                    <button key={d} onClick={() => updateConfig('direction', d)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.direction === d ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                                        {d === 'DOWN' ? '⬇' : d === 'UP' ? '⬆' : d === 'LEFT' ? '⬅' : '➡'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>下墜速度</span> <span className="text-cyan-400">{config.speed.toFixed(1)}</span></div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={config.speed} onChange={(e) => updateConfig('speed', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>字流密度</span> <span className="text-cyan-400">{config.streamGap.toFixed(2)}</span></div>
                                <input type="range" min="0" max="1.0" step="0.05" value={config.streamGap} onChange={(e) => updateConfig('streamGap', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>3D 深度感</span> <span className="text-cyan-400">{config.depthVariance.toFixed(1)}</span></div>
                                <input type="range" min="0" max="2.0" step="0.1" value={config.depthVariance} onChange={(e) => updateConfig('depthVariance', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>故障頻率</span> <span className="text-cyan-400">{config.volatility.toFixed(2)}</span></div>
                                <input type="range" min="0" max="1.0" step="0.05" value={config.volatility} onChange={(e) => updateConfig('volatility', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">自訂矩陣字元集</label>
                            <textarea className="liquid-input w-full h-16 text-[10px] font-mono leading-tight bg-black/40 !rounded-xl resize-none border-white/10 p-2 text-slate-300" value={config.charSet} onChange={(e) => updateConfig('charSet', e.target.value)}/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};