// Polyfill DOM globals needed by pdfjs-dist in headless Node environments
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    transformPoint(p: any) { return p; }
  };
}
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w = 0, h = 0) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

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
