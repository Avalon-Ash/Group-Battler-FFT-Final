/** Deterministic grid priority fixture. Run with --tag=before or --tag=after. */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'grid-priority');
mkdirSync(OUT_DIR, { recursive: true });

const tagArg = process.argv.find((a) => a.startsWith('--tag='));
const tag = tagArg ? tagArg.slice('--tag='.length) : 'shot';
const START_TEXT = 'START SIMULATION';
const DICE_TITLE = '隨機生成戰場與陣容'; // 隨機生成戰場與陣容

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({
    server: { port: 3197, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const save = (name, dataUrl) => {
    const dest = join(OUT_DIR, name);
    writeFileSync(dest, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(dest);
};

const grab = (page) => page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? null);

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        let seed = 1337;
        Math.random = () => {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        let syntheticTime = 1000.0;
        window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */ seed = s; syntheticTime = 1000.0; };
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;
        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
        window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) cb(syntheticTime);
            }
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    const flags = await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const { SCENE_DB } = await import('/data/scenes.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        e.currentScene = SCENE_DB[0];
        e.map.rebuildMap(e);
        e.obstacles.clear(); e.map.obstaclesHash.clear();
        e.stop();
        window.__resetSeed(42);
        const valid=[...e.map.validHashes].map(h=>HexUtils.unhash(h));
        const base=valid.find(c=>[{q:c.q+3,r:c.r},{q:c.q+1,r:c.r+1},{q:c.q+3,r:c.r+1}].every(h=>e.isValid(h.q,h.r)));
        if(!base) throw new Error('no fixture footprint');
        const cells = [base, {q:base.q+3,r:base.r}, {q:base.q+1,r:base.r+1}];
        for (let i=0; i<cells.length; i++) e.bus.emit('UI_COMMAND', {type:'PLACE_AGENT', team:i===1?1:0, role:'MAGE', ...cells[i]});
        if(e.agents.length!==3) throw new Error('fixture requires three valid unit cells');
        e.agents.forEach((a,i)=>{
            a.spawnTimer = 0;
            if(i<2){
                const center = i===0 ? cells[2] : {q:base.q+3,r:base.r+1};
                const skill = {id:'probe',tag:'ACTIVE',role:'MAGE',name:'probe',range:9,cast:10,cd:1,cost:0,gain:0,type:'AOE',aoeRadius:1,power:1,color:'#ffffff'};
                a.skills=[skill]; a.castingSkillIdx=0; a.castTimer=5; a.castingAnimationTimer=5;
                a.targetHex=center; a.currentTelegraph=HexUtils.range(center,1).filter(c=>e.isValid(c.q,c.r));
            }else{ a.effects.ROOT.remaining=10; a.view.visualStatus='FROZEN'; }
        });
        const area=HexUtils.range(cells[2],2).filter(c=>e.isValid(c.q,c.r));
        e.map.warningTiles.clear();
        area.filter(c=>c.q<=cells[2].q).forEach(c=>e.map.warningTiles.add(c.q+','+c.r));
        e.state.spatialHazards=[{id:'probe-fire',type:'FIRE',cells:area,duration:10,sourceId:e.agents[0].id,team:0,color:'#ff0000',power:0,tickInterval:1,lastTickTime:0,centerQ:cells[2].q,centerR:cells[2].r}];
        e.zones.activeZones=[{...cells[2],radius:3,color:'#ff0000',progress:1,isEnemy:true}];
        e.bus.emit('UI_COMMAND',{type:'CAMERA_SNAP',x:HexUtils.toPx(cells[2].q,cells[2].r,e.mapConfig).x,y:HexUtils.toPx(cells[2].q,cells[2].r,e.mapConfig).y,zoom:1});
        return valid.map(({q,r})=>{
            const key=q+','+r;
            return {q,r,warning:e.map.warningTiles.has(key),cast:e.agents.some(a=>a.currentTelegraph?.some(c=>c.q===q&&c.r===r)),hazard:area.some(c=>c.q===q&&c.r===r),status:e.agents.some(a=>a.q===q&&a.r===r&&a.view.visualStatus!=='NONE'),zone:!!e.zones.getZoneAt(q,r)};
        });
    });
    await page.evaluate(() => window.__stepFrames(2));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__stepFrames(2));
    const count = await page.evaluate(async ({flags,tag})=>{
        if(tag==='before') return flags.filter(f=>[f.warning,f.cast,f.hazard,f.status,f.zone].filter(Boolean).length>=2).length;
        const {groundPriority,resolveGroundLayers,GroundFlag:F}=await import('/engine/renderers/grid/GroundPriority.ts');
        return flags.filter(f=>{
            const mask=groundPriority.flagsAt(f.q,f.r);
            const expected=(f.warning?F.Warning:0)|(f.cast?F.Cast:0)|(f.hazard?F.Hazard:0)|(f.status?F.Status:0)|(f.zone?F.Zone:0);
            if(mask!==expected) throw new Error('priority flags mismatch at '+f.q+','+f.r+': '+mask+' vs '+expected);
            const m=resolveGroundLayers(mask);
            return [m.urgent,m.cast,m.hazard,m.status,m.zone,m.light].filter(v=>v===1).length>=2;
        }).length;
    }, {flags,tag});
    console.log(JSON.stringify({tag,fullFillOverlapCells:count}));
    writeFileSync(join(OUT_DIR,tag+'.json'),JSON.stringify({tag,fullFillOverlapCells:count,flags},null,2));
    save(tag+'.png',await grab(page));
    if(tag==='after'&&count!==0) throw new Error('full fill overlap remains');
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
