async function testEdgeTTS() {
  const text = "Hello, this is a test of the Microsoft Edge Text-to-Speech synthesis.";
  const voice = "en-US-GuyNeural";
  const url = `https://edge-tts.vercel.app/api/tts?text=${encodeURIComponent(text)}&voice=${voice}&speed=+0%`;
  
  console.log("Querying:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const buf = await res.arrayBuffer();
    console.log("Length:", buf.byteLength);
    if (buf.byteLength < 500) {
      console.log("Content:", Buffer.from(buf).toString("utf8"));
    }
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

testEdgeTTS();

export {};
