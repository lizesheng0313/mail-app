import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: '/',  // 使用绝对路径，避免路由刷新问题
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 9996,
    strictPort: true,
    host: true,
    proxy: {
      '/mail-api': {  // 更新代理路径
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
        ws: true,
        // 管理员价格表会等待 AI 完整分析，开发代理不能在后端返回前断开连接。
        timeout: 120000,
        proxyTimeout: 120000
      },
      '/open': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/uploads': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false
      },
      '/image': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 保留路由的动态导入边界。将全部依赖强制合并到 vendor 会使分享页
    // 首屏同时下载图表、工作流画布和富文本编辑器，也会把后台组件提前拉入。
    manifest: true
  }
})
