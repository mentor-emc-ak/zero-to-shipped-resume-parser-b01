const { MongoClient } = require('mongodb');

const CLUSTER_HOST = 'cluster0.eflepo0.mongodb.net';
const DB_NAME = 'resume_scorer';

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

module.exports = { saveScore };
