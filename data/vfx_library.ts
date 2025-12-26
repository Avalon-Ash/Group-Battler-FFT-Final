
export interface VFXEntry {
    key: string;
    name: string;
    desc: string;
    visuals: string[];
}

export const VFX_LIBRARY = {
    GENERIC: [
        { key: 'ARROW', name: '箭矢 (Arrow)', desc: '遊俠普攻、多重射擊', visuals: ['發光的能量箭矢', '帶有拖尾'] },
        { key: 'FIREBALL', name: '火球 (Fireball)', desc: '法師火球術、爆炸射擊', visuals: ['旋轉的熔岩核心', '煙霧拖尾'] },
        { key: 'BOLT', name: '飛彈 (Bolt)', desc: '奧術飛彈、閃電箭', visuals: ['梭形的能量彈', '顏色依陣營而定'] },
        { key: 'SLASH', name: '斬擊 (Slash)', desc: '戰士普攻、順劈斬', visuals: ['新月形的劍氣波'] },
        { key: 'SMASH', name: '重擊 (Smash)', desc: '坦克制裁、雷霆一擊', visuals: ['地面衝擊波', '碎石飛濺'] },
        { key: 'BEAM', name: '光束 (Beam)', desc: '治療術、法力汲取', visuals: ['持續性的雷射', '連結光束'] },
        { key: 'BOMB', name: '爆彈 (Bomb)', desc: '冰霜陷阱、戰術核彈(飛行物)', visuals: ['拋物線投擲', '圓形炸彈'] }
    ] as VFXEntry[],
    
    ULT_BLUE: [
        { key: 'tb_u1', name: '神聖領域 (Sanctuary)', desc: '坦克', visuals: ['金色巨石陣', '光柱墜落', '落地衝擊環'] },
        { key: 'tb_u2', name: '王者祝福 (Kings Blessing)', desc: '坦克', visuals: ['神聖飛升', '中央光柱', '旋轉光環 (Halo)'] },
        { key: 'wb_u1', name: '雷霆跳斬 (Thunder)', desc: '戰士', visuals: ['電漿爆發', '藍色衝擊波', '散射閃電'] },
        { key: 'wb_u2', name: '破曉 (Daybreak)', desc: '戰士', visuals: ['太陽耀斑', '金色光球升起', '水平神聖光束'] },
        { key: 'rb_u1', name: '水晶巨箭 (Crystal Arrow)', desc: '遊俠', visuals: ['冰晶碎裂', '玻璃碎片飛濺', '寒氣煙霧'] },
        { key: 'rb_u2', name: '星隕箭雨 (Starfall)', desc: '遊俠', visuals: ['流星雨', '金色星體墜落', '大範圍光圈'] },
        { key: 'mb_u1', name: '事件視界 (Event Horizon)', desc: '法師', visuals: ['黑洞塌縮', '黑色吸積盤', '粒子吸入', '空間扭曲'] },
        { key: 'mb_u2', name: '絕對零度 (Absolute Zero)', desc: '法師', visuals: ['冰河時代', '地面結霜', '地底冰刺', '白色寒氣'] },
        { key: 'sb_u1', name: '神聖干涉 (Intervention)', desc: '輔助', visuals: ['光之翼', '柔和金色領域', '羽毛粒子'] },
        { key: 'sb_u2', name: '復活之光 (Resurrection)', desc: '輔助', visuals: ['生命之柱', '巨大綠色光柱', '擴散能量環'] }
    ] as VFXEntry[],

    ULT_RED: [
        { key: 'tr_u1', name: '斷頭台 (Guillotine)', desc: '坦克', visuals: ['處刑巨刃', '紅色粒子刀刃', '鮮血飛濺'] },
        { key: 'tr_u2', name: '亡靈大軍 (Undead Army)', desc: '坦克', visuals: ['腐化大地', '綠色毒霧', '墓碑/骨頭升起'] },
        { key: 'wr_u1', name: '諸神黃昏 (Ragnarok)', desc: '戰士', visuals: ['熔岩噴發', '地面裂開', '岩漿', '紅色衝擊波'] },
        { key: 'wr_u2', name: '血腥旋風 (Blood Storm)', desc: '戰士', visuals: ['鮮血龍捲', '漏斗狀螺旋粒子'] },
        { key: 'rr_u1', name: '終極爆破 (Railgun)', desc: '遊俠', visuals: ['磁軌砲', '黑色貫穿光束', '後座力光環'] },
        { key: 'rr_u2', name: '戰術核彈 (Nuke)', desc: '遊俠', visuals: ['蕈狀雲', '巨大閃光', '煙霧蘑菇雲'] },
        { key: 'mr_u1', name: '毀滅隕石 (Meteor)', desc: '法師', visuals: ['隕石撞擊', '巨大火球拖尾', '熔岩碎塊'] },
        { key: 'mr_u2', name: '死亡一指 (Death Finger)', desc: '法師', visuals: ['死亡射線', '極細紅/黑雷射', '聚能爆炸'] },
        { key: 'sr_u1', name: '靈魂連結 (Soul Link)', desc: '輔助', visuals: ['虛空之網', '深紫色虛空', '鎖鏈射出'] },
        { key: 'sr_u2', name: '先祖之魂 (Ancestors)', desc: '輔助', visuals: ['圖騰之火', '綠色靈魂火', '幽靈粒子'] }
    ] as VFXEntry[],

    STATUS: [
        { key: 'STUN', name: '暈眩 (Stun)', desc: '控制', visuals: ['頭頂旋轉金色星星光環'] },
        { key: 'SILENCE', name: '沉默 (Silence)', desc: '控制', visuals: ['頭頂紫色封印符文/氣泡'] },
        { key: 'BANISH', name: '放逐 (Banish)', desc: '控制', visuals: ['紫色幽靈籠子', '透明化'] },
        { key: 'POLYMORPH', name: '變形 (Polymorph)', desc: '特殊', visuals: ['模型替換為白色綿羊'] },
        { key: 'FROZEN', name: '凍結 (Frozen)', desc: '特殊', visuals: ['被包覆在半透明冰塊中'] },
        { key: 'STASIS', name: '凝滯/金身 (Stasis)', desc: '特殊', visuals: ['金色無敵護盾', '時間停止'] },
        { key: 'DOT', name: '持續傷 (DoT)', desc: '狀態', visuals: ['身上冒出綠色/紫色氣泡或煙霧'] },
        { key: 'HOT', name: '回春 (HoT)', desc: '狀態', visuals: ['身上飄出綠色「+」號'] },
        { key: 'CASTING', name: '詠唱 (Casting)', desc: '動作', visuals: ['腳下魔法陣(八芒星/方陣)', '聚氣光效'] }
    ] as VFXEntry[]
};
