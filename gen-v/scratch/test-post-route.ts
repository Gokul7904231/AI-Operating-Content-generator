async function main() {
  const payload = {
    topic: "Japan Geo Quiz",
    style: "quiz",
    contentType: "QUIZ_SHORTS",
    hook: "Japan has 7000 islands",
    questions: [
      { question: "What is the capital?", options: ["Tokyo", "Osaka"], answer: "Tokyo" }
    ],
    title: `Japan Quiz`,
    description: "test",
    hashtags: ["quiz"],
    renderProfile: "AUTO",
    durationSeconds: 60,
  };

  try {
    const res = await fetch("http://localhost:3000/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response Body:", JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
main();
