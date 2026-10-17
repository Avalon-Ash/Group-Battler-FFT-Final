import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Agent } from '../engine/core/Agent';
import { VisualMath } from '../engine/math/VisualMath';
import { SpriteUnitRenderer } from '../engine/renderers/units/factions/SpriteUnitRenderer';
import { spriteAtlasStore, UnitManifest } from '../engine/renderers/units/SpriteAtlasStore';
import { UnitFrameStore } from '../engine/renderers/frame/UnitFrame';
import { hudBarHeight, hudTextHeight, projectionCenterHeight, projectionHeadHeight } from '../data/units/appearance/projection';
import { resolveBodyType, BODY_TYPE_PROFILE } from '../data/units/appearance/bodyTypes';
import { HUD_ANCHOR, UNIT_SPRITE } from '../constants';
import { Role, Team } from '../types';
import type { MapConfig } from '../engine/utils';

// 投影中心／頭頂／血條高度都從精靈資料推導（data/units/appearance/projection.ts）。
// 這裡比對它與 SpriteUnitRenderer 用圖集實際量到的頭頂高度，兩者不得漂移。

const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };
/** 公式與圖集頭頂高度的容許誤差（px） */
const HEAD_TOLERANCE_PX = 2;
/** 職業之間精靈高度本來就不同（法師帽 +7、輔助 −6）；單一職業與公式的差不得超過這個值 */
const ROLE_SPREAD_PX = 8;

function loadManifest(): UnitManifest {
    const manifestPath = join(process.cwd(), 'public', 'assets', 'units', 'manifest.json');
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as UnitManifest;
}

describe('projection heights derive from sprite data', () => {
    const body = resolveBodyType(undefined);

    it('head = sprite target height × body heightScale; center = foot hover + head × centerFraction', () => {
        expect(projectionHeadHeight(body)).toBeCloseTo(UNIT_SPRITE.targetHeightCanvasUnits * BODY_TYPE_PROFILE[body].heightScale);
        expect(projectionCenterHeight(body)).toBeCloseTo(UNIT_SPRITE.footHover + projectionHeadHeight(body) * UNIT_SPRITE.centerFraction);
    });

    it('matches the real atlas head height (mean over roles within 2 px, each role within the role spread)', () => {
        spriteAtlasStore.setManifestForTesting(loadManifest());
        const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        const heads: number[] = [];
        for (const team of [Team.BLUE, Team.RED]) {
            for (const role of roles) {
                const agent = new Agent(`proj_${team}_${role}`, team, 0, 0, MAP);
                agent.role = role;
                const head = SpriteUnitRenderer.getHeadHeight(agent);
                expect(head, `${team}/${role} head height`).not.toBeNull();
                expect(Math.abs(head! - projectionHeadHeight(resolveBodyType(agent)))).toBeLessThanOrEqual(ROLE_SPREAD_PX);
                heads.push(head!);
            }
        }
        const mean = heads.reduce((a, b) => a + b, 0) / heads.length;
        expect(Math.abs(mean - projectionHeadHeight(body))).toBeLessThanOrEqual(HEAD_TOLERANCE_PX);
        // 兩個基準職業（戰士、坦克）與公式本身貼合
        for (const role of [Role.WARRIOR, Role.TANK]) {
            const agent = new Agent(`proj_ref_${role}`, Team.BLUE, 0, 0, MAP);
            agent.role = role;
            expect(Math.abs(SpriteUnitRenderer.getHeadHeight(agent)! - projectionHeadHeight(body))).toBeLessThanOrEqual(HEAD_TOLERANCE_PX);
        }
    });
});

describe('HUD anchor hangs a fixed margin above the projection head', () => {
    const body = resolveBodyType(undefined);

    it('bar height = head + barHeadMargin; text height = bar + textGap', () => {
        expect(hudBarHeight(body) - UNIT_SPRITE.footHover - projectionHeadHeight(body)).toBeCloseTo(HUD_ANCHOR.barHeadMargin);
        expect(hudTextHeight(body) - hudBarHeight(body)).toBeCloseTo(HUD_ANCHOR.textGap);
    });

    it('UnitFrame.hudAnchorY sits hudBarHeight above the foot, rising with physics.z', () => {
        const a = new Agent('hud', Team.BLUE, 0, 0, MAP);
        const store = new UnitFrameStore();
        store.build([a], () => 0, MAP, 0, 'IDLE');
        const rest = store.get(a)!;
        expect(rest.floorY - rest.hudAnchorY).toBeCloseTo(hudBarHeight(body));
        a.physics.z = 40;
        store.build([a], () => 0, MAP, 0, 'IDLE');
        expect(store.get(a)!.floorY - store.get(a)!.hudAnchorY).toBeCloseTo(hudBarHeight(body) + 40);
    });

    it('projection center is below the head and the bar anchor is above it', () => {
        expect(VisualMath.getProjectionCenterY(0, 0, body)).toBeGreaterThan(-projectionHeadHeight(body));
        expect(-VisualMath.getProjectionCenterY(0, 0, body)).toBeLessThan(hudBarHeight(body));
    });
});
