// main.ts — Vicetide's dossier builder (round 5 design).
// Copies the playable tree (game/ plus screenshots/) into the output
// directory with a breadth-first walk, then asks the vendored
// make.fun library to fold that tree into dossier.json under the
// bounty caps, and reports a one-line summary on stderr.

import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function mirrorTree(from: string, to: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const queue: Array<[string, string]> = [[from, to]];
  while (queue.length > 0) {
    const [srcDir, dstDir] = queue.pop() as [string, string];
    mkdirSync(dstDir, { recursive: true });
    const names = readdirSync(srcDir).sort();
    for (const name of names) {
      const src = join(srcDir, name);
      const dst = join(dstDir, name);
      const info = statSync(src);
      if (info.isDirectory()) {
        queue.push([src, dst]);
      } else if (info.isFile()) {
        copyFileSync(src, dst);
        files += 1;
        bytes += info.size;
      } else {
        throw new Error(`mirrorTree: refusing to stage non-regular entry ${src}`);
      }
    }
  }
  return { files, bytes };
}

function run(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });

  let stagedFiles = 0;
  let stagedBytes = 0;
  for (const part of ['game', 'screenshots']) {
    const src = join(here, part);
    if (!existsSync(src)) throw new Error(`missing ${part}/ next to main.ts`);
    const tally = mirrorTree(src, join(outDir, part));
    stagedFiles += tally.files;
    stagedBytes += tally.bytes;
  }

  const dossier = buildDossier(outDir, CAPS);
  const dossierPath = join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossier);
  process.stderr.write(
    `vicetide: staged ${stagedFiles} files (${stagedBytes} bytes); dossier.json is ${dossier.byteLength} bytes\n`
  );
}

try {
  run();
} catch (err) {
  process.stderr.write(`vicetide: dossier build failed — ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
}
