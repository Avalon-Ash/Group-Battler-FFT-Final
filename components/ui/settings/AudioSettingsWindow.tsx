import React, { useState } from 'react';
import { GameEngine } from '../../../engine/game';
import { AUDIO } from '../../../constants';
import { useEngineCommands } from '../../../hooks/useEngineCommands';
import { AudioBusType } from '../../../data/audio/cues';

export interface AudioSettingsWindowProps {
    engine?: GameEngine;
}

interface AudioSettingsState {
    master: number;
    music: number;
    sfx: number;
    ui: number;
    muted: boolean;
}

function loadInitialSettings(): AudioSettingsState {
    const defaults: AudioSettingsState = {
        master: AUDIO.DEFAULT_MASTER_VOLUME,
        music: AUDIO.DEFAULT_MUSIC_VOLUME,
        sfx: AUDIO.DEFAULT_SFX_VOLUME,
        ui: AUDIO.DEFAULT_UI_VOLUME,
        muted: false,
    };
    if (typeof window === 'undefined' || !window.localStorage) {
        return defaults;
    }
    try {
        const raw = window.localStorage.getItem(AUDIO.STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return {
            master: typeof parsed.master === 'number' ? Math.max(0, Math.min(1, parsed.master)) : defaults.master,
            music: typeof parsed.music === 'number' ? Math.max(0, Math.min(1, parsed.music)) : defaults.music,
            sfx: typeof parsed.sfx === 'number' ? Math.max(0, Math.min(1, parsed.sfx)) : defaults.sfx,
            ui: typeof parsed.ui === 'number' ? Math.max(0, Math.min(1, parsed.ui)) : defaults.ui,
            muted: typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted,
        };
    } catch {
        return defaults;
    }
}

function saveSettings(settings: AudioSettingsState): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(AUDIO.STORAGE_KEY, JSON.stringify(settings));
    } catch {}
}

export const AudioSettingsWindow: React.FC<AudioSettingsWindowProps> = ({ engine }) => {
    const [settings, setSettings] = useState<AudioSettingsState>(loadInitialSettings);
    const { send } = useEngineCommands(engine);

    const isUrlMuted = typeof window !== 'undefined' && window.location
        ? new URLSearchParams(window.location.search).has(AUDIO.QUERY_MUTE_KEY)
        : false;

    const handleVolumeChange = (bus: AudioBusType, value: number) => {
        const clamped = Math.max(0, Math.min(1, value));
        const updated = { ...settings, [bus]: clamped };
        setSettings(updated);
        saveSettings(updated);
        send({ type: 'SET_AUDIO_VOLUME', bus, volume: clamped });
    };

    const handleToggleMute = () => {
        const updated = { ...settings, muted: !settings.muted };
        setSettings(updated);
        saveSettings(updated);
        send({ type: 'SET_AUDIO_MUTED', muted: updated.muted });
    };

    const busSliders: { bus: AudioBusType; label: string; desc: string }[] = [
        { bus: 'master', label: '主音量 (Master)', desc: '整體音訊輸出音量' },
        { bus: 'music', label: '背景音樂 (Music)', desc: '場景與戰鬥 BGM 旋律' },
        { bus: 'sfx', label: '戰鬥音效 (SFX)', desc: '打擊、施法、技能與環境破壞' },
        { bus: 'ui', label: '介面音效 (UI)', desc: '按鈕點擊與狀態提示' },
    ];

    return (
        <div data-testid="audio-settings-window" className="p-4 flex flex-col gap-5 text-white/90 text-xs">
            {isUrlMuted && (
                <div
                    data-testid="url-muted-indicator"
                    className="p-3 bg-white/10 border border-white/20 rounded-xl text-white/90 flex items-center gap-2 text-xs"
                >
                    <span className="text-base">🔇</span>
                    <span>已靜音（URL 參數 ?mute）：音訊引擎未初始化，所有聲音停用</span>
                </div>
            )}

            {/* 靜音切換開關 */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div>
                    <div className="font-semibold text-white">靜音所有音效 (Mute All)</div>
                    <div className="text-[10px] text-white/50">一鍵關閉所有匯流排輸出</div>
                </div>
                <button
                    data-testid="btn-mute-toggle"
                    onClick={handleToggleMute}
                    className="touch-target px-4 py-1.5 rounded-lg font-bold transition-all text-xs border"
                    style={{
                        backgroundColor: settings.muted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(6, 182, 212, 0.2)',
                        borderColor: settings.muted ? 'rgba(239, 68, 68, 0.5)' : 'rgba(6, 182, 212, 0.4)',
                        color: settings.muted ? '#fca5a5' : '#67e8f9',
                    }}
                >
                    {settings.muted ? '已靜音' : '聲音開啟'}
                </button>
            </div>

            {/* 音量滑桿列表 */}
            <div className="flex flex-col gap-4">
                {busSliders.map(({ bus, label, desc }) => {
                    const val = settings[bus];
                    const percent = Math.round(val * 100);
                    return (
                        <div key={bus} className="flex flex-col gap-1.5 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-white/90">{label}</span>
                                <span className="font-mono text-[11px]" style={{ color: '#22d3ee' }}>{percent}%</span>
                            </div>
                            <div className="text-[10px] text-white/50">{desc}</div>
                            <input
                                data-testid={`slider-${bus}`}
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={val}
                                disabled={settings.muted}
                                onChange={(e) => handleVolumeChange(bus, parseFloat(e.target.value))}
                                className={`w-full rounded-lg cursor-pointer h-1.5 ${
                                    settings.muted ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                                style={{ accentColor: '#22d3ee' }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
