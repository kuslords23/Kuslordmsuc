/**
 * Unpacks any .zip files in the project and puts their contents
 * into the right folders.
 *
 * Run it yourself with:  npm run integrate
 *
 * It is deliberately written so it can NEVER fail a deployment:
 * every error is caught and the script always exits with code 0.
 */

let fs, path, AdmZip;

try {
  fs = require('fs');
  path = require('path');
} catch (err) {
  console.log('File system not available; skipping zip integration.');
  process.exit(0);
}

try {
  AdmZip = require('adm-zip');
} catch (err) {
  console.log('adm-zip is not installed; skipping zip integration.');
  process.exit(0);
}

const ROOT = process.cwd();

const TARGET_MAP = {
  '.ts': 'src',
  '.tsx': 'src',
  '.css': 'src',
  '.json': 'src/data',
  '.html': 'public',
  '.sql': 'database',
  '.mp3': 'public/audio',
  '.png': 'public/images',
  '.jpg': 'public/images',
  '.svg': 'public/images',
};

const PATTERN_MAP = {
  'Studio.tsx': 'src/components/Studio.tsx',
  'Studio.css': 'src/components/Studio.css',
  'SportsSection.tsx': 'src/components/SportsSection.tsx',
  'music.ts': 'src/data/music.ts',
  'sports.ts': 'src/data/sports.ts',
  'vercel.json': 'vercel.json',
  'vite.config.ts': 'vite.config.ts',
  'tsconfig.json': 'tsconfig.json',
  'index.html': 'index.html',
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeGenerated(relPath, contents) {
  const full = path.join(ROOT, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, contents);
  console.log('  -> wrote ' + relPath);
}

function extractZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName.replace(/^\/+/, '');
    const baseName = path.basename(entryName);
    const ext = path.extname(baseName).toLowerCase();

    // tracks.json becomes a real TypeScript file the app can import
    if (baseName === 'tracks.json') {
      try {
        const json = JSON.parse(entry.getData().toString('utf8'));
        const ts =
          "import type { Track } from './music'\n\n" +
          'export const extractedTracks: Track[] = ' +
          JSON.stringify(json, null, 2) +
          '\n';
        writeGenerated('src/data/extractedTracks.ts', ts);
      } catch (err) {
        console.log('  !! tracks.json was not valid JSON; skipped.');
      }
      continue;
    }

    if (baseName === 'albums.json') {
      try {
        const json = JSON.parse(entry.getData().toString('utf8'));
        const ts =
          "import type { Album } from './music'\n\n" +
          'export const extractedAlbums: Album[] = ' +
          JSON.stringify(json, null, 2) +
          '\n';
        writeGenerated('src/data/extractedAlbums.ts', ts);
      } catch (err) {
        console.log('  !! albums.json was not valid JSON; skipped.');
      }
      continue;
    }

    let targetRel = PATTERN_MAP[baseName];
    if (!targetRel) {
      const folder = TARGET_MAP[ext] || 'src';
      targetRel = path.join(folder, baseName);
    }

    const targetPath = path.join(ROOT, targetRel);
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, entry.getData());
    console.log('  -> ' + entryName + ' -> ' + targetRel);
  }
}

function walk(dir) {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(fullPath);
    } else if (item.name.endsWith('.zip') && !item.name.endsWith('.done.zip')) {
      console.log('Extracting ' + fullPath + ' ...');
      try {
        extractZip(fullPath);
        fs.renameSync(fullPath, fullPath + '.done.zip');
        console.log('   done.');
      } catch (err) {
        console.log('   could not extract: ' + (err && err.message));
      }
    }
  }
}

try {
  console.log('Scanning for zip files...');
  walk(ROOT);
  console.log('Zip integration finished.');
} catch (err) {
  console.log('Zip integration skipped: ' + (err && err.message));
}

process.exit(0);