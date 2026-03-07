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
    // Gebruik relatieve paden voor maximale compatibiliteit (Dock & GitHub Pages)
    base: process.env.NODE_ENV === 'production' ? '/de-schaar-site/' : '/', 
    plugins: [
      react(),
      tailwindcss(),
      athenaEditorPlugin ? athenaEditorPlugin() : null,
      {
        name: 'athena-hmr-suppressor',
        handleHotUpdate({ file, server, modules }) {
          if (file.includes('src/data') && file.endsWith('.json')) {
            // Wis de module referentie uit het geheugen zodat een "harde refresh" van de browser
            // ALTIJD de nieuwste JSON inlaadt, zonder dat we de browser nu Dwingen om te herladen.
            modules.forEach(m => server.moduleGraph.invalidateModule(m));
            return []; // Geef een lege array terug -> Vite snapt: "Ah, doe niks naar de browser!"
          }
        }
      }
    ].filter(Boolean),
    server: {
      host: true,
      port: 6110,
      allowedHosts: true, 
      hmr: {
        host: 'localhost',
        port: 6110
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})
