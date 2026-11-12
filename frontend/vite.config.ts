import {defineConfig, loadEnv} from 'vite';
import viteReact from '@vitejs/plugin-react';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import {resolve} from 'path';

export default defineConfig(({mode}) => {
  // Without it the panel would call whatever address the browser guesses; stop here instead
  if (!loadEnv(mode, __dirname, 'VITE_').VITE_SERVER_URL?.trim()) {
    throw new Error(
      'VITE_SERVER_URL is not set: put the backend API address (e.g. https://api.example.com/api/v1) in frontend/.env or the build environment',
    );
  }
  return {
    plugins: [TanStackRouterVite(), viteReact()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
  };
});
