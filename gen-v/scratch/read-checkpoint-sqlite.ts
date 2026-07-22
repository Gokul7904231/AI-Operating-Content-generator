import { CheckpointDB } from "../lib/core/CheckpointDB";

async function main() {
  const jobId = "job_5f33853986a0b6d9";
  console.log(`Checking SQLite checkpoint for ${jobId}...`);
  try {
    const cp = CheckpointDB.getCheckpoint(jobId);
    if (cp) {
      console.log("Checkpoint Status:", cp.status);
      console.log("Current Step:", cp.current_step);
      console.log("Outputs:", JSON.stringify(JSON.parse(cp.outputs), null, 2));
    } else {
      console.log("No checkpoint found in SQLite for this jobId.");
    }
  } catch (err: any) {
    console.error("SQLite Read Error:", err.message);
  }
}
main();
