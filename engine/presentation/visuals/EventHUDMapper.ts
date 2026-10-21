
// ╔══════════════════════════════════════════════════════════════════╗
// ║  EventHUDMapper — 戰鬥事件 → HUD 浮字映射器                     ║
// ║                                                                  ║
// ║  職責：將 GameEvent 轉換為 HUDSystem.addFloatingText() 呼叫      ║
// ║    暴擊判定：event.crit（DamageCalculator 的結果，不另用數值猜）    ║
// ║                                                                  ║
// ║  HUD 佈局常數來源：                                              ║
// ║    hudTextHeight（投影頭頂 + 血條間距 + 文字間距，data/units/    ║
// ║    appearance/projection.ts）/ HUD_LAYOUT → constants/hud.ts (SSOT)  ║
// ╚══════════════════════════════════════════════════════════════════╝

import { GameEvent } from "../../../types";
import { GameEngine } from "../../game";
import { HUDSystem } from "../hud";
import { GridSystem } from "../../systems/grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { HUD_LAYOUT, DAMAGE_TEXT_COLORS, FLOATING_TEXT } from "../../../constants";
import { resolveBodyType } from "../../../data/units/appearance/bodyTypes";
import { hudTextHeight } from "../../../data/units/appearance/projection";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class EventHUDMapper {

    public reset() {
        // No local state needed anymore
    }

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem
    ) {
        const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const terrainHeight = grid.getTerrainHeight(hex.q, hex.r, engine);
        const visualGroundY = event.pos.y - terrainHeight;
        const textOffset = this.textOffsetFor(event, engine);
        
        switch (event.type) {
            case 'DAMAGE':
            case 'HEAL':
            case 'CC_APPLIED':
                this.handleCombatText(event, visualGroundY - textOffset, hud);
                break;
            case 'CAST_START':
                this.handleCastText(event, visualGroundY - textOffset, hud);
                break;
            case 'CAST_FINISH':
                if (event.sourceId) {
                    hud.completeCastText(event.sourceId); // 成功釋放演出
                }
                break;
            case 'CAST_BREAK':
                // 核心：觸發文字崩解，瞬間移除詠唱條
                if (event.sourceId) {
                    hud.breakCastText(event.sourceId, event.team);
                    // 同時彈出 "中斷" 提示
                    const baseY = visualGroundY - textOffset;
                    hud.addFloatingText(event.pos.x, baseY, "INTERRUPTED", DAMAGE_TEXT_COLORS.CRIT, FLOATING_TEXT.SIZE.INTERRUPT, 'CC');
                }
                break;
            case 'KILL_STREAK':
                if (event.text && event.color) {
                    const textY = visualGroundY - textOffset - FLOATING_TEXT.KILL_STREAK_LIFT;
                    const size = FLOATING_TEXT.SIZE.KILL_STREAK_BASE + ((event.value || 1) * FLOATING_TEXT.SIZE.KILL_STREAK_PER);
                    hud.addFloatingText(event.pos.x, textY, event.text, event.color, size, 'KILL_STREAK');
                    camera.addTrauma(FLOATING_TEXT.KILL_STREAK_TRAUMA.BASE + (event.value || 0) * FLOATING_TEXT.KILL_STREAK_TRAUMA.PER);
                }
                break;
        }
    }

    /** 文字基準線離地高度：事件主角（受擊者／施法者）的投影頭頂 + 血條間距 + 文字間距；找不到單位時用預設體型 */
    private textOffsetFor(event: GameEvent, engine: GameEngine): number {
        const ownerId = (event.type === 'DAMAGE' || event.type === 'HEAL' || event.type === 'CC_APPLIED')
            ? event.targetId : event.sourceId;
        const owner = ownerId ? engine.agents.find(a => a.id === ownerId) : undefined;
        return hudTextHeight(resolveBodyType(owner));
    }

    /** visualY 已扣掉 textOffset（文字基準線） */
    private handleCombatText(event: GameEvent, visualY: number, hud: HUDSystem) {
        const baseY = visualY; 
        let text = "";
        let color: string = FLOATING_TEXT.DEFAULT_COLOR;
        let size: number = FLOATING_TEXT.SIZE.DAMAGE;
        let type: 'DAMAGE' | 'HEAL' | 'CC' = 'DAMAGE';
        let xOffset = 0;

        if (event.type === 'DAMAGE') {
            const val = Math.abs(event.value || 0);
            text = val.toString();
            if (event.text) {
                text = `${text} ${event.text === 'ABSORB' ? '吸收' : event.text}`;
            }

            // [業務規則] 傷害顯示優先級：ABSORB > DOT (毒) > CRIT (暴擊) > 預設
            const isCrit = event.crit === true;
            const isDot = event.skill?.ccType === 'DOT';

            if (event.text === 'ABSORB') {
                color = DAMAGE_TEXT_COLORS.ABSORB;
            } else if (isDot) {
                color = STATUS_VISUALS['POISON']?.primaryColor || FLOATING_TEXT.DOT_FALLBACK_COLOR;
            } else if (isCrit) {
                color = DAMAGE_TEXT_COLORS.CRIT;
            } else {
                color = event.color || FLOATING_TEXT.DEFAULT_COLOR;
            }

            size = isCrit ? FLOATING_TEXT.SIZE.CRIT : FLOATING_TEXT.SIZE.DAMAGE;
            type = 'DAMAGE';
            xOffset = (Math.random() - 0.5) * HUD_LAYOUT.DAMAGE_TEXT_SCATTER;

        } else if (event.type === 'HEAL') {
            text = "+" + Math.abs(event.value || 0);
            color = STATUS_VISUALS['REGEN']?.primaryColor || DAMAGE_TEXT_COLORS.HEAL;
            type = 'HEAL';
            xOffset = (Math.random() - 0.5) * HUD_LAYOUT.DAMAGE_TEXT_SCATTER;
        } else {
            text = event.text || "";
            color = event.color || FLOATING_TEXT.DEFAULT_COLOR;
            type = 'CC';
            size = FLOATING_TEXT.SIZE.CC;
            xOffset = HUD_LAYOUT.STATUS_TEXT_OFFSET_X;
        }

        if (text) hud.addFloatingText(event.pos.x + xOffset, baseY, text, color, size, type);
    }

    // [SSOT] 技能名稱與顏色來自 event.skill（Skill 定義層）
    // 詠唱時間 (cast) 決定 SHOUT 的 life 週期，來自 event.skill.cast
    private handleCastText(event: GameEvent, visualY: number, hud: HUDSystem) {
        if (event.skill && event.skill.tag !== 'BASIC') {
            const isUlt = event.skill.tag === 'ULT';
            // 橫幅出現時，該奧義的頭頂 SHOUT 文字不再顯示（其他技能不變）
            if (isUlt) return;

            const offsetY = HUD_LAYOUT.CAST_BAR_Y_OFFSET_NORMAL;
            const baseY = visualY - offsetY; 
            const xOffset = HUD_LAYOUT.CAST_BAR_X_OFFSET; 
            
            hud.addFloatingText(
                event.pos.x + xOffset, 
                baseY, 
                event.skill.name, 
                event.skill.color, 
                14, 
                'SHOUT', 
                isUlt,
                event.sourceId,
                event.skill.cast 
            );
        }
    }
}
