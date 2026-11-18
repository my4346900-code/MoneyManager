import { createServer } from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = process.env.SERVE_DIST === '1' ? resolve(projectRoot, 'dist') : projectRoot;
const publicRoot = resolve(root, 'public');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

function resolveFile(pathname) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const candidates = [resolve(root, cleanPath), resolve(publicRoot, cleanPath)];
  return candidates.find((candidate) => {
    const insideRoot = candidate === root || candidate.startsWith(`${root}${sep}`);
    const insidePublic = candidate === publicRoot || candidate.startsWith(`${publicRoot}${sep}`);
    return (insideRoot || insidePublic) && existsSync(candidate) && statSync(candidate).isFile();
  });
}

const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  let file;
  try {
    file = resolveFile(pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  const headers = {
    'Content-Type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
  };
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`MoneyManager site ready on port ${port}`);
});
