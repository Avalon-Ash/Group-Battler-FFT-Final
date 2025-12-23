
import React from 'react';
import { MatrixConfig, LayoutPreset, StreamDirection } from './types';
import { PRESET_PALETTES } from './defaults';

interface ShowcaseSettingsProps {
    show: boolean;
    onClose: () => void;
    config: MatrixConfig;
    setConfig: (c: MatrixConfig) => void;
    timeScale: number;
    setTimeScale: (v: number) => void;
    layout: LayoutPreset;
    setLayout: (l: LayoutPreset) => void;
}

export const ShowcaseSettings: React.FC<ShowcaseSettingsProps> = ({
    show, onClose, config, setConfig, timeScale, setTimeScale, layout, setLayout
}) => {
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

    return (
        <div className="absolute top-16 left-4 z-[60] w-80 bg-slate-950/95 border border-slate-700 backdrop-blur shadow-2xl p-4 animate-slide-up pointer-events-auto rounded-sm select-none max-h-[85vh] flex flex-col">
            <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2 flex justify-between shrink-0">
                <span>// SYSTEM_CONFIG</span>
                <button onClick={onClose} className="hover:text-white">✕</button>
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                
                {/* --- TIME & LAYOUT --- */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>戰場速率 (Time Scale)</span>
                            <span className="font-mono text-cyan-300">{timeScale.toFixed(1)}x</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="4.0" step="0.1" 
                            value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <span className="text-xs text-slate-400 block">UI 配置 (Layout)</span>
                        <div className="grid grid-cols-2 gap-2">
                            {(['CENTER', 'BOTTOM_CENTER', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as LayoutPreset[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => setLayout(l)}
                                    className={`text-[10px] py-1 border ${layout === l ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                >
                                    {l.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <hr className="border-slate-800" />

                {/* --- MATRIX: PHYSICS --- */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <span className="text-xs text-slate-400 block">流向 (Direction)</span>
                        <div className="flex bg-slate-900 rounded border border-slate-700 overflow-hidden">
                            {(['DOWN', 'UP', 'LEFT', 'RIGHT'] as StreamDirection[]).map(d => (
                                <button 
                                    key={d}
                                    onClick={() => updateConfig('direction', d)}
                                    className={`flex-1 py-1 text-[10px] hover:bg-slate-800 ${config.direction === d ? 'bg-cyan-900 text-cyan-300' : 'text-slate-500'}`}
                                >
                                    {d === 'DOWN' ? '⬇' : d === 'UP' ? '⬆' : d === 'LEFT' ? '⬅' : '➡'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>流速 (Speed)</span>
                            <span className="font-mono text-cyan-300">{config.speed.toFixed(1)}</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="5.0" step="0.1" 
                            value={config.speed} onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>景深效果 (Depth)</span>
                            <span className="font-mono text-cyan-300">{Math.round(config.depthVariance * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1.0" step="0.05" 
                            value={config.depthVariance} onChange={(e) => updateConfig('depthVariance', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>生成間距 (Gap/Freq)</span>
                            <span className="font-mono text-cyan-300">{config.streamGap.toFixed(1)}</span>
                        </div>
                        <input 
                            type="range" min="0" max="2.0" step="0.1" 
                            value={config.streamGap} onChange={(e) => updateConfig('streamGap', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                        <p className="text-[9px] text-slate-500 text-right">0 = 頭尾相接</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>拖尾長度 (Trail)</span>
                            <span className="font-mono text-cyan-300">{config.trailLength}</span>
                        </div>
                        <input 
                            type="range" min="5" max="50" step="1" 
                            value={config.trailLength} onChange={(e) => updateConfig('trailLength', parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <hr className="border-slate-800" />

                {/* --- MATRIX: COLORS --- */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <span className="text-xs text-slate-400 block">主題預設 (Presets)</span>
                        <div className="flex gap-2">
                            {Object.keys(PRESET_PALETTES).map(k => (
                                <button 
                                    key={k}
                                    onClick={() => applyPalette(k as any)}
                                    className="w-6 h-6 rounded border border-slate-600 shadow-sm"
                                    style={{ backgroundColor: PRESET_PALETTES[k as keyof typeof PRESET_PALETTES].text }}
                                    title={k}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block">首字光暈</label>
                            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-700">
                                <input type="color" value={config.headColor} onChange={e => updateConfig('headColor', e.target.value)} className="bg-transparent w-full h-4 border-0 p-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block">文字本體</label>
                            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-700">
                                <input type="color" value={config.textColor} onChange={e => updateConfig('textColor', e.target.value)} className="bg-transparent w-full h-4 border-0 p-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 block">背景底色</label>
                            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-700">
                                <input type="color" value={config.bgColor} onChange={e => updateConfig('bgColor', e.target.value)} className="bg-transparent w-full h-4 border-0 p-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>背景濃度 (BG Alpha)</span>
                            <span className="font-mono text-cyan-300">{Math.round(config.bgOpacity * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={config.bgOpacity} onChange={(e) => updateConfig('bgOpacity', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <hr className="border-slate-800" />

                {/* --- MATRIX: CONTENT --- */}
                <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">字碼庫 (Content)</span>
                    <textarea 
                        className="w-full h-16 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 p-2 font-mono rounded resize-y focus:border-cyan-500 outline-none"
                        value={config.charSet}
                        onChange={(e) => updateConfig('charSet', e.target.value)}
                        placeholder="在此輸入亂碼字元..."
                    />
                </div>
            </div>
        </div>
    );
};
