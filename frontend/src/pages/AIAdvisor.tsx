import { Send, Bot, Globe } from "lucide-react";
import { useState } from "react";

const AIAdvisor = () => {
  const [language, setLanguage] = useState("both");
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "ai",
      content:
        "👋 नमस्ते! I am AgriBot, your personal farming advisor. I can help you with crops, soil, fertilizers, harvesting, government schemes, and much more. Tell me where you are from and what you are growing 🌾",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Generate or retrieve a stable sessionId for this browser
  const getSessionId = (): string => {
    let id = localStorage.getItem("agriSessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("agriSessionId", id);
    }
    return id;
  };

  // 🌾 Fetch response from backend /chat endpoint
  const fetchAgriResponse = async (prompt: string): Promise<string> => {
    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          language,
          sessionId: getSessionId(),
        }),
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
    if (!inputMessage.trim() || isTyping) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    const reply = await fetchAgriResponse(inputMessage);

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
    return "Ask in Hindi or English... / हिंदी या अंग्रेजी में पूछें...";
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
            🌾 AgriBot — AI Agriculture Advisor
          </h1>
          <p className="text-gray-600">
            24/7 smart farming assistant powered by your local knowledge base
          </p>

          {/* Language Switcher */}
          <div className="mt-4 flex justify-center items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Language:</span>
            <div className="flex bg-gray-100 rounded-md overflow-hidden">
              {["hindi", "english", "both"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 text-sm transition-colors ${language === lang
                      ? "bg-green-600 text-white"
                      : "text-gray-700 hover:bg-gray-200"
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
          <div className="h-[500px] overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {msg.type === "ai" && (
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <div className="bg-green-100 p-1.5 rounded-full">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[75%] shadow-sm ${msg.type === "user"
                      ? "bg-green-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-900 rounded-tl-sm"
                    }`}
                >
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${msg.type === "user" ? "text-green-200" : "text-gray-400"
                      }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 p-1.5 rounded-full">
                  <Bot className="h-4 w-4 text-green-600" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="border-t p-4 flex items-center space-x-3 bg-gray-50">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={getPlaceholder()}
              disabled={isTyping}
              className="flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white disabled:opacity-60"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          AgriBot may make mistakes. Always verify critical advice with a local expert.
        </p>
      </div>
    </div>
  );
};

export default AIAdvisor;