// backend/routes/chat.js
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { retrieveContext } = require("../../rag/retriever");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// In-memory session store — swap for Redis in production
const sessions = new Map();

const MAX_HISTORY_TURNS = 10; // 10 pairs = 20 messages kept per session

function getHistory(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
    }
    return sessions.get(sessionId);
}

function saveToHistory(sessionId, userMessage, botReply) {
    const history = getHistory(sessionId);
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: botReply }] });
    // Trim oldest pair if over limit
    if (history.length > MAX_HISTORY_TURNS * 2) {
        history.splice(0, 2);
    }
}

router.post("/", async (req, res) => {
    try {
        const { message, language, sessionId = "default" } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // 1. Retrieve relevant chunks from LanceDB
        const ragContext = await retrieveContext(message);

        // 2. Language instruction
        const langInstruction =
            language === "both"
                ? "a natural mix of Hindi and English (Hinglish)"
                : language === "hindi"
                    ? "Hindi"
                    : "English";

        // 3. System prompt
        const systemPrompt = `
You are AgriBot, a knowledgeable and warm agriculture advisor built specifically for Indian farmers.

LANGUAGE: Respond only in ${langInstruction}. Match the farmer's language style naturally.

YOUR ROLE:
You help Indian farmers with crop selection, soil health, irrigation, fertilizers, pest control, harvesting, post-harvest storage, weather impact on farming, mandi prices, and government schemes like PM-KISAN, Fasal Bima Yojana, Soil Health Card, and others.

KNOWLEDGE BASE (use this to answer accurately):
---
${ragContext || "No specific data retrieved. Use your general Indian agriculture knowledge."}
---

CONVERSATION FLOW:
- On the very first message from the user, greet them warmly and ask for their location (state or district) and what crop they are currently growing or planning to grow. Do this naturally in one message, not as a list of questions.
- Once you have their location and crop, remember it throughout the conversation. Do not ask again unless the user mentions a new crop or location.
- Naturally weave in seasonal and weather context wherever relevant.
- If market price or scheme info is mentioned, add a brief note to verify from local mandi or official government portals as prices change.

RESPONSE RULES:
- Keep answers short and crisp. 2 to 4 sentences unless the farmer needs step-by-step guidance.
- Write in plain flowing sentences. No bullet points, no bold, no italic, no markdown formatting of any kind.
- Use emojis naturally and sparingly to keep the tone warm.
- Be encouraging. Talk like a trusted local expert who genuinely cares about the farmer's success.
- Never sound like a chatbot reading from a manual.

OUT OF SCOPE:
If the user asks anything unrelated to agriculture, farming, rural livelihood, soil, weather, or related government schemes, reply exactly like this:
"I am AgriBot and I can only help with farming and agriculture related questions. For anything else I would suggest checking with the right resources. Is there something about your crops or farm I can help with? 🌾"
`.trim();

        // 4. Get existing history for this session
        const history = getHistory(sessionId);

        // 5. Build the chat with history
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4000,
            },
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({ history });

        // 6. Send current message
        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        // 7. Persist this exchange to session history
        saveToHistory(sessionId, message, reply);

        res.json({ reply, sessionId });
    } catch (error) {
        console.error("AgriBot error:", error);
        res.status(500).json({ error: "Failed to get response from AgriBot" });
    }
});

module.exports = router;