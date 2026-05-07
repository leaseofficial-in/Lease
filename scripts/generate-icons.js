// scripts/generate-icons.js
// Generates all branded PNG icon assets from the RentyBase design system mark.
// Run: node scripts/generate-icons.js

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// ── Brand colors ──────────────────────────────────────────────────────────────
const BG    = [14, 20, 19];     // #0E1413  dark canvas
const CREAM = [246, 244, 238];  // #F6F4EE  house body
const OCHRE = [201, 122, 58];   // #C97A3A  accent

// ── Pixel helpers ─────────────────────────────────────────────────────────────

function setpx(buf, W, x, y, rgb, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const i = (y * W + x) * 4;
  buf[i] = rgb[0]; buf[i+1] = rgb[1]; buf[i+2] = rgb[2]; buf[i+3] = a;
}

function fillRect(buf, W, x1, y1, x2, y2, rgb, a = 255) {
  for (let y = Math.max(0, ~~y1); y <= Math.min(W - 1, ~~y2); y++)
    for (let x = Math.max(0, ~~x1); x <= Math.min(W - 1, ~~x2); x++)
      setpx(buf, W, x, y, rgb, a);
}

function fillCircle(buf, W, cx, cy, r, rgb, a = 255) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        setpx(buf, W, x, y, rgb, a);
}

// Scanline polygon fill
function fillPolygon(buf, W, pts, rgb, a = 255) {
  const ys = pts.map(p => p[1]);
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(W - 1, Math.ceil(Math.max(...ys)));
  const n = pts.length;
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i += 2)
      for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++)
        setpx(buf, W, x, y, rgb, a);
  }
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
// Design space is 200×200. All coordinates scale linearly to W×W.

function makeIcon(W, { withBg = true, padding = 0 } = {}) {
  const png = new PNG({ width: W, height: W, colorType: 6 });
  png.data.fill(0);

  const pad = padding; // extra padding inside W
  const inner = W - pad * 2;
  const s = v => pad + (v / 200) * inner; // scale from 200-unit space

  // ── Rounded rect background ──────────────────────────────────────────────
  if (withBg) {
    const R = s(40) - pad; // corner radius, scaled
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        let inside = true;
        const [lx, rx, ty, by] = [pad, W - pad - 1, pad, W - pad - 1];
        if (x < lx + R && y < ty + R)
          inside = (x - lx - R) ** 2 + (y - ty - R) ** 2 <= R * R;
        else if (x > rx - R && y < ty + R)
          inside = (x - rx + R) ** 2 + (y - ty - R) ** 2 <= R * R;
        else if (x < lx + R && y > by - R)
          inside = (x - lx - R) ** 2 + (y - by + R) ** 2 <= R * R;
        else if (x > rx - R && y > by - R)
          inside = (x - rx + R) ** 2 + (y - by + R) ** 2 <= R * R;
        else
          inside = x >= lx && x <= rx && y >= ty && y <= by;
        if (inside) setpx(png.data, W, x, y, BG);
      }
    }
  }

  // ── House pentagon ────────────────────────────────────────────────────────
  // Original: M100 22 L176 88 V162 a14 14 0 0 1 -14 14 H38 a14 14 0 0 1 -14 -14 V88 Z
  // Simplified arcs to straight lines (imperceptible at icon sizes)
  fillPolygon(png.data, W, [
    [s(100), s(22)],
    [s(176), s(88)],
    [s(176), s(170)],
    [s(38),  s(170)],
    [s(24),  s(88)],
  ], CREAM);

  // ── Door arch cutout ──────────────────────────────────────────────────────
  // Original: M62 178 V128 a38 38 0 0 1 76 0 V178 Z
  // Arch: semicircle top (center 100,128 r=38) + rectangle below
  const dCX = s(100), dCY = s(128), dR = s(38);
  const dL = s(62), dR2 = s(138), dBot = s(178);
  for (let y = Math.max(0, ~~(dCY - dR)); y <= Math.min(W - 1, ~~dBot); y++) {
    for (let x = Math.max(0, ~~dL); x <= Math.min(W - 1, ~~dR2); x++) {
      const inArc  = (x - dCX) ** 2 + (y - dCY) ** 2 <= dR * dR && y <= dCY;
      const inRect = y > dCY && y <= dBot;
      if (inArc || inRect) {
        if (withBg) setpx(png.data, W, x, y, BG);
        else        setpx(png.data, W, x, y, BG, 0); // transparent cutout
      }
    }
  }

  // ── Ochre dot at roof peak ────────────────────────────────────────────────
  fillCircle(png.data, W, s(100), s(46), Math.max(1.5, s(3.2)), OCHRE);

  // ── Ochre accent bar ──────────────────────────────────────────────────────
  fillRect(png.data, W, s(60), s(172), s(140), s(178), OCHRE);

  return png;
}

// ── Adaptive icon — mark centered with safe-zone padding ──────────────────────
// Android safe zone = inner 66% of 1024px → 678px. Use 640px mark centred.
function makeAdaptiveIcon(W) {
  const MARK = 640;
  const mark = makeIcon(MARK, { withBg: false });

  const full = new PNG({ width: W, height: W, colorType: 6 });
  full.data.fill(0);

  const off = Math.round((W - MARK) / 2);
  for (let y = 0; y < MARK; y++)
    for (let x = 0; x < MARK; x++) {
      const si = (y * MARK + x) * 4;
      const di = ((y + off) * W + (x + off)) * 4;
      full.data.set(mark.data.slice(si, si + 4), di);
    }
  return full;
}

// ── OG / sharing image — 1200×630 ─────────────────────────────────────────────
function makeOgImage() {
  const W = 1200, H = 630;
  const png = new PNG({ width: W, height: H, colorType: 6 });
  png.data.fill(0);

  // Dark bg
  for (let i = 0; i < W * H; i++) {
    const idx = i * 4;
    png.data[idx] = BG[0]; png.data[idx+1] = BG[1];
    png.data[idx+2] = BG[2]; png.data[idx+3] = 255;
  }

  // Subtle ochre glow top-right quadrant
  const glowCX = Math.round(W * 0.82), glowCY = Math.round(H * 0.18), glowR = 260;
  for (let y = Math.max(0, glowCY - glowR); y < Math.min(H, glowCY + glowR); y++) {
    for (let x = Math.max(0, glowCX - glowR); x < Math.min(W, glowCX + glowR); x++) {
      const dist = Math.sqrt((x - glowCX) ** 2 + (y - glowCY) ** 2);
      if (dist < glowR) {
        const alpha = Math.round(22 * (1 - dist / glowR));
        const idx = (y * W + x) * 4;
        png.data[idx]   = Math.min(255, png.data[idx]   + OCHRE[0] * alpha / 255);
        png.data[idx+1] = Math.min(255, png.data[idx+1] + OCHRE[1] * alpha / 255);
        png.data[idx+2] = Math.min(255, png.data[idx+2] + OCHRE[2] * alpha / 255);
      }
    }
  }

  // Logo mark (200px) centred vertically, left-aligned at x=80
  const markSize = 200;
  const mark = makeIcon(markSize, { withBg: true });
  const mX = 80, mY = Math.round((H - markSize) / 2);
  for (let y = 0; y < markSize; y++)
    for (let x = 0; x < markSize; x++) {
      const si = (y * markSize + x) * 4;
      const a  = mark.data[si + 3];
      if (a === 0) continue;
      const di = ((mY + y) * W + (mX + x)) * 4;
      png.data[di]   = mark.data[si];
      png.data[di+1] = mark.data[si+1];
      png.data[di+2] = mark.data[si+2];
      png.data[di+3] = 255;
    }

  // Separator line
  const sepX = mX + markSize + 36;
  for (let y = H * 0.25; y < H * 0.75; y++) {
    const idx = (~~y * W + sepX) * 4;
    png.data[idx] = 60; png.data[idx+1] = 70; png.data[idx+2] = 65; png.data[idx+3] = 180;
  }

  // Tagline text area — draw a simple "RentyBase" lettering as block pixels
  // (no canvas — we draw a bold rasterised label using filled rects for each letter segment)
  // Instead, we draw a cream accent strip to hint at the wordmark position
  const tX = sepX + 36, tY = Math.round(H / 2) - 8;
  fillRect(png.data, W, tX, tY - 60, tX + 340, tY - 44, CREAM, 255);  // headline bar
  fillRect(png.data, W, tX, tY - 8,  tX + 220, tY,      CREAM, 100);  // sub bar
  fillRect(png.data, W, tX, tY + 28, tX + 80,  tY + 34, OCHRE, 220);  // accent line

  return { png, W, H };
}

// ── Write helpers ─────────────────────────────────────────────────────────────

const ASSETS = path.resolve(__dirname, '..', 'assets');
const LAND   = path.resolve(__dirname, '..', 'landing', 'assets');

function save(filePath, png) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log(`  ✓  ${path.relative(path.resolve(__dirname, '..'), filePath)}`);
}

// ── Generate ──────────────────────────────────────────────────────────────────

console.log('\nRentyBase icon generator\n');

// App icons
save(path.join(ASSETS, 'icon.png'),          makeIcon(1024, { withBg: true }));
save(path.join(ASSETS, 'adaptive-icon.png'), makeAdaptiveIcon(1024));
save(path.join(ASSETS, 'favicon.png'),       makeIcon(64,   { withBg: true }));
save(path.join(ASSETS, 'splash-icon.png'),   makeIcon(512,  { withBg: false }));

// PWA icons (separate sizes for web manifest)
save(path.join(ASSETS, 'icon-48.png'),   makeIcon(48,   { withBg: true }));
save(path.join(ASSETS, 'icon-72.png'),   makeIcon(72,   { withBg: true }));
save(path.join(ASSETS, 'icon-96.png'),   makeIcon(96,   { withBg: true }));
save(path.join(ASSETS, 'icon-128.png'),  makeIcon(128,  { withBg: true }));
save(path.join(ASSETS, 'icon-144.png'),  makeIcon(144,  { withBg: true }));
save(path.join(ASSETS, 'icon-152.png'),  makeIcon(152,  { withBg: true }));
save(path.join(ASSETS, 'icon-192.png'),  makeIcon(192,  { withBg: true }));
save(path.join(ASSETS, 'icon-384.png'),  makeIcon(384,  { withBg: true }));
save(path.join(ASSETS, 'icon-512.png'),  makeIcon(512,  { withBg: true }));

// Apple touch icon (180px, no transparency)
save(path.join(ASSETS, 'apple-touch-icon.png'), makeIcon(180, { withBg: true }));

// OG / sharing image
const { png: ogPng } = makeOgImage();
save(path.join(ASSETS, 'og-image.png'), ogPng);

// Mirror OG image to landing/assets if folder exists
if (fs.existsSync(LAND)) {
  save(path.join(LAND, 'og-image.png'), ogPng);
  console.log('  ↳  mirrored to landing/assets/og-image.png');
}

console.log('\nDone — all icons generated.\n');
