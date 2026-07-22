const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'data', 'voice-cache', '256c2c58c9757215b0c18622dd707579f649a93d1367fed6456e6fb5ba7aec03.wav');
const buf = fs.readFileSync(p);
console.log("Size:", buf.length);
console.log("Header (ASCII):", buf.slice(0, 100).toString('ascii'));
console.log("Header (HEX):", buf.slice(0, 44).toString('hex'));
