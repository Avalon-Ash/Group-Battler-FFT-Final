/** 白皮書與座標規格連續下載的 UI 設定。 */
export const DESIGN_EXPORT = {
    /** 保留既有非同步下載間隔，避免兩次同步 click 被瀏覽器攔截。 */
    COORDINATE_DELAY_MS: 300,
} as const;
