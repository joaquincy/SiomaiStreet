/**
 * generate-responsive-images.js
 * Generates multiple widths for every image in public/images/
 * Output: public/images/responsive/<basename>-<width>w.<ext>
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'public', 'images');
const OUT_DIR = path.join(SRC_DIR, 'responsive');

// Define widths per image (based on actual display sizes in the UI)
const IMAGE_CONFIGS = {
  // Hero — full-viewport background
  'Group 1.png':        [480, 768, 1024, 1440, 1920],
  // Storefront — AboutUs (~820px), Testimonials watermark, CTA (~400px)
  'siomai front.png':   [320, 480, 640, 820],
  // Small siomai — AboutUs (~400px), Marquee (~80px), CTA circle (~200px)
  'siomai 1.png':       [200, 400],
  // Franchise store — SuccessStories bg (full), CTA arch (~400px)
  'franchise-store.png':[400, 640, 876],
  // Menu pork — Marquee only (decorative, ~80px rendered)
  'menu-pork.png':      [200, 400],
  // Logo — Navbar (~48px), Footer (~120px), FAQ (~80px)
  'siomai street logo.png': [100, 200, 400],
  // Menu items (Menu page cards, ~300px)
  'menu-classic.png':   [300, 600],
  'menu-drinks.png':    [300, 600],
  'menu-shrimp.png':    [300, 600],
  // About story
  'about-story.png':    [400, 640, 895],
  // Japanese siomai — Footer reference
  'japanese siomai.png':[400, 800],
  // Journey step images (wc-siomai) — ~500px cards
  'wc-siomai-1.jpg':    [300, 500, 800],
  'wc-siomai-2.jpg':    [300, 500, 800],
  'wc-siomai-3.jpg':    [300, 500, 800],
  'wc-siomai-4.jpg':    [300, 500, 800],
  'wc-siomai-5.jpg':    [300, 500, 800],
  'wc-siomai-6.jpg':    [300, 500, 800],
  'wc-siomai-7.jpg':    [300, 500, 800],
  'wc-siomai-8.jpg':    [300, 500, 800],
  // Hero bg (if used)
  'hero-bg.png':        [480, 768, 1024],
  // Other
  '27980247527.png':    [400, 800],
};

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg'].includes(ext) && !fs.statSync(path.join(SRC_DIR, f)).isDirectory();
  });

  let totalSaved = 0;
  let totalGenerated = 0;

  for (const file of files) {
    const widths = IMAGE_CONFIGS[file];
    if (!widths) {
      console.log(`  SKIP ${file} (no config)`);
      continue;
    }

    const srcPath = path.join(SRC_DIR, file);
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const meta = await sharp(srcPath).metadata();
    const srcSize = fs.statSync(srcPath).size;

    console.log(`\n${file} (${meta.width}x${meta.height}, ${(srcSize / 1024).toFixed(0)}KB)`);

    for (const w of widths) {
      if (w >= meta.width) {
        console.log(`  ${w}w — skipped (>= original ${meta.width}w)`);
        continue;
      }

      const outName = `${base}-${w}w${ext}`;
      const outPath = path.join(OUT_DIR, outName);

      let pipeline = sharp(srcPath).resize(w);

      // For JPGs, set quality; for PNGs, use default compression
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      } else {
        pipeline = pipeline.png({ compressionLevel: 9, effort: 10 });
      }

      await pipeline.toFile(outPath);

      const outSize = fs.statSync(outPath).size;
      const savings = ((1 - outSize / srcSize) * 100).toFixed(1);
      totalSaved += (srcSize - outSize);
      totalGenerated++;

      console.log(`  ${w}w → ${outName} (${(outSize / 1024).toFixed(0)}KB, -${savings}%)`);
    }
  }

  console.log(`\n✅ Generated ${totalGenerated} responsive images`);
  console.log(`💾 Total potential savings: ${(totalSaved / 1024 / 1024).toFixed(1)}MB`);
}

run().catch(console.error);
