# 0032 打光的幾何遮罩由 WebGL 直接畫

狀態：採用
日期：2026-11-28

## 背景

0029 決定世界由 Canvas 2D 畫、上面加一個 WebGL2「全螢幕」打光通道；通道要的每像素類別（直立物離腳底的高度、是不是單位、橫向位置）由 `LightingPass.tag` 用 Canvas 2D 把單位剪影與障礙物再畫一次進半解析度的暫存畫布、蓋漸層章、整幀貼進幾何遮罩，再整張上傳成貼圖。
`npm run perf:lit-cost` 量到打光的額外成本約 3.1 ms（RTX 4070、2560×1440），幾乎都花在這類 Canvas 2D 重畫與上傳；現有架構下畫面等價的小優化都在雜訊內（`docs/plans/lighting-cost.md` §4.2）。
使用者 2026-11-28 要「現代化」、精靈由顯示卡畫，並授權主代理在新做法和舊 ADR 衝突時直接決定；同日：「舊的管線真的沒用了可以拔掉，不需要併行」。

## 決定

- 部分修訂 0029「決定」第二條（世界仍由 Canvas 2D 畫出，另加一個 WebGL2 全螢幕通道）：打光通道不再只是全螢幕的處理，它自己用 instanced quad 畫直立物的幾何遮罩。世界的顏色仍由 Canvas 2D 畫；0029 其餘各條（只用瀏覽器 WebGL2 API、WebGL 只在 `engine/renderers/lighting/`、參數只在 `constants/lighting.ts`、打光關閉時走 Canvas 2D 直接路徑）不變。
- 幾何遮罩只有 GL 一條路（`engine/renderers/lighting/GeoMaskGpu.ts`），不保留 Canvas 2D 暫存畫布的舊路徑，也沒有切換旗標。打光關閉（`?lit=0`、WebGL2 拿不到、context 遺失期間）時沒有幾何遮罩，畫面走原本的 Canvas 2D 直接路徑，和以前一樣。
- 「這個 painter 貼哪張圖、哪一塊、貼在哪、怎麼轉、多透明」只有一個出處：painter 貼精靈時經 `engine/renderers/SpriteCapture.ts` 的 `blit`；打光通道在擷取畫布上跑一次同一個 painter（單位 `UnitRenderSystem.drawSilhouette`、障礙物 `RenderDispatcher.dispatch`）取得這些參數，不在打光目錄裡重算。
- 章的定義（r＝離腳底的高度 ÷ `GEO.MAX_HEIGHT`、g＝是不是單位、b＝橫向位置、a＝覆蓋率）與章的世界矩形規則不變，改由片段著色器解析計算。
- 精靈圖集第一次用到時上傳成只有 alpha 的貼圖，之後不再上傳；疊合順序＝繪製順序。

## 放棄的做法

- 新舊兩條路用網址旗標並存：比對期間用過（`?geogpu=1`），比對通過後刪掉；使用者明確說不需要併行。
- 先把世界本體（地塊、單位、零件）整個搬到 GL：要另一組保真基準與座標協議的改寫，第一片先做不影響世界顏色的幾何遮罩，當之後法線圖與其他遮罩的地基。
- 打光目錄自己重算單位剪影的影格、mip、目的矩形與變換：同一個判斷會有兩份（`SpriteUnitRenderer`、`PolymorphPainter`、`UnitBodyPainter` 一份，打光一份），違反「不新增耦合」。
- 把 0029 整份標成已取代：0029 其他各條沒有變，十幾個檔頭指向它。
- 圖集上傳成 RGBA：量測場景 22 張圖集 54.0 MB；只存 alpha 是 13.5 MB，幾何遮罩只用形狀。

## 後果

- 新舊同一幀的幾何遮罩逐像素比：內部 alpha 與 g 0 差、r／b 最多差 2（64 格漸層章的量化），差異只在直立物邊緣（`docs/plans/gpu-geo-mask.md` §6）。打光的最終畫面和舊路徑的差只在單位與障礙物邊緣。
- 顯示卡上多一份圖集的 alpha 貼圖（量測場景 13.5 MB）；第一次用到某張圖集的那一幀要上傳它。手機（WebKit）的 `gl.ALPHA` 上傳與 instanced 繪製沒有實測。
- 特效遮罩與玩法標示遮罩（含直立物在上面挖洞）仍由 Canvas 2D 畫，是下一片。
- 之後要接法線圖（單位真的受光面）時，只是同一個 instance 多取樣一張圖。

## 證據

- `docs/plans/gpu-geo-mask.md`
- `docs/plans/lighting-cost.md` §3、§4.2
- `engine/renderers/SpriteCapture.ts`
- `engine/renderers/lighting/GeoMaskGpu.ts`
- `engine/renderers/lighting/shaders.ts`
- `engine/renderers/lighting/LightingPass.ts`
- `tests/SpriteCapture.test.ts`
- `docs/adr/0029-webgl-lighting-pass-over-canvas2d.md`
