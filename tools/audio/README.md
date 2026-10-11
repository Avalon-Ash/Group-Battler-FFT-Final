# TACTICAL.OS — Audio Audition & Verification Tooling

This directory contains the interactive audition harness and automated headless verification scripts for the audio engine and sound effect assets.

---

## 1. Interactive Audio Preview Harness (`preview.html`)

### Launch Instructions
Start the Vite development server:
```bash
npm run dev
# Or: npx vite
```
Open in browser:
```text
http://localhost:3000/tools/audio/preview.html
```

### Features
1. **Interactive Cue Audition**:
   - Audition all 19 combat, magic, environment, and UI cues with real CC0 sound assets.
   - Audition individual file variants (`.ogg` / `.wav`) to hear variations.
   - Audition the procedural `Synth` fallback tone for each cue to verify graceful degradation when assets are unavailable.
2. **Gain & Bus Calibration**:
   - Master, SFX, and UI volume sliders using the perceived loudness dB curve ($x^{1.5}$).
   - Live Mute toggle.
3. **Decibel & Loudness Analysis**:
   - Instant calculation of Root Mean Square (RMS) decibel loudness for all 56 audio files upon loading.
4. **Stress & Throttle Testing**:
   - "Audition All Cues": Plays each cue sequentially.
   - "Test Throttle": Rapidly fires 10 events within 100ms to verify that `AUDIO.CUE_THROTTLE_MS` properly discards redundant events.

---

## 2. Headless Decoding & Loudness Verification (`verify-audio.mjs`)

Runs an automated headless Chromium browser session via `playwright-core`:
1. Spawns an internal Vite server on an ephemeral port.
2. Loads `preview.html`.
3. Verifies that all 56 audio files decode cleanly with `AudioContext.decodeAudioData()`.
4. Asserts 0 decode failures, reporting duration, sample rate, channels, and RMS dB for every asset.

### Run Script
```bash
node tools/audio/verify-audio.mjs
```
