// Email and password accounts with stateless JWT sessions.

const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { ServiceError } = require('./service');

const scrypt = promisify(crypto.scrypt);

const MIN_PASSWORD_LENGTH = 8;
// scrypt hashes any length, but an unbounded password is a cheap way to burn CPU.
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_LENGTH = 64;
const TOKEN_TTL = '7d';
const JWT_ALGORITHM = 'HS256';

const INVALID_CREDENTIALS = 'Incorrect email or password.';

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Auth] JWT_SECRET is not set');
    throw new ServiceError(503, 'Sign-in is unavailable right now. Try again later.');
  }
  return secret;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Returns the normalised credentials, or throws a 400 naming the first problem.
function validateCredentials(rawEmail, rawPassword) {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
    throw new ServiceError(400, 'Enter a valid email address.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(400, `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ServiceError(400, `Keep your password under ${MAX_PASSWORD_LENGTH} characters.`);
  }
  return { email, password };
}

function publicUser(user) {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

function issueToken(user) {
  return jwt.sign({ email: user.email }, jwtSecret(), {
    subject: user.id,
    expiresIn: TOKEN_TTL,
    algorithm: JWT_ALGORITHM,
  });
}

async function signup(rawEmail, rawPassword) {
  const { email, password } = validateCredentials(rawEmail, rawPassword);
  // Fail before creating an account we couldn't sign a token for.
  jwtSecret();
  const user = await db.createUser({ email, passwordHash: await hashPassword(password) });
  if (!user) {
    throw new ServiceError(409, 'An account with this email already exists. Log in instead.');
  }
  return { token: issueToken(user), user: publicUser(user) };
}

async function login(rawEmail, rawPassword) {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    throw new ServiceError(401, INVALID_CREDENTIALS);
  }
  const user = await db.findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ServiceError(401, INVALID_CREDENTIALS);
  }
  return { token: issueToken(user), user: publicUser(user) };
}

// Returns the user id from a valid token, or null for a missing, expired or forged one.
function verifyToken(token) {
  const secret = jwtSecret();
  try {
    return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }).sub ?? null;
  } catch {
    return null;
  }
}

async function currentUser(userId) {
  const user = await db.findUserById(userId);
  if (!user) throw new ServiceError(401, 'Your session has ended. Log in again.');
  return publicUser(user);
}

module.exports = { signup, login, verifyToken, currentUser, hashPassword, verifyPassword };
