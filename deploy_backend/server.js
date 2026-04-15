import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("⚠️ WARNING: GROQ_API_KEY not found in .env file.");
}

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "https://cis2250exam.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "Groq",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant"
  });
});

app.post("/api/ask", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in .env" });
    }

    const { messages, context = {} } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    const systemPrompt = `You are an expert, friendly, and beginner-focused tutor for CIS*2250 Software Design II at the University of Guelph.

CURRENT STUDENT CONTEXT:
- Section currently studying: ${context.section || "unknown"}
- Student's weak areas: ${Array.isArray(context.weakAreas) ? context.weakAreas.join(", ") : "none"}

RULES:
1. Explain simply first
2. Use examples
3. Stay course-focused
4. Be concise unless asked for more`;

    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ]
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        error: data?.error?.message || "Upstream AI request failed"
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "No response returned.";
    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
