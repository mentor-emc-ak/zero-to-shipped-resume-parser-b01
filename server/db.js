const { MongoClient, ObjectId } = require('mongodb');

const CLUSTER_HOST = 'cluster0.eflepo0.mongodb.net';
const DB_NAME = 'resume_scorer';
const DUPLICATE_KEY = 11000;

let clientPromise;

// One client per process; serverless instances reuse it across warm invocations.
function getClient() {
  if (!clientPromise) {
    const { MONGODB_USERNAME, MONGODB_PASSWORD } = process.env;
    if (!MONGODB_USERNAME || !MONGODB_PASSWORD) {
      return Promise.reject(new Error('MONGODB_USERNAME and MONGODB_PASSWORD must be set'));
    }
    const uri =
      `mongodb+srv://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}` +
      `@${CLUSTER_HOST}/?appName=Cluster0`;
    clientPromise = new MongoClient(uri).connect().catch((err) => {
      clientPromise = undefined;
      throw err;
    });
  }
  return clientPromise;
}

async function saveScore(record) {
  const client = await getClient();
  const { insertedId } = await client
    .db(DB_NAME)
    .collection('scores')
    .insertOne({ ...record, createdAt: new Date() });
  return insertedId.toString();
}

let usersPromise;

// Resolves the users collection once per process, with the unique email index in place.
function getUsers() {
  if (!usersPromise) {
    usersPromise = getClient()
      .then(async (client) => {
        const users = client.db(DB_NAME).collection('users');
        await users.createIndex({ email: 1 }, { unique: true });
        return users;
      })
      .catch((err) => {
        usersPromise = undefined;
        throw err;
      });
  }
  return usersPromise;
}

// Returns null when the email is already registered.
async function createUser({ email, passwordHash }) {
  const users = await getUsers();
  const createdAt = new Date();
  try {
    const { insertedId } = await users.insertOne({ email, passwordHash, createdAt });
    return { id: insertedId.toString(), email, createdAt };
  } catch (err) {
    if (err.code === DUPLICATE_KEY) return null;
    throw err;
  }
}

async function findUserByEmail(email) {
  const users = await getUsers();
  const user = await users.findOne({ email });
  return user && { id: user._id.toString(), email: user.email, passwordHash: user.passwordHash, createdAt: user.createdAt };
}

async function findUserById(id) {
  if (!ObjectId.isValid(id)) return null;
  const users = await getUsers();
  const user = await users.findOne({ _id: new ObjectId(id) }, { projection: { passwordHash: 0 } });
  return user && { id: user._id.toString(), email: user.email, createdAt: user.createdAt };
}

module.exports = { saveScore, createUser, findUserByEmail, findUserById };
