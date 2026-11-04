import React, { useEffect, useState } from 'react';
import { AUDIO } from '../../../constants';
import { useCommands } from '../../../hooks/useEnginePort';
import type { AudioBusType } from '../../../data/audio/cues';
import { checkAnnouncerAvailable } from '../../../engine/systems/ui/views/l2';
import { AUDIO_BUS_SLIDERS } from '../../../data/ui/labels/l2';
import { Icons } from '../icons';
import { Card, SettingRow, Slider, Switch } from '../primitives';

export interface AudioSettingsWindowProps {
    engine?: unknown;
}

interface AudioSettingsState {
    master: number;
    music: number;
    sfx: number;
    ui: number;
    muted: boolean;
    announcer: boolean;
}

const VOLUME_STEP = 0.01;

function loadInitialSettings(): AudioSettingsState {
    const defaults: AudioSettingsState = {
        master: AUDIO.DEFAULT_MASTER_VOLUME,
        music: AUDIO.DEFAULT_MUSIC_VOLUME,
        sfx: AUDIO.DEFAULT_SFX_VOLUME,
        ui: AUDIO.DEFAULT_UI_VOLUME,
        muted: false,
        announcer: AUDIO.DEFAULT_ANNOUNCER_ENABLED,
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
            announcer: typeof parsed.announcer === 'boolean' ? parsed.announcer : defaults.announcer,
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

export const AudioSettingsWindow: React.FC<AudioSettingsWindowProps> = () => {
    const [settings, setSettings] = useState<AudioSettingsState>(loadInitialSettings);
    const { send } = useCommands();
    const [announcerAvailable, setAnnouncerAvailable] = useState(false);

    useEffect(() => {
        let alive = true;
        void checkAnnouncerAvailable().then((ok) => {
            if (alive) setAnnouncerAvailable(ok);
        });
        return () => {
            alive = false;
        };
    }, []);

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

    const handleToggleMute = (muted: boolean) => {
        const updated = { ...settings, muted };
        setSettings(updated);
        saveSettings(updated);
        send({ type: 'SET_AUDIO_MUTED', muted });
    };

    const handleToggleAnnouncer = (announcer: boolean) => {
        const updated = { ...settings, announcer };
        setSettings(updated);
        saveSettings(updated);
        send({ type: 'SET_AUDIO_ANNOUNCER', enabled: announcer });
    };

    return (
        <div data-testid="audio-settings-window" className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4 ui-scroll overflow-y-auto select-none">
            {isUrlMuted && (
                <div
                    data-testid="url-muted-indicator"
                    className="card flex items-center gap-3 p-3 text-fg-primary"
                >
                    <Icons.Volume className="h-5 w-5 shrink-0 text-text-warn" />
                    <span className="text-ui-label text-fg-secondary">
                        已靜音（URL 參數 ?mute）：音訊引擎未初始化，所有聲音停用
                    </span>
                </div>
            )}

            <Card className="flex flex-col gap-3 p-3">
                <SettingRow
                    label="靜音所有音效"
                    description="一鍵關閉所有匯流排輸出"
                >
                    <Switch
                        checked={settings.muted}
                        onChange={handleToggleMute}
                        ariaLabel="靜音所有音效"
                        inputTestId="btn-mute-toggle"
                    />
                </SettingRow>

                {announcerAvailable && (
                    <SettingRow
                        label="擊殺播報"
                        description="First Blood、Killing Spree… 語音"
                    >
                        <Switch
                            checked={settings.announcer}
                            onChange={handleToggleAnnouncer}
                            ariaLabel="擊殺播報"
                            inputTestId="btn-announcer-toggle"
                        />
                    </SettingRow>
                )}
            </Card>

            <Card className="flex flex-col gap-3 p-3">
                {AUDIO_BUS_SLIDERS.map(({ bus, label, desc }) => {
                    const val = settings[bus];
                    const percent = Math.round(val * 100);
                    return (
                        <SettingRow
                            key={bus}
                            label={label}
                            description={desc}
                        >
                            <div className="flex items-center gap-2 w-48 max-w-full">
                                <Slider
                                    value={val}
                                    onChange={(next) => handleVolumeChange(bus, next)}
                                    min={0}
                                    max={1}
                                    step={VOLUME_STEP}
                                    disabled={settings.muted}
                                    ariaLabel={label}
                                    inputTestId={`slider-${bus}`}
                                />
                                <span className="w-10 text-right font-mono text-ui-num text-fg-secondary shrink-0">
                                    {percent}%
                                </span>
                            </div>
                        </SettingRow>
                    );
                })}
            </Card>
        </div>
    );
};
