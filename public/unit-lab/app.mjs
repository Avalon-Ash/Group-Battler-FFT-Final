import { BONES, RIGS, SKINS, CLIPS, LAYERS, SLOT_BONE, DEFAULT_STATE, commands, solvePose, frameAt } from './model.mjs';

const $ = id => document.getElementById(id);
const state = { ...DEFAULT_STATE };
const hidden = new Set();
let atlas, manifest, elapsed = 0, last = 0, ready = false;
const stage = $('stage'), ctx = stage.getContext('2d');
const native = $('native'), nativeCtx = native.getContext('2d');

function paintCharacter(context, x, y, scale, config, debug = false) {
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.scale(scale, scale);
  context.imageSmoothingEnabled = false;
  for (const command of commands(config, manifest)) {
    if (hidden.has(command.slot)) continue;
    const { rect, pivot } = command.sprite;
    context.drawImage(atlas, ...rect, command.x-pivot[0], command.y-pivot[1], rect[2], rect[3]);
  }
  if (debug) {
    const { joints } = solvePose(config.rig, config.clip, config.frame);
    context.lineWidth = 1 / scale;
    context.strokeStyle = '#e6c783';
    context.fillStyle = '#f3d7a3';
    for (const [name, joint] of Object.entries(joints)) {
      const parent = BONES[name].parent;
      if (parent) {
        context.beginPath(); context.moveTo(...joints[parent]); context.lineTo(...joint); context.stroke();
      }
      context.fillRect(joint[0]-.5, joint[1]-.5, 1, 1);
    }
  }
  context.restore();
}
function drawStage() {
  const box = stage.getBoundingClientRect();
  const width = Math.round(box.width), height = Math.round(box.height);
  if (stage.width !== width || stage.height !== height) { stage.width = width; stage.height = height; }
  ctx.fillStyle = '#20292e'; ctx.fillRect(0,0,width,height);
  ctx.strokeStyle = '#2b353b'; ctx.lineWidth = 1;
  for (let x=0; x<width; x+=24) { ctx.beginPath(); ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,height);ctx.stroke(); }
  for (let y=0; y<height; y+=24) { ctx.beginPath(); ctx.moveTo(0,y+.5);ctx.lineTo(width,y+.5);ctx.stroke(); }
  const scale = Math.max(1, Math.min(state.zoom, Math.floor((width-60)/(state.exploded?120:80)), Math.floor((height-70)/(state.exploded?105:70))));
  const x = Math.round(width/2), y = Math.round(height*.75);
  ctx.fillStyle = '#151d22';
  ctx.beginPath();ctx.ellipse(x,y+5,scale*15,scale*4,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle = '#4f5c62'; ctx.beginPath(); ctx.moveTo(x-36,y);ctx.lineTo(x+36,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke();
  paintCharacter(ctx,x,y,scale,state,state.joints && !state.exploded);
  if (state.joints && !state.exploded) {
    const { joints } = solvePose(state.rig,state.clip,state.frame);
    ctx.font = '12px "IBM Plex Mono",monospace';ctx.fillStyle='#e6c783';
    for (const name of ['head','chest','pelvis','hand']) {
      const [jx,jy] = joints[name];
      ctx.fillText(name, x+jx*scale+10, y+jy*scale-4);
    }
  }
  $('stageMeta').textContent = `${scale}× DISPLAY · ${state.rig.toUpperCase()} / ${state.direction.toUpperCase()}`;
  const f = CLIPS[state.clip].frames[state.frame];
  $('poseName').textContent = `${CLIPS[state.clip].label} / ${f.name}`;
  $('frameCount').textContent = `${String(state.frame+1).padStart(2,'0')} / ${CLIPS[state.clip].frames.length}`;
  nativeCtx.clearRect(0,0,native.width,native.height);
  paintCharacter(nativeCtx,53,93,1,{...state,exploded:false});
  paintCharacter(nativeCtx,122,108,2,{...state,exploded:false});
  nativeCtx.fillStyle='#99a8af'; nativeCtx.font='12px monospace';nativeCtx.fillText('1×',44,118);nativeCtx.fillText('2×',116,122);
  document.querySelectorAll('.frame').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===state.frame)));
}
function timeline() {
  $('frames').replaceChildren();
  CLIPS[state.clip].frames.forEach((f,i)=>{
    const button=document.createElement('button');
    button.className='frame';button.setAttribute('aria-label',`第 ${i+1} 幀：${f.name}`);
    const c=document.createElement('canvas');c.width=82;c.height=75;
    paintCharacter(c.getContext('2d'),38,59,1,{...state,frame:i,exploded:false});
    const label=document.createElement('span');label.textContent=`${String(i+1).padStart(2,'0')} · ${f.duration}ms`;
    button.append(c,label);button.onclick=()=>{state.playing=false;state.frame=i;syncClock();update();};
    $('frames').append(button);
  });
}
function layerList() {
  $('layers').replaceChildren();
  LAYERS[state.direction].forEach((slot,i)=>{
    const li=document.createElement('li'),num=document.createElement('span'),label=document.createElement('label'),input=document.createElement('input'),bone=document.createElement('code');
    num.className='num';num.textContent=String(i+1).padStart(2,'0');
    input.type='checkbox';input.checked=!hidden.has(slot);
    input.setAttribute('aria-label',`顯示 ${slot}`);
    input.onchange=()=>{input.checked?hidden.delete(slot):hidden.add(slot);timeline();drawStage();};
    label.append(input,slot);bone.textContent=SLOT_BONE[slot];li.append(num,label,bone);$('layers').append(li);
  });
}
function syncClock() {
  elapsed=CLIPS[state.clip].frames.slice(0,state.frame).reduce((sum,f)=>sum+f.duration,0);
}
function update(rebuild=false) {
  $('play').textContent=state.playing?'暫停':'播放';
  $('zoomLabel').textContent=`${state.zoom}×`;
  if(rebuild){timeline();layerList();}
  drawStage();
}
for(const id of ['rig','skin','direction','hair','clip','speed','zoom','weapon','cape','joints','exploded']){
  $(id).addEventListener('input',()=>{
    const el=$(id);
    state[id]=el.type==='checkbox'?el.checked:(id==='speed'||id==='zoom'?Number(el.value):el.value);
    if(id==='clip'){state.frame=0;elapsed=0;}
    update(true);
  });
}
$('play').onclick=()=>{state.playing=!state.playing;syncClock();update();};
$('step').onclick=()=>{state.playing=false;state.frame=(state.frame+1)%CLIPS[state.clip].frames.length;syncClock();update();};
$('reset').onclick=()=>{
  Object.assign(state,DEFAULT_STATE);hidden.clear();elapsed=0;
  for(const id of ['rig','skin','direction','hair','clip','speed','zoom','weapon','cape','joints','exploded']){
    const el=$(id);if(el.type==='checkbox')el.checked=state[id];else el.value=state[id];
  }
  update(true);
};
$('export').onclick=()=>{
  const config={schemaVersion:1,baseCommit:'48b2968',...state,hiddenSlots:[...hidden]};
  const blob=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='unit-lab-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('status').textContent='角色配置已匯出；不包含遊戲戰鬥數值。';
};
async function init(){
  try{
    document.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);
    const response=await fetch(new URL('./assets/atlas.json',import.meta.url));
    if(!response.ok)throw new Error(`Atlas manifest HTTP ${response.status}`);
    manifest=await response.json();
    atlas=new Image();atlas.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{
      atlas.onload=resolve;atlas.onerror=()=>reject(new Error('PNG 圖集載入失敗'));
      atlas.src=new URL(`./assets/${manifest.image}`,import.meta.url).href;
    });
    // Check every asset combination up front; fail visibly rather than silently skip missing parts.
    for(const rig of Object.keys(RIGS))for(const skin of Object.keys(SKINS))for(const direction of Object.keys(LAYERS))
      for(const hair of ['crop','tied'])for(const clip of Object.keys(CLIPS))for(let frame=0;frame<CLIPS[clip].frames.length;frame++)
        commands({...state,rig,skin,direction,hair,clip,frame},manifest);
    $('assetCount').textContent=Object.keys(manifest.frames).length;
    $('status').textContent='PNG 與全部姿態資產對照已載入。原作素材使用量：0。';
    ready=true;document.querySelectorAll('button,select,input').forEach(el=>el.disabled=false);update(true);
    new ResizeObserver(()=>drawStage()).observe(stage.parentElement);
    requestAnimationFrame(tick);
  }catch(error){
    $('error').hidden=false;$('error').textContent=`無法載入角色：${error.message}。請透過 Vite 或 HTTP 伺服器開啟，勿直接雙擊 HTML。`;
    $('status').textContent='載入失敗，未啟動預覽。';
  }
}
function tick(now){
  const delta=last?Math.min(now-last,100):0;last=now;
  if(ready&&state.playing){elapsed+=delta*state.speed;const next=frameAt(state.clip,elapsed);if(next!==state.frame){state.frame=next;drawStage();}}
  requestAnimationFrame(tick);
}
init();
