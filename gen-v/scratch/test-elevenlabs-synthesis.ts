async function testElevenLabsSynth() {
  const apiKey = "sk_4cf0274877b87d02b6affb8d24ff23aa993dd8bdc935e6c6";
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  console.log("Testing ElevenLabs synthesis...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text: "Hello, this is a test of ElevenLabs synthesis.",
        model_id: "eleven_monolingual_v1"
      })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Length:", text.length);
    if (res.ok) {
      console.log("SUCCESS!");
    } else {
      console.log("Error response:", text);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

testElevenLabsSynth();
