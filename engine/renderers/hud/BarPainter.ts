// ╔══════════════════════════════════════════════════════════╗
// ║  BarPainter — 單位頭頂的血條／護盾／魔力／詠唱條／控制條    ║
// ║  上游：HUDRenderer（UnitFrame.hudAnchorY、footX；裝置縮放）、 ║
// ║        HUD_BAR／HUD_COLORS（尺寸與顏色）、STATUS_VISUALS     ║
// ║        （控制條名稱與顏色）、factionSkin.hud（陣營色）        ║
// ║  [ARCH] 座標規則見 RenderSpec §3、§4（錨點＝投影頭頂上方）。  ║
// ║  填色條是預烘焙 sprite（漸層＋光暈＋高光，依顏色、高度、裝置  ║
// ║  縮放快取），每幀只切片 drawImage；不建立漸層、不設 shadowBlur。║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { HUD_COLORS, HUD_BAR, RENDER_HOTSPOT_CACHE } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { getFactionSkin } from "../../../data/units/factionSkin";
import { isGlowSpritesEnabled } from "../RenderQuality";
import { createCanvas } from "../../graphics/CanvasUtils";

interface BarSkin {
    canvas: HTMLCanvasElement;
    /** 使用者座標的光暈留白（sprite 左上角相對填色區左上角的偏移） */
    pad: number;
    scale: number;
}

/** skins[top 色][高度 × 1000 + 縮放 × 100 + 光暈旗標]：每幀不組合字串鍵 */
const skins = new Map<string, Map<number, BarSkin>>();

function barSkin(top: string, bottom: string, glow: string, h: number, scale: number, glowOn: boolean): BarSkin {
    let perColor = skins.get(top);
    if (!perColor) { perColor = new Map(); skins.set(top, perColor); }
    const key = h * 1000 + Math.round(scale * 100) * 2 + (glowOn ? 1 : 0);
    const hit = perColor.get(key);
    if (hit) return hit;
    const B = HUD_BAR;
    const blur = glowOn ? B.FILL_GLOW_BLUR : 0;
    const padDev = Math.ceil(blur * RENDER_HOTSPOT_CACHE.GLOW_PAD_PER_BLUR);
    const w = B.WIDTH * (1 + B.SHIELD_OVERFLOW);
    const { canvas, ctx } = createCanvas(Math.ceil(w * scale) + padDev * 2, Math.ceil(h * scale) + padDev * 2);
    ctx.translate(padDev, padDev);
    ctx.scale(scale, scale);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    if (blur > 0) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = blur;
    }
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, B.FILL_CORNER);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = HUD_COLORS.GLOSS_HIGHLIGHT;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h * B.GLOSS_RATIO, B.FILL_CORNER);
    ctx.fill();
    const skin = { canvas, pad: padDev / scale, scale };
    perColor.set(key, skin);
    return skin;
}

/** 從 sprite 左側切出 fillW 寬（含左側光暈留白）畫在 (x, y) */
function drawSkin(ctx: CanvasRenderingContext2D, skin: BarSkin, x: number, y: number, fillW: number): void {
    const c = skin.canvas;
    const sw = Math.min(c.width, Math.ceil((skin.pad + fillW) * skin.scale));
    ctx.drawImage(c, 0, 0, sw, c.height, x - skin.pad, y - skin.pad, sw / skin.scale, c.height / skin.scale);
}

type CCTimerKey = 'banishTimer' | 'stunTimer' | 'fearTimer' | 'tauntTimer' | 'silenceTimer' | 'rootTimer' | 'blindTimer';
type CCMaxKey = 'banishMax' | 'stunMax' | 'silenceMax';
interface CCPriorityItem {
    key: CCTimerKey;
    name: string;
    color: string;
    /** 有記錄最大值的欄位；沒有的用 HUD_BAR.CC.DEFAULT_MAX */
    max: CCMaxKey | null;
}

/** 控制條優先序（高→低）：名稱與顏色來自 STATUS_VISUALS */
const CC_PRIORITY: readonly CCPriorityItem[] = [
    { key: 'banishTimer', name: STATUS_VISUALS.BANISH.label, color: STATUS_VISUALS.BANISH.primaryColor, max: 'banishMax' },
    { key: 'stunTimer', name: STATUS_VISUALS.STUN.label, color: STATUS_VISUALS.STUN.primaryColor, max: 'stunMax' },
    { key: 'fearTimer', name: STATUS_VISUALS.FEAR.label, color: STATUS_VISUALS.FEAR.primaryColor, max: null },
    { key: 'tauntTimer', name: STATUS_VISUALS.TAUNT.label, color: STATUS_VISUALS.TAUNT.primaryColor, max: null },
    { key: 'silenceTimer', name: STATUS_VISUALS.SILENCE.label, color: STATUS_VISUALS.SILENCE.primaryColor, max: 'silenceMax' },
    { key: 'rootTimer', name: STATUS_VISUALS.ROOT.label, color: STATUS_VISUALS.ROOT.primaryColor, max: null },
    { key: 'blindTimer', name: STATUS_VISUALS.BLIND.label, color: STATUS_VISUALS.BLIND.primaryColor, max: null },
];

export const BarPainter = {
    /** @param devScale 裝置縮放（quantizeDeviceScale，HUDRenderer 每幀算一次） */
    drawUnitBars(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, isSelected: boolean, devScale: number = 1) {
        const B = HUD_BAR;
        const hasMp = agent.maxMp > 0;
        const contentW = B.WIDTH;
        const hpHeight = B.HP_HEIGHT;
        const mpHeight = hasMp ? B.MP_HEIGHT : 0;
        const gap = hasMp ? B.GAP : 0;
        const totalW = contentW + B.PADDING * 2;
        const totalH = hpHeight + gap + mpHeight + B.PADDING * 2;
        const startX = x - totalW / 2;
        const startY = y - B.TOP_OFFSET;
        const glowOn = isGlowSpritesEnabled();
        const hudSkin = getFactionSkin(agent.team).hud;

        // 外框：深色玻璃底＋邊框；選取時以陣營色加一圈寬的半透明描邊當光暈
        ctx.beginPath();
        ctx.roundRect(startX, startY, totalW, totalH, B.CORNER);
        ctx.fillStyle = HUD_COLORS.CONTAINER_BG;
        ctx.fill();
        ctx.lineWidth = 1;
        if (isSelected) {
            ctx.strokeStyle = hudSkin.border;
            ctx.globalAlpha = B.SELECT_GLOW_ALPHA;
            ctx.lineWidth = B.SELECT_GLOW_WIDTH;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = HUD_COLORS.CONTAINER_BORDER;
        }
        ctx.stroke();

        const barX = startX + B.PADDING;
        const barY = startY + B.PADDING;

        // 血量（陣營色）
        const hpPct = Math.max(0, agent.hp / agent.maxHp);
        ctx.fillStyle = HUD_COLORS.SLOT_BG;
        ctx.fillRect(barX, barY, contentW, hpHeight);
        if (hpPct > B.MIN_PCT) drawSkin(ctx, barSkin(hudSkin.top, hudSkin.bottom, hudSkin.glow, hpHeight, devScale, glowOn), barX, barY, Math.max(1, contentW * hpPct));

        // 護盾：接在血量後面，可超出空槽 SHIELD_OVERFLOW
        const shieldPct = Math.max(0, agent.shield / agent.maxHp);
        if (shieldPct > 0) {
            const shieldStartX = barX + contentW * hpPct;
            const shieldW = contentW * Math.min(shieldPct, 1 - hpPct + B.SHIELD_OVERFLOW);
            if (shieldW > B.MIN_SHIELD_W) {
                const S = HUD_COLORS.SHIELD;
                drawSkin(ctx, barSkin(S.top, S.bottom, S.glow, hpHeight, devScale, glowOn), shieldStartX, barY, shieldW);
                ctx.strokeStyle = S.seam;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(shieldStartX, barY);
                ctx.lineTo(shieldStartX, barY + hpHeight);
                ctx.stroke();
                if (agent.shield > agent.maxHp * B.OVERSHIELD_RATIO) {
                    ctx.strokeStyle = S.outline;
                    ctx.strokeRect(barX - 1, barY - 1, contentW + 2, hpHeight + 2);
                }
            }
        }

        // 魔力
        if (hasMp) {
            const mpPct = Math.max(0, agent.mp / agent.maxMp);
            const mpY = barY + hpHeight + gap;
            ctx.fillStyle = HUD_COLORS.SLOT_BG;
            ctx.fillRect(barX, mpY, contentW, mpHeight);
            if (mpPct > B.MIN_PCT) drawSkin(ctx, barSkin(HUD_COLORS.MP.top, HUD_COLORS.MP.bottom, HUD_COLORS.MP.glow, mpHeight, devScale, glowOn), barX, mpY, Math.max(1, contentW * mpPct));
        }

        // 詠唱條（剩餘時間）
        if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill && skill.cast > 0 && skill.tag !== 'BASIC') {
                const pct = Math.max(0, agent.castTimer / skill.cast);
                const castBarY = startY + totalH + B.CAST.GAP;
                ctx.fillStyle = HUD_COLORS.CAST.bg;
                ctx.fillRect(startX, castBarY, totalW, B.CAST.HEIGHT);
                ctx.fillStyle = skill.color || HUD_COLORS.CAST.defaultColor;
                ctx.fillRect(startX, castBarY, totalW * pct, B.CAST.HEIGHT);
                ctx.strokeStyle = HUD_COLORS.CAST.border;
                ctx.lineWidth = 1;
                ctx.strokeRect(startX, castBarY, totalW, B.CAST.HEIGHT);
            }
        }

        // 控制條（優先序最高的一個）
        const cc = this.getHighestPriorityCC(agent);
        if (cc) {
            const C = B.CC;
            const ccY = startY - C.OFFSET;
            const time = agent[cc.key];
            const maxTime = cc.max ? (agent[cc.max] || time) : C.DEFAULT_MAX;
            ctx.fillStyle = HUD_COLORS.CC_BAR.bg;
            ctx.fillRect(startX, ccY, totalW, C.HEIGHT);
            ctx.fillStyle = cc.color;
            ctx.fillRect(startX, ccY, totalW * Math.min(1, Math.max(0, time / maxTime)), C.HEIGHT);
            ctx.fillStyle = HUD_COLORS.CC_BAR.text;
            ctx.font = C.FONT;
            ctx.textAlign = 'center';
            ctx.fillText(cc.name, startX + totalW / 2, ccY - C.LABEL_GAP);
            ctx.strokeStyle = HUD_COLORS.CC_BAR.border;
            ctx.strokeRect(startX, ccY, totalW, C.HEIGHT);
        }
    },

    /** 成立中、優先序最高的控制（CC_PRIORITY 依序第一個）；沒有回傳 null */
    getHighestPriorityCC(agent: Agent): CCPriorityItem | null {
        for (let i = 0; i < CC_PRIORITY.length; i++) {
            if ((agent[CC_PRIORITY[i].key] || 0) > 0) return CC_PRIORITY[i];
        }
        return null;
    },

    /** 測試／工具用：丟掉 sprite 快取 */
    reset(): void {
        skins.clear();
    },
};
