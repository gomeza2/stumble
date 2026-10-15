import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This repository is published under https://gomeza2.github.io/stumble/
  base: '/stumble/',
  plugins: [react()],
});
