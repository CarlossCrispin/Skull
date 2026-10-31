import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { preloadScene } from './scripts/preloadScenePlugin.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadScene()],
});
