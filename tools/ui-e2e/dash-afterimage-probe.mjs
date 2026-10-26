// ╔══════════════════════════════════════════════════════════╗
// ║ 職責：固定種子逐幀記錄三招技能、走路與近戰前衝的殘影。   ║
// ║ 用法：node tools/ui-e2e/dash-afterimage-probe.mjs --tag=before ║
// ║ --tag=after 截 DASH 中途與降速後 0.15 秒；未達驗收勿視為通過。 ║
// ║ [ARCH] 讀 UnitFrame；不修改物理或 trailHistory 寫入者。    ║
// ╚══════════════════════════════════════════════════════════╝
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, seededHarnessInit } from './lib/coord-probes.mjs';
const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) ?? 'before';
const outDir = 'tools/ui-e2e/out/dash-afterimage';
mkdirSync(outDir, { recursive: true });
const BIOME = 'FOREST';
const { server, port } = await startServer(3217);
let browser;
const results = [];
try {
 browser = await launchBrowser({ headed: false, unthrottled: false });
 const page = await browser.newPage({ viewport: {width:1280,height:720}, deviceScaleFactor:1 });
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(seededHarnessInit);
 await page.goto('http://localhost:' + port + '/?mute&quality=0', {waitUntil:'networkidle'});
 await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, {timeout:20000});
 await page.evaluate(() => window.__stepFrames(10));
 await page.getByText(START_TEXT).click();
 await page.waitForTimeout(500);
 await page.evaluate(() => window.__stepFrames(10));
async function setup(kind) {
    return page.evaluate(async ({ biome, kind }) => {
        const { Team, Role, MovementType } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'RANDOMIZE_MAP', w: 12, h: 10, layout: 'FLAT', sceneId: biome, randomizeScene: false });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        e.obstacles.clear();
        e.map.obstaclesHash.clear();
        const valid = [];
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col < e.mapConfig.w; col++) {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            if (e.isValid(h.q, h.r)) { valid.push(h); e.map.setHeight(HexUtils.key(h), 0); }
        }
        e.mapVersion++;
        // a row of tiles that is long enough: pick the valid tile with the most valid tiles at +q
        const lineLen = (h) => { let n = 0; while (e.isValid(h.q + n + 1, h.r)) n++; return n; };
        const start = valid.reduce((b, h) => (!b || lineLen(h) > lineLen(b) ? h : b), null);
        const far = valid.reduce((b, h) => (!b || HexUtils.dist(h, start) > HexUtils.dist(b, start) ? h : b), null);
        cmd({ type: 'PLACE_AGENT', team: Team.RED, q: far.q, r: far.r, hp: 20000, role: Role.TANK });
        const role = kind === 'ground' ? Role.WARRIOR : (kind === 'flying' ? Role.MAGE : Role.WARRIOR);
        cmd({ type: 'PLACE_AGENT', team: Team.BLUE, q: start.q, r: start.r, hp: 20000, role });
        const unit = e.agents[e.agents.length - 1];
        if (e.agents.length!==2 || unit.team!==Team.BLUE) throw new Error('fixture must contain both teams');
        e.play();
        for (const a of e.agents) { a.bt = null; a.hp = a.maxHp = 20000; }
        if (kind === 'flying') unit.movementType = MovementType.FLYING;
        const target = { q: start.q + Math.min(5, lineLen(start)), r: start.r };
        unit.targetHex = target;
        const p = HexUtils.toPx(start.q, start.r, e.mapConfig);
        e.renderer.camera.snapTo(p.x + 90, p.y - 20, 2.2);
        return { id: unit.id, start, target };
    }, { biome: BIOME, kind });
}


for (const kind of ['wb_a2','wr_a3','mb_a3','walk','lunge']) {
 await page.evaluate(() => window.__resetSeed(42));
 const info = await setup('ground');
 await page.evaluate(() => window.__stepFrames(120));
 const initial = await page.evaluate(async ({id, target, kind}) => {
  const e = window.__TACTICAL_ENGINE__;
  const u = e.agents.find(a => a.id === id);
  const { DEFAULT_SKILL_DB } = await import('/skillDatabase.ts');
  const { SkillExecutor } = await import('/engine/systems/combat/SkillExecutor.ts');
  const { PHYSICS } = await import('/constants.ts');
  const { lungeToward } = await import('/engine/systems/movement/MotionCommands.ts');
  u.targetHex = target;
  let effect = null;
  if (kind === 'walk') {
   u.path = [{q:u.q+1,r:u.r}]; u.isMoving = true; u.moveProgress = 0;
  } else if (kind === 'lunge') {
   lungeToward(u, {x:u.px+100,y:u.py}, PHYSICS.LUNGE_SPEED_ACTIVE);
  } else {
   const skill = DEFAULT_SKILL_DB.find(s => s.id === kind);
   if (!skill) throw new Error('missing skill ' + kind);
   effect = skill.effectType ?? null;
   new SkillExecutor().executeInstantSkill(u, skill, e);
  }
  return {effect, speed:Math.hypot(u.physics.vx,u.physics.vy), x:u.px+u.physics.x, y:u.py+u.physics.y};
 }, {...info,kind});
 const frames = [];
 let ended = -1, shotDuring = false;
 for (let i=0;i<120;i++) {
  const f = await page.evaluate(id => {
   window.__stepFrames(1);
   const e = window.__TACTICAL_ENGINE__, u = e.agents.find(a => a.id === id);
   const f = e.renderer.pipeline.frames.get(u);
   return {time:e.state.time.battleTime, count:f?.ghostCount ?? 0,
    alpha:f?.ghostCount ? Math.max(...f.ghosts.slice(0,f.ghostCount).map(g=>g.alpha)) : 0,
    speed:Math.hypot(u.physics.vx,u.physics.vy), trail:u.trailHistory.length, z:u.physics.z,
    x:u.px+u.physics.x, y:u.py+u.physics.y, hp:u.hp, corpse:f?.isCorpse, visible:f?.visible,
    fullyDead:u.fullyDead, outOfBounds:u.outOfBounds, banished:u.banished,
    drag:u.dragOverQ!==null || u.dragOverR!==null, visualStatus:u.view.visualStatus, running:e.isRunning};
  }, info.id);
  frames.push(f);
  if (kind==='wr_a3' && i<18) console.log('wr_a3 diagnostic',i,JSON.stringify(f));
  if (initial.speed>300 && f.speed<=300 && ended<0) ended=i;
  if (tag==='after' && initial.effect==='DASH') {
   if (!shotDuring && f.count>=3 && f.speed>300) {
    await page.screenshot({path:outDir+'/'+kind+'_during.png'}); shotDuring=true;
   }
   if (ended>=0 && i===ended+9) await page.screenshot({path:outDir+'/'+kind+'_after150ms.png'});
  }
 }
 const visible = frames.filter(f=>f.count>0 && f.alpha>0);
 const displacement60 = Math.max(...frames.slice(0,60).map(f=>Math.hypot(f.x-initial.x,f.y-initial.y)));
 const result = {kind, effect:initial.effect, displacement60, peakSpeed:Math.max(initial.speed,...frames.map(f=>f.speed)),
  visibleFrames:visible.length, visibleSeconds:visible.length/60,
  maxGhosts:Math.max(...frames.map(f=>f.count)), frames};
 results.push(result);
 console.log(JSON.stringify({...result,frames:undefined}));
}
if (errors.length) throw new Error(errors.join(' | '));
writeFileSync(outDir+'/'+tag+'.json',JSON.stringify(results,null,2));
for (const r of results) {
 if (r.kind==='walk' && r.displacement60<=20) throw new Error('walk displacement <=20 px');
 if (r.kind==='lunge' && r.displacement60<=5) throw new Error('lunge displacement <=5 px');
 if (['walk','lunge'].includes(r.kind) && r.visibleFrames!==0) throw new Error('control has ghosts');
 if (tag==='after' && ['wb_a2','wr_a3'].includes(r.kind)) {
  const baseline = JSON.parse(readFileSync(outDir+'/before.json','utf8')).find(b=>b.kind===r.kind);
  if (r.visibleSeconds<0.3 || r.visibleSeconds<baseline.visibleSeconds*2) throw new Error(r.kind+' linger duration failed');
 }
}
} finally { await browser?.close(); await server.close(); }
