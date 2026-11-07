/**
 * 探針的狀態快照與情境鏈（render-verify §5）。
 *
 * - captureDiag：截圖與狀態在同一次 page.evaluate 裡取，兩者一定是同一幀；JSON 標上
 *   battleTime 與合成時間，畫面和規則可以互相對照（數字對但畫面舊、畫面對但規則錯都抓得到）。
 * - createScenario：從已知狀態出發，每一步推進固定幀數後擷取並檢查中間狀態，
 *   最後印 `Summary:` 並回傳退出碼。場上沒有單位時直接判失敗（METHODOLOGY §4.11 前提自驗）。
 *
 * 快照只讀真實狀態，不另外模擬、不印預期答案；只在本機探針使用。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 在頁面內執行：讀引擎狀態並截下同一幀的畫布。ids 為 null 時列出全部單位。 */
function snapshotInPage(ids) {
    const e = window.__TACTICAL_ENGINE__;
    if (!e) return { error: 'window.__TACTICAL_ENGINE__ 不存在' };
    const cam = e.renderer?.camera;
    const pick = ids ? e.agents.filter((a) => ids.includes(a.id)) : e.agents;
    const agents = pick.map((a) => ({
        id: a.id, team: a.team, role: a.role,
        q: a.q, r: a.r, px: Math.round(a.px * 10) / 10, py: Math.round(a.py * 10) / 10,
        hp: Math.round(a.hp), maxHp: a.maxHp, shield: Math.round(a.shield),
        aiState: a.aiState, aiMode: a.aiMode, actionState: a.actionState, animState: a.animState,
        casting: a.castingSkillIdx, facing: a.facing, target: a.target?.id ?? null,
        effects: Object.entries(a.effects).filter(([, s]) => s.remaining > 0)
            .map(([k, s]) => (s.tag ? `${k}:${s.tag}` : k)),
        dead: a.hp <= 0, banished: a.banished, outOfBounds: a.outOfBounds,
    }));
    return {
        battleTime: Math.round(e.battleTime * 1000) / 1000,
        syntheticMs: Math.round(performance.now()),
        running: e.isRunning,
        timeScale: e.timeScale,
        scene: e.currentScene?.id ?? null,
        mapVersion: e.mapVersion,
        isLastStand: e.isLastStand,
        camera: cam ? { x: Math.round(cam.x), y: Math.round(cam.y), zoom: Math.round(cam.zoom * 1000) / 1000 } : null,
        screen: { w: e.screenW, h: e.screenH },
        agentCount: e.agents.length,
        alive: e.agents.filter((a) => a.hp > 0).length,
        agents,
        png: document.querySelector('canvas')?.toDataURL('image/png') ?? null,
    };
}

/**
 * 擷取一張截圖與同一幀的狀態，寫成 `<outDir>/<name>.png` 與 `<name>.json`。
 * @returns {Promise<object>} 狀態（不含 png）
 */
export async function captureDiag(page, outDir, name, { ids = null } = {}) {
    const snap = await page.evaluate(snapshotInPage, ids);
    if (snap.error) throw new Error(snap.error);
    mkdirSync(outDir, { recursive: true });
    const { png, ...state } = snap;
    state.name = name;
    if (png) {
        state.image = `${name}.png`;
        writeFileSync(join(outDir, state.image), Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'));
    } else {
        state.image = null;
    }
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(state, null, 2));
    return state;
}

/**
 * 情境鏈：每一步推進幀數 → 擷取 → 檢查。check 回傳 true／字串（失敗原因）／false。
 * 用法：
 *   const sc = createScenario('mobility', OUT);
 *   await sc.step(page, 'cast', { frames: 30, check: (d) => d.agents[0].casting >= 0 || '沒有在施法' });
 *   process.exit(sc.finish());
 */
export function createScenario(tool, outDir) {
    const results = [];
    return {
        async step(page, label, { frames = 0, ids = null, check = null } = {}) {
            if (frames > 0) await page.evaluate((n) => window.__stepFrames(n), frames);
            const name = `${String(results.length).padStart(2, '0')}_${label}`;
            const diag = await captureDiag(page, outDir, name, { ids });
            let verdict = diag.agentCount > 0 ? true : '前提不成立：場上 0 個單位';
            if (verdict === true && check) {
                try { verdict = check(diag); } catch (err) { verdict = `check 拋出例外：${err.message}`; }
            }
            const ok = verdict === true || verdict === undefined;
            const reason = ok ? '' : (typeof verdict === 'string' ? verdict : 'check 回傳 false');
            results.push({ label, ok, reason, battleTime: diag.battleTime, image: diag.image });
            console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  t=${diag.battleTime}  alive=${diag.alive}${reason ? `  ${reason}` : ''}`);
            return diag;
        },
        /** 印 Summary 行並回傳退出碼（0 全過、1 有失敗）。 */
        finish() {
            const failed = results.filter((r) => !r.ok).length;
            writeFileSync(join(outDir, 'scenario.json'), JSON.stringify({ tool, steps: results }, null, 2));
            console.log(`Summary: ${tool} ${failed ? 'FAIL' : 'PASS'} ${results.length - failed}/${results.length} steps (${outDir})`);
            return failed ? 1 : 0;
        },
    };
}
