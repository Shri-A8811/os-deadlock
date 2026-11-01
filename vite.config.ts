import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xyflow')) return 'graph'
          if (id.includes('recharts') || /node_modules[/\\](d3-|victory-vendor)/.test(id)) return 'charts'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
