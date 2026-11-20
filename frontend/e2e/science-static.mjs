import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const base = new URL('../science/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/science.css', ['science.css', 'text/css']],
  ['/pressure-in-sand/', ['pressure-in-sand/index.html', 'text/html']],
  ['/pressure-in-sand/lab.css', ['pressure-in-sand/lab.css', 'text/css']],
  ['/pressure-in-sand/lab.mjs', ['pressure-in-sand/lab.mjs', 'text/javascript']],
  ['/pressure-in-sand/model.mjs', ['pressure-in-sand/model.mjs', 'text/javascript']],
  ['/plant-a-seed/', ['plant-a-seed/index.html', 'text/html']],
  ['/plant-a-seed/model.mjs', ['plant-a-seed/model.mjs', 'text/javascript']],
  ['/plant-a-seed/seed.css', ['plant-a-seed/seed.css', 'text/css']],
  ['/plant-a-seed/seed.mjs', ['plant-a-seed/seed.mjs', 'text/javascript']],
  ['/prism/', ['prism/index.html', 'text/html']],
  ['/prism/prism.css', ['prism/prism.css', 'text/css']],
  ['/prism/prism.mjs', ['prism/prism.mjs', 'text/javascript']],
  ['/prism/model.mjs', ['prism/model.mjs', 'text/javascript']],
]);

export async function serveScience() {
  const server = createServer(async (request, response) => {
    if (!files.has(request.url)) return response.writeHead(404).end();
    const [file, type] = files.get(request.url);
    try {
      const data = await readFile(new URL(file, base));
      response.writeHead(200, { 'content-type': type + '; charset=utf-8' }).end(data);
    } catch { response.writeHead(500).end(); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: 'http://127.0.0.1:' + server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
