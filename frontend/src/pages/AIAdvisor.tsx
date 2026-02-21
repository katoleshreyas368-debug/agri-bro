import { Send, Bot, Globe, Search, Plus, Bookmark, Star, Trash2, Users, MoreHorizontal, MessageSquare, Paperclip } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation, useParams } from "react-router-dom";

const AIAdvisor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams();

  // Current tab based on URL path
  const currentPath = location.pathname.split('/').pop() || 'chat';
  const activeTab = currentPath === 'advisor' ? 'chat' : currentPath;

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

  // Stateful Chat data
  const [allChats, setAllChats] = useState([
    { id: '1', title: 'Wheat Cultivation', icon: '🌾', count: 12, time: '2m ago', isBookmarked: false, isFavorite: true, status: 'active' },
    { id: '2', title: 'Soil PH Management', icon: '🧪', count: 8, time: '1h ago', isBookmarked: true, isFavorite: false, status: 'active' },
    { id: '3', title: 'Pest Control - Rice', icon: '🐛', count: 15, time: '3h ago', isBookmarked: false, isFavorite: false, status: 'active' },
    { id: '4', title: 'Drip Irrigation', icon: '💧', count: 5, time: 'Yesterday', isBookmarked: true, isFavorite: true, status: 'active' },
    { id: '5', title: 'Organic Fertilizers', icon: '🍃', count: 0, time: '2 days ago', isBookmarked: false, isFavorite: false, status: 'trash' },
  ]);

  // Handle toggling chat status
  const toggleChatStatus = (id: string, field: 'isBookmarked' | 'isFavorite' | 'status', value?: any) => {
    setAllChats(prev => prev.map(chat => {
      if (chat.id === id) {
        if (field === 'status') return { ...chat, status: value };
        return { ...chat, [field]: !chat[field] };
      }
      return chat;
    }));
  };

  // Filter chats based on activeTab
  const filteredTopics = allChats.filter(chat => {
    if (activeTab === 'bookmarks') return chat.isBookmarked && chat.status !== 'trash';
    if (activeTab === 'favorites') return chat.isFavorite && chat.status !== 'trash';
    if (activeTab === 'trash') return chat.status === 'trash';
    return chat.status === 'active';
  });

  // Calculate counts for categories
  const counts = {
    chat: allChats.filter(c => c.status === 'active').length,
    bookmarks: allChats.filter(c => c.isBookmarked && c.status !== 'trash').length,
    favorites: allChats.filter(c => c.isFavorite && c.status !== 'trash').length,
    trash: allChats.filter(c => c.status === 'trash').length,
  };

  // Helper to handle tab switching
  const handleTabChange = (tabId: string) => {
    if (tabId === 'users') {
      navigate('/community');
    } else {
      navigate(`/advisor/${tabId}`);
    }
  };

  // Generate or retrieve a stable sessionId for this browser
  const getSessionId = (): string => {
    let id = localStorage.getItem("agriSessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("agriSessionId", id);
    }
    return id;
  };

  const [language, setLanguage] = useState("both");

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
    <div className="h-[calc(100vh-80px)] bg-brand-surface overflow-hidden flex">
      {/* ══════════════════════════════════════════════════════
          LEFT SIDEBAR (NAVIGATION)
          ══════════════════════════════════════════════════════ */}
      <aside className="w-20 bg-brand-green flex flex-col items-center py-6 gap-8 border-r border-white/10 hidden md:flex z-30">
        <div
          onClick={() => navigate('/advisor/chat')}
          className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-all">
          <Bot className="text-white h-7 w-7" />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {[
            { id: 'chat', icon: MessageSquare },
            { id: 'bookmarks', icon: Bookmark },
            { id: 'favorites', icon: Star },
            { id: 'trash', icon: Trash2 },
            { id: 'users', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`p-3 rounded-2xl transition-all ${(activeTab === item.id || (item.id === 'chat' && activeTab === 'advisor'))
                ? 'bg-white text-brand-green shadow-lg'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon size={22} />
            </button>
          ))}
        </nav>

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
              { id: 'chat', label: 'Current', icon: MessageSquare, count: counts.chat },
              { id: 'bookmarks', label: 'Bookmark', icon: Bookmark, count: counts.bookmarks },
              { id: 'favorites', label: 'Favorites', icon: Star, count: counts.favorites },
              { id: 'trash', label: 'Trash', icon: Trash2, count: counts.trash },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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
              <MessageSquare size={16} className="text-brand-green" /> {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Topics
            </h3>
            <span className="text-xs font-bold text-brand-gold">{filteredTopics.length}</span>
          </div>

          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/advisor/chat/${topic.id}`)}
                className={`group cursor-pointer rounded-2xl transition-all border border-transparent ${chatId === topic.id ? 'bg-brand-surface border-brand-green/20' : 'hover:bg-brand-surface hover:border-brand-green/10'}`}
              >
                <div className="flex items-center gap-4 p-3 relative">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {topic.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-bold truncate ${chatId === topic.id ? 'text-brand-green' : 'text-gray-900'}`}>{topic.title}</h4>
                      {topic.count > 0 && <span className="w-5 h-5 bg-brand-green text-white rounded-full flex items-center justify-center text-[10px] font-bold">{topic.count}</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{topic.time}</p>
                  </div>

                  {/* Quick Actions (Hover) */}
                  <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'isBookmarked'); }}
                      className={`p-1.5 rounded-lg transition-colors ${topic.isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:text-amber-500 hover:bg-gray-100'}`}
                    >
                      <Bookmark size={14} fill={topic.isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'isFavorite'); }}
                      className={`p-1.5 rounded-lg transition-colors ${topic.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'}`}
                    >
                      <Star size={14} fill={topic.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'status', topic.status === 'trash' ? 'active' : 'trash'); }}
                      className={`p-1.5 rounded-lg transition-colors ${topic.status === 'trash' ? 'text-green-500 bg-green-50' : 'text-gray-300 hover:text-red-500 hover:bg-gray-100'}`}
                    >
                      {topic.status === 'trash' ? <Plus size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/advisor/chat')}
            className="w-full mt-6 py-3 bg-brand-green text-white rounded-2xl font-bold text-sm shadow-md hover:bg-brand-green-dark transition-all flex items-center justify-center gap-2">
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
                {chatId ? allChats.find(t => t.id === chatId)?.title : "AgriBot.ai"}
                <span className="px-2 py-0.5 bg-brand-green-light text-brand-green text-[10px] font-bold rounded-full uppercase tracking-wider">GPT-4.0 Model</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                <p className="text-xs text-brand-green font-medium underline cursor-pointer">Live Help Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {chatId && allChats.find(t => t.id === chatId) && (
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mr-2">
                <button
                  onClick={() => toggleChatStatus(chatId!, 'isBookmarked')}
                  className={`p-2 rounded-xl transition-all ${allChats.find(t => t.id === chatId)?.isBookmarked ? 'bg-amber-100 text-amber-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-amber-500'}`}
                  title="Bookmark"
                >
                  <Bookmark size={18} fill={allChats.find(t => t.id === chatId)?.isBookmarked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => toggleChatStatus(chatId!, 'isFavorite')}
                  className={`p-2 rounded-xl transition-all ${allChats.find(t => t.id === chatId)?.isFavorite ? 'bg-red-100 text-red-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-red-500'}`}
                  title="Favorite"
                >
                  <Star size={18} fill={allChats.find(t => t.id === chatId)?.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => toggleChatStatus(chatId!, 'status', allChats.find(t => t.id === chatId)?.status === 'trash' ? 'active' : 'trash')}
                  className={`p-2 rounded-xl transition-all ${allChats.find(t => t.id === chatId)?.status === 'trash' ? 'bg-green-100 text-green-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-red-500'}`}
                  title={allChats.find(t => t.id === chatId)?.status === 'trash' ? 'Restore' : 'Trash'}
                >
                  {allChats.find(t => t.id === chatId)?.status === 'trash' ? <Plus size={18} /> : <Trash2 size={18} />}
                </button>
              </div>
            )}
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
        {activeTab === 'chat' || chatId ? (
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
                    <div className={`markdown-content text-[14px] leading-relaxed font-medium ${msg.type === "user" ? "prose-invert" : ""}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50/30">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 scale-110 shadow-2xl ${activeTab === 'bookmarks' ? 'bg-amber-100 text-amber-500 shadow-amber-200/20' :
                activeTab === 'favorites' ? 'bg-red-100 text-red-500 shadow-red-200/20' :
                  'bg-gray-100 text-gray-400'
              }`}>
              {activeTab === 'bookmarks' ? <Bookmark size={40} fill="currentColor" /> :
                activeTab === 'favorites' ? <Star size={40} fill="currentColor" /> :
                  <Trash2 size={40} />}
            </div>
            <h2 className="text-3xl font-black text-gray-950 uppercase tracking-tight">{activeTab} Vault</h2>
            <p className="text-gray-400 mt-2 max-w-sm font-medium">
              {filteredTopics.length > 0
                ? `You have ${filteredTopics.length} items in your ${activeTab}. Select one from the sidebar to view details.`
                : `Your ${activeTab} is currently empty. Start interacting with AgriBot to curate your specialized knowledge base.`}
            </p>

            {filteredTopics.length === 0 && (
              <button
                onClick={() => navigate('/advisor/chat')}
                className="mt-8 px-8 py-3.5 bg-brand-green text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-105 transition-all"
              >
                Launch New Advisor Session
              </button>
            )}

            {filteredTopics.length > 0 && (
              <div className="mt-12 grid grid-cols-2 gap-4 max-w-lg">
                {filteredTopics.slice(0, 4).map(topic => (
                  <div
                    key={topic.id}
                    onClick={() => navigate(`/advisor/chat/${topic.id}`)}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3"
                  >
                    <span className="text-xl">{topic.icon}</span>
                    <span className="text-sm font-bold text-gray-900 truncate">{topic.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        {(activeTab === 'chat' || chatId) && (
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
        )}
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

        /* Markdown Styling */
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          font-weight: 800;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: inherit;
        }
        .markdown-content p {
          margin-bottom: 0.75rem;
        }
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        .markdown-content ul, .markdown-content ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-content ul {
          list-style-type: disc;
        }
        .markdown-content ol {
          list-style-type: decimal;
        }
        .markdown-content li {
          margin-bottom: 0.25rem;
        }
        .markdown-content strong {
          font-weight: 700;
        }
        .markdown-content blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1rem;
          color: #64748b;
          font-style: italic;
          margin: 1rem 0;
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