async function testElevenLabsValidModel() {
  const apiKey = "sk_4cf0274877b87d02b6affb8d24ff23aa993dd8bdc935e6c6";
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  console.log("Testing ElevenLabs synthesis with eleven_multilingual_v2...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text: "Hello, this is a test of ElevenLabs synthesis with a modern non-deprecated model.",
        model_id: "eleven_multilingual_v2"
      })
    });
    
    console.log("Status:", res.status);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log("SUCCESS! Audio buffer size:", buf.byteLength);
    } else {
      const text = await res.text();
      console.log("Error response:", text);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

testElevenLabsValidModel();
