import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // React's scheduler is process-global while jsdom windows are file-scoped.
    // Serial component files so a pending render cannot outlive its window.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
