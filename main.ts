// VICETIDE hand-in packager (gta6-01, round 4).
//
// The deliverable is a folder: the static game under game/, the four
// screenshots, and one dossier.json summarising the lot for the
// judge. This little program assembles that folder:
//
//   * The folder is $MAKEFUN_OUTPUT_DIR when the caller sets it, and
//     /output otherwise (the grader mounts the hand-in there).
//   * game/ and screenshots/ are mirrored into it recursively,
//     entries in alphabetical order at every level so two runs of the
//     packager produce byte-identical trees. Anything that is neither
//     a plain file nor a plain directory aborts the run — a hand-in
//     with a symlink hiding in it is not a hand-in worth making.
//   * The dossier is then computed from the *mirrored* tree (never
//     from the repo directly) by the vendored builder, and written
//     beside the files it describes.
//
// Usage:  node main.ts
//         MAKEFUN_OUTPUT_DIR=out node main.ts    (local rehearsal)
//         node serve.ts                         (play the game)

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's ceilings, restated so a breach is reported here in plain
// words rather than discovered by the scorer. Of these, only
// text_max_bytes influences the dossier's bytes; the rest are caps.
const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993, // 993 game entries + screenshots dir & files + dossier.json = the 1000-entry cap
  game_max_bytes: 50_331_648, // 48 MiB
  game_path_max_bytes: 1000,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));

interface Tally {
  files: number;
  bytes: number;
}

function mirrorTree(sourceDir: string, targetDir: string, tally: Tally): void {
  mkdirSync(targetDir, { recursive: true });
  const names = readdirSync(sourceDir).sort();
  for (const name of names) {
    const from = join(sourceDir, name);
    const to = join(targetDir, name);
    const info = statSync(from, { throwIfNoEntry: true });
    if (info.isDirectory()) {
      mirrorTree(from, to, tally);
    } else if (info.isFile()) {
      copyFileSync(from, to);
      tally.files += 1;
      tally.bytes += info.size;
    } else {
      throw new Error(`cannot hand in ${from}: not a regular file or directory`);
    }
  }
}

function assemble(outDir: string): Tally {
  const tally: Tally = { files: 0, bytes: 0 };
  mirrorTree(join(repoRoot, 'game'), join(outDir, 'game'), tally);
  // screenshots/ belongs in the hand-in even if the repo somehow has
  // none — the dossier builder is the right place to complain about a
  // missing cover image.
  const shotsDir = join(outDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  const repoShots = join(repoRoot, 'screenshots');
  if (existsSync(repoShots)) mirrorTree(repoShots, shotsDir, tally);
  return tally;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });

  const tally = assemble(outDir);
  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const digest = createHash('sha256').update(dossier).digest('hex');
  console.error(
    `vicetide packager: mirrored ${tally.files} files (${tally.bytes} bytes) into ${outDir}; ` +
      `dossier.json is ${dossier.length} bytes, sha256 ${digest}`,
  );
}

try {
  main();
} catch (err) {
  console.error(`vicetide packager failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
