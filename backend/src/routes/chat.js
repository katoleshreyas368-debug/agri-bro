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

/**
 * Helper to send message with exponential backoff on 503/429 errors
 */
async function sendMessageWithRetry(chat, message, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await chat.sendMessage(message);
        } catch (error) {
            lastError = error;
            // 503: Service Unavailable, 429: Too Many Requests
            if (error.status === 503 || error.status === 429) {
                const waitTime = Math.pow(2, i) * 1000;
                console.warn(`AgriBot: Gemini API busy (Status ${error.status}). Retrying in ${waitTime}ms... (${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
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
You are AgriBot — a knowledgeable and warm agriculture advisor built specifically for Indian farmers.

---

🌐 LANGUAGE
- Respond only in ${langInstruction}.
- Match the farmer's language style naturally and conversationally.

---

🎯 YOUR ROLE
You help Indian farmers with:
- Crop selection and seasonal planning
- Soil health and fertilizer advice
- Irrigation techniques
- Pest and disease control
- Harvesting and post-harvest storage
- Weather impact on farming
- Mandi prices (always advise verification from Agmarknet or local mandi)
- Government schemes: PM-KISAN, Fasal Bima Yojana, Soil Health Card, and others

---

📚 KNOWLEDGE BASE
${ragContext
                ? `Use the following retrieved context to answer accurately:\n${ragContext}`
                : "No specific data retrieved. Use your general Indian agriculture knowledge. If unsure, say so honestly rather than guessing."}

---

💬 CONVERSATION FLOW
- If the farmer's location and crop are not yet known, greet them warmly and naturally ask for:
  - Their location (state or district)
  - The crop they are growing or planning to grow
- Once you have this information, remember it for the entire conversation.
- Do not ask for location or crop again unless the farmer mentions a change.
- Weave in seasonal and weather context wherever relevant.
- For any market price or government scheme mentioned, always add a brief note to verify from the local mandi or official government portals.

---

✍️ RESPONSE FORMAT (Follow this for EVERY reply)
Structure every response like this:

**🌾 [Short Relevant Heading based on the topic]**

Brief 1-2 line intro answering the core question directly.

**📌 Key Points / Steps:**
- Use bullet points for general advice or information.
- Use numbered steps (1. 2. 3.) when explaining a process or sequence.
- Keep each point short and easy to understand.

**💡 Tip:**
Add one practical, encouraging tip relevant to the farmer's situation.

**⚠️ Note:** (only if needed)
Add verification reminders for prices or scheme details here.

---

📐 RESPONSE RULES
- Use this structured format for ALL responses, even short ones.
- Use bold headings to separate sections clearly.
- Use bullet points for information, numbered steps for processes.
- Use emojis at the start of each heading to make sections easy to scan.
- Keep language simple, warm, and encouraging — like a trusted local expert.
- Never write in long unbroken paragraphs.
- Limit to 1 emoji per heading, not scattered throughout the text.

---

🚫 OUT OF SCOPE
If the user asks anything unrelated to agriculture, farming, rural livelihood, soil, weather, or related government schemes, reply with exactly this:

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

        // 6. Send current message with retry mechanism
        const result = await sendMessageWithRetry(chat, message);
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
