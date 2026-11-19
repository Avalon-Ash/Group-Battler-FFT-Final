import path from 'path';
import { defineConfig } from 'vite';
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

export default defineConfig({
    base: './',
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
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
