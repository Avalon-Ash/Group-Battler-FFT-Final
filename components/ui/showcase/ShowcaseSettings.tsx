import React, { useState } from 'react';
import type { MatrixConfig, LayoutPreset, StreamDirection } from './types';
import { SchemaForm } from '../settings/SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    GAMEPLAY_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
import {
    useDirectorSettingsValues,
    useGameplaySettingsValues,
} from '../settings/SettingsWindows';
import { useCommands, useView } from '../../../hooks/useEnginePort';
import { selectGamePlaybackView } from '../../../engine/systems/ui/selectors';
import { UI_SETTINGS } from '../../../constants';
import {
    showcaseConfigStore,
    useShowcaseConfig,
    useShowcaseLayout,
} from './showcaseConfigStore';
import { Icons } from '../icons';
import {
    Card,
    SectionHeading,
    Segmented,
    type SegmentedOption,
    SettingRow,
    Slider,
    Switch,
    Tabs,
    TabsContent,
    type TabItem,
    Textarea,
} from '../primitives';

// 分頁宣告在外部避免重繪反覆卸載重建（tools/ui-e2e/ui-remount-audit.mjs 量測結果）
export interface ShowcaseSettingsProps {
    engine?: unknown;
}

const SHOWCASE_TABS: TabItem[] = [
    {
        value: 'SYSTEM',
        label: <span data-testid="showcase-tab-system">SYSTEM</span>,
        title: 'SYSTEM',
    },
    {
        value: 'CAMERA',
        label: <span data-testid="showcase-tab-camera">CAMERA</span>,
        title: 'CAMERA',
    },
    {
        value: 'VISUAL',
        label: (
            <span data-testid="showcase-tab-visual">
                <span data-testid="showcase-tab-matrix">VISUAL</span>
            </span>
        ),
        title: 'VISUAL',
    },
    {
        value: 'GAMEPLAY',
        label: <span data-testid="showcase-tab-gameplay">GAMEPLAY</span>,
        title: 'GAMEPLAY',
    },
];

const LAYOUT_OPTIONS: SegmentedOption[] = [
    {
        value: 'CENTER',
        label: <span data-testid="showcase-layout-center">中央對齊</span>,
        title: '中央對齊',
    },
    {
        value: 'BOTTOM_CENTER',
        label: <span data-testid="showcase-layout-bottom_center">底部中央</span>,
        title: '底部中央',
    },
    {
        value: 'BOTTOM_LEFT',
        label: <span data-testid="showcase-layout-bottom_left">左下側</span>,
        title: '左下側',
    },
    {
        value: 'BOTTOM_RIGHT',
        label: <span data-testid="showcase-layout-bottom_right">右下側</span>,
        title: '右下側',
    },
];

const DIRECTION_OPTIONS: SegmentedOption[] = [
    {
        value: 'DOWN',
        label: <span data-testid="showcase-direction-down" />,
        icon: <Icons.DirectionDown className="h-4 w-4" />,
        title: '向下',
    },
    {
        value: 'UP',
        label: <span data-testid="showcase-direction-up" />,
        icon: <Icons.DirectionUp className="h-4 w-4" />,
        title: '向上',
    },
    {
        value: 'LEFT',
        label: <span data-testid="showcase-direction-left" />,
        icon: <Icons.DirectionLeft className="h-4 w-4" />,
        title: '向左',
    },
    {
        value: 'RIGHT',
        label: <span data-testid="showcase-direction-right" />,
        icon: <Icons.DirectionRight className="h-4 w-4" />,
        title: '向右',
    },
];

export const ShowcaseSettings: React.FC<ShowcaseSettingsProps> = () => {
    const [activeTab, setActiveTab] = useState('SYSTEM');
    const activeConfig = useShowcaseConfig();
    const activeLayout = useShowcaseLayout();

    const directorSettingsValues = useDirectorSettingsValues();
    const gameplaySettingsValues = useGameplaySettingsValues();
    const playbackView = useView(selectGamePlaybackView);
    const { send } = useCommands();

    const currentTimeScale = playbackView?.timeScale ?? 1.0;

    const updateConfig = <K extends keyof MatrixConfig>(key: K, value: MatrixConfig[K]) => {
        showcaseConfigStore.updateConfig(key, value);
    };

    const handleLayoutChange = (l: LayoutPreset) => {
        showcaseConfigStore.setLayout(l);
    };

    const isMasterOn = activeConfig.enabled && directorSettingsValues.directorEnabled;
    const toggleMaster = (val: boolean) => {
        updateConfig('enabled', val);
        send({ type: 'SET_DIRECTOR_ENABLED', enabled: val });
    };

    const handleTimeScaleChange = (val: number) => {
        send({ type: 'SET_TIME_SCALE', timeScale: val });
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden select-none">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                tabs={SHOWCASE_TABS}
                className="w-full h-full flex flex-col"
            >
                <TabsContent value="SYSTEM" className="p-4 overflow-y-auto ui-scroll flex-1 min-h-0 space-y-4">
                    <Card className="flex flex-col gap-3 p-3">
                        <SettingRow
                            label="展示模式總開關"
                            description={
                                <span className="font-mono text-ui-label text-accent">
                                    {isMasterOn ? 'ALL SYSTEMS ONLINE' : 'SYSTEMS OFFLINE'}
                                </span>
                            }
                        >
                            <Switch
                                checked={isMasterOn}
                                onChange={toggleMaster}
                                ariaLabel="展示模式總開關"
                                inputTestId="showcase-toggle-master"
                            />
                        </SettingRow>

                        <SettingRow
                            label="動畫速度"
                            description={
                                <span className="font-mono text-ui-num text-accent">
                                    {currentTimeScale.toFixed(1)}x
                                </span>
                            }
                        >
                            <div className="flex items-center gap-2 w-48 max-w-full">
                                <Slider
                                    min={UI_SETTINGS.TIME_SCALE.min}
                                    max={UI_SETTINGS.TIME_SCALE.max}
                                    step={UI_SETTINGS.TIME_SCALE.step}
                                    value={currentTimeScale}
                                    ariaLabel="動畫速度"
                                    inputTestId="showcase-slider-timescale"
                                    onChange={handleTimeScaleChange}
                                />
                                <span className="w-12 text-right font-mono text-ui-num text-fg-secondary shrink-0">
                                    {currentTimeScale.toFixed(1)}x
                                </span>
                            </div>
                        </SettingRow>
                    </Card>

                    <Card className="flex flex-col gap-3 p-3">
                        <SectionHeading>展示排版預設</SectionHeading>
                        <Segmented
                            ariaLabel="展示排版預設"
                            value={activeLayout}
                            onValueChange={(val) => handleLayoutChange(val as LayoutPreset)}
                            options={LAYOUT_OPTIONS}
                            className="w-full justify-between"
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="CAMERA" className="p-4 overflow-y-auto ui-scroll flex-1 min-h-0">
                    <SchemaForm
                        fields={DIRECTOR_SETTINGS_SCHEMA}
                        values={directorSettingsValues}
                        onChange={send}
                    />
                </TabsContent>

                <TabsContent value="VISUAL" className="p-4 overflow-y-auto ui-scroll flex-1 min-h-0 space-y-4">
                    <Card className="flex flex-col gap-3 p-3">
                        <SettingRow label="代碼雨視覺開關">
                            <Switch
                                checked={activeConfig.enabled}
                                onChange={(val) => updateConfig('enabled', val)}
                                ariaLabel="代碼雨視覺開關"
                                inputTestId="showcase-toggle-matrix"
                            />
                        </SettingRow>
                    </Card>

                    <Card className="flex flex-col gap-3 p-3">
                        <SectionHeading>流向設定</SectionHeading>
                        <Segmented
                            ariaLabel="流向設定"
                            value={activeConfig.direction}
                            onValueChange={(val) => updateConfig('direction', val as StreamDirection)}
                            options={DIRECTION_OPTIONS}
                            className="w-full justify-between"
                        />
                    </Card>

                    <Card className="flex flex-col gap-3 p-3">
                        <SettingRow
                            label="下墜速度"
                            description={
                                <span className="font-mono text-ui-num text-accent">
                                    {activeConfig.speed.toFixed(1)}
                                </span>
                            }
                        >
                            <Slider
                                min={UI_SETTINGS.MATRIX_SPEED.min}
                                max={UI_SETTINGS.MATRIX_SPEED.max}
                                step={UI_SETTINGS.MATRIX_SPEED.step}
                                value={activeConfig.speed}
                                ariaLabel="下墜速度"
                                onChange={(val) => updateConfig('speed', val)}
                                className="w-40"
                            />
                        </SettingRow>

                        <SettingRow
                            label="字流密度"
                            description={
                                <span className="font-mono text-ui-num text-accent">
                                    {activeConfig.streamGap.toFixed(2)}
                                </span>
                            }
                        >
                            <Slider
                                min={UI_SETTINGS.MATRIX_GAP.min}
                                max={UI_SETTINGS.MATRIX_GAP.max}
                                step={UI_SETTINGS.MATRIX_GAP.step}
                                value={activeConfig.streamGap}
                                ariaLabel="字流密度"
                                onChange={(val) => updateConfig('streamGap', val)}
                                className="w-40"
                            />
                        </SettingRow>
                    </Card>

                    <Card className="flex flex-col gap-2 p-3">
                        <SectionHeading>自訂矩陣字元集</SectionHeading>
                        <Textarea
                            rows={3}
                            className="h-20 font-mono text-ui-label"
                            value={activeConfig.charSet}
                            onChange={(e) => updateConfig('charSet', e.target.value)}
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="GAMEPLAY" className="p-4 overflow-y-auto ui-scroll flex-1 min-h-0 space-y-3">
                    <p className="text-ui-label text-fg-muted">
                        展示模式每局隨機（雙陣營或大逃殺，最多 20 人）。這裡按套用只影響下一局，之後回到隨機；回到手動模式時用你的設定。
                    </p>
                    <SchemaForm
                        fields={GAMEPLAY_SETTINGS_SCHEMA}
                        values={gameplaySettingsValues}
                        onChange={send}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};
