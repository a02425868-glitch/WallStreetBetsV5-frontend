import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

function optionalGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildTime = new Date().toISOString()

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  define: {
    // Inject Supabase environment variables at build time
    // These MUST be defined as JSON strings so they're available in import.meta.env
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'https://pwuwhmnhlaqfyxpswgtn.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UzV4h0kGINkEEyZu2LS8Ow_Qvnx4Z46'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || ''
    ),
    'import.meta.env.VITE_ADMIN_EMAILS': JSON.stringify(
      process.env.VITE_ADMIN_EMAILS || ''
    ),
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(
      process.env.CF_PAGES_COMMIT_SHA || process.env.VITE_COMMIT_SHA || optionalGitSha()
    ),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(
      process.env.VITE_BUILD_TIME || buildTime
    ),
  },
})
