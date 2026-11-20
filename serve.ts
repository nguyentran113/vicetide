// A tiny static file server for playing VICETIDE locally.
//
//   node serve.ts [--port 8080]     →     http://localhost:8080
//
// It serves only the game/ folder, answers "/" with index.html, picks
// a content type from the file extension, and refuses — with a 403 —
// any URL whose normalised path would escape game/. Standard library
// only; meant for a developer's own machine, not the open internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));

function portFromArgs(argv: string[]): number {
  const flagAt = argv.indexOf('--port');
  const wanted = flagAt === -1 ? 8080 : Number(argv[flagAt + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

const MIME: Record<string, string> = {
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

function locate(pathname: string): string | null {
  const rel = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const candidate = resolve(join(root, normalize(rel)));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

function serve(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }

  const file = locate(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }

  let size: number;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('directory');
    size = info.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}

const port = portFromArgs(process.argv.slice(2));
createServer(serve).listen(port, '127.0.0.1', () => {
  console.log(`VICETIDE is playable at http://localhost:${port}`);
});
