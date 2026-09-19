import fs from "node:fs";
import path from "node:path";
import app from "./app";
import { logger } from "./lib/logger";

// Try loading .env from current directory or workspace root
for (const envPath of [".env", "../../.env", "../.env"]) {
  const resolved = path.resolve(process.cwd(), envPath);
  if (fs.existsSync(resolved)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(resolved);
      }
      break;
    } catch {}
  }
}

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  logger.info({ port }, "Server listening");
});
