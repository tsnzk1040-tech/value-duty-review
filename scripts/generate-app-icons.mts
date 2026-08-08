import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { appIconRasterSvg } from "../src/components/brand/app-icon-svg.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "src", "app");
const publicOptions = join(root, "public", "icon-options");

async function writePng(path: string, size: number) {
  const svg = appIconRasterSvg(size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(path, buf);
  console.log(`wrote ${path} (${buf.length} bytes, ${size}x${size})`);
  return buf;
}

const icon512 = await writePng(join(appDir, "icon.png"), 512);
await writePng(join(appDir, "apple-icon.png"), 180);
await writePng(join(publicOptions, "static-now.png"), 512);

// Browsers accept PNG bytes in favicon.ico for many cases; keep simple 48px.
const favicon = await sharp(icon512).resize(48, 48).png().toBuffer();
writeFileSync(join(appDir, "favicon.ico"), favicon);
console.log(`wrote favicon.ico (${favicon.length} bytes)`);
