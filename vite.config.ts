import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 僅在需要（如 AI Studio 預覽）時以 ALLOW_ALL_HOSTS=true 關閉 host 檢查，避免 DNS rebinding 風險
        ...(env.ALLOW_ALL_HOSTS === 'true' ? { allowedHosts: true as const } : {}),
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
