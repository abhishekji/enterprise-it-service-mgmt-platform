import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const remote = (name, envKey, fallback) => ({
  type: 'module',
  name,
  entry: `${process.env[envKey] || fallback}/remoteEntry.js`,
});

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      dts: false,
      remotes: {
        incidents: remote('incidents', 'MFE_INCIDENTS_URL', 'http://localhost:3001'),
        requests: remote('requests', 'MFE_REQUESTS_URL', 'http://localhost:3002'),
        assets: remote('assets', 'MFE_ASSETS_URL', 'http://localhost:3003'),
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
  server: { port: 3000, strictPort: true, proxy: { '/api': 'http://localhost:4000' } },
  build: { target: 'esnext' },
});
