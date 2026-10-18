import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 后端 context-path 已经是 /api，所以不用 rewrite，直接转
    proxy: {
      '/api': {
        target: 'http://localhost:8123',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 函数式：只给「真正被 import 到的模块」贴 chunk 标签。
        // 用对象式 manualChunks: { echarts: ['echarts', ...] } 会把 echarts 主入口整个拉进来，按需注册白做
        manualChunks(id) {
          if (/node_modules\/(echarts|echarts-wordcloud|vue-echarts|zrender)\//.test(id)) {
            return 'echarts'
          }
        },
      },
    },
  },
})
