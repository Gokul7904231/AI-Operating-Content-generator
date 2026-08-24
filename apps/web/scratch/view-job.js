const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'data', 'shortfactory.db'));

const jobId = process.argv[2];
if (!jobId) {
  console.error("Please specify a jobId.");
  process.exit(1);
}

console.log(`Querying events for job: ${jobId}`);
const rows = db.prepare('SELECT event_type, payload, timestamp FROM workflow_events WHERE job_id = ? ORDER BY timestamp ASC').all(jobId);
rows.forEach(r => {
  console.log(`[${r.timestamp}] Event: ${r.event_type} | Payload: ${r.payload}`);
});
