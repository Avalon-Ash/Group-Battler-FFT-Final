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

/** 技能鈕上的縮寫字數（使用者 2026-11-24：圖示常常長一樣，鈕上加縮寫）；觸控鈕 48 px 寬、--ui-font-num 11 px，兩個字放得下 */
export const SKILL_SHORT_LABEL_LENGTH = 2;
/** 預設規則（skillShortLabel）會撞名或不成詞時的例外；tests/SkillShortLabel.test.ts 擋住同一個主角身上撞名 */
const SKILL_SHORT_LABEL_OVERRIDE: Readonly<Record<string, string>> = {
    wb_b4: '劍柄', // 劍柄重擊：和毀滅重擊撞「重擊」
    wb_u5: '光速', // 光速斬擊：和裂傷斬擊撞「斬擊」
    rb_a4: '冰霜', // 冰霜陷阱：和狩獵陷阱撞「陷阱」
    tr_b3: '尖刺', // 尖刺防禦：和絕對防禦撞「防禦」
    mr_a4: '裂甲', // 裂甲詛咒：和虛弱詛咒撞「詛咒」
    wr_u2: '血腥', // 血腥旋風：和旋風斬撞「旋風」
    mr_b5: '影箭', // 暗影箭：和暗影之怒撞「暗影」
    tr_u1: '斷頭', // 處決斷頭台：後兩字「頭台」不成詞
};

/**
 * PLAY 技能鈕上的縮寫：四字名取後兩字，通常是招式本身（斬擊、彈射、閃現）；後兩字以「之」開頭（淨化之光）改取前兩字。
 * 三字名取前兩字（震盪箭→震盪，不是「盪箭」；預言術→預言）。
 */
export function skillShortLabel(skill: { readonly id: string; readonly name: string }): string {
    const override = SKILL_SHORT_LABEL_OVERRIDE[skill.id];
    if (override) return override;
    const chars = [...skill.name];
    const head = chars.slice(0, SKILL_SHORT_LABEL_LENGTH);
    if (chars.length <= SKILL_SHORT_LABEL_LENGTH + 1) return head.join('');
    const tail = chars.slice(-SKILL_SHORT_LABEL_LENGTH);
    return (tail[0] === '之' ? head : tail).join('');
}
