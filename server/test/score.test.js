const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index.js');
const { buildPdf } = require('./helpers/pdf');
const { parseScoreReply } = require('../scoring');
const { LABD_CHAT_URL } = require('../labd');

const JD =
  'We are hiring a backend engineer. You will build APIs in Node.js and TypeScript, ' +
  'run services on AWS with Docker and Kubernetes, and own PostgreSQL schemas.';

const REPLY = {
  score: 72,
  summary: 'Strong backend match. Missing Kubernetes.',
  matchedSkills: ['Node.js', 'AWS'],
  missingSkills: ['Kubernetes'],
  suggestions: ['Quantify the API traffic you handled.'],
};

test('parseScoreReply accepts a valid JSON reply', () => {
  assert.deepEqual(parseScoreReply(JSON.stringify(REPLY)), REPLY);
});

test('parseScoreReply strips a markdown code fence', () => {
  assert.deepEqual(parseScoreReply('```json\n' + JSON.stringify(REPLY) + '\n```'), REPLY);
});

test('parseScoreReply rejects prose, out-of-range scores and missing fields', () => {
  assert.equal(parseScoreReply('The candidate is a good fit.'), null);
  assert.equal(parseScoreReply(JSON.stringify({ ...REPLY, score: 140 })), null);
  assert.equal(parseScoreReply(JSON.stringify({ ...REPLY, score: 72.5 })), null);
  assert.equal(parseScoreReply(JSON.stringify({ ...REPLY, suggestions: undefined })), null);
  assert.equal(parseScoreReply(JSON.stringify({ ...REPLY, matchedSkills: [1, 2] })), null);
});

let baseUrl;
let server;
let labdCalls;
let labdResponse;
const realFetch = globalThis.fetch;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  test.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url !== LABD_CHAT_URL) return realFetch(url, init);
    labdCalls.push(init);
    return labdResponse();
  });
  // The server logs [Labd]/[Scoring] lines on every failure path these tests exercise.
  test.mock.method(console, 'log', () => {});
  test.mock.method(console, 'error', () => {});
});

test.beforeEach(() => {
  process.env.LABD_AI_KEY = 'test-key';
  labdCalls = [];
  labdResponse = () =>
    Response.json({ message: { role: 'assistant', content: JSON.stringify(REPLY) }, credits: { percentLeft: 90 } });
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

test('POST /api/score returns the labd score for a PDF and JD', async () => {
  const { status, body } = await postScore(
    scoreForm({ pdfText: 'Backend engineer Node.js AWS Docker', jobDescription: JD })
  );
  assert.equal(status, 200);
  assert.deepEqual(body, { success: true, filename: 'cv.pdf', pages: 1, ...REPLY });

  assert.equal(labdCalls.length, 1);
  assert.equal(labdCalls[0].headers.Authorization, 'Bearer test-key');
  const prompt = JSON.parse(labdCalls[0].body).messages[0].content;
  assert.match(prompt, /Backend engineer Node\.js AWS Docker/);
  assert.match(prompt, /own PostgreSQL schemas/);
});

test('POST /api/score maps a used-up labd allowance to 503', async () => {
  labdResponse = () => new Response('Payment required', { status: 402 });
  const { status, body } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: JD }));
  assert.equal(status, 503);
  assert.match(body.error, /unavailable/);
});

test('POST /api/score asks the user to wait when labd rate-limits', async () => {
  labdResponse = () => new Response('Too many', { status: 429 });
  const { status, body } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: JD }));
  assert.equal(status, 503);
  assert.match(body.error, /Wait a minute/);
});

test('POST /api/score returns 502 when labd replies with prose', async () => {
  labdResponse = () => Response.json({ message: { content: 'Looks like a great fit!' }, credits: {} });
  const { status, body } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: JD }));
  assert.equal(status, 502);
  assert.match(body.error, /unexpected answer/);
});

test('POST /api/score returns 503 without calling labd when the key is missing', async () => {
  delete process.env.LABD_AI_KEY;
  const { status } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: JD }));
  assert.equal(status, 503);
  assert.equal(labdCalls.length, 0);
});

test('POST /api/score rejects a short JD without calling labd', async () => {
  const { status, body } = await postScore(
    scoreForm({ pdfText: 'Resume', jobDescription: 'Great team, apply now' })
  );
  assert.equal(status, 422);
  assert.match(body.error, /too short/);
  assert.equal(labdCalls.length, 0);
});

test('POST /api/score rejects a JD over 20,000 characters', async () => {
  const { status, body } = await postScore(
    scoreForm({ pdfText: 'Resume', jobDescription: 'x'.repeat(20001) })
  );
  assert.equal(status, 400);
  assert.match(body.error, /too long/);
});

test('POST /api/score rejects a missing job description', async () => {
  const { status, body } = await postScore(scoreForm({ pdfText: 'Resume', jobDescription: '  ' }));
  assert.equal(status, 400);
  assert.match(body.error, /No job description/);
});

test('POST /api/score rejects a repeated jobDescription field instead of crashing', async () => {
  const form = scoreForm({ pdfText: 'Resume', jobDescription: JD });
  form.append('jobDescription', JD);
  const { status } = await postScore(form);
  assert.equal(status, 400);

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
});

test('POST /api/score rejects a missing file', async () => {
  const { status, body } = await postScore(scoreForm({ jobDescription: JD }));
  assert.equal(status, 400);
  assert.match(body.error, /No file uploaded/);
});

test('POST /api/score rejects a non-PDF file', async () => {
  const form = new FormData();
  form.append('resume', new Blob(['hello'], { type: 'text/plain' }), 'cv.txt');
  form.append('jobDescription', JD);
  const { status } = await postScore(form);
  assert.equal(status, 415);
});

test('POST /api/score rejects files over 4 MB', async () => {
  const form = new FormData();
  const oversized = Buffer.concat([Buffer.from(buildPdf('x')), Buffer.alloc(4 * 1024 * 1024)]);
  form.append('resume', new Blob([oversized], { type: 'application/pdf' }), 'big.pdf');
  form.append('jobDescription', JD);
  const { status } = await postScore(form);
  assert.equal(status, 413);
});
