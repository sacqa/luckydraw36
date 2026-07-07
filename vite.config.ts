// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// Deploying to Vercel: force Nitro's "vercel" preset instead of the package's
// Cloudflare default (`defaultPreset: "cloudflare-module"`), and force nitro
// to actually run during `vite build` outside of the Lovable sandbox.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  nitro: {
    preset: "vercel",
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
