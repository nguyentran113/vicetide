// VICETIDE hand-in courier (gta6-01, round 3).
//
// The game is plain static files under game/ plus its screenshots; the
// judge wants them summarised in one dossier.json. This program is the
// courier between the repo and that dossier:
//
//   1. Pick the destination: $MAKEFUN_OUTPUT_DIR if the caller set it,
//      otherwise /output, where the grader mounts the hand-in folder.
//   2. Walk game/ and screenshots/ and copy every file across, in a
//      stable order, refusing anything that is not a file or a folder.
//   3. Feed the *staged* tree to the vendored dossier builder, write
//      the bytes it returns to dossier.json, and report the result.
//
// Nothing here touches the game itself. Node 22+ runs it directly:
//   node main.ts
//   MAKEFUN_OUTPUT_DIR=out node main.ts   (local dry run)
//   node serve.ts                        (play the staged game)

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The judge's own limits, restated here so an oversized entry fails at
// the courier with a readable complaint instead of at the scorer.
// Only text_max_bytes shapes the dossier bytes; the rest are ceilings.
const LIMITS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993, // 993 game files + the screenshots + dossier.json = 1000 entries
  game_max_bytes: 50_331_648, // 48 MiB
  game_path_max_bytes: 1000,
};

const here = dirname(fileURLToPath(import.meta.url));

function destination(): string {
  const env = process.env.MAKEFUN_OUTPUT_DIR;
  return env ? env : '/output';
}

interface Staged {
  files: number;
  bytes: number;
}

// Iterative walk with an explicit stack (no recursion): directories are
// expanded in name order so the copy is deterministic from run to run.
function copyTreeInto(fromRoot: string, toRoot: string, staged: Staged): void {
  const pending: Array<[string, string]> = [[fromRoot, toRoot]];
  while (pending.length > 0) {
    const [fromDir, toDir] = pending.pop() as [string, string];
    mkdirSync(toDir, { recursive: true });
    const entries = readdirSync(fromDir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    // Push subdirectories in reverse so they pop in name order.
    const subdirs: Array<[string, string]> = [];
    for (const entry of entries) {
      const from = join(fromDir, entry.name);
      const to = join(toDir, entry.name);
      if (entry.isDirectory()) {
        subdirs.push([from, to]);
      } else if (entry.isFile()) {
        copyFileSync(from, to);
        staged.files += 1;
        staged.bytes += statSync(from).size;
      } else {
        throw new Error(`refusing to hand in ${from}: not a file or directory`);
      }
    }
    for (let i = subdirs.length - 1; i >= 0; i--) pending.push(subdirs[i]);
  }
}

function stageAll(destRoot: string): Staged {
  const staged: Staged = { files: 0, bytes: 0 };
  copyTreeInto(join(here, 'game'), join(destRoot, 'game'), staged);
  // The screenshots folder must exist in the hand-in even when the repo
  // has none, so the dossier builder itself reports the missing cover.
  mkdirSync(join(destRoot, 'screenshots'), { recursive: true });
  const shots = join(here, 'screenshots');
  if (existsSync(shots)) copyTreeInto(shots, join(destRoot, 'screenshots'), staged);
  return staged;
}

function run(): void {
  const destRoot = destination();
  mkdirSync(destRoot, { recursive: true });

  const staged = stageAll(destRoot);

  // Summarise the staged copy — the dossier must describe the exact
  // bytes being handed in, not the repo they came from.
  const dossier = buildDossier(destRoot, LIMITS);
  writeFileSync(join(destRoot, 'dossier.json'), dossier);

  const sha = createHash('sha256').update(dossier).digest('hex');
  console.error(
    `vicetide hand-in: ${staged.files} files, ${staged.bytes} bytes staged in ${destRoot}; ` +
      `dossier.json ${dossier.length} bytes, sha256 ${sha}`,
  );
}

try {
  run();
} catch (err) {
  console.error(`vicetide hand-in failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
