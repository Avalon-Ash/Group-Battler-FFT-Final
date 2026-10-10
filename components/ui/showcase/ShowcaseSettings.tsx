import React, { useState, useEffect, useMemo } from 'react';
import { MatrixConfig, LayoutPreset, StreamDirection } from './types';
import { DEFAULT_MATRIX_CONFIG, PRESET_PALETTES } from './defaults';
import { GameEngine } from '../../../engine/game';
import { SchemaForm } from '../settings/SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    ZONE_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
import {
    useDirectorSettingsValues,
    useZoneSettingsValues,
} from '../settings/SettingsWindows';
import { useEngineView } from '../../../hooks/useEngineView';
import { useEngineCommands } from '../../../hooks/useEngineCommands';
import {
    selectGamePlaybackView,
} from '../../../engine/systems/ui/selectors';
import { windowStore } from '../window/windowStore';
import { UI_SETTINGS } from '../../../constants';

interface ShowcaseSettingsProps {
    show?: boolean;
    onClose?: () => void;
    config?: MatrixConfig;
    setConfig?: (c: MatrixConfig) => void;
    timeScale?: number;
    setTimeScale?: (v: number) => void;
    layout?: LayoutPreset;
    setLayout?: (l: LayoutPreset) => void;
    engine?: GameEngine;
    monitorEnabled?: boolean;
    onToggleMonitor?: (v: boolean) => void;
}

type TabKey = 'SYSTEM' | 'CAMERA' | 'MATRIX' | 'GAMEPLAY';

// Shared state for Matrix config & layout so both the ToolWindow and ShowcaseOverlay stay in sync
let sharedConfig: MatrixConfig = DEFAULT_MATRIX_CONFIG;
let sharedLayout: LayoutPreset = 'BOTTOM_CENTER';
const configListeners: Set<(c: MatrixConfig) => void> = new Set();
const layoutListeners: Set<(l: LayoutPreset) => void> = new Set();

function updateSharedConfig(newConfig: MatrixConfig) {
    sharedConfig = newConfig;
    for (const listener of configListeners) listener(newConfig);
}

function updateSharedLayout(newLayout: LayoutPreset) {
    sharedLayout = newLayout;
    for (const listener of layoutListeners) listener(newLayout);
}

export const ShowcaseSettings: React.FC<ShowcaseSettingsProps> = ({
    show,
    onClose,
    config: propConfig,
    setConfig: propSetConfig,
    timeScale: propTimeScale,
    setTimeScale: propSetTimeScale,
    layout: propLayout,
    setLayout: propSetLayout,
    engine,
}) => {
    // If rendered as a bridge component from ShowcaseOverlay (which passes `show`):
    const isBridge = show !== undefined;

    useEffect(() => {
        if (isBridge && propSetConfig) {
            configListeners.add(propSetConfig);
            return () => {
                configListeners.delete(propSetConfig);
            };
        }
    }, [isBridge, propSetConfig]);

    useEffect(() => {
        if (isBridge && propSetLayout) {
            layoutListeners.add(propSetLayout);
            return () => {
                layoutListeners.delete(propSetLayout);
            };
        }
    }, [isBridge, propSetLayout]);

    useEffect(() => {
        if (isBridge && show) {
            windowStore.open('showcaseSettings');
        }
    }, [isBridge, show]);

    const [activeTab, setActiveTab] = useState<TabKey>('SYSTEM');
    const [localConfig, setLocalConfig] = useState<MatrixConfig>(propConfig ?? sharedConfig);
    const [localLayout, setLocalLayout] = useState<LayoutPreset>(propLayout ?? sharedLayout);

    const activeConfig = propConfig ?? localConfig;
    const activeLayout = propLayout ?? localLayout;

    const directorSettingsValues = useDirectorSettingsValues(engine);
    const zoneSettingsValues = useZoneSettingsValues(engine);
    const playbackView = useEngineView(engine, selectGamePlaybackView);
    const { send } = useEngineCommands(engine);

    const currentTimeScale = propTimeScale ?? playbackView?.timeScale ?? 1.0;

    const updateConfig = <K extends keyof MatrixConfig>(key: K, value: MatrixConfig[K]) => {
        const next = { ...activeConfig, [key]: value };
        setLocalConfig(next);
        updateSharedConfig(next);
        propSetConfig?.(next);
    };

    const handleLayoutChange = (l: LayoutPreset) => {
        setLocalLayout(l);
        updateSharedLayout(l);
        propSetLayout?.(l);
    };

    const isMasterOn = activeConfig.enabled && directorSettingsValues.directorEnabled;
    const toggleMaster = (val: boolean) => {
        updateConfig('enabled', val);
        send({ type: 'SET_DIRECTOR_ENABLED', enabled: val });
    };

    const handleTimeScaleChange = (val: number) => {
        send({ type: 'SET_TIME_SCALE', timeScale: val });
        propSetTimeScale?.(val);
    };

    // If rendered as bridge from ShowcaseOverlay, UI is inside the ToolWindow, return null here
    if (isBridge) {
        return null;
    }

    const TabButton = ({ id, label, icon }: { id: TabKey; label: string; icon: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            data-testid={`showcase-tab-${id.toLowerCase()}`}
            className={`flex-1 py-2 text-xs font-bold transition-all relative ${
                activeTab === id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
        >
            <span className="mr-1">{icon}</span> {label}
            {activeTab === id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 shadow-[0_0_8px_cyan]" />
            )}
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col overflow-hidden select-none">
            {/* Tabs Bar */}
            <div className="flex px-2 border-b border-white/5 bg-black/20 shrink-0">
                <TabButton id="SYSTEM" label="系統" icon="🖥️" />
                <TabButton id="CAMERA" label="鏡頭" icon="🎥" />
                <TabButton id="MATRIX" label="視覺" icon="🔮" />
                <TabButton id="GAMEPLAY" label="玩法" icon="🗺️" />
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {activeTab === 'SYSTEM' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/20 flex justify-between items-center shadow-inner">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-white tracking-wide">
                                    展示模式總開關
                                </span>
                                <span className="text-[9px] text-cyan-400/70 font-mono">
                                    ALL SYSTEMS ONLINE
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isMasterOn}
                                    data-testid="showcase-toggle-master"
                                    onChange={(e) => toggleMaster(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                            </label>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>動畫速度</span>
                                <span className="font-mono text-cyan-400">
                                    {currentTimeScale.toFixed(1)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                min={UI_SETTINGS.TIME_SCALE.min}
                                max={UI_SETTINGS.TIME_SCALE.max}
                                step={UI_SETTINGS.TIME_SCALE.step}
                                value={currentTimeScale}
                                data-testid="showcase-slider-timescale"
                                onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                展示排版預設
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {(
                                    [
                                        'CENTER',
                                        'BOTTOM_CENTER',
                                        'BOTTOM_LEFT',
                                        'BOTTOM_RIGHT',
                                    ] as LayoutPreset[]
                                ).map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => handleLayoutChange(l)}
                                        data-testid={`showcase-layout-${l.toLowerCase()}`}
                                        className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition-all ${
                                            activeLayout === l
                                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {l === 'CENTER'
                                            ? '中央對齊'
                                            : l === 'BOTTOM_CENTER'
                                            ? '底部中央'
                                            : l === 'BOTTOM_LEFT'
                                            ? '左下側'
                                            : '右下側'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CAMERA' && (
                    <div className="animate-fade-in">
                        <SchemaForm
                            fields={DIRECTOR_SETTINGS_SCHEMA}
                            values={directorSettingsValues}
                            onChange={send}
                        />
                    </div>
                )}

                {activeTab === 'MATRIX' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-purple-500/5 p-3 rounded-xl border border-purple-500/20 flex justify-between items-center">
                            <span className="text-xs font-bold text-purple-300">代碼雨視覺開關</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={activeConfig.enabled}
                                    data-testid="showcase-toggle-matrix"
                                    onChange={(e) => updateConfig('enabled', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500" />
                            </label>
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">流向設定</span>
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                                {(['DOWN', 'UP', 'LEFT', 'RIGHT'] as StreamDirection[]).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateConfig('direction', d)}
                                        data-testid={`showcase-direction-${d.toLowerCase()}`}
                                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                            activeConfig.direction === d
                                                ? 'bg-cyan-600 text-white shadow-md'
                                                : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        {d === 'DOWN' ? '⬇' : d === 'UP' ? '⬆' : d === 'LEFT' ? '⬅' : '➡'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                    <span>下墜速度</span>
                                    <span className="text-cyan-400">{activeConfig.speed.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={UI_SETTINGS.MATRIX_SPEED.min}
                                    max={UI_SETTINGS.MATRIX_SPEED.max}
                                    step={UI_SETTINGS.MATRIX_SPEED.step}
                                    value={activeConfig.speed}
                                    onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                    <span>字流密度</span>
                                    <span className="text-cyan-400">{activeConfig.streamGap.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={UI_SETTINGS.MATRIX_GAP.min}
                                    max={UI_SETTINGS.MATRIX_GAP.max}
                                    step={UI_SETTINGS.MATRIX_GAP.step}
                                    value={activeConfig.streamGap}
                                    onChange={(e) => updateConfig('streamGap', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">自訂矩陣字元集</label>
                            <textarea
                                className="w-full h-14 text-[10px] font-mono leading-tight bg-black/40 rounded-xl resize-none border border-white/10 p-2 text-slate-300"
                                value={activeConfig.charSet}
                                onChange={(e) => updateConfig('charSet', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'GAMEPLAY' && (
                    <div className="animate-fade-in">
                        <SchemaForm
                            fields={ZONE_SETTINGS_SCHEMA}
                            values={zoneSettingsValues}
                            onChange={send}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};