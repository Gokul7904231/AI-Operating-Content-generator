async function main() {
  const text = "Japan has 7,000 islands — but do you know the facts that even Japanese miss?";
  const url1 = `https://edge-tts.vercel.app/api/tts?text=${encodeURIComponent(text)}&voice=en-US-GuyNeural&speed=+0%`;
  const url2 = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=1`;

  console.log("Fetching from url1:", url1);
  try {
    const res = await fetch(url1);
    const buf = await res.arrayBuffer();
    console.log("url1 ok:", res.ok, "status:", res.status, "size:", buf.byteLength);
    if (buf.byteLength < 2000) {
      console.log("url1 body:", Buffer.from(buf).toString());
    }
  } catch (err: any) {
    console.log("url1 error:", err.message);
  }

  console.log("\nFetching from url2:", url2);
  try {
    const res = await fetch(url2);
    const buf = await res.arrayBuffer();
    console.log("url2 ok:", res.ok, "status:", res.status, "size:", buf.byteLength);
    if (buf.byteLength < 2000) {
      console.log("url2 body:", Buffer.from(buf).toString());
    }
  } catch (err: any) {
    console.log("url2 error:", err.message);
  }
}
main();
