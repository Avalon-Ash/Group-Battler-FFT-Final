# 0014 UI 採用現成基礎元件庫

狀態：採用
日期：2026-11-04

## 背景

UI 全面改版須淘汰原本的原生 `<select>` 與 emoji 圖示，並提供下拉選單、彈層、無障礙鍵盤互動、圖示系統、長列表虛擬捲動與樣式變體管理。

## 決定

- 基礎元件採用現成套件組合：Radix（下拉與彈出層等）、lucide（圖示）、TanStack Virtual（長列表）與 cva（樣式變體），封裝於 `components/ui/primitives/` 供整個 UI 使用，不自行重造這些基礎元件。

## 放棄的做法

- 自行編寫下拉選單、彈出定位、虛擬捲動列表與圖示集。
- 保留原生 `<select>` 與 emoji 作為控制項與圖示。

## 後果

- 原生 `<select>` 在 UI 中歸零，UI 套件合計約 130 kB minified（UI 改版合併後整體 JS gzip 約 353 KB 至 400 KB）。
- 後續 U2 透過 `vite.config.ts` 的 `manualChunks` 將 `vendor-ui`（52.5 kB gzip）與進入點切開並以 `React.lazy` 延遲載入工具視窗，同時由 `tools/check-bundle-budget.mjs` 於 `build` 後檢查首次載入體積預算。

## 證據

- `docs/DECISIONS.md`「UI」
- `package.json`、`tools/check-bundle-budget.mjs`
- `docs/plans/optimization-2026-11.md` §0、§4 U2
- `docs/WORKLOG.md` §2 BP、§2 CF
