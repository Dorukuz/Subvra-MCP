import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/subvra";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Same database the app uses for wallets, users, and generation jobs.
 * Set `MONGODB_DB` when your URI has no path (some Atlas strings) so jobs and credits stay in one DB.
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return dbFromClient(client);
}

/** Use inside MongoClient sessions/transactions so writes use the same DB as `getDb()`. */
export function dbFromClient(client: MongoClient): Db {
  const explicit = process.env.MONGODB_DB?.trim();
  if (explicit) return client.db(explicit);
  return client.db();
}

export default clientPromise;
