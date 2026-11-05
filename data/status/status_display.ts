// ╔══════════════════════════════════════════════════════════╗
// ║ Status display — 純顯示名稱、分類與排序；無戰鬥參數。    ║
// ║ [ARCH] 中性資料供 core query / UI 共用，不依賴 renderer。 ║
// ╚══════════════════════════════════════════════════════════╝
import type { EffectKind } from '../../types';

export type StatusDisplayKey = Exclude<EffectKind, 'HOT'> | 'REGEN' | 'FROZEN' | 'BURN' | 'POISON' | 'BLEED' | 'SHIELD';
type StatusCategory = 'HARD_CC' | 'DEBUFF' | 'BUFF' | 'DOT' | 'HOT';
interface StatusDisplay {
    readonly kind: EffectKind | 'SHIELD';
    readonly label: string;
    readonly category: StatusCategory;
    readonly priority: number;
    readonly iconKey: StatusDisplayKey;
    readonly description: string;
}
function display(kind: EffectKind | 'SHIELD', iconKey: StatusDisplayKey, label: string, category: StatusCategory, priority: number, description: string): StatusDisplay {
    return { kind, iconKey, label, category, priority, description };
}
export const STATUS_DISPLAY: Readonly<Record<StatusDisplayKey, StatusDisplay>> = {
    STUN: display('STUN', 'STUN', '暈眩', 'HARD_CC', 0, '不能移動或施法'),
    FROZEN: display('STUN', 'FROZEN', '凍結', 'HARD_CC', 0, '冰凍外觀的暈眩'),
    STASIS: display('STASIS', 'STASIS', '凝滯', 'HARD_CC', 1, '暫時離場；包含放逐語意'),
    BANISH: display('BANISH', 'BANISH', '放逐', 'HARD_CC', 2, '暫時離場，並非陣亡'),
    POLYMORPH: display('POLYMORPH', 'POLYMORPH', '變形', 'HARD_CC', 3, '不能移動或施法'),
    FEAR: display('FEAR', 'FEAR', '恐懼', 'HARD_CC', 4, '逃離威脅，不能施法'),
    TAUNT: display('TAUNT', 'TAUNT', '嘲諷', 'HARD_CC', 5, '鎖定實際施加者'),
    SILENCE: display('SILENCE', 'SILENCE', '沉默', 'HARD_CC', 6, '不能施放主動技或奧義'),
    ROOT: display('ROOT', 'ROOT', '禁錮', 'HARD_CC', 7, '不能移動'),
    BLIND: display('BLIND', 'BLIND', '致盲', 'DEBUFF', 8, '命中能力降低'),
    SLOW: display('SLOW', 'SLOW', '緩速', 'DEBUFF', 9, '移動速度降低；時間與強度可來自不同人'),
    VULNERABLE: display('VULNERABLE', 'VULNERABLE', '易傷', 'DEBUFF', 10, '受到傷害增加'),
    DOT: display('DOT', 'DOT', '持續傷害', 'DOT', 11, '每秒傷害率；來源未記錄時不推測種類'),
    POISON: display('DOT', 'POISON', '中毒', 'DOT', 11, '毒性持續傷害；數值為每秒率'),
    BLEED: display('DOT', 'BLEED', '流血', 'DOT', 11, '血／物理持續傷害；數值為每秒率'),
    BURN: display('DOT', 'BURN', '燃燒', 'DOT', 11, '火焰持續傷害；數值為每秒率'),
    REGEN: display('HOT', 'REGEN', '再生', 'HOT', 12, '每秒治療率，不代表實際補血量'),
    INVINCIBLE: display('INVINCIBLE', 'INVINCIBLE', '無敵', 'BUFF', 13, '有效無敵槽位'),
    SHIELD: display('SHIELD', 'SHIELD', '護盾', 'BUFF', 14, '消耗型；無固定期限'),
    REFLECT: display('REFLECT', 'REFLECT', '反傷', 'BUFF', 15, '反彈傷害'),
    LIFESTEAL: display('LIFESTEAL', 'LIFESTEAL', '吸血', 'BUFF', 16, '傷害轉為治療'),
    HASTE: display('HASTE', 'HASTE', '加速', 'BUFF', 17, '提高移動速度與冷卻回復速度'),
};

/** UI ticker 使用十分之一秒；ceil 避免有效狀態提早顯示 0。 */
export const STATUS_TIME_STEPS = 10;
