/**
 * Isolated character POC. No Role, Team or Agent dependency.
 * Coordinates are integer source pixels; origin is between the feet.
 * Both rigs implement the same joint/socket contract.
 */
export const BONES = {
  root: { parent: null, xy: [0, 0] },
  pelvis: { parent: 'root', xy: [0, -11] },
  chest: { parent: 'pelvis', xy: [0, -10] },
  head: { parent: 'chest', xy: [0, -10] },
  farArm: { parent: 'chest', xy: [-7, -2] },
  nearArm: { parent: 'chest', xy: [7, 0] },
  hand: { parent: 'nearArm', xy: [1, 8] },
  farLeg: { parent: 'pelvis', xy: [-4, 0] },
  nearLeg: { parent: 'pelvis', xy: [4, 1] },
};
export const RIGS = {
  male: { label: '男骨架', fit: 'male', overrides: {} },
  female: { label: '女骨架', fit: 'female', overrides: {
    chest: [0, -9], head: [0, -10], farArm: [-6, -2], nearArm: [6, 0],
    farLeg: [-3, 0], nearLeg: [3, 1],
  } },
};
export const SKINS = {
  scout: { label: '旅裝 · 靛藍布料', prefix: 'scout' },
  guard: { label: '輕甲 · 銀灰鋼片', prefix: 'guard' },
};
const frame = (name, duration, offsets = {}, arm = 'rest', hand = [1, 8]) =>
  ({ name, duration, offsets, arm, hand });
export const CLIPS = {
  idle: { label: '待機', frames: [
    frame('呼吸 A', 500), frame('呼吸 B', 500, { chest: [0, -1] }),
  ] },
  walk: { label: '行走', frames: [
    frame('左腳前', 120, { farLeg: [-2, 0], nearLeg: [2, -2], farArm: [1, 1], nearArm: [-1, -1] }),
    frame('收步', 120, { pelvis: [0, -1] }),
    frame('右腳前', 120, { farLeg: [2, -2], nearLeg: [-2, 0], farArm: [-1, -1], nearArm: [1, 1] }),
    frame('收步', 120, { pelvis: [0, -1] }),
  ] },
  attack: { label: '揮劍', frames: [
    frame('準備', 160),
    frame('蓄力', 180, { chest: [-2, 0], head: [1, 0] }, 'raised', [-2, -8]),
    frame('斬擊', 90, { pelvis: [3, 0], chest: [1, 1], head: [1, 0] }, 'strike', [10, 1]),
    frame('延伸', 140, { pelvis: [2, 0], chest: [1, 1] }, 'strike', [10, 1]),
    frame('收勢', 200),
  ] },
  hit: { label: '受擊', frames: [
    frame('衝擊', 100, { pelvis: [-3, 1], chest: [-2, 0], head: [-1, -1] }),
    frame('後仰', 180, { chest: [-2, 0], head: [-1, 0] }),
    frame('恢復', 240),
  ] },
};
export const LAYERS = {
  front: ['cape', 'farArm', 'farLeg', 'nearLeg', 'torso', 'head', 'hair', 'nearArm', 'weapon'],
  back: ['weapon', 'nearArm', 'farLeg', 'nearLeg', 'torso', 'farArm', 'cape', 'head', 'hair'],
};
export const SLOT_BONE = {
  cape: 'chest', torso: 'chest', head: 'head', hair: 'head',
  farArm: 'farArm', nearArm: 'nearArm', farLeg: 'farLeg', nearLeg: 'nearLeg', weapon: 'hand',
};
export const DEFAULT_STATE = {
  rig: 'male', skin: 'scout', direction: 'front', clip: 'idle', hair: 'crop',
  weapon: true, cape: true, playing: true, joints: false, exploded: false,
  zoom: 6, speed: 1, frame: 0,
};
export const EXPLODE = {
  cape: [-25, -2], farArm: [-18, 0], farLeg: [-10, 15], nearLeg: [10, 15],
  torso: [0, 0], head: [0, -16], hair: [0, -26], nearArm: [18, 0], weapon: [28, 5],
};
export function frameAt(clip, elapsed) {
  const frames = CLIPS[clip].frames;
  const total = frames.reduce((sum, f) => sum + f.duration, 0);
  let time = ((elapsed % total) + total) % total;
  for (let i = 0; i < frames.length; i++) {
    if (time < frames[i].duration) return i;
    time -= frames[i].duration;
  }
  return 0;
}
export function solvePose(rigId, clipId, frameIndex) {
  const rig = RIGS[rigId];
  const frames = CLIPS[clipId].frames;
  const f = frames[((frameIndex % frames.length) + frames.length) % frames.length];
  const joints = {};
  for (const [name, bone] of Object.entries(BONES)) {
    const base = name === 'hand' ? f.hand : (rig.overrides[name] || bone.xy);
    const offset = f.offsets[name] || [0, 0];
    const parent = bone.parent ? joints[bone.parent] : [0, 0];
    joints[name] = [parent[0] + base[0] + offset[0], parent[1] + base[1] + offset[1]];
  }
  return { joints, frame: f };
}
export function commands(state, manifest) {
  const { joints, frame: f } = solvePose(state.rig, state.clip, state.frame);
  return LAYERS[state.direction].filter(slot =>
    (slot !== 'weapon' || state.weapon) && (slot !== 'cape' || state.cape)
  ).map(slot => {
    let key;
    if (slot === 'weapon') key = `sword.${f.arm}`;
    else if (slot === 'hair') key = `hair.${state.hair}.${state.direction}`;
    else if (slot === 'head') key = `head.${state.direction}`;
    else if (slot.endsWith('Leg')) key = 'boots';
    else if (slot.endsWith('Arm')) key = `${state.skin}.arm.${slot === 'nearArm' ? f.arm : 'rest'}`;
    else key = `${state.skin}.${state.rig}.${slot}.${state.direction}`;
    const sprite = manifest.frames[key];
    if (!sprite) throw new Error(`Missing asset: ${key}`);
    const point = joints[SLOT_BONE[slot]];
    const delta = state.exploded ? EXPLODE[slot] : [0, 0];
    return { slot, key, sprite, x: point[0] + delta[0], y: point[1] + delta[1] };
  });
}
