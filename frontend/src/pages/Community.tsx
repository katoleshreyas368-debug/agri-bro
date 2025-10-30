import React, { useState } from 'react';
import { MessageCircle, Users, Plus, Send, ThumbsUp } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const Community: React.FC = () => {
  const { communityPosts, addCommunityPost, addReply } = useData();
  const { user, isAuthenticated } = useAuth();
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newPostData, setNewPostData] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // The backend will get the author from the auth middleware
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
    // The backend will get the author from the auth middleware
    addReply(postId, {
      content: replyContent
    });

    setReplyContent('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Forum</h1>
            <p className="text-gray-600 mt-2">Connect with fellow farmers and share knowledge</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowNewPost(true)}
              className="mt-4 sm:mt-0 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </button>
          )}
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">2,500+</div>
            <div className="text-gray-600">Active Farmers</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">1,200+</div>
            <div className="text-gray-600">Discussions</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">95%</div>
            <div className="text-gray-600">Helpful Answers</div>
          </div>
        </div>

        {/* New Post Modal */}
        {showNewPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">Create New Post</h2>
                <button 
                  onClick={() => setShowNewPost(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitPost} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newPostData.title}
                    onChange={(e) => setNewPostData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What's your question or topic?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newPostData.content}
                    onChange={(e) => setNewPostData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your knowledge or ask for help..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewPost(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {communityPosts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">{post.authorName}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(post.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-line">{post.content}</p>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center space-x-4">
                    <button className="flex items-center text-gray-600 hover:text-green-600 transition-colors">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      <span className="text-sm">Helpful</span>
                    </button>
                    <button 
                      onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                      className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">{post.replies.length} Replies</span>
                    </button>
                  </div>
                </div>

                {/* Replies */}
                {selectedPost === post.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="space-y-4 mb-6">
                      {post.replies.map(reply => (
                        <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <span className="font-medium">{reply.authorName}</span>
                            <span className="mx-2">•</span>
                            <span>{formatDate(reply.timestamp)}</span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line">{reply.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    {isAuthenticated && (
                      <form onSubmit={(e) => handleSubmitReply(e, post.id)} className="flex items-start space-x-3">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write your reply..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={!replyContent.trim()}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {communityPosts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Posts Yet</h3>
            <p className="text-gray-600">Be the first to start a discussion in the community!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;