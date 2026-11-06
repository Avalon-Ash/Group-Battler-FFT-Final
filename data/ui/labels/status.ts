export const STATUS_UI = {
    heading: 'ACTIVE EFFECTS', empty: 'NO ACTIVE EFFECTS', emptyHint: '目前沒有持續狀態',
    groups: ['CONTROL', 'DAMAGE & WEAKEN', 'RECOVERY & PROTECT'],
    resistance: 'CONTROL RESISTANCE', ended: '已結束',
    durationSource: '時間來源', valueSource: '強度／最近增量來源',
    selectSource: '選取來源單位', back: '返回狀態列表',
    endedDelayMs: 300, announcementDelayMs: 300, tooltipDelayMs: 250,
} as const;
