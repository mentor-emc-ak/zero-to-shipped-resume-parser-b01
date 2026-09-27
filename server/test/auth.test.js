const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../index.js');
const db = require('../db');
const { hashPassword, verifyPassword } = require('../auth');

const SECRET = 'test-secret';
const EMAIL = 'asha@example.com';
const PASSWORD = 'correct horse';

let baseUrl;
let server;
let users;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  test.mock.method(db, 'createUser', async ({ email, passwordHash }) => {
    if (users.some((user) => user.email === email)) return null;
    const user = { id: String(users.length + 1).padStart(24, '0'), email, passwordHash, createdAt: new Date() };
    users.push(user);
    return { id: user.id, email, createdAt: user.createdAt };
  });
  test.mock.method(db, 'findUserByEmail', async (email) => users.find((user) => user.email === email) ?? null);
  test.mock.method(db, 'findUserById', async (id) => {
    const user = users.find((candidate) => candidate.id === id);
    return user ? { id: user.id, email: user.email, createdAt: user.createdAt } : null;
  });
  test.mock.method(console, 'error', () => {});
});

test.beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  users = [];
  console.error.mock.resetCalls();
});

test.after(() => server.close());

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function getMe(authorization) {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: authorization ? { Authorization: authorization } : {},
  });
  return { status: res.status, body: await res.json() };
}

test('hashPassword output verifies the same password and rejects others', async () => {
  const stored = await hashPassword(PASSWORD);
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(await verifyPassword(PASSWORD, stored), true);
  assert.equal(await verifyPassword('wrong password', stored), false);
});

test('POST /api/auth/signup creates a user and returns a JWT for it', async () => {
  const { status, body } = await post('/api/auth/signup', { email: '  Asha@Example.com ', password: PASSWORD });
  assert.equal(status, 201);
  assert.equal(body.success, true);
  assert.equal(body.user.email, EMAIL);
  assert.equal(body.user.passwordHash, undefined);

  const claims = jwt.verify(body.token, SECRET);
  assert.equal(claims.sub, body.user.id);
  assert.equal(claims.email, EMAIL);

  assert.equal(users.length, 1);
  assert.notEqual(users[0].passwordHash, PASSWORD);
  assert.equal(await verifyPassword(PASSWORD, users[0].passwordHash), true);
});

test('POST /api/auth/signup rejects an email that is already registered', async () => {
  await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  const { status, body } = await post('/api/auth/signup', { email: EMAIL.toUpperCase(), password: PASSWORD });
  assert.equal(status, 409);
  assert.match(body.error, /already exists/);
});

test('POST /api/auth/signup validates the email and password', async () => {
  const cases = [
    [{ email: 'not-an-email', password: PASSWORD }, /valid email/],
    [{ email: EMAIL, password: 'short' }, /at least 8/],
    [{ email: EMAIL, password: 'x'.repeat(129) }, /under 128/],
    [{ email: [EMAIL], password: PASSWORD }, /valid email/],
    [{}, /valid email/],
  ];
  for (const [input, message] of cases) {
    const { status, body } = await post('/api/auth/signup', input);
    assert.equal(status, 400);
    assert.match(body.error, message);
  }
  assert.equal(users.length, 0);
});

test('POST /api/auth/signup returns 503 and creates nobody when JWT_SECRET is missing', async () => {
  delete process.env.JWT_SECRET;
  const { status } = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  assert.equal(status, 503);
  assert.equal(users.length, 0);
  assert.match(console.error.mock.calls[0].arguments[0], /JWT_SECRET is not set/);
});

test('POST /api/auth/signup returns 400 for malformed JSON', async () => {
  const { status, body } = await post('/api/auth/signup', '{"email":');
  assert.equal(status, 400);
  assert.match(body.error, /JSON body/);
});

test('POST /api/auth/login returns a JWT for the right password', async () => {
  const signup = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  const { status, body } = await post('/api/auth/login', { email: 'ASHA@example.com', password: PASSWORD });
  assert.equal(status, 200);
  assert.equal(body.user.id, signup.body.user.id);
  assert.equal(jwt.verify(body.token, SECRET).sub, signup.body.user.id);
});

test('POST /api/auth/login gives the same 401 for a wrong password and an unknown email', async () => {
  await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  const wrongPassword = await post('/api/auth/login', { email: EMAIL, password: 'wrong password' });
  const unknownEmail = await post('/api/auth/login', { email: 'nobody@example.com', password: PASSWORD });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.equal(wrongPassword.body.error, unknownEmail.body.error);
  assert.equal(wrongPassword.body.token, undefined);
});

test('POST /api/auth/login returns 500 without leaking details when the database fails', async () => {
  db.findUserByEmail.mock.mockImplementationOnce(async () => {
    throw new Error('connection refused');
  });
  const { status, body } = await post('/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert.equal(status, 500);
  assert.equal(body.error, 'Internal server error.');
  assert.match(console.error.mock.calls[0].arguments[0], /\[Auth\] connection refused/);
});

test('GET /api/auth/me returns the user for a valid token', async () => {
  const { body: signup } = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  const { status, body } = await getMe(`Bearer ${signup.token}`);
  assert.equal(status, 200);
  assert.equal(body.user.id, signup.user.id);
  assert.equal(body.user.email, EMAIL);
});

test('GET /api/auth/me rejects missing, forged, expired and none-algorithm tokens', async () => {
  const { body: signup } = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
  const id = signup.user.id;
  const forged = jwt.sign({}, 'other-secret', { subject: id });
  const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, SECRET, { subject: id });
  const unsigned = jwt.sign({}, null, { subject: id, algorithm: 'none' });

  for (const header of [undefined, 'Bearer', signup.token, `Bearer ${forged}`, `Bearer ${expired}`, `Bearer ${unsigned}`]) {
    const { status } = await getMe(header);
    assert.equal(status, 401, `expected 401 for ${header}`);
  }
});

test('GET /api/auth/me returns 401 when the account no longer exists', async () => {
  const token = jwt.sign({}, SECRET, { subject: 'ffffffffffffffffffffffff' });
  const { status, body } = await getMe(`Bearer ${token}`);
  assert.equal(status, 401);
  assert.match(body.error, /session has ended/);
});
