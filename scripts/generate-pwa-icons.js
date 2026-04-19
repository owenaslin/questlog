#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from a source image.
 * Requires ImageMagick or sharp npm package.
 * 
 * Usage:
 *   node scripts/generate-pwa-icons.js <source-image>
 * 
 * Example:
 *   node scripts/generate-pwa-icons.js public/tavern/tavern-logo.png
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// PWA icon sizes
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Apple touch icon sizes
const APPLE_ICON_SIZES = [
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Default 180x180
];

async function generateIcons(sourcePath) {
  console.log('Generating PWA icons...');
  
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Check if sharp is available
  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.log('Note: sharp not installed. Install with: npm install -D sharp');
    console.log('Creating placeholder instructions instead...\n');
    createInstructions(sourcePath);
    return;
  }

  const sourceImage = sharp(sourcePath);
  
  // Generate PWA icons
  for (const { size, name } of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, name);
    await sourceImage
      .resize(size, size, { fit: 'contain', background: { r: 26, g: 21, b: 16 } })
      .toFile(outputPath);
    console.log(`✓ Created ${name} (${size}x${size})`);
  }

  // Generate Apple touch icons
  for (const { size, name } of APPLE_ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, name);
    await sourceImage
      .resize(size, size, { fit: 'contain', background: { r: 26, g: 21, b: 16 } })
      .toFile(outputPath);
    console.log(`✓ Created ${name} (${size}x${size})`);
  }

  console.log('\nAll icons generated successfully!');
  console.log(`Icons location: ${ICONS_DIR}`);
}

function createInstructions(sourcePath) {
  const instructions = `
# PWA Icon Generation Instructions

Since sharp is not installed, please manually create the following icons:

## Required Icon Sizes

### PWA Icons (in public/icons/)
- icon-72x72.png (72x72)
- icon-96x96.png (96x96)
- icon-128x128.png (128x128)
- icon-144x144.png (144x144)
- icon-152x152.png (152x152)
- icon-192x192.png (192x192) - Required for PWA install
- icon-384x384.png (384x384)
- icon-512x512.png (512x512) - Required for PWA install

### Apple Touch Icons (in public/icons/)
- apple-touch-icon-120x120.png (120x120)
- apple-touch-icon-152x152.png (152x152)
- apple-touch-icon-167x167.png (167x167)
- apple-touch-icon.png (180x180)

## Design Guidelines

1. Use your tavern logo or a 🍺 mug icon
2. Background color: #1a1510 (tavern dark)
3. Icon should be centered with padding
4. Keep pixel art style consistent with app

## Alternative: Use an Online Generator

1. Go to https://pwa-asset-generator.nicepkg.cn/
2. Upload your source image
3. Download the generated icons
4. Place them in public/icons/

## Install Sharp for Automated Generation

npm install -D sharp
node scripts/generate-pwa-icons.js ${sourcePath || 'public/tavern/logo.png'}
`;

  const instructionsPath = path.join(__dirname, '..', 'PWA_ICONS_INSTRUCTIONS.md');
  fs.writeFileSync(instructionsPath, instructions);
  console.log(instructions);
  console.log(`\nInstructions also saved to: ${instructionsPath}`);
}

// Run if called directly
if (require.main === module) {
  const sourcePath = process.argv[2];
  
  if (!sourcePath) {
    console.log('Usage: node scripts/generate-pwa-icons.js <source-image>');
    console.log('Example: node scripts/generate-pwa-icons.js public/tavern/logo.png');
    createInstructions(null);
    process.exit(1);
  }

  const fullPath = path.resolve(sourcePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Source image not found: ${fullPath}`);
    process.exit(1);
  }

  generateIcons(fullPath).catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
  });
}

module.exports = { generateIcons, ICON_SIZES, APPLE_ICON_SIZES };
