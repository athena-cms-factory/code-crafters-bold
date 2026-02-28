import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
  const isDev = command === 'serve';
  let athenaEditorPlugin = null;

  // De editor plugin is alleen nodig (en beschikbaar) tijdens lokale development
  if (isDev) {
    const pluginPath = path.resolve(__dirname, '../../factory/5-engine/lib/vite-plugin-athena-editor.js');
    if (fs.existsSync(pluginPath)) {
      try {
        // Gebruik een variabele voor de import om statische analyse door esbuild in CI te voorkomen
        const pluginModule = await import(`file://${pluginPath}`);
        athenaEditorPlugin = pluginModule.default;
      } catch (e) {
        console.warn('⚠️ Athena Editor plugin kon niet worden geladen:', e.message);
      }
    }
  }

  return {
    // Gebruik de projectnaam als base in dev mode voor dashboard compatibiliteit
    base: isDev ? `/${path.basename(__dirname)}/` : `/${path.basename(__dirname)}/`,
    plugins: [
      react(),
      tailwindcss(),
      athenaEditorPlugin ? athenaEditorPlugin() : null
    ].filter(Boolean),
    server: {
      host: true,
      port: 5535,
      watch: {
        // src/data wordt niet genegeerd voor HMR
      }
    },
  build: {
  outDir: 'dist',
  emptyOutDir: true
}
  }
})