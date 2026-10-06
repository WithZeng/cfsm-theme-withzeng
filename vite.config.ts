/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'

// 本地开发：/api 代理到 CFSM Worker（VITE_DEV_PROXY_TARGET），WebSocket 一并代理。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8787'
  return {
    plugins: [vue(), basicSsl()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true, secure: false, ws: true },
        '/flags': { target, changeOrigin: true, secure: false },
        '/os-icons': { target, changeOrigin: true, secure: false }
      }
    },
    test: {
      environment: 'node',
      include: ['test/**/*.test.ts']
    }
  }
})
