import type { AudioBusType } from '../../audio/cues';

export interface AudioBusSliderDef {
    readonly bus: AudioBusType;
    readonly label: string;
    readonly desc: string;
}

export const AUDIO_BUS_SLIDERS: readonly AudioBusSliderDef[] = [
    { bus: 'master', label: '主音量', desc: '整體音訊輸出音量' },
    { bus: 'music', label: '背景音樂', desc: '場景與戰鬥 BGM 旋律' },
    { bus: 'sfx', label: '戰鬥音效', desc: '打擊、施法、技能與環境破壞' },
    { bus: 'ui', label: '介面音效', desc: '按鈕點擊與狀態提示' },
];

export const SHOWCASE_LAYOUT_LABELS = [
    { value: 'CENTER', label: '中央對齊', title: '中央對齊' },
    { value: 'BOTTOM_CENTER', label: '底部中央', title: '底部中央' },
    { value: 'BOTTOM_LEFT', label: '左下側', title: '左下側' },
    { value: 'BOTTOM_RIGHT', label: '右下側', title: '右下側' },
] as const;

export const SHOWCASE_DIRECTION_LABELS = [
    { value: 'DOWN', title: '向下' },
    { value: 'UP', title: '向上' },
    { value: 'LEFT', title: '向左' },
    { value: 'RIGHT', title: '向右' },
] as const;
