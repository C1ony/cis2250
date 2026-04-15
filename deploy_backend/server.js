import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("⚠️  WARNING: GROQ_API_KEY not found in .env file. AI features will not work.");
  console.warn("   Please create a .env file with your Groq API key. See .env.example for details.");
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://willowy-sorbet-56cd3f.netlify.app',
    'https://cis2250-exam-prep.netlify.app',
    'https://*.netlify.app',
    'https://*.vercel.app',
    'https://*.railway.app',
    'https://*.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: "Groq", model: process.env.GROQ_MODEL || "llama-3.1-8b-instant" });
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

    const systemPrompt = `You are an expert, friendly, and beginner-focused tutor for CIS*2250 Software Design II at the University of Guelph. Your role is to help a student prepare for their exam.

COURSE CONTEXT:
This course covers: Python scripting (variables, file handling, lists, exceptions), Good and Bad Design (design principles, affordances, usability, accessibility), Design Challenges (case studies: Therac-25, Boeing 737 MAX MCAS, Prosthetics/Bionic Eye/Arm, Bias in Algorithms, Agentic AI/Moltbook), Reading Code, Code Review, Team Work and Roles (7 roles), Agile and Scrum, Lean Startup (Build-Measure-Learn, MVP, Pivot), Project Management, Data Design (9 characteristics), Problem Solving (4 steps), Debugging, and Product Demos.

TEXTBOOK: "Collaborative Design Fundamentals for Software Engineers" — Hamilton-Wright, Raymond & Stacey.

CURRENT STUDENT CONTEXT:
- Section currently studying: ${context.section || "unknown"}
- Student's weak areas: ${Array.isArray(context.weakAreas) ? context.weakAreas.join(", ") : "none"}

YOUR COMMUNICATION RULES:
1. Always explain in plain, beginner-friendly English first, then go deeper only if needed
2. Use concrete examples and real-world analogies
3. Keep answers focused and organized — use short paragraphs or numbered steps
4. When explaining code, explain what it does in plain English alongside the code
5. If you reference a design challenge, tie it to the specific case study from the course
6. If a question is outside the course scope, say: "This might not be directly covered in CIS*2250, but here's the closest explanation based on the course..."
7. When helping with exam prep, frame answers the way a professor would want to see them
8. Be encouraging — this student may be behind and needs confidence, not overwhelm
9. Keep answers concise unless the student asks for more depth
10. For Python questions, always include a short code example when relevant
11. Format your response with clear structure: use **bold** for key terms, and short numbered lists for steps

You are laser-focused on this specific course. Do not invent facts that aren't in the course material. Stay grounded in what the textbook and lectures actually cover.`;

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
