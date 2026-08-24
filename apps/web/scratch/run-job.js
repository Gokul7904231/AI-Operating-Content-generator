const http = require('http');

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length
      }
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== STARTING 60S VIDEO RENDER TIMING RUN ===");
  const payload = {
    topic: "World History Trivia quiz",
    contentType: "QUIZ_SHORTS",
    durationSeconds: 60,
    renderProfile: "FAST_QUIZ"
  };

  try {
    const startJob = await post('http://localhost:3000/api/generate-video', payload);
    console.log("Job Triggered. Response:", JSON.stringify(startJob, null, 2));
    const jobId = startJob.jobId;

    if (!jobId) {
      throw new Error("No jobId returned!");
    }

    console.log(`\nPolling status for job: ${jobId}...`);
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 150) {
      attempts++;
      await sleep(2000);
      const status = await get('http://localhost:3000/api/job-status/' + jobId);
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${status.status}`);
      if (status.status === 'completed' || status.status === 'failed') {
        completed = true;
        console.log("\nJob execution ended.", JSON.stringify(status, null, 2));
        break;
      }
    }

    // Now query the DB events to get the exact timings for each step
    console.log("\nQuerying DB Events for job timings...");
    const dbEvents = await get('http://localhost:3000/api/job-history');
    // Filter history records or read events database directly
    const Database = require('better-sqlite3');
    const path = require('path');
    const db = new Database(path.join(process.cwd(), 'data', 'shortfactory.db'));
    const rows = db.prepare('SELECT event_type, payload, timestamp FROM workflow_events WHERE job_id = ? ORDER BY timestamp ASC').all(jobId);
    
    console.log("\n=== JOB EVENTS LOG ===");
    const stages = [];
    let prevTime = null;

    rows.forEach(row => {
      const payload = JSON.parse(row.payload);
      const time = new Date(row.timestamp).getTime();
      let duration = 0;
      if (prevTime) {
        duration = time - prevTime;
      }
      prevTime = time;
      console.log(`[${row.timestamp}] Event: ${row.event_type} | Payload: ${row.payload} | Step Duration: ${duration}ms`);
      
      if (row.event_type === 'step.completed') {
        stages.push({
          name: payload.stepId,
          durationMs: payload.duration ?? duration
        });
      }
    });

    console.log("\n=== STAGE TIMING SUMMARY ===");
    const totalMs = stages.reduce((acc, s) => acc + s.durationMs, 0);
    console.log(`| Stage Name | Duration (s) | % of Total Time |`);
    console.log(`|------------|--------------|-----------------|`);
    stages.forEach(s => {
      const pct = ((s.durationMs / totalMs) * 100).toFixed(1);
      console.log(`| ${s.name.padEnd(10)} | ${(s.durationMs / 1000).toFixed(2).padStart(12)}s | ${pct.padStart(14)}% |`);
    });
    console.log(`| Total      | ${(totalMs / 1000).toFixed(2).padStart(12)}s |           100% |`);

  } catch (err) {
    console.error("Error running timing verification:", err);
  }
}

main();
