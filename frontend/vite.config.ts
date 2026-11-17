import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_DEV_API_PROXY;

  return {
    plugins: [react(), tailwindcss()],
    server: apiTarget
      ? { proxy: { '/api': { target: apiTarget, changeOrigin: true } } }
      : undefined,
  };
});
