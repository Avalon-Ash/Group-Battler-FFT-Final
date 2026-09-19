import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BONES,RIGS,SKINS,CLIPS,LAYERS,DEFAULT_STATE,commands,solvePose,frameAt } from '../../public/unit-lab/model.mjs';
const atlas=JSON.parse(fs.readFileSync(new URL('../../public/unit-lab/assets/atlas.json',import.meta.url),'utf8'));
let count=0;
for(const rig of Object.keys(RIGS))for(const skin of Object.keys(SKINS))for(const direction of Object.keys(LAYERS))
for(const hair of ['crop','tied'])for(const clip of Object.keys(CLIPS))for(let frame=0;frame<CLIPS[clip].frames.length;frame++){
  const state={...DEFAULT_STATE,rig,skin,direction,hair,clip,frame};
  const result=commands(state,atlas),pose=solvePose(rig,clip,frame);
  assert.deepEqual(Object.keys(pose.joints),Object.keys(BONES));
  assert.equal(result.length,9);
  assert.deepEqual(result.find(x=>x.slot==='weapon').x,pose.joints.hand[0]);
  assert.deepEqual(result.find(x=>x.slot==='weapon').y,pose.joints.hand[1]);
  for(const cmd of result) {
    assert.ok(Number.isInteger(cmd.x)&&Number.isInteger(cmd.y));
    assert.equal(cmd.sprite.rect[2],64);
  }
  assert.equal(commands({...state,weapon:false,cape:false},atlas).length,7);
  assert.deepEqual(solvePose(rig,clip,frame),solvePose(rig,clip,frame));
  count++;
}
for(const clip of Object.keys(CLIPS)){
  let t=0;
  CLIPS[clip].frames.forEach((f,i)=>{assert.equal(frameAt(clip,t),i);t+=f.duration;});
  assert.equal(frameAt(clip,t),0);
  assert.equal(frameAt(clip,-1),CLIPS[clip].frames.length-1);
}
assert.notDeepEqual(solvePose('male','idle',0).joints,solvePose('female','idle',0).joints);
assert.notDeepEqual(LAYERS.front,LAYERS.back);
process.stdout.write(`PASS: ${count} rig/skin/view/hair/pose combinations; socket attachment, equipment removal, integer positions, clip boundaries.\n`);
