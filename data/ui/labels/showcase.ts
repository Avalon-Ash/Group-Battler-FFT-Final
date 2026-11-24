/** 主畫面（展示模式）入口的文字。和 PLAY 的文字表分開：這張在首屏入口包，PLAY 那張跟著 PLAY 畫面延遲載入。 */

/** 主畫面的入口模式：一顆入口鈕，旁邊的交換鈕在兩者之間切換 */
export type ShowcaseEntryMode = 'SIMULATION' | 'PLAY';

export const SHOWCASE_ENTRY: Readonly<Record<ShowcaseEntryMode, { readonly label: string; readonly testId: string; readonly next: ShowcaseEntryMode }>> = {
    SIMULATION: { label: 'START SIMULATION', testId: 'showcase-enter-btn', next: 'PLAY' },
    PLAY: { label: 'PLAY', testId: 'showcase-play-btn', next: 'SIMULATION' },
};

/** 交換鈕的說明（aria-label／title）：說的是按下去會換成哪一個 */
export const showcaseSwapLabel = (next: ShowcaseEntryMode): string => `切換：${SHOWCASE_ENTRY[next].label}`;
