# 0011 貼地鋪設採合成圖加預烘六角遮罩、不用路徑裁切

狀態：採用
日期：2026-11-03

## 背景

iPhone 14 Pro 實機 5v5 連續施放奧義僅 34～36 FPS（低 5% 13 FPS）；實機五輪 A/B 證實瓶頸為貼地特效的逐格六角路徑裁切。後續實機又出現移動中詠唱環碎成矩形塊，推論源自對共用 `CanvasPattern` 呼叫 `setTransform` 在 iOS Safari 上未生效。

## 決定

- 貼頂面的鋪設特效依混合模式先合成為一張圖（`engine/renderers/GroundDrape.ts`），搭配 `engine/renderers/DrapeHexMask.ts` 依 `(q − r) mod 3` 預烘的三色六角遮罩，以 pattern 填色合成三色層後逐格只貼矩形，不使用六角路徑裁切。
- 遮罩的位移與縮放一律走畫布上下文變換，禁止修改共用 pattern 的變換矩陣。

## 放棄的做法

- 每格建立六角路徑裁切（34～36 FPS）或使用 `Path2D` 裁切（43.3 FPS）。
- 以 `drawImage` 貼整張預烘遮罩大圖取代 pattern 填色（實測 32 FPS，低於 pattern 填色的 60 FPS）。
- 對共用 `CanvasPattern` 呼叫 `setTransform`。

## 後果

- iPhone 14 Pro 5v5 連續奧義提升至 60 FPS（低 5% 53～55 FPS），移動中的詠唱環不再破圖；由 `tests/DrapeHexMask.test.ts` 擋住退回路徑裁切或改動 pattern 變換。
- 懸空貼地平面須由每幀借還的離屏畫布組合成，並對觸控裝置限制單邊最大像素。

## 證據

- `docs/DECISIONS.md`「AI 與大逃殺」
- `engine/renderers/DrapeHexMask.ts`、`engine/renderers/GroundDrape.ts`
- `tests/DrapeHexMask.test.ts`
- `docs/WORKLOG.md` §2 BH、§2 BI、§2 BN
