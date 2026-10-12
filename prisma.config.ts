import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Neon pooled connection string (used by the app at runtime - get from Neon console: 'Connection string' with Connection Pooling enabled)
    url: env("DATABASE_URL"),
    // Neon direct (non-pooled) connection string (used by Prisma migrations - get from Neon console: 'Connection string' with Direct connection selected)
    directUrl: env("DIRECT_URL"),
  },
});
