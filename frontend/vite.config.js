import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true binds the dev server to 0.0.0.0 so it's reachable
// from other devices (e.g. a phone) on the same local network.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
