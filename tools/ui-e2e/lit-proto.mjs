/**
 * WebGL lighting prototype (docs/plans/visual-experiment.md F5, exp/visual-lighting only; ADR 0001 is still in force on main).
 *
 * Offline: takes a frozen frame dumped by `node tools/ui-e2e/layer-luma-probe.mjs --dump`
 * (<scene>_desktop_albedo.png + <scene>_desktop_labels.png + layers.json) and relights it with raw WebGL2:
 *   cool moon light + cool ambient, one warm point light per unit, ground shadows cast by units and obstacles,
 *   contact occlusion, HDR bloom, filmic tone map, cool-shadow / warm-highlight split, vignette.
 * It is a look prototype, not the runtime path: normals are estimated from sprite silhouettes (no baked normal maps yet),
 * positions come from the layer mask (the runtime would get them from the engine), and the CPU pre-pass below would not
 * exist in a real renderer. The shader timing it prints is the GPU cost of the lighting + post passes only.
 *
 * Run:
 *   node tools/ui-e2e/lit-proto.mjs [--in tools/ui-e2e/out/lit-in] [--scene FOREST ...]
 * Output: tools/ui-e2e/out/lit/<scene>_lit.png, <scene>_compare.png (current | lit), lit.json (timings, GPU string).
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const argv = process.argv.slice(2);
const argList = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));
const inDir = argList('--in')[0] ?? join(here, 'out', 'lit-in');
const outDir = join(here, 'out', 'lit');
mkdirSync(outDir, { recursive: true });

const meta = JSON.parse(readFileSync(join(inDir, 'layers.json'), 'utf8'));
const rows = meta.rows.filter(r => r.device === 'desktop');
const wanted = argList('--scene');
const scenes = rows.filter(r => !wanted.length || wanted.includes(r.scene));

/** Look parameters: the single table the prototype is tuned from. Colours are linear RGB. */
const LOOK = {
    /** screen y -> ground depth. Engine ISO_SCALE_Y is 0.5, so one screen pixel of y is two ground pixels. */
    groundPerScreenY: 2,
    ambient: [0.10, 0.14, 0.27],
    /** chroma kept by the environment (terrain, obstacles, sky) before lighting; units and effects keep theirs */
    envChroma: 0.5,
    /** direction toward the moon in ground space (x right, y toward the camera, z up): upper left, slightly behind */
    moonDir: [-0.72, -0.34, 0.5],
    moonColor: [0.62, 0.74, 1.0],
    moonIntensity: 1.15,
    moonShadowLength: 230,
    /** warm unit lights: colour per team, intensity, reach (ground px), height above ground, offset toward the camera */
    unitLight: { BLU: [1.0, 0.70, 0.38], RED: [1.0, 0.46, 0.22], intensity: 3.6, range: 240, height: 30, front: 40 },
    /** light emitted by spell effects: one light at the centroid of the VFX pixels, coloured by their mean colour */
    vfxLight: { intensity: 4.5, range: 380, height: 40, minPixels: 400, emissive: 2.2 },
    shadowStrength: 0.8,
    shadowSteps: 20,
    contactOcclusion: 0.45,
    /** silhouette bevel used as a stand-in for baked normal maps: blur radius (px) and strength */
    bevelRadius: 5,
    bevelStrength: 1.15,
    /** shadow caster footprint: radius as a fraction of the sprite width, clamped (px) */
    casterRadius: { ratio: 0.22, min: 6, max: 26 },
    bloom: { threshold: 1.15, strength: 0.55 },
    exposure: 1.25,
    splitTone: 0.07,
    vignette: 0.42,
};

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const MAX_LIGHTS = 14;
const LIGHT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tAlbedo;   // sRGB frame as the game draws it today
uniform sampler2D tInfo;     // r = class / 8, g = bevel x, b = bevel y (0.5 = flat), a = contact occlusion
uniform sampler2D tGeo;      // r,g = foot y (hi, lo byte), b = height above foot (px), a = caster height at this ground pixel
uniform vec2 uRes;
uniform float uGround;
uniform vec3 uAmbient, uMoonDir, uMoonCol;
uniform float uMoonShadowLen, uShadowStrength, uContact, uBevel, uVfxEmissive, uEnvChroma;
uniform int uLightCount;
uniform vec4 uLightPos[${MAX_LIGHTS}];   // xyz ground space, w = range
uniform vec3 uLightCol[${MAX_LIGHTS}];
const int STEPS = ${LOOK.shadowSteps};

float casterAt(vec2 g){ vec2 uv = vec2(g.x, g.y / uGround) / uRes; uv.y = 1.0 - uv.y; return texture(tGeo, uv).a * 255.0; }

// March along the ground from the receiver toward the light; a caster taller than the ray at that point blocks it.
float shadow(vec3 P, vec3 toLight, float len, float skip){
    float occ = 0.0;
    vec2 dir = toLight.xy; float flat_ = length(dir);
    if (flat_ < 1e-3) return 1.0;
    dir /= flat_;
    float rise = toLight.z / flat_;
    for (int i = 1; i <= STEPS; i++) {
        float t = skip + (len - skip) * float(i) / float(STEPS);
        float h = casterAt(P.xy + dir * t);
        float ray = P.z + rise * t;
        occ = max(occ, smoothstep(0.0, 10.0, h - ray) * (1.0 - smoothstep(len * 0.75, len, t)));
    }
    return 1.0 - occ * uShadowStrength;
}

void main(){
    vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
    vec3 src = texture(tAlbedo, vUv).rgb;
    vec3 albedo = pow(src, vec3(2.2));
    vec4 info = texture(tInfo, vUv), geo = texture(tGeo, vUv);
    int cls = int(info.r * 8.0 + 0.5);
    if (cls == 6) { o = vec4(albedo, 0.0); return; }                     // HUD: drawn unlit, alpha 0 = skip post lighting
    if (cls == 5) { o = vec4(albedo * uVfxEmissive, 1.0); return; }      // spell effects are emissive
    if (cls != 4) albedo = mix(vec3(dot(albedo, vec3(0.2126, 0.7152, 0.0722))), albedo, uEnvChroma);
    if (cls == 0) { o = vec4(albedo * (uAmbient * 2.2 + uMoonCol * 0.25), 1.0); return; }   // sky: graded, not lit

    bool upright = cls == 3 || cls == 4;
    float footY = (geo.r * 255.0 * 256.0 + geo.g * 255.0);
    float height = geo.b * 255.0;
    vec3 P = upright ? vec3(px.x, footY * uGround, height) : vec3(px.x, px.y * uGround, 0.0);
    vec3 N;
    if (cls == 1) N = vec3(0.0, 0.0, 1.0);
    else if (cls == 2) N = normalize(vec3(0.0, 1.0, 0.15));
    else {
        vec2 b = (info.gb - 0.5) * 2.0 * uBevel;
        N = normalize(vec3(b.x, sqrt(max(0.05, 1.0 - dot(b, b))), b.y));
    }
    float skip = upright ? 22.0 : 3.0;

    vec3 light = uAmbient * (upright ? 1.0 : mix(1.0 - uContact, 1.0, info.a));
    float moon = max(dot(N, uMoonDir), 0.0);
    if (moon > 0.0) light += uMoonCol * moon * shadow(P, uMoonDir, uMoonShadowLen, skip);
    // upright sprites facing the camera get no direct moon: give them a thin cool edge where the bevel turns toward it
    if (upright) light += uMoonCol * 0.55 * pow(max(dot(N, normalize(vec3(uMoonDir.xy, 0.15))), 0.0), 1.5);

    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
        if (i >= uLightCount) break;
        vec3 d = uLightPos[i].xyz - P;
        float dist2 = dot(d, d), range = uLightPos[i].w;
        float fall = max(0.0, 1.0 - dist2 / (range * range));
        if (fall <= 0.0) continue;
        fall = fall * fall / (1.0 + dist2 / (range * range * 0.06));
        vec3 L = d * inversesqrt(dist2);
        float ndl = max(dot(N, L), 0.0);
        if (ndl <= 0.0) continue;
        float flatLen = length(d.xy);
        light += uLightCol[i] * ndl * fall * shadow(P, d, max(flatLen, skip + 1.0), skip);
    }
    o = vec4(albedo * light, 1.0);
}`;

const BRIGHT_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor; uniform float uThreshold;
void main(){ vec4 s = texture(tColor, vUv); vec3 c = s.rgb * s.a; float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(uThreshold, uThreshold * 1.6, l), 1.0); }`;

const BLUR_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor; uniform vec2 uDir;
void main(){ vec3 c = texture(tColor, vUv).rgb * 0.227027;
  c += (texture(tColor, vUv + uDir * 1.3846).rgb + texture(tColor, vUv - uDir * 1.3846).rgb) * 0.316216;
  c += (texture(tColor, vUv + uDir * 3.2308).rgb + texture(tColor, vUv - uDir * 3.2308).rgb) * 0.070270;
  o = vec4(c, 1.0); }`;

const COMP_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tColor, tBloom; uniform float uBloom, uExposure, uSplit, uVignette;
vec3 filmic(vec3 x){ x = max(x, 0.0); return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
    vec4 s = texture(tColor, vUv);
    if (s.a < 0.5) { o = vec4(pow(s.rgb, vec3(1.0 / 2.2)), 1.0); return; }   // HUD stays as drawn
    vec3 c = (s.rgb + texture(tBloom, vUv).rgb * uBloom) * uExposure;
    vec2 q = (vUv - 0.5) * vec2(1.0, 0.92);
    c *= mix(1.0 - uVignette, 1.0, smoothstep(0.95, 0.3, length(q) * 1.25));
    c = filmic(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c *= mix(vec3(1.0 - uSplit, 1.0, 1.0 + uSplit * 1.4), vec3(1.0 + uSplit, 1.0, 1.0 - uSplit * 0.8), smoothstep(0.08, 0.6, l));
    o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;

/** Runs in the page. */
async function relight({ albedoB64, labelsB64, labels, LOOK, shaders, MAX_LIGHTS, timingRuns }) {
    const load = (b64) => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${b64}`;
    });
    const [albedoImg, labelImg] = await Promise.all([load(albedoB64), load(labelsB64)]);
    const W = albedoImg.width, H = albedoImg.height;
    const read = (img) => { const c = new OffscreenCanvas(W, H).getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0); return c.getImageData(0, 0, W, H).data; };
    const albedo = read(albedoImg), lab = read(labelImg);

    // ---- CPU pre-pass (stand-in for data the runtime would already have) -------------------------------------------
    const CLASS = { background: 0, terrainTop: 1, terrainSide: 2, obstacle: 3, unit: 4, vfx: 5, hud: 6 };
    const firstUnit = labels.findIndex(l => l.startsWith('unit:'));
    const owner = new Int32Array(W * H), cls = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
        const id = lab[p * 4] | (lab[p * 4 + 1] << 8) | (lab[p * 4 + 2] << 16);
        owner[p] = id;
        cls[p] = id >= firstUnit && firstUnit >= 0 ? CLASS.unit : CLASS[labels[id]];
    }
    // Connected components of upright sprites: units by owner id, obstacles by 4-connectivity.
    const comp = new Int32Array(W * H).fill(-1);
    const comps = [];
    const unitComp = new Map();   // a unit's mask can be split by its HUD or effects: one component per owner id
    const stack = new Int32Array(W * H);
    for (let start = 0; start < W * H; start++) {
        if (comp[start] !== -1 || (cls[start] !== CLASS.obstacle && cls[start] !== CLASS.unit)) continue;
        const own = owner[start], isUnit = cls[start] === CLASS.unit;
        const id = isUnit && unitComp.has(own) ? unitComp.get(own) : comps.length;
        const c = comps[id] ?? { minX: W, maxX: 0, minY: H, maxY: 0, count: 0, unit: isUnit ? labels[own] : null };
        if (isUnit) unitComp.set(own, id);
        let top = 0; stack[top++] = start; comp[start] = id;
        while (top) {
            const p = stack[--top], x = p % W, y = (p / W) | 0;
            c.count++; if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x; if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y;
            for (const q of [p - 1, p + 1, p - W, p + W]) {
                if (q < 0 || q >= W * H || comp[q] !== -1 || owner[q] !== own) continue;
                if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
                comp[q] = id; stack[top++] = q;
            }
        }
        comps[id] = c;
    }
    // Foot point = centre of the lowest rows of each component.
    for (let id = 0; id < comps.length; id++) {
        const c = comps[id]; let sum = 0, n = 0, lo = W, hi = 0;
        for (let y = Math.max(c.minY, c.maxY - 6); y <= c.maxY; y++) for (let x = c.minX; x <= c.maxX; x++) {
            if (comp[y * W + x] === id) { sum += x; n++; if (x < lo) lo = x; if (x > hi) hi = x; }
        }
        c.footX = n ? sum / n : (c.minX + c.maxX) / 2; c.footY = c.maxY; c.height = c.maxY - c.minY;
        const R = LOOK.casterRadius;
        c.radius = Math.min(R.max, Math.max(R.min, (c.maxX - c.minX) * R.ratio));
    }
    // Silhouette bevel: blur the upright mask, its gradient is the outward normal.
    const r = LOOK.bevelRadius, mask = new Float32Array(W * H), tmp = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) mask[p] = comp[p] !== -1 ? 1 : 0;
    const box = (src, dst, stride, len, lines, lineStride) => {
        for (let l = 0; l < lines; l++) {
            let acc = 0; const base = l * lineStride;
            for (let i = -r; i <= r; i++) acc += src[base + Math.min(len - 1, Math.max(0, i)) * stride];
            for (let i = 0; i < len; i++) {
                dst[base + i * stride] = acc / (2 * r + 1);
                acc += src[base + Math.min(len - 1, i + r + 1) * stride] - src[base + Math.max(0, i - r) * stride];
            }
        }
    };
    for (let pass = 0; pass < 2; pass++) { box(mask, tmp, 1, W, H, W); box(tmp, mask, W, H, W, 1); }
    // Caster footprints (height of the object standing on each ground pixel) and their blurred copy for contact occlusion.
    const caster = new Uint8Array(W * H), contact = new Float32Array(W * H);
    for (const c of comps) {
        const rx = c.radius, ry = Math.max(2, c.radius / LOOK.groundPerScreenY);
        for (let y = Math.max(0, Math.floor(c.footY - ry)); y <= Math.min(H - 1, Math.ceil(c.footY + ry)); y++) {
            for (let x = Math.max(0, Math.floor(c.footX - rx)); x <= Math.min(W - 1, Math.ceil(c.footX + rx)); x++) {
                const dx = (x - c.footX) / rx, dy = (y - c.footY) / ry;
                if (dx * dx + dy * dy <= 1) { const p = y * W + x; caster[p] = Math.max(caster[p], Math.min(255, c.height)); contact[p] = 1; }
            }
        }
    }
    for (let pass = 0; pass < 2; pass++) { box(contact, tmp, 1, W, H, W); box(tmp, contact, W, H, W, 1); }

    const info = new Uint8Array(W * H * 4), geo = new Uint8Array(W * H * 4);
    const scale = (2 * r + 1) * 0.5 * 255;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = y * W + x, i = p * 4;
        info[i] = cls[p] * 32;   // class / 8 in 0..1
        let bx = 0, by = 0;
        if (comp[p] !== -1) {
            bx = -(mask[y * W + Math.min(W - 1, x + 1)] - mask[y * W + Math.max(0, x - 1)]) * 0.5;
            by = (mask[Math.min(H - 1, y + 1) * W + x] - mask[Math.max(0, y - 1) * W + x]) * 0.5;
            const c = comps[comp[p]];
            geo[i] = c.footY >> 8; geo[i + 1] = c.footY & 255; geo[i + 2] = Math.min(255, c.footY - y);
        }
        info[i + 1] = Math.max(0, Math.min(255, 127.5 + bx * scale));
        info[i + 2] = Math.max(0, Math.min(255, 127.5 + by * scale));
        info[i + 3] = Math.max(0, Math.min(255, 255 * (1 - Math.min(1, contact[p] * 1.6))));
        geo[i + 3] = caster[p];
    }
    // Lights: one warm light per unit, one at the centroid of the spell effects.
    const lights = [];
    const U = LOOK.unitLight, G = LOOK.groundPerScreenY;
    for (const c of comps) {
        if (!c.unit) continue;
        const team = c.unit.includes('BLU') ? 'BLU' : 'RED';
        lights.push({ pos: [c.footX, c.footY * G + U.front, U.height, U.range], col: U[team].map(v => v * U.intensity) });
    }
    let vx = 0, vy = 0, vn = 0; const vc = [0, 0, 0];
    for (let p = 0; p < W * H; p++) if (cls[p] === CLASS.vfx) {
        vx += p % W; vy += (p / W) | 0; vn++;
        for (let k = 0; k < 3; k++) vc[k] += Math.pow(albedo[p * 4 + k] / 255, 2.2);
    }
    const V = LOOK.vfxLight;
    if (vn >= V.minPixels) {
        const m = Math.max(vc[0], vc[1], vc[2]) || 1;
        lights.push({ pos: [vx / vn, (vy / vn) * G, V.height, V.range], col: vc.map(v => v / m * V.intensity) });
    }
    lights.length = Math.min(lights.length, MAX_LIGHTS);

    // ---- WebGL2 ----------------------------------------------------------------------------------------------------
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float unavailable');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const program = (frag) => { const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, shaders.VERT));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex8 = (data, flip) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t; };
    const target = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
    const tAlbedo = tex8(new Uint8Array(albedo.buffer), true), tInfo = tex8(info, true), tGeo = tex8(geo, true);
    const hdr = target(W, H), bw = W >> 1, bh = H >> 1, bloomA = target(bw, bh), bloomB = target(bw, bh);
    const pLight = program(shaders.LIGHT_FRAG), pBright = program(shaders.BRIGHT_FRAG), pBlur = program(shaders.BLUR_FRAG), pComp = program(shaders.COMP_FRAG);
    const bind = (p, unit, name, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(p, name), unit); };
    const norm = (v) => { const l = Math.hypot(...v); return v.map(c => c / l); };
    const draw = (fb, w, h) => { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };

    const frame = () => {
        gl.useProgram(pLight);
        bind(pLight, 0, 'tAlbedo', tAlbedo); bind(pLight, 1, 'tInfo', tInfo); bind(pLight, 2, 'tGeo', tGeo);
        const u = (n) => gl.getUniformLocation(pLight, n);
        gl.uniform2f(u('uRes'), W, H); gl.uniform1f(u('uGround'), LOOK.groundPerScreenY);
        gl.uniform3fv(u('uAmbient'), LOOK.ambient); gl.uniform3fv(u('uMoonDir'), norm(LOOK.moonDir));
        gl.uniform3fv(u('uMoonCol'), LOOK.moonColor.map(v => v * LOOK.moonIntensity));
        gl.uniform1f(u('uMoonShadowLen'), LOOK.moonShadowLength); gl.uniform1f(u('uShadowStrength'), LOOK.shadowStrength);
        gl.uniform1f(u('uContact'), LOOK.contactOcclusion); gl.uniform1f(u('uBevel'), LOOK.bevelStrength);
        gl.uniform1f(u('uVfxEmissive'), LOOK.vfxLight.emissive); gl.uniform1f(u('uEnvChroma'), LOOK.envChroma);
        gl.uniform1i(u('uLightCount'), lights.length);
        if (lights.length) {
            gl.uniform4fv(u('uLightPos'), lights.flatMap(l => l.pos)); gl.uniform3fv(u('uLightCol'), lights.flatMap(l => l.col));
        }
        draw(hdr.f, W, H);
        gl.useProgram(pBright); bind(pBright, 0, 'tColor', hdr.t);
        gl.uniform1f(gl.getUniformLocation(pBright, 'uThreshold'), LOOK.bloom.threshold); draw(bloomA.f, bw, bh);
        gl.useProgram(pBlur);
        for (let i = 0; i < 2; i++) {
            bind(pBlur, 0, 'tColor', bloomA.t); gl.uniform2f(gl.getUniformLocation(pBlur, 'uDir'), (1 + i * 1.5) / bw, 0); draw(bloomB.f, bw, bh);
            bind(pBlur, 0, 'tColor', bloomB.t); gl.uniform2f(gl.getUniformLocation(pBlur, 'uDir'), 0, (1 + i * 1.5) / bh); draw(bloomA.f, bw, bh);
        }
        gl.useProgram(pComp); bind(pComp, 0, 'tColor', hdr.t); bind(pComp, 1, 'tBloom', bloomA.t);
        const c = (n) => gl.getUniformLocation(pComp, n);
        gl.uniform1f(c('uBloom'), LOOK.bloom.strength); gl.uniform1f(c('uExposure'), LOOK.exposure);
        gl.uniform1f(c('uSplit'), LOOK.splitTone); gl.uniform1f(c('uVignette'), LOOK.vignette);
        draw(null, W, H);
    };
    frame(); gl.finish();
    const px = new Uint8Array(4);
    const t0 = performance.now();
    for (let i = 0; i < timingRuns; i++) frame();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // forces the queue to drain
    const msPerFrame = (performance.now() - t0) / timingRuns;
    frame();
    const out = new OffscreenCanvas(W * 2, H).getContext('2d');
    out.drawImage(albedoImg, 0, 0); out.drawImage(canvas, W, 0);
    const b64 = async (c) => { const blob = await c.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await blob.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); };
    const single = new OffscreenCanvas(W, H); single.getContext('2d').drawImage(canvas, 0, 0);
    return { lit: await b64(single), compare: await b64(out.canvas), gpu, msPerFrame, lights: lights.length, components: comps.length, width: W, height: H };
}

const launch = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--use-angle=d3d11'];
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

const browser = await launch();
const results = [];
try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>lit-proto</title>');
    for (const row of scenes) {
        const b64 = (suffix) => readFileSync(join(inDir, `${row.scene}_desktop_${suffix}.png`)).toString('base64');
        const res = await page.evaluate(relight, {
            albedoB64: b64('albedo'), labelsB64: b64('labels'), labels: row.mask.labels, LOOK, MAX_LIGHTS, timingRuns: 60,
            shaders: { VERT, LIGHT_FRAG, BRIGHT_FRAG, BLUR_FRAG, COMP_FRAG },
        });
        writeFileSync(join(outDir, `${row.scene}_lit.png`), Buffer.from(res.lit, 'base64'));
        writeFileSync(join(outDir, `${row.scene}_compare.png`), Buffer.from(res.compare, 'base64'));
        const { lit: _lit, compare: _compare, ...numbers } = res;
        results.push({ scene: row.scene, ...numbers });
        console.log(`${row.scene}: ${res.width}x${res.height}, ${res.lights} lights, ${res.components} casters, ${res.msPerFrame.toFixed(2)} ms/frame, ${res.gpu}`);
    }
} finally { await browser.close(); }
writeFileSync(join(outDir, 'lit.json'), JSON.stringify({ look: LOOK, results }, null, 2) + '\n');
if (!results.length) { console.error('No scenes found in', inDir); process.exit(1); }
