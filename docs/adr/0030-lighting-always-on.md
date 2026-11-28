# 0030 打光通道所有裝置預設開，不因效能關閉

狀態：採用
日期：2026-11-28

## 背景

0029 的決定裡有一條：預設桌機開、觸控裝置關；自適應品質降到解析度階層時自動關掉打光，這個頁面不再打開。
上線當天使用者在桌機（RTX 4070）實機回饋：「沒兩下就被關掉了，不論如何都不可以被關掉」，並決定 iPhone 也預設開，之後的效能工作改成降低打光與特效的成本。
重現（一般 Chrome 視窗、不加 GPU 旗標、線上版、2560×1440）：顯示卡是 RTX 4070，打光開著 65～190 FPS，第 48 秒幀率短暫低於 45 就被關掉，關掉後 130～229 FPS。
另外用 `WEBGL_lose_context` 實測到：context 遺失再還原之後，`EXT_color_buffer_float` 沒有重新啟用，render target 建不起來，通道永久停用。

## 決定

- 本份只改 0029「決定」的第六條（預設與自動關閉）；0029 其餘各條不變，仍然有效，所以 0029 的狀態維持採用。
- 網址沒寫 `lit` 時，桌機與觸控裝置都預設開（`RENDER_QUALITY.LIT_DEFAULT_ON`）；`?lit=0` 仍可關（保真基準與凍結幀探針用）。
- 通道載入後不因效能關閉：`LightingGate` 不讀品質階層，`LightingPass` 沒有主動釋放的路徑。跑不動時由自適應品質降解析度，打光跟著畫布變小。
- context 遺失期間走原本的 Canvas 2D 路徑；還原後重建資源（含重新啟用擴充）並繼續打光。
- 仍然不打光的情況只剩硬體做不到的：WebGL2 拿不到、RGBA16F 不能當 render target（`EXT_color_buffer_float` 與 `EXT_color_buffer_half_float` 都沒有）、只有軟體算圖。
- 之後的效能工作不得用「關掉打光」當手段；要省就降打光通道自己的成本，或拿掉被光取代的特效零件。

## 放棄的做法

- 保留自動關閉、只把門檻調鬆：使用者明確否決（「不論如何都不可以被關掉」）。
- 把 0029 整份標成已取代：0029 的其他各條（只用瀏覽器 WebGL2 API、WebGL 只在打光目錄、參數集中一張表）沒有變，十幾個檔案的檔頭都指向它；只為了一條預設值重寫整份沒有必要。

## 後果

- 弱顯示卡上不再回到未打光的 56 FPS，而是打光開著、解析度降到階層 3：內顯（AMD Radeon 內顯、1264×625、開發伺服器）量到 30～40 FPS。
- 觸控裝置多出打光通道的畫布與貼圖；iPhone 實機的幀數、發熱、分頁回收都還沒量，WebKit 上的擴充支援也沒有實測。
- 桌機 4070 在 2560×1440 打光約讓幀率減半，是接下來效能工作的起點。
- `perf:mobile`、`perf:mem` 與觸控 e2e 從此預設有打光；要和舊數字比的要明寫 `lit=0`。

## 證據

- `engine/renderers/lighting/LightingGate.ts`
- `engine/renderers/lighting/LightingPass.ts`
- `constants/render.ts`
- `docs/adr/0029-webgl-lighting-pass-over-canvas2d.md`
- `docs/plans/lighting-pass.md` §7 F（原本為什麼要自動關）
