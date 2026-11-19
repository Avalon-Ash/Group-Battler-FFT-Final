/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

/** 回放檔記下產生它的程式版本（engine/core/Replay.ts 的 BUILD_ID）；拿不到 git 時是 'dev' */
function buildId(): string {
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
    } catch {
        return 'dev';
    }
}

/**
 * 第三方套件分兩包（U2）：react 與 UI 套件各自有穩定的檔名雜湊，部署程式碼時不必重抓。
 * 順序有意義：先判 react，避免 radix 之類內部引用 react 的路徑被吃進 UI 包。
 */
function manualChunks(id: string): string | undefined {
    if (!id.includes('node_modules')) return undefined;
    if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
    if (/node_modules\/(radix-ui|@radix-ui|@floating-ui|@tanstack|lucide-react|aria-hidden|react-remove-scroll[^/]*|react-style-singleton|use-callback-ref|use-sidecar|get-nonce|tslib)\//.test(id)) return 'vendor-ui';
    return undefined;
}

/**
 * 工作階段的工作樹放在 .claude/worktrees/ 底下，每個都是整份專案的副本。相依掃描、檔案監看、測試都不能進去：
 * 否則開發伺服器冷啟動的時間隨工作樹數量增加（6 個時 e2e 第一次開頁就超過 8 秒逾時），測試也會把副本裡的一起跑。
 */
const AGENT_WORKTREES = '.claude/**';

export default defineConfig({
    base: './',
    server: {
        port: 3000,
        host: '0.0.0.0',
        watch: { ignored: [`**/${AGENT_WORKTREES}`] },
    },
    optimizeDeps: { entries: ['index.html'] },
    test: { exclude: [...configDefaults.exclude, AGENT_WORKTREES] },
    plugins: [react()],
    define: {
        __BUILD_ID__: JSON.stringify(buildId()),
    },
    build: {
        rollupOptions: { output: { manualChunks } },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        }
    }
});
