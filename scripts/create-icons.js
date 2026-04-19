#!/usr/bin/env node

/**
 * Generates all PWA icon sizes from an inline pixel-art SVG.
 * Requires: npm install -D sharp
 */

const path = require("path");
const fs = require("fs");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

// Inline pixel art tavern mug SVG (32×32 pixel grid, scaled to 512)
const SVG_SRC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <!-- Background -->
  <rect width="32" height="32" fill="#1a1510"/>

  <!-- Mug body (amber/dark) -->
  <rect x="6" y="10" width="16" height="16" fill="#8b5a2b"/>
  <!-- Mug body highlight -->
  <rect x="6" y="10" width="16" height="2"  fill="#c49a3c"/>
  <!-- Mug inner shadow -->
  <rect x="20" y="12" width="2"  height="14" fill="#5c3a1a"/>
  <rect x="6"  y="24" width="16" height="2"  fill="#5c3a1a"/>

  <!-- Mug handle -->
  <rect x="22" y="13" width="4" height="2"  fill="#8b5a2b"/>
  <rect x="24" y="15" width="2" height="6"  fill="#8b5a2b"/>
  <rect x="22" y="21" width="4" height="2"  fill="#8b5a2b"/>

  <!-- Beer foam (spilling over top) -->
  <rect x="5"  y="8"  width="3" height="3"  fill="#f5d76e"/>
  <rect x="8"  y="7"  width="4" height="4"  fill="#f5d76e"/>
  <rect x="12" y="6"  width="4" height="4"  fill="#f5d76e"/>
  <rect x="16" y="7"  width="4" height="4"  fill="#f5d76e"/>
  <rect x="19" y="8"  width="3" height="3"  fill="#f5d76e"/>
  <!-- Foam shadow -->
  <rect x="5"  y="10" width="2" height="1"  fill="#c4a85a"/>
  <rect x="20" y="10" width="2" height="1"  fill="#c4a85a"/>

  <!-- Beer liquid colour (golden stripe) -->
  <rect x="7"  y="13" width="12" height="9"  fill="#e8b864"/>
  <!-- Bubbles -->
  <rect x="9"  y="17" width="2" height="2"  fill="#f5d76e"/>
  <rect x="14" y="15" width="2" height="2"  fill="#f5d76e"/>
  <rect x="16" y="19" width="1" height="1"  fill="#f5d76e"/>

  <!-- Pixel border (outer glow) -->
  <rect x="4"  y="9"  width="1" height="17" fill="#c49a3c"/>
  <rect x="22" y="9"  width="1" height="17" fill="#c49a3c"/>
  <rect x="5"  y="26" width="17" height="1" fill="#c49a3c"/>

  <!-- Stars top-left -->
  <rect x="2" y="2" width="2" height="2" fill="#e8b864"/>
  <rect x="5" y="4" width="1" height="1" fill="#c49a3c"/>

  <!-- Stars top-right -->
  <rect x="27" y="3" width="2" height="2" fill="#e8b864"/>
  <rect x="25" y="5" width="1" height="1" fill="#c49a3c"/>

  <!-- "TARVN" text pixels (tiny 3x5 runes at bottom) -->
  <rect x="4"  y="29" width="2" height="2" fill="#e8b864"/>
  <rect x="8"  y="29" width="2" height="2" fill="#e8b864"/>
  <rect x="12" y="29" width="2" height="2" fill="#e8b864"/>
  <rect x="16" y="29" width="2" height="2" fill="#e8b864"/>
  <rect x="20" y="29" width="2" height="2" fill="#e8b864"/>
</svg>`;

const SIZES = [
  { size: 72,  name: "icon-72x72.png" },
  { size: 96,  name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
  // Apple touch icons
  { size: 120, name: "apple-touch-icon-120x120.png" },
  { size: 152, name: "apple-touch-icon-152x152.png" },
  { size: 167, name: "apple-touch-icon-167x167.png" },
  { size: 180, name: "apple-touch-icon.png" },
  // Favicon
  { size: 32,  name: "favicon-32x32.png" },
  { size: 16,  name: "favicon-16x16.png" },
];

async function run() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("sharp not found. Install it first:");
    console.error("  npm install -D sharp");
    process.exit(1);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const svgBuffer = Buffer.from(SVG_SRC);

  for (const { size, name } of SIZES) {
    const outPath = path.join(ICONS_DIR, name);
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: { r: 26, g: 21, b: 16, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Also copy favicon-32x32 as favicon.ico equivalent (browsers fallback)
  const faviconSrc = path.join(ICONS_DIR, "favicon-32x32.png");
  const faviconDst = path.join(__dirname, "..", "public", "favicon.png");
  fs.copyFileSync(faviconSrc, faviconDst);
  console.log("✓ favicon.png");

  console.log(`\nAll ${SIZES.length + 1} icons generated in public/icons/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
