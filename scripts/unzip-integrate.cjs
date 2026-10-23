const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const ROOT = process.cwd();

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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function extractZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName.replace(/^\/+/, '');
    const baseName = path.basename(entryName);
    const ext = path.extname(baseName).toLowerCase();

    if (baseName === 'tracks.json') {
      const json = JSON.parse(entry.getData().toString('utf8'));
      const ts = `import type { Track } from './music';\n\nexport const extractedTracks: Track[] = ${JSON.stringify(json, null, 2)};\n`;
      ensureDir(path.join(ROOT, 'src/data'));
      fs.writeFileSync(path.join(ROOT, 'src/data/extractedTracks.ts'), ts);
      console.log(`  → tracks.json → src/data/extractedTracks.ts`);
      continue;
    }

    if (baseName === 'albums.json') {
      const json = JSON.parse(entry.getData().toString('utf8'));
      const ts = `import type { Album } from './music';\n\nexport const extractedAlbums: Album[] = ${JSON.stringify(json, null, 2)};\n`;
      ensureDir(path.join(ROOT, 'src/data'));
      fs.writeFileSync(path.join(ROOT, 'src/data/extractedAlbums.ts'), ts);
      console.log(`  → albums.json → src/data/extractedAlbums.ts`);
      continue;
    }

    let targetRel = PATTERN_MAP[baseName];
    if (!targetRel) {
      if (baseName === 'index.html') {
        targetRel = './index.html';
      } else if (TARGET_MAP[ext]) {
        targetRel = path.join(TARGET_MAP[ext], baseName);
      }
    }
    if (!targetRel) targetRel = `./src/${baseName}`;

    const targetPath = path.join(ROOT, targetRel);
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, entry.getData());
    console.log(`  → ${entryName} → ${targetRel}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git') continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walk(fullPath);
    } else if (item.name.endsWith('.zip') && !item.name.endsWith('.done.zip')) {
      console.log(`📦 Extracting ${fullPath} ...`);
      try {
        extractZip(fullPath);
        fs.renameSync(fullPath, `${fullPath}.done.zip`);
        console.log(`   ✅ Done → ${fullPath}.done.zip`);
      } catch (err) {
        console.error(`   ❌ Failed to extract ${fullPath}:`, err.message);
      }
    }
  }
}

console.log('🔍 Scanning for zip files...');
walk(ROOT);
console.log('✅ Integration complete.');