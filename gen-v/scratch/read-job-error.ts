async function main() {
  const jobId = "job_b2f79b92ada54edf";
  const res = await fetch(`http://localhost:3000/api/job-status/${jobId}`);
  const json = await res.json();
  console.log("Job Error Details:", JSON.stringify(json, null, 2));
}
main();
