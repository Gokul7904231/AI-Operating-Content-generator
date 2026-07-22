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
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Dom" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
    { id: "MF3mGyEYCl7XYWbV9VbO", name: "Elli" },
    { id: "TxGEqn7nUaNZTRJjIIwY", name: "Josh" },
    { id: "bV5Zhc7DK3CcR19Pmgv5", name: "Jeremy" }
  ];
  
  console.log("Testing additional pre-made voices against ElevenLabs API...");
  for (const v of voices) {
    await testVoice(v.id, v.name);
  }
}

main();
