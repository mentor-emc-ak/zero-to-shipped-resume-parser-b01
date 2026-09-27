const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index.js');
const { buildPdf } = require('./smoke.test.js');
const { scoreAgainstJobDescription } = require('../scoring');

const JD =
  'We are hiring a backend engineer. You will build APIs in Node.js and TypeScript, ' +
  'run services on AWS with Docker and Kubernetes, and own PostgreSQL schemas. ' +
  'Node.js and AWS are a must.';

test('scores full keyword coverage as 100', () => {
  const result = scoreAgainstJobDescription(JD, JD);
  assert.equal(result.score, 100);
  assert.deepEqual(result.missingKeywords, []);
});

test('weights keywords the JD repeats more heavily', () => {
  const result = scoreAgainstJobDescription('Node.js and AWS', JD);
  assert.ok(result.matchedKeywords.includes('node.js'));
  assert.ok(result.matchedKeywords.includes('aws'));
  assert.ok(result.missingKeywords.includes('kubernetes'));
  // 2 of the keywords, but each appears twice in the JD.
  const unweightedPercent = Math.round((2 / result.keywordCount) * 100);
  assert.ok(result.score > unweightedPercent);
});

test('matches singular and plural forms', () => {
  const result = scoreAgainstJobDescription('Designed an API and a service', JD);
  assert.ok(result.matchedKeywords.includes('apis'));
  assert.ok(result.matchedKeywords.includes('services'));
});

test('ignores stopwords and job-posting boilerplate', () => {
  const result = scoreAgainstJobDescription('', JD);
  for (const word of ['we', 'are', 'you', 'must']) {
    assert.ok(!result.missingKeywords.includes(word), `"${word}" should not be a keyword`);
  }
});

let baseUrl;
let server;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

test.after(() => server.close());

function scoreForm({ pdfText, jobDescription }) {
  const form = new FormData();
  if (pdfText !== undefined) {
    form.append('resume', new Blob([buildPdf(pdfText)], { type: 'application/pdf' }), 'cv.pdf');
  }
  if (jobDescription !== undefined) form.append('jobDescription', jobDescription);
  return form;
}

async function postScore(form) {
  const res = await fetch(`${baseUrl}/api/score`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json() };
}

test('POST /api/score returns a score for a PDF and JD', async () => {
  const { status, body } = await postScore(
    scoreForm({ pdfText: 'Backend engineer Node.js AWS Docker', jobDescription: JD })
  );
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.filename, 'cv.pdf');
  assert.ok(body.score > 0 && body.score < 100);
  assert.ok(body.matchedKeywords.includes('docker'));
  assert.ok(body.missingKeywords.includes('postgresql'));
});

test('POST /api/score rejects a missing job description', async () => {
  const { status, body } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: '  ' }));
  assert.equal(status, 400);
  assert.match(body.error, /No job description/);
});

test('POST /api/score rejects a missing file', async () => {
  const { status, body } = await postScore(scoreForm({ jobDescription: JD }));
  assert.equal(status, 400);
  assert.match(body.error, /No file uploaded/);
});

test('POST /api/score rejects a JD with too few keywords', async () => {
  const { status, body } = await postScore(
    scoreForm({ pdfText: 'Resume', jobDescription: 'Great team, apply now' })
  );
  assert.equal(status, 422);
  assert.match(body.error, /too short/);
});

test('POST /api/score rejects files over 4 MB', async () => {
  const form = new FormData();
  const oversized = Buffer.concat([Buffer.from(buildPdf('x')), Buffer.alloc(4 * 1024 * 1024)]);
  form.append('resume', new Blob([oversized], { type: 'application/pdf' }), 'big.pdf');
  form.append('jobDescription', JD);
  const { status } = await postScore(form);
  assert.equal(status, 413);
});
