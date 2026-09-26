import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // VITE_API_URL ใช้ตอน production (Vercel) — dev ใช้ proxy ข้างล่างแทน
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_BOT_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
