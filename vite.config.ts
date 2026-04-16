import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    strictPort: false,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    
    // Aggressive code splitting
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks(id) {
          // Core React + Router (loaded on every page)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-router')) {
            return 'react-core';
          }
          
          // Mapbox - separate huge chunk (only loaded when needed)
          if (id.includes('node_modules/mapbox-gl') || id.includes('node_modules/react-map-gl')) {
            return 'mapbox';
          }
          
          // UI Components (Radix)
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui-vendor';
          }
          
          // Date handling
          if (id.includes('node_modules/date-fns')) {
            return 'date-utils';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          
          // Query client
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'query';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
        },
        
        // Optimize entry chunk
        entryFileNames: 'assets/[name]-[hash].js',
        
        // Split chunks optimally
        chunkFileNames: (chunkInfo) => {
          const info = chunkInfo;
          // Keep manual chunks with clean names
          if (info.name === 'react-core' || info.name === 'mapbox' || 
              info.name === 'ui-vendor' || info.name === 'icons') {
            return `assets/${info.name}-[hash].js`;
          }
          return 'assets/[name]-[hash].js';
        },
        
        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const info = assetInfo;
          if (info.name?.endsWith('.css')) {
            return 'assets/styles/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Build performance
    target: 'es2020',
    cssTarget: 'chrome61',
    
    // Optimize deps
    sourcemap: mode === 'development',
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'mapbox-gl',
      'date-fns',
      'lucide-react',
    ],
    exclude: [],
  },
  
  // Preload critical assets
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // Preload hints for critical resources
      if (hostType === 'js') {
        return { relative: true };
      }
      return { relative: true };
    },
  },
}));
