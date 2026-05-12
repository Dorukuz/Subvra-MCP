import { ensureIndexes } from "../lib/db/indexes";
import clientPromise, { getDb } from "../lib/mongodb";

async function main() {
  console.log("[setup-db] Connecting to MongoDB...");
  const db = await getDb();
  const client = await clientPromise;

  console.log("[setup-db] Connected to database:", db.databaseName);

  console.log("[setup-db] Creating indexes...");
  await ensureIndexes();
  console.log("[setup-db] Indexes created successfully");

  const collections = await db.listCollections().toArray();
  console.log(
    "[setup-db] Collections:",
    collections.map((c) => c.name).join(", ") || "(none yet — will be created on first write)"
  );

  await client.close();
  console.log("[setup-db] Done");
}

main().catch((err) => {
  console.error("[setup-db] Failed:", err);
  process.exit(1);
});
