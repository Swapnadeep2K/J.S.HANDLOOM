const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain",
  ".woff2": "font/woff2", ".vtt": "text/vtt",
};

http.createServer((req, res) => {
  try {
    const route = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.resolve(root, "." + route);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (file === root) file = path.join(root, "index.html");
    else if (!path.extname(file)) file += ".html";
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    const size = fs.statSync(file).size;
    const headers = { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes" };
    const range = req.headers.range && /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    let start = 0;
    let end = size - 1;
    if (range) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= size) {
        res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
        return;
      }
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["Content-Length"] = end - start + 1;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(file, { start, end }).pipe(res);
  } catch {
    res.writeHead(400).end();
  }
}).listen(4173, "127.0.0.1");
