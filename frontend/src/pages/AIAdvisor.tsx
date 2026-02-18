
import { Send, Bot, Globe } from "lucide-react";
import { useState } from "react";

const AIAdvisor = () => {
  const [language, setLanguage] = useState("both");
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "ai",
      content:
        "👋 नमस्ते! I am your AI Agriculture Advisor. I can answer your questions about crops, weather, diseases, and farming techniques in Hindi or English.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 🌾 Fetch response from backend /chat endpoint
  const fetchGeminiResponse = async (prompt: string) => {
    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, language }),
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      return data.reply;
    } catch (error) {
      console.error("❌ Chat API error:", error);
      return "⚠️ Unable to get a response. Please check if the server is running.";
    }
  };

  // 💬 Handle send
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    const reply = await fetchGeminiResponse(inputMessage);

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      type: "ai",
      content: reply,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const getPlaceholder = () => {
    if (language === "hindi") return "अपना कृषि प्रश्न हिंदी में पूछें...";
    if (language === "english") return "Ask your farming question in English...";
    return "Ask in Hindi or English... / अपना प्रश्न हिंदी या अंग्रेजी में पूछें...";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="bg-green-100 p-3 rounded-full">
              <Bot className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            🌾 AI Agriculture Advisor
          </h1>
          <p className="text-gray-600">
            24/7 smart farming assistant in Hindi & English
          </p>
          <div className="mt-4 flex justify-center items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              Language:
            </span>
            <div className="flex bg-gray-100 rounded-md overflow-hidden">
              {["hindi", "english", "both"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 text-sm ${language === lang
                    ? "bg-green-600 text-white"
                    : "text-gray-700"
                    }`}
                >
                  {lang === "hindi"
                    ? "हिंदी"
                    : lang === "english"
                      ? "English"
                      : "Both"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Box */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="h-96 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[75%] ${msg.type === "user"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-900"
                    }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-green-600" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="border-t p-4 flex items-center space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={getPlaceholder()}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
