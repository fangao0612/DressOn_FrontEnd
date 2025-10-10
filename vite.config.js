import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // 定义环境变量前缀，允许 VITE_ 开头的变量被注入
  envPrefix: 'VITE_',
});


