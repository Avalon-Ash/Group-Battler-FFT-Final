
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
        // TANK
        { key: 'tb_u1', name: '神聖領域 (Sanctuary)', desc: '坦克 | 召喚巨石陣', visuals: ['金色巨石陣', '光柱墜落', '落地衝擊環'] },
        { key: 'tb_u2', name: '王者祝福 (Kings Blessing)', desc: '坦克 | 神聖飛升', visuals: ['中央光柱', '旋轉光環', '無敵金光'] },
        { key: 'tb_u3', name: '神盾降臨 (Aegis Fall)', desc: '坦克 | 護盾衝擊', visuals: ['巨大能量盾牌墜落', '藍色衝擊波'] },
        { key: 'tb_u4', name: '泰坦重擊 (Titan Smash)', desc: '坦克 | 地裂重擊', visuals: ['地面裂縫', '碎石飛濺', '塵土煙霧'] },
        { key: 'tb_u5', name: '最終防線 (Final Defense)', desc: '坦克 | 絕對防禦', visuals: ['巨大藍色半圓護罩', '能量力場'] },
        
        // WARRIOR
        { key: 'wb_u1', name: '雷霆跳斬 (Thunder)', desc: '戰士 | 電漿爆發', visuals: ['六角鎖定標記', '藍色閃電柱', '電弧擴散'] },
        { key: 'wb_u2', name: '破曉 (Daybreak)', desc: '戰士 | 太陽耀斑', visuals: ['金色光球升起', '水平神聖光束', '烈陽爆炸'] },
        { key: 'wb_u3', name: '王者之劍 (Excalibur)', desc: '戰士 | 聖劍裁決', visuals: ['巨大光之劍', '垂直斬擊', '金色衝擊'] },
        { key: 'wb_u4', name: '劍刃風暴 (Bladestorm)', desc: '戰士 | 旋風斬', visuals: ['旋轉的藍色劍氣', '刀光殘影'] },
        { key: 'wb_u5', name: '光速衝擊 (Lightspeed)', desc: '戰士 | 超速突進', visuals: ['瞬間殘影', '音爆雲', '藍色閃光'] },
        
        // RANGER
        { key: 'rb_u1', name: '水晶巨箭 (Crystal Arrow)', desc: '遊俠 | 冰晶碎裂', visuals: ['巨大冰箭撞擊', '玻璃碎片飛濺', '寒氣煙霧'] },
        { key: 'rb_u2', name: '星隕箭雨 (Starfall)', desc: '遊俠 | 流星雨', visuals: ['金色星體墜落', '落地爆炸', '多重打擊'] },
        { key: 'rb_u3', name: '軌道轟炸 (Orbital)', desc: '遊俠 | 衛星打擊', visuals: ['天基離子砲', '垂直藍色雷射', '地面燒灼'] },
        { key: 'rb_u4', name: '絕對封鎖 (Lockdown)', desc: '遊俠 | 電磁矩陣', visuals: ['紫色六角網格', '封鎖結界'] },
        { key: 'rb_u5', name: '超載連射 (Overload)', desc: '遊俠 | 極速爆發', visuals: ['高密度火花', '槍口過熱煙霧'] },
        
        // MAGE
        { key: 'mb_u1', name: '事件視界 (Black Hole)', desc: '法師 | 黑洞塌縮', visuals: ['黑色吸積盤', '紫色光環', '碎片吸入'] },
        { key: 'mb_u2', name: '絕對零度 (Frostfall)', desc: '法師 | 冰河世紀', visuals: ['地面結霜', '地底冰刺噴發', '白色寒氣'] },
        { key: 'mb_u3', name: '時間停止 (Time Stop)', desc: '法師 | 砸瓦魯多', visuals: ['金色球體領域', '全場凝滯', '時間波紋'] },
        { key: 'mb_u4', name: '奧術洪流 (Arcane Torrent)', desc: '法師 | 魔力爆發', visuals: ['紫色能量噴泉', '魔法粒子亂流'] },
        { key: 'mb_u5', name: '聚能光束 (Focus Beam)', desc: '法師 | 持續雷射', visuals: ['高能藍色雷射', '聚焦光點'] },
        
        // SUPPORT
        { key: 'sb_u1', name: '神聖干涉 (Intervention)', desc: '輔助 | 光之翼', visuals: ['柔和金色領域', '中央光柱', '羽毛粒子'] },
        { key: 'sb_u2', name: '復活之光 (Resurrection)', desc: '輔助 | 生命之柱', visuals: ['巨大綠色光柱', '螺旋上升靈魂', '擴散能量環'] },
        { key: 'sb_u3', name: '英勇讚美詩 (Hymn)', desc: '輔助 | 能量音波', visuals: ['藍色音符粒子', '擴散波紋'] },
        { key: 'sb_u4', name: '神之怒 (Wrath)', desc: '輔助 | 神聖震擊', visuals: ['金色閃電', '地面爆裂'] },
        { key: 'sb_u5', name: '寧靜之雨 (Rain)', desc: '輔助 | 治癒之雨', visuals: ['全場綠色雨絲', '地面漣漪'] }
    ] as VFXEntry[],

    ULT_RED: [
        // TANK
        { key: 'tr_u1', name: '斷頭台 (Guillotine)', desc: '坦克 | 處刑巨刃', visuals: ['黑色凶兆網格', '巨大紅色斧刃', '鮮血飛濺'] },
        { key: 'tr_u2', name: '亡靈大軍 (Undead Army)', desc: '坦克 | 腐化大地', visuals: ['綠色沼澤地面', '墓碑/骨頭升起', '毒霧'] },
        { key: 'tr_u3', name: '血魔之擁 (Blood Embrace)', desc: '坦克 | 鮮血聚爆', visuals: ['紅色反向衝擊波', '血液向中心匯聚'] },
        { key: 'tr_u4', name: '不朽屍王 (Undying)', desc: '坦克 | 邪能變身', visuals: ['綠色邪能光環', '身體巨大化'] },
        { key: 'tr_u5', name: '腐爛爆發 (Rot)', desc: '坦克 | 毒氣爆炸', visuals: ['綠色毒雲擴散', '黏液飛濺'] },
        
        // WARRIOR
        { key: 'wr_u1', name: '諸神黃昏 (Ragnarok)', desc: '戰士 | 熔岩地裂', visuals: ['地面熔岩裂縫', '地底光束噴發', '紅色衝擊波'] },
        { key: 'wr_u2', name: '血腥旋風 (Blood Storm)', desc: '戰士 | 鮮血龍捲', visuals: ['紅色螺旋煙霧', '血滴粒子'] },
        { key: 'wr_u3', name: '惡魔變身 (Demon Form)', desc: '戰士 | 暗影爆發', visuals: ['黑色煙霧爆炸', '紅色惡魔氣場'] },
        { key: 'wr_u4', name: '無限劍制 (Unlimited)', desc: '戰士 | 劍刃亂舞', visuals: ['無數紅色光劍', '空間斬擊'] },
        { key: 'wr_u5', name: '毀滅重擊 (Devastate)', desc: '戰士 | 虛空重擊', visuals: ['黑色衝擊波', '暗紅碎石'] },
        
        // RANGER
        { key: 'rr_u1', name: '終極爆破 (Railgun)', desc: '遊俠 | 磁軌砲', visuals: ['黑色貫穿光束', '紅色後座力光環', '即時打擊'] },
        { key: 'rr_u2', name: '戰術核彈 (Nuke)', desc: '遊俠 | 核爆', visuals: ['全屏閃光', '蕈狀雲柱', '蕈狀雲冠', '輻射塵'] },
        { key: 'rr_u3', name: '彈幕時間 (Bullet Time)', desc: '遊俠 | 槍林彈雨', visuals: ['全方位紅色彈道', '殘影'] },
        { key: 'rr_u4', name: '煉獄手雷 (Inferno)', desc: '遊俠 | 燃燒彈', visuals: ['持續燃燒區域', '橘色火焰'] },
        { key: 'rr_u5', name: '獵頭者 (Headhunter)', desc: '遊俠 | 鎖定狙擊', visuals: ['紅色十字準星', '鎖定雷射'] },
        
        // MAGE
        { key: 'mr_u1', name: '毀滅隕石 (Meteor)', desc: '法師 | 隕石撞擊', visuals: ['巨大隕石墜落', '地面坑洞光效', '烈火煙霧'] },
        { key: 'mr_u2', name: '死亡一指 (Death Finger)', desc: '法師 | 死亡射線', visuals: ['極細紅黑雷射', '目標點聚能爆炸'] },
        { key: 'mr_u3', name: '混亂之雨 (Chaos Rain)', desc: '法師 | 魔能轟炸', visuals: ['綠色混亂光球', '多點轟炸'] },
        { key: 'mr_u4', name: '虛空傳送門 (Void Portal)', desc: '法師 | 虛空召喚', visuals: ['紫色漩渦傳送門', '重力扭曲'] },
        { key: 'mr_u5', name: '靈魂燃燒 (Soul Burn)', desc: '法師 | 靈魂收割', visuals: ['紫色靈魂火花', '魔力燃燒特效'] },
        
        // SUPPORT
        { key: 'sr_u1', name: '靈魂連結 (Soul Link)', desc: '輔助 | 虛空鎖鏈', visuals: ['深紫色鎖鏈', '中心擴散連結'] },
        { key: 'sr_u2', name: '先祖之魂 (Ancestors)', desc: '輔助 | 圖騰復活', visuals: ['紅色圖騰領域', '金色靈魂火粒子'] },
        { key: 'sr_u3', name: '巫毒大陣 (Voodoo)', desc: '輔助 | 妖術結界', visuals: ['綠色巫毒煙霧', '變形煙塵'] },
        { key: 'sr_u4', name: '鮮血契約 (Blood Pact)', desc: '輔助 | 犧牲治療', visuals: ['血紅衝擊波', '生命力擴散'] },
        { key: 'sr_u5', name: '夢魘降臨 (Nightmare)', desc: '輔助 | 群體恐懼', visuals: ['深紫色夢魘迷霧', '暗影觸手'] }
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
    ] as VFXEntry[],

    // GENERIC PROJECTILES
    PROJECTILES: [
        { key: 'ARROW', name: '箭矢 (Generic)', desc: '拋物線 | 遠程', visuals: ['ArcHeight: 120', 'Sprite: ARROW'] },
        { key: 'BOLT', name: '能量彈 (Generic)', desc: '直線 | 中程', visuals: ['Linear', 'Sprite: BOLT'] },
        { key: 'FIREBALL', name: '火球 (Generic)', desc: '波動 | 魔法', visuals: ['Sine Wave', 'Sprite: FIREBALL'] },
        { key: 'BOMB', name: '炸彈 (Generic)', desc: '拋物線 | 投擲', visuals: ['ArcHeight: 200', 'Spin: 15rad/s'] },
        { key: 'BEAM', name: '光束 (Ray)', desc: '即時 | 連結', visuals: ['Instant Hit', 'Width: 3px'] }
    ] as VFXEntry[],

    // --- IMPERIAL PROJECTILES (NEW) ---
    IMP_PROJ: [
        { key: 'PROJ_BLUE_SNIPER', name: '磁軌狙擊彈', desc: 'Ranger | 高速動能', visuals: ['Sprite: HEX_DART', 'Speed: 1500', 'Linear'] },
        { key: 'PROJ_BLUE_ICE_ARROW', name: '極地冰箭', desc: 'Ranger | 冰霜', visuals: ['Sprite: CRYSTAL', 'Arc', 'Spin: 2'] },
        { key: 'PROJ_BLUE_ORB', name: '奧術法球', desc: 'Mage | 追蹤', visuals: ['Sprite: ORB', 'Wobble', 'Trail: 8'] },
        { key: 'PROJ_BLUE_FROST_BOLT', name: '寒冰錐', desc: 'Mage | 凍結', visuals: ['Sprite: CRYSTAL', 'Linear', 'Scale: 1.2'] }
    ] as VFXEntry[],

    // --- COVENANT PROJECTILES (NEW) ---
    COV_PROJ: [
        { key: 'PROJ_RED_AXE', name: '旋轉飛斧', desc: 'Warrior | 物理', visuals: ['Sprite: AXE', 'Arc', 'Spin: 15'] },
        { key: 'PROJ_RED_CHAOS_ORB', name: '混沌法球', desc: 'Mage | 邪能', visuals: ['Sprite: FIREBALL', 'Heavy Wobble', 'Spin: 5'] },
        { key: 'PROJ_RED_HEAVY_BOLT', name: '重型弩箭', desc: 'Ranger | 爆破', visuals: ['Sprite: BOLT', 'Linear', 'Scale: 2.0'] },
        { key: 'PROJ_RED_SHADOW', name: '暗影波', desc: 'Mage | 虛空', visuals: ['Sprite: BOLT', 'Wobble', 'Purple Trail'] }
    ] as VFXEntry[],

    CAST_RINGS: [
        { key: 'BASIC', name: '普攻詠唱', desc: '弱引導', visuals: ['透明度: 0.3', '無符文', '白色邊框'] },
        { key: 'ACTIVE', name: '主動技詠唱', desc: '標準引導', visuals: ['透明度: 0.4', '有符文', '旋轉速度: 1.0'] },
        { key: 'ULT', name: '奧義詠唱', desc: '強力引導', visuals: ['透明度: 0.6', '雙層符文', '旋轉速度: 2.5', '虛線邊框'] },
        { key: 'AOE_WARNING', name: '危險預警', desc: '敵方AOE', visuals: ['紅色高亮', '快速閃爍', '虛線'] }
    ] as VFXEntry[]
};
