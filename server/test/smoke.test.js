// Smoke test: starts the app in-process and exercises the four cases.
// Run with: node test/smoke.test.js
if (require.main === module) {
  require('../index.js');
}

const { buildPdf } = require('./helpers/pdf');

const fs = require('fs');
const os = require('os');
const path = require('path');

const pdf = buildPdf('John Doe Resume Test');
const pdfPath = path.join(os.tmpdir(), 'smoke-resume.pdf');
fs.writeFileSync(pdfPath, pdf);

async function post(body, name) {
  const res = await fetch('http://localhost:3000/api/resume', {
    method: 'POST',
    body,
  });
  console.log(`[${name}] -> ${res.status}`, await res.text());
}

function formWithFile(filePath, type) {
  const fd = new FormData();
  fd.append(
    'resume',
    new Blob([fs.readFileSync(filePath)], { type }),
    path.basename(filePath)
  );
  return fd;
}

if (require.main !== module) return;

(async () => {
  // Wait until the server has connected to MongoDB and is listening.
  await new Promise((resolve) => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch('http://localhost:3000/health');
        if (r.ok) {
          clearInterval(poll);
          resolve();
        }
      } catch {}
    }, 300);
  });
  await post(formWithFile(pdfPath, 'application/pdf'), 'valid pdf');
  const txtPath = path.join(os.tmpdir(), 'smoke-notes.txt');
  fs.writeFileSync(txtPath, 'hello');
  await post(formWithFile(txtPath, 'text/plain'), 'wrong type');
  await post(new FormData(), 'no file');
  const bigPath = path.join(os.tmpdir(), 'smoke-big.pdf');
  fs.writeFileSync(bigPath, Buffer.concat([Buffer.from(pdf), Buffer.alloc(6 * 1024 * 1024)]));
  await post(formWithFile(bigPath, 'application/pdf'), 'oversized');
  process.exit(0);
})();
