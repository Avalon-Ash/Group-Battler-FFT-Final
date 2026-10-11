# 音訊／音樂系統與素材導入進度追蹤 (AUDIO_PROGRESS.md)

- 分支：`feat/audio`
- 開始時間：2026-10-11
- 驗證標準：`npm run lint`（0 error）、`npm test`、`npm run build`、`npm run e2e:ui`（連跑兩次）、`npm run perf:guard`（0 差異）

---

## 任務進度清單

| 任務 | 說明 | 狀態 | 檔案 | 驗證 |
| :--- | :--- | :---: | :--- | :--- |
| **U0** [E2E] | UI Bug：「展示矩陣設定」只准在展示頁使用 | 完成 | `types.ts`, `data/ui/windows.ts`, `windowRegistry.tsx`, `SystemMenu.tsx`, `App.tsx` | lint/test/build/e2e×2 全綠 |
| **S0a** | 音訊核心骨架 (AudioEngine, Synth, cues, music, constants) | 完成 | `constants.ts`, `AudioEngine.ts`, `Synth.ts` (cues/music data) | lint/test/build 全綠 |
| **S0b** | AudioSystem (事件 → cue 橋接, 聲像, BGM 交叉淡化) | 完成 | `AudioSystem.ts`, `engine/game.ts`, `types.ts` | lint/test/build 全綠 |
| **S0c** [E2E] | 音訊設定視窗 (audioSettings, localStorage, UICommand) | 完成 | `types.ts`, `windows.ts`, `UICommandSystem.ts`, `AudioSettingsWindow.tsx`, `windowRegistry.tsx` | lint/test/build/e2e×2 全綠 |
| **S1a** | SFX 素材採集 (CC0 真素材, ledger, CREDITS) | 完成 | 素材, docs, `cues.ts` | 測試 (manifest, budget) 全綠 |
| **S1b** | SFX 實裝與校音 (響度正規化, preview.html, 解碼驗證) | 完成 | `cues.ts`, `tools/audio/**` | lint/test/build/decode 全綠 (56/56) |
| **S2a** | BGM 素材 (管弦/奇幻 CC0/CC-BY 至少 5 首, ledger/CREDITS) | 待進行 | 素材, docs, data | 測試 (manifest, budget) |
| **S2b** | BGM 整合與體驗 (交叉淡化, 預載, 體驗驗證) | 待進行 | data, `AudioEngine.ts`/`AudioSystem.ts` | lint/test/build/perf:ab |
| **REPORT** | 完成報告與交接文件更新 (`AUDIO_REPORT.md`, `DECOUPLING_HANDOFF.md` §12) | 待進行 | docs | — |
| **FINAL** | 全量驗證與標籤 (tags: `audio-ckpt-S0`, `audio-ckpt-S1`, `audio-ckpt-S2`, `audio-ckpt-final`) | 待進行 | — | 全綠 |
