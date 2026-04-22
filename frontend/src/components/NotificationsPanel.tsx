import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`${API}/notifications/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const res = await fetch(`${API}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bid_accepted':
        return '✅';
      case 'trade_confirmed':
        return '🤝';
      default:
        return '📢';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Bell size={24} />
            <div>
              <h2 className="text-xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-blue-100 text-sm">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="text-blue-600 animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-12 px-4">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-semibold">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-2">
                You'll see updates about your bids and trades here
              </p>
            </div>
          )}

          {/* Notifications List */}
          <div className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 transition border-l-4 ${
                  notification.read
                    ? 'bg-gray-50 border-l-gray-300'
                    : 'bg-blue-50 border-l-blue-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2 break-words">
                      {notification.message}
                    </p>

                    {notification.data?.cropName && (
                      <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded mb-2 inline-block">
                        <strong>{notification.data.cropName}</strong>
                        {notification.data.amount && (
                          <span> - ₹{notification.data.amount.toLocaleString()}</span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 hover:bg-blue-100 rounded transition"
                        title="Mark as read"
                      >
                        <Check size={16} className="text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 hover:bg-red-100 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationsPanel;
