import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Dashboard → Project settings, or set TRIGGER_PROJECT_REF in .env.local
  project:
    process.env.TRIGGER_PROJECT_REF ?? "proj_REPLACE_WITH_YOUR_PROJECT_REF",
    runtime: "node",
  dirs: ["trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
  build: {
    extensions: [],
  },
});
