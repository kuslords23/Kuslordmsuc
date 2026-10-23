const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Folders to scan -- but the walker below also scans everything recursively,
// so these are kept for clarity.
const TARGET_MAP = {
  '.ts': './src/',
  '.tsx': './src/',
  '.css': './src/',
  '.json': './src/data/',
  '.html': './public/',
  '.sql': './database/',
  '.mp3': './public/audio/',
  '.png': './public/images/',
  '.jpg': './public/images/',
  '.svg': './public/images/',
};

// Exact-file overrides
const PATTERN_MAP = {
  'Studio.tsx': './src/components/Studio.tsx',
  'Studio.css': './src/components/Studio.css',
  'SportsSection.tsx': './src/components/SportsSection.tsx',
  'music.ts': './src/data/music.ts',
  'sports.ts': './src/data/sports.ts',
  'vercel.json': './vercel.json',
  'vite.config.ts': './vite.config.ts',
  'tsconfig.json': './tsconfig.json',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  entries.forEach((entry) => {
    if (entry.isDirectory) return;

    const entryName = entry.entryName.replace(/^\/+/, '');
    const baseName = path.basename(entryName);
    const ext = path.extname(baseName).toLowerCase();

    // Special-case tracks.json -> extractedTracks.ts
    if (baseName === 'tracks.json') {
      const json = JSON.parse(entry.getData().toString('utf8'));
      const ts = `import type { Track } from './music';\n\nexport const extractedTracks: Track[] = ${JSON.stringify(json, null, 2)};\n`;
      ensureDir('./src/data');
      fs.writeFileSync('./src/data/extractedTracks.ts', ts);
      console.log('  → tracks.json → src/data/extractedTracks.ts');
      return;
    }

    // Special-case albums.json -> extractedAlbums.ts
    if (baseName === 'albums.json') {
      const json = JSON.parse(entry.getData().toString('utf8'));
      const ts = `import type { Album } from './music';\n\nexport const extractedAlbums: Album[] = ${JSON.stringify(json, null, 2)};\n`;
      ensureDir('./src/data');
      fs.writeFileSync('./src/data/extractedAlbums.ts', ts);
      console.log('  → albums.json → src/data/extractedAlbums.ts');
      return;
    }

    let targetPath = PATTERN_MAP[baseName];

    if (!targetPath) {
      if (baseName === 'index.html') {
        targetPath = './index.html';
      } else if (TARGET_MAP[ext]) {
        targetPath = path.join(TARGET_MAP[ext], baseName);
      }
    }

    if (!targetPath) targetPath = `./src/${baseName}`;

    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, entry.getData());
    console.log(`  → ${entryName} → ${targetPath}`);
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git') continue;

    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(full);
    } else if (item.name.endsWith('.zip') && !item.name.endsWith('.done.zip')) {
      console.log(`📦 Extracting ${full}...`);
      try {
        extractZip(full);
        fs.renameSync(full, `${full}.done.zip`);
        console.log(`   ✅ Done → ${full}.done.zip`);
      } catch (err) {
        console.error(`   ❌ Failed to extract ${full}:`, err.message);
      }
    }
  }
}

console.log('🔍 Scanning for zip files…');
walk('./');
console.log('✅ Integration complete.');