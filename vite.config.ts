/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'
import { mockApi } from './mock/mockApi'

// 本地开发：/api 代理到 CFSM Worker（VITE_DEV_PROXY_TARGET），WebSocket 一并代理。
// MOCK=1 时改用演示数据，不需要后端；CFSM_PUBLIC_DIR 指向 CFSM 仓库的 public 目录可显示旗帜与系统图标。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8787'
  const mock = env.MOCK === '1'
  return {
    plugins: [vue(), mock ? mockApi(env.CFSM_PUBLIC_DIR) : basicSsl()],
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
      proxy: mock ? undefined : {
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
