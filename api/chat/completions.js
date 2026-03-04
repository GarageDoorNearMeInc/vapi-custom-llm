import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GOOGLE_PHRASES = [
  "google and its partners may record",
  "subject to our privacy policies",
  "record or return this call",
];

function isGoogleGreeting(messages) {
  const lastTwo = messages
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ")
    .toLowerCase();

  return GOOGLE_PHRASES.some((phrase) => lastTwo.includes(phrase));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, model, temperature } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (isGoogleGreeting(messages)) {
    const silent = {
      id: "silent-" + Date.now(),
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta: { content: "" }, finish_reason: "stop" }],
    };
    res.write(`data: ${JSON.stringify(silent)}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  const stream = await openai.chat.completions.create({
    model: model || "gpt-4o-mini",
    messages,
    temperature: temperature ?? 0,
    stream: true,
  });

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
}
