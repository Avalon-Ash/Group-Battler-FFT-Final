/** 合併 className；忽略假值。變體樣式用 cva，這裡只負責串接。 */
export const cn = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');
