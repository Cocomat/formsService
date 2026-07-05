import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4173);
const distDir = resolve("dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = join(distDir, pathname);
  const filePath = await resolveFile(requestedPath);

  response.setHeader("content-type", contentTypes[extname(filePath)] ?? "application/octet-stream");
  createReadStream(filePath)
    .on("error", () => {
      response.statusCode = 500;
      response.end("Internal Server Error");
    })
    .pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Web server listening on ${port}`);
});

async function resolveFile(requestedPath) {
  const safePath = requestedPath.startsWith(distDir) ? requestedPath : join(distDir, "index.html");
  if (existsSync(safePath) && (await stat(safePath)).isFile()) {
    return safePath;
  }
  return join(distDir, "index.html");
}
