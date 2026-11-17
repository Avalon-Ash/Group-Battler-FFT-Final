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
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        }
    }
});
