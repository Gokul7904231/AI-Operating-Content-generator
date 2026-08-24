async function testVoice(voiceId: string, name: string) {
  const apiKey = "sk_4cf0274877b87d02b6affb8d24ff23aa993dd8bdc935e6c6";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text: "Test.",
        model_id: "eleven_multilingual_v2"
      })
    });
    console.log(`Voice [${name}] (${voiceId}) -> Status: ${res.status}`);
  } catch (err: any) {
    console.log(`Voice [${name}] (${voiceId}) -> Failed: ${err.message}`);
  }
}

async function main() {
  const voices = [
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
    { id: "JBF2otHqdsk7DIPmgv5K", name: "George" },
    { id: "IKne3meq5aC2w977asgk", name: "Charlie" },
    { id: "XB0fDUnexPPtxSp63iAC", name: "Charlotte" }
  ];
  
  console.log("Testing multiple voices against ElevenLabs API...");
  for (const v of voices) {
    await testVoice(v.id, v.name);
  }
}

main();

export {};
