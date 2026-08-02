import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
});

function safePathname(requestUrl) {
  const url = new URL(requestUrl, `http://127.0.0.1:${port}`);
  const decoded = decodeURIComponent(url.pathname);
  const normalized = normalize(decoded).replace(/^([/\\])+/, "");
  return normalized || "index.html";
}

async function resolveFile(pathname) {
  const candidate = resolve(join(projectRoot, pathname));

  if (!candidate.startsWith(projectRoot)) {
    return null;
  }

  try {
    const info = await stat(candidate);

    if (info.isDirectory()) {
      return join(candidate, "index.html");
    }

    return candidate;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  try {
    const pathname = safePathname(request.url || "/");
    const filePath = await resolveFile(pathname);

    if (!filePath) {
      response.writeHead(404, {
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Arquivo não encontrado.");
      return;
    }

    const content = await readFile(filePath);
    const mimeType =
      MIME_TYPES[extname(filePath).toLowerCase()] ||
      "application/octet-stream";

    response.writeHead(200, {
      "content-type": mimeType,
      "cache-control": "no-store",
    });
    response.end(content);
  } catch (error) {
    console.error(error);
    response.writeHead(500, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Falha interna do servidor de desenvolvimento.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Study Stack disponível em http://127.0.0.1:${port}/`);
});
