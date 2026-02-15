import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Get Vercel environment variables at build time
  // Vercel exposes these automatically during build
  const vercelCommit = process.env.VERCEL_GIT_COMMIT_SHA || 
                       process.env.VITE_VERCEL_GIT_COMMIT_SHA || 
                       '';
  const vercelEnv = process.env.VERCEL_ENV || 
                    process.env.VITE_VERCEL_ENV || 
                    mode;
  const vercelUrl = process.env.VERCEL_URL || 
                    process.env.VITE_VERCEL_URL || 
                    '';
  const buildTime = new Date().toISOString();

  // Log for debugging (only in non-production)
  if (mode !== 'production') {
    console.log('🔧 Build info:', {
      commit: vercelCommit || 'not found',
      env: vercelEnv,
      url: vercelUrl || 'not found',
      buildTime
    });
  }

  return {
    define: {
      // Inject build-time variables (these will be replaced at build time)
      __BUILD_TIME__: JSON.stringify(buildTime),
      __VERCEL_COMMIT__: JSON.stringify(vercelCommit),
      __VERCEL_ENV__: JSON.stringify(vercelEnv),
      __VERCEL_URL__: JSON.stringify(vercelUrl),
    },
    build: {
      sourcemap: true,
    },
    plugins: [
    react(),
    // Only run Sentry source map upload when auth token is set (avoids build failure on Vercel)
    ...(process.env.SENTRY_AUTH_TOKEN ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifestFilename: 'manifest.json',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        sourcemap: true,
        mode: 'production',
        // Allow precaching assets larger than Workbox default 2 MiB (main JS bundle can exceed it)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^http:\/\/localhost:3001\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              networkTimeoutSeconds: 10,
              plugins: [{
                cacheWillUpdate: async ({ response, request }) => {
                  // Never cache auth endpoints — stale auth responses cause session issues
                  if (request.url.includes('/api/auth/')) return null;
                  return response;
                }
              }]
            }
          }
        ]
      },
      manifest: {
        name: 'Kaiylo Fitness Platform',
        short_name: 'Kaiylo',
        description: 'Professional fitness coaching platform for athletes and coaches',
        theme_color: '#e87c3e',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Allow network access
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
    // Expose Vercel environment variables to client
    envPrefix: ['VITE_', 'VERCEL_']
  };
})