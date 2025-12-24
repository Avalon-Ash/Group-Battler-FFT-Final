
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
        // Fix: Use min(20rem, calc(100vw-3rem)) to prevent overflow on very small screens
        // Also adjusted left/right positioning to be safe on mobile
        <div className="absolute top-20 left-4 md:left-6 z-[60] w-[min(20rem,calc(100vw-2rem))] liquid-glass rounded-3xl p-5 animate-slide-up pointer-events-auto select-none max-h-[80vh] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-black/60 border border-white/10">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">SYSTEM_CONFIG</span>
                </div>
                
                {/* iOS Style Toggle Switch for Master Power */}
                <label className="relative inline-flex items-center cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={config.enabled} 
                        onChange={(e) => updateConfig('enabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
            </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                
                {/* --- TIME & LAYOUT --- */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span>Time Scale</span>
                            <span className="font-mono text-cyan-300">{timeScale.toFixed(1)}x</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="4.0" step="0.1" 
                            value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">UI Layout</span>
                        <div className="grid grid-cols-2 gap-2">
                            {(['CENTER', 'BOTTOM_CENTER', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as LayoutPreset[]).map(l => (
                                <button 
                                    key={l}
                                    onClick={() => setLayout(l)}
                                    className={`text-[10px] py-2 rounded-xl border font-bold transition-all ${layout === l ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                >
                                    {l.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* --- MATRIX: PHYSICS --- */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Flow Direction</span>
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
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span>Speed</span>
                            <span className="font-mono text-cyan-300">{config.speed.toFixed(1)}</span>
                        </div>
                        <input 
                            type="range" min="0.1" max="5.0" step="0.1" 
                            value={config.speed} onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span>Font Size</span>
                            <span className="font-mono text-cyan-300">{config.fontSize}px</span>
                        </div>
                        <input 
                            type="range" min="8" max="64" step="2" 
                            value={config.fontSize} onChange={(e) => updateConfig('fontSize', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span>Depth Effect</span>
                            <span className="font-mono text-cyan-300">{Math.round(config.depthVariance * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1.0" step="0.05" 
                            value={config.depthVariance} onChange={(e) => updateConfig('depthVariance', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* --- MATRIX: COLORS --- */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Presets</span>
                        <div className="flex gap-3">
                            {Object.keys(PRESET_PALETTES).map(k => (
                                <button 
                                    key={k}
                                    onClick={() => applyPalette(k as any)}
                                    className="w-8 h-8 rounded-full border border-white/20 shadow-md transition-transform hover:scale-110"
                                    style={{ backgroundColor: PRESET_PALETTES[k as keyof typeof PRESET_PALETTES].text }}
                                    title={k}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 block">Head</label>
                            <div className="h-8 rounded-lg border border-white/10 overflow-hidden relative">
                                <input type="color" value={config.headColor} onChange={e => updateConfig('headColor', e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer p-0 border-0" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 block">Body</label>
                            <div className="h-8 rounded-lg border border-white/10 overflow-hidden relative">
                                <input type="color" value={config.textColor} onChange={e => updateConfig('textColor', e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer p-0 border-0" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 block">BG</label>
                            <div className="h-8 rounded-lg border border-white/10 overflow-hidden relative">
                                <input type="color" value={config.bgColor} onChange={e => updateConfig('bgColor', e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer p-0 border-0" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                            <span>BG Opacity</span>
                            <span className="font-mono text-cyan-300">{Math.round(config.bgOpacity * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={config.bgOpacity} onChange={(e) => updateConfig('bgOpacity', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>

                <div className="h-px bg-white/10"></div>

                {/* --- MATRIX: CONTENT --- */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Char Set</span>
                    <textarea 
                        className="w-full h-20 bg-black/40 border border-white/10 text-[10px] text-slate-300 p-3 font-mono rounded-xl resize-y focus:border-cyan-500/50 outline-none transition-colors"
                        value={config.charSet}
                        onChange={(e) => updateConfig('charSet', e.target.value)}
                        placeholder="在此輸入亂碼字元..."
                    />
                </div>
            </div>
        </div>
    );
};
