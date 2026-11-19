// Play VICETIDE locally: a pocket static server for the game/ folder,
// Node standard library only, no build step.
//
//   node serve.ts [--port 8080]   →   http://localhost:8080
//
// It answers with the content types a browser game needs, maps "/" to
// index.html, and flatly refuses any path that climbs out of game/.
// A development convenience — not a server to face the internet with.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

function pickPort(argv: string[]): number {
  const at = argv.indexOf('--port');
  const candidate = at === -1 ? 8080 : Number(argv[at + 1]);
  return Number.isInteger(candidate) && candidate > 0 && candidate < 65536 ? candidate : 8080;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

function resolveInside(urlPath: string): string | null {
  const withIndex = urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath;
  const file = resolve(join(gameRoot, normalize(withIndex)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) return null;
  return file;
}

function handle(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }

  const file = resolveInside(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }

  let size: number;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}

const port = pickPort(process.argv.slice(2));
createServer(handle).listen(port, '127.0.0.1', () => {
  console.log(`VICETIDE is playable at http://localhost:${port}`);
});
