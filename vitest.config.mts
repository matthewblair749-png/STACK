import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests never touch a real database or provider: anything external is mocked per test.
    env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test", ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") },
  },
});
