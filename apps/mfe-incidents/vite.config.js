import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const PUBLIC_URL = process.env.MFE_PUBLIC_URL || 'http://localhost:3001/';

export default defineConfig({
  base: PUBLIC_URL,
  plugins: [
    react(),
    federation({
      name: 'incidents',
      dts: false,
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.jsx' },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  server: { port: 3001, strictPort: true, cors: true, origin: 'http://localhost:3001', proxy: { '/api': 'http://localhost:4000' } },
  build: { target: 'esnext' },
});