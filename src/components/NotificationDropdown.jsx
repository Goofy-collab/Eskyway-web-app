import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Bell } from "lucide-react";

export default function NotificationDropdown() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser) return;

    const userEmail = currentUser.email;
    const userId = currentUser.uid;
    const isPassenger = localStorage.getItem('userRole') === 'passenger';

    const queries = [
      query(
        collection(db, 'notifications'),
        where('recipientEmail', '==', userEmail),
        orderBy('timestamp', 'desc')
      ),
      query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('timestamp', 'desc')
      )
    ];

    if (isPassenger) {
      queries.push(
        query(
          collection(db, 'notifications'),
          where('recipientType', '==', 'passengers'),
          orderBy('timestamp', 'desc')
        )
      );
    }

    const unsubscribers = queries.map(q => 
      onSnapshot(q, (snapshot) => {
        const newNotifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp || 0
        }));

        setNotifications(prev => {
          const combined = [...prev, ...newNotifs];
          const unique = Array.from(
            new Map(combined.map(item => [item.id, item])).values()
          ).sort((a, b) => b.timestamp - a.timestamp);
          
          // Limit to 20 most recent
          return unique.slice(0, 20);
        });
        
        setLoading(false);
      })
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentUser]);

  // Update unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notifications / Alerts */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative flex flex-col items-center cursor-pointer transition-colors"
      >
        {/* Bell Icon */}
        <Bell
          size={24}
          className={`${
            unreadCount > 0
              ? "text-gray-600"
              : "text-gray-600 hover:text-purple-500"
          } transition-colors`}
        />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-white bg-purple-600 rounded-full shadow-md">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Label */}
        <span className="block text-[10px] font-medium text-gray-700 text-center mt-1">
          Alerts
        </span>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col animate-slideDown">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Mark All As Read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 p-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-700 rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-gray-500 text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`
                      p-4 rounded-lg cursor-pointer transition-all duration-200
                      border-2
                      ${
                        !notification.read 
                          ? 'bg-purple-50 border-purple-300 hover:border-purple-400 hover:bg-purple-100' 
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread Indicator Dot */}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          Driver Update
                        </h4>
                        
                        {/* Message */}
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Timestamp */}
                        <p className="text-xs text-gray-400">
                          {formatDate(notification.timestamp)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}


