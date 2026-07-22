const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "..", "data", "shortfactory.db");
const db = new Database(dbPath);

console.log("=== shortfactory.db Jobs ===");
const rows = db.prepare("SELECT * FROM render_jobs").all();
console.log(JSON.stringify(rows, null, 2));
