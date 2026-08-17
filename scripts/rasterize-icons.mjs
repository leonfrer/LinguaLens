import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Runtime icons come from the rounded preview artwork, not the square source canvas.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceSvg = join(root, 'design/lingualens-icon/lingualens-icon.preview.svg');
const iconsDir = join(root, 'public/icons');
const masterPng = join(mkdtempSync(join(tmpdir(), 'lingualens-icons-')), 'master.png');
const masterSize = 1024;

mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(sourceSvg, 'utf8');
writeFileSync(join(iconsDir, 'icon.svg'), svg);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: masterSize, height: masterSize },
  deviceScaleFactor: 1
});
await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <style>
      html, body {
        background: transparent;
        height: ${masterSize}px;
        margin: 0;
        overflow: hidden;
        padding: 0;
        width: ${masterSize}px;
      }
      svg { display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`);
await page.locator('svg').screenshot({
  omitBackground: true,
  path: masterPng
});
await browser.close();

const python = `
from pathlib import Path
from PIL import Image

master_path = Path(${JSON.stringify(masterPng)})
icons_dir = Path(${JSON.stringify(iconsDir)})
master = Image.open(master_path).convert("RGBA")
if master.size != (${masterSize}, ${masterSize}):
    master = master.resize((${masterSize}, ${masterSize}), Image.Resampling.LANCZOS)

def grayscale(image):
    red, green, blue, alpha = image.split()
    gray = Image.merge("RGB", (red, green, blue)).convert("L")
    return Image.merge("LA", (gray, alpha)).convert("RGBA")

for size in (16, 32, 48, 128):
    resized = master.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(icons_dir / f"icon{size}.png", "PNG", optimize=True)
    grayscale(resized).save(icons_dir / f"icon{size}-disabled.png", "PNG", optimize=True)

master_path.unlink()
`;

const result = spawnSync('python3', ['-c', python], { encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
