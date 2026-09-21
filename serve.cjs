const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5174;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  // Strip the query string so cache-busted assets (styles.css?v=2) resolve
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(DIR, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Mirror Netlify: serve the branded 404 page with a 404 status
      fs.readFile(path.join(DIR, '404.html'), (e404, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(e404 ? 'Not found' : page);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving chutter-site at http://127.0.0.1:${PORT}`);
});
