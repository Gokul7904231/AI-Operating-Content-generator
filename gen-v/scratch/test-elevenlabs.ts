async function testElevenLabs() {
  const apiKey = "sk_4cf0274877b87d02b6affb8d24ff23aa993dd8bdc935e6c6";
  console.log("Checking ElevenLabs health/voices...");
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    if (res.ok) {
      console.log(`Found ${data.voices?.length} voices.`);
      for (const v of data.voices.slice(0, 5)) {
        console.log(` - Voice ID: ${v.voice_id} | Name: ${v.name}`);
      }
    } else {
      console.log("Error response:", data);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

testElevenLabs();
