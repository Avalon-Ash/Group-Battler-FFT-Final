/** PLAY 模式（選主角、戰鬥 HUD、結算）的文字。標題用英文全大寫，內文維持繁體中文。主畫面入口的在 showcase.ts（首屏，別把這張表拉進入口包）。 */

export const PLAY_TEXT = {
    SETUP_KICKER: 'PLAY',
    SETUP_TITLE: 'SELECT HERO',
    ROLE_ARIA: '主角職業',
    RANDOM: '隨機',
    CANCEL: '返回',
    START: '開戰',
    NEXT: '再來一場',
    LOGS: '戰鬥記錄',
    MENU: '回主畫面',
    SPECTATING: 'SPECTATING',
    SPECTATE_SPEED_ARIA: '觀戰倍率',
    HP_ARIA: '主角生命',
    MP_ARIA: '主角魔力',
    PAUSE: '暫停（空白鍵）',
    RESUME: '繼續（空白鍵）',
    STOP: '停下（S）',
    AIM_CANCEL: '取消瞄準（Esc／右鍵）',
    /** 瞄準提示：桌機多一段按鍵說明，觸控只說要點什麼 */
    AIM_HINT_TOUCH: '點選目標',
    AIM_HINT_KEYS: 'Esc／右鍵取消',
} as const;

export const PLAY_OUTCOME_TITLE = { WIN: 'VICTORY', LOSE: 'DEFEAT', DRAW: 'DRAW' } as const;
