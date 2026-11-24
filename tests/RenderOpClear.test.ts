import { describe, it, expect } from 'vitest';
import { RenderList } from '../engine/renderers/RenderList';

/**
 * RenderList 的 op 是池子重用的：每一個逐幀才寫的欄位都要在 clear() 重設。
 * 地塊光（主角腳下那格，WORKLOG §2 DG）原本沒重設，寫過一次之後那個 op 被拿去畫的每一格都亮。
 */
describe('RenderOp.clear', () => {
    it('resets the tile light so a reused op does not light another tile', () => {
        const list = new RenderList();
        const lit = list.next();
        lit.oLightCol = '#facc15';
        lit.oLightInt = 1;
        list.reset();
        const reused = list.next();
        expect(reused).toBe(lit);
        expect(reused.oLightCol).toBeNull();
        expect(reused.oLightInt).toBe(0);
    });
});
