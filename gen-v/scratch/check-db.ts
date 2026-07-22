import Database from "better-sqlite3";
import path from "path";

function main() {
  const dbPath = path.resolve(process.cwd(), "data", "shortfactory.db");
  const db = new Database(dbPath);
  
  const jobs = db.prepare("SELECT * FROM render_jobs").all();
  console.log(`Total jobs in database: ${jobs.length}`);
  for (const job of jobs) {
    console.log(`- JobId: ${job.job_id} | Status: ${job.status} | Attempts: ${job.attempts} | Last Error: ${job.last_error}`);
  }
}
main();
