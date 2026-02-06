import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        manoir: resolve(__dirname, 'manoir.html'),
        moulin: resolve(__dirname, 'moulin.html'),
        tisserand: resolve(__dirname, 'Tisserand.html'),
        association: resolve(__dirname, 'association.html'),
      },
    },
  },
})
