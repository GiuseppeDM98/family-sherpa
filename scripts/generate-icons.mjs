// One-off generator for placeholder PWA icons. Run with `node scripts/generate-icons.mjs`.
// Pixel-perfect branding is out of scope for spec 01 — these just need to be valid PNGs.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BG = "#0f172a";
const OUT_DIR = path.join(process.cwd(), "public", "icons");

function iconSvg(size, { maskable = false } = {}) {
  const padding = maskable ? size * 0.2 : 0;
  const fontSize = size - padding * 2;
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG}" />
      <text
        x="50%"
        y="50%"
        font-size="${fontSize}"
        text-anchor="middle"
        dominant-baseline="central"
      >⛰</text>
    </svg>
  `;
}

async function generate(name, size, options) {
  const svg = Buffer.from(iconSvg(size, options));
  await sharp(svg).resize(size, size).png().toFile(path.join(OUT_DIR, name));
}

await mkdir(OUT_DIR, { recursive: true });
await generate("icon-192.png", 192);
await generate("icon-512.png", 512);
await generate("icon-maskable-512.png", 512, { maskable: true });

console.log("Generated PWA icons in public/icons/");
