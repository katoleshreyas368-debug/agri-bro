import { Send, Bot, Globe, Search, Plus, Bookmark, Star, Trash2, Users, MoreHorizontal, Settings, MessageSquare, ChevronRight, Paperclip } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("current");

  // Mock topics/recent chats
  const chatTopics = [
    { id: '1', title: 'Wheat Cultivation', icon: '🌾', count: 12, time: '2m ago' },
    { id: '2', title: 'Soil PH Management', icon: '🧪', count: 8, time: '1h ago' },
    { id: '3', title: 'Pest Control - Rice', icon: '🐛', count: 15, time: '3h ago' },
    { id: '4', title: 'Drip Irrigation', icon: '💧', count: 5, time: 'Yesterday' },
    { id: '5', title: 'Organic Fertilizers', icon: '🍃', count: 0, time: '2 days ago' },
  ];

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
    return "Send your message to AgriBot...";
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-brand-surface overflow-hidden flex">
      {/* ══════════════════════════════════════════════════════
          LEFT SIDEBAR (NAVIGATION)
          ══════════════════════════════════════════════════════ */}
      <aside className="w-20 bg-brand-green flex flex-col items-center py-6 gap-8 border-r border-white/10 hidden md:flex">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all">
          <Bot className="text-white h-7 w-7" />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {[
            { id: 'chat', icon: MessageSquare, active: true },
            { id: 'bookmark', icon: Bookmark },
            { id: 'fav', icon: Star },
            { id: 'trash', icon: Trash2 },
            { id: 'users', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              className={`p-3 rounded-2xl transition-all ${item.active ? 'bg-white text-brand-green shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon size={22} />
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center">
          <button className="text-white/60 hover:text-white transition-colors">
            <Settings size={22} />
          </button>
          <div className="w-10 h-10 rounded-full bg-brand-gold border-2 border-white/20 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
            <img src="https://ui-avatars.com/api/?name=Farmer+Ji&background=f9a825&color=fff" alt="User" />
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MIDDLE SIDEBAR (TOPICS)
          ══════════════════════════════════════════════════════ */}
      <aside className="w-80 bg-white border-r border-gray-100 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chats</h2>
          <Search className="text-gray-400 cursor-pointer hover:text-brand-green transition-colors" size={20} />
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Categories</p>
          <div className="space-y-1">
            {[
              { id: 'current', label: 'Current', icon: Users, count: 12 },
              { id: 'bookmark', label: 'Bookmark', icon: Bookmark, count: 25 },
              { id: 'favorites', label: 'Favorites', icon: Star, count: 77 },
              { id: 'trash', label: 'Trash', icon: Trash2, count: 1 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-brand-surface text-brand-green font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <tab.icon size={18} />
                <span className="text-sm">{tab.label}</span>
                <span className="ml-auto text-xs font-semibold opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-green" /> Topics
            </h3>
            <span className="text-xs font-bold text-brand-gold">24</span>
          </div>

          <div className="space-y-4">
            {chatTopics.map((topic) => (
              <div key={topic.id} className="group cursor-pointer">
                <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-brand-surface transition-all border border-transparent hover:border-brand-green/10">
                  <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {topic.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{topic.title}</h4>
                      {topic.count > 0 && <span className="w-5 h-5 bg-brand-green text-white rounded-full flex items-center justify-center text-[10px] font-bold">{topic.count}</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{topic.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-3 bg-brand-green text-white rounded-2xl font-bold text-sm shadow-md hover:bg-brand-green-dark transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> New Conversation
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MAIN CHAT AREA
          ══════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-green-light rounded-2xl flex items-center justify-center">
              <Bot className="text-brand-green h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                AgriBot.ai
                <span className="px-2 py-0.5 bg-brand-green-light text-brand-green text-[10px] font-bold rounded-full uppercase tracking-wider">GPT-4.0 Model</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                <p className="text-xs text-brand-green font-medium underline cursor-pointer">Live Help Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selection Badge Style */}
            <div className="flex bg-brand-surface border border-gray-100 p-1 rounded-xl">
              {["hindi", "english", "both"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${language === lang ? "bg-white text-brand-green shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">
              <Search size={20} />
            </button>
            <button className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        {/* Message Content */}
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8 CustomScrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
              <div className="flex items-start gap-4 max-w-2xl">
                {msg.type === "ai" && (
                  <div className="w-10 h-10 bg-brand-green-light rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="text-brand-green h-5 w-5" />
                  </div>
                )}

                <div className={`p-5 rounded-3xl ${msg.type === "user"
                  ? "bg-brand-green text-white rounded-tr-sm shadow-lg shadow-brand-green/10"
                  : "bg-brand-surface text-gray-700 rounded-tl-sm border border-gray-100"
                  }`}>
                  <p className="text-[14px] leading-relaxed font-medium">
                    {msg.content}
                  </p>

                  <div className={`flex items-center justify-end gap-2 mt-3 pt-3 border-t ${msg.type === "user" ? "border-white/10" : "border-gray-200/50"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.type === "user" ? "text-white/60" : "text-gray-400"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.type === "user" && <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"><CheckCircleIcon size={10} /></div>}
                    {msg.type === "ai" && <div className="p-1 px-2 border rounded-full text-[9px] font-bold border-gray-200 text-gray-400 flex items-center gap-1 hover:bg-white transition-colors cursor-pointer"><Paperclip size={10} /> PDF Info</div>}
                  </div>
                </div>

                {msg.type === "user" && (
                  <div className="w-10 h-10 bg-brand-green text-white rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                    <Users className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-green-light rounded-2xl flex items-center justify-center">
                <Bot className="text-brand-green h-5 w-5" />
              </div>
              <div className="bg-brand-surface p-5 rounded-3xl rounded-tl-sm border border-gray-100">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-brand-green/40 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-brand-green/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-brand-green/40 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-8 py-8 border-t border-gray-100 flex items-center gap-4 bg-white relative">
          <div className="flex-1 relative flex items-center">
            <button className="absolute left-4 p-2 text-gray-400 hover:text-brand-green transition-colors">
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={getPlaceholder()}
              disabled={isTyping}
              className="w-full pl-14 pr-24 py-5 bg-brand-surface border border-transparent focus:border-brand-green/20 focus:bg-white rounded-3xl text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-brand-green/5"
            />
            <div className="absolute right-4 flex items-center gap-2">
              <Globe className="text-brand-green h-5 w-5 animate-pulse" />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-brand-green text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-brand-green/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                <span className="text-sm font-bold">Send</span>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .CustomScrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .CustomScrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb {
          background: #e8f5e9;
          border-radius: 10px;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb:hover {
          background: #2e7d32;
        }
      `}</style>
    </div>
  );
};

// Helper component for checkmark
const CheckCircleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default AIAdvisor;