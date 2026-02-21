import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Plus, Send, ThumbsUp, Search, SlidersHorizontal, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Hash, TrendingUp, Star, Award, Share2, MoreHorizontal, X, User } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

/* ============================================================
   Community Page — Modern Feed Layout
   ============================================================ */
const ITEMS_PER_PAGE = 5;

const Community: React.FC = () => {
  const { communityPosts, addCommunityPost, addReply, error, clearError } = useData();
  const { user, isAuthenticated } = useAuth();
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newPostData, setNewPostData] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'trending' | 'helpful'>('newest');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All Discussions', icon: Hash, color: 'text-gray-500', bg: 'bg-gray-100' },
    { value: 'tips', label: 'Farming Tips', icon: Star, color: 'text-brand-green', bg: 'bg-brand-green-light' },
    { value: 'schemes', label: 'Govt Schemes', icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'trends', label: 'Market Trends', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, sortBy]);

  /* ── submissions ── */
  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    addCommunityPost({
      title: newPostData.title,
      content: newPostData.content
    });
    setNewPostData({ title: '', content: '' });
    setShowNewPost(false);
  };

  const handleSubmitReply = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!user || !replyContent.trim()) return;
    addReply(postId, { content: replyContent });
    setReplyContent('');
  };

  /* ── filter & sort ── */
  const filteredPosts = communityPosts
    .filter(post => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all'; // In a real app, post would have category
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'trending': return b.replies.length - a.replies.length;
        case 'helpful': return b.replies.length - a.replies.length; // Mock helpful sorting
        default: return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── helpers ── */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-brand-surface">
      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center max-w-7xl mx-auto w-full">
            <X className="h-5 w-5 mr-3 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO / HEADER
          ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="page-header__label">Community</p>
              <h1 className="page-header__title">Community Forum</h1>
              <p className="page-header__subtitle">Connect with fellow farmers, share knowledge, and grow together</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions, authors..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition"
                />
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="bg-brand-green text-white pl-4 pr-5 py-2.5 rounded-xl font-semibold hover:bg-brand-green-dark transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> New Post
                </button>
              )}
            </div>
          </div>

          {/* ── Horizontal Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Active Farmers', value: '2,500+', icon: Users, color: 'text-brand-green', bg: 'bg-brand-green-light' },
              { label: 'Total Discussions', value: communityPosts.length, icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Helpful Answers', value: '95%', icon: ThumbsUp, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Topics Covered', value: categories.length - 1, icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT: SIDEBAR + FEED
          ══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── Left Sidebar ── */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 p-6 transform transition-transform duration-300 lg:static lg:translate-x-0 lg:w-64 lg:flex-shrink-0 lg:rounded-xl lg:border lg:border-gray-200 lg:h-fit lg:sticky lg:top-24
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {/* Mobile close */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Navigations</h3>

            {/* Categories */}
            <div className="mb-6 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pl-2">Categories</p>
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.value
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-gray-600 hover:bg-brand-surface'
                    }`}
                >
                  <cat.icon className={`h-4 w-4 ${selectedCategory === cat.value ? 'text-white' : cat.color}`} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort options */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pl-2">Sort Feed</p>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-green appearance-none cursor-pointer"
                >
                  <option value="newest">Recent Posts</option>
                  <option value="trending">Trending (Most Replies)</option>
                  <option value="helpful">Most Helpful</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Top Contributors (Mock) */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pl-2">Top Contributors</p>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green">
                      <User size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">Farmer {i}</p>
                      <p className="text-[10px] text-gray-500">2{i} Help Points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Sidebar overlay (mobile) */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
          )}

          {/* ── Right Content: Feed Area ── */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                </button>
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{paginatedPosts.length}</span> of <span className="font-semibold text-gray-900">{filteredPosts.length}</span> discussions
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <span>Displaying:</span>
                <span className="text-brand-green font-semibold">{selectedCategory === 'all' ? 'All' : selectedCategory.toUpperCase()} Category</span>
              </div>
            </div>

            {/* ── Posts Feed ── */}
            <div className="space-y-6">
              {paginatedPosts.map(post => {
                const isHovered = hoveredPost === post.id;
                const isExpanded = selectedPost === post.id;

                return (
                  <div
                    key={post.id}
                    onMouseEnter={() => setHoveredPost(post.id)}
                    onMouseLeave={() => setHoveredPost(null)}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:border-brand-green card-accent"
                    style={{ boxShadow: isHovered ? '0 12px 32px rgba(46,125,50,0.06)' : '0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <div className="p-6">
                      {/* Author bar */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-surface border border-gray-100 flex items-center justify-center text-brand-green">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{post.authorName}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(post.timestamp)}</p>
                          </div>
                        </div>
                        <button className="p-1.5 text-gray-400 hover:text-brand-green transition-colors">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-green transition-colors leading-tight">
                        {post.title}
                      </h3>
                      <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        {post.content}
                      </p>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between pt-5 border-t border-gray-50 mt-5">
                        <div className="flex items-center gap-6">
                          <button className="flex items-center gap-1.5 text-gray-500 hover:text-brand-green transition-all group/btn">
                            <div className="p-1.5 rounded-lg group-hover/btn:bg-brand-green-light transition-colors">
                              <ThumbsUp className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold">Helpful</span>
                          </button>
                          <button
                            onClick={() => setSelectedPost(isExpanded ? null : post.id)}
                            className={`flex items-center gap-1.5 transition-all group/btn ${isExpanded ? 'text-brand-green' : 'text-gray-500 hover:text-brand-green'}`}
                          >
                            <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-brand-green-light' : 'group-hover/btn:bg-brand-green-light'}`}>
                              <MessageCircle className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold">{post.replies.length} Replies</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-gray-500 hover:text-brand-green transition-all group/btn md:flex hidden">
                            <div className="p-1.5 rounded-lg group-hover/btn:bg-brand-green-light transition-colors">
                              <Share2 className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold">Share</span>
                          </button>
                        </div>

                        <button
                          onClick={() => setSelectedPost(isExpanded ? null : post.id)}
                          className={`flex items-center gap-1 text-xs font-bold transition-all ${isExpanded ? 'text-brand-green' : 'text-gray-400 hover:text-brand-green'}`}
                        >
                          {isExpanded ? 'Hide Discussion' : 'Read Full Thread'}
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* ── Replies Section (Nested) ── */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="space-y-4 mb-6">
                            {post.replies.map(reply => (
                              <div key={reply.id} className="bg-brand-surface rounded-2xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-brand-green">
                                    <User size={12} />
                                  </div>
                                  <span className="text-xs font-bold text-gray-900">{reply.authorName}</span>
                                  <span className="text-[10px] text-gray-400 ml-auto">{formatDate(reply.timestamp)}</span>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{reply.content}</p>
                              </div>
                            ))}
                          </div>

                          {/* Reply Input */}
                          {isAuthenticated && (
                            <form onSubmit={(e) => handleSubmitReply(e, post.id)} className="flex items-end gap-3 bg-brand-surface border border-gray-100 rounded-2xl p-3 focus-within:bg-white focus-within:border-brand-green/20 transition-all">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Reply to this discussion..."
                                rows={1}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-gray-700 resize-none min-h-[40px]"
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = (target.scrollHeight) + 'px';
                                }}
                              />
                              <button
                                type="submit"
                                disabled={!replyContent.trim()}
                                className="p-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark disabled:opacity-50 transition-all"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {filteredPosts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <MessageCircle className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Discussions Found</h3>
                <p className="text-sm text-gray-500">Be the first to start a conversation</p>
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${currentPage === page
                      ? 'bg-brand-green text-white shadow-md'
                      : 'text-gray-600 hover:bg-brand-green-light hover:text-brand-green'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:border-brand-green hover:text-brand-green disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Post Modal ── */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewPost(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-brand-surface/30">
              <h2 className="text-xl font-bold text-gray-900">Start Discussion</h2>
              <button onClick={() => setShowNewPost(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPost} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., How to improve wheat yield in central Maharashtra?"
                  className="w-full px-4 py-3 bg-brand-surface border border-transparent rounded-2xl focus:border-brand-green/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-green/5 transition-all text-sm font-medium"
                  value={newPostData.title}
                  onChange={(e) => setNewPostData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide context or details for your question..."
                  className="w-full px-4 py-3 bg-brand-surface border border-transparent rounded-2xl focus:border-brand-green/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-green/5 transition-all text-sm font-medium resize-none"
                  value={newPostData.content}
                  onChange={(e) => setNewPostData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewPost(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-green text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-[1.02] active:scale-98 transition-all"
                >
                  Post to Forum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;