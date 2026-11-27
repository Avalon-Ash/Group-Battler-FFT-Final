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
// ║  [ARCH] 直立物（單位、障礙物）的像素：幾何遮罩 tGeo 的      ║
// ║   r＝離腳底的高度 ÷ uMaxH、g＝是不是單位、b＝橫向位置       ║
// ║   （0.5＝中線）、a＝覆蓋率。地面座標取它的腳底：            ║
// ║   g = (w.x, (w.y + 高度) × uGroundPerY, 高度)。            ║
// ║  [ARCH] 投影：tCaster 是「站在這個地面像素上的東西有多高」  ║
// ║   （r＝高度，g＝柔邊的存在感，給接觸暗部）；從受光點沿地面  ║
// ║   往光源走，路上有比光線高的東西就被擋住。                  ║
// ╚══════════════════════════════════════════════════════════╝

/** 全螢幕四邊形；vUv 原點在左下（貼圖上傳時已上下翻轉，所以和畫布方向一致） */
export const FULLSCREEN_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** 像素 → 世界 → 地面座標，直立物像素的位置與法線，沿地面找遮擋。點光與著色共用。 */
const surfaceChunk = (shadowSteps: number): string => `
uniform sampler2D tGeo, tCaster;
uniform vec2 uRes, uOrigin;
uniform float uScale, uGroundPerY, uMaxH, uBevel, uShadowStrength, uShadowSoft;
const int STEPS = ${shadowSteps};
struct Surface { vec3 P; vec3 N; float upright; float unit; };
Surface surfaceAt(vec2 fragCoord){
    vec2 px = vec2(fragCoord.x, uRes.y - fragCoord.y);
    vec2 w = (px - uOrigin) / uScale;
    vec4 geo = texture(tGeo, fragCoord / uRes);
    Surface s;
    s.upright = step(0.5, geo.a);
    vec3 g = geo.rgb / max(geo.a, 1e-4);
    float h = s.upright * g.r * uMaxH;
    s.unit = s.upright * step(0.5, g.g);
    s.P = vec3(w.x, (w.y + h) * uGroundPerY, h);
    float bx = (g.b - 0.5) * 2.0 * uBevel;
    s.N = mix(vec3(0.0, 0.0, 1.0), normalize(vec3(bx, 1.0, 0.25)), s.upright);
    return s;
}
vec2 casterAt(vec2 g){
    vec2 px = vec2(g.x, g.y / uGroundPerY) * uScale + uOrigin;
    return texture(tCaster, vec2(px.x / uRes.x, 1.0 - px.y / uRes.y)).rg;
}
float shadow(vec3 P, vec3 toLight, float len, float skip){
    vec2 dir = toLight.xy; float flatLen = length(dir);
    if (flatLen < 1e-3 || len <= skip) return 1.0;
    dir /= flatLen;
    float rise = toLight.z / flatLen, occ = 0.0;
    for (int i = 1; i <= STEPS; i++) {
        float t = skip + (len - skip) * float(i) / float(STEPS);
        float h = casterAt(P.xy + dir * t).r;
        occ = max(occ, smoothstep(0.0, uShadowSoft, h - (P.z + rise * t)) * (1.0 - smoothstep(len * 0.75, len, t)));
    }
    return 1.0 - occ * uShadowStrength;
}`;

/**
 * instance 矩形（點光與投影物共用）：iPos.xy＝地面座標中心，iPos.w＝地面平面上的半徑 × uReach；
 * 矩形上緣再往上加 uLift 世界像素（直立物的像素畫在腳底上方）。
 */
export const INSTANCE_VERT = `#version 300 es
in vec2 aPos;
in vec4 iPos;
in vec3 iCol;
uniform vec2 uRes, uOrigin;
uniform float uScale, uGroundPerY, uReach, uLift;
out vec4 vInst; out vec3 vCol;
void main(){
    vInst = iPos; vCol = iCol;
    float r = iPos.w * uReach;
    vec2 world = vec2(iPos.x + aPos.x * r, (iPos.y + aPos.y * r) / uGroundPerY - step(aPos.y, 0.0) * uLift);
    vec2 px = world * uScale + uOrigin;
    gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}`;

/** 投影物：腳底的橢圓，r＝高度（iPos.z）、g＝往外淡出的存在感；以 MAX 混合 */
export const CASTER_FRAG = `#version 300 es
precision highp float;
in vec4 vInst; out vec4 o;
uniform vec2 uRes, uOrigin;
uniform float uScale, uGroundPerY, uReach;
void main(){
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 w = (px - uOrigin) / uScale;
    float d = length(vec2(w.x, w.y * uGroundPerY) - vInst.xy) / vInst.w;
    o = vec4(vInst.z * step(d, 1.0), 1.0 - smoothstep(0.5, uReach, d), 0.0, 1.0);
}`;

export const lightFrag = (shadowSteps: number): string => `#version 300 es
precision highp float;
in vec4 vInst; in vec3 vCol; out vec4 o;
uniform float uKnee, uSkipGround, uSkipUpright;
${surfaceChunk(shadowSteps)}
void main(){
    Surface s = surfaceAt(gl_FragCoord.xy);
    vec3 d = vInst.xyz - s.P;
    float dist2 = dot(d, d), r2 = vInst.w * vInst.w;
    float fall = max(0.0, 1.0 - dist2 / r2);
    if (fall <= 0.0) discard;
    fall = fall * fall / (1.0 + dist2 / (r2 * uKnee));
    float ndl = max(dot(s.N, d * inversesqrt(dist2)), 0.0);
    float skip = mix(uSkipGround, uSkipUpright, s.upright);
    o = vec4(vCol * ndl * fall * shadow(s.P, d, max(length(d.xy), skip + 1.0), skip), 1.0);
}`;

/** 世界 × 光照；特效自發光、環境降彩、背景只調色；輸出線性 HDR */
export const shadeFrag = (shadowSteps: number): string => `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tWorld;   // 世界畫布（預乘 alpha，透明處＝沒有世界）
uniform sampler2D tBack;    // 主畫布此刻的內容（只有背景）
uniform sampler2D tLight;   // 點光累加
uniform sampler2D tGlow;    // 特效遮罩（alpha＝特效覆蓋率）
uniform sampler2D tInfo;    // 玩法標示遮罩（射程、預警、縮圈格）：照原樣顯示，不打光、不降彩
uniform vec3 uAmbient, uMoonCol, uMoonDir, uSkyTint;
uniform float uEmissiveGain, uInfoGain, uEnvChroma, uMoonShadowLen, uContact, uRim, uSkipGround, uSkipUpright;
${surfaceChunk(shadowSteps)}
vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 chroma(vec3 c, float k){ return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, k); }
void main(){
    vec4 w = texture(tWorld, vUv);
    float glow = texture(tGlow, vUv).a;
    float info = texture(tInfo, vUv).a;
    vec3 sky = chroma(toLinear(texture(tBack, vUv).rgb), uEnvChroma) * uSkyTint;
    Surface s = surfaceAt(gl_FragCoord.xy);
    vec3 albedo = chroma(toLinear(w.rgb / max(w.a, 1e-4)), mix(uEnvChroma, 1.0, max(s.unit, max(glow, info))));

    // 接觸暗部只壓地面的環境光；直立物正面照不到月光，改給一道朝月亮那側的冷色邊光
    vec3 light = uAmbient * mix(1.0 - uContact * casterAt(s.P.xy).g, 1.0, s.upright);
    float moon = max(dot(s.N, uMoonDir), 0.0);
    float skip = mix(uSkipGround, uSkipUpright, s.upright);
    if (moon > 0.0) light += uMoonCol * moon * shadow(s.P, uMoonDir, uMoonShadowLen, skip);
    light += s.upright * uMoonCol * uRim * pow(max(dot(s.N, normalize(vec3(uMoonDir.xy, 0.15))), 0.0), 1.5);
    light += texture(tLight, vUv).rgb;

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
