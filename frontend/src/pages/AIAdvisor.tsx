import { Send, Bot, Search, Plus, Bookmark, Star, Trash2, Users, MoreHorizontal, MessageSquare, Paperclip, Edit2, Check, X, Download, Copy, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";

const AIAdvisor = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams();

  // Current tab based on URL path
  const currentPath = location.pathname.split('/').pop() || 'chat';
  const activeTab = currentPath === 'advisor' ? 'chat' : currentPath;

  const [allChats, setAllChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('agriLanguage') || "both");

  // Search state
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Rename state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle language change persistence
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('agriLanguage', lang);
    toast.success(`Language set to ${lang.toUpperCase()}`);
  };

  // 📡 API: Fetch Topics
  const fetchTopics = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/chat/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllChats(data.topics);
      }
    } catch (err) {
      console.error("Failed to fetch topics", err);
    }
  };

  // 📡 API: Fetch Messages
  const fetchMessages = async (id: string) => {
    if (!token || !id) return;
    try {
      setMessages([]);
      const res = await fetch(`${API}/chat/topics/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.messages.map((m: any) => ({
          id: m.id,
          type: m.role === 'user' ? 'user' : 'ai',
          content: m.text,
          imageUrl: m.imageUrl ? (m.imageUrl.startsWith('blob:') ? m.imageUrl : `${API}${m.imageUrl}`) : undefined,
          cropDetected: m.cropDetected,
          diseaseDetected: m.diseaseDetected,
          timestamp: m.createdAt,
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [token]);

  useEffect(() => {
    if (chatId) {
      fetchMessages(chatId);
    } else {
      setMessages([{
        id: "1", type: "ai", content: "👋 नमस्ते! I am AgriBot. How can I help you today?", timestamp: new Date().toISOString()
      }]);
    }
  }, [chatId, token]);

  // 📡 API: Update Topic (Status, Category, Title)
  const updateTopic = async (id: string, updates: any) => {
    if (!token) return;
    setAllChats(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    try {
      const res = await fetch(`${API}/chat/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        fetchTopics();
        toast.error('Failed to update chat');
      }
    } catch (err) {
      fetchTopics();
      toast.error('Failed to update chat');
    }
  };

  // 📡 API: Delete Topic Permanently
  const deleteTopicPermanently = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/chat/topics/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAllChats(prev => prev.filter(c => c.id !== id));
        toast.success('Chat permanently deleted');
        if (chatId === id) navigate('/advisor/chat');
      }
    } catch (err) {
      toast.error('Failed to delete chat');
    }
  };

  // Rename handlers
  const startRename = (id: string, title: string) => {
    setEditingTopicId(id);
    setEditingTitle(title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      updateTopic(id, { title: editingTitle.trim() });
      toast.success('Chat renamed');
    }
    setEditingTopicId(null);
  };

  // Toggles Hook
  const toggleChatStatus = (id: string, field: 'isBookmarked' | 'isFavorite' | 'status', value?: any) => {
    const chat = allChats.find(c => c.id === id);
    let newVal = value;
    if (field !== 'status') newVal = !chat[field];

    updateTopic(id, { [field]: newVal });

    if (field === 'status') {
      toast(newVal === 'trash' ? 'Moved to Trash' : 'Restored from Trash', { icon: newVal === 'trash' ? '🗑️' : '♻️' });
    } else {
      toast.success(newVal ? `Added to ${field.replace('is', '')}s` : `Removed from ${field.replace('is', '')}s`);
    }
  };

  // File upload handlers
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 💬 Handle message send
  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || isTyping) return;

    const tmpId = Date.now().toString();
    const userMsg = { id: tmpId, type: "user", content: inputMessage, imageUrl: imagePreviewUrl, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setInputMessage("");

    const imageToSend = selectedImage;
    clearImage();

    try {
      const formData = new FormData();
      formData.append('message', userMsg.content);
      formData.append('language', language);
      formData.append('topicId', chatId || 'new');
      if (imageToSend) {
        formData.append('image', imageToSend);
      }

      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      setMessages(prev => prev.map(m => m.id === tmpId ? {
        ...m,
        cropDetected: data.mlData?.crop,
        diseaseDetected: data.mlData?.disease,
        imageUrl: data.mlData?.imageUrl ? `${API}${data.mlData.imageUrl}` : m.imageUrl
      } : m));

      const aiMsg = { id: Date.now().toString(), type: "ai", content: data.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);

      if (!chatId && data.topicId) {
        toast.success("New chat created");
        fetchTopics();
        navigate(`/advisor/chat/${data.topicId}`, { replace: true });
      } else {
        fetchTopics();
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AgriBot");
      setIsTyping(false);
    }
  };

  // PDF Export
  const exportChatAsPDF = () => {
    if (messages.length <= 1) return toast.error('No messages to export');

    const doc = new jsPDF();
    const title = allChats.find(t => t.id === chatId)?.title || "AgriBot Chat";

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Exported on ${new Date().toLocaleString()}`, 14, 30);

    let currentY = 40;
    doc.setFontSize(11);
    doc.setTextColor(0);

    messages.forEach((msg) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }

      const role = msg.type === 'user' ? 'You' : 'AgriBot';
      doc.setFont("helvetica", "bold");
      doc.text(`${role} (${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}):`, 14, currentY);
      currentY += 6;

      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(msg.content.replace(/[*_]/g, ""), 180);
      doc.text(splitText, 14, currentY);
      currentY += (splitText.length * 5) + 8;
    });

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    toast.success('PDF Downloaded successfully');
  };

  // Copy chat to clipboard
  const copyChat = () => {
    const text = messages.map(m => `${m.type === 'user' ? 'You' : 'AgriBot'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Chat copied to clipboard');
  };

  // Derived variables
  const filteredTopics = allChats.filter(chat => {
    const matchesSearch = chat.title?.toLowerCase().includes(topicSearchQuery.toLowerCase());

    if (activeTab === 'bookmarks') return chat.isBookmarked && chat.status !== 'trash' && matchesSearch;
    if (activeTab === 'favorites') return chat.isFavorite && chat.status !== 'trash' && matchesSearch;
    if (activeTab === 'trash') return chat.status === 'trash' && matchesSearch;
    return chat.status !== 'trash' && matchesSearch;
  });

  const counts = {
    chat: allChats.filter(c => c.status !== 'trash').length,
    bookmarks: allChats.filter(c => c.isBookmarked && c.status !== 'trash').length,
    favorites: allChats.filter(c => c.isFavorite && c.status !== 'trash').length,
    trash: allChats.filter(c => c.status === 'trash').length,
  };

  const currentTopic = allChats.find(t => t.id === chatId);

  return (
    <div className="h-[calc(100vh-80px)] bg-brand-surface overflow-hidden flex font-poppins">
      <Toaster position="top-right" />
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
            { id: 'chat', icon: MessageSquare, title: 'Chats' },
            { id: 'bookmarks', icon: Bookmark, title: 'Bookmarks' },
            { id: 'favorites', icon: Star, title: 'Favorites' },
            { id: 'trash', icon: Trash2, title: 'Trash' },
          ].map((item) => (
            <button
              key={item.id}
              title={item.title}
              onClick={() => navigate(`/advisor/${item.id}`)}
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
      <aside className="w-80 bg-white border-r border-gray-100 flex flex-col hidden lg:flex h-full">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chats</h2>
          <button onClick={() => setIsSearchOpen(!isSearchOpen)}>
            <Search className={`cursor-pointer transition-colors ${isSearchOpen ? 'text-brand-green' : 'text-gray-400 hover:text-gray-900'}`} size={20} />
          </button>
        </div>

        {isSearchOpen && (
          <div className="px-6 pt-4 pb-2">
            <input
              type="text"
              placeholder="Search topics..."
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-green/50"
            />
          </div>
        )}

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Categories</p>
          <div className="space-y-1">
            {[
              { id: 'chat', label: 'All Chats', icon: MessageSquare, count: counts.chat },
              { id: 'bookmarks', label: 'Bookmarked', icon: Bookmark, count: counts.bookmarks },
              { id: 'favorites', label: 'Favorites', icon: Star, count: counts.favorites },
              { id: 'trash', label: 'Trash', icon: Trash2, count: counts.trash },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/advisor/${tab.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-brand-surface text-brand-green font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <tab.icon size={18} />
                <span className="text-sm">{tab.label}</span>
                <span className="ml-auto text-xs font-semibold opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-green" /> {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Topics
            </h3>
            <span className="text-xs font-bold text-brand-gold">{filteredTopics.length}</span>
          </div>

          <div className="space-y-3">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/advisor/chat/${topic.id}`)}
                className={`group cursor-pointer rounded-2xl transition-all border border-transparent ${chatId === topic.id ? 'bg-brand-surface border-brand-green/20' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 p-3 relative">
                  <div className="w-10 h-10 bg-white shadow-sm flex items-center justify-center rounded-xl group-hover:scale-105 transition-transform flex-shrink-0 text-gray-400">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    {editingTopicId === topic.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(topic.id);
                            if (e.key === 'Escape') setEditingTopicId(null);
                          }}
                          className="w-full text-sm font-bold border-b border-brand-green bg-transparent outline-none p-0"
                        />
                        <Check size={14} className="text-brand-green cursor-pointer" onClick={() => saveRename(topic.id)} />
                        <X size={14} className="text-red-500 cursor-pointer" onClick={() => setEditingTopicId(null)} />
                      </div>
                    ) : (
                      <div className="flex justify-between items-start" onDoubleClick={() => startRename(topic.id, topic.title)}>
                        <h4 className={`text-sm font-bold truncate ${chatId === topic.id ? 'text-brand-green' : 'text-gray-900'}`}>{topic.title}</h4>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(topic.updatedAt).toLocaleDateString()}</p>
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="absolute right-2 bg-white/90 backdrop-blur-sm rounded-lg p-1 hidden group-hover:flex items-center gap-0.5 shadow-sm">
                    {activeTab !== 'trash' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); startRename(topic.id, topic.title); }} className="p-1 hover:text-brand-green text-gray-400" title="Rename"><Edit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'isBookmarked'); }} className={`p-1 ${topic.isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}><Bookmark size={12} fill={topic.isBookmarked ? 'currentColor' : 'none'} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'isFavorite'); }} className={`p-1 ${topic.isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}><Star size={12} fill={topic.isFavorite ? 'currentColor' : 'none'} /></button>
                        <button onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'status', 'trash'); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </>
                    )}
                    {activeTab === 'trash' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); toggleChatStatus(topic.id, 'status', 'active'); }} className="p-1 text-gray-400 hover:text-brand-green" title="Restore"><RefreshCw size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTopicPermanently(topic.id); }} className="p-1 text-gray-400 hover:text-red-600" title="Permanently Delete"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTopics.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                No chats found in this category.
              </div>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => navigate('/advisor/chat')}
            className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 hover:scale-[1.02] transform transition-all active:scale-95 flex items-center justify-center gap-2">
            <Plus size={18} /> New Chat
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
                {currentTopic ? currentTopic.title : "AgriBot.ai"}
                <span className="px-2 py-0.5 bg-brand-green-light text-brand-green text-[10px] font-bold rounded-full uppercase tracking-wider">Flash Model</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                <p className="text-xs text-brand-green font-medium underline cursor-pointer">Live Help Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentTopic && (
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-100 mr-2">
                <button
                  onClick={() => toggleChatStatus(currentTopic.id, 'isBookmarked')}
                  className={`p-2 rounded-xl transition-colors ${currentTopic.isBookmarked ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-white hover:text-amber-500'}`}
                  title="Bookmark"
                >
                  <Bookmark size={16} fill={currentTopic.isBookmarked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => toggleChatStatus(currentTopic.id, 'isFavorite')}
                  className={`p-2 rounded-xl transition-colors ${currentTopic.isFavorite ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-white hover:text-red-500'}`}
                  title="Favorite"
                >
                  <Star size={16} fill={currentTopic.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => exportChatAsPDF()}
                  className="p-2 rounded-xl text-gray-400 hover:bg-white hover:text-brand-green transition-colors"
                  title="Export PDF"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => copyChat()}
                  className="p-2 rounded-xl text-gray-400 hover:bg-white hover:text-blue-500 transition-colors"
                  title="Copy Chat"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}

            {/* Language Selection */}
            <div className="flex bg-brand-surface border border-gray-100 p-1 rounded-xl">
              {["hindi", "english", "both"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-4 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg transition-all ${language === lang ? "bg-white text-brand-green shadow-sm" : "text-gray-400 hover:text-gray-800"}`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <button className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        {/* Message Content */}
        {activeTab === 'chat' || chatId ? (
          <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8 CustomScrollbar">
            {messages.length === 0 && !isTyping && (
              <div className="text-center text-gray-400 text-sm py-10">No messages yet. Send a message to start!</div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-start gap-4 max-w-2xl">
                  {msg.type === "ai" && (
                    <div className="w-10 h-10 bg-brand-green-light rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border border-brand-green/10">
                      <Bot className="text-brand-green h-5 w-5" />
                    </div>
                  )}

                  <div className={`p-5 rounded-3xl ${msg.type === "user"
                    ? "bg-brand-green text-white rounded-tr-sm shadow-lg shadow-brand-green/20"
                    : "bg-brand-surface text-gray-800 rounded-tl-sm border border-gray-200 shadow-sm"
                    }`}>
                    {msg.imageUrl && (
                      <div className="mb-4">
                        <img src={msg.imageUrl} alt="Uploaded crop" className="max-w-xs rounded-xl shadow-sm border border-white/20" />
                        {msg.cropDetected && msg.diseaseDetected && (
                          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 shadow-sm text-white text-[11px] font-bold uppercase tracking-wider">
                            🔴 {msg.cropDetected} {msg.diseaseDetected}
                          </div>
                        )}
                      </div>
                    )}
                    {msg.content && (
                      <div className={`markdown-content text-sm leading-relaxed ${msg.type === "user" ? "text-white" : ""}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-2 mt-4 pt-3 border-t ${msg.type === "user" ? "border-white/20" : "border-gray-200"}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.type === "user" ? "text-white/80" : "text-gray-400"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.type === "user" && <div className="text-white/80"><Check size={12} /></div>}
                      {msg.type === "ai" && (
                        <div onClick={exportChatAsPDF} className="p-1.5 px-3 border rounded-xl text-[10px] font-bold border-gray-200 text-gray-500 flex items-center gap-1 hover:bg-white hover:text-brand-green transition-colors cursor-pointer shadow-sm bg-gray-50"><Download size={12} /> PDF Info</div>
                      )}
                    </div>
                  </div>

                  {msg.type === "user" && (
                    <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                      <Users className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-green-light rounded-2xl flex items-center justify-center shadow-sm">
                  <Bot className="text-brand-green h-5 w-5" />
                </div>
                <div className="bg-brand-surface px-6 py-4 rounded-3xl rounded-tl-sm border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="text-xs font-semibold text-gray-400">Analyzing your crop image...</div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-brand-green/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-green/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-brand-green/60 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50/50">
            <div className="w-24 h-24 bg-white shadow-xl rounded-full flex items-center justify-center mb-8 text-gray-300">
              <Bot size={48} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Welcome to your AgriBot Vault</h2>
            <p className="text-gray-500 font-medium max-w-sm mb-10">Select a chat from the sidebar or start a new conversation to get instant farming assistance.</p>
            <button
              onClick={() => navigate('/advisor/chat')}
              className="px-8 py-4 bg-brand-green text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-green/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Plus size={18} /> Start New Chat
            </button>
          </div>
        )}

        {/* Input Area */}
        {(activeTab === 'chat' || chatId) && currentTopic?.status !== 'trash' && (
          <div className="px-8 py-6 border-t border-gray-100 flex flex-col gap-3 bg-white relative">
            {imagePreviewUrl && (
              <div className="relative inline-block w-max">
                <img src={imagePreviewUrl} alt="preview" className="h-20 w-20 object-cover rounded-xl border border-gray-200 shadow-sm" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex-1 relative flex items-center">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={handleAttachmentClick}
                className="absolute left-4 p-2 text-gray-400 hover:text-brand-green transition-colors"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={language === 'hindi' ? "अपना कृषि प्रश्न हिंदी में पूछें..." : "Ask your farming question..."}
                disabled={isTyping}
                className="w-full pl-14 pr-32 py-5 bg-brand-surface border border-gray-200 focus:border-brand-green focus:bg-white rounded-3xl text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-brand-green/10"
              />
              <div className="absolute right-4 flex items-center gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && !selectedImage) || isTyping}
                  className="bg-brand-green text-white px-6 py-3 rounded-2xl shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark transition-all flex items-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                >
                  <span className="text-sm font-bold uppercase tracking-wider">Send</span>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Read-only overlay if in trash */}
        {currentTopic?.status === 'trash' && (
          <div className="px-8 py-6 border-t border-red-100 bg-red-50 text-center text-red-500 font-bold text-sm">
            This chat is in the trash. Restore it to continue the conversation.
          </div>
        )}
      </main>

      <style>{`
        .CustomScrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .CustomScrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          font-weight: 800; margin-top: 1rem; margin-bottom: 0.5rem;
        }
        .markdown-content p { margin-bottom: 0.75rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-content li { margin-bottom: 0.25rem; }
        .markdown-content strong { font-weight: 700; }
      `}</style>
    </div>
  );
};

export default AIAdvisor;