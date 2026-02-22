const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { retrieveContext } = require("../../rag/retriever");
const { requireAuth } = require("../middleware");
const { isMongoEnabled, mongoFind, mongoFindOne, mongoInsertOne, mongoUpdateOne, mongoDeleteMany, makeId, readDB, writeDB } = require("../db");
const { predictDisease } = require("../../ml/loadModel");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'), false);
        }
    }
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Default system instruction generator
const getSystemPrompt = (ragContext, language, predictionContext = "") => {
    const langInstruction =
        language === "both"
            ? "a natural mix of Hindi and English (Hinglish)"
            : language === "hindi"
                ? "Hindi"
                : "English";

    return `
You are AgriBot — a knowledgeable and warm agriculture advisor built specifically for Indian farmers.

---
${predictionContext ? `\n🩺 ACTIVE DIAGNOSIS CONTEXT\n${predictionContext}\nPlease base your treatment and advice on this diagnosis if relevant to the user's question.\n\n` : ''}
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
};

async function sendMessageWithRetry(chat, message, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await chat.sendMessage(message);
        } catch (error) {
            lastError = error;
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

// Ensure JSON DB maps exist for fallback
async function ensureDbCollections() {
    if (!(await isMongoEnabled())) {
        const db = await readDB();
        let changed = false;
        if (!db.chat_topics) { db.chat_topics = []; changed = true; }
        if (!db.chat_messages) { db.chat_messages = []; changed = true; }
        if (changed) await writeDB(db);
    }
}

// Custom DB helper methods mapping to our routes
async function getTopicsForUser(userId) {
    if (await isMongoEnabled()) {
        const topics = await mongoFind('chat_topics', { userId });
        return topics.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    const db = await readDB();
    return (db.chat_topics || []).filter(t => t.userId === userId).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getMessagesForTopic(topicId) {
    if (await isMongoEnabled()) {
        const msgs = await mongoFind('chat_messages', { topicId });
        return msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    const db = await readDB();
    return (db.chat_messages || []).filter(m => m.topicId === topicId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function createTopic(topicDoc) {
    if (await isMongoEnabled()) {
        await mongoInsertOne('chat_topics', topicDoc);
    } else {
        const db = await readDB();
        db.chat_topics.push(topicDoc);
        await writeDB(db);
    }
    return topicDoc;
}

async function updateTopicDB(topicId, updateFields) {
    if (await isMongoEnabled()) {
        await mongoUpdateOne('chat_topics', { id: topicId }, { $set: updateFields });
    } else {
        const db = await readDB();
        const tIndex = db.chat_topics.findIndex(t => t.id === topicId);
        if (tIndex >= 0) {
            db.chat_topics[tIndex] = { ...db.chat_topics[tIndex], ...updateFields };
            await writeDB(db);
        }
    }
}

async function deleteTopicDB(topicId) {
    if (await isMongoEnabled()) {
        await mongoDeleteMany('chat_topics', { id: topicId });
        await mongoDeleteMany('chat_messages', { topicId });
    } else {
        const db = await readDB();
        db.chat_topics = db.chat_topics.filter(t => t.id !== topicId);
        db.chat_messages = db.chat_messages.filter(m => m.topicId !== topicId);
        await writeDB(db);
    }
}

async function createMessage(msgDoc) {
    if (await isMongoEnabled()) {
        await mongoInsertOne('chat_messages', msgDoc);
    } else {
        const db = await readDB();
        db.chat_messages.push(msgDoc);
        await writeDB(db);
    }
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. Get all topics for a logged in user
router.get("/topics", requireAuth, async (req, res) => {
    try {
        await ensureDbCollections();
        const topics = await getTopicsForUser(req.user.id);
        res.json({ topics });
    } catch (error) {
        console.error("Error fetching topics:", error);
        res.status(500).json({ error: "Failed to fetch topics" });
    }
});

// 2. Get all messages for a specific topic
router.get("/topics/:topicId/messages", requireAuth, async (req, res) => {
    try {
        await ensureDbCollections();

        // Verify topic belongs to user
        let topic;
        if (await isMongoEnabled()) {
            topic = await mongoFindOne('chat_topics', { id: req.params.topicId, userId: req.user.id });
        } else {
            const db = await readDB();
            topic = (db.chat_topics || []).find(t => t.id === req.params.topicId && t.userId === req.user.id);
        }

        if (!topic) return res.status(404).json({ error: "Topic not found" });

        const messages = await getMessagesForTopic(req.params.topicId);
        res.json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// 3. Update a topic (Rename, Status, Bookmark, Favorite)
router.put("/topics/:topicId", requireAuth, async (req, res) => {
    try {
        await ensureDbCollections();

        // Verify topic exists for user
        let topic;
        if (await isMongoEnabled()) {
            topic = await mongoFindOne('chat_topics', { id: req.params.topicId, userId: req.user.id });
        } else {
            const db = await readDB();
            topic = (db.chat_topics || []).find(t => t.id === req.params.topicId && t.userId === req.user.id);
        }

        if (!topic) return res.status(404).json({ error: "Topic not found" });

        const allowedFields = ['title', 'isBookmarked', 'isFavorite', 'status'];
        const updateFields = { updatedAt: new Date().toISOString() };

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateFields[field] = req.body[field];
            }
        }

        await updateTopicDB(req.params.topicId, updateFields);
        res.json({ success: true, updated: updateFields });
    } catch (error) {
        console.error("Error updating topic:", error);
        res.status(500).json({ error: "Failed to update topic" });
    }
});

// 4. Delete a topic and its messages entirely
router.delete("/topics/:topicId", requireAuth, async (req, res) => {
    try {
        await ensureDbCollections();

        // Verify topic exists for user
        let topic;
        if (await isMongoEnabled()) {
            topic = await mongoFindOne('chat_topics', { id: req.params.topicId, userId: req.user.id });
        } else {
            const db = await readDB();
            topic = (db.chat_topics || []).find(t => t.id === req.params.topicId && t.userId === req.user.id);
        }

        if (!topic) return res.status(404).json({ error: "Topic not found" });

        await deleteTopicDB(req.params.topicId);
        res.json({ success: true, message: "Topic deleted" });
    } catch (error) {
        console.error("Error deleting topic:", error);
        res.status(500).json({ error: "Failed to delete topic" });
    }
});

// 5. Main Chat generation endpoint
router.post("/", requireAuth, upload.single('image'), async (req, res) => {
    try {
        await ensureDbCollections();

        let message = req.body.message;
        const language = req.body.language || 'english';
        const topicId = req.body.topicId;

        if (!message && !req.file) return res.status(400).json({ error: "Message or image is required" });
        if (!message && req.file) {
            message = "Please analyze this image.";
        }

        let currentTopicId = topicId;
        const now = new Date().toISOString();

        // If no topicId provided, we need to create a new one based on msg
        if (!currentTopicId || currentTopicId === 'new' || currentTopicId.trim() === '') {
            currentTopicId = makeId();
            const first5Words = message.split(' ').slice(0, 5).join(' ');
            const newTopic = {
                id: currentTopicId,
                userId: req.user.id,
                title: first5Words,
                isBookmarked: false,
                isFavorite: false,
                status: 'active',
                createdAt: now,
                updatedAt: now
            };
            await createTopic(newTopic);
        } else {
            // Validate the topic exists
            let topic;
            if (await isMongoEnabled()) {
                topic = await mongoFindOne('chat_topics', { id: currentTopicId, userId: req.user.id });
            } else {
                const db = await readDB();
                topic = (db.chat_topics || []).find(t => t.id === currentTopicId && t.userId === req.user.id);
            }

            if (!topic) {
                return res.status(404).json({ error: "Topic not found or unauthorized to post here." });
            }
            // Update topic timestamp
            await updateTopicDB(currentTopicId, { updatedAt: now });
        }

        let predictionContext = "";
        let dbImageUrl = null;
        let dbCropDetected = null;
        let dbDiseaseDetected = null;
        let dbConfidence = null;
        let queryMessage = message;

        // Output from gemini or fallback
        let replyText = "";
        let isLowConfidence = false;

        if (req.file) {
            try {
                const mlResult = await predictDisease(req.file.buffer);
                dbCropDetected = mlResult.crop;
                dbDiseaseDetected = mlResult.disease;
                dbConfidence = mlResult.confidence;

                if (mlResult.probValue < 0.50) {
                    isLowConfidence = true;
                    replyText = "The image wasn't clear enough. Please try a closer, well-lit photo of the affected leaf.";
                } else {
                    predictionContext = `[Active Disease Diagnosis]: ${mlResult.predictionString} detected with ${mlResult.confidence} confidence.`;
                    queryMessage = `${message || ''} ${mlResult.predictionString}`.trim();
                }

                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(req.file.originalname) || '.jpg';
                const filename = 'chat-img-' + uniqueSuffix + ext;

                // Assuming public/uploads is in backend/public/uploads
                const basePublicDir = path.join(__dirname, '../../public/uploads');
                const uploadPath = path.join(basePublicDir, filename);
                if (!fs.existsSync(basePublicDir)) {
                    fs.mkdirSync(basePublicDir, { recursive: true });
                }
                fs.writeFileSync(uploadPath, req.file.buffer);
                dbImageUrl = `/uploads/${filename}`;
            } catch (err) {
                console.error("ML Prediction error:", err);
            }
        }

        // Save User Message
        const userMsgDoc = {
            id: makeId(),
            topicId: currentTopicId,
            role: "user",
            type: req.file ? "image" : "text",
            text: message || "",
            imageUrl: dbImageUrl,
            cropDetected: dbCropDetected,
            diseaseDetected: dbDiseaseDetected,
            confidence: dbConfidence,
            createdAt: new Date().toISOString()
        };
        await createMessage(userMsgDoc);

        // Retrieve existing history of this topic to pass along context up to limit (last 10 interactions)
        const pastRawMsgs = await getMessagesForTopic(currentTopicId);
        // Only slice out the last 20 elements = 10 interactions to avoid token overflow
        const tailMsgs = pastRawMsgs.slice(-20);

        const history = tailMsgs.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        if (!isLowConfidence) {
            // Retrieve LanceDB Rag Chunk Context
            const ragContext = await retrieveContext(queryMessage);
            const systemPrompt = getSystemPrompt(ragContext, language, predictionContext);

            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 4000,
                },
                systemInstruction: systemPrompt,
            });

            // Initialize Gemini chat with history
            // Exclude the very last user message we just explicitly pushed into DB but haven't given to API as user part natively
            const previousContextHistory = history.slice(0, history.length - 1);
            const aiChat = model.startChat({ history: previousContextHistory });

            const result = await sendMessageWithRetry(aiChat, message || "Please process the image");
            replyText = result.response.text();
        }

        // Save Bot Reply
        const botMsgDoc = {
            id: makeId(),
            topicId: currentTopicId,
            role: "model",
            type: "text",
            text: replyText,
            createdAt: new Date().toISOString()
        };
        await createMessage(botMsgDoc);

        if (req.file) {
            userMsgDoc.agribotResponse = replyText;
            if (await isMongoEnabled()) {
                await mongoUpdateOne('chat_messages', { id: userMsgDoc.id }, { $set: { agribotResponse: replyText } });
            } else {
                const db = await readDB();
                const uIndex = (db.chat_messages || []).findIndex(m => m.id === userMsgDoc.id);
                if (uIndex >= 0) {
                    db.chat_messages[uIndex].agribotResponse = replyText;
                    await writeDB(db);
                }
            }
        }

        res.json({ reply: replyText, topicId: currentTopicId, mlData: { crop: dbCropDetected, disease: dbDiseaseDetected, confidence: dbConfidence, imageUrl: dbImageUrl } });
    } catch (error) {
        console.error("AgriBot error:", error);
        res.status(500).json({ error: "Failed to get response from AgriBot" });
    }
});

module.exports = router;
