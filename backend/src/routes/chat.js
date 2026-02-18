const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post('/', async (req, res) => {
    try {
        const { message, language } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.1,
            },
        });

        const systemPrompt = `
      You are AgriBot 🌿, a friendly AI agriculture advisor.
      Respond in ${language === 'both' ? 'a mix of Hindi and English (Hinglish)' : language}.
      Provide helpful, region-specific advice about crops, fertilizers, and farming techniques for India.
      Keep answers short, clear, and friendly with emojis. do not use markups and go with flow greet first then ask them location then ask them their crop details then ask them what do they need and keep the weather in reference also also provide market analysis reffering to nearby location and provide the goverment schemes suitable for the user be verhy friendly but a formal touch, do not use formatting i want no bolds and italics. keep the tone good and enocuraging. do not loose context reply waht the user is saying if needed see previous quires also dont make it feel artificail chat bot its a human friendly bot. do not ask too many questions keep it minimal and to the point. and keep your asnwers short and crisp.
    `;

        const result = await model.generateContent([systemPrompt, message]);
        const reply = result.response.text();

        res.json({ reply });
    } catch (error) {
        console.error('❌ Gemini API error:', error);
        res.status(500).json({ error: 'Failed to get response from AI' });
    }
});

module.exports = router;
