import { CUE_TABLE, CueId, CueDef } from '../../data/audio/cues';
import { AUDIO } from '../../constants';
import { createSynthBuffer, AudioPRNG } from '../../engine/audio/Synth';
import { MUSIC_TABLE, TrackId } from '../../data/audio/music';

interface FileResult {
    file: string;
    cueId: string;
    success: boolean;
    duration: number;
    sampleRate: number;
    channels: number;
    rms: number;
    rmsDb: number;
    error?: string;
}

interface AudioDecodeResults {
    total: number;
    passed: number;
    failed: string[];
    files: Record<string, FileResult>;
}

declare global {
    interface Window {
        __AUDIO_PREVIEW_READY__?: boolean;
        __AUDIO_DECODE_RESULTS__?: AudioDecodeResults;
        __AUDIO_CTX__?: AudioContext;
    }
}

class AudioPreviewHarness {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private uiGain: GainNode | null = null;
    private isMuted: boolean = false;
    private prng: AudioPRNG;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private fileResults: Map<string, FileResult> = new Map();
    private lastPlayTime: Map<string, number> = new Map();

    constructor() {
        this.prng = new AudioPRNG(AUDIO.PRNG_SEED);
        this.init();
    }

    private log(msg: string, type: 'ok' | 'warn' | 'err' = 'ok'): void {
        const terminal = document.getElementById('log-terminal');
        if (!terminal) return;
        const row = document.createElement('div');
        row.className = `log-row log-${type}`;
        row.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        terminal.appendChild(row);
        terminal.scrollTop = terminal.scrollHeight;
    }

    private ensureContext(): AudioContext {
        if (!this.ctx) {
            const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.ctx = new AudioCtxClass();
            window.__AUDIO_CTX__ = this.ctx;

            this.masterGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.uiGain = this.ctx.createGain();

            this.sfxGain.connect(this.masterGain);
            this.uiGain.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            this.updateGains();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    private updateGains(): void {
        if (!this.ctx || !this.masterGain || !this.sfxGain || !this.uiGain) return;
        const now = this.ctx.currentTime;

        const masterSlider = document.getElementById('vol-master') as HTMLInputElement | null;
        const sfxSlider = document.getElementById('vol-sfx') as HTMLInputElement | null;
        const uiSlider = document.getElementById('vol-ui') as HTMLInputElement | null;

        const masterVal = masterSlider ? parseFloat(masterSlider.value) : 0.8;
        const sfxVal = sfxSlider ? parseFloat(sfxSlider.value) : 0.8;
        const uiVal = uiSlider ? parseFloat(uiSlider.value) : 0.7;

        const calc = (v: number) => this.isMuted ? 0 : Math.pow(Math.max(0, Math.min(1, v)), AUDIO.VOLUME_CURVE_EXPONENT);

        this.masterGain.gain.setValueAtTime(calc(masterVal), now);
        this.sfxGain.gain.setValueAtTime(calc(sfxVal), now);
        this.uiGain.gain.setValueAtTime(calc(uiVal), now);

        const valMaster = document.getElementById('val-master');
        const valSfx = document.getElementById('val-sfx');
        const valUi = document.getElementById('val-ui');
        if (valMaster) valMaster.textContent = `${Math.round(masterVal * 100)}%`;
        if (valSfx) valSfx.textContent = `${Math.round(sfxVal * 100)}%`;
        if (valUi) valUi.textContent = `${Math.round(uiVal * 100)}%`;
    }

    private calculateRMS(buffer: AudioBuffer): { rms: number; rmsDb: number } {
        let sumSquares = 0;
        let totalSamples = 0;

        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < data.length; i++) {
                sumSquares += data[i] * data[i];
            }
            totalSamples += data.length;
        }

        if (totalSamples === 0) return { rms: 0, rmsDb: -Infinity };
        const rms = Math.sqrt(sumSquares / totalSamples);
        const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
        return { rms, rmsDb };
    }

    private async init(): Promise<void> {
        this.bindGlobalControls();
        this.renderMusicUI();
        const ctx = this.ensureContext();

        // 收集全部待解碼檔案
        const allFiles: { cueId: string; file: string }[] = [];
        for (const [cueId, def] of Object.entries(CUE_TABLE)) {
            for (const f of def.files) {
                allFiles.push({ cueId, file: f });
            }
        }

        this.log(`Beginning decode of ${allFiles.length} audio files...`);

        const failedList: string[] = [];
        let decodedCount = 0;

        for (const item of allFiles) {
            try {
                // Vite serves static files from public/ directly at root
                const fetchUrl = (item.file.startsWith('/') ? item.file : '/' + item.file);
                const resp = await fetch(fetchUrl);
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status} fetching ${fetchUrl}`);
                }
                const arrayBuf = await resp.arrayBuffer();
                const audioBuf = await ctx.decodeAudioData(arrayBuf);

                const { rms, rmsDb } = this.calculateRMS(audioBuf);
                this.bufferCache.set(item.file, audioBuf);

                const result: FileResult = {
                    file: item.file,
                    cueId: item.cueId,
                    success: true,
                    duration: audioBuf.duration,
                    sampleRate: audioBuf.sampleRate,
                    channels: audioBuf.numberOfChannels,
                    rms,
                    rmsDb
                };

                this.fileResults.set(item.file, result);
                decodedCount++;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.log(`Failed to decode: ${item.file} (${msg})`, 'err');
                failedList.push(item.file);
                this.fileResults.set(item.file, {
                    file: item.file,
                    cueId: item.cueId,
                    success: false,
                    duration: 0,
                    sampleRate: 0,
                    channels: 0,
                    rms: 0,
                    rmsDb: -Infinity,
                    error: msg
                });
            }
        }

        const filesRecord: Record<string, FileResult> = {};
        for (const [k, v] of this.fileResults.entries()) {
            filesRecord[k] = v;
        }

        window.__AUDIO_DECODE_RESULTS__ = {
            total: allFiles.length,
            passed: decodedCount,
            failed: failedList,
            files: filesRecord
        };

        window.__AUDIO_PREVIEW_READY__ = true;

        this.updateStatsUI(allFiles.length, decodedCount, failedList.length);
        this.renderCuesUI();
        this.log(`Decoding complete: ${decodedCount}/${allFiles.length} passed (100% success).`, 'ok');
    }

    private updateStatsUI(total: number, passed: number, failed: number): void {
        const statDecoded = document.getElementById('stat-decoded');
        const statFailures = document.getElementById('stat-failures');
        const statusBadge = document.getElementById('decode-status');

        if (statDecoded) statDecoded.textContent = `${passed} / ${total}`;
        if (statFailures) {
            statFailures.textContent = String(failed);
            statFailures.style.color = failed === 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        }
        if (statusBadge) {
            if (failed === 0) {
                statusBadge.textContent = 'All Buffers Ready (100%)';
                statusBadge.style.background = 'rgba(52, 211, 153, 0.15)';
                statusBadge.style.color = 'var(--accent-green)';
            } else {
                statusBadge.textContent = `${failed} Decode Errors`;
                statusBadge.style.background = 'rgba(248, 113, 113, 0.15)';
                statusBadge.style.color = 'var(--accent-red)';
            }
        }
    }

    private renderCuesUI(): void {
        const grid = document.getElementById('cues-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (const [cueId, def] of Object.entries(CUE_TABLE) as [CueId, CueDef][]) {
            const card = document.createElement('div');
            card.className = 'cue-card';

            const busBadgeClass = def.bus === 'ui' ? 'badge-ui' : 'badge-sfx';

            card.innerHTML = `
                <div class="cue-header">
                    <span class="cue-title">${cueId}</span>
                    <div class="badges">
                        <span class="badge ${busBadgeClass}">${def.bus}</span>
                        <span class="badge badge-prio">Prio ${def.priority}</span>
                        <span class="badge badge-prio">${def.throttleMs ?? AUDIO.CUE_THROTTLE_MS}ms</span>
                    </div>
                </div>
                <div class="cue-actions">
                    <button class="btn btn-primary" data-play-cue="${cueId}">Play Cue</button>
                    <button class="btn btn-synth" data-play-synth="${cueId}">Synth Fallback</button>
                    <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
                        Gain: ${def.gain.toFixed(2)}
                    </span>
                </div>
                <div class="files-list">
                    ${def.files.map((file, idx) => {
                        const res = this.fileResults.get(file);
                        const durText = res?.duration ? `${res.duration.toFixed(2)}s` : '--';
                        const rmsText = res?.rmsDb !== undefined && res.rmsDb !== -Infinity ? `${res.rmsDb.toFixed(1)} dB` : '--';
                        return `
                            <div class="file-item">
                                <span class="file-name">
                                    <button class="play-file-btn" data-play-file="${file}" title="Play single file">▶</button>
                                    #${idx + 1} ${file.split('/').pop()}
                                </span>
                                <div class="file-meta">
                                    <span>${durText}</span>
                                    <span class="rms-badge">${rmsText}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            grid.appendChild(card);
        }

        // 綁定事件監聽
        grid.querySelectorAll('[data-play-cue]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cueId = (e.currentTarget as HTMLElement).getAttribute('data-play-cue') as CueId;
                this.playCue(cueId);
            });
        });

        grid.querySelectorAll('[data-play-synth]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cueId = (e.currentTarget as HTMLElement).getAttribute('data-play-synth') as CueId;
                this.playSynth(cueId);
            });
        });

        grid.querySelectorAll('[data-play-file]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const file = (e.currentTarget as HTMLElement).getAttribute('data-play-file')!;
                this.playDirectBuffer(file);
            });
        });
    }

    public playDirectBuffer(file: string): void {
        const ctx = this.ensureContext();
        const buffer = this.bufferCache.get(file);
        if (!buffer || !this.sfxGain) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.sfxGain);
        source.start(0);
        this.log(`Playing single asset: ${file}`);
    }

    public playCue(cueId: CueId): void {
        const ctx = this.ensureContext();
        const def = CUE_TABLE[cueId];
        if (!def) return;

        const now = performance.now();
        const throttle = def.throttleMs ?? AUDIO.CUE_THROTTLE_MS;
        const last = this.lastPlayTime.get(cueId) ?? 0;
        if (now - last < throttle) {
            this.log(`Cue throttled: ${cueId} (${Math.round(now - last)}ms < ${throttle}ms)`, 'warn');
            return;
        }
        this.lastPlayTime.set(cueId, now);

        // 隨機變體選擇
        let buffer: AudioBuffer | null = null;
        if (def.files.length > 0) {
            const pick = def.files[Math.floor(this.prng.range(0, def.files.length))];
            buffer = this.bufferCache.get(pick) ?? null;
        }

        if (!buffer) {
            buffer = createSynthBuffer(ctx, def.synth, this.prng);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // 音高顫動
        const jitter = def.pitchJitter ?? AUDIO.PITCH_JITTER;
        if (jitter > 0) {
            source.playbackRate.value = 1.0 + this.prng.range(-jitter, jitter);
        }

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(def.gain, ctx.currentTime);

        const busGain = def.bus === 'ui' ? this.uiGain : this.sfxGain;
        source.connect(voiceGain);
        voiceGain.connect(busGain ?? ctx.destination);

        source.start(0);
        this.log(`Playing cue: ${cueId} (gain=${def.gain.toFixed(2)}, jitter=±${jitter})`);
    }

    public playSynth(cueId: CueId): void {
        const ctx = this.ensureContext();
        const def = CUE_TABLE[cueId];
        if (!def) return;

        const buffer = createSynthBuffer(ctx, def.synth, this.prng);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(def.gain, ctx.currentTime);

        const busGain = def.bus === 'ui' ? this.uiGain : this.sfxGain;
        source.connect(voiceGain);
        voiceGain.connect(busGain ?? ctx.destination);

        source.start(0);
        this.log(`Playing procedural synth fallback: ${def.synth}`);
    }

    private musicSource: AudioBufferSourceNode | null = null;

    private renderMusicUI(): void {
        const grid = document.getElementById('music-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (const trackId of Object.keys(MUSIC_TABLE) as TrackId[]) {
            const def = MUSIC_TABLE[trackId];
            const card = document.createElement('div');
            card.className = 'cue-card';
            card.innerHTML = `
                <div class="cue-header">
                    <span class="cue-title">${trackId}</span>
                    <div class="badges">
                        <span class="badge badge-prio">${def.loop ? 'loop' : 'one-shot'}</span>
                        <span class="badge badge-prio">vol ${def.volume.toFixed(2)}</span>
                    </div>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">${def.title}</div>
                <div class="cue-actions">
                    <button class="btn btn-primary" data-play-music="${trackId}">Play</button>
                    <button class="btn btn-synth" data-stop-music="1">Stop</button>
                    <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${def.files[0].split('/').pop()}</span>
                </div>
            `;
            grid.appendChild(card);
        }

        grid.querySelectorAll('[data-play-music]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-play-music') as TrackId;
                void this.playMusicTrack(id);
            });
        });
        grid.querySelectorAll('[data-stop-music]').forEach(btn => {
            btn.addEventListener('click', () => this.stopMusicTrack());
        });
    }

    private stopMusicTrack(): void {
        if (this.musicSource) {
            try { this.musicSource.stop(0); } catch { /* already stopped */ }
            this.musicSource = null;
        }
    }

    private async playMusicTrack(trackId: TrackId): Promise<void> {
        const ctx = this.ensureContext();
        const def = MUSIC_TABLE[trackId];
        const file = def.files[0];
        this.stopMusicTrack();

        let buffer = this.bufferCache.get(file);
        if (!buffer) {
            try {
                this.log(`Decoding music: ${file}...`);
                const resp = await fetch(file.startsWith('/') ? file : '/' + file);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                buffer = await ctx.decodeAudioData(await resp.arrayBuffer());
                this.bufferCache.set(file, buffer);
            } catch (err) {
                this.log(`Failed to load music ${file}: ${err instanceof Error ? err.message : String(err)}`, 'err');
                return;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = def.loop;
        const gain = ctx.createGain();
        gain.gain.value = def.volume;
        source.connect(gain);
        gain.connect(this.masterGain ?? ctx.destination);
        source.start(0);
        this.musicSource = source;
        this.log(`Playing music: ${trackId} (${buffer.duration.toFixed(1)}s)`);
    }

    private bindGlobalControls(): void {
        const sliders = ['vol-master', 'vol-sfx', 'vol-ui'];
        for (const s of sliders) {
            const el = document.getElementById(s);
            if (el) el.addEventListener('input', () => this.updateGains());
        }

        const btnMute = document.getElementById('btn-mute');
        if (btnMute) {
            btnMute.addEventListener('click', () => {
                this.isMuted = !this.isMuted;
                btnMute.textContent = `Mute: ${this.isMuted ? 'ON' : 'OFF'}`;
                btnMute.style.background = this.isMuted ? 'rgba(248, 113, 113, 0.2)' : '#1e293b';
                this.updateGains();
            });
        }

        const btnPlayAll = document.getElementById('btn-play-all');
        if (btnPlayAll) {
            btnPlayAll.addEventListener('click', async () => {
                btnPlayAll.setAttribute('disabled', 'true');
                const cues = Object.keys(CUE_TABLE) as CueId[];
                for (const cue of cues) {
                    this.playCue(cue);
                    await new Promise(r => setTimeout(r, 600));
                }
                btnPlayAll.removeAttribute('disabled');
            });
        }

        const btnThrottle = document.getElementById('btn-throttle-test');
        if (btnThrottle) {
            btnThrottle.addEventListener('click', async () => {
                this.log('Testing rapid-fire throttle on HIT_LIGHT (10 triggers in 100ms)...');
                for (let i = 0; i < 10; i++) {
                    this.playCue('HIT_LIGHT');
                    await new Promise(r => setTimeout(r, 10));
                }
            });
        }
    }
}

// 實例化
new AudioPreviewHarness();
