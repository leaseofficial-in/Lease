// scripts/generate-icons.js
// Generates all branded PNG icon assets from the official RentyBase logo-mark.svg.
// Run: node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = path.resolve(__dirname, '..', 'assets');
const LAND   = path.resolve(__dirname, '..', 'landing', 'assets');

// ── Load the official logo mark (includes house + RB text + ochre accents) ───
const logoMarkSvg = fs.readFileSync(path.join(ASSETS, 'logo-mark.svg'));

// Strip explicit width/height so sharp uses viewBox for clean scaling
const svgStr = logoMarkSvg.toString()
  .replace(/\s+width="\d+"/, '')
  .replace(/\s+height="\d+"/, '');
const svgBuf = Buffer.from(svgStr);

// ── Dark background color (matches brand) ─────────────────────────────────────
const BG = { r: 14, g: 20, b: 19, alpha: 1 };

// ── Save helper ───────────────────────────────────────────────────────────────
async function save(filePath, pipeline) {
  const buf = await pipeline.png().toBuffer();
  fs.writeFileSync(filePath, buf);
  // Mirror to landing/assets/ so the landing site (Vercel) can serve them
  const landingDest = path.join(LAND, path.basename(filePath));
  if (fs.existsSync(LAND) && path.extname(filePath) === '.png') {
    fs.writeFileSync(landingDest, buf);
  }
  console.log(`  ✓  ${path.relative(path.resolve(__dirname, '..'), filePath)}`);
}

// ── Icon: resize logo mark to W×W (background already in SVG) ────────────────
async function makeIcon(filePath, size) {
  await save(filePath,
    sharp(svgBuf).resize(size, size, { fit: 'fill' }).png()
  );
}

// ── Adaptive icon: mark (no outer background needed) centered in 1024px canvas
// Android safe zone = inner 66% of 1024 = 680px → use 640px mark
async function makeAdaptiveIcon(filePath) {
  const CANVAS = 1024;
  const MARK   = 640;
  const offset = Math.round((CANVAS - MARK) / 2);

  const markPng = await sharp(svgBuf)
    .resize(MARK, MARK, { fit: 'fill' })
    .png()
    .toBuffer();

  // Compose mark onto a solid dark background canvas
  await save(filePath,
    sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: BG } })
      .composite([{ input: markPng, left: offset, top: offset }])
      .png()
  );
}

// ── Splash icon: mark without outer rounded-rect bg (transparent) ─────────────
// Uses the SVG as-is at 512px — the SVG already has a dark bg
async function makeSplashIcon(filePath) {
  await save(filePath,
    sharp(svgBuf).resize(512, 512, { fit: 'fill' }).png()
  );
}

// ── OG / sharing image — 1200×630 ─────────────────────────────────────────────
async function makeOgImage(filePath) {
  const W = 1200, H = 630;
  const MARK_SIZE = 200;
  const markX = 80;
  const markY = Math.round((H - MARK_SIZE) / 2);

  const markPng = await sharp(svgBuf)
    .resize(MARK_SIZE, MARK_SIZE, { fit: 'fill' })
    .png()
    .toBuffer();

  await save(filePath,
    sharp({ create: { width: W, height: H, channels: 4, background: BG } })
      .composite([{ input: markPng, left: markX, top: markY }])
      .png()
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\nRentyBase icon generator (using official logo-mark.svg)\n');

  // App icons
  await makeIcon(path.join(ASSETS, 'icon.png'), 1024);
  await makeAdaptiveIcon(path.join(ASSETS, 'adaptive-icon.png'));
  await makeIcon(path.join(ASSETS, 'favicon.png'), 64);
  await makeSplashIcon(path.join(ASSETS, 'splash-icon.png'));

  // PWA icons
  for (const size of [48, 72, 96, 128, 144, 152, 192, 384, 512]) {
    await makeIcon(path.join(ASSETS, `icon-${size}.png`), size);
  }

  // Apple touch icon
  await makeIcon(path.join(ASSETS, 'apple-touch-icon.png'), 180);

  // OG / sharing image
  await makeOgImage(path.join(ASSETS, 'og-image.png'));
  if (fs.existsSync(LAND)) {
    await makeOgImage(path.join(LAND, 'og-image.png'));
    console.log('  ↳  mirrored to landing/assets/og-image.png');
  }

  console.log('\nDone — all icons generated from official logo mark.\n');
})();
