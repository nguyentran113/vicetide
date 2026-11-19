// VICETIDE hand-in program (gta6-01, round 2).
//
// What this file does, end to end:
//   1. Works out where the hand-in goes: $MAKEFUN_OUTPUT_DIR when set, else /output
//      (the grader's container mounts the hand-in directory at /output).
//   2. Stages the deliverable there: the playable game from game/ (plain static files,
//      three.js vendored under game/vendor/, no build step and no network) and the
//      screenshots from screenshots/ (first file by name is the cover image).
//   3. Asks the vendored make.fun library to summarise the staged tree into
//      dossier.json, the one file the judge reads, and writes those bytes out.
//
// The game itself lives entirely under game/; this program is only the courier.
// Run it with Node 22+:  node main.ts
// Try it locally with:   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game with:   node serve.ts   (then open http://localhost:8080)

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's gate limits, mirrored on purpose: passing the same caps the judge
// uses means this program refuses an oversized entry here, with a readable error,
// instead of letting the scorer refuse it later. Of these, only text_max_bytes
// changes the dossier's bytes; the rest are pure limits.
const GATE = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993, // 993 game entries + screenshots/ + dossier.json = the grader's 1000-entry cap
  game_max_bytes: 50_331_648, // 48 MiB
  game_path_max_bytes: 1000,
};

/** This file's own directory: game/ and screenshots/ sit beside it. */
const repoRoot = dirname(fileURLToPath(import.meta.url));

/** Where the hand-in is assembled: the grader's /output, or the local stand-in named by the env. */
function handInDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  return fromEnv === undefined || fromEnv === '' ? '/output' : fromEnv;
}

/** Running totals for one copied tree, so the final report can say what was staged. */
interface CopyTally {
  files: number;
  bytes: number;
}

/**
 * Copy a directory tree file by file (entries in name order, so the staging is
 * deterministic). Plain files and directories only: anything else is a mistake in
 * the repo, so it stops the hand-in instead of being silently skipped.
 */
function copyTree(sourceDir: string, targetDir: string, tally: CopyTally): void {
  mkdirSync(targetDir, { recursive: true });
  const names = readdirSync(sourceDir).sort();
  for (const name of names) {
    const from = join(sourceDir, name);
    const to = join(targetDir, name);
    const info = statSync(from);
    if (info.isDirectory()) {
      copyTree(from, to, tally);
    } else if (info.isFile()) {
      copyFileSync(from, to);
      tally.files += 1;
      tally.bytes += info.size;
    } else {
      throw new Error(`cannot hand in ${from}: not a plain file or directory`);
    }
  }
}

/**
 * Stage game/ and screenshots/ from the repo into the hand-in directory and
 * return what was copied. The screenshots folder is created even when the repo
 * has none, so the dossier step reports the missing cover itself.
 */
function stageDeliverable(targetRoot: string): CopyTally {
  const tally: CopyTally = { files: 0, bytes: 0 };
  copyTree(join(repoRoot, 'game'), join(targetRoot, 'game'), tally);
  mkdirSync(join(targetRoot, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) copyTree(shotsDir, join(targetRoot, 'screenshots'), tally);
  return tally;
}

function main(): void {
  const targetRoot = handInDir();
  mkdirSync(targetRoot, { recursive: true });

  const staged = stageDeliverable(targetRoot);

  // Build the dossier from the staged copy, not from the repo: the summary must
  // describe exactly the bytes the judge receives, nothing else.
  const dossierBytes = buildDossier(targetRoot, GATE);
  const dossierPath = join(targetRoot, 'dossier.json');
  writeFileSync(dossierPath, dossierBytes);

  const digest = createHash('sha256').update(dossierBytes).digest('hex');
  console.error(
    `vicetide: staged ${staged.files} files (${staged.bytes} bytes) into ${targetRoot}; ` +
      `dossier.json is ${dossierBytes.length} bytes, sha256 ${digest}`,
  );
}

try {
  main();
} catch (err) {
  console.error(`vicetide: hand-in failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
