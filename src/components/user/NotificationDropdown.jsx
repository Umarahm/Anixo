import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { markAsRead, markAllRead } from "../../services/notificationService";
import { getAnimeDetails } from "../../services/api";
import { Bell, Calendar, Info, AlertCircle, ExternalLink, MessageSquare } from "lucide-react";

const formatNotificationText = (notif) => {
  let title = notif.title.replace('🚀', '').trim();
  let message = notif.message.replace('!', '');

  if (notif.type === 'NEW_EPISODE') {
    if (title === 'New Episode Aired') {
      const match = message.match(/Episode (\d+) of (.*?) is now available/);
      if (match) {
        title = match[2];
        message = `Episode ${match[1]} is now available`;
      } else {
        title = "New Episode";
      }
    }
  }

  if (notif.type === 'REPLY') {
    // title is already like "Username replied to your comment"
    // message is the reply content snippet
  }

  return { title, message };
};

export default function NotificationDropdown({ isOpen, onClose }) {
  const { globalNotifications, setGlobalNotifications } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id) => {
    const res = await markAsRead(id);
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleReadAll = async () => {
    const res = await markAllRead();
    if (res.success) {
      setGlobalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const [coverCache, setCoverCache] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const missing = globalNotifications.filter(n => n.animeId && !n.coverImage && !coverCache[n.animeId]).slice(0, 5);
    if (missing.length === 0) return;
    const uniqueIds = [...new Set(missing.map(n => n.animeId))];
    uniqueIds.forEach(async (id) => {
      try {
        const details = await getAnimeDetails(parseInt(id));
        if (details?.coverImage) {
          setCoverCache(prev => ({ ...prev, [id]: details.coverImage.large || details.coverImage.extraLarge || '' }));
        }
      } catch { /* silently fail */ }
    });
  }, [isOpen, globalNotifications, coverCache]);

  const enrichedNotifications = globalNotifications.map(n => {
    if (n.coverImage || !n.animeId || !coverCache[n.animeId]) return n;
    return { ...n, coverImage: coverCache[n.animeId] };
  });

  if (!isOpen) return null;


  return (
    <div 
      ref={dropdownRef}
      className="absolute top-[48px] right-0 bg-[#141414]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[320px] z-[200] animate-in fade-in slide-in-from-top-2 duration-200 border-t-[3px] border-red-600 rounded-b-xl overflow-hidden"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-tight">Notifications</h3>
        <div className="flex items-center gap-3">
          {globalNotifications.some(n => !n.isRead) && (
            <button onClick={handleReadAll} className="text-[10px] font-black text-green-500 uppercase tracking-widest hover:underline cursor-pointer">Mark Read</button>
          )}
          <Link to="/notifications" onClick={onClose} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">View All</Link>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {enrichedNotifications.length > 0 ? (
          <div className="flex flex-col">
            {enrichedNotifications.slice(0, 5).map((notif) => {
              const { title, message } = formatNotificationText(notif);
              return (
              <Link 
                key={notif._id}
                to={notif.targetUrl || (notif.animeId ? `/watch/${notif.animeId}` : '#')}
                onClick={() => { if (!notif.isRead) handleMarkRead(notif._id); onClose(); }}
                className={`p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all flex gap-3 relative group cursor-pointer ${!notif.isRead ? 'bg-white/[0.02]' : 'opacity-50 hover:opacity-100'}`}
              >
                {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-600" />}
                
                {/* Anime Thumbnail or Icon */}
                {notif.type === 'NEW_EPISODE' && notif.coverImage ? (
                  <div className="relative shrink-0">
                    <div className="w-[36px] h-[50px] rounded-md overflow-hidden ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                      <img
                        src={notif.coverImage}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                    {notif.episode && (
                      <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[7px] font-black px-1 py-[1px] rounded leading-none ring-1 ring-[#141414]">
                        {notif.episode}
                      </div>
                    )}
                  </div>
                ) : notif.type === 'REPLY' ? (
                  <div className="shrink-0 mt-0.5 w-[36px] h-[36px] rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <MessageSquare size={16} className="text-indigo-400" />
                  </div>
                ) : (
                  <div className="shrink-0 mt-1">
                    {notif.type === 'NEW_EPISODE' ? (
                      <Calendar size={14} className="text-red-500" />
                    ) : notif.type === 'WATCHLIST_UPDATE' ? (
                      <Info size={14} className="text-blue-500" />
                    ) : (
                      <AlertCircle size={14} className="text-yellow-500" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[11px] leading-snug truncate ${!notif.isRead ? 'font-bold text-white group-hover:text-red-400' : 'text-white/60'} transition-colors`}>
                      {title}
                    </p>
                    {!notif.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 mt-1.5 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[9px] text-white/30 line-clamp-1 mt-0.5">{message}</p>
                </div>
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <Bell size={24} className="text-white/10 mb-3" />
            <p className="text-xs text-white/20 font-medium">All caught up!</p>
          </div>
        )}
      </div>

      {enrichedNotifications.length > 5 && (
        <Link 
          to="/notifications" 
          onClick={onClose}
          className="block p-3 text-center text-[11px] font-bold text-white/40 hover:text-white bg-white/5 transition-all"
        >
          Show more
        </Link>
      )}
    </div>
  );
}
