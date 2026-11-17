import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In the production build, a Content Security Policy blocks the page from
// sending data to any other server. This makes "nothing leaves your device"
// something the browser enforces, not just a promise.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const contentSecurityPolicy = (): Plugin => ({
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  // Relative paths, so the build works from any folder (e.g. GitHub Pages at /kharcha/).
  // Pages use #/ routes, so no server-side routing is needed.
  base: "./",
  // The charts library is the bulk of the bundle.
  build: { chunkSizeWarningLimit: 900 },
});
