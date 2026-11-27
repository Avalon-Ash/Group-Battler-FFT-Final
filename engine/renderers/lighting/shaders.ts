// ╔══════════════════════════════════════════════════════════╗
// ║  lighting/shaders — 打光通道的 GLSL（ADR 0029）             ║
// ║  職責：只放著色器原始碼。外觀數值一律由 uniform 傳入        ║
// ║        （constants/lighting.ts），這裡的數字只有數學常數    ║
// ║        （gamma、色調映射係數、高斯權重）。                  ║
// ║  [ARCH] 座標：裝置像素 px（左上原點）→ 世界像素             ║
// ║   w = (px − uOrigin) / uScale（uOrigin、uScale 取自本幀世界 ║
// ║   畫布的相機變換）→ 地面座標 g = (w.x, w.y × uGroundPerY, z)。║
// ║   w.y 是「畫出來的」螢幕 Y（已扣地形高度），所以高台上的    ║
// ║   地面與站在上面的單位在地面座標裡仍然相鄰。               ║
// ╚══════════════════════════════════════════════════════════╝

/** 全螢幕四邊形；vUv 原點在左下（貼圖上傳時已上下翻轉，所以和畫布方向一致） */
export const FULLSCREEN_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** 點光：每盞光一個 instance，只畫它照得到的那塊矩形，加法疊進光照貼圖 */
export const LIGHT_VERT = `#version 300 es
in vec2 aPos;
in vec4 iPos;    // 地面座標 xyz（世界像素），w = 照得到的最遠距離
in vec3 iCol;
uniform vec2 uRes, uOrigin;
uniform float uScale, uGroundPerY;
out vec4 vLight; out vec3 vCol;
void main(){
    vLight = iPos; vCol = iCol;
    vec2 world = vec2(iPos.x + aPos.x * iPos.w, (iPos.y + aPos.y * iPos.w) / uGroundPerY);
    vec2 px = world * uScale + uOrigin;
    gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}`;

export const LIGHT_FRAG = `#version 300 es
precision highp float;
in vec4 vLight; in vec3 vCol; out vec4 o;
uniform vec2 uRes, uOrigin;
uniform float uScale, uGroundPerY, uKnee;
void main(){
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 w = (px - uOrigin) / uScale;
    vec3 P = vec3(w.x, w.y * uGroundPerY, 0.0);
    vec3 d = vLight.xyz - P;
    float dist2 = dot(d, d), r2 = vLight.w * vLight.w;
    float fall = max(0.0, 1.0 - dist2 / r2);
    fall = fall * fall / (1.0 + dist2 / (r2 * uKnee));
    float ndl = max(d.z * inversesqrt(dist2), 0.0);   // 地面法線朝上
    o = vec4(vCol * ndl * fall, 1.0);
}`;

/** 世界 × 光照；特效自發光、環境降彩、背景只調色；輸出線性 HDR */
export const SHADE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tWorld;   // 世界畫布（預乘 alpha，透明處＝沒有世界）
uniform sampler2D tBack;    // 主畫布此刻的內容（只有背景）
uniform sampler2D tLight;   // 點光累加
uniform sampler2D tUnit;    // 單位遮罩（alpha × uUnitMaskGain＝單位覆蓋率）
uniform sampler2D tGlow;    // 特效遮罩（alpha＝特效覆蓋率）
uniform sampler2D tInfo;    // 玩法標示遮罩（射程、預警、縮圈格）：照原樣顯示，不打光、不降彩
uniform vec3 uAmbient, uMoon, uSkyTint;
uniform float uEmissiveGain, uInfoGain, uEnvChroma, uUnitMaskGain;
vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 chroma(vec3 c, float k){ return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, k); }
void main(){
    vec4 w = texture(tWorld, vUv);
    float unit = clamp(texture(tUnit, vUv).a * uUnitMaskGain, 0.0, 1.0);
    float glow = texture(tGlow, vUv).a;
    float info = texture(tInfo, vUv).a;
    vec3 sky = chroma(toLinear(texture(tBack, vUv).rgb), uEnvChroma) * uSkyTint;
    vec3 albedo = chroma(toLinear(w.rgb / max(w.a, 1e-4)), mix(uEnvChroma, 1.0, max(unit, max(glow, info))));
    vec3 light = uAmbient + uMoon + texture(tLight, vUv).rgb;
    vec3 lit = albedo * mix(mix(light, vec3(uInfoGain), info), vec3(uEmissiveGain), glow);
    o = vec4(mix(sky, lit, w.a), 1.0);
}`;

export const BRIGHT_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor; uniform float uThreshold;
void main(){ vec3 c = texture(tColor, vUv).rgb; float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(uThreshold, uThreshold * 1.6, l), 1.0); }`;

export const BLUR_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor; uniform vec2 uDir;
void main(){ vec3 c = texture(tColor, vUv).rgb * 0.227027;
  c += (texture(tColor, vUv + uDir * 1.3846).rgb + texture(tColor, vUv - uDir * 1.3846).rgb) * 0.316216;
  c += (texture(tColor, vUv + uDir * 3.2308).rgb + texture(tColor, vUv - uDir * 3.2308).rgb) * 0.070270;
  o = vec4(c, 1.0); }`;

/** 泛光、曝光、暗角、色調映射、暗部偏藍亮部偏暖；輸出 sRGB、不透明 */
export const COMPOSITE_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor, tBloom; uniform float uBloom, uExposure, uSplit, uVignette;
vec3 filmic(vec3 x){ x = max(x, 0.0); return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
    vec3 c = (texture(tColor, vUv).rgb + texture(tBloom, vUv).rgb * uBloom) * uExposure;
    vec2 q = (vUv - 0.5) * vec2(1.0, 0.92);
    c *= mix(1.0 - uVignette, 1.0, smoothstep(0.95, 0.3, length(q) * 1.25));
    c = filmic(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c *= mix(vec3(1.0 - uSplit, 1.0, 1.0 + uSplit * 1.4), vec3(1.0 + uSplit, 1.0, 1.0 - uSplit * 0.8), smoothstep(0.08, 0.6, l));
    o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;
