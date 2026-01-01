import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Polyfill __dirname for ESM
const __dirname = path.resolve();

// Custom plugin to copy PWA assets to dist since they are in root
const copyPwaAssets = () => {
  return {
    name: 'copy-pwa-assets',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const files = ['manifest.json', 'sw.js'];
      
      files.forEach(file => {
        const srcPath = path.resolve(__dirname, file);
        const destPath = path.join(distDir, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied ${file} to dist`);
        }
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    copyPwaAssets()
  ],
  base: '/flow-hiit/', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})