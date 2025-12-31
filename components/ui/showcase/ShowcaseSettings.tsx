
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
}

type TabKey = 'SYSTEM' | 'CAMERA' | 'MATRIX';

export const ShowcaseSettings: React.FC<ShowcaseSettingsProps> = ({
    show, onClose, config, setConfig, timeScale, setTimeScale, layout, setLayout, engine
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

    const applyPalette = (key: keyof typeof PRESET_PALETTES) => {
        const p = PRESET_PALETTES[key];
        setConfig({
            ...config,
            textColor: p.text,
            headColor: p.head,
            bgColor: p.bg
        });
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

    // 總開關邏輯：同時控制 鏡頭 與 視覺
    const isMasterOn = config.enabled && directorEnabled;
    const toggleMaster = (val: boolean) => {
        // 1. 設定代碼雨
        updateConfig('enabled', val);
        // 2. 設定導播鏡頭
        toggleDirector(val);
    };

    const TabButton = ({ id, label, icon }: { id: TabKey, label: string, icon: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 text-xs font-bold transition-all relative ${activeTab === id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <span className="mr-1">{icon}</span> {label}
            {activeTab === id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 shadow-[0_0_8px_cyan]"></div>}
        </button>
    );

    return (
        <div className="absolute top-20 left-4 md:left-6 z-[60] w-[min(22rem,calc(100vw-2rem))] liquid-glass rounded-3xl animate-slide-up pointer-events-auto select-none max-h-[80vh] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-black/80 border border-white/10 backdrop-blur-xl">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">系統設定 (CONFIG)</span>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex px-2 border-b border-white/5 bg-black/20">
                <TabButton id="SYSTEM" label="系統" icon="🖥️" />
                <TabButton id="CAMERA" label="鏡頭" icon="🎥" />
                <TabButton id="MATRIX" label="視覺" icon="🔮" />
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                
                {/* --- SYSTEM TAB --- */}
                {activeTab === 'SYSTEM' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center shadow-sm hover:bg-white/10 transition-colors">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold text-white tracking-wide">展示模式總開關</span>
                                <span className="text-[10px] text-slate-400 font-mono">MASTER SWITCH (CAM + VFX)</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={isMasterOn} 
                                    onChange={(e) => toggleMaster(e.target.checked)}
                                />
                                <div className="w-12 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
                            </label>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span>時間流速 (Time Scale)</span>
                                <span className="font-mono text-cyan-300">{timeScale.toFixed(1)}x</span>
                            </div>
                            <input 
                                type="range" min="0.1" max="4.0" step="0.1" 
                                value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>
                        
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">介面佈局 (UI Layout)</span>
                            <div className="grid grid-cols-2 gap-2">
                                {(['CENTER', 'BOTTOM_CENTER', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as LayoutPreset[]).map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setLayout(l)}
                                        className={`text-[10px] py-2.5 rounded-xl border font-bold transition-all ${layout === l ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                    >
                                        {l === 'CENTER' ? '置中' : l === 'BOTTOM_CENTER' ? '底部置中' : l === 'BOTTOM_LEFT' ? '左下角' : '右下角'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CAMERA TAB --- */}
                {activeTab === 'CAMERA' && engine && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-cyan-300">自動導播系統</span>
                                <span className="text-[10px] text-slate-500">Auto Director AI</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={directorEnabled}
                                    onChange={(e) => toggleDirector(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                                    <span>運鏡跟隨力度 (Pan Stiffness)</span>
                                    <span className="font-mono text-cyan-300">{cameraStiffness.toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="5.0" step="0.1" 
                                    value={cameraStiffness} 
                                    onChange={(e) => updateCameraStiffness(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="flex justify-between text-[9px] text-slate-600">
                                    <span>慢速 (電影感)</span>
                                    <span>快速 (電競感)</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                                    <span>縮放平滑度 (Zoom Damping)</span>
                                    <span className="font-mono text-cyan-300">{zoomStiffness.toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="5.0" step="0.1" 
                                    value={zoomStiffness} 
                                    onChange={(e) => updateZoomStiffness(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MATRIX TAB --- */}
                {activeTab === 'MATRIX' && (
                    <div className="space-y-5 animate-fade-in">
                        {/* 獨立視覺開關 */}
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-300">代碼雨特效</span>
                                <span className="text-[10px] text-slate-500">MATRIX RAIN VFX</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={config.enabled} 
                                    onChange={(e) => updateConfig('enabled', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 block">流動方向 (Direction)</span>
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                                {(['DOWN', 'UP', 'LEFT', 'RIGHT'] as StreamDirection[]).map(d => (
                                    <button 
                                        key={d}
                                        onClick={() => updateConfig('direction', d)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.direction === d ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {d === 'DOWN' ? '⬇' : d === 'UP' ? '⬆' : d === 'LEFT' ? '⬅' : '➡'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 block">視覺主題 (Color Theme)</span>
                            <div className="flex gap-2">
                                {Object.keys(PRESET_PALETTES).map((key) => {
                                    const p = PRESET_PALETTES[key as keyof typeof PRESET_PALETTES];
                                    return (
                                        <button 
                                            key={key}
                                            onClick={() => applyPalette(key as any)}
                                            className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-lg ring-2 ring-transparent hover:ring-white/20"
                                            style={{ backgroundColor: p.text }}
                                            title={key}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">自訂字元集 (Character Set)</label>
                            <textarea 
                                className="liquid-input w-full h-16 text-[10px] font-mono leading-tight bg-black/40 !rounded-xl resize-none border-white/10 focus:border-cyan-500/50 p-2 text-slate-300"
                                value={config.charSet}
                                onChange={(e) => updateConfig('charSet', e.target.value)}
                                placeholder="輸入顯示字元..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>速度 (Speed)</span> <span className="text-cyan-400">{config.speed.toFixed(1)}</span></div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={config.speed} onChange={(e) => updateConfig('speed', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>密度 (Gap)</span> <span className="text-cyan-400">{config.streamGap.toFixed(2)}</span></div>
                                <input type="range" min="0" max="1.0" step="0.05" value={config.streamGap} onChange={(e) => updateConfig('streamGap', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>3D 景深 (Depth)</span> <span className="text-cyan-400">{config.depthVariance.toFixed(1)}</span></div>
                                <input type="range" min="0" max="2.0" step="0.1" value={config.depthVariance} onChange={(e) => updateConfig('depthVariance', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>雜訊 (Glitch)</span> <span className="text-cyan-400">{config.volatility.toFixed(2)}</span></div>
                                <input type="range" min="0" max="1.0" step="0.05" value={config.volatility} onChange={(e) => updateConfig('volatility', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>字體大小 (Size)</span> <span className="text-cyan-400">{config.fontSize}px</span></div>
                                <input type="range" min="10" max="48" step="2" value={config.fontSize} onChange={(e) => updateConfig('fontSize', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>拖尾長度 (Trail)</span> <span className="text-cyan-400">{config.trailLength}</span></div>
                                <input type="range" min="5" max="50" step="5" value={config.trailLength} onChange={(e) => updateConfig('trailLength', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>背景透度 (BG Alpha)</span> <span className="text-cyan-400">{Math.round(config.bgOpacity*100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.05" value={config.bgOpacity} onChange={(e) => updateConfig('bgOpacity', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold"><span>文字透度 (Text Alpha)</span> <span className="text-cyan-400">{Math.round(config.textOpacity*100)}%</span></div>
                                <input type="range" min="0.1" max="1" step="0.05" value={config.textOpacity} onChange={(e) => updateConfig('textOpacity', parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
