import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin";

async function main() {
  await connectDB();
  await ensureSuperAdmin();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
