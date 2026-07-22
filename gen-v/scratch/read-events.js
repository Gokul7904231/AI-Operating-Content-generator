const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "shortfactory.db");
const db = new Database(dbPath);

console.log("=== CHECKPOINTS ===");
const checkpoints = db.prepare("SELECT * FROM job_checkpoints ORDER BY updated_at DESC LIMIT 5").all();
console.log(JSON.stringify(checkpoints, null, 2));

console.log("\n=== RECENT EVENTS ===");
const events = db.prepare("SELECT * FROM workflow_events ORDER BY timestamp DESC, id DESC LIMIT 20").all();
events.forEach(e => {
  console.log(`[${e.timestamp}] Job: ${e.job_id} | Event: ${e.event_type} | Payload: ${e.payload}`);
});
