import { useState } from 'react';
import { UI_Z } from '../../../constants';
import { rgbChannelsToHex, UI_TOKENS } from '../../../data/ui/tokens';
import { Icons } from '../icons';
import {
    Button, Card, ColorInput, EmptyState, IconButton, Input, Meter, NumberInput, SectionHeading, Segmented,
    Select, SettingRow, Slider, Switch, Tabs, TabsContent, Tag, Textarea, Tooltip,
    type SegmentedOption, type SelectGroup, type SelectOption,
} from './index';

const SELECT_OPTIONS: SelectOption[] = [
    { value: 'alpha', label: '阿爾法' },
    { value: 'bravo', label: '布拉沃' },
    { value: 'charlie', label: '查理' },
    { value: 'delta', label: '戴爾塔' },
    { value: 'echo', label: '回聲（停用）', disabled: true },
];

const SELECT_GROUPS: SelectGroup[] = [
    { label: 'TANK', options: [{ value: 'guard', label: '守衛', icon: <Icons.RoleTank className="h-4 w-4" /> }, { value: 'bulwark', label: '堡壘' }] },
    { label: 'MAGE', options: [{ value: 'arc', label: '電弧', icon: <Icons.RoleMage className="h-4 w-4" /> }, { value: 'nova', label: '新星' }] },
    { label: 'SUPPORT', options: Array.from({ length: 12 }, (_, i) => ({ value: `medic-${i}`, label: `醫護 ${i + 1}` })) },
];

const SEGMENTED_OPTIONS: SegmentedOption[] = [
    { value: 'select', label: '選取', icon: <Icons.Select className="h-4 w-4" />, title: '選取工具' },
    { value: 'deploy', label: '部署', icon: <Icons.Deploy className="h-4 w-4" />, title: '部署工具' },
    { value: 'obstacle', label: '障礙', icon: <Icons.Obstacle className="h-4 w-4" />, title: '障礙工具' },
    { value: 'locked', label: '鎖定', disabled: true },
];

const TAB_ITEMS = [
    { value: 'overview', label: 'Overview' },
    { value: 'details', label: 'Details' },
    { value: 'log', label: 'Log' },
];

const TAB_BODY: Record<string, string> = {
    overview: '總覽分頁：標籤用英文全大寬等寬，選中有底線。',
    details: '細節分頁：方向鍵可在標籤之間移動。',
    log: '日誌分頁：內文維持中文。',
};

/** `?ui-gallery` 樣張頁：展示每個共用元件，同時是 tools/ui-e2e/ui-gallery.e2e.mjs 的驗收對象。 */
export function Gallery() {
    const [tab, setTab] = useState('overview');
    const [segment, setSegment] = useState('select');
    const [pick, setPick] = useState('alpha');
    const [groupPick, setGroupPick] = useState('guard');
    const [slider, setSlider] = useState(40);
    const [enabled, setEnabled] = useState(false);
    const [text, setText] = useState('');
    const [note, setNote] = useState('');
    const [committed, setCommitted] = useState(50);
    const [color, setColor] = useState(() => rgbChannelsToHex(UI_TOKENS.accent.DEFAULT));

    return (
        <div className="pointer-events-none fixed inset-0 flex items-start p-3" style={{ zIndex: UI_Z.OVERLAY }}>
            <div
                data-testid="gallery-root"
                className="shell shell-window mat-blur ui-scroll pointer-events-auto flex max-h-full w-full max-w-3xl flex-col gap-4 rounded-ui-window p-4"
            >
                <h2 className="ui-heading text-ui-title text-fg-primary">UI PRIMS</h2>

                <SectionHeading>Buttons</SectionHeading>
                <div className="flex flex-wrap items-center gap-2">
                    <Button data-testid="gallery-button-primary" variant="primary">主要</Button>
                    <Button data-testid="gallery-button-secondary">次要</Button>
                    <Button data-testid="gallery-button-danger" variant="danger">危險</Button>
                    <Button data-testid="gallery-button-ghost" variant="ghost">幽靈</Button>
                    <Button data-testid="gallery-button-disabled" disabled>停用</Button>
                    <Button size="sm"><Icons.Play className="h-4 w-4" />小型</Button>
                    <IconButton data-testid="gallery-icon-button" label="重新開始"><Icons.Restart className="h-4 w-4" /></IconButton>
                    <Tooltip content="提示框內容">
                        <IconButton data-testid="gallery-tooltip" label="說明" variant="ghost"><Icons.Settings className="h-4 w-4" /></IconButton>
                    </Tooltip>
                </div>

                <SectionHeading>Choice</SectionHeading>
                <Segmented data-testid="gallery-segmented" ariaLabel="工具" value={segment} onValueChange={setSegment} options={SEGMENTED_OPTIONS} />
                <div className="flex flex-wrap items-center gap-2">
                    <Select data-testid="gallery-select" ariaLabel="單位代號" value={pick} onValueChange={setPick} options={SELECT_OPTIONS} className="w-48" />
                    <Select data-testid="gallery-select-grouped" ariaLabel="職業分組" value={groupPick} onValueChange={setGroupPick} groups={SELECT_GROUPS} className="w-48" />
                </div>
                <Tabs data-testid="gallery-tabs" value={tab} onValueChange={setTab} tabs={TAB_ITEMS}>
                    {TAB_ITEMS.map((t) => (
                        <TabsContent key={t.value} value={t.value} className="text-ui-body text-fg-secondary">{TAB_BODY[t.value]}</TabsContent>
                    ))}
                </Tabs>

                <SectionHeading action={<Tag tone="neutral">v1</Tag>} data-testid="gallery-section-heading">Inputs</SectionHeading>
                <Card data-testid="gallery-card" className="flex flex-col gap-3">
                    <SettingRow data-testid="gallery-setting-row" label="滑桿" description="拖曳或用方向鍵調整">
                        <Slider data-testid="gallery-slider" ariaLabel="範例滑桿" value={slider} onChange={setSlider} min={0} max={100} step={1} className="w-40" />
                        <span className="w-8 text-right font-mono text-ui-num text-fg-secondary">{slider}</span>
                    </SettingRow>
                    <SettingRow label="開關" description="原生核取方塊，role 為 switch">
                        <Switch data-testid="gallery-switch" ariaLabel="範例開關" checked={enabled} onChange={setEnabled} />
                    </SettingRow>
                    <SettingRow label="數字" description="Enter 或離開欄位提交，Esc 還原">
                        <NumberInput data-testid="gallery-number-input" ariaLabel="範例數字" value={committed} onCommit={setCommitted} min={0} max={9999} step={1} className="w-28" />
                        <span data-testid="gallery-number-value" className="font-mono text-ui-num text-fg-secondary">{committed}</span>
                    </SettingRow>
                    <SettingRow label="顏色">
                        <ColorInput data-testid="gallery-color-input" ariaLabel="範例顏色" value={color} onChange={setColor} />
                    </SettingRow>
                    <Input data-testid="gallery-input" aria-label="範例文字" placeholder="輸入文字" value={text} onChange={(e) => setText(e.target.value)} />
                    <Textarea data-testid="gallery-textarea" aria-label="範例備註" placeholder="輸入備註" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </Card>

                <SectionHeading>Status</SectionHeading>
                <div data-testid="gallery-tag" className="flex flex-wrap items-center gap-2">
                    <Tag tone="neutral">neutral</Tag>
                    <Tag tone="accent">accent</Tag>
                    <Tag tone="danger">danger</Tag>
                    <Tag tone="warn">warn</Tag>
                    <Tag tone="success">success</Tag>
                    <Tag tone="blue">blue</Tag>
                    <Tag tone="red">red</Tag>
                </div>
                <div data-testid="gallery-meter" className="flex flex-col gap-2">
                    <Meter label="生命" value={72} max={100} tone="success" showValue />
                    <Meter label="護盾" value={30} max={100} tone="accent" size="sm" />
                    <Meter label="過熱" value={90} max={100} tone="danger" showValue />
                </div>
                <Card padding="lg">
                    <EmptyState data-testid="gallery-empty-state" icon={<Icons.Database className="h-8 w-8" />} title="沒有資料" description="這裡之後會列出內容。" />
                </Card>
            </div>
        </div>
    );
}
