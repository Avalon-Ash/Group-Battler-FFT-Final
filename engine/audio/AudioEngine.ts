import { AUDIO } from '../../constants';
import { CueDef, CueId, CUE_TABLE, AudioBusType } from '../../data/audio/cues';
import { TrackId, MUSIC_TABLE } from '../../data/audio/music';
import { AudioPRNG, createSynthBuffer } from './Synth';

export interface AudioSettings {
    master: number;
    music: number;
    sfx: number;
    ui: number;
    muted: boolean;
}

export interface PlayCueOptions {
    x?: number; // 左右聲像位置（0..1 螢幕比例，或 -1..1）
    intensity?: number; // 音量強弱加權（預設 1.0）
}

interface ActiveVoice {
    source: AudioBufferSourceNode;
    gain: GainNode;
    panner?: StereoPannerNode;
    cueId: CueId;
    priority: number;
    startTime: number;
}

interface CurrentMusicTrack {
    trackId: TrackId;
    source: AudioBufferSourceNode;
    gain: GainNode;
    /** 是否為合成鋪底後備（真實檔案永久載入失敗時才會出現） */
    isFallback: boolean;
}

/**
 * Web Audio 核心管理器
 * 負責匯流排管理、Voice pool 限額、節流、手勢解鎖、合成後備與音樂交叉淡化。
 */
export class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private uiGain: GainNode | null = null;

    private isUnlocked: boolean = false;
    private isMutedByUrl: boolean = false;
    private settings: AudioSettings;

    private prng: AudioPRNG;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private warnedAssets: Set<string> = new Set();
    private lastCuePlayTime: Map<CueId, number> = new Map();
    private activeVoices: ActiveVoice[] = [];
    private currentMusic: CurrentMusicTrack | null = null;
    private wantedTrackId: TrackId | null = null;
    private failedAssets: Set<string> = new Set();
    private inflightLoads: Map<string, Promise<AudioBuffer | null>> = new Map();
    private synthCache: Map<string, AudioBuffer> = new Map();
    private hasPreloaded: boolean = false;
    private isShowcaseMix: boolean = false;

    private unlockListenerBound: (() => void) | null = null;
    private visibilityListenerBound: (() => void) | null = null;
    private blurListenerBound: (() => void) | null = null;
    private focusListenerBound: (() => void) | null = null;
    private isDestroyed: boolean = false;

    constructor(injected?: {
        audioContext?: AudioContext;
        skipUrlCheck?: boolean;
        forceMute?: boolean;
    }) {
        this.prng = new AudioPRNG(AUDIO.PRNG_SEED);
        this.settings = this.loadSettings();

        // 檢查 ?mute 參數
        this.isMutedByUrl = injected?.forceMute ?? this.checkMuteFromUrl(injected?.skipUrlCheck);

        // 若 URL 指定 ?mute，依規範完全不建立 AudioContext、不載入音訊檔
        if (this.isMutedByUrl) {
            return;
        }

        // 初始化 AudioContext（若環境支援）
        this.initContext(injected?.audioContext);
        this.bindWindowEvents();
    }

    /** 檢查目前是否因 URL ?mute 處於絕對靜音狀態 */
    public isUrlMuted(): boolean {
        return this.isMutedByUrl;
    }

    /** 檢查 AudioContext 是否已完成手勢解鎖 */
    public isAudioUnlocked(): boolean {
        return this.isUnlocked;
    }

    /** 取得設定副本 */
    public getSettings(): Readonly<AudioSettings> {
        return { ...this.settings };
    }

    /** 取得特定 Bus 目前音量 [0, 1] */
    public getVolume(bus: AudioBusType): number {
        return this.settings[bus];
    }

    /** 是否整體手動靜音 */
    public isMuted(): boolean {
        return this.settings.muted;
    }

    /** 設定特定 Bus 音量並持久化 */
    public setVolume(bus: AudioBusType, volume: number): void {
        const clamped = Math.max(0, Math.min(1, volume));
        this.settings[bus] = clamped;
        this.saveSettings();
        this.applyBusGains();
    }

    /** 展示模式混音：壓低 SFX Bus（僅 BGM 為主；不寫入使用者設定） */
    public setShowcaseMix(enabled: boolean): void {
        if (this.isShowcaseMix === enabled) return;
        this.isShowcaseMix = enabled;
        this.applyBusGains();
    }

    /** 設定手動靜音切換並持久化 */
    public setMuted(muted: boolean): void {
        this.settings.muted = muted;
        this.saveSettings();
        this.applyBusGains();
    }

    /** 手勢解鎖觸發點（第一次 pointerdown / keydown / touchstart） */
    public unlock(): void {
        if (this.isMutedByUrl || !this.ctx) return;
        if (this.isUnlocked) return;

        this.isUnlocked = true;
        this.removeUnlockListeners();

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {
                // 忽略非使用者手勢期間的 resume 失敗
            });
        }
        this.preloadMusicTracks();
    }

    /** 暫停播放（分頁隱藏時） */
    public suspend(): void {
        if (this.isMutedByUrl || !this.ctx) return;
        if (this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
        }
    }

    /** 恢復播放（分頁重現時） */
    public resume(): void {
        if (this.isMutedByUrl || !this.ctx) return;
        if (this.isUnlocked && !this.settings.muted && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    /**
     * 播放音效 Cue
     * @param cueId 音效識別碼
     * @param opts 左右聲像位置與強度加權
     * @returns 是否成功觸發播放
     */
    public playCue(cueId: CueId, opts?: PlayCueOptions): boolean {
        if (this.isMutedByUrl || !this.ctx || !this.isUnlocked) {
            // 未解鎖前或靜音時直接靜默丟棄，不排隊
            return false;
        }

        const cueDef: CueDef | undefined = CUE_TABLE[cueId];
        if (!cueDef) return false;

        const nowMs = performance.now();
        const throttleMs = cueDef.throttleMs ?? AUDIO.CUE_THROTTLE_MS;
        const lastPlay = this.lastCuePlayTime.get(cueId) ?? -Infinity;

        // 節流檢查
        if (nowMs - lastPlay < throttleMs) {
            return false;
        }

        // Voice pool 限額與搶佔檢查
        if (!this.acquireVoiceSlot(cueDef.priority)) {
            return false;
        }

        // 取得 AudioBuffer（實體檔快取或合成後備）
        const buffer = this.resolveBufferForCue(cueDef);
        if (!buffer) return false;

        const busGainNode = this.getBusGainNode(cueDef.bus);
        if (!busGainNode) return false;

        try {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            // 音高微幅隨機微調（防機器人重複感）
            const pitchJitter = cueDef.pitchJitter ?? AUDIO.PITCH_JITTER;
            if (pitchJitter > 0) {
                const pitchDelta = this.prng.range(-pitchJitter, pitchJitter);
                source.playbackRate.value = Math.max(0.2, 1.0 + pitchDelta);
            }

            // 音量增益與微調
            const voiceGain = this.ctx.createGain();
            const volumeJitter = this.prng.range(-AUDIO.VOLUME_JITTER, AUDIO.VOLUME_JITTER);
            const intensity = opts?.intensity ?? 1.0;
            const finalGain = Math.max(0, cueDef.gain * (1.0 + volumeJitter) * intensity);
            voiceGain.gain.setValueAtTime(finalGain, this.ctx.currentTime);

            // 聲像處理（Stereo Panner）
            let panner: StereoPannerNode | undefined;
            if (opts?.x !== undefined && typeof this.ctx.createStereoPanner === 'function') {
                panner = this.ctx.createStereoPanner();
                const pan = this.calculatePan(opts.x);
                panner.pan.setValueAtTime(pan, this.ctx.currentTime);
                source.connect(voiceGain);
                voiceGain.connect(panner);
                panner.connect(busGainNode);
            } else {
                source.connect(voiceGain);
                voiceGain.connect(busGainNode);
            }

            const voice: ActiveVoice = {
                source,
                gain: voiceGain,
                panner,
                cueId,
                priority: cueDef.priority,
                startTime: this.ctx.currentTime
            };

            this.activeVoices.push(voice);
            this.lastCuePlayTime.set(cueId, nowMs);

            source.onended = () => {
                this.releaseVoice(voice);
            };

            source.start(0);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 播放背景音樂（平滑交叉淡化）
     * @param trackId 曲目識別碼
     * @param fadeSec 交叉淡化秒數（預設 AUDIO.BGM_CROSSFADE_SEC）
     */
    public playMusic(trackId: TrackId, fadeSec: number = AUDIO.BGM_CROSSFADE_SEC): void {
        if (this.isMutedByUrl || !this.ctx) return;

        const trackDef = MUSIC_TABLE[trackId];
        if (!trackDef) return;

        // 記錄「目前期望的曲目」，用於丟棄過期的非同步載入回呼
        this.wantedTrackId = trackId;

        // 若正在播放同一首（且為真實檔案）則不重播；合成鋪底允許被真實檔案取代
        if (this.currentMusic?.trackId === trackId && !this.currentMusic.isFallback) {
            return;
        }

        const file = trackDef.files[0];
        let buffer: AudioBuffer | null = file ? (this.bufferCache.get(file) ?? null) : null;
        let isFallback = false;

        if (!buffer) {
            if (!this.isMusicFileUnavailable(trackId)) {
                // 檔案尚在載入：維持現有曲目，載入完成後若仍被期望再切換
                void this.loadBuffer(file).then(() => {
                    if (!this.isDestroyed && this.wantedTrackId === trackId) {
                        this.playMusic(trackId, fadeSec);
                    }
                });
                return;
            }
            // 檔案永久不可用：改用合成鋪底（同一 trackId 已在播放鋪底則不重複建立）
            if (this.currentMusic?.trackId === trackId) return;
            buffer = createSynthBuffer(this.ctx, 'BGM_PAD', this.prng);
            isFallback = true;
        }

        try {
            const now = this.ctx.currentTime;
            const targetVolume = trackDef.volume;

            // 淡出並停止既有曲目
            if (this.currentMusic) {
                const oldMusic = this.currentMusic;
                this.currentMusic = null;
                const oldGain = oldMusic.gain.gain;
                oldGain.cancelScheduledValues(now);
                oldGain.setValueAtTime(oldGain.value, now);
                oldGain.linearRampToValueAtTime(0.0001, now + fadeSec);
                oldMusic.source.stop(now + fadeSec);
                setTimeout(() => {
                    try {
                        oldMusic.source.disconnect();
                        oldMusic.gain.disconnect();
                    } catch {}
                }, Math.ceil(fadeSec * 1000) + 50);
            }

            // 建立新音樂節點
            const newSource = this.ctx.createBufferSource();
            newSource.buffer = buffer;
            newSource.loop = trackDef.loop;
            if (trackDef.loopStart !== undefined) newSource.loopStart = trackDef.loopStart;
            if (trackDef.loopEnd !== undefined) newSource.loopEnd = trackDef.loopEnd;

            const newGain = this.ctx.createGain();
            newGain.gain.setValueAtTime(0.0001, now);
            newGain.gain.linearRampToValueAtTime(targetVolume, now + fadeSec);

            if (this.musicGain) {
                newSource.connect(newGain);
                newGain.connect(this.musicGain);
            }

            newSource.start(0);
            this.currentMusic = {
                trackId,
                source: newSource,
                gain: newGain,
                isFallback
            };

            // 若為非循環曲目（如勝利 / 敗北 sting），播放完畢後平滑回到氛圍曲目
            if (!trackDef.loop) {
                newSource.onended = () => {
                    if (this.currentMusic?.source === newSource) {
                        this.currentMusic = null;
                        this.playMusic('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);
                    }
                };
            }
        } catch {}
    }

    /**
     * 停止背景音樂（淡出）
     */
    public stopMusic(fadeSec: number = AUDIO.BGM_CROSSFADE_SEC): void {
        this.wantedTrackId = null;
        if (!this.ctx || !this.currentMusic) return;

        try {
            const now = this.ctx.currentTime;
            const music = this.currentMusic;
            this.currentMusic = null;

            music.gain.gain.cancelScheduledValues(now);
            music.gain.gain.setValueAtTime(music.gain.gain.value, now);
            music.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
            music.source.stop(now + fadeSec);

            setTimeout(() => {
                try {
                    music.source.disconnect();
                    music.gain.disconnect();
                } catch {}
            }, Math.ceil(fadeSec * 1000) + 50);
        } catch {}
    }

    /** 載入外部音訊檔案至快取（同一 URL 並行請求共用同一 Promise；失敗者記錄於 failedAssets） */
    public loadBuffer(url: string): Promise<AudioBuffer | null> {
        if (this.isMutedByUrl || !this.ctx) return Promise.resolve(null);
        const cached = this.bufferCache.get(url);
        if (cached) return Promise.resolve(cached);
        if (this.failedAssets.has(url)) return Promise.resolve(null);
        const inflight = this.inflightLoads.get(url);
        if (inflight) return inflight;

        const task = this.fetchAndDecode(url).finally(() => {
            this.inflightLoads.delete(url);
        });
        this.inflightLoads.set(url, task);
        return task;
    }

    private async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
        const ctx = this.ctx;
        if (!ctx) return null;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                this.failedAssets.add(url);
                this.warnAssetOnce(`Failed to fetch audio asset: ${url} (${resp.status})`);
                return null;
            }
            const arrayBuffer = await resp.arrayBuffer();
            const decoded = await ctx.decodeAudioData(arrayBuffer);
            if (this.isDestroyed) return null;
            this.bufferCache.set(url, decoded);
            return decoded;
        } catch {
            this.failedAssets.add(url);
            this.warnAssetOnce(`Failed to decode audio asset: ${url}`);
            return null;
        }
    }

    /** 釋放所有音訊資源 */
    public destroy(): void {
        this.isDestroyed = true;
        this.removeUnlockListeners();
        this.removeVisibilityListeners();
        this.removeFocusListeners();

        this.stopMusic(0.1);
        for (const voice of this.activeVoices) {
            try {
                voice.source.stop(0);
                voice.source.disconnect();
            } catch {}
        }
        this.activeVoices.length = 0;

        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close().catch(() => {});
        }
        this.ctx = null;
        this.bufferCache.clear();
    }

    /**
     * 音訊資產預載策略:
     * 1. 首屏優先載入 SHOWCASE_AMBIENT 氛圍曲；
     * 2. 接著載入全部 SFX 檔案（小檔，批次並行解碼）；
     * 3. 其餘曲目透過 idle 回呼於閒置時預取解碼至記憶體快取（亦可由 playMusic 即時按需載入）。
     */
    public preloadMusicTracks(): void {
        if (this.isMutedByUrl || !this.ctx || this.hasPreloaded) return;
        this.hasPreloaded = true;

        const scheduleIdle = typeof window !== 'undefined' && 'requestIdleCallback' in window
            ? (cb: () => void) => (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 4000 })
            : (cb: () => void) => setTimeout(cb, 1000);

        const remainingTracks: TrackId[] = (Object.keys(MUSIC_TABLE) as TrackId[]).filter(t => t !== 'SHOWCASE_AMBIENT');
        const sfxFiles: string[] = [];
        for (const def of Object.values(CUE_TABLE)) {
            for (const f of def.files) {
                if (!sfxFiles.includes(f)) sfxFiles.push(f);
            }
        }

        const loadRemainingMusicIdle = () => {
            let trackIdx = 0;
            const loadNextIdle = () => {
                if (this.isDestroyed || trackIdx >= remainingTracks.length) return;
                const file = MUSIC_TABLE[remainingTracks[trackIdx++]]?.files[0];
                if (file) {
                    void this.loadBuffer(file).finally(() => scheduleIdle(loadNextIdle));
                } else {
                    scheduleIdle(loadNextIdle);
                }
            };
            scheduleIdle(loadNextIdle);
        };

        const loadSfxBatched = async () => {
            for (let i = 0; i < sfxFiles.length; i += AUDIO.PRELOAD_BATCH_SIZE) {
                if (this.isDestroyed) return;
                await Promise.all(sfxFiles.slice(i, i + AUDIO.PRELOAD_BATCH_SIZE).map(f => this.loadBuffer(f)));
            }
        };

        const ambientFile = MUSIC_TABLE.SHOWCASE_AMBIENT.files[0];
        const ambientLoad = ambientFile ? this.loadBuffer(ambientFile) : Promise.resolve(null);
        void ambientLoad
            .then(() => loadSfxBatched())
            .then(() => loadRemainingMusicIdle());
    }

    // =========================================================================
    // 內部私有輔助方法
    // =========================================================================

    private initContext(injectedContext?: AudioContext): void {
        if (injectedContext) {
            this.ctx = injectedContext;
        } else if (typeof window !== 'undefined') {
            const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtxClass) {
                this.ctx = new AudioCtxClass();
            }
        }

        if (!this.ctx) return;

        // 建立匯流排架構: master -> destination; music/sfx/ui -> master
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        this.uiGain = this.ctx.createGain();
        this.uiGain.connect(this.masterGain);

        this.applyBusGains();

        if (this.ctx.state === 'running') {
            this.isUnlocked = true;
        }
        // 檔案抓取與解碼不受自動播放政策限制，提前開始；播放仍需等待手勢解鎖
        this.preloadMusicTracks();
    }

    private bindWindowEvents(): void {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        if (!this.isUnlocked) {
            this.unlockListenerBound = () => this.unlock();
            window.addEventListener('pointerdown', this.unlockListenerBound, { capture: true, once: true });
            window.addEventListener('keydown', this.unlockListenerBound, { capture: true, once: true });
        }

        this.visibilityListenerBound = () => {
            if (document.hidden) {
                this.suspend();
            } else {
                this.resume();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityListenerBound);

        this.blurListenerBound = () => {
            if (this.masterGain && this.ctx) {
                const now = this.ctx.currentTime;
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
            }
        };
        this.focusListenerBound = () => {
            if (this.masterGain && this.ctx && !this.settings.muted) {
                const now = this.ctx.currentTime;
                const target = Math.pow(Math.max(0, Math.min(1, this.settings.master)), AUDIO.VOLUME_CURVE_EXPONENT);
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
                this.masterGain.gain.linearRampToValueAtTime(target, now + 0.5);
            }
        };
        window.addEventListener('blur', this.blurListenerBound);
        window.addEventListener('focus', this.focusListenerBound);
    }

    private removeUnlockListeners(): void {
        if (typeof window !== 'undefined' && this.unlockListenerBound) {
            window.removeEventListener('pointerdown', this.unlockListenerBound, { capture: true });
            window.removeEventListener('keydown', this.unlockListenerBound, { capture: true });
            this.unlockListenerBound = null;
        }
    }

    private removeVisibilityListeners(): void {
        if (typeof document !== 'undefined' && this.visibilityListenerBound) {
            document.removeEventListener('visibilitychange', this.visibilityListenerBound);
            this.visibilityListenerBound = null;
        }
    }

    private removeFocusListeners(): void {
        if (typeof window !== 'undefined') {
            if (this.blurListenerBound) {
                window.removeEventListener('blur', this.blurListenerBound);
                this.blurListenerBound = null;
            }
            if (this.focusListenerBound) {
                window.removeEventListener('focus', this.focusListenerBound);
                this.focusListenerBound = null;
            }
        }
    }

    private checkMuteFromUrl(skipCheck?: boolean): boolean {
        if (skipCheck || typeof window === 'undefined' || !window.location) {
            return false;
        }
        try {
            const params = new URLSearchParams(window.location.search);
            return params.has(AUDIO.QUERY_MUTE_KEY);
        } catch {
            return false;
        }
    }

    private loadSettings(): AudioSettings {
        const defaults: AudioSettings = {
            master: AUDIO.DEFAULT_MASTER_VOLUME,
            music: AUDIO.DEFAULT_MUSIC_VOLUME,
            sfx: AUDIO.DEFAULT_SFX_VOLUME,
            ui: AUDIO.DEFAULT_UI_VOLUME,
            muted: false
        };

        if (typeof window === 'undefined' || !window.localStorage) {
            return defaults;
        }

        try {
            const raw = window.localStorage.getItem(AUDIO.STORAGE_KEY);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return {
                master: typeof parsed.master === 'number' ? Math.max(0, Math.min(1, parsed.master)) : defaults.master,
                music: typeof parsed.music === 'number' ? Math.max(0, Math.min(1, parsed.music)) : defaults.music,
                sfx: typeof parsed.sfx === 'number' ? Math.max(0, Math.min(1, parsed.sfx)) : defaults.sfx,
                ui: typeof parsed.ui === 'number' ? Math.max(0, Math.min(1, parsed.ui)) : defaults.ui,
                muted: typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted
            };
        } catch {
            return defaults;
        }
    }

    private saveSettings(): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            window.localStorage.setItem(AUDIO.STORAGE_KEY, JSON.stringify(this.settings));
        } catch {}
    }

    /** 依 dB 感知曲線套用各 Bus 增益 */
    private applyBusGains(): void {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const isMuted = this.settings.muted;

        const calcGain = (val: number) => {
            if (isMuted) return 0;
            return Math.pow(Math.max(0, Math.min(1, val)), AUDIO.VOLUME_CURVE_EXPONENT);
        };

        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(calcGain(this.settings.master), now);
        }
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(calcGain(this.settings.music), now);
        }
        if (this.sfxGain) {
            const showcaseFactor = this.isShowcaseMix ? AUDIO.SHOWCASE_SFX_GAIN : 1;
            this.sfxGain.gain.setValueAtTime(calcGain(this.settings.sfx) * showcaseFactor, now);
        }
        if (this.uiGain) {
            this.uiGain.gain.setValueAtTime(calcGain(this.settings.ui), now);
        }
    }

    private getBusGainNode(bus: AudioBusType): GainNode | null {
        switch (bus) {
            case 'master': return this.masterGain;
            case 'music': return this.musicGain;
            case 'sfx': return this.sfxGain;
            case 'ui': return this.uiGain;
            default: return this.sfxGain;
        }
    }

    /**
     * Voice 槽位管理（上限 24，超過時依優先級搶佔）
     */
    private acquireVoiceSlot(newPriority: number): boolean {
        if (this.activeVoices.length < AUDIO.MAX_VOICES) {
            return true;
        }

        // 找出優先級最低（若相同則最舊）之發聲個體
        let lowestIdx = -1;
        let lowestPriority = Infinity;
        let oldestTime = Infinity;

        for (let i = 0; i < this.activeVoices.length; i++) {
            const v = this.activeVoices[i];
            if (v.priority < lowestPriority || (v.priority === lowestPriority && v.startTime < oldestTime)) {
                lowestIdx = i;
                lowestPriority = v.priority;
                oldestTime = v.startTime;
            }
        }

        // 新音效優先度不足以搶佔
        if (newPriority <= lowestPriority || lowestIdx === -1) {
            return false;
        }

        // 搶佔舊 Voice
        const victim = this.activeVoices[lowestIdx];
        try {
            victim.source.stop(0);
            victim.source.disconnect();
        } catch {}
        this.activeVoices.splice(lowestIdx, 1);
        return true;
    }

    private releaseVoice(voice: ActiveVoice): void {
        const idx = this.activeVoices.indexOf(voice);
        if (idx !== -1) {
            this.activeVoices.splice(idx, 1);
        }
        try {
            voice.source.disconnect();
            voice.gain.disconnect();
            voice.panner?.disconnect();
        } catch {}
    }

    /** 計算聲像平移（限制在 [-PAN_RANGE, PAN_RANGE]） */
    private calculatePan(x: number): number {
        // 若輸入為螢幕比例 [0, 1]，映射至 [-1, 1]
        let pan = x;
        if (x >= 0 && x <= 1) {
            pan = (x - 0.5) * 2;
        }
        return Math.max(-AUDIO.PAN_RANGE, Math.min(AUDIO.PAN_RANGE, pan));
    }

    /** 解析 Cue 的 AudioBuffer（檔案缺失或尚未載入時回退至合成後備，合成結果依 synth id 快取） */
    private resolveBufferForCue(cueDef: CueDef): AudioBuffer | null {
        if (!this.ctx) return null;

        // 若有實體音效檔案且已在快取中，隨機選取變體
        if (cueDef.files.length > 0) {
            const cachedFiles = cueDef.files.filter(f => this.bufferCache.has(f));
            if (cachedFiles.length > 0) {
                const pickIndex = Math.floor(this.prng.range(0, cachedFiles.length));
                return this.bufferCache.get(cachedFiles[pickIndex])!;
            }
            // 尚未載入：觸發背景載入，本次先用合成後備
            for (const f of cueDef.files) {
                if (!this.failedAssets.has(f)) void this.loadBuffer(f);
            }
        }

        // 缺失時回退程序化合成後備音（快取避免每次觸發重新配置 buffer）
        const synthKey = String(cueDef.synth);
        let synthBuf = this.synthCache.get(synthKey);
        if (!synthBuf) {
            synthBuf = createSynthBuffer(this.ctx, cueDef.synth, this.prng);
            this.synthCache.set(synthKey, synthBuf);
        }
        return synthBuf;
    }

    /** 曲目檔案是否已永久載入失敗（或根本沒有檔案），此時才允許使用合成鋪底 */
    private isMusicFileUnavailable(trackId: TrackId): boolean {
        const files = MUSIC_TABLE[trackId]?.files ?? [];
        if (files.length === 0) return true;
        return files.every(f => this.failedAssets.has(f));
    }

    private warnAssetOnce(msg: string): void {
        if (!this.warnedAssets.has(msg)) {
            this.warnedAssets.add(msg);
            console.warn(`[AudioEngine] ${msg}`);
        }
    }
}
