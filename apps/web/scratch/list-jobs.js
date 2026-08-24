const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'shortfactory.db'));

const jobs = db.prepare("SELECT DISTINCT job_id FROM workflow_events ORDER BY timestamp DESC LIMIT 5").all();
console.log("Recent Jobs:", jobs);
