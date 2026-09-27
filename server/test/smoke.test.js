// Smoke test: starts the app in-process and exercises the four cases.
// Run with: node test/smoke.test.js
if (require.main === module) {
  require('../index.js');
}

// Build a minimal but structurally valid one-page PDF with a correct xref table.
function buildPdf(text) {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${stream.length}>>stream\n${stream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return pdf;
}

const fs = require('fs');
const os = require('os');
const path = require('path');

const pdf = buildPdf('John Doe Resume Test');
const pdfPath = path.join(os.tmpdir(), 'smoke-resume.pdf');
fs.writeFileSync(pdfPath, pdf);

module.exports = { buildPdf };

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
