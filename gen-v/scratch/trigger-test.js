const http = require('http');

function post(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
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

async function main() {
  console.log("Triggering Voice Diagnostics POST API...");
  try {
    const postRes = await post('http://127.0.0.1:3000/api/voice/registry');
    console.log("POST API Response (Diagnostics):", JSON.stringify(postRes, null, 2));

    console.log("\nFetching Voice Registry GET API...");
    const getRes = await get('http://127.0.0.1:3000/api/voice/registry');
    console.log("GET API Response (Registry State):", JSON.stringify(getRes, null, 2));
  } catch (err) {
    console.error("Failed to fetch API:", err.message);
    console.log("Please check if next dev server is running on port 3000.");
  }
}

main();
